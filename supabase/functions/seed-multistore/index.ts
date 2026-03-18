import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify caller is admin
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const { data: { user: caller } } = await supabaseClient.auth.getUser()
    if (!caller) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const { data: isAdmin } = await supabaseClient.rpc('has_role', { _user_id: caller.id, _role: 'admin' })
    if (!isAdmin) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders })

    const { data: orgId } = await supabaseClient.rpc('get_user_org_id', { _user_id: caller.id })

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const ORG_ID = orgId
    const STORE1_ID = 'a1b2c3d4-0002-4000-8000-000000000001'
    const STORE2_ID = 'b1b2c3d4-0002-4000-8000-000000000002'

    // Ensure store 2 exists
    await admin.from('stores').upsert({ id: STORE2_ID, name: 'Ótica Centro', city: 'São Paulo', organization_id: ORG_ID }, { onConflict: 'id' })

    // Create 4 users
    const usersToCreate = [
      { email: 'gerente.loja1@teste.com', name: 'Carlos Gerente L1', role: 'manager', store_id: STORE1_ID },
      { email: 'vendedor.loja1@teste.com', name: 'Fernanda Vendedora L1', role: 'seller', store_id: STORE1_ID },
      { email: 'gerente.loja2@teste.com', name: 'Roberto Gerente L2', role: 'manager', store_id: STORE2_ID },
      { email: 'vendedor.loja2@teste.com', name: 'Juliana Vendedora L2', role: 'seller', store_id: STORE2_ID },
    ]

    const createdUsers: Record<string, string> = {}

    for (const u of usersToCreate) {
      // Check if user already exists
      const { data: existing } = await admin.auth.admin.listUsers()
      const existingUser = existing?.users?.find(eu => eu.email === u.email)

      let userId: string
      if (existingUser) {
        userId = existingUser.id
      } else {
        const { data: newUser, error } = await admin.auth.admin.createUser({
          email: u.email,
          password: 'Teste123!',
          email_confirm: true,
          user_metadata: { name: u.name },
        })
        if (error) throw new Error(`Failed to create ${u.email}: ${error.message}`)
        userId = newUser.user.id
      }

      createdUsers[u.email] = userId

      // Update profile
      await admin.from('profiles').update({
        name: u.name,
        organization_id: ORG_ID,
        store_id: u.store_id,
      }).eq('id', userId)

      // Upsert role
      await admin.from('user_roles').upsert({ user_id: userId, role: u.role }, { onConflict: 'user_id,role' })
    }

    const VENDEDOR1_ID = createdUsers['vendedor.loja1@teste.com']
    const GERENTE1_ID = createdUsers['gerente.loja1@teste.com']
    const VENDEDOR2_ID = createdUsers['vendedor.loja2@teste.com']
    const GERENTE2_ID = createdUsers['gerente.loja2@teste.com']

    // Customers
    const customers = [
      { id: 'd1000001-0000-4000-8000-000000000001', name: 'Pedro Lima', whatsapp: '11999990001', organization_id: ORG_ID, store_id: STORE1_ID, status: 'new', profile_type: 'quality' },
      { id: 'd1000001-0000-4000-8000-000000000002', name: 'Laura Mendes', whatsapp: '11999990002', organization_id: ORG_ID, store_id: STORE1_ID, status: 'negotiating', profile_type: 'price' },
      { id: 'd1000001-0000-4000-8000-000000000003', name: 'Marcos Souza', whatsapp: '11999990003', organization_id: ORG_ID, store_id: STORE2_ID, status: 'new', profile_type: 'style' },
      { id: 'd1000001-0000-4000-8000-000000000004', name: 'Camila Torres', whatsapp: '11999990004', organization_id: ORG_ID, store_id: STORE2_ID, status: 'won', profile_type: 'urgency' },
      { id: 'd1000001-0000-4000-8000-000000000005', name: 'Ricardo Alves', whatsapp: '11999990005', organization_id: ORG_ID, store_id: STORE2_ID, status: 'lost', profile_type: 'price' },
    ]
    await admin.from('customers').upsert(customers, { onConflict: 'id' })

    // Sales
    const sales = [
      { id: 'e1000001-0000-4000-8000-000000000001', seller_id: VENDEDOR1_ID, customer_id: 'd1000001-0000-4000-8000-000000000001', organization_id: ORG_ID, store_id: STORE1_ID, status: 'won', total_value: 2350, driver: 'quality', products_shown_count: 3, closing_type: 'direct' },
      { id: 'e1000001-0000-4000-8000-000000000002', seller_id: VENDEDOR1_ID, customer_id: 'd1000001-0000-4000-8000-000000000002', organization_id: ORG_ID, store_id: STORE1_ID, status: 'lost', total_value: 800, driver: 'price', objection_reason: 'Preço alto', products_shown_count: 2 },
      { id: 'e1000001-0000-4000-8000-000000000003', seller_id: GERENTE1_ID, customer_id: 'd1000001-0000-4000-8000-000000000001', organization_id: ORG_ID, store_id: STORE1_ID, status: 'won', total_value: 1500, driver: 'quality', products_shown_count: 4, closing_type: 'negotiated' },
      { id: 'e1000001-0000-4000-8000-000000000004', seller_id: VENDEDOR2_ID, customer_id: 'd1000001-0000-4000-8000-000000000003', organization_id: ORG_ID, store_id: STORE2_ID, status: 'won', total_value: 3200, driver: 'style', products_shown_count: 5, closing_type: 'direct' },
      { id: 'e1000001-0000-4000-8000-000000000005', seller_id: VENDEDOR2_ID, customer_id: 'd1000001-0000-4000-8000-000000000004', organization_id: ORG_ID, store_id: STORE2_ID, status: 'won', total_value: 1800, driver: 'urgency', products_shown_count: 2, closing_type: 'direct' },
      { id: 'e1000001-0000-4000-8000-000000000006', seller_id: VENDEDOR2_ID, customer_id: 'd1000001-0000-4000-8000-000000000005', organization_id: ORG_ID, store_id: STORE2_ID, status: 'lost', total_value: 950, driver: 'price', objection_reason: 'Foi para concorrente', products_shown_count: 3 },
      { id: 'e1000001-0000-4000-8000-000000000007', seller_id: GERENTE2_ID, customer_id: 'd1000001-0000-4000-8000-000000000003', organization_id: ORG_ID, store_id: STORE2_ID, status: 'lost', total_value: 600, driver: 'style', objection_reason: 'Não tinha modelo desejado', products_shown_count: 1 },
    ]
    await admin.from('sales').upsert(sales, { onConflict: 'id' })

    // Sale steps
    const saleSteps = sales.map(s => ({
      sale_id: s.id,
      diagnostic_done: true,
      budget_identified: s.status === 'won',
      presented_benefits: true,
      directed_choice: s.status === 'won',
      objection_handled: s.status === 'lost',
      closing_attempted: true,
    }))
    for (const step of saleSteps) {
      await admin.from('sale_steps').upsert(step, { onConflict: 'id', ignoreDuplicates: true })
    }

    // Goals
    const goals = [
      { organization_id: ORG_ID, store_id: STORE1_ID, user_id: null, target_value: 8000, current_value: 3850, period_type: 'daily' },
      { organization_id: ORG_ID, store_id: STORE2_ID, user_id: null, target_value: 10000, current_value: 5000, period_type: 'daily' },
      { organization_id: ORG_ID, store_id: STORE1_ID, user_id: VENDEDOR1_ID, target_value: 5000, current_value: 2350, period_type: 'daily' },
      { organization_id: ORG_ID, store_id: STORE2_ID, user_id: VENDEDOR2_ID, target_value: 7000, current_value: 5000, period_type: 'daily' },
      { organization_id: ORG_ID, store_id: null, user_id: null, target_value: 50000, current_value: 8850, period_type: 'monthly' },
    ]
    await admin.from('goals').insert(goals)

    // Followups
    const followups = [
      { seller_id: VENDEDOR1_ID, customer_id: 'd1000001-0000-4000-8000-000000000002', organization_id: ORG_ID, store_id: STORE1_ID, status: 'pending', notes: 'Oferecer desconto 10%' },
      { seller_id: VENDEDOR2_ID, customer_id: 'd1000001-0000-4000-8000-000000000005', organization_id: ORG_ID, store_id: STORE2_ID, status: 'pending', notes: 'Novos modelos chegando semana que vem' },
      { seller_id: GERENTE2_ID, customer_id: 'd1000001-0000-4000-8000-000000000003', organization_id: ORG_ID, store_id: STORE2_ID, status: 'pending', notes: 'Verificar estoque modelo solicitado' },
    ]
    await admin.from('followups').insert(followups)

    // Also fix the second user (Celso) - link to org
    const { data: celso } = await admin.from('profiles').select('id').eq('email', 'vilaoficial33@gmail.com').single()
    if (celso) {
      await admin.from('profiles').update({ organization_id: ORG_ID, store_id: STORE1_ID }).eq('id', celso.id)
    }

    return new Response(JSON.stringify({
      success: true,
      created: {
        store: 'Ótica Centro',
        users: Object.keys(createdUsers),
        customers: customers.length,
        sales: sales.length,
        goals: goals.length,
        followups: followups.length,
      }
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
