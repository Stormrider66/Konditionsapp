-- requireAdminRole no longer treats role=ADMIN as an implicit SUPER_ADMIN:
-- admin-panel access now requires an explicit adminRole. Backfill existing
-- platform admins so they keep their current access.
UPDATE "User"
SET "adminRole" = 'SUPER_ADMIN'
WHERE "role" = 'ADMIN'
  AND "adminRole" IS NULL;
