import type { AthleteDataBundle, PreprocessedData, PreprocessingConfig } from './types'
import { MVA_VARIABLE_REGISTRY } from './variable-registry'

/**
 * Preprocess athlete data into a centered + scaled matrix suitable for PCA.
 *
 * Steps:
 * 1. Extract raw values from each athlete using the variable registry extractors
 * 2. Filter out variables with coverage below threshold
 * 3. Filter out athletes with too few variables
 * 4. Impute remaining missing values with column mean
 * 5. Center (subtract mean) and scale (unit variance)
 */
export function preprocessData(
  bundles: AthleteDataBundle[],
  config: PreprocessingConfig,
  selectedVariableIds?: string[]
): PreprocessedData {
  const variables = selectedVariableIds
    ? MVA_VARIABLE_REGISTRY.filter((v) => selectedVariableIds.includes(v.id))
    : MVA_VARIABLE_REGISTRY
  const excludedVariables: PreprocessedData['excludedVariables'] = []
  const excludedAthletes: PreprocessedData['excludedAthletes'] = []

  // Step 1: Extract raw matrix [athletes x variables]
  const rawMatrix: (number | null)[][] = bundles.map((bundle) =>
    variables.map((v) => {
      const val = v.extractor(bundle)
      return val != null && isFinite(val) ? val : null
    })
  )

  // Step 2: Filter variables by coverage
  const nAthletes = bundles.length
  const variableMask: boolean[] = variables.map((v, colIdx) => {
    let count = 0
    for (let row = 0; row < nAthletes; row++) {
      if (rawMatrix[row][colIdx] != null) count++
    }
    const coverage = nAthletes > 0 ? count / nAthletes : 0
    if (coverage < config.minVariableCoverage) {
      excludedVariables.push({
        variableId: v.id,
        name: v.nameSv,
        reason: `Täckning ${Math.round(coverage * 100)}% < ${Math.round(config.minVariableCoverage * 100)}%`,
      })
      return false
    }
    return true
  })

  const includedVarIndices = variableMask
    .map((included, i) => (included ? i : -1))
    .filter((i) => i >= 0)

  // Step 3: Filter athletes by coverage of included variables
  const nIncludedVars = includedVarIndices.length
  const athleteMask: boolean[] = bundles.map((bundle, rowIdx) => {
    let count = 0
    for (const colIdx of includedVarIndices) {
      if (rawMatrix[rowIdx][colIdx] != null) count++
    }
    const coverage = nIncludedVars > 0 ? count / nIncludedVars : 0
    if (coverage < config.minAthleteCoverage) {
      excludedAthletes.push({
        clientId: bundle.clientId,
        name: bundle.clientName,
        reason: `Datatäckning ${Math.round(coverage * 100)}% < ${Math.round(config.minAthleteCoverage * 100)}%`,
      })
      return false
    }
    return true
  })

  const includedAthleteIndices = athleteMask
    .map((included, i) => (included ? i : -1))
    .filter((i) => i >= 0)

  // Step 4: Build filtered matrix and impute missing values with column mean
  let imputedCells = 0
  const filteredMatrix: number[][] = []

  // First pass: compute column means
  const colMeans: number[] = includedVarIndices.map((colIdx) => {
    let sum = 0
    let count = 0
    for (const rowIdx of includedAthleteIndices) {
      const v = rawMatrix[rowIdx][colIdx]
      if (v != null) {
        sum += v
        count++
      }
    }
    return count > 0 ? sum / count : 0
  })

  // Second pass: build matrix with imputation
  for (const rowIdx of includedAthleteIndices) {
    const row: number[] = includedVarIndices.map((colIdx, localCol) => {
      const v = rawMatrix[rowIdx][colIdx]
      if (v != null) return v
      imputedCells++
      return colMeans[localCol]
    })
    filteredMatrix.push(row)
  }

  // Step 5: Center and scale
  const nRows = filteredMatrix.length
  const nCols = includedVarIndices.length

  // Compute means (should be very close to colMeans after imputation)
  const means: number[] = new Array(nCols).fill(0)
  for (let j = 0; j < nCols; j++) {
    let sum = 0
    for (let i = 0; i < nRows; i++) {
      sum += filteredMatrix[i][j]
    }
    means[j] = sum / nRows
  }

  // Compute standard deviations
  const stds: number[] = new Array(nCols).fill(0)
  for (let j = 0; j < nCols; j++) {
    let sumSq = 0
    for (let i = 0; i < nRows; i++) {
      const diff = filteredMatrix[i][j] - means[j]
      sumSq += diff * diff
    }
    stds[j] = Math.sqrt(sumSq / (nRows - 1))
    if (stds[j] === 0 || !isFinite(stds[j])) stds[j] = 1 // avoid division by zero
  }

  // Apply centering and scaling
  const scaledMatrix: number[][] = filteredMatrix.map((row) =>
    row.map((val, j) => {
      let result = val
      if (config.centering) result -= means[j]
      if (config.scaling === 'uv') result /= stds[j]
      else if (config.scaling === 'pareto') result /= Math.sqrt(stds[j])
      return result
    })
  )

  return {
    matrix: scaledMatrix,
    athleteIds: includedAthleteIndices.map((i) => bundles[i].clientId),
    athleteNames: includedAthleteIndices.map((i) => bundles[i].clientName),
    variableIds: includedVarIndices.map((i) => variables[i].id),
    variableNames: includedVarIndices.map((i) => variables[i].nameSv),
    means,
    stds,
    excludedAthletes,
    excludedVariables,
    imputedCells,
  }
}
