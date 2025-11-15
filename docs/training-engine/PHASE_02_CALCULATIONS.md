# Phase 2: Core Calculations Library

**Duration:** Weeks 1-2 (16-20 hours)
**Prerequisites:** [Phase 1: Database Foundation](./PHASE_01_DATABASE.md)
**Status:** 📝 Not Started

---

## Quick Links

- [Master Plan](./MASTER_PLAN.md)
- [Previous: Phase 1 Database](./PHASE_01_DATABASE.md)
- [Next: Phase 3 Monitoring](./PHASE_03_MONITORING.md)

---

## Overview

Build the mathematical foundation for the training engine. These are **pure TypeScript functions** with no database dependencies, making them easy to test and reuse throughout the system.

### What We're Building

**7 Core Calculation Modules:**

1. **D-max & Mod-Dmax** - Lactate threshold detection (r² ≥ 0.90)
2. **Enhanced Zones** - Individualized training zones (never %HRmax)
3. **TSS/TRIMP** - Training stress quantification
4. **Race Predictions** - Performance predictions from thresholds
5. **VDOT** - Jack Daniels running calculator
6. **Environmental Adjustments** - Temperature, altitude, wind
7. **Utilities** - Polynomial fitting, interpolation, statistics

### Key Principles

- ✅ **Scientifically validated** - All formulas from peer-reviewed research
- ✅ **Individualized not generic** - Anchored to LT1/LT2, not population averages
- ✅ **Extensively tested** - Unit tests with known-good data
- ✅ **Well documented** - Every algorithm explained with citations
- ✅ **Type safe** - Full TypeScript with strict mode

### Success Criteria

- D-max accuracy >95% (r² ≥ 0.90 on valid curves)
- Zone calculations never use %HRmax
- All functions have unit tests
- Code coverage >90%

---

## File Structure

```
lib/training-engine/
├── calculations/
│   ├── dmax.ts                 # D-max and Mod-Dmax algorithms
│   ├── zones-enhanced.ts       # Individualized zone calculation
│   ├── tss-trimp.ts           # Training stress calculations
│   ├── race-predictions.ts     # Race time predictions
│   ├── vdot.ts                # Jack Daniels VDOT
│   └── environmental.ts        # Temperature/altitude/wind
└── utils/
    ├── polynomial-fit.ts       # Polynomial regression
    ├── interpolation.ts        # Linear interpolation
    ├── statistics.ts           # Mean, std dev, R²
    └── validation.ts           # Data validation helpers
```

---

## Implementation Tasks

### Task 2.1: Polynomial Fitting Utility

**File:** `lib/training-engine/utils/polynomial-fit.ts`

**Purpose:** Fit 3rd degree polynomials for D-max calculation

**Reference:** Original skill document SKILL_ENHANCED_PART1.md, Section 5.1

