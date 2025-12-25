/**
 * VBT (Velocity-Based Training) Type Definitions
 *
 * Types for parsing and storing data from VBT devices:
 * - Vmaxpro/Enode
 * - Vitruve
 * - GymAware
 * - PUSH Band
 * - Perch
 * - Tendo
 */

import type { VBTDeviceType } from '@prisma/client';

// ============================================
// CSV Column Mappings for Different Devices
// ============================================

/**
 * Common column names across different VBT devices
 */
export interface VBTColumnMapping {
  exercise: string[];
  setNumber: string[];
  repNumber: string[];
  load: string[];
  meanVelocity: string[];
  peakVelocity: string[];
  meanPower: string[];
  peakPower: string[];
  rom: string[];
  concentricTime: string[];
  eccentricTime: string[];
  timeToPeakVel: string[];
  date: string[];
  time: string[];
}

/**
 * Device-specific column mappings
 */
export const DEVICE_COLUMN_MAPPINGS: Record<VBTDeviceType, VBTColumnMapping> = {
  VMAXPRO: {
    exercise: ['Exercise', 'exercise', 'Movement'],
    setNumber: ['Set', 'set', 'Set Number', 'SetNumber'],
    repNumber: ['Rep', 'rep', 'Rep Number', 'RepNumber', 'Repetition'],
    load: ['Load', 'load', 'Weight', 'weight', 'Load (kg)', 'Weight (kg)'],
    meanVelocity: ['Mean Velocity', 'MeanVelocity', 'Avg Velocity', 'Mean Vel', 'MV (m/s)'],
    peakVelocity: ['Peak Velocity', 'PeakVelocity', 'Max Velocity', 'Peak Vel', 'PV (m/s)'],
    meanPower: ['Mean Power', 'MeanPower', 'Avg Power', 'MP (W)'],
    peakPower: ['Peak Power', 'PeakPower', 'Max Power', 'PP (W)'],
    rom: ['ROM', 'rom', 'Range of Motion', 'Displacement', 'Distance'],
    concentricTime: ['Concentric Time', 'ConcentricTime', 'Con Time', 'TC (s)'],
    eccentricTime: ['Eccentric Time', 'EccentricTime', 'Ecc Time', 'TE (s)'],
    timeToPeakVel: ['Time to Peak', 'TimeToPeak', 'TPV'],
    date: ['Date', 'date', 'Datum'],
    time: ['Time', 'time', 'Tid'],
  },
  VITRUVE: {
    exercise: ['exercise', 'Exercise', 'movement', 'Movement'],
    setNumber: ['set', 'Set', 'serie', 'Serie'],
    repNumber: ['rep', 'Rep', 'repetition', 'Repetition'],
    load: ['load', 'Load', 'weight', 'Weight', 'carga'],
    meanVelocity: ['mean_velocity', 'Mean Velocity', 'velocidad_media'],
    peakVelocity: ['peak_velocity', 'Peak Velocity', 'velocidad_pico'],
    meanPower: ['mean_power', 'Mean Power', 'potencia_media'],
    peakPower: ['peak_power', 'Peak Power', 'potencia_pico'],
    rom: ['rom', 'ROM', 'range_of_motion', 'desplazamiento'],
    concentricTime: ['concentric_time', 'Concentric Time', 'tiempo_concentrico'],
    eccentricTime: ['eccentric_time', 'Eccentric Time', 'tiempo_excentrico'],
    timeToPeakVel: ['time_to_peak', 'Time to Peak'],
    date: ['date', 'Date', 'fecha'],
    time: ['time', 'Time', 'hora'],
  },
  GYMAWARE: {
    exercise: ['Exercise', 'exercise', 'Exercise Name', 'ExerciseName'],
    setNumber: ['Set', 'set', 'Set #', 'SetNum'],
    repNumber: ['Rep', 'rep', 'Rep #', 'RepNum'],
    load: ['Weight', 'weight', 'Load', 'load', 'Weight (kg)'],
    meanVelocity: ['Mean Velocity (m/s)', 'Mean Velocity', 'MeanVelocity', 'Avg Vel'],
    peakVelocity: ['Peak Velocity (m/s)', 'Peak Velocity', 'PeakVelocity', 'Max Vel'],
    meanPower: ['Mean Power (W)', 'Mean Power', 'MeanPower', 'Avg Power'],
    peakPower: ['Peak Power (W)', 'Peak Power', 'PeakPower', 'Max Power'],
    rom: ['ROM (cm)', 'ROM', 'Range', 'Displacement'],
    concentricTime: ['Con Time (s)', 'Concentric Time', 'Con Duration'],
    eccentricTime: ['Ecc Time (s)', 'Eccentric Time', 'Ecc Duration'],
    timeToPeakVel: ['Time to Peak (s)', 'Time to Peak Velocity', 'TPV'],
    date: ['Date', 'Session Date'],
    time: ['Time', 'Session Time'],
  },
  PUSH: {
    exercise: ['Exercise', 'Movement', 'exercise'],
    setNumber: ['Set', 'set'],
    repNumber: ['Rep', 'rep', 'Repetition'],
    load: ['Load', 'Weight', 'load (kg)'],
    meanVelocity: ['Avg Velocity', 'Mean Velocity', 'Average Velocity (m/s)'],
    peakVelocity: ['Peak Velocity', 'Max Velocity', 'Peak Velocity (m/s)'],
    meanPower: ['Avg Power', 'Mean Power', 'Average Power (W)'],
    peakPower: ['Peak Power', 'Max Power', 'Peak Power (W)'],
    rom: ['ROM', 'Range of Motion'],
    concentricTime: ['Concentric Duration', 'Con Time'],
    eccentricTime: ['Eccentric Duration', 'Ecc Time'],
    timeToPeakVel: ['Time to Peak'],
    date: ['Date', 'Workout Date'],
    time: ['Time', 'Workout Time'],
  },
  PERCH: {
    exercise: ['Exercise', 'exercise', 'Movement'],
    setNumber: ['Set', 'set'],
    repNumber: ['Rep', 'rep'],
    load: ['Weight', 'Load', 'Weight (kg)'],
    meanVelocity: ['Mean Velocity', 'Avg Velocity'],
    peakVelocity: ['Peak Velocity', 'Max Velocity'],
    meanPower: ['Mean Power', 'Avg Power'],
    peakPower: ['Peak Power', 'Max Power'],
    rom: ['ROM', 'Displacement'],
    concentricTime: ['Concentric Time', 'Con Time'],
    eccentricTime: ['Eccentric Time', 'Ecc Time'],
    timeToPeakVel: ['Time to Peak'],
    date: ['Date'],
    time: ['Time'],
  },
  TENDO: {
    exercise: ['Exercise', 'exercise'],
    setNumber: ['Set', 'Serie'],
    repNumber: ['Rep', 'Repetition'],
    load: ['Load', 'Weight', 'Kg'],
    meanVelocity: ['Mean Velocity', 'V mean', 'Vmean'],
    peakVelocity: ['Peak Velocity', 'V peak', 'Vpeak', 'V max'],
    meanPower: ['Mean Power', 'P mean', 'Pmean'],
    peakPower: ['Peak Power', 'P peak', 'Ppeak', 'P max'],
    rom: ['ROM', 'Displacement', 'Distance'],
    concentricTime: ['Con Time', 'T con'],
    eccentricTime: ['Ecc Time', 'T ecc'],
    timeToPeakVel: ['Time to Peak', 'TPV'],
    date: ['Date'],
    time: ['Time'],
  },
  GENERIC: {
    exercise: ['Exercise', 'exercise', 'Movement', 'movement', 'Lift', 'lift'],
    setNumber: ['Set', 'set', 'Set Number', 'SetNumber', 'Serie'],
    repNumber: ['Rep', 'rep', 'Rep Number', 'RepNumber', 'Repetition'],
    load: ['Load', 'load', 'Weight', 'weight', 'Kg', 'kg'],
    meanVelocity: ['Mean Velocity', 'MeanVelocity', 'mean_velocity', 'Avg Velocity', 'V mean'],
    peakVelocity: ['Peak Velocity', 'PeakVelocity', 'peak_velocity', 'Max Velocity', 'V peak'],
    meanPower: ['Mean Power', 'MeanPower', 'mean_power', 'Avg Power', 'P mean'],
    peakPower: ['Peak Power', 'PeakPower', 'peak_power', 'Max Power', 'P peak'],
    rom: ['ROM', 'rom', 'Range of Motion', 'Displacement', 'Distance'],
    concentricTime: ['Concentric Time', 'ConcentricTime', 'concentric_time', 'Con Time'],
    eccentricTime: ['Eccentric Time', 'EccentricTime', 'eccentric_time', 'Ecc Time'],
    timeToPeakVel: ['Time to Peak', 'TimeToPeak', 'time_to_peak', 'TPV'],
    date: ['Date', 'date', 'Session Date'],
    time: ['Time', 'time', 'Session Time'],
  },
};

