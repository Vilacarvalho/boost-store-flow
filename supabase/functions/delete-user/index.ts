import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

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

    const { data: { user: caller } } = await supabaseClient.auth.getUser()
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const [{ data: isAdmin }, { data: isSuperAdmin }] = await Promise.all([
      supabaseClient.rpc('has_role', { _user_id: caller.id, _role: 'admin' }),
      supabaseClient.rpc('has_role', { _user_id: caller.id, _role: 'super_admin' }),
    ])

    if (!isAdmin && !isSuperAdmin) {
      return new Response(JSON.stringify({ error: 'Apenas administradores podem excluir usuários' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const payload = await req.json()
    const targetUserId = payload.user_id as string | undefined

    if (!targetUserId) {
      return new Response(JSON.stringify({ error: 'ID do usuário é obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (targetUserId === caller.id) {
      return new Response(JSON.stringify({ error: 'Você não pode excluir a si mesmo' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: callerProfile } = await adminClient
      .from('profiles').select('organization_id').eq('id', caller.id).maybeSingle()

    const { data: targetProfile } = await adminClient
      .from('profiles').select('id, organization_id').eq('id', targetUserId).maybeSingle()

    if (!targetProfile) {
      return new Response(JSON.stringify({ error: 'Usuário não encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Admin can only delete within same org
    if (!isSuperAdmin && callerProfile?.organization_id !== targetProfile.organization_id) {
      return new Response(JSON.stringify({ error: 'Você só pode excluir usuários da sua organização' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Prevent deleting super_admin unless caller is super_admin
    const { data: targetIsSuperAdmin } = await adminClient
      .rpc('has_role', { _user_id: targetUserId, _role: 'super_admin' })
    if (targetIsSuperAdmin && !isSuperAdmin) {
      return new Response(JSON.stringify({ error: 'Apenas super_admin pode excluir outro super_admin' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Prevent deleting last admin of org
    const { data: targetIsAdmin } = await adminClient
      .rpc('has_role', { _user_id: targetUserId, _role: 'admin' })
    if (targetIsAdmin) {
      const { count } = await adminClient
        .from('user_roles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin')
        .in('user_id',
          (await adminClient.from('profiles').select('id').eq('organization_id', targetProfile.organization_id!))
            .data?.map(p => p.id) || []
        )
      if (count && count <= 1) {
        return new Response(JSON.stringify({ error: 'Não é possível excluir o último admin da organização' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Deactivate instead of hard delete (soft delete)
    await adminClient.from('profiles').update({ active: false, store_id: null }).eq('id', targetUserId)
    await adminClient.from('user_roles').delete().eq('user_id', targetUserId)

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro inesperado'
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
