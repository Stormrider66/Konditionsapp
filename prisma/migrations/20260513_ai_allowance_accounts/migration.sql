ALTER TABLE "AIUsageLog" ADD COLUMN "clientId" TEXT;

ALTER TABLE "AIUsageLog"
  ADD CONSTRAINT "AIUsageLog_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "AIUsageLog_clientId_idx" ON "AIUsageLog"("clientId");
CREATE INDEX "AIUsageLog_clientId_createdAt_idx" ON "AIUsageLog"("clientId", "createdAt");

CREATE TABLE "AIAllowanceAccount" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "includedBudgetSek" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "includedUsedSek" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "topUpBalanceSek" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "hardCapSek" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "lastResetAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AIAllowanceAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AIAllowanceAccount_clientId_key" ON "AIAllowanceAccount"("clientId");
CREATE INDEX "AIAllowanceAccount_clientId_idx" ON "AIAllowanceAccount"("clientId");
CREATE INDEX "AIAllowanceAccount_periodEnd_idx" ON "AIAllowanceAccount"("periodEnd");
CREATE INDEX "AIAllowanceAccount_status_idx" ON "AIAllowanceAccount"("status");

ALTER TABLE "AIAllowanceAccount"
  ADD CONSTRAINT "AIAllowanceAccount_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AITopUpPurchase" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "stripePaymentIntentId" TEXT,
  "stripeCheckoutSessionId" TEXT,
  "amountPaidSek" DOUBLE PRECISION NOT NULL,
  "creditsSek" DOUBLE PRECISION NOT NULL,
  "creditsRemainingSek" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'SEK',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AITopUpPurchase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AITopUpPurchase_stripePaymentIntentId_key" ON "AITopUpPurchase"("stripePaymentIntentId");
CREATE UNIQUE INDEX "AITopUpPurchase_stripeCheckoutSessionId_key" ON "AITopUpPurchase"("stripeCheckoutSessionId");
CREATE INDEX "AITopUpPurchase_clientId_idx" ON "AITopUpPurchase"("clientId");
CREATE INDEX "AITopUpPurchase_status_idx" ON "AITopUpPurchase"("status");
CREATE INDEX "AITopUpPurchase_expiresAt_idx" ON "AITopUpPurchase"("expiresAt");

ALTER TABLE "AITopUpPurchase"
  ADD CONSTRAINT "AITopUpPurchase_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
