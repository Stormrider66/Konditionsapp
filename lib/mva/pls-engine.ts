import { PLS } from 'ml-pls'
import type { PreprocessedData, PLSModelResult, VIPScore } from './types'
import { MVA_VARIABLE_REGISTRY } from './variable-registry'
import { assessPLSReliability } from './reliability'

// ml-pls returns Matrix objects from ml-matrix; we convert them to plain arrays
type MatrixLike = { to2DArray?: () => number[][] } | number[][]

/** Convert ml-matrix Matrix to number[][] */
function toArray(m: MatrixLike | undefined): number[][] {
  if (!m) return []
  if (typeof m === 'object' && 'to2DArray' in m && typeof m.to2DArray === 'function') {
    return m.to2DArray()
  }
  if (Array.isArray(m)) return m
  return []
}

/**
 * Run PLS regression on preprocessed data.
 * Extracts Y from the preprocessed matrix, fits PLS, computes VIP scores and Q² via LOO.
 */
export function runPLS(preprocessed: PreprocessedData, yVariableId: string): PLSModelResult {
  const { matrix, athleteIds, athleteNames, variableIds, variableNames } = preprocessed

  if (matrix.length < 8) {
    throw new Error('At least 8 observations are required for PLS')
  }

  // Find Y variable index
  const yIndex = variableIds.indexOf(yVariableId)
  if (yIndex === -1) {
    throw new Error(`Y-variabeln "${yVariableId}" hittades inte i preprocessade data`)
  }

  // Split X and Y
  const xVariableIds = variableIds.filter((_, i) => i !== yIndex)
  const xVariableNames = variableNames.filter((_, i) => i !== yIndex)

  if (xVariableIds.length < 3) {
    throw new Error('At least 3 X variables are required for PLS')
  }

  const X = matrix.map((row) => row.filter((_, i) => i !== yIndex))
  const Y = matrix.map((row) => [row[yIndex]])

  // Auto-select number of components
  const maxComp = Math.min(matrix.length - 1, xVariableIds.length, 10)
  const nComponents = selectComponents(X, Y, maxComp)

  // Fit PLS
  const pls = new PLS({ latentVectors: nComponents, tolerance: 1e-5, scale: false }, {})
  pls.train(X, Y)

  // Extract matrices — ml-pls returns Matrix objects
  const T = toArray(pls.T) // X scores [n x nComp]
  const P = toArray(pls.P) // X loadings [xVars x nComp]
  const W = toArray(pls.W) // X weights [xVars x nComp]
  const B = toArray(pls.B) // Inner relation coefficients [nComp x nComp]
  const PBQ = toArray(pls.PBQ) // Variable-level regression coefficients [xVars x yVars]

  // Compute predictions
  const predMatrix = toArray(pls.predict(X))
  const yPredicted = predMatrix.map((row: number[]) => row[0])
  const yObserved = Y.map((row) => row[0])

  // Compute R²Y
  const yMean = yObserved.reduce((s, v) => s + v, 0) / yObserved.length
  const ssTot = yObserved.reduce((s, v) => s + (v - yMean) ** 2, 0)
  const ssRes = yObserved.reduce((s, v, i) => s + (v - yPredicted[i]) ** 2, 0)
  const r2Y = ssTot > 0 ? 1 - ssRes / ssTot : 0

  // Compute R²X (explained X variance from scores and loadings)
  const r2X = computeR2X(X, T, P)

  // LOO Cross-Validation for Q²
  const q2 = computeQ2LOO(X, Y, nComponents)

  // VIP scores — use PBQ for variable-level regression coefficients
  const vipScores = computeVIP(W, T, xVariableIds, xVariableNames, PBQ)

  const result: PLSModelResult = {
    xScores: T,
    xLoadings: P,
    xWeights: W,
    coefficients: PBQ,
    r2X,
    r2Y,
    q2,
    nComponents,
    vipScores,
    yObserved,
    yPredicted,
    xVariableIds,
    xVariableNames,
    yVariableId,
    yVariableName: variableNames[yIndex],
    athleteIds,
    athleteNames,
    warnings: [],
    preprocessedData: preprocessed,
  }

  result.warnings = assessPLSReliability(result)
  return result
}

/**
 * Auto-select components via LOO Q² improvement.
 * Stop when improvement < 0.05 or all components exhausted.
 */
