import type { AthleteDiagnostics, VariableContribution } from './types'

/**
 * F-distribution critical value approximation for Hotelling's T² limit.
 * Uses the Satterthwaite approximation for moderate sample sizes.
 */
function hotellingT2Limit(nObs: number, nComp: number, alpha: number): number {
  // T² ~ (A * (n-1)) / (n - A) * F(A, n-A, alpha)
  // Approximation: for alpha = 0.05 or 0.01 with typical n and A
  const A = nComp
  const n = nObs

  // Simple F critical value approximation (adequate for n > 10)
  // Using Wilson-Hilferty approximation
  const df1 = A
  const df2 = n - A

  if (df2 <= 0) return Infinity

  // For alpha = 0.05: z = 1.645, alpha = 0.01: z = 2.326
  const z = alpha === 0.01 ? 2.326 : 1.645

  // Wilson-Hilferty approximation for F critical value
  const h1 = 2 / (9 * df1)
  const h2 = 2 / (9 * df2)
  const fCrit = Math.pow(
    ((1 - h2 + z * Math.sqrt(h2)) / (1 - h1 - z * Math.sqrt(h1))),
    3
  )

  // Convert F to T² limit
  return (A * (n - 1) / (n - A)) * Math.max(fCrit, 0)
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
 * Compute DModX (distance to model in X-space) for a single observation.
 * This is the RMS of the residual — how well the model represents this observation.
 */
function computeDModX(
  originalRow: number[],
  allScoresRow: number[],
  loadingsMatrix: number[][],
  nComponents: number
): number {
  const nVars = originalRow.length

  // Reconstruct observation from model: X_hat = scores * loadings^T
  const reconstructed: number[] = new Array(nVars).fill(0)
  for (let j = 0; j < nVars; j++) {
    for (let a = 0; a < nComponents; a++) {
      reconstructed[j] += allScoresRow[a] * loadingsMatrix[j][a]
    }
  }

  // Residual = original - reconstructed
  let sumSq = 0
  for (let j = 0; j < nVars; j++) {
    const diff = originalRow[j] - reconstructed[j]
    sumSq += diff * diff
  }

  // Degrees of freedom correction
  const dof = nVars - nComponents
  return dof > 0 ? Math.sqrt(sumSq / dof) : Math.sqrt(sumSq)
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
} {
  const nObs = scores.length

  // Compute T² limits
  const t2Limit95 = hotellingT2Limit(nObs, nComponents, 0.05)
  const t2Limit99 = hotellingT2Limit(nObs, nComponents, 0.01)

  // Compute DModX for all observations and derive limit
  const dmodxValues: number[] = []
  const diagnostics: AthleteDiagnostics[] = []

  for (let i = 0; i < nObs; i++) {
    const t2 = computeHotellingT2(scores[i], eigenvalues)
    const dmodx = computeDModX(originalMatrix[i], allScores[i], loadings, nComponents)
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

  // DModX limit: based on mean + 2*std of DModX values (approximation)
  const dmodxMean = dmodxValues.reduce((a, b) => a + b, 0) / nObs
  const dmodxStd = Math.sqrt(
    dmodxValues.reduce((sum, v) => sum + (v - dmodxMean) ** 2, 0) / (nObs - 1)
  )
  const dmodxLimit = dmodxMean + 2 * dmodxStd

  // Set DModX outlier flags
  for (const d of diagnostics) {
    d.isOutlierDModX = d.dmodx > dmodxLimit
  }

  return { diagnostics, t2Limit95, t2Limit99, dmodxLimit }
}
