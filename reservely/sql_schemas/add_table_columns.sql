-- Migration: Add current_status column to tables table
-- This adds support for real-time table status tracking

-- Add the current_status column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'tables' 
        AND column_name = 'current_status'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.tables 
        ADD COLUMN current_status text DEFAULT 'available';
        
        RAISE NOTICE 'Added current_status column to tables table';
    ELSE
        RAISE NOTICE 'current_status column already exists in tables table';
    END IF;
END $$;

-- Also add map_position and assigned_table_id columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'tables' 
        AND column_name = 'map_position'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.tables 
        ADD COLUMN map_position jsonb NULL;
        
        RAISE NOTICE 'Added map_position column to tables table';
    ELSE
        RAISE NOTICE 'map_position column already exists in tables table';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'tables' 
        AND column_name = 'assigned_table_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.tables 
        ADD COLUMN assigned_table_id uuid NULL;
        
        RAISE NOTICE 'Added assigned_table_id column to tables table';
    ELSE
        RAISE NOTICE 'assigned_table_id column already exists in tables table';
    END IF;
END $$;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tables' 
AND column_name IN ('current_status', 'map_position', 'assigned_table_id')
AND table_schema = 'public'
ORDER BY column_name;