```typescript
/**
 * Polynomial Regression Utilities
 * Implements least squares method for 3rd degree polynomial fitting
 *
 * Used by D-max algorithm to fit lactate curve
 * Requires minimum 4 data points
 *
 * @module polynomial-fit
 */

export interface PolynomialCoefficients {
  a: number;  // x³ coefficient
  b: number;  // x² coefficient
  c: number;  // x coefficient
  d: number;  // constant
}

export interface RegressionResult {
  coefficients: PolynomialCoefficients;
  r2: number;          // Coefficient of determination
  predictions: number[];
}

/**
 * Fit 3rd degree polynomial: y = ax³ + bx² + cx + d
 * Uses Vandermonde matrix method for least squares fit
 *
 * Algorithm:
 * 1. Build Vandermonde matrix X = [x³, x², x, 1]
 * 2. Solve normal equations: (X^T X)β = X^T y
 * 3. Calculate predictions
 * 4. Compute R² for goodness of fit
 *
 * @param x - Independent variable (intensity: km/h, watts, m/s)
 * @param y - Dependent variable (lactate: mmol/L)
 * @returns Polynomial coefficients and R²
 * @throws Error if fewer than 4 data points
 */
export function fitPolynomial3(x: number[], y: number[]): RegressionResult {
  const n = x.length;

  if (n < 4) {
    throw new Error('Minimum 4 data points required for 3rd degree polynomial');
  }

  if (x.length !== y.length) {
    throw new Error('X and Y arrays must have same length');
  }

  // Build Vandermonde matrix: [x³, x², x, 1]
  const X: number[][] = [];
  for (let i = 0; i < n; i++) {
    X.push([
      Math.pow(x[i], 3),
      Math.pow(x[i], 2),
      x[i],
      1
    ]);
  }

  // Solve normal equations: (X^T X)β = X^T y
  const XtX = multiplyMatrices(transpose(X), X);
  const Xty = multiplyMatrixVector(transpose(X), y);
  const beta = gaussianElimination(XtX, Xty);

  const coefficients: PolynomialCoefficients = {
    a: beta[0],
    b: beta[1],
    c: beta[2],
    d: beta[3]
  };

  // Calculate predictions
  const predictions = x.map(xi =>
    coefficients.a * Math.pow(xi, 3) +
    coefficients.b * Math.pow(xi, 2) +
    coefficients.c * xi +
    coefficients.d
  );

  // Calculate R² (coefficient of determination)
  const r2 = calculateR2(y, predictions);

  return { coefficients, r2, predictions };
}

/**
 * Calculate R² (coefficient of determination)
 * R² = 1 - (SS_res / SS_tot)
 *
 * @param observed - Actual y values
 * @param predicted - Predicted y values from model
 * @returns R² value (0-1, where 1 = perfect fit)
 */
export function calculateR2(observed: number[], predicted: number[]): number {
  const n = observed.length;
  const mean = observed.reduce((sum, val) => sum + val, 0) / n;

  let ssRes = 0;  // Sum of squares of residuals
  let ssTot = 0;  // Total sum of squares

  for (let i = 0; i < n; i++) {
    ssRes += Math.pow(observed[i] - predicted[i], 2);
    ssTot += Math.pow(observed[i] - mean, 2);
  }

  return 1 - (ssRes / ssTot);
}

// ============================================
// Matrix Operations
// ============================================

function transpose(matrix: number[][]): number[][] {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const result: number[][] = [];

  for (let j = 0; j < cols; j++) {
    result[j] = [];
    for (let i = 0; i < rows; i++) {
      result[j][i] = matrix[i][j];
    }
  }

  return result;
}

function multiplyMatrices(a: number[][], b: number[][]): number[][] {
  const rowsA = a.length;
  const colsA = a[0].length;
  const colsB = b[0].length;
  const result: number[][] = [];

  for (let i = 0; i < rowsA; i++) {
    result[i] = [];
    for (let j = 0; j < colsB; j++) {
      let sum = 0;
      for (let k = 0; k < colsA; k++) {
        sum += a[i][k] * b[k][j];
      }
      result[i][j] = sum;
    }
  }

  return result;
}

function multiplyMatrixVector(matrix: number[][], vector: number[]): number[] {
  const rows = matrix.length;
  const result: number[] = [];

  for (let i = 0; i < rows; i++) {
    let sum = 0;
    for (let j = 0; j < matrix[i].length; j++) {
      sum += matrix[i][j] * vector[j];
    }
    result[i] = sum;
  }

  return result;
}

/**
 * Gaussian elimination for solving linear systems Ax = b
 * Uses partial pivoting for numerical stability
 */
function gaussianElimination(A: number[][], b: number[]): number[] {
  const n = A.length;
  const augmented: number[][] = [];

  // Create augmented matrix [A|b]
  for (let i = 0; i < n; i++) {
    augmented[i] = [...A[i], b[i]];
  }

  // Forward elimination with partial pivoting
  for (let i = 0; i < n; i++) {
    // Find pivot (largest absolute value in column i)
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }

    // Swap rows i and maxRow
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

    // Check for singular matrix
    if (Math.abs(augmented[i][i]) < 1e-10) {
      throw new Error('Matrix is singular or nearly singular');
    }

    // Make all rows below this one 0 in current column
    for (let k = i + 1; k < n; k++) {
      const factor = augmented[k][i] / augmented[i][i];
      for (let j = i; j <= n; j++) {
        augmented[k][j] -= factor * augmented[i][j];
      }
    }
  }

  // Back substitution
  const x: number[] = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = augmented[i][n];
    for (let j = i + 1; j < n; j++) {
      x[i] -= augmented[i][j] * x[j];
    }
    x[i] /= augmented[i][i];
  }

  return x;
}
```

**Test File:** `lib/training-engine/__tests__/utils/polynomial-fit.test.ts`

```typescript
import { fitPolynomial3, calculateR2 } from '../../utils/polynomial-fit';

describe('Polynomial Fitting', () => {
  test('fits perfect cubic', () => {
    // Test data: y = x³ + 2x² - 3x + 1
    const x = [0, 1, 2, 3, 4];
    const y = x.map(xi => Math.pow(xi, 3) + 2 * Math.pow(xi, 2) - 3 * xi + 1);

    const result = fitPolynomial3(x, y);

    expect(result.r2).toBeGreaterThan(0.9999);
    expect(result.coefficients.a).toBeCloseTo(1, 4);
    expect(result.coefficients.b).toBeCloseTo(2, 4);
    expect(result.coefficients.c).toBeCloseTo(-3, 4);
    expect(result.coefficients.d).toBeCloseTo(1, 4);
  });

  test('fits real lactate curve data', () => {
    // Real lactate test data from research
    const intensity = [10, 12, 14, 16, 18];  // km/h
    const lactate = [1.2, 1.5, 2.1, 3.5, 6.2];  // mmol/L

    const result = fitPolynomial3(intensity, lactate);

    expect(result.r2).toBeGreaterThan(0.90);
    expect(result.predictions.length).toBe(5);

    // Verify predictions are reasonable
    result.predictions.forEach((pred, i) => {
      expect(Math.abs(pred - lactate[i])).toBeLessThan(0.5);
    });
  });

  test('throws error with insufficient data', () => {
    const x = [1, 2, 3];
    const y = [1, 4, 9];

    expect(() => fitPolynomial3(x, y)).toThrow('Minimum 4 data points');
  });

  test('calculates R² correctly', () => {
    const observed = [1, 2, 3, 4, 5];
    const perfect = [1, 2, 3, 4, 5];
    const poor = [1, 3, 2, 5, 4];

    expect(calculateR2(observed, perfect)).toBeCloseTo(1.0);
    expect(calculateR2(observed, poor)).toBeLessThan(0.5);
  });
});
```

