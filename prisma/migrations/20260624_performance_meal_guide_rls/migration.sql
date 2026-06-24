-- Add RLS coverage for the Performance Meal Guide plan tables.

ALTER TABLE "NutritionPerformancePlan" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "NutritionPerformancePlan";
DROP POLICY IF EXISTS "authenticated_access" ON "NutritionPerformancePlan";
CREATE POLICY "deny_anon_access" ON "NutritionPerformancePlan"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "NutritionPerformancePlan"
  FOR ALL TO authenticated
  USING (public.client_visible_to_auth("clientId"));

ALTER TABLE "NutritionPlanDay" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "NutritionPlanDay";
DROP POLICY IF EXISTS "authenticated_access" ON "NutritionPlanDay";
CREATE POLICY "deny_anon_access" ON "NutritionPlanDay"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "NutritionPlanDay"
  FOR ALL TO authenticated
  USING (public.client_visible_to_auth("clientId"));

ALTER TABLE "NutritionPlannedMeal" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "NutritionPlannedMeal";
DROP POLICY IF EXISTS "authenticated_access" ON "NutritionPlannedMeal";
CREATE POLICY "deny_anon_access" ON "NutritionPlannedMeal"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "NutritionPlannedMeal"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM "NutritionPlanDay" npd
       WHERE npd.id = "NutritionPlannedMeal"."dayId"
         AND public.client_visible_to_auth(npd."clientId")
    )
  );

ALTER TABLE "NutritionPlannedMealOption" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "NutritionPlannedMealOption";
DROP POLICY IF EXISTS "authenticated_access" ON "NutritionPlannedMealOption";
CREATE POLICY "deny_anon_access" ON "NutritionPlannedMealOption"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "NutritionPlannedMealOption"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM "NutritionPlannedMeal" npm
        JOIN "NutritionPlanDay" npd ON npd.id = npm."dayId"
       WHERE npm.id = "NutritionPlannedMealOption"."plannedMealId"
         AND public.client_visible_to_auth(npd."clientId")
    )
  );
