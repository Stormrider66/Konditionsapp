-- Operator Agents & Supporting Tables
-- Adds tables for the operator agents system (support, churn, founder's brief, etc.)
-- plus supporting infrastructure (auth events, job queue, runtime config).

-- ============================================================================
-- Managed Agent Sessions (for athlete/coach/physio agents)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "ManagedAgentSession" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "agentType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "externalId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "modelIntent" TEXT NOT NULL DEFAULT 'balanced',
  "lastEventAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "totalTokensUsed" INTEGER NOT NULL DEFAULT 0,
  "totalCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "metadata" JSONB,
  CONSTRAINT "ManagedAgentSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ManagedAgentSession_agentType_entityId_idx" ON "ManagedAgentSession"("agentType", "entityId");
CREATE INDEX IF NOT EXISTS "ManagedAgentSession_status_idx" ON "ManagedAgentSession"("status");
CREATE INDEX IF NOT EXISTS "ManagedAgentSession_lastEventAt_idx" ON "ManagedAgentSession"("lastEventAt");

CREATE TABLE IF NOT EXISTS "AgentEvent" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "eventType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "eventData" JSONB NOT NULL,
  "sessionId" TEXT,
  "processedAt" TIMESTAMP(3),
  "result" JSONB,
  CONSTRAINT "AgentEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AgentEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ManagedAgentSession"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AgentEvent_sessionId_createdAt_idx" ON "AgentEvent"("sessionId", "createdAt");
CREATE INDEX IF NOT EXISTS "AgentEvent_entityId_eventType_idx" ON "AgentEvent"("entityId", "eventType");
CREATE INDEX IF NOT EXISTS "AgentEvent_processedAt_idx" ON "AgentEvent"("processedAt");

-- ============================================================================
-- Support Tickets & Feature Requests
-- ============================================================================

CREATE TABLE IF NOT EXISTS "SupportTicket" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "userId" TEXT,
  "reporterEmail" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT,
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "url" TEXT,
  "userAgent" TEXT,
  "screenshot" TEXT,
  "metadata" JSONB,
  "agentClassified" BOOLEAN NOT NULL DEFAULT false,
  "agentDraftResponse" TEXT,
  "agentCategory" TEXT,
  "agentSimilarTickets" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "githubIssueUrl" TEXT,
  "featureRequestId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "resolvedAt" TIMESTAMP(3),
  "resolvedBy" TEXT,
  "resolution" TEXT,
  CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SupportTicket_status_priority_idx" ON "SupportTicket"("status", "priority");
CREATE INDEX IF NOT EXISTS "SupportTicket_userId_idx" ON "SupportTicket"("userId");
CREATE INDEX IF NOT EXISTS "SupportTicket_createdAt_idx" ON "SupportTicket"("createdAt");

CREATE TABLE IF NOT EXISTS "FeatureRequest" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "submittedBy" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT,
  "upvotes" INTEGER NOT NULL DEFAULT 0,
  "voters" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "agentImpactScore" DOUBLE PRECISION,
  "agentDuplicateOf" TEXT,
  "agentSummary" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "githubIssueUrl" TEXT,
  CONSTRAINT "FeatureRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FeatureRequest_status_agentImpactScore_idx" ON "FeatureRequest"("status", "agentImpactScore");
CREATE INDEX IF NOT EXISTS "FeatureRequest_category_idx" ON "FeatureRequest"("category");

-- Add FK from SupportTicket to FeatureRequest
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_featureRequestId_fkey"
  FOREIGN KEY ("featureRequestId") REFERENCES "FeatureRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- Operator Agent Execution Log
-- ============================================================================

CREATE TABLE IF NOT EXISTS "OperatorAgentRun" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "agentType" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "triggeredBy" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "durationMs" INTEGER,
  "itemsProcessed" INTEGER,
  "actionsTaken" INTEGER,
  "escalations" INTEGER,
  "summary" TEXT,
  "details" JSONB,
  "modelUsed" TEXT,
  "tokensUsed" INTEGER NOT NULL DEFAULT 0,
  "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  CONSTRAINT "OperatorAgentRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OperatorAgentRun_agentType_createdAt_idx" ON "OperatorAgentRun"("agentType", "createdAt");
CREATE INDEX IF NOT EXISTS "OperatorAgentRun_status_idx" ON "OperatorAgentRun"("status");

-- ============================================================================
-- Founder's Daily Brief
-- ============================================================================

CREATE TABLE IF NOT EXISTS "FounderBrief" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "date" DATE NOT NULL,
  "revenue" JSONB NOT NULL,
  "attention" JSONB NOT NULL,
  "topRequest" JSONB,
  "focusSuggestion" TEXT,
  "fullContent" TEXT NOT NULL,
  "emailedTo" TEXT,
  "emailedAt" TIMESTAMP(3),
  "readAt" TIMESTAMP(3),
  CONSTRAINT "FounderBrief_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FounderBrief_date_key" ON "FounderBrief"("date");
CREATE INDEX IF NOT EXISTS "FounderBrief_date_idx" ON "FounderBrief"("date");

-- ============================================================================
-- Weekly Reports (BI, Competitor Intel, Marketing)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "WeeklyReport" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "weekStart" DATE NOT NULL,
  "reportType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "fullContent" TEXT NOT NULL,
  "structuredData" JSONB,
  "agentRunId" TEXT,
  "emailedTo" TEXT,
  "emailedAt" TIMESTAMP(3),
  "readAt" TIMESTAMP(3),
  CONSTRAINT "WeeklyReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WeeklyReport_weekStart_reportType_key" ON "WeeklyReport"("weekStart", "reportType");
CREATE INDEX IF NOT EXISTS "WeeklyReport_weekStart_idx" ON "WeeklyReport"("weekStart");
CREATE INDEX IF NOT EXISTS "WeeklyReport_reportType_idx" ON "WeeklyReport"("reportType");

-- ============================================================================
-- Platform Config (runtime key-value config)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "PlatformConfig" (
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "valueType" TEXT NOT NULL DEFAULT 'string',
  "category" TEXT,
  "description" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "updatedBy" TEXT,
  CONSTRAINT "PlatformConfig_pkey" PRIMARY KEY ("key")
);

CREATE INDEX IF NOT EXISTS "PlatformConfig_category_idx" ON "PlatformConfig"("category");

-- ============================================================================
-- Operator Agent Job Queue
-- ============================================================================

CREATE TABLE IF NOT EXISTS "OperatorAgentJob" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "agentType" TEXT NOT NULL,
  "triggeredBy" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "scheduledFor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "lastError" TEXT,
  "context" JSONB,
  "result" JSONB,
  "lockedAt" TIMESTAMP(3),
  "lockedBy" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "OperatorAgentJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OperatorAgentJob_status_scheduledFor_idx" ON "OperatorAgentJob"("status", "scheduledFor");
CREATE INDEX IF NOT EXISTS "OperatorAgentJob_agentType_createdAt_idx" ON "OperatorAgentJob"("agentType", "createdAt");

-- ============================================================================
-- Auth Events (for Compliance & Security Agent)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "AuthEvent" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "eventType" TEXT NOT NULL,
  "userId" TEXT,
  "email" TEXT,
  "failureReason" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "metadata" JSONB,
  CONSTRAINT "AuthEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuthEvent_eventType_createdAt_idx" ON "AuthEvent"("eventType", "createdAt");
CREATE INDEX IF NOT EXISTS "AuthEvent_ipAddress_createdAt_idx" ON "AuthEvent"("ipAddress", "createdAt");
CREATE INDEX IF NOT EXISTS "AuthEvent_email_createdAt_idx" ON "AuthEvent"("email", "createdAt");
CREATE INDEX IF NOT EXISTS "AuthEvent_userId_createdAt_idx" ON "AuthEvent"("userId", "createdAt");
