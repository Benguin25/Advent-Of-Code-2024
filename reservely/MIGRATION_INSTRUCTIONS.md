# Database Migration Instructions

## Problem

The reservation system was failing due to missing `user_id` column in the `bookings` table and lack of proper Row Level Security (RLS) policies.

## Solution

1. **Add missing `user_id` column** to the `bookings` table
2. **Set up RLS policies** to allow authenticated users (including guests) to create reservations
3. **Update application code** to include `user_id` in reservation data

## Steps to Apply

### 1. Run Database Migration

Go to your Supabase dashboard → SQL Editor and run the contents of `migration_add_user_id_and_rls.sql`

This will:

- Add the missing `user_id` column to the `bookings` table
- Add proper foreign key constraints
- Enable Row Level Security
- Create policies for:
  - Authenticated users to insert bookings
  - Users to view their own bookings
  - Restaurant owners to manage bookings for their restaurants

### 2. Verify Guest User Exists

Make sure you have a guest user in your Supabase Auth with:

- Email: `guest@guest.com`
- Password: Set in your `.env` file as `VITE_GUEST_PASSWORD`

### 3. Test the Application

The reservation system should now work properly with:

- Guest users can make reservations
- Restaurant owners can view and manage reservations
- Proper security policies in place

## What This Fixes

- **Security Policy Error**: RLS policies now allow authenticated users to create reservations
- **Missing Column Error**: `user_id` column is now properly defined in the schema
- **Foreign Key Constraint Errors**: All constraints are now properly set up

## Files Modified

- `src/lib/supabaseService.js` - Updated to include user_id in reservation data
- `sql_schemas/tables.sql` - Added user_id column to bookings table
- `sql_schemas/migration_add_user_id_and_rls.sql` - New migration file
