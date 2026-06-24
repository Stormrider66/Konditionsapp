-- Add concrete recipe cards to each planned performance meal.

ALTER TABLE "NutritionPlannedMeal"
ADD COLUMN "recipeTitle" TEXT,
ADD COLUMN "recipeSummary" TEXT,
ADD COLUMN "recipeServings" DOUBLE PRECISION NOT NULL DEFAULT 1,
ADD COLUMN "recipePrepMinutes" INTEGER,
ADD COLUMN "recipeCookMinutes" INTEGER,
ADD COLUMN "recipeIngredients" JSONB,
ADD COLUMN "recipeSteps" JSONB,
ADD COLUMN "recipeTips" JSONB,
ADD COLUMN "recipeSource" TEXT NOT NULL DEFAULT 'TEMPLATE',
ADD COLUMN "recipePrompt" TEXT,
ADD COLUMN "recipeUpdatedAt" TIMESTAMP(3);

CREATE INDEX "NutritionPlannedMeal_recipeSource_idx" ON "NutritionPlannedMeal"("recipeSource");
