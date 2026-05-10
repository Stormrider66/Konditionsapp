ALTER TABLE "MealFoodItem"
ADD COLUMN "proteinSource" TEXT;

ALTER TABLE "Food"
ADD COLUMN "proteinSource" TEXT,
ADD COLUMN "isCompleteProtein" BOOLEAN;