// ============================================
// Parsed Data Types
// ============================================

/**
 * Raw row from CSV after initial parsing
 */
export interface VBTRawRow {
  [key: string]: string | number | undefined;
}

/**
 * Normalized measurement data after parsing
 */
export interface VBTParsedMeasurement {
  exerciseName: string;
  setNumber: number;
  repNumber: number;
  load?: number;
  meanVelocity?: number;
  peakVelocity?: number;
  meanPower?: number;
  peakPower?: number;
  rom?: number;
  concentricTime?: number;
  eccentricTime?: number;
  timeToPeakVel?: number;
  rawMetrics?: Record<string, unknown>;
}

/**
 * Parsed session data
 */
export interface VBTParsedSession {
  deviceType: VBTDeviceType;
  deviceName?: string;
  sessionDate: Date;
  measurements: VBTParsedMeasurement[];
  parseErrors: string[];
  fileName?: string;
}

// ============================================
// Velocity Zones
// ============================================

/**
 * Velocity zone thresholds (m/s)
 * Based on Jovanovic & Flanagan research
 */
export const VELOCITY_ZONES = {
  STRENGTH: { min: 0, max: 0.5, label: 'Strength', color: '#ef4444' },
  STRENGTH_SPEED: { min: 0.5, max: 0.75, label: 'Strength-Speed', color: '#f97316' },
  POWER: { min: 0.75, max: 1.0, label: 'Power', color: '#eab308' },
  SPEED_STRENGTH: { min: 1.0, max: 1.3, label: 'Speed-Strength', color: '#22c55e' },
  SPEED: { min: 1.3, max: Infinity, label: 'Speed', color: '#3b82f6' },
} as const;

