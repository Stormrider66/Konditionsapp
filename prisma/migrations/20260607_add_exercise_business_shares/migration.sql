CREATE TABLE "ExerciseBusinessShare" (
    "id" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExerciseBusinessShare_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExerciseBusinessShare_exerciseId_businessId_key"
ON "ExerciseBusinessShare"("exerciseId", "businessId");

CREATE INDEX "ExerciseBusinessShare_businessId_idx"
ON "ExerciseBusinessShare"("businessId");

CREATE INDEX "ExerciseBusinessShare_exerciseId_idx"
ON "ExerciseBusinessShare"("exerciseId");

ALTER TABLE "ExerciseBusinessShare"
ADD CONSTRAINT "ExerciseBusinessShare_exerciseId_fkey"
FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExerciseBusinessShare"
ADD CONSTRAINT "ExerciseBusinessShare_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
