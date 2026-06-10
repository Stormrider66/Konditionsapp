import type { AthleteDiagnostics, VariableContribution } from './types'
import { fCriticalValue } from './fdist'

// Re-exported so existing imports (and tests) can resolve it from diagnostics.
export { fCriticalValue }

/**
 * Hotelling's T² control limit.
 * T²_lim = A(n-1)/(n-A) · F(alpha; A, n-A)
 */
function hotellingT2Limit(nObs: number, nComp: number, alpha: number): number {
  const A = nComp
  const n = nObs
  const df2 = n - A
  if (df2 <= 0) return Infinity

  const fCrit = fCriticalValue(A, df2, alpha)
  if (!isFinite(fCrit)) return Infinity

  return (A * (n - 1) / (n - A)) * fCrit
}

/**
 * Compute Hotelling's T² for a single observation
 * T² = sum((score_i / sqrt(eigenvalue_i))²) for selected components
 */
function computeHotellingT2(scores: number[], eigenvalues: number[]): number {
  let t2 = 0
  for (let i = 0; i < scores.length; i++) {
    if (eigenvalues[i] > 0) {
      t2 += (scores[i] * scores[i]) / eigenvalues[i]
    }
  }
  return t2
}

/**
 * Residual sum of squares for a single observation in X-space.
 * Used both for the per-observation DModX and for the pooled model
 * standard deviation s0.
 */
function residualSumOfSquares(
  originalRow: number[],
  allScoresRow: number[],
  loadingsMatrix: number[][],
  nComponents: number
): number {
  const nVars = originalRow.length
  let sumSq = 0
  for (let j = 0; j < nVars; j++) {
    let reconstructed = 0
    for (let a = 0; a < nComponents; a++) {
      reconstructed += allScoresRow[a] * loadingsMatrix[j][a]
    }
    const diff = originalRow[j] - reconstructed
    sumSq += diff * diff
  }
  return sumSq
}

/**
 * DModX (distance to model in X-space) for a single observation — the RMS of
 * the model residual over the residual degrees of freedom (K - A).
 */
function computeDModX(residualSS: number, nVars: number, nComponents: number): number {
  const dof = nVars - nComponents
  return dof > 0 ? Math.sqrt(residualSS / dof) : Math.sqrt(residualSS)
}

/**
 * Compute contribution of each variable to an observation's T² deviation.
 * Uses the contribution method from Eriksson et al. (SIMCA approach).
 */
function computeContributions(
  scores: number[],
  eigenvalues: number[],
  loadings: number[][], // [nVars x nComp]
  variableIds: string[],
  variableNames: string[],
  topN: number = 5
): VariableContribution[] {
  const nVars = variableIds.length
  const contributions: VariableContribution[] = []

  for (let j = 0; j < nVars; j++) {
    let contrib = 0
    for (let a = 0; a < scores.length; a++) {
      if (eigenvalues[a] > 0) {
        // Contribution = score * loading / sqrt(eigenvalue)
        contrib += (scores[a] * loadings[j][a]) / Math.sqrt(eigenvalues[a])
      }
    }
    contributions.push({
      variableId: variableIds[j],
      variableName: variableNames[j],
      contribution: Math.abs(contrib),
      direction: contrib >= 0 ? 'positive' : 'negative',
    })
  }

  // Sort by absolute contribution descending and return top N
  contributions.sort((a, b) => b.contribution - a.contribution)
  return contributions.slice(0, topN)
}

/**
 * DModX critical distance using the standard SIMCA F-test (Eriksson et al.).
 *
 *   s0   = sqrt( SSE_total / ((N - A - 1)(K - A)) )   — pooled model std
 *   DCrit = s0 · sqrt( F(alpha; K - A, (N - A - 1)(K - A)) )
 *
 * This replaces the earlier mean + 2·SD heuristic, which was a data-driven
 * spread rather than a statistical control limit and flagged the top of any
 * distribution regardless of whether a true outlier existed.
 *
 * Falls back to mean + 2·SD only when the degrees of freedom are too small for
 * the F-test to be defined (very small squad / very few residual dimensions).
 */
