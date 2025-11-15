/**
 * Cross-Training Integration Type Definitions
 */

export type CrossTrainingModality =
  | 'DEEP_WATER_RUNNING'
  | 'CYCLING'
  | 'ELLIPTICAL'
  | 'SWIMMING'
  | 'ALTERG'
  | 'ROWING';

export interface ModalityEquivalency {
  modality: CrossTrainingModality;
  fitnessRetention: number;        // % of running fitness maintained
  tssMultiplier: number;           // TSS conversion factor
  distanceRatio?: number;          // Distance conversion (3km cycling = 1km running)
  hrAdjustment: number;            // bpm adjustment from running zones
  timeMultiplier: number;          // Time conversion factor
  biomechanicalSimilarity: number; // % similarity to running mechanics
}

export interface WorkoutConversion {
  originalWorkout: RunningWorkout;
  convertedWorkout: CrossTrainingWorkout;
  conversionRatio: number;         // Confidence in equivalency
  fitnessRetention: number;        // Expected fitness maintenance
  notes: string[];
}

export interface CrossTrainingWorkout {
  modality: CrossTrainingModality;
  duration: number;                // minutes
  distance?: number;               // km (if applicable)
  intensity: string;               // Zone or description
  structure: CrossTrainingStructure;
  targetHR?: number;               // Adjusted for modality
  targetPower?: number;            // Watts (cycling)
  estimatedTSS: number;
  equipmentSettings?: EquipmentSettings;
}

export interface CrossTrainingStructure {
  warmup: {
    duration: number;
    intensity: string;
  };
  mainSet: CrossTrainingInterval[];
  cooldown: {
    duration: number;
    intensity: string;
  };
  modalitySpecific?: any;          // Stroke rate, cadence, etc.
  monitoring?: {
    painCheck: string;
    stopCriteria: string;
    adaptations: string;
  };
}

export interface CrossTrainingInterval {
  duration: number;                // minutes
  intensity: string;
  recovery: number;                // minutes
  repetitions: number;
  modalityNotes?: string;          // Specific guidance
}

export interface EquipmentSettings {
  bodyWeightSupport?: number;      // % for AlterG
  resistance?: string;             // Elliptical/bike resistance
  incline?: number;                // Treadmill/bike incline
  strokeRate?: number;             // Swimming strokes/min
  cadence?: number;                // Cycling RPM
}

export interface FitnessRetentionPrediction {
  modality: CrossTrainingModality;
  duration: number;                // weeks of cross-training
  expectedRetention: {
    vo2max: number;                // % retained
    lactateThreshold: number;      // % retained
    runningEconomy: number;        // % retained
    overall: number;               // % overall fitness retained
  };
  returnToRunningTimeline: string;
  recommendations: string[];
}

export interface AlterGProgression {
  phase: 'INITIAL' | 'BUILDING' | 'ADVANCED' | 'RETURN_PREP';
  bodyWeightSupport: number;       // % support (100% = no support)
  duration: number;                // minutes
  intensity: string;
  progressionCriteria: string;
  nextPhase: string;
}

export interface RunningWorkout {
  type: string;
  duration: number;
  distance?: number;
  intensity: string;
  structure: any;
  targetHR?: number;
  tss: number;
}