function selectComponents(X: number[][], Y: number[][], maxComp: number): number {
  let bestQ2 = -Infinity
  let bestComp = 1

  for (let nComp = 1; nComp <= maxComp; nComp++) {
    const q2 = computeQ2LOO(X, Y, nComp)
    if (q2 - bestQ2 < 0.05 && nComp > 1) {
      break
    }
    if (q2 > bestQ2) {
      bestQ2 = q2
      bestComp = nComp
    }
  }

  return Math.max(1, bestComp)
}

/**
 * LOO cross-validation to compute Q².
 */
function computeQ2LOO(X: number[][], Y: number[][], nComp: number): number {
  const n = X.length
  const yObserved = Y.map((row) => row[0])
  const yMean = yObserved.reduce((s, v) => s + v, 0) / n
  const ssTot = yObserved.reduce((s, v) => s + (v - yMean) ** 2, 0)

  if (ssTot === 0) return 0

  let press = 0
  for (let i = 0; i < n; i++) {
    const xTrain = X.filter((_, j) => j !== i)
    const yTrain = Y.filter((_, j) => j !== i)

    try {
      const plsLoo = new PLS({ latentVectors: nComp, tolerance: 1e-5, scale: false }, {})
      plsLoo.train(xTrain, yTrain)
      const pred = toArray(plsLoo.predict([X[i]]))
      const yPred = pred[0]?.[0] ?? yMean
      press += (yObserved[i] - yPred) ** 2
    } catch {
      // If LOO fit fails for this fold, add large residual
      press += (yObserved[i] - yMean) ** 2
    }
  }

  return 1 - press / ssTot
}

/**
 * Compute VIP (Variable Importance in Projection) scores.
 * VIP_j = sqrt(p * sum_a(SS_a * w_ja²) / sum_a(SS_a))
 */
function computeVIP(
  W: number[][],
  T: number[][],
  xVariableIds: string[],
  xVariableNames: string[],
  B: number[][]
): VIPScore[] {
  const p = xVariableIds.length // number of X variables
  const nComp = W[0]?.length ?? 0

  if (nComp === 0) return []

  // SS_a = ||T[:,a]||² (sum of squares of scores for component a)
  const SS: number[] = []
  for (let a = 0; a < nComp; a++) {
    let ss = 0
    for (let i = 0; i < T.length; i++) {
      ss += T[i][a] ** 2
    }
    SS.push(ss)
  }

  const ssTotal = SS.reduce((s, v) => s + v, 0)
  if (ssTotal === 0) return []

  // Normalize weights per component (W columns to unit length)
  const wNorm: number[][] = Array.from({ length: p }, () => new Array(nComp).fill(0))
  for (let a = 0; a < nComp; a++) {
    let colNorm = 0
    for (let j = 0; j < p; j++) {
      colNorm += W[j][a] ** 2
    }
    colNorm = Math.sqrt(colNorm)
    if (colNorm > 0) {
      for (let j = 0; j < p; j++) {
        wNorm[j][a] = W[j][a] / colNorm
      }
    }
  }

  const vipScores: VIPScore[] = xVariableIds.map((id, j) => {
    let vipSum = 0
    for (let a = 0; a < nComp; a++) {
      vipSum += SS[a] * wNorm[j][a] ** 2
    }
    const vip = Math.sqrt((p * vipSum) / ssTotal)

    // Coefficient sign/magnitude from B matrix
    const coefficient = B[j]?.[0] ?? 0

    // Category from registry
    const reg = MVA_VARIABLE_REGISTRY.find((v) => v.id === id)
    const category = reg?.category ?? 'PHYSIOLOGICAL'

    return {
      variableId: id,
      variableName: xVariableNames[j],
      vip,
      coefficient,
      category,
    }
  })

  // Sort descending by VIP
  vipScores.sort((a, b) => b.vip - a.vip)

  return vipScores
}

/**
 * Compute R²X — fraction of X variance explained by the model.
 */
function computeR2X(X: number[][], T: number[][], P: number[][]): number {
  const n = X.length
  const p = X[0]?.length ?? 0
  if (n === 0 || p === 0) return 0

  // Total X variance (already centered, so SS = sum of all x_ij²)
  let ssTotX = 0
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < p; j++) {
      ssTotX += X[i][j] ** 2
    }
  }
  if (ssTotX === 0) return 0

  // Reconstruct X from T * P' and compute residual
  const nComp = T[0]?.length ?? 0
  let ssResX = 0
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < p; j++) {
      let reconstructed = 0
      for (let a = 0; a < nComp; a++) {
        reconstructed += T[i][a] * P[j][a]
      }
      ssResX += (X[i][j] - reconstructed) ** 2
    }
  }

  return 1 - ssResX / ssTotX
}
