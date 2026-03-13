/**
 * Algorithm Selector
 *
 * Picks the best threshold detection configuration per athlete profile type
 * based on parameter sweep results. Provides human-readable recommendations.
 */

import type { AthleteProfile } from '@/lib/calculations/elite-threshold-detection'
import type { ThresholdTuningConfig, SweepRunSummary, SweepMetrics } from './types'
import { DEFAULT_CONFIG } from './tunable-config'

/**
 * Select the best config for a given profile type from sweep results.
 * Falls back to overall best if profile-specific data is insufficient.
 */
export function selectAlgorithmForProfile(
  profileType: AthleteProfile['type'],
  sweep: SweepRunSummary
): ThresholdTuningConfig {
  const profileResult = sweep.profileResults[profileType]
  if (profileResult && profileResult.bestScore > 0) {
    return profileResult.bestConfig
  }
  return sweep.bestConfig
}

/**
 * Build a human-readable recommendation comparing optimized vs defaults.
 */
export function buildRecommendation(sweep: SweepRunSummary): string {
  const lines: string[] = [
    `## Threshold Tuning Sweep Results`,
    ``,
    `**Configurations tested**: ${sweep.configsTested}`,
    `**Duration**: ${sweep.durationMs}ms`,
    `**Best overall score**: ${sweep.bestScore.toFixed(1)}/100`,
    ``,
  ]

  // Compare best config vs default
  const best = sweep.bestConfig
  const def = DEFAULT_CONFIG
  const changes: string[] = []

  if (best.bishopModDmax.riseThreshold !== def.bishopModDmax.riseThreshold) {
    changes.push(`- Bishop rise threshold: ${def.bishopModDmax.riseThreshold} → ${best.bishopModDmax.riseThreshold}`)
  }
  if (best.dmax.r2MinFallback !== def.dmax.r2MinFallback) {
    changes.push(`- R² minimum: ${def.dmax.r2MinFallback} → ${best.dmax.r2MinFallback}`)
  }
  if (best.baselinePlus.eliteDelta !== def.baselinePlus.eliteDelta) {
    changes.push(`- Elite delta: ${def.baselinePlus.eliteDelta} → ${best.baselinePlus.eliteDelta}`)
  }
  if (best.baselinePlus.standardDelta !== def.baselinePlus.standardDelta) {
    changes.push(`- Standard delta: ${def.baselinePlus.standardDelta} → ${best.baselinePlus.standardDelta}`)
  }
  if (best.baselinePlus.recreationalDelta !== def.baselinePlus.recreationalDelta) {
    changes.push(`- Recreational delta: ${def.baselinePlus.recreationalDelta} → ${best.baselinePlus.recreationalDelta}`)
  }
  if (best.ensemble.logLogWeight !== def.ensemble.logLogWeight) {
    changes.push(`- Ensemble weights: ${def.ensemble.logLogWeight}/${def.ensemble.baselinePlusWeight} → ${best.ensemble.logLogWeight}/${best.ensemble.baselinePlusWeight}`)
  }

  if (changes.length > 0) {
    lines.push(`### Parameter Changes (vs defaults)`)
    lines.push(...changes)
  } else {
    lines.push(`### No parameter changes needed — defaults are optimal`)
  }

  lines.push(``)
  lines.push(`### Per-Profile Results`)
  for (const [profile, result] of Object.entries(sweep.profileResults)) {
    lines.push(`- **${profile}**: score ${result.bestScore.toFixed(1)}/100 | LT2 within 0.5: ${result.metrics.lt2Within05}% | LT1 within 0.5: ${result.metrics.lt1Within05}%`)
  }

  return lines.join('\n')
}

/**
 * Serialize config + metrics for storage in AIModelVersion.parameters.
 */
export function serializeConfigForStorage(
  config: ThresholdTuningConfig,
  metrics: SweepMetrics,
  profileType: string
): Record<string, unknown> {
  return {
    profileType,
    config,
    metrics,
    optimizedAt: new Date().toISOString(),
  }
}
