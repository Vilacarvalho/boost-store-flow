import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const email = 'master@vendamais.local'
    const password = 'Master123!Temp'
    const name = 'Super Admin'

    // Check if user already exists
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    let userId: string

    if (existingProfile) {
      userId = existingProfile.id
      // Reset password
      await adminClient.auth.admin.updateUserById(userId, { password, email_confirm: true })
    } else {
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      })
      if (createError) throw createError
      userId = newUser.user.id
    }

    // Get a valid organization_id
    const { data: org } = await adminClient
      .from('organizations')
      .select('id')
      .limit(1)
      .maybeSingle()

    // Update profile
    await adminClient
      .from('profiles')
      .update({ name, store_id: null, organization_id: org?.id ?? null })
      .eq('id', userId)

    // Upsert role to super_admin
    const { data: existingRole } = await adminClient
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (existingRole) {
      await adminClient
        .from('user_roles')
        .update({ role: 'super_admin' })
        .eq('user_id', userId)
    } else {
      await adminClient
        .from('user_roles')
        .insert({ user_id: userId, role: 'super_admin' })
    }

    // Also restore the original admin user
    const originalAdminId = 'd5f244ad-55be-4080-8908-c15ce8ff5d09'
    const { data: adminRole } = await adminClient
      .from('user_roles')
      .select('id, role')
      .eq('user_id', originalAdminId)
      .maybeSingle()

    if (adminRole) {
      await adminClient
        .from('user_roles')
        .update({ role: 'admin' })
        .eq('user_id', originalAdminId)
    } else {
      await adminClient
        .from('user_roles')
        .insert({ user_id: originalAdminId, role: 'admin' })
    }

    // Fix store_id for admin
    await adminClient
      .from('profiles')
      .update({ store_id: null })
      .eq('id', originalAdminId)

    // Audit log
    await adminClient.from('admin_audit_logs').insert({
      actor_user_id: userId,
      target_user_id: userId,
      action: 'super_admin_created',
      details: { email, restored_admin: originalAdminId },
    })

    return new Response(
      JSON.stringify({
        success: true,
        super_admin: { id: userId, email },
        restored_admin: originalAdminId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
