-- Per-business sending domain via Resend's domain API. Once a business adds
-- their domain (e.g. `mygym.com`), Resend gives back DKIM CNAMEs + SPF TXT;
-- after the customer publishes those records and we verify, sends switch
-- from `noreply@trainomics.app` to `noreply@mygym.com` for that business.
--
-- All fields are nullable — businesses without a custom email domain keep
-- using the shared trainomics.app sender. No backfill needed.

ALTER TABLE "Business"
  ADD COLUMN "customEmailDomain" TEXT,
  ADD COLUMN "resendDomainId" TEXT,
  ADD COLUMN "customEmailVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "customEmailVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "customEmailDnsRecords" JSONB;

-- Same uniqueness invariant as customDomain — one tenant per domain.
CREATE UNIQUE INDEX "Business_customEmailDomain_key"
  ON "Business"("customEmailDomain");
