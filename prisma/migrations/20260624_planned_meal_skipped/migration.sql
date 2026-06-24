-- Athlete can skip a planned meal; its macros are redistributed across the
-- remaining un-logged meals so the day's target is still covered.

ALTER TABLE "NutritionPlannedMeal"
ADD COLUMN "skipped" BOOLEAN NOT NULL DEFAULT false;
