-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'student');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name_ar TEXT,
  full_name_en TEXT,
  phone1 TEXT,
  phone2 TEXT,
  national_id TEXT,
  branch TEXT,
  program TEXT,
  class_type TEXT,
  course_level TEXT,
  payment_method TEXT,
  subscription_status TEXT DEFAULT 'active',
  next_payment_date DATE,
  courses_assigned TEXT,
  student_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all profiles"
ON public.profiles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can view student profiles"
ON public.profiles FOR SELECT
USING (
  public.has_role(auth.uid(), 'teacher') AND 
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = profiles.id AND role = 'student')
);

-- Update students table RLS policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.students;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.students;

CREATE POLICY "Students can view own record"
ON public.students FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role = 'student'
  ) AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "Admins can manage students"
ON public.students FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can view students"
ON public.students FOR SELECT
USING (public.has_role(auth.uid(), 'teacher'));

-- Update teachers table RLS policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.teachers;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.teachers;

CREATE POLICY "Teachers can view own record"
ON public.teachers FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role = 'teacher'
  ) AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "Admins can manage teachers"
ON public.teachers FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update attendance table RLS policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.attendance;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.attendance;
DROP POLICY IF EXISTS "Enable update for all users" ON public.attendance;

CREATE POLICY "Students can view own attendance"
ON public.attendance FOR SELECT
USING (
  public.has_role(auth.uid(), 'student') OR
  public.has_role(auth.uid(), 'teacher') OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Students can mark own attendance"
ON public.attendance FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'student') AND
  student_id IN (
    SELECT id FROM public.students 
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

CREATE POLICY "Teachers can manage attendance"
ON public.attendance FOR ALL
USING (
  public.has_role(auth.uid(), 'teacher') OR
  public.has_role(auth.uid(), 'admin')
);

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name_en, full_name_ar)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name_en',
    NEW.raw_user_meta_data->>'full_name_ar'
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();