-- Migration: Add privacy support for per-user private agenda
-- Package B: Private entries alongside shared kinderregeling

-- Add privacy columns to calendar_entries
ALTER TABLE calendar_entries
  ADD COLUMN is_shared BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN owner_id UUID;

-- Add foreign key constraint for owner_id
ALTER TABLE calendar_entries
  ADD CONSTRAINT calendar_entries_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES users(id);

-- Update existing entries to be shared (backward compatibility)
UPDATE calendar_entries SET is_shared = TRUE WHERE is_shared IS NULL;

-- Drop old unique constraint (one entry per household per date)
DROP INDEX IF EXISTS calendar_entries_household_date_idx;

-- Add new unique constraint: one shared entry per household per date
CREATE UNIQUE INDEX calendar_entries_household_date_shared_idx
  ON calendar_entries (household_id, date)
  WHERE is_shared = true;

-- Add unique constraint: one private entry per user per date
CREATE UNIQUE INDEX calendar_entries_household_date_user_idx
  ON calendar_entries (household_id, date, owner_id)
  WHERE is_shared = false;

-- Add constraint: private entries must have an owner
ALTER TABLE calendar_entries
  ADD CONSTRAINT calendar_entries_private_must_have_owner
  CHECK (is_shared = true OR owner_id IS NOT NULL);

-- Add constraint: shared entries should not have owner_id
-- (Actually, let's allow it for audit purposes - who created the shared entry)
-- No constraint needed here
