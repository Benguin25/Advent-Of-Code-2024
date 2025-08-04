-- Migration to add RLS policy for public table access
-- This allows the reservation form to read tables for availability checking

-- Enable RLS on tables if not already enabled
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access to tables for reservation purposes
-- This is safe because table information (name, capacity) is not sensitive
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tables' AND policyname = 'Allow public to read tables for reservations') THEN
        CREATE POLICY "Allow public to read tables for reservations" ON public.tables
            FOR SELECT
            TO public
            USING (true);
    END IF;
END $$;

-- Alternative: If you want to be more restrictive, only allow authenticated users
-- DO $$ 
-- BEGIN
--     IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tables' AND policyname = 'Allow authenticated users to read tables') THEN
--         CREATE POLICY "Allow authenticated users to read tables" ON public.tables
--             FOR SELECT
--             TO authenticated
--             USING (true);
--     END IF;
-- END $$;
