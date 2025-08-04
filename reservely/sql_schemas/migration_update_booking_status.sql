-- Migration to update booking status system
-- Change default status from 'pending' to 'current'
-- Update existing 'pending' and 'confirmed' statuses to 'current'

-- Update existing records
UPDATE bookings 
SET status = 'planned' 
WHERE status IN ('upcoming');

-- Update the default value for new records
ALTER TABLE bookings 
ALTER COLUMN status SET DEFAULT 'planned';

-- Note: This migration assumes the status column is already of type TEXT
-- If using an enum type, you would need to:
-- 1. Add 'planned' to the enum
-- 2. Update the records
-- 3. Remove 'upcoming' and 'confirmed' from the enum
-- 4. Update the default value
    