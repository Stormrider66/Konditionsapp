-- Click-to-verify loop for `replyToEmail`. Until the customer confirms the
-- address by clicking the verification link we mailed them, replies keep
-- going to `support@trainomics.app` — protects against black-holing a typo.
--
-- Existing rows: `replyToEmailVerified` defaults to false, so any
-- `replyToEmail` already set in the DB gets re-confirmed on the next save
-- (or stays inert in the meantime — replies route to platform support).

ALTER TABLE "Business"
  ADD COLUMN "replyToEmailVerified"      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "replyToEmailVerifyToken"   TEXT,
  ADD COLUMN "replyToEmailVerifyExpires" TIMESTAMP(3);

CREATE UNIQUE INDEX "Business_replyToEmailVerifyToken_key"
  ON "Business"("replyToEmailVerifyToken");
