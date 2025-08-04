-- Migration: Add restaurant_map column to restaurants table
-- This adds support for storing restaurant floor plan maps as JSON data

-- Add the restaurant_map column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'restaurants' 
        AND column_name = 'restaurant_map'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.restaurants 
        ADD COLUMN restaurant_map jsonb NULL;
        
        RAISE NOTICE 'Added restaurant_map column to restaurants table';
    ELSE
        RAISE NOTICE 'restaurant_map column already exists in restaurants table';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'restaurants' 
AND column_name = 'restaurant_map'
AND table_schema = 'public';
