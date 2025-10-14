import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    )

    // Requested credentials
    const adminEmail = 'admin@gmail.com'
    const adminPassword = '123456789'

    // Check if admin already exists by email
    const { data: usersList, error: listErr } = await supabaseAdmin.auth.admin.listUsers()
    if (listErr) console.log('listUsers error:', listErr.message)
    const adminUser = usersList?.users?.find((u) => u.email === adminEmail)

    const userId = adminUser?.id

    if (userId) {
      // Ensure admin role exists
      const { data: roleData, error: roleSelectErr } = await supabaseAdmin
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle()
      if (roleSelectErr) console.log('role select error:', roleSelectErr.message)

      if (!roleData) {
        const { error: roleInsertErr } = await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: userId, role: 'admin' })
        if (roleInsertErr) throw roleInsertErr
      }

      return new Response(
        JSON.stringify({ message: 'Admin user already exists and role verified', email: adminEmail }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Create admin user (auto-confirm)
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        full_name_en: 'Admin',
        full_name_ar: 'مشرف',
      },
    })
    if (createErr) throw createErr

    // Assign admin role
    const { error: roleErr } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: created.user.id, role: 'admin' })
    if (roleErr) throw roleErr

    return new Response(
      JSON.stringify({ message: 'Admin user created successfully', email: adminEmail }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('setup-admin error:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
