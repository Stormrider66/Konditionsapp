-- Add OpenAI GPT-5.5 to the AIModel table so coaches and athletes can select it.
-- Idempotent: upserts on the unique modelId. Sets isActive + availableForAthletes
-- so it appears in both the coach and athlete model-access pickers.
INSERT INTO "AIModel" (
  id, provider, "modelId", "displayName", description, capabilities,
  "maxTokens", "maxOutputTokens", "inputCostPer1k", "outputCostPer1k",
  "isActive", "isDefault", "availableForAthletes", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  'OPENAI',
  'gpt-5.5',
  'GPT-5.5',
  'OpenAIs flaggskeppsmodell med 128K output - bäst för långa program',
  ARRAY['text', 'code', 'vision', 'reasoning'],
  400000,
  128000,
  0.00175,
  0.014,
  true,
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT ("modelId") DO UPDATE SET
  "displayName" = EXCLUDED."displayName",
  description = EXCLUDED.description,
  capabilities = EXCLUDED.capabilities,
  "maxTokens" = EXCLUDED."maxTokens",
  "maxOutputTokens" = EXCLUDED."maxOutputTokens",
  "inputCostPer1k" = EXCLUDED."inputCostPer1k",
  "outputCostPer1k" = EXCLUDED."outputCostPer1k",
  "isActive" = true,
  "availableForAthletes" = true,
  "updatedAt" = NOW();
