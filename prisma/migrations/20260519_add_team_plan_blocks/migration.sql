CREATE TABLE "TeamPlan" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "coachId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TeamPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeamPlanBlock" (
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

  CONSTRAINT "TeamPlanBlock_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TeamPlan_teamId_startDate_endDate_idx" ON "TeamPlan"("teamId", "startDate", "endDate");
CREATE INDEX "TeamPlan_coachId_idx" ON "TeamPlan"("coachId");
CREATE INDEX "TeamPlan_status_idx" ON "TeamPlan"("status");
CREATE INDEX "TeamPlanBlock_planId_order_idx" ON "TeamPlanBlock"("planId", "order");
CREATE INDEX "TeamPlanBlock_startDate_endDate_idx" ON "TeamPlanBlock"("startDate", "endDate");

ALTER TABLE "TeamPlan"
  ADD CONSTRAINT "TeamPlan_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeamPlan"
  ADD CONSTRAINT "TeamPlan_coachId_fkey"
  FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TeamPlanBlock"
  ADD CONSTRAINT "TeamPlanBlock_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "TeamPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
