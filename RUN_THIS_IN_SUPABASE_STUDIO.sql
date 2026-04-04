-- ⚠️ COPY & PASTE THIS INTO SUPABASE STUDIO SQL EDITOR
-- https://supabase.com/dashboard/project/ssqifnxhbywabvglnppj/sql/new

-- Step 1: Drop existing problematic policies
DROP POLICY IF EXISTS "Public read access" ON members;
DROP POLICY IF EXISTS "Members can read own trip" ON members;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON members;
DROP POLICY IF EXISTS "Users can update own record" ON members;
DROP POLICY IF EXISTS "Users can delete own record" ON members;

-- Step 2: Disable and re-enable RLS to reset
ALTER TABLE members DISABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Step 3: Create new simple policies (no recursion)
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

-- Step 4: Verify policies were created
SELECT schemaname, tablename, policyname, permissive, cmd
FROM pg_policies
WHERE tablename = 'members'
ORDER BY policyname;
