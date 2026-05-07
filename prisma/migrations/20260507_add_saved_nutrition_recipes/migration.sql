-- Saved nutrition recipe templates for reusable manual meal logging.
-- Access is server-managed through Next.js API routes, so Supabase REST access
-- is denied with RLS policies.

CREATE TABLE "NutritionRecipe" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "baseServings" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "source" TEXT NOT NULL DEFAULT 'MANUAL',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NutritionRecipe_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NutritionRecipeIngredient" (
  "id" TEXT NOT NULL,
  "recipeId" TEXT NOT NULL,
  "foodId" TEXT,
  "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "category" TEXT,
  "grams" DOUBLE PRECISION NOT NULL,
  "caloriesPer100g" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "proteinPer100g" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "carbsPer100g" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "fatPer100g" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "fiberPer100g" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NutritionRecipeIngredient_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NutritionRecipe_clientId_updatedAt_idx" ON "NutritionRecipe"("clientId", "updatedAt");
CREATE INDEX "NutritionRecipe_clientId_name_idx" ON "NutritionRecipe"("clientId", "name");
CREATE INDEX "NutritionRecipeIngredient_recipeId_idx" ON "NutritionRecipeIngredient"("recipeId");
CREATE INDEX "NutritionRecipeIngredient_foodId_idx" ON "NutritionRecipeIngredient"("foodId");
CREATE INDEX "NutritionRecipeIngredient_normalizedName_idx" ON "NutritionRecipeIngredient"("normalizedName");

ALTER TABLE "NutritionRecipe"
  ADD CONSTRAINT "NutritionRecipe_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NutritionRecipeIngredient"
  ADD CONSTRAINT "NutritionRecipeIngredient_recipeId_fkey"
  FOREIGN KEY ("recipeId") REFERENCES "NutritionRecipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NutritionRecipeIngredient"
  ADD CONSTRAINT "NutritionRecipeIngredient_foodId_fkey"
  FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "NutritionRecipe" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "NutritionRecipe"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "NutritionRecipeIngredient" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "NutritionRecipeIngredient"
  FOR ALL TO anon, authenticated USING (false);
