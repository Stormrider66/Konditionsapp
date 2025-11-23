-- CreateEnum
CREATE TYPE "BiomechanicalPillar" AS ENUM ('POSTERIOR_CHAIN', 'KNEE_DOMINANCE', 'UNILATERAL', 'FOOT_ANKLE', 'ANTI_ROTATION_CORE', 'UPPER_BODY');

-- CreateEnum
CREATE TYPE "ProgressionLevel" AS ENUM ('LEVEL_1', 'LEVEL_2', 'LEVEL_3');

-- CreateEnum
CREATE TYPE "PlyometricIntensity" AS ENUM ('LOW', 'MODERATE', 'HIGH');

-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "biomechanicalPillar" "BiomechanicalPillar",
ADD COLUMN     "contactsPerRep" INTEGER,
ADD COLUMN     "plyometricIntensity" "PlyometricIntensity",
ADD COLUMN     "progressionLevel" "ProgressionLevel",
ADD COLUMN     "progressionPath" TEXT,
ADD COLUMN     "substitutes" TEXT;

-- CreateIndex
CREATE INDEX "Exercise_biomechanicalPillar_idx" ON "Exercise"("biomechanicalPillar");

-- CreateIndex
CREATE INDEX "Exercise_progressionLevel_idx" ON "Exercise"("progressionLevel");
