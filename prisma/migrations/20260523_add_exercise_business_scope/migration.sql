ALTER TABLE "Exercise"
ADD COLUMN "businessId" TEXT;

ALTER TABLE "Exercise"
ADD CONSTRAINT "Exercise_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Exercise_businessId_idx" ON "Exercise"("businessId");
