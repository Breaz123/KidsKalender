-- Migration: Add private entry fields (title, time)
-- Package B: Private entries use simpler model (title, time, note)

-- Add title field for private entries
ALTER TABLE calendar_entries
  ADD COLUMN title VARCHAR(200);

-- Add time field for private entries (optional, e.g., "14:00" or "14:00-15:30")
ALTER TABLE calendar_entries
  ADD COLUMN time VARCHAR(50);

-- Add constraint: private entries must have a title
-- (We'll enforce this in the application layer for now, as CHECK constraints
--  on conditional fields are complex in PostgreSQL)

-- Note: Private entries use: title (required), time (optional), note (optional)
--       Shared entries use: existing location/activity fields
