-- Migration to add user_id column to bookings table
-- Run this in your Supabase SQL editor

-- Add user_id column to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS user_id uuid;

-- Add foreign key constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user') THEN
        ALTER TABLE public.bookings 
        ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings USING btree (user_id);

-- Enable RLS (Row Level Security) on bookings table
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Create RLS policy to allow guests to insert reservations (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Allow authenticated users to insert bookings') THEN
        CREATE POLICY "Allow authenticated users to insert bookings" ON public.bookings
            FOR INSERT
            TO authenticated
            WITH CHECK (true);
    END IF;
END $$;

-- Create RLS policy to allow users to view their own bookings (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Users can view their own bookings') THEN
        CREATE POLICY "Users can view their own bookings" ON public.bookings
            FOR SELECT
            TO authenticated
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create RLS policy to allow restaurant owners to view bookings for their restaurants (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Restaurant owners can view bookings for their restaurants') THEN
        CREATE POLICY "Restaurant owners can view bookings for their restaurants" ON public.bookings
            FOR SELECT
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.restaurants 
                    WHERE restaurants.id = bookings.restaurant_id 
                    AND restaurants.owner_id = auth.uid()
                )
            );
    END IF;
END $$;

-- Create RLS policy to allow restaurant owners to update bookings for their restaurants (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Restaurant owners can update bookings for their restaurants') THEN
        CREATE POLICY "Restaurant owners can update bookings for their restaurants" ON public.bookings
            FOR UPDATE
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.restaurants 
                    WHERE restaurants.id = bookings.restaurant_id 
                    AND restaurants.owner_id = auth.uid()
                )
            );
    END IF;
END $$;

-- Create RLS policy to allow restaurant owners to delete bookings for their restaurants (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Restaurant owners can delete bookings for their restaurants') THEN
        CREATE POLICY "Restaurant owners can delete bookings for their restaurants" ON public.bookings
            FOR DELETE
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.restaurants 
                    WHERE restaurants.id = bookings.restaurant_id 
                    AND restaurants.owner_id = auth.uid()
                )
            );
    END IF;
END $$;
