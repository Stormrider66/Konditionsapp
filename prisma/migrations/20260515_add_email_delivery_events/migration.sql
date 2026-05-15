CREATE TABLE "EmailDeliveryEvent" (
  "id" TEXT NOT NULL,
  "resendEmailId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "eventCreatedAt" TIMESTAMP(3) NOT NULL,
  "from" TEXT,
  "to" TEXT[],
  "subject" TEXT,
  "category" TEXT,
  "emailType" TEXT,
  "businessId" TEXT,
  "invitationId" TEXT,
  "targetId" TEXT,
  "reason" TEXT,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailDeliveryEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailDeliveryEvent_resendEmailId_eventType_eventCreatedAt_key" ON "EmailDeliveryEvent"("resendEmailId", "eventType", "eventCreatedAt");
CREATE INDEX "EmailDeliveryEvent_resendEmailId_idx" ON "EmailDeliveryEvent"("resendEmailId");
CREATE INDEX "EmailDeliveryEvent_eventType_eventCreatedAt_idx" ON "EmailDeliveryEvent"("eventType", "eventCreatedAt");
CREATE INDEX "EmailDeliveryEvent_category_emailType_idx" ON "EmailDeliveryEvent"("category", "emailType");
CREATE INDEX "EmailDeliveryEvent_businessId_eventCreatedAt_idx" ON "EmailDeliveryEvent"("businessId", "eventCreatedAt");
CREATE INDEX "EmailDeliveryEvent_invitationId_idx" ON "EmailDeliveryEvent"("invitationId");
CREATE INDEX "EmailDeliveryEvent_targetId_idx" ON "EmailDeliveryEvent"("targetId");
