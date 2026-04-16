// lib/ai/sport-context-builder.ts
//
// Barrel: the implementation lives under ./sport-context/ after the
// Phase 7 decomposition. Keeping this file as the historical import
// path so the lib/ai/chat/context-builder.ts caller doesn't need
// to change.

export { buildSportSpecificContext } from './sport-context/main'
export {
  buildTierAwareContext,
  getTierContextConfig,
  tierHasAIAccess,
  type TierContextConfig,
} from './sport-context/tier-aware'
export { getUpgradePrompt } from './sport-context/upgrade'
export type { AthleteData, SportProfile } from './sport-context/types'