function dmodxControlLimits(
  residualSSValues: number[],
  dmodxValues: number[],
  nVars: number,
  nComponents: number
): { dmodxLimit95: number; dmodxLimit99: number; usedFallback: boolean } {
  const nObs = residualSSValues.length
  const df1 = nVars - nComponents // K - A
  const df2 = (nObs - nComponents - 1) * df1 // (N - A - 1)(K - A)

  if (df1 > 0 && df2 > 0) {
    const totalSS = residualSSValues.reduce((sum, v) => sum + v, 0)
    const s0 = Math.sqrt(totalSS / df2)
    const f95 = fCriticalValue(df1, df2, 0.05)
    const f99 = fCriticalValue(df1, df2, 0.01)
    if (isFinite(f95) && isFinite(f99) && s0 > 0) {
      return {
        dmodxLimit95: s0 * Math.sqrt(f95),
        dmodxLimit99: s0 * Math.sqrt(f99),
        usedFallback: false,
      }
    }
  }

  // Fallback: distribution-free spread when the F-test is undefined.
  const mean = dmodxValues.reduce((a, b) => a + b, 0) / Math.max(nObs, 1)
  const variance = nObs > 1
    ? dmodxValues.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (nObs - 1)
    : 0
  const std = Math.sqrt(variance)
  return { dmodxLimit95: mean + 2 * std, dmodxLimit99: mean + 3 * std, usedFallback: true }
}

/**
 * Compute all diagnostics for PCA results.
 */
export function computeDiagnostics(
  scores: number[][],      // [nObs x nComp] — selected components only
  eigenvalues: number[],   // [nComp]
  originalMatrix: number[][], // [nObs x nVars] — preprocessed data
  allScores: number[][],   // [nObs x all components]
  loadings: number[][],    // [nVars x all components]
  athleteIds: string[],
  athleteNames: string[],
  variableIds: string[],
  variableNames: string[],
  nComponents: number
): {
  diagnostics: AthleteDiagnostics[]
  t2Limit95: number
  t2Limit99: number
  dmodxLimit: number
  dmodxLimit99: number
} {
  const nObs = scores.length
  const nVars = variableIds.length

  // Compute T² limits
  const t2Limit95 = hotellingT2Limit(nObs, nComponents, 0.05)
  const t2Limit99 = hotellingT2Limit(nObs, nComponents, 0.01)

  // First pass: per-observation T², residual SS and DModX.
  const dmodxValues: number[] = []
  const residualSSValues: number[] = []
  const diagnostics: AthleteDiagnostics[] = []

  for (let i = 0; i < nObs; i++) {
    const t2 = computeHotellingT2(scores[i], eigenvalues)
    const residualSS = residualSumOfSquares(originalMatrix[i], allScores[i], loadings, nComponents)
    const dmodx = computeDModX(residualSS, nVars, nComponents)
    residualSSValues.push(residualSS)
    dmodxValues.push(dmodx)

    const topContributors = computeContributions(
      scores[i],
      eigenvalues,
      loadings,
      variableIds,
      variableNames
    )

    diagnostics.push({
      clientId: athleteIds[i],
      clientName: athleteNames[i],
      scores: scores[i],
      hotellingT2: t2,
      dmodx,
      isOutlierT2: t2 > t2Limit95,
      isOutlierDModX: false, // set after computing limit
      topContributors,
    })
  }

  // F-based DModX control limits.
  const { dmodxLimit95, dmodxLimit99 } = dmodxControlLimits(
    residualSSValues,
    dmodxValues,
    nVars,
    nComponents
  )

  for (const d of diagnostics) {
    d.isOutlierDModX = d.dmodx > dmodxLimit95
  }

  return { diagnostics, t2Limit95, t2Limit99, dmodxLimit: dmodxLimit95, dmodxLimit99 }
}
