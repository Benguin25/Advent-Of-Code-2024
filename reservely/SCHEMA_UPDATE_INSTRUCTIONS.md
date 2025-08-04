# Schema Update Instructions

## Issue: Missing Restaurant Columns

The application is trying to access columns in the `restaurants` table that don't exist in the current database schema. This commonly happens when:

1. The database schema hasn't been updated to include newer columns
2. Migration scripts haven't been run
3. The local development database is out of sync with the schema files

## Missing Columns

The following columns are missing from the `restaurants` table:

- `phone_number` (TEXT)
- `max_party_size` (INTEGER, default: 8)
- `advance_booking_days` (INTEGER, default: 30)
- `min_advance_hours` (INTEGER, default: 2)

## How to Fix

### Option 1: Run the Migration Script

Run the `migration_add_missing_columns.sql` script in your Supabase SQL editor:

```sql
-- Copy and paste the contents of sql_schemas/migration_add_missing_columns.sql
-- into your Supabase SQL editor and execute it
```

### Option 2: Recreate the Tables

If you're starting fresh, you can:

1. Drop the existing tables (⚠️ This will delete all data)
2. Run the updated `tables.sql` script

### Option 3: Manual Column Addition

Add the columns manually in your Supabase dashboard:

1. Go to your Supabase project dashboard
2. Navigate to the Table Editor
3. Open the `restaurants` table
4. Add the missing columns with the correct types and defaults

## Verification

After running the migration, verify the columns exist by running:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'restaurants'
AND column_name IN ('phone_number', 'max_party_size', 'advance_booking_days', 'min_advance_hours');
```

## Schema Files Updated

The following schema files have been updated to include the missing columns:

- `sql_schemas/tables.sql` - Main table definitions
- `sql_schemas/migration_add_missing_columns.sql` - New migration script
- `src/types.ts` - TypeScript type definitions
