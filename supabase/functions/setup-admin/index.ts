import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-setup-secret',
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

    // SECURITY: Check if any admin already exists - if so, block endpoint entirely
    const { count: existingAdminCount, error: countError } = await supabaseAdmin
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin')

    if (countError) {
      console.error('Error checking admin count:', countError.message)
    }

    if (existingAdminCount && existingAdminCount > 0) {
      return new Response(
        JSON.stringify({ error: 'Admin setup is disabled. An admin account already exists.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // SECURITY: Require setup secret for initial admin creation
    const setupSecret = Deno.env.get('ADMIN_SETUP_SECRET')
    const providedSecret = req.headers.get('x-setup-secret')

    if (setupSecret && setupSecret.length > 0) {
      if (!providedSecret || providedSecret !== setupSecret) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized. Invalid or missing setup secret.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }
    }

    // Get admin credentials from request body
    let email, password;
    try {
      const body = await req.json();
      email = body.email;
      password = body.password;
    } catch (jsonError) {
      return new Response(
        JSON.stringify({ error: 'Invalid request body. Expected JSON with email and password.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Validate password strength (minimum 12 characters)
    if (password.length < 12) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 12 characters long' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Check if user already exists by email
    const { data: usersList, error: listErr } = await supabaseAdmin.auth.admin.listUsers()
    if (listErr) {
      // Don't log detailed error info
    }
    const adminUser = usersList?.users?.find((u) => u.email === email)

    const userId = adminUser?.id

    if (userId) {
      // Ensure admin role exists
      const { data: roleData, error: roleSelectErr } = await supabaseAdmin
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle()

      if (!roleData) {
        const { error: roleInsertErr } = await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: userId, role: 'admin' })
        if (roleInsertErr) throw roleInsertErr
      }

      return new Response(
        JSON.stringify({ message: 'Admin user already exists and role verified', email }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Create admin user (auto-confirm)
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
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
      JSON.stringify({ message: 'Admin user created successfully', email }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'An error occurred'
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