export type VelocityZone = keyof typeof VELOCITY_ZONES;

/**
 * Get velocity zone for a given mean velocity
 */
export function getVelocityZone(meanVelocity: number): VelocityZone {
  if (meanVelocity < 0.5) return 'STRENGTH';
  if (meanVelocity < 0.75) return 'STRENGTH_SPEED';
  if (meanVelocity < 1.0) return 'POWER';
  if (meanVelocity < 1.3) return 'SPEED_STRENGTH';
  return 'SPEED';
}

// ============================================
// Rep Quality
// ============================================

/**
 * Rep quality based on velocity loss and form
 */
export type RepQuality = 'GOOD' | 'FATIGUE' | 'COMPENSATING' | 'FAILED';

/**
 * Determine rep quality based on velocity loss
 * Based on research by Sanchez-Medina & Gonzalez-Badillo
 */
export function getRepQuality(velocityLossPercent: number): RepQuality {
  if (velocityLossPercent < 10) return 'GOOD';
  if (velocityLossPercent < 20) return 'FATIGUE';
  if (velocityLossPercent < 40) return 'COMPENSATING';
  return 'FAILED';
}

// ============================================
// Load-Velocity Profile
// ============================================

/**
 * Data point for load-velocity profile
 */
export interface LoadVelocityDataPoint {
  load: number;
  velocity: number;
}

