-- CreateEnum
CREATE TYPE "BackgroundJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "DailyMetricsProcessingJob" (
    "id" TEXT NOT NULL,
    "jobKey" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "signature" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "BackgroundJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "runAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyMetricsProcessingJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyMetricsProcessingJob_jobKey_key" ON "DailyMetricsProcessingJob"("jobKey");

-- CreateIndex
CREATE INDEX "DailyMetricsProcessingJob_status_runAfter_idx" ON "DailyMetricsProcessingJob"("status", "runAfter");

-- CreateIndex
CREATE INDEX "DailyMetricsProcessingJob_clientId_date_idx" ON "DailyMetricsProcessingJob"("clientId", "date");

-- CreateIndex
CREATE INDEX "DailyMetricsProcessingJob_lockedAt_idx" ON "DailyMetricsProcessingJob"("lockedAt");

-- AddForeignKey
ALTER TABLE "DailyMetricsProcessingJob" ADD CONSTRAINT "DailyMetricsProcessingJob_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
