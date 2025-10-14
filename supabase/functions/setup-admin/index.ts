import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'

Deno.serve(async (req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const adminEmail = 'anyone@gmail.com'
    const adminPassword = '234567890987654n'

    // Check if admin already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
    const adminExists = existingUser?.users.find(u => u.email === adminEmail)

    if (adminExists) {
      // Check if admin role exists
      const { data: roleData } = await supabaseAdmin
        .from('user_roles')
        .select('*')
        .eq('user_id', adminExists.id)
        .eq('role', 'admin')
        .maybeSingle()

      if (!roleData) {
        // Add admin role
        await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: adminExists.id, role: 'admin' })
      }

      return new Response(
        JSON.stringify({ message: 'Admin user already exists and role verified' }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Create admin user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true
    })

    if (createError) throw createError

    // Assign admin role
    await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: newUser.user.id, role: 'admin' })

    return new Response(
      JSON.stringify({ message: 'Admin user created successfully', email: adminEmail }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
