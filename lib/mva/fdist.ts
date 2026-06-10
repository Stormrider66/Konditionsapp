/**
 * Small, dependency-free F-distribution quantile.
 *
 * The earlier MVA diagnostics used a Wilson-Hilferty normal approximation for
 * the F critical value. That approximation is badly inflated at the small
 * residual degrees of freedom typical of a team model (e.g. it returns ~49 for
 * F(2, 8, 0.05) where the true value is ~4.46), which made the Hotelling's T²
 * and DModX control limits far too lenient — true outliers slipped through.
 *
 * This module computes the exact upper-tail F critical value via the inverse
 * regularized incomplete beta function, using the standard identity:
 *
 *   P(F_{d1,d2} ≤ f) = I_x(d1/2, d2/2),  with  x = d1·f / (d1·f + d2)
 *
 * so for an upper-tail probability `alpha` we solve I_x = 1 − alpha for x and
 * back out f. Accurate to ~1e-9 for the df ranges used here.
 */

/** Lanczos approximation of ln Γ(z). */
function logGamma(z: number): number {
  const g = 7
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ]
  if (z < 0.5) {
    // Reflection formula
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z)
  }
  z -= 1
  let x = c[0]
  for (let i = 1; i < g + 2; i++) {
    x += c[i] / (z + i)
  }
  const t = z + g + 0.5
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
}

/**
 * Continued-fraction evaluation for the incomplete beta function
 * (Numerical Recipes §6.4, `betacf`).
 */
function betacf(a: number, b: number, x: number): number {
  const MAXIT = 300
  const EPS = 3e-12
  const FPMIN = 1e-30

  const qab = a + b
  const qap = a + 1
  const qam = a - 1
  let c = 1
  let d = 1 - (qab * x) / qap
  if (Math.abs(d) < FPMIN) d = FPMIN
  d = 1 / d
  let h = d

  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    h *= d * c

    aa = -((a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < EPS) break
  }

  return h
}

/** Regularized incomplete beta function I_x(a, b) (Numerical Recipes `betai`). */
function regularizedIncompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1

  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x)
  )

  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betacf(a, b, x)) / a
  }
  return 1 - (bt * betacf(b, a, 1 - x)) / b
}

/** Inverse of the regularized incomplete beta: find x with I_x(a,b) = p. */
function invRegularizedIncompleteBeta(p: number, a: number, b: number): number {
  if (p <= 0) return 0
  if (p >= 1) return 1

  // Bisection — robust and fast enough for one-off limit computations.
  let lo = 0
  let hi = 1
  let mid = 0.5
  for (let i = 0; i < 200; i++) {
    mid = (lo + hi) / 2
    const val = regularizedIncompleteBeta(mid, a, b)
    if (val < p) {
      lo = mid
    } else {
      hi = mid
    }
    if (hi - lo < 1e-12) break
  }
  return mid
}

/**
 * Upper-tail F critical value F(alpha; df1, df2): the value f such that
 * P(F_{df1,df2} > f) = alpha. Returns Infinity for non-positive df.
 */
export function fCriticalValue(df1: number, df2: number, alpha: number): number {
  if (df1 <= 0 || df2 <= 0) return Infinity
  if (alpha <= 0) return Infinity
  if (alpha >= 1) return 0

  const x = invRegularizedIncompleteBeta(1 - alpha, df1 / 2, df2 / 2)
  if (x >= 1) return Infinity
  return (df2 * x) / (df1 * (1 - x))
}
