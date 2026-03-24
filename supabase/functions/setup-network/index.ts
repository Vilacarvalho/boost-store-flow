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
      return new Response(JSON.stringify({ error: 'Apenas administradores podem configurar a rede' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: orgId } = await supabaseClient.rpc('get_user_org_id', { _user_id: caller.id })

    const body = await req.json()
    const { company, stores, team, goals } = body

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const results = {
      organization_updated: false,
      stores_created: 0,
      users_created: 0,
      goals_created: 0,
      errors: [] as string[],
    }

    // Step 1: Update organization name/logo if provided
    if (company?.name || company?.logo_url) {
      const updateData: any = {}
      if (company.name) updateData.name = company.name
      if (company.logo_url) updateData.logo_url = company.logo_url
      const { error } = await adminClient
        .from('organizations')
        .update(updateData)
        .eq('id', orgId)
      if (error) {
        results.errors.push(`Erro ao atualizar organização: ${error.message}`)
      } else {
        results.organization_updated = true
      }
    }

    // Step 2: Create stores
    const storeIdMap: Record<string, string> = {}

    if (stores && Array.isArray(stores)) {
      for (const store of stores) {
        if (!store.name) continue

        // Check if store with same name already exists
        const { data: existing } = await adminClient
          .from('stores')
          .select('id')
          .eq('organization_id', orgId)
          .eq('name', store.name)
          .maybeSingle()

        if (existing) {
          storeIdMap[store.name] = existing.id
          // Update city if provided
          if (store.city) {
            await adminClient.from('stores').update({ city: store.city }).eq('id', existing.id)
          }
          continue
        }

        const { data: newStore, error } = await adminClient
          .from('stores')
          .insert({
            name: store.name,
            city: store.city || null,
            organization_id: orgId,
            active: true,
          })
          .select('id')
          .single()

        if (error) {
          results.errors.push(`Erro ao criar loja "${store.name}": ${error.message}`)
        } else {
          storeIdMap[store.name] = newStore.id
          results.stores_created++
        }
      }
    }

    // Step 3: Create team members
    if (team && Array.isArray(team)) {
      for (const member of team) {
        if (!member.email || !member.name || !member.role) continue

        const emailNorm = member.email.trim().toLowerCase()
        const nameWords = member.name.trim().replace(/\s+/g, ' ').split(' ').filter((w: string) => w.length >= 2)
        if (nameWords.length < 2) {
          results.errors.push(`Nome inválido para ${emailNorm}: precisa de nome e sobrenome`)
          continue
        }

        const normalizedName = member.name.trim().replace(/\s+/g, ' ').split(' ')
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')

        const roleNeedsStore = member.role === 'seller' || member.role === 'manager'
        const resolvedStoreId = roleNeedsStore ? (storeIdMap[member.store_name] || member.store_id || null) : null

        if (roleNeedsStore && !resolvedStoreId) {
          results.errors.push(`${emailNorm}: vendedor/gerente precisa de loja válida`)
          continue
        }

        // Check if user already exists
        const { data: existingUsers } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
        const existingAuthUser = existingUsers?.users?.find(
          (u: any) => u.email?.toLowerCase() === emailNorm
        )

        let userId: string

        if (existingAuthUser) {
          userId = existingAuthUser.id
          // Update profile
          await adminClient.from('profiles').update({
            name: normalizedName,
            organization_id: orgId,
            store_id: resolvedStoreId,
            active: true,
            manager_can_sell: member.role === 'manager' ? !!member.manager_can_sell : false,
          }).eq('id', userId)

          // Update role
          const { data: existingRole } = await adminClient
            .from('user_roles')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle()

          if (existingRole) {
            await adminClient.from('user_roles').update({ role: member.role }).eq('id', existingRole.id)
          } else {
            await adminClient.from('user_roles').insert({ user_id: userId, role: member.role })
          }
        } else {
          const password = member.password || 'Mudar123!'
          const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
            email: emailNorm,
            password,
            email_confirm: true,
            user_metadata: { name: normalizedName, created_by_admin: 'true' },
          })

          if (createError) {
            results.errors.push(`Erro ao criar ${emailNorm}: ${createError.message}`)
            continue
          }

          userId = newUser.user.id

          await adminClient.from('profiles').insert({
            id: userId,
            name: normalizedName,
            email: emailNorm,
            organization_id: orgId,
            store_id: resolvedStoreId,
            created_by: caller.id,
            created_via: 'admin_panel',
            manager_can_sell: member.role === 'manager' ? !!member.manager_can_sell : false,
          })

          await adminClient.from('user_roles').insert({ user_id: userId, role: member.role })
        }

        results.users_created++
      }
    }

    // Step 4: Create goals
    if (goals && Array.isArray(goals)) {
      for (const goal of goals) {
        const storeId = storeIdMap[goal.store_name] || goal.store_id
        if (!storeId || !goal.target_value) continue

        // Check existing goal for this store/period
        const { data: existing } = await adminClient
          .from('goals')
          .select('id')
          .eq('organization_id', orgId)
          .eq('store_id', storeId)
          .eq('period_type', goal.period_type || 'monthly')
          .is('user_id', null)
          .maybeSingle()

        if (existing) {
          await adminClient.from('goals')
            .update({ target_value: goal.target_value })
            .eq('id', existing.id)
        } else {
          const { error } = await adminClient.from('goals').insert({
            organization_id: orgId,
            store_id: storeId,
            user_id: null,
            target_value: goal.target_value,
            period_type: goal.period_type || 'monthly',
          })
          if (error) {
            results.errors.push(`Erro ao criar meta para loja: ${error.message}`)
          } else {
            results.goals_created++
          }
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      results,
    }), {
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
