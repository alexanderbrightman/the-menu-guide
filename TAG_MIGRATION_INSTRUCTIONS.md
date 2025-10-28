# Dietary Tag Migration Instructions

## Overview
The dietary tags "halal", "keto", "low-carb", and "organic" have been replaced with "shellfish-free" and "pescatarian" in the database schema.

## Step 1: Run the Migration Script

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Open the file `database/update_tags.sql`
4. Copy and paste the SQL script into the SQL Editor
5. Click "Run" to execute the migration

**Important**: This will:
- Delete the old tags: `halal`, `keto`, `low-carb`, `organic`
- Add the new tags: `shellfish-free`, `pescatarian`
- Any menu items that had the old tags will lose those tags (this is expected behavior)

## Step 2: Verify the Migration

After running the migration, you can verify it worked by running this query in the SQL Editor:

```sql
SELECT name FROM tags ORDER BY name;
```

You should see these tags:
- dairy-free
- gluten-free
- nut-free
- pescatarian
- shellfish-free
- spicy
- vegan
- vegetarian

## What This Means

- The updated tags will now appear in the "Dietary Tags" section when creating/editing menu items
- Old tags will no longer be available
- If you had menu items with old tags, they will no longer have dietary tags applied (you can manually re-tag them with the new tags)

## Files Changed

1. `database/schema.sql` - Updated to reflect new tag list (for documentation)
2. `database/update_tags.sql` - Migration script to update production database
3. Code changes already pushed to GitHub

The application code already supports the new tags, so once you run this migration on your production database, everything will work correctly.

