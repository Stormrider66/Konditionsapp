-- Add UNIQUE(clientId, exerciseId, date) so accidental re-paste of the
-- same test sheet (or a manual entry on top of an import) can't create
-- duplicate PR rows. Run AFTER the dedupe migration.
--
-- Naming follows Prisma's @@unique convention so the model field
-- (`@@unique([clientId, exerciseId, date])`) maps to the same DB
-- constraint name without renaming on a future migrate diff.

ALTER TABLE "OneRepMaxHistory"
  ADD CONSTRAINT "OneRepMaxHistory_clientId_exerciseId_date_key"
  UNIQUE ("clientId", "exerciseId", "date");
