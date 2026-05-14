-- Allow Elite AI budgets to be configured per business offer or per athlete.
ALTER TABLE "Business"
ADD COLUMN "eliteAiAllowanceSek" DOUBLE PRECISION;

ALTER TABLE "AthleteSubscription"
ADD COLUMN "customAiAllowanceSek" DOUBLE PRECISION;
