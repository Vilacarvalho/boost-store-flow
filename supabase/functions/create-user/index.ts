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
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const [{ data: isAdmin }, { data: isSuperAdmin }] = await Promise.all([
      supabaseClient.rpc('has_role', { _user_id: caller.id, _role: 'admin' }),
      supabaseClient.rpc('has_role', { _user_id: caller.id, _role: 'super_admin' }),
    ])
    if (!isAdmin && !isSuperAdmin) {
      return new Response(JSON.stringify({ error: 'Apenas administradores podem criar usuários' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: orgId } = await supabaseClient.rpc('get_user_org_id', { _user_id: caller.id })

    const { email, password, name, role, store_id, manager_can_sell, reactivate } = await req.json()

    if (!email || !password || !name || !role) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios: email, password, name, role' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Validate role requires store_id
    const roleNeedsStore = role === 'seller' || role === 'manager'
    if (roleNeedsStore && !store_id) {
      return new Response(JSON.stringify({ error: 'Vendedor e gerente precisam de uma loja válida' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Validate name: at least 2 words, each with 2+ chars, no numbers
    const nameWords = name.trim().replace(/\s+/g, ' ').split(' ').filter((w: string) => w.length >= 2)
    if (nameWords.length < 2 || /[^a-zA-ZÀ-ÿ\s'-]/.test(name.trim())) {
      return new Response(JSON.stringify({ error: 'Digite nome e sobrenome válidos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Validate email format
    const emailNorm = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailNorm)) {
      return new Response(JSON.stringify({ error: 'Digite um e-mail válido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Normalize name: capitalize each word
    const normalizedName = name.trim().replace(/\s+/g, ' ').split(' ')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Check if user already exists in auth by listing users with this email
    const { data: existingUsers } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
    const existingAuthUser = existingUsers?.users?.find(
      (u: any) => u.email?.toLowerCase() === emailNorm
    )

    if (existingAuthUser) {
      // Check if there's a deactivated profile
      const { data: existingProfile } = await adminClient
        .from('profiles')
        .select('id, active, organization_id')
        .eq('id', existingAuthUser.id)
        .maybeSingle()

      if (existingProfile && existingProfile.active) {
        return new Response(JSON.stringify({ 
          error: 'Já existe um usuário ativo com este email' 
        }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (existingProfile && !existingProfile.active) {
        // User exists but is deactivated
        if (!reactivate) {
          return new Response(JSON.stringify({ 
            error: 'USER_DEACTIVATED',
            message: 'Já existe um usuário desativado com este email. Deseja reativá-lo?',
            existing_user: {
              id: existingAuthUser.id,
              email: emailNorm,
              name: existingProfile.organization_id === orgId ? normalizedName : normalizedName,
            }
          }), {
            status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Reactivate the user
        const resolvedStoreId = roleNeedsStore ? store_id : null

        // Update password
        await adminClient.auth.admin.updateUserById(existingAuthUser.id, { 
          password,
          email_confirm: true,
        })

        // Reactivate profile
        await adminClient.from('profiles').update({
          name: normalizedName,
          email: emailNorm,
          active: true,
          organization_id: orgId,
          store_id: resolvedStoreId,
          manager_can_sell: role === 'manager' ? !!manager_can_sell : false,
          created_by: caller.id,
          created_via: 'admin_panel',
        }).eq('id', existingAuthUser.id)

        // Update or insert role
        const { data: existingRole } = await adminClient
          .from('user_roles')
          .select('id')
          .eq('user_id', existingAuthUser.id)
          .maybeSingle()

        if (existingRole) {
          await adminClient.from('user_roles')
            .update({ role })
            .eq('id', existingRole.id)
        } else {
          await adminClient.from('user_roles')
            .insert({ user_id: existingAuthUser.id, role })
        }

        return new Response(JSON.stringify({ 
          user: { id: existingAuthUser.id, email: emailNorm },
          reactivated: true 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Mark as admin-created so handle_new_user trigger skips
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: emailNorm,
      password,
      email_confirm: true,
      user_metadata: {
        name: normalizedName,
        created_by_admin: 'true'
      }
    })

    if (createError) {
      // Handle duplicate email error from auth with friendly message
      if (createError.message?.includes('already been registered') || createError.message?.includes('already exists')) {
        return new Response(JSON.stringify({ error: 'Já existe um usuário com este email' }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Since trigger is skipped, we create profile directly
    const resolvedStoreId = roleNeedsStore ? store_id : null

    await adminClient.from('profiles').insert({
      id: newUser.user.id,
      name: normalizedName,
      email: emailNorm,
      organization_id: orgId,
      store_id: resolvedStoreId,
      created_by: caller.id,
      created_via: 'admin_panel',
      manager_can_sell: role === 'manager' ? !!manager_can_sell : false,
    })

    // Insert the correct role chosen by the admin (no trigger conflict)
    await adminClient.from('user_roles').insert({
      user_id: newUser.user.id,
      role
    })

    return new Response(JSON.stringify({ user: { id: newUser.user.id, email: emailNorm } }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
