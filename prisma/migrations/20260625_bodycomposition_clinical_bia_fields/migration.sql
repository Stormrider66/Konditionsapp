-- Clinical / professional BIA fields (e.g. Akern BodyGram, InBody clinical).
-- Captures raw bioelectrical values (resistance, reactance, phase angle) plus
-- device-reported tissue masses (kg) and body water (litres) that consumer
-- scales don't provide. All columns nullable — existing rows are unaffected.

ALTER TABLE "BodyComposition"
  ADD COLUMN "resistanceOhm" DOUBLE PRECISION,
  ADD COLUMN "reactanceOhm" DOUBLE PRECISION,
  ADD COLUMN "phaseAngle" DOUBLE PRECISION,
  ADD COLUMN "fatFreeMassKg" DOUBLE PRECISION,
  ADD COLUMN "fatMassKg" DOUBLE PRECISION,
  ADD COLUMN "bodyCellMassKg" DOUBLE PRECISION,
  ADD COLUMN "extracellularMassKg" DOUBLE PRECISION,
  ADD COLUMN "bcmIndex" DOUBLE PRECISION,
  ADD COLUMN "totalBodyWaterL" DOUBLE PRECISION,
  ADD COLUMN "intracellularWaterL" DOUBLE PRECISION,
  ADD COLUMN "extracellularWaterL" DOUBLE PRECISION,
  ADD COLUMN "sodiumPotassiumRatio" DOUBLE PRECISION;
