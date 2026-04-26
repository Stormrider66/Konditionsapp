-- Add lifestyle / NEAT activity level to SportProfile so daily nutrition
-- baseline can reflect the athlete's job and everyday movement on top of
-- structured training. Workout kcal are added separately — these factors
-- EXCLUDE training. Defaults to SEDENTARY so existing users see no change.

-- CreateEnum
CREATE TYPE "LifestyleActivity" AS ENUM ('SEDENTARY', 'LIGHTLY_ACTIVE', 'MODERATELY_ACTIVE', 'VERY_ACTIVE');

-- AlterTable
ALTER TABLE "SportProfile" ADD COLUMN "lifestyleActivity" "LifestyleActivity" NOT NULL DEFAULT 'SEDENTARY';
