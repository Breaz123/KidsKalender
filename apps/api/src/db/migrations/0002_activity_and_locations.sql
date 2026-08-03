ALTER TABLE "calendar_entries" ADD COLUMN IF NOT EXISTS "activity" varchar(50);
--> statement-breakpoint
ALTER TABLE "calendar_entries" ADD COLUMN IF NOT EXISTS "activity_other" varchar(100);
--> statement-breakpoint
UPDATE "calendar_entries"
SET "activity" = 'vakantie'
WHERE ("sleep_location" = 'vakantie' OR "daytime_location" = 'vakantie')
  AND ("activity" IS NULL);
--> statement-breakpoint
UPDATE "calendar_entries"
SET "activity" = 'school'
WHERE "daytime_location" = 'school' AND ("activity" IS NULL);
--> statement-breakpoint
UPDATE "calendar_entries"
SET "activity" = 'krakkebol'
WHERE "daytime_location" = 'krakkebol' AND ("activity" IS NULL);
--> statement-breakpoint
UPDATE "calendar_entries"
SET "sleep_location" = NULL
WHERE "sleep_location" = 'vakantie';
--> statement-breakpoint
UPDATE "calendar_entries"
SET "sleep_location" = 'oma'
WHERE "sleep_location" = 'oma_omi';
--> statement-breakpoint
UPDATE "calendar_entries"
SET "daytime_location" = NULL
WHERE "daytime_location" IN ('vakantie', 'school', 'krakkebol');
