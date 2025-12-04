-- Add currency column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD';

-- Update existing rows to have USD if null (though default handles new ones)
UPDATE profiles SET currency = 'USD' WHERE currency IS NULL;
