-- Migration to add owner_email field to restaurants table
-- This will store the owner's email for easy access without querying auth.users

-- Add owner_email column to restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS owner_email TEXT;

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_restaurants_owner_email ON public.restaurants USING btree (owner_email);

-- Update existing restaurants with owner emails
-- This will need to be done manually or through a one-time script
-- For now, we'll add a comment about this
-- UPDATE public.restaurants SET owner_email = (SELECT email FROM auth.users WHERE id = restaurants.owner_id);

-- Add a comment explaining the purpose
COMMENT ON COLUMN public.restaurants.owner_email IS 'Email address of the restaurant owner for notifications';
