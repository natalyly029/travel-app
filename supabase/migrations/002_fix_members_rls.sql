-- Fix infinite recursion in members table RLS policy
-- Run this in Supabase Studio → SQL Editor

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Public read access" ON members;
DROP POLICY IF EXISTS "Members can read own trip" ON members;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON members;
DROP POLICY IF EXISTS "Users can update own record" ON members;
DROP POLICY IF EXISTS "Users can delete own record" ON members;

-- Disable and re-enable RLS
ALTER TABLE members DISABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies
CREATE POLICY "Allow public read"
ON members FOR SELECT
USING (true);

CREATE POLICY "Allow insert"
ON members FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow update"
ON members FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow delete"
ON members FOR DELETE
USING (true);

-- Verify policies are created
SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'members'
ORDER BY policyname;
