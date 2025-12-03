import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (rolesError || !roles) {
      throw new Error('Only admins can access teacher accounts');
    }

    const { teacherId } = await req.json();

    if (!teacherId) {
      throw new Error('Teacher ID is required');
    }

    // Get teacher details
    const { data: teacher, error: teacherError } = await supabaseAdmin
      .from('teachers')
      .select('email, id')
      .eq('id', teacherId)
      .single();

    if (teacherError || !teacher) {
      throw new Error('Teacher not found');
    }

    // Find the auth user by email
    const { data: authUserData, error: authUserError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authUserError) {
      console.error('Failed to list users:', authUserError);
      throw new Error('Failed to list users');
    }

    const teacherEmailLower = teacher.email.toLowerCase();
    console.log('Looking for teacher email (lowercase):', teacherEmailLower);
    console.log('Total auth users found:', authUserData.users.length);

    // Case-insensitive email matching
    const teacherAuthUser = authUserData.users.find(u => 
      u.email?.toLowerCase() === teacherEmailLower
    );

    if (!teacherAuthUser) {
      console.error('Teacher auth account not found for email:', teacher.email);
      console.error('Teacher ID:', teacher.id);
      console.error('Available emails:', authUserData.users.map(u => u.email?.toLowerCase()));
      throw new Error(`Teacher auth account not found for ${teacher.email}. Please recreate this teacher account.`);
    }

    // Use the actual auth user's email (from auth system) for magic link
    const authEmail = teacherAuthUser.email!;
    console.log('Found auth user with email:', authEmail);

    // Generate a one-time access token using magic link
    const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: authEmail,
    });

    if (magicLinkError) {
      throw magicLinkError;
    }

    // Extract the token from the action link
    const actionLink = magicLinkData.properties.action_link;
    const url = new URL(actionLink);
    const tokenHash = url.searchParams.get('token');
    const tokenType = url.searchParams.get('type');

    if (!tokenHash || !tokenType) {
      throw new Error('Failed to extract token from magic link');
    }

    console.log('Admin impersonation successful for teacher:', teacher.email);

    return new Response(
      JSON.stringify({ 
        success: true,
        token: tokenHash,
        type: tokenType,
        teacherId: teacher.id,
        teacherEmail: teacher.email
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in admin-impersonate-teacher:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorDetails = error instanceof Error ? error.stack : '';
    
    console.error('Full error details:', {
      message: errorMessage,
      stack: errorDetails,
      error: JSON.stringify(error)
    });
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