/**
 * Load-velocity profile calculation result
 */
export interface LoadVelocityProfileResult {
  dataPoints: LoadVelocityDataPoint[];
  slope: number;
  intercept: number;
  rSquared: number;
  e1RM_0_3: number;
  e1RM_0_2: number;
  e1RM_0_15: number;
  mvt: number;
  isValid: boolean;
}

/**
 * Minimum Velocity Thresholds by exercise type
 * Based on Conceicao et al. (2016) and Garcia-Ramos et al. (2018)
 */
export const EXERCISE_MVT: Record<string, number> = {
  // Squat variants
  'Back Squat': 0.30,
  'Front Squat': 0.30,
  'Box Squat': 0.30,
  'Goblet Squat': 0.35,

  // Deadlift variants
  'Deadlift': 0.15,
  'Romanian Deadlift': 0.20,
  'Trap Bar Deadlift': 0.20,
  'Sumo Deadlift': 0.15,

  // Bench press variants
  'Bench Press': 0.15,
  'Incline Bench Press': 0.15,
  'Close Grip Bench Press': 0.15,
  'Dumbbell Bench Press': 0.20,

  // Overhead press
  'Overhead Press': 0.20,
  'Push Press': 0.35,
  'Military Press': 0.20,

  // Olympic lifts
  'Clean': 0.60,
  'Power Clean': 0.70,
  'Snatch': 0.80,
  'Clean and Jerk': 0.60,
  'Hang Clean': 0.65,

  // Other
  'Hip Thrust': 0.25,
  'Barbell Row': 0.25,
  'Pendlay Row': 0.25,

  // Default for unknown exercises
  DEFAULT: 0.25,
};

/**
 * Get MVT for an exercise
 */
export function getExerciseMVT(exerciseName: string): number {
  // Try exact match
  if (EXERCISE_MVT[exerciseName]) {
    return EXERCISE_MVT[exerciseName];
  }

  // Try partial match
  const lowerName = exerciseName.toLowerCase();
  for (const [name, mvt] of Object.entries(EXERCISE_MVT)) {
    if (lowerName.includes(name.toLowerCase()) || name.toLowerCase().includes(lowerName)) {
      return mvt;
    }
  }

  return EXERCISE_MVT.DEFAULT;
}

// ============================================
// API Types
// ============================================

/**
 * VBT session upload request
 */
export interface VBTUploadRequest {
  clientId: string;
  deviceType?: VBTDeviceType;
  sessionDate?: string; // ISO date string
  notes?: string;
  bodyWeight?: number;
  sessionRPE?: number;
}

/**
 * VBT session upload response
 */
export interface VBTUploadResponse {
  success: boolean;
  sessionId?: string;
  totalReps: number;
  exerciseCount: number;
  errors?: string[];
  warnings?: string[];
}

/**
 * VBT session summary for display
 */
export interface VBTSessionSummary {
  id: string;
  sessionDate: Date;
  deviceType: VBTDeviceType;
  totalSets: number;
  totalReps: number;
  exerciseCount: number;
  exercises: {
    name: string;
    sets: number;
    reps: number;
    avgMeanVelocity?: number;
    avgLoad?: number;
  }[];
}

/**
 * VBT measurement with velocity loss calculations
 */
export interface VBTMeasurementWithLoss {
  id: string;
  exerciseName: string;
  setNumber: number;
  repNumber: number;
  load?: number;
  meanVelocity?: number;
  peakVelocity?: number;
  meanPower?: number;
  peakPower?: number;
  velocityLoss?: number;
  velocityZone?: VelocityZone;
  repQuality?: RepQuality;
}
