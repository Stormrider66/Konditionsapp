-- Allow AI calls without a user context to be logged instead of dropped.
ALTER TABLE "AIUsageLog" ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "AIUsageLog" DROP CONSTRAINT IF EXISTS "AIUsageLog_userId_fkey";
ALTER TABLE "AIUsageLog"
  ADD CONSTRAINT "AIUsageLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- SKU-level provider invoice rows for reconciling internal estimates with
-- actual cloud/provider billing exports.
CREATE TABLE "AIProviderBillingImport" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'manual_csv',
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "serviceDescription" TEXT NOT NULL,
  "serviceId" TEXT,
  "skuDescription" TEXT,
  "skuId" TEXT,
  "usageAmount" DOUBLE PRECISION,
  "usageUnit" TEXT,
  "costSek" DOUBLE PRECISION NOT NULL,
  "subtotalSek" DOUBLE PRECISION,
  "taxSek" DOUBLE PRECISION,
  "raw" JSONB,
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AIProviderBillingImport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AIProviderBillingImport_provider_periodStart_periodEnd_serviceDescription_skuId_skuDescription_key"
  ON "AIProviderBillingImport"("provider", "periodStart", "periodEnd", "serviceDescription", "skuId", "skuDescription");

CREATE INDEX "AIProviderBillingImport_provider_periodStart_periodEnd_idx"
  ON "AIProviderBillingImport"("provider", "periodStart", "periodEnd");

CREATE INDEX "AIProviderBillingImport_serviceDescription_idx"
  ON "AIProviderBillingImport"("serviceDescription");

CREATE INDEX "AIProviderBillingImport_skuId_idx"
  ON "AIProviderBillingImport"("skuId");
