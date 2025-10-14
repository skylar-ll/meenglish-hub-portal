-- Create initial admin account (fixed version)
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get existing admin user or create new one
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@me-english.com';
  
  IF admin_user_id IS NOT NULL THEN
    -- Admin user exists, ensure role is assigned
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Ensure profile exists
    INSERT INTO public.profiles (id, full_name_en, full_name_ar)
    VALUES (admin_user_id, 'System Administrator', 'مدير النظام')
    ON CONFLICT (id) DO UPDATE
    SET full_name_en = 'System Administrator',
        full_name_ar = 'مدير النظام';
  END IF;
END $$;