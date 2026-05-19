export const GEMINI_FLASH_35_MODEL_ID = 'gemini-3.5-flash'

const GEMINI_FLASH_LEGACY_MODEL_IDS = new Set([
  'gemini-3-flash',
  'gemini-3-flash-preview',
])

export function normalizeAIModelId(modelId: string): string {
  return GEMINI_FLASH_LEGACY_MODEL_IDS.has(modelId)
    ? GEMINI_FLASH_35_MODEL_ID
    : modelId
}

export function normalizeAIModelDisplayName(modelId: string, displayName: string): string {
  if (GEMINI_FLASH_LEGACY_MODEL_IDS.has(modelId) || displayName === 'Gemini 3 Flash') {
    return 'Gemini 3.5 Flash'
  }
  return displayName
}

export function normalizeAIModelPricing(modelId: string, inputCostPer1k: number | null, outputCostPer1k: number | null) {
  if (normalizeAIModelId(modelId) === GEMINI_FLASH_35_MODEL_ID) {
    return {
      inputCostPer1k: 0.0015,
      outputCostPer1k: 0.009,
    }
  }

  return {
    inputCostPer1k,
    outputCostPer1k,
  }
}
