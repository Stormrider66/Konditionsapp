-- Add internal-beta feature flag for the floating AI operations layer.
ALTER TYPE "FeatureFlag" ADD VALUE IF NOT EXISTS 'AI_ASSISTANT_OPERATIONS';

-- Durable confirmation state for floating-AI actions.
CREATE TYPE "AIActionDraftStatus" AS ENUM (
  'PENDING',
  'CONFIRMED',
  'EXECUTED',
  'FAILED',
  'CANCELLED',
  'EXPIRED'
);

CREATE TABLE "AIActionDraft" (
  "id" TEXT NOT NULL,
  "capabilityId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "actorRole" TEXT NOT NULL,
  "surface" TEXT NOT NULL,
  "actionType" TEXT NOT NULL,
  "riskLevel" TEXT NOT NULL,
  "businessId" TEXT,
  "businessSlug" TEXT,
  "clientId" TEXT,
  "teamId" TEXT,
  "conversationId" TEXT,
  "input" JSONB NOT NULL,
  "preview" JSONB NOT NULL,
  "result" JSONB,
  "status" "AIActionDraftStatus" NOT NULL DEFAULT 'PENDING',
  "errorMessage" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "confirmedAt" TIMESTAMP(3),
  "executedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AIActionDraft_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AIActionDraft_actorUserId_status_idx" ON "AIActionDraft"("actorUserId", "status");
CREATE INDEX "AIActionDraft_clientId_status_idx" ON "AIActionDraft"("clientId", "status");
CREATE INDEX "AIActionDraft_businessId_status_idx" ON "AIActionDraft"("businessId", "status");
CREATE INDEX "AIActionDraft_capabilityId_idx" ON "AIActionDraft"("capabilityId");
CREATE INDEX "AIActionDraft_expiresAt_idx" ON "AIActionDraft"("expiresAt");
