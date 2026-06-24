-- Performance Meal Guide persistent plan layer.

CREATE TABLE "NutritionPerformancePlan" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "source" TEXT NOT NULL DEFAULT 'PERFORMANCE_MEAL_GUIDE',
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "goalSnapshot" JSONB NOT NULL,
    "contextSnapshot" JSONB,
    "generatedSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionPerformancePlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NutritionPlanDay" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "dayType" TEXT NOT NULL,
    "caloriesKcal" INTEGER NOT NULL,
    "proteinG" INTEGER NOT NULL,
    "carbsG" INTEGER NOT NULL,
    "fatG" INTEGER NOT NULL,
    "hydrationMl" INTEGER NOT NULL,
    "weightKg" DOUBLE PRECISION,
    "bmrKcal" INTEGER,
    "scheduleSnapshot" JSONB,
    "garminSnapshot" JSONB,
    "biaSnapshot" JSONB,
    "adaptationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionPlanDay_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NutritionPlannedMeal" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "mealType" "MealType" NOT NULL,
    "time" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "timingRole" TEXT NOT NULL DEFAULT 'REGULAR',
    "explanation" TEXT,
    "portionSummary" JSONB NOT NULL,
    "caloriesKcal" INTEGER NOT NULL,
    "proteinG" DOUBLE PRECISION NOT NULL,
    "carbsG" DOUBLE PRECISION NOT NULL,
    "fatG" DOUBLE PRECISION NOT NULL,
    "fiberG" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionPlannedMeal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NutritionPlannedMealOption" (
    "id" TEXT NOT NULL,
    "plannedMealId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "portionSummary" JSONB NOT NULL,
    "caloriesKcal" INTEGER NOT NULL,
    "proteinG" DOUBLE PRECISION NOT NULL,
    "carbsG" DOUBLE PRECISION NOT NULL,
    "fatG" DOUBLE PRECISION NOT NULL,
    "fiberG" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NutritionPlannedMealOption_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "MealLog"
ADD COLUMN "plannedMealId" TEXT,
ADD COLUMN "plannedMealMatchSource" TEXT,
ADD COLUMN "plannedMealMatchConfidence" DOUBLE PRECISION;

CREATE INDEX "NutritionPerformancePlan_clientId_status_startDate_endDate_idx" ON "NutritionPerformancePlan"("clientId", "status", "startDate", "endDate");
CREATE INDEX "NutritionPerformancePlan_status_idx" ON "NutritionPerformancePlan"("status");
CREATE UNIQUE INDEX "NutritionPlanDay_planId_date_key" ON "NutritionPlanDay"("planId", "date");
CREATE INDEX "NutritionPlanDay_clientId_date_idx" ON "NutritionPlanDay"("clientId", "date");
CREATE INDEX "NutritionPlanDay_dayType_idx" ON "NutritionPlanDay"("dayType");
CREATE INDEX "NutritionPlannedMeal_dayId_sortOrder_idx" ON "NutritionPlannedMeal"("dayId", "sortOrder");
CREATE INDEX "NutritionPlannedMeal_mealType_idx" ON "NutritionPlannedMeal"("mealType");
CREATE INDEX "NutritionPlannedMealOption_plannedMealId_sortOrder_idx" ON "NutritionPlannedMealOption"("plannedMealId", "sortOrder");
CREATE INDEX "MealLog_plannedMealId_idx" ON "MealLog"("plannedMealId");

ALTER TABLE "NutritionPerformancePlan" ADD CONSTRAINT "NutritionPerformancePlan_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NutritionPlanDay" ADD CONSTRAINT "NutritionPlanDay_planId_fkey" FOREIGN KEY ("planId") REFERENCES "NutritionPerformancePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NutritionPlanDay" ADD CONSTRAINT "NutritionPlanDay_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NutritionPlannedMeal" ADD CONSTRAINT "NutritionPlannedMeal_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "NutritionPlanDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NutritionPlannedMealOption" ADD CONSTRAINT "NutritionPlannedMealOption_plannedMealId_fkey" FOREIGN KEY ("plannedMealId") REFERENCES "NutritionPlannedMeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MealLog" ADD CONSTRAINT "MealLog_plannedMealId_fkey" FOREIGN KEY ("plannedMealId") REFERENCES "NutritionPlannedMeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
