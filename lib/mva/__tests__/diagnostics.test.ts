import { describe, it, expect } from 'vitest'
import { computeDiagnostics, fCriticalValue } from '../diagnostics'

/**
 * Build a tiny PCA-shaped fixture: scores/loadings/eigenvalues consistent with
 * a 2-component model over `nVars` standardized variables, plus one obvious
 * model-outlier whose residual is large.
 */
function fixture() {
  // 10 observations, 4 variables, 2 components.
  const nObs = 10
  const nVars = 4
  const nComp = 2

  // Orthonormal-ish loadings for 2 components across 4 variables.
  const loadings: number[][] = [
    [0.7, 0.1],
    [0.6, -0.2],
    [0.2, 0.7],
    [0.1, 0.65],
  ]

  // Scores: spread along PC1/PC2. Observation 9 sits far out on PC1.
  const allScores: number[][] = Array.from({ length: nObs }, (_, i) => {
    const pc1 = i === nObs - 1 ? 8 : (i - 4) * 0.5
    const pc2 = ((i % 3) - 1) * 0.4
    return [pc1, pc2, 0, 0]
  })

  // Reconstruct X from scores·loadingsᵀ, then inject a residual on obs 8 only
  // (so it is well inside the score ellipse but poorly modelled → high DModX).
  const matrix: number[][] = allScores.map((s, i) => {
    const row = Array.from({ length: nVars }, (_, j) =>
      s[0] * loadings[j][0] + s[1] * loadings[j][1]
    )
    if (i === 8) row[2] += 3 // large unmodelled residual
    return row
  })

  const eigenvalues = [4, 1.5, 0.3, 0.1]
  const ids = Array.from({ length: nObs }, (_, i) => `a${i}`)
  const names = ids
  const varIds = ['v0', 'v1', 'v2', 'v3']

  return { nObs, nVars, nComp, loadings, allScores, matrix, eigenvalues, ids, names, varIds }
}

describe('fCriticalValue', () => {
  it('returns finite, positive values for valid degrees of freedom', () => {
    const f = fCriticalValue(2, 20, 0.05)
    expect(Number.isFinite(f)).toBe(true)
    expect(f).toBeGreaterThan(0)
  })

  it('is more extreme (larger) for a stricter alpha', () => {
    const f95 = fCriticalValue(3, 30, 0.05)
    const f99 = fCriticalValue(3, 30, 0.01)
    expect(f99).toBeGreaterThan(f95)
  })

  it('returns Infinity when degrees of freedom are non-positive', () => {
    expect(fCriticalValue(0, 10, 0.05)).toBe(Infinity)
    expect(fCriticalValue(2, 0, 0.05)).toBe(Infinity)
  })

  it('matches known F table values within 1%', () => {
    // F(2, 8, 0.05) = 4.459; F(3, 30, 0.05) = 2.922; F(1, 10, 0.01) = 10.044
    expect(fCriticalValue(2, 8, 0.05)).toBeCloseTo(4.459, 1)
    expect(fCriticalValue(3, 30, 0.05)).toBeCloseTo(2.922, 1)
    expect(fCriticalValue(1, 10, 0.01)).toBeCloseTo(10.044, 1)
  })
})

describe('computeDiagnostics', () => {
  const f = fixture()
  const selectedScores = f.allScores.map((row) => row.slice(0, f.nComp))
  const selectedEig = f.eigenvalues.slice(0, f.nComp)

  const result = computeDiagnostics(
    selectedScores,
    selectedEig,
    f.matrix,
    f.allScores,
    f.loadings,
    f.ids,
    f.names,
    f.varIds,
    f.varIds,
    f.nComp
  )

  it('produces F-based DModX control limits with 99% above 95%', () => {
    expect(result.dmodxLimit).toBeGreaterThan(0)
    expect(result.dmodxLimit99).toBeGreaterThanOrEqual(result.dmodxLimit)
    expect(Number.isFinite(result.dmodxLimit)).toBe(true)
  })

  it('flags the high-residual observation as a DModX outlier', () => {
    const obs8 = result.diagnostics.find((d) => d.clientId === 'a8')
    expect(obs8?.isOutlierDModX).toBe(true)
  })

  it('flags the far-out score as a Hotelling T² outlier', () => {
    const obs9 = result.diagnostics.find((d) => d.clientId === 'a9')
    expect(obs9?.isOutlierT2).toBe(true)
  })

  it('does not flag well-modelled, central observations', () => {
    const central = result.diagnostics.find((d) => d.clientId === 'a4')
    expect(central?.isOutlierT2).toBe(false)
    expect(central?.isOutlierDModX).toBe(false)
  })

  it('returns finite Hotelling limits', () => {
    expect(Number.isFinite(result.t2Limit95)).toBe(true)
    expect(result.t2Limit99).toBeGreaterThan(result.t2Limit95)
  })
})
