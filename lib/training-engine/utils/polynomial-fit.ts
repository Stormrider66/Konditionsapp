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
