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

    const { email, password, name, role, store_id, manager_can_sell } = await req.json()

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
      created_via: 'admin_panel'
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
