-- Fix RLS policies on students table to avoid querying auth.users directly
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Students can view own record" ON students;
DROP POLICY IF EXISTS "Students can update own record" ON students;
DROP POLICY IF EXISTS "Authenticated users can insert during signup" ON students;

-- Create new policies that don't query auth.users
-- Students can view their own record by matching email from JWT
CREATE POLICY "Students can view own record"
ON students
FOR SELECT
TO authenticated
USING (
  email = auth.jwt()->>'email'
);

-- Students can update their own record
CREATE POLICY "Students can update own record"
ON students
FOR UPDATE
TO authenticated
USING (
  email = auth.jwt()->>'email'
);

-- Allow authenticated users to insert during signup
CREATE POLICY "Authenticated users can insert during signup"
ON students
FOR INSERT
TO authenticated
WITH CHECK (
  email = auth.jwt()->>'email'
);