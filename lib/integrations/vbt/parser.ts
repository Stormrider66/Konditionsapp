/**
 * VBT CSV Parser
 *
 * Parses CSV exports from various VBT devices:
 * - Vmaxpro/Enode
 * - Vitruve
 * - GymAware
 * - PUSH Band
 * - Perch
 * - Tendo
 */

import type { VBTDeviceType } from '@prisma/client';
import {
  type VBTColumnMapping,
  type VBTParsedMeasurement,
  type VBTParsedSession,
  type VBTRawRow,
  DEVICE_COLUMN_MAPPINGS,
  getVelocityZone,
  getRepQuality,
} from './types';

// ============================================
// CSV Parsing Utilities
// ============================================

/**
 * Parse CSV content into rows
 */
function parseCSV(content: string): VBTRawRow[] {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Parse header line
  const headers = parseCSVLine(lines[0]);
  const rows: VBTRawRow[] = [];

  // Parse data lines
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const row: VBTRawRow = {};

    for (let j = 0; j < headers.length; j++) {
      const header = headers[j].trim();
      const value = values[j]?.trim() || '';

      // Try to parse as number
      const numValue = parseFloat(value.replace(',', '.'));
      row[header] = isNaN(numValue) ? value : numValue;
    }

    rows.push(row);
  }

  return rows;
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if ((char === ',' || char === ';') && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

// ============================================
// Device Detection
// ============================================

/**
 * Detect device type from CSV headers
 */
export function detectDeviceType(headers: string[]): VBTDeviceType {
  const headerSet = new Set(headers.map(h => h.toLowerCase().trim()));

  // Vmaxpro typically has specific column naming
  if (headerSet.has('mv (m/s)') || headerSet.has('pv (m/s)')) {
    return 'VMAXPRO';
  }

  // Vitruve uses Spanish/English mixed or underscores
  if (
    headerSet.has('velocidad_media') ||
    headerSet.has('mean_velocity') ||
    headerSet.has('potencia_media')
  ) {
    return 'VITRUVE';
  }

  // GymAware has specific formatting
  if (
    headerSet.has('mean velocity (m/s)') ||
    headerSet.has('peak velocity (m/s)') ||
    headerSet.has('mean power (w)')
  ) {
    return 'GYMAWARE';
  }

  // PUSH Band
  if (headerSet.has('average velocity (m/s)') || headerSet.has('average power (w)')) {
    return 'PUSH';
  }

  // Tendo
  if (headerSet.has('v mean') || headerSet.has('vmean') || headerSet.has('p mean')) {
    return 'TENDO';
  }

  // Default to generic
  return 'GENERIC';
}

// ============================================
// Column Mapping
// ============================================

/**
 * Find the column name that matches one of the expected names
 */
function findColumn(
  headers: string[],
  expectedNames: string[]
): string | null {
  const headerLower = headers.map(h => h.toLowerCase().trim());

  for (const name of expectedNames) {
    const idx = headerLower.indexOf(name.toLowerCase());
    if (idx !== -1) {
      return headers[idx];
    }
  }

  return null;
}

/**
 * Get column mappings for headers
 */
function getColumnMappings(
  headers: string[],
  deviceType: VBTDeviceType
): Record<keyof VBTColumnMapping, string | null> {
  const mapping = DEVICE_COLUMN_MAPPINGS[deviceType];

  return {
    exercise: findColumn(headers, mapping.exercise),
    setNumber: findColumn(headers, mapping.setNumber),
    repNumber: findColumn(headers, mapping.repNumber),
    load: findColumn(headers, mapping.load),
    meanVelocity: findColumn(headers, mapping.meanVelocity),
    peakVelocity: findColumn(headers, mapping.peakVelocity),
    meanPower: findColumn(headers, mapping.meanPower),
    peakPower: findColumn(headers, mapping.peakPower),
    rom: findColumn(headers, mapping.rom),
    concentricTime: findColumn(headers, mapping.concentricTime),
    eccentricTime: findColumn(headers, mapping.eccentricTime),
    timeToPeakVel: findColumn(headers, mapping.timeToPeakVel),
    date: findColumn(headers, mapping.date),
    time: findColumn(headers, mapping.time),
  };
}

// ============================================
// Main Parser
// ============================================

/**
 * Parse VBT CSV content
 */
export function parseVBTCSV(
  content: string,
  options: {
    deviceType?: VBTDeviceType;
    sessionDate?: Date;
    fileName?: string;
  } = {}
): VBTParsedSession {
  const errors: string[] = [];
  const measurements: VBTParsedMeasurement[] = [];

  // Parse CSV
  const rows = parseCSV(content);
  if (rows.length === 0) {
    errors.push('CSV file is empty or invalid');
    return {
      deviceType: options.deviceType || 'GENERIC',
      sessionDate: options.sessionDate || new Date(),
      measurements: [],
      parseErrors: errors,
      fileName: options.fileName,
    };
  }

  // Get headers from first row
  const headers = Object.keys(rows[0]);

  // Detect device type if not specified
  const deviceType = options.deviceType || detectDeviceType(headers);

  // Get column mappings
  const columns = getColumnMappings(headers, deviceType);

  // Validate required columns
  if (!columns.exercise) {
    errors.push('Could not find exercise column');
  }
  if (!columns.meanVelocity && !columns.peakVelocity) {
    errors.push('Could not find velocity columns');
  }

  // Parse session date from data if not provided
  let sessionDate = options.sessionDate;
  if (!sessionDate && columns.date && rows[0][columns.date]) {
    const dateStr = String(rows[0][columns.date]);
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      sessionDate = parsed;
    }
  }
  sessionDate = sessionDate || new Date();

  // Track set numbers per exercise if not in data
  const exerciseSetMap = new Map<string, { currentSet: number; repCount: number }>();

  // Parse each row
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    try {
      const exerciseName = columns.exercise
        ? String(row[columns.exercise] || '').trim()
        : 'Unknown';

      if (!exerciseName || exerciseName === 'Unknown') {
        errors.push(`Row ${i + 2}: Missing exercise name`);
        continue;
      }

      // Get or infer set/rep numbers
      let setNumber = columns.setNumber
        ? Number(row[columns.setNumber]) || 0
        : 0;
      let repNumber = columns.repNumber
        ? Number(row[columns.repNumber]) || 0
        : 0;

      // If set/rep not in data, infer from exercise sequence
      if (setNumber === 0 || repNumber === 0) {
        const exerciseState = exerciseSetMap.get(exerciseName) || {
          currentSet: 1,
          repCount: 0,
        };

        // Check if this is a new set (reset based on row gap or time)
        // For now, assume sequential rows are same set unless rep resets
        if (repNumber === 1 || (repNumber === 0 && exerciseState.repCount > 0)) {
          exerciseState.currentSet++;
          exerciseState.repCount = 0;
        }

        exerciseState.repCount++;

        if (setNumber === 0) setNumber = exerciseState.currentSet;
        if (repNumber === 0) repNumber = exerciseState.repCount;

        exerciseSetMap.set(exerciseName, exerciseState);
      }

      // Parse numeric values
      const getValue = (col: string | null): number | undefined => {
        if (!col || row[col] === undefined || row[col] === '') return undefined;
        const val = Number(row[col]);
        return isNaN(val) ? undefined : val;
      };

      const measurement: VBTParsedMeasurement = {
        exerciseName,
        setNumber,
        repNumber,
        load: getValue(columns.load),
        meanVelocity: getValue(columns.meanVelocity),
        peakVelocity: getValue(columns.peakVelocity),
        meanPower: getValue(columns.meanPower),
        peakPower: getValue(columns.peakPower),
        rom: getValue(columns.rom),
        concentricTime: getValue(columns.concentricTime),
        eccentricTime: getValue(columns.eccentricTime),
        timeToPeakVel: getValue(columns.timeToPeakVel),
        rawMetrics: { ...row },
      };

      // Validate: at least one velocity value
      if (
        measurement.meanVelocity === undefined &&
        measurement.peakVelocity === undefined
      ) {
        errors.push(`Row ${i + 2}: No velocity data found`);
        continue;
      }

      measurements.push(measurement);
    } catch (err) {
      errors.push(`Row ${i + 2}: Parse error - ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  }

  return {
    deviceType,
    sessionDate,
    measurements,
    parseErrors: errors,
    fileName: options.fileName,
  };
}

// ============================================
// Velocity Loss Calculations
// ============================================

/**
 * Calculate velocity loss for each rep in a set
 */
export function calculateVelocityLoss(
  measurements: VBTParsedMeasurement[]
): Map<string, number[]> {
  const result = new Map<string, number[]>();

  // Group by exercise and set
  const groups = new Map<string, VBTParsedMeasurement[]>();
  for (const m of measurements) {
    const key = `${m.exerciseName}-${m.setNumber}`;
    const group = groups.get(key) || [];
    group.push(m);
    groups.set(key, group);
  }

  // Calculate velocity loss for each group
  for (const [key, reps] of groups.entries()) {
    // Sort by rep number
    const sorted = [...reps].sort((a, b) => a.repNumber - b.repNumber);

    // Get first rep velocity as reference
    const firstVel = sorted[0]?.meanVelocity;
    if (!firstVel) {
      result.set(key, []);
      continue;
    }

    const losses = sorted.map(rep => {
      if (!rep.meanVelocity) return 0;
      return ((firstVel - rep.meanVelocity) / firstVel) * 100;
    });

    result.set(key, losses);
  }

  return result;
}

/**
 * Enrich measurements with velocity loss and quality
 */
export function enrichMeasurements(
  measurements: VBTParsedMeasurement[]
): (VBTParsedMeasurement & {
  velocityLoss?: number;
  velocityLossSet?: number;
  velocityZone?: string;
  repQuality?: string;
})[] {
  const velocityLossMap = calculateVelocityLoss(measurements);

  // Group for set-level loss calculation
  const groups = new Map<string, VBTParsedMeasurement[]>();
  for (const m of measurements) {
    const key = `${m.exerciseName}-${m.setNumber}`;
    const group = groups.get(key) || [];
    group.push(m);
    groups.set(key, group);
  }

  return measurements.map((m, index) => {
    const key = `${m.exerciseName}-${m.setNumber}`;
    const setLosses = velocityLossMap.get(key) || [];
    const repsInSet = groups.get(key) || [];

    // Find this rep's index in the set
    const repIndex = repsInSet
      .sort((a, b) => a.repNumber - b.repNumber)
      .findIndex(r => r.repNumber === m.repNumber);

    const velocityLoss = setLosses[repIndex] || 0;

    // Set-level velocity loss (last rep vs first)
    const lastRepLoss = setLosses[setLosses.length - 1] || 0;

    return {
      ...m,
      velocityLoss,
      velocityLossSet: lastRepLoss,
      velocityZone: m.meanVelocity ? getVelocityZone(m.meanVelocity) : undefined,
      repQuality: getRepQuality(velocityLoss),
    };
  });
}

// ============================================
// Exercise Matching
// ============================================

/**
 * Normalize exercise name for matching
 */
export function normalizeExerciseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

/**
 * Score similarity between two exercise names
 * Returns 0-1 where 1 is exact match
 */
export function exerciseSimilarity(name1: string, name2: string): number {
  const n1 = normalizeExerciseName(name1);
  const n2 = normalizeExerciseName(name2);

  if (n1 === n2) return 1;

  // Check if one contains the other
  if (n1.includes(n2) || n2.includes(n1)) {
    const longer = Math.max(n1.length, n2.length);
    const shorter = Math.min(n1.length, n2.length);
    return shorter / longer;
  }

  // Levenshtein distance based similarity
  const distance = levenshteinDistance(n1, n2);
  const maxLen = Math.max(n1.length, n2.length);
  return Math.max(0, 1 - distance / maxLen);
}

/**
 * Levenshtein distance between two strings
 */
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;

  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}
