/**
 * Quality Programming Type Definitions
 */

export type StrengthPhase = 'ANATOMICAL_ADAPTATION' | 'MAXIMUM_STRENGTH' | 'POWER' | 'MAINTENANCE';

export type PlyometricIntensity = 'LOW' | 'MODERATE' | 'HIGH';

export type ExerciseTier = 'TIER1_BILATERAL' | 'TIER2_UNILATERAL' | 'TIER3_PLYOMETRIC' | 'INJURY_PREVENTION';

export interface StrengthExercise {
  name: string;
  tier: ExerciseTier;
  primaryMuscles: string[];
  runningTransfer: string;

  // Prescription
  sets: number;
  reps: string;              // "3-5", "8-12", "30 seconds"
  load: string;              // "85% 1RM", "Bodyweight", "20-30% BW"
  rest: number;              // seconds
  frequency: string;         // "2x weekly", "3x weekly"

  // Progression
  progressionMethod: 'LOAD' | 'REPS' | 'SETS' | 'TEMPO';
  progressionCriteria: string;
  regressionProtocol: string;

  // Safety
  contraindications: string[];
  formCues: string[];
  commonMistakes: string[];
}

export interface PlyometricExercise {
  name: string;
  intensity: PlyometricIntensity;
  groundContactTime: string; // "<150ms", "150-250ms", ">250ms"

  // Prescription
  sets: number;
  reps: number;
  contacts: number;          // Total ground contacts
  rest: number;              // seconds between sets

  // Progression
  prerequisite: string;
  progression: string;
  maxVolume: number;         // Maximum contacts per session

  // Safety
  experienceRequired: string; // "Beginner", "6+ months", etc.
  injuryRisk: 'LOW' | 'MODERATE' | 'HIGH';
}

export interface RunningDrill {
  name: string;
  category: 'TECHNICAL' | 'SPEED' | 'POWER';
  focus: string[];           // ["knee lift", "hamstring engagement"]

  // Prescription
  sets: number;
  distance: number;          // meters
  intensity: string;         // "50%", "Progressive", "95% max speed"
  rest: string;              // "Walk back", "30 seconds"

  // Progression
  beginner: DrillProgression;
  intermediate: DrillProgression;
  advanced: DrillProgression;

  // Integration
  timing: string[];          // When to perform relative to other training
  frequency: string;
}

export interface DrillProgression {
  weeks: string;             // "1-4", "5-12", "13+"
  volume: string;            // "2 sets × 30m", "3 sets × 50m"
  frequency: string;         // "1x weekly", "2x weekly"
  focus: string;             // "Learn mechanics", "Coordination", "Power"
}

export interface QualitySession {
  date: Date;
  type: 'STRENGTH' | 'PLYOMETRIC' | 'COMBINED' | 'DRILLS_ONLY';
  phase: StrengthPhase;

  // Exercises performed
  strengthExercises: PerformedExercise[];
  plyometricExercises: PerformedPlyometric[];
  drills: PerformedDrill[];

  // Session metrics
  duration: number;          // minutes
  totalSets: number;
  totalContacts: number;     // Plyometric contacts
  rpe: number;               // 1-10 session RPE

  // Integration
  runningWorkoutSameDay: boolean;
  timingRelativeToRun: string; // "6 hours after", "separate day"

  // Outcomes
  completionRate: number;    // % of planned exercises completed
  qualityRating: string;     // "EXCELLENT", "GOOD", "MODERATE", "POOR"
  adaptationIndicators: string[]; // Strength gains, power improvements
}

export interface PerformedExercise {
  exercise: string;
  setsCompleted: number;
  repsCompleted: number[];   // Reps per set
  loadUsed: string;          // Actual weight/resistance
  rpe: number[];             // RPE per set
  formQuality: string;       // "EXCELLENT", "GOOD", "POOR"
  notes?: string;
}

export interface PerformedPlyometric {
  exercise: string;
  setsCompleted: number;
  repsCompleted: number[];
  contactsPerSet: number[];
  restTaken: number[];       // Actual rest between sets
  qualityRating: string;
  notes?: string;
}

export interface PerformedDrill {
  drill: string;
  setsCompleted: number;
  distance: number;
  qualityFocus: string[];
  technicalRating: string;   // "MASTERED", "GOOD", "NEEDS_WORK"
  notes?: string;
}
