-- Store structured race-day product plans separately from free-text notes.

ALTER TABLE "RaceFuelingPlan" ADD COLUMN "productPlan" JSONB;
