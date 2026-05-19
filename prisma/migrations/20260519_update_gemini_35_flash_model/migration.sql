-- Promote Gemini 3.5 Flash GA as the default Google Flash model.
-- Preserve the existing AIModel.id when upgrading from Gemini 3 Flash Preview
-- so saved user/default model references keep working.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "AIModel" WHERE "modelId" = 'gemini-3-flash-preview')
     AND NOT EXISTS (SELECT 1 FROM "AIModel" WHERE "modelId" = 'gemini-3.5-flash') THEN
    UPDATE "AIModel"
    SET
      "modelId" = 'gemini-3.5-flash',
      "displayName" = 'Gemini 3.5 Flash',
      description = 'Stabil Flash-modell med stark agentisk kapacitet, bra för chatt och interaktiva uppgifter (rekommenderad)',
      capabilities = ARRAY['text', 'code', 'vision', 'audio', 'video'],
      "maxTokens" = 1000000,
      "maxOutputTokens" = 65536,
      "inputCostPer1k" = 0.0015,
      "outputCostPer1k" = 0.009,
      "isActive" = true,
      "isDefault" = true,
      "availableForAthletes" = true,
      "deprecatedAt" = NULL,
      "updatedAt" = NOW()
    WHERE "modelId" = 'gemini-3-flash-preview';
  END IF;
END $$;

INSERT INTO "AIModel" (
  id, provider, "modelId", "displayName", description, capabilities,
  "maxTokens", "maxOutputTokens", "inputCostPer1k", "outputCostPer1k",
  "isActive", "isDefault", "availableForAthletes", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  'GOOGLE',
  'gemini-3.5-flash',
  'Gemini 3.5 Flash',
  'Stabil Flash-modell med stark agentisk kapacitet, bra för chatt och interaktiva uppgifter (rekommenderad)',
  ARRAY['text', 'code', 'vision', 'audio', 'video'],
  1000000,
  65536,
  0.0015,
  0.009,
  true,
  true,
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
  "isDefault" = true,
  "availableForAthletes" = true,
  "deprecatedAt" = NULL,
  "updatedAt" = NOW();

WITH model_ids AS (
  SELECT new_model.id AS new_id, old_model.id AS old_id
  FROM "AIModel" new_model
  JOIN "AIModel" old_model ON old_model."modelId" = 'gemini-3-flash-preview'
  WHERE new_model."modelId" = 'gemini-3.5-flash'
)
UPDATE "UserApiKey"
SET
  "defaultModelId" = model_ids.new_id,
  "updatedAt" = NOW()
FROM model_ids
WHERE "UserApiKey"."defaultModelId" = model_ids.old_id;

WITH model_ids AS (
  SELECT new_model.id AS new_id, old_model.id AS old_id
  FROM "AIModel" new_model
  JOIN "AIModel" old_model ON old_model."modelId" = 'gemini-3-flash-preview'
  WHERE new_model."modelId" = 'gemini-3.5-flash'
)
UPDATE "SportProfile"
SET
  "preferredAIModelId" = model_ids.new_id,
  "updatedAt" = NOW()
FROM model_ids
WHERE "SportProfile"."preferredAIModelId" = model_ids.old_id;

UPDATE "SportProfile"
SET
  "preferredAIModelId" = 'gemini-3.5-flash',
  "updatedAt" = NOW()
WHERE "preferredAIModelId" IN ('gemini-3-flash', 'gemini-3-flash-preview');

UPDATE "UserApiKey"
SET
  "athleteDefaultModelId" = 'gemini-3.5-flash',
  "updatedAt" = NOW()
WHERE "athleteDefaultModelId" IN ('gemini-3-flash', 'gemini-3-flash-preview');

WITH model_ids AS (
  SELECT new_model.id AS new_id, old_model.id AS old_id
  FROM "AIModel" new_model
  JOIN "AIModel" old_model ON old_model."modelId" = 'gemini-3-flash-preview'
  WHERE new_model."modelId" = 'gemini-3.5-flash'
)
UPDATE "UserApiKey"
SET
  "athleteDefaultModelId" = model_ids.new_id,
  "updatedAt" = NOW()
FROM model_ids
WHERE "UserApiKey"."athleteDefaultModelId" = model_ids.old_id;

UPDATE "UserApiKey"
SET
  "allowedAthleteModelIds" = array_replace(
    array_replace("allowedAthleteModelIds", 'gemini-3-flash-preview', 'gemini-3.5-flash'),
    'gemini-3-flash',
    'gemini-3.5-flash'
  ),
  "updatedAt" = NOW()
WHERE "allowedAthleteModelIds" && ARRAY['gemini-3-flash-preview', 'gemini-3-flash'];

WITH model_ids AS (
  SELECT new_model.id AS new_id, old_model.id AS old_id
  FROM "AIModel" new_model
  JOIN "AIModel" old_model ON old_model."modelId" = 'gemini-3-flash-preview'
  WHERE new_model."modelId" = 'gemini-3.5-flash'
)
UPDATE "UserApiKey"
SET
  "allowedAthleteModelIds" = array_replace("allowedAthleteModelIds", model_ids.old_id, model_ids.new_id),
  "updatedAt" = NOW()
FROM model_ids
WHERE model_ids.old_id = ANY("UserApiKey"."allowedAthleteModelIds");

UPDATE "AIModel"
SET
  "isDefault" = false,
  "isActive" = false,
  "deprecatedAt" = COALESCE("deprecatedAt", NOW()),
  "updatedAt" = NOW()
WHERE "modelId" = 'gemini-3-flash-preview';

UPDATE "AIModel"
SET
  "isDefault" = false,
  "updatedAt" = NOW()
WHERE provider = 'GOOGLE'
  AND "modelId" <> 'gemini-3.5-flash'
  AND "isDefault" = true;
