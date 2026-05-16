-- Add RLS coverage for AI Canvas tables.

ALTER TABLE "AICanvas" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "AICanvas";
DROP POLICY IF EXISTS "authenticated_access" ON "AICanvas";
CREATE POLICY "deny_anon_access" ON "AICanvas"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "AICanvas"
  FOR ALL TO authenticated
  USING (
    "ownerUserId" = auth.uid()::text
    OR EXISTS (
      SELECT 1
        FROM "BusinessMember" bm
       WHERE bm."businessId" = "AICanvas"."businessId"
         AND bm."userId" = auth.uid()::text
         AND bm."isActive" = true
    )
  )
  WITH CHECK (
    "ownerUserId" = auth.uid()::text
    OR EXISTS (
      SELECT 1
        FROM "BusinessMember" bm
       WHERE bm."businessId" = "AICanvas"."businessId"
         AND bm."userId" = auth.uid()::text
         AND bm."isActive" = true
    )
  );

ALTER TABLE "AICanvasBlock" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "AICanvasBlock";
DROP POLICY IF EXISTS "authenticated_access" ON "AICanvasBlock";
CREATE POLICY "deny_anon_access" ON "AICanvasBlock"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "AICanvasBlock"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM "AICanvas" c
       WHERE c.id = "AICanvasBlock"."canvasId"
         AND (
           c."ownerUserId" = auth.uid()::text
           OR EXISTS (
             SELECT 1
               FROM "BusinessMember" bm
              WHERE bm."businessId" = c."businessId"
                AND bm."userId" = auth.uid()::text
                AND bm."isActive" = true
           )
         )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
        FROM "AICanvas" c
       WHERE c.id = "AICanvasBlock"."canvasId"
         AND (
           c."ownerUserId" = auth.uid()::text
           OR EXISTS (
             SELECT 1
               FROM "BusinessMember" bm
              WHERE bm."businessId" = c."businessId"
                AND bm."userId" = auth.uid()::text
                AND bm."isActive" = true
           )
         )
    )
  );
