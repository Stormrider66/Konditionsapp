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
