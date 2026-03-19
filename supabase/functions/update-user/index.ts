import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type AppRole = 'admin' | 'manager' | 'seller' | 'supervisor' | 'super_admin'

const isValidRole = (value: unknown): value is AppRole =>
  value === 'super_admin' || value === 'admin' || value === 'manager' || value === 'seller' || value === 'supervisor'

const roleNeedsStore = (role: AppRole) => role === 'manager' || role === 'seller'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const {
      data: { user: caller },
    } = await supabaseClient.auth.getUser()

    if (!caller) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if caller is admin or super_admin
    const [{ data: isAdmin }, { data: isSuperAdmin }] = await Promise.all([
      supabaseClient.rpc('has_role', { _user_id: caller.id, _role: 'admin' }),
      supabaseClient.rpc('has_role', { _user_id: caller.id, _role: 'super_admin' }),
    ])

    if (!isAdmin && !isSuperAdmin) {
      return new Response(JSON.stringify({ error: 'Apenas administradores podem editar usuários' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const callerIsSuperAdmin = !!isSuperAdmin

    const payload = await req.json()
    const userId = payload.user_id as string | undefined
    const name = typeof payload.name === 'string' ? payload.name.trim() : ''
    const role = payload.role as AppRole
    const storeId = typeof payload.store_id === 'string' && payload.store_id.trim() ? payload.store_id.trim() : null

    if (!userId || !name || !isValidRole(role)) {
      return new Response(JSON.stringify({ error: 'Dados inválidos para atualização do usuário' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (roleNeedsStore(role) && !storeId) {
      return new Response(JSON.stringify({ error: 'Gerente e vendedor precisam ter uma loja válida' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: callerProfile, error: callerProfileError } = await adminClient
      .from('profiles')
      .select('organization_id')
      .eq('id', caller.id)
      .maybeSingle()

    if (callerProfileError) {
      throw callerProfileError
    }

    const { data: targetProfile, error: targetProfileError } = await adminClient
      .from('profiles')
      .select('id, organization_id')
      .eq('id', userId)
      .maybeSingle()

    if (targetProfileError) {
      throw targetProfileError
    }

    if (!callerProfile?.organization_id && !callerIsSuperAdmin) {
      return new Response(JSON.stringify({ error: 'Usuário não encontrado para edição' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!targetProfile) {
      return new Response(JSON.stringify({ error: 'Usuário alvo não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // super_admin can edit any user; admin can only edit same org
    if (!callerIsSuperAdmin && callerProfile?.organization_id !== targetProfile.organization_id) {
      return new Response(JSON.stringify({ error: 'Você só pode editar usuários da sua organização' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Handle password reset by super_admin
    const newPassword = typeof payload.password === 'string' && payload.password.trim() ? payload.password.trim() : null
    if (newPassword) {
      if (!callerIsSuperAdmin) {
        return new Response(JSON.stringify({ error: 'Apenas super_admin pode redefinir senhas' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      await adminClient.auth.admin.updateUserById(userId, { password: newPassword })
    }

    const normalizedStoreId = roleNeedsStore(role) ? storeId : null

    if (normalizedStoreId) {
      const { data: store, error: storeError } = await adminClient
        .from('stores')
        .select('id, organization_id')
        .eq('id', normalizedStoreId)
        .maybeSingle()

      if (storeError) {
        throw storeError
      }

      if (!store || store.organization_id !== callerProfile.organization_id) {
        return new Response(JSON.stringify({ error: 'A loja selecionada é inválida para esta organização' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        name,
        store_id: normalizedStoreId,
      })
      .eq('id', userId)

    if (profileError) {
      throw profileError
    }

    const { data: existingRole, error: existingRoleError } = await adminClient
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (existingRoleError) {
      throw existingRoleError
    }

    if (existingRole?.id) {
      const { error: updateRoleError } = await adminClient
        .from('user_roles')
        .update({ role })
        .eq('id', existingRole.id)

      if (updateRoleError) {
        throw updateRoleError
      }
    } else {
      const { error: insertRoleError } = await adminClient
        .from('user_roles')
        .insert({ user_id: userId, role })

      if (insertRoleError) {
        throw insertRoleError
      }
    }

    return new Response(
      JSON.stringify({
        user: {
          id: userId,
          name,
          role,
          store_id: normalizedStoreId,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro inesperado ao atualizar usuário'

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})