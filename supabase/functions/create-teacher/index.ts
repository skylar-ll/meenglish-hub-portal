import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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
    )

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if user is admin
    const { data: roles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (roleError || !roles) {
      console.error('Role check error:', roleError)
      return new Response(JSON.stringify({ error: 'Unauthorized: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { name, email, password, classId } = await req.json()
    console.log('Creating teacher:', { name, email, classId })

    // Create the teacher user using admin client
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name }
    })

    if (createError) {
      console.error('Create user error:', createError)
      if (createError.message?.includes('email') || createError.code === 'email_exists') {
        throw new Error('A user with this email address has already been registered')
      }
      throw createError
    }
    
    if (!newUser.user) {
      throw new Error('Failed to create user')
    }

    console.log('User created:', newUser.user.id)

    // Insert teacher record
    const { error: teacherError } = await supabaseAdmin
      .from('teachers')
      .insert({
        id: newUser.user.id,
        full_name: name,
        email: email,
      })

    if (teacherError) {
      console.error('Teacher insert error:', teacherError)
      // Rollback: delete the auth user if teacher record fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      throw teacherError
    }

    console.log('Teacher record created')

    // Assign teacher role
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: 'teacher',
      })

    if (roleInsertError) {
      console.error('Role insert error:', roleInsertError)
      // Rollback
      await supabaseAdmin.from('teachers').delete().eq('id', newUser.user.id)
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      throw roleInsertError
    }

    console.log('Teacher role assigned')

    // Update single class with teacher assignment (one-to-one relationship)
    if (classId) {
      // First check if class is already assigned
      const { data: existingClass, error: checkError } = await supabaseAdmin
        .from('classes')
        .select('teacher_id, class_name')
        .eq('id', classId)
        .single()

      if (checkError) {
        console.error('Class check error:', checkError)
      } else if (existingClass?.teacher_id) {
        console.log('Class already has a teacher assigned, skipping')
      } else {
        const { error: classError } = await supabaseAdmin
          .from('classes')
          .update({ teacher_id: newUser.user.id })
          .eq('id', classId)

        if (classError) {
          console.error('Class update error:', classError)
          // Don't rollback everything for class assignment failure
          // Teacher is still created successfully
        } else {
          console.log('Class assigned to teacher')
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        teacher: {
          id: newUser.user.id,
          email: email,
          password: password,
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error creating teacher:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
