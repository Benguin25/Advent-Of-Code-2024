-- Migration to add missing columns to restaurants table
-- This migration adds any missing columns that might not be present in the current schema
-- Run this in your Supabase SQL editor

-- Add phone_number column if it doesn't exist
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Add max_party_size column if it doesn't exist
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS max_party_size INTEGER DEFAULT 8;

-- Add min_party_size column if it doesn't exist
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS min_party_size INTEGER DEFAULT 1;

-- Add advance_booking_days column if it doesn't exist
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS advance_booking_days INTEGER DEFAULT 30;

-- Add min_advance_hours column if it doesn't exist
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS min_advance_hours INTEGER DEFAULT 2;

-- Add comments for documentation
COMMENT ON COLUMN public.restaurants.phone_number IS 'Restaurant contact phone number';
COMMENT ON COLUMN public.restaurants.max_party_size IS 'Maximum party size that can be accommodated';
COMMENT ON COLUMN public.restaurants.min_party_size IS 'Minimum party size that can be accommodated';
COMMENT ON COLUMN public.restaurants.advance_booking_days IS 'How many days in advance reservations can be made';
COMMENT ON COLUMN public.restaurants.min_advance_hours IS 'Minimum hours of advance notice required for reservations';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_restaurants_max_party_size ON public.restaurants USING btree (max_party_size);
CREATE INDEX IF NOT EXISTS idx_restaurants_min_party_size ON public.restaurants USING btree (min_party_size);
CREATE INDEX IF NOT EXISTS idx_restaurants_advance_booking ON public.restaurants USING btree (advance_booking_days);
