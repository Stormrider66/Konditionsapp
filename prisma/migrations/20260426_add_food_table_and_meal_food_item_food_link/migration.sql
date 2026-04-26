-- Adds the Food reference table (Livsmedelsverket import target) and
-- a nullable FK from MealFoodItem so manual ingredient-builder rows can
-- point at the canonical food row. Existing rows (from photo/voice scans)
-- keep foodId NULL and continue to work unchanged.
--
-- Apply locally with:
--   export $(grep -E '^(DATABASE_URL|DIRECT_DATABASE_URL)=' .env.local | xargs) \
--     && npx prisma db execute --file prisma/migrations/20260426_add_food_table_and_meal_food_item_food_link/migration.sql
--
-- Per project_prisma_migration_baseline: prod was built via db push,
-- so apply via db execute, not migrate deploy.

-- 1. New Food table
CREATE TABLE "Food" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT,
    "nameSv" TEXT NOT NULL,
    "nameEn" TEXT,
    "searchName" TEXT NOT NULL,
    "category" TEXT,
    "caloriesPer100g" DOUBLE PRECISION NOT NULL,
    "proteinPer100g" DOUBLE PRECISION NOT NULL,
    "carbsPer100g" DOUBLE PRECISION NOT NULL,
    "fatPer100g" DOUBLE PRECISION NOT NULL,
    "fiberPer100g" DOUBLE PRECISION,
    "saturatedFatPer100g" DOUBLE PRECISION,
    "monounsaturatedFatPer100g" DOUBLE PRECISION,
    "polyunsaturatedFatPer100g" DOUBLE PRECISION,
    "sugarPer100g" DOUBLE PRECISION,
    "popularity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Food_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Food_source_externalId_key" ON "Food"("source", "externalId");
CREATE INDEX "Food_searchName_idx" ON "Food"("searchName");
CREATE INDEX "Food_popularity_idx" ON "Food"("popularity");

-- 2. Link MealFoodItem to Food (nullable; existing rows stay NULL)
ALTER TABLE "MealFoodItem" ADD COLUMN "foodId" TEXT;

ALTER TABLE "MealFoodItem"
    ADD CONSTRAINT "MealFoodItem_foodId_fkey"
    FOREIGN KEY ("foodId") REFERENCES "Food"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "MealFoodItem_foodId_idx" ON "MealFoodItem"("foodId");
