-- Package D / Gap4:
-- Migration 0003 created calendar_entries_household_date_user_idx
-- (one private entry per user per date). Migration 0004 claimed to drop it
-- but only added title/time columns. Drop the unique index so a user may
-- have multiple private entries on the same day.
-- Shared kinderregeling remains unique via calendar_entries_household_date_shared_idx.

DROP INDEX IF EXISTS calendar_entries_household_date_user_idx;
