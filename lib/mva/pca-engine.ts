import { PCA } from 'ml-pca'
import type { PreprocessedData, PCAModelResult } from './types'
import { computeDiagnostics } from './diagnostics'

/**
 * Run PCA on preprocessed data.
 * Uses ml-pca under the hood. Auto-selects components via Kaiser criterion
 * (eigenvalue > 1) or cumulative variance > 80%.
 */
export function runPCA(preprocessed: PreprocessedData): PCAModelResult {
  const { matrix, athleteIds, athleteNames, variableIds, variableNames } = preprocessed

  if (matrix.length < 3) {
    throw new Error('At least 3 observations are required for PCA')
  }
  if (matrix[0].length < 2) {
    throw new Error('At least 2 variables are required for PCA')
  }

  // Run PCA — data is already centered and scaled
  const pca = new PCA(matrix, { center: false, scale: false })

  const eigenvalues = pca.getEigenvalues()
  const allLoadings = pca.getLoadings().to2DArray()
  const allScores = pca.predict(matrix).to2DArray()
  const explainedVarianceRaw = pca.getExplainedVariance()

  // Auto-select number of components:
  // Kaiser criterion: eigenvalue > 1 (for standardized data)
  // Also ensure cumulative variance >= 80%
  let nComponents = 0
  let cumVar = 0
  for (let i = 0; i < eigenvalues.length; i++) {
    if (eigenvalues[i] > 1 || cumVar < 0.8) {
      nComponents = i + 1
      cumVar += explainedVarianceRaw[i]
    } else {
      break
    }
  }
  // At minimum 2 components for plotting, at most the number of variables
  nComponents = Math.max(2, Math.min(nComponents, eigenvalues.length))

  // Truncate to selected components
  const scores = allScores.map((row) => row.slice(0, nComponents))
  const loadings = allLoadings.map((row) => row.slice(0, nComponents))
  const explainedVariance = explainedVarianceRaw.slice(0, nComponents)
  const selectedEigenvalues = eigenvalues.slice(0, nComponents)

  // Compute cumulative variance
  const cumulativeVariance: number[] = []
  let cum = 0
  for (const ev of explainedVariance) {
    cum += ev
    cumulativeVariance.push(cum)
  }

  // Compute diagnostics (T², DModX)
  const { diagnostics, t2Limit95, t2Limit99, dmodxLimit } = computeDiagnostics(
    scores,
    selectedEigenvalues,
    matrix,
    allScores,
    allLoadings,
    athleteIds,
    athleteNames,
    variableIds,
    variableNames,
    nComponents
  )

  return {
    scores,
    loadings,
    eigenvalues: selectedEigenvalues,
    explainedVariance,
    cumulativeVariance,
    nComponents,
    athleteIds,
    athleteNames,
    variableIds,
    variableNames,
    diagnostics,
    t2Limit95,
    t2Limit99,
    dmodxLimit,
    preprocessedData: preprocessed,
  }
}
