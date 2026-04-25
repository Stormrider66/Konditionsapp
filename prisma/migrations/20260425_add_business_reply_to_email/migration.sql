-- Add a per-business `replyToEmail` so transactional mail (which still leaves
-- our shared `noreply@trainomics.app` From: address) routes any replies into
-- the business's own inbox instead of platform support.
--
-- Nullable, no default — businesses opt in via the Branding tab. Reads keep
-- falling back to `support@trainomics.app` while this stays NULL, so there is
-- no need to backfill.

ALTER TABLE "Business"
  ADD COLUMN "replyToEmail" TEXT;
