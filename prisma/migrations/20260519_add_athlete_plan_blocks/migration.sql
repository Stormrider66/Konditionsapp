CREATE TABLE "AthletePlan" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "coachId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AthletePlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AthletePlanBlock" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "focus" TEXT,
  "description" TEXT,
  "order" INTEGER NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AthletePlanBlock_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AthletePlan_clientId_startDate_endDate_idx" ON "AthletePlan"("clientId", "startDate", "endDate");
CREATE INDEX "AthletePlan_coachId_idx" ON "AthletePlan"("coachId");
CREATE INDEX "AthletePlan_status_idx" ON "AthletePlan"("status");
CREATE INDEX "AthletePlanBlock_planId_order_idx" ON "AthletePlanBlock"("planId", "order");
CREATE INDEX "AthletePlanBlock_startDate_endDate_idx" ON "AthletePlanBlock"("startDate", "endDate");

ALTER TABLE "AthletePlan"
  ADD CONSTRAINT "AthletePlan_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AthletePlan"
  ADD CONSTRAINT "AthletePlan_coachId_fkey"
  FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AthletePlanBlock"
  ADD CONSTRAINT "AthletePlanBlock_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "AthletePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