### Task 2.2: Interpolation Utilities

**File:** `lib/training-engine/utils/interpolation.ts`

```typescript
/**
 * Interpolation Utilities
 * Linear interpolation for threshold determination and HR mapping
 *
 * @module interpolation
 */

/**
 * Linear interpolation between two points
 * Used when threshold falls between test stages
 *
 * Formula: y = y1 + (y2 - y1) * (x - x1) / (x2 - x1)
 *
 * @param x1 - First x value
 * @param y1 - First y value
 * @param x2 - Second x value
 * @param y2 - Second y value
 * @param x - Target x value
 * @returns Interpolated y value
 */
export function interpolateLinear(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x: number
): number {
  if (x2 === x1) {
    return y1; // Avoid division by zero
  }

  return y1 + (y2 - y1) * (x - x1) / (x2 - x1);
}

/**
 * Find value at target x by interpolating between bracketing points
 *
 * @param xArray - Array of x values (must be sorted ascending)
 * @param yArray - Array of corresponding y values
 * @param targetX - X value to find y for
 * @returns Interpolated y value, or null if target outside range
 */
export function interpolateFromArrays(
  xArray: number[],
  yArray: number[],
  targetX: number
): number | null {
  // Check if target is in range
  if (targetX < xArray[0] || targetX > xArray[xArray.length - 1]) {
    return null;
  }

  // Find bracketing indices
  for (let i = 1; i < xArray.length; i++) {
    if (xArray[i] >= targetX) {
      return interpolateLinear(
        xArray[i - 1], yArray[i - 1],
        xArray[i], yArray[i],
        targetX
      );
    }
  }

  // If we get here, target equals last point
  return yArray[yArray.length - 1];
}

/**
 * Interpolate heart rate at given intensity
 * Common use: Find HR at threshold intensity
 *
 * @param intensities - Array of test stage intensities
 * @param heartRates - Array of corresponding heart rates
 * @param targetIntensity - Intensity to find HR for
 * @returns Interpolated heart rate
 */
export function interpolateHeartRate(
  intensities: number[],
  heartRates: number[],
  targetIntensity: number
): number {
  const hr = interpolateFromArrays(intensities, heartRates, targetIntensity);

  if (hr === null) {
    // Target outside range - return closest boundary
    if (targetIntensity < intensities[0]) {
      return heartRates[0];
    }
    return heartRates[heartRates.length - 1];
  }

  return Math.round(hr); // Heart rate should be integer
}
```

**Continue with remaining tasks in next file due to length limits...**

---

## Acceptance Criteria

### Code Quality
- [ ] All functions have TypeScript type definitions
- [ ] JSDoc comments for all public functions
- [ ] No `any` types used
- [ ] Strict mode enabled
- [ ] ESLint passes with no warnings

### Testing
- [ ] Unit tests for all calculation functions
- [ ] Test coverage >90%
- [ ] Known-good data from research validated
- [ ] Edge cases tested (empty arrays, single points, etc.)
- [ ] All tests pass

### Accuracy
- [ ] D-max achieves r² ≥ 0.90 on valid curves
- [ ] Zone calculations match research formulas
- [ ] TSS/TRIMP calculations validated against known values
- [ ] Race predictions within ±2-3% of actual for elites

### Documentation
- [ ] README in calculations/ folder
- [ ] Algorithm explanations with citations
- [ ] Usage examples for each module
- [ ] Error handling documented

---

## Related Phases

**Depends on:**
- [Phase 1: Database Foundation](./PHASE_01_DATABASE.md) - Uses ThresholdCalculation model

**Required by:**
- [Phase 3: Monitoring Systems](./PHASE_03_MONITORING.md) - Uses statistics utilities
- [Phase 4: Field Testing](./PHASE_04_FIELD_TESTS.md) - Uses D-max and interpolation
- [Phase 6: Methodologies](./PHASE_06_METHODOLOGIES.md) - Uses zone calculations
- [Phase 7: Program Generation](./PHASE_07_PROGRAM_GENERATION.md) - Uses all calculations

---

## References

- **Original Documentation:** `/New engine dev files/SKILL_ENHANCED_PART1.md`
- **D-max Algorithm:** Section 5.1-5.5
- **Zone Mapping:** Section 4.1-4.3
- **TSS/TRIMP:** Section 7.1-7.3
- **Research Citations:** Included in code comments

---

**Next Phase:** [Phase 3: Monitoring Systems](./PHASE_03_MONITORING.md)
