/**
 * Injury Management Type Definitions
 *
 * Complete type system for injury assessment, rehabilitation,
 * and return-to-sport protocols.
 */

export type InjuryType =
  | 'PLANTAR_FASCIITIS'
  | 'ACHILLES_TENDINOPATHY'
  | 'IT_BAND_SYNDROME'
  | 'PATELLOFEMORAL_PAIN'
  | 'MEDIAL_TIBIAL_STRESS'
  | 'STRESS_FRACTURE'
  | 'HIP_FLEXOR_STRAIN'
  | 'HAMSTRING_STRAIN'
  | 'OTHER';

export type PainTiming =
  | 'DURING_WARMUP'
  | 'DURING_WORKOUT'
  | 'POST_WORKOUT'
  | 'MORNING_STIFFNESS'
  | 'CONSTANT'
  | 'NIGHT_PAIN';

export type InjuryPhase = 'ACUTE' | 'SUBACUTE' | 'CHRONIC' | 'RECOVERY';

export type ReturnPhase = 'WALKING' | 'WALK_RUN' | 'CONTINUOUS' | 'VOLUME_BUILD' | 'INTENSITY_RETURN';

export interface PainAssessment {
  painLevel: number;              // 0-10 scale
  location: InjuryType;
  timing: PainTiming;
  gaitAffected: boolean;
  swelling: boolean;
  rangeOfMotion: 'NORMAL' | 'LIMITED' | 'SEVERELY_LIMITED';
  functionalImpact: 'NONE' | 'MILD' | 'MODERATE' | 'SEVERE';
}

export interface SorenessRules {
  painDuringWarmup: boolean;
  painContinuesThroughout: boolean;
  painDisappearsAfterWarmup: boolean;
  painRedevelopsLater: boolean;
  painPersists1HourPost: boolean;
  painAltersGait: boolean;
}

export interface ACWRAssessment {
  acwr: number;
  acuteLoad: number;              // 7-day average TSS
  chronicLoad: number;            // 28-day average TSS
  zone: 'DETRAINING' | 'OPTIMAL' | 'CAUTION' | 'DANGER' | 'CRITICAL';
  injuryRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  riskMultiplier: number;         // Relative to baseline risk
}

export interface InjuryDecision {
  decision: 'CONTINUE' | 'MODIFY' | 'REST_1_DAY' | 'REST_2_3_DAYS' | 'MEDICAL_EVALUATION' | 'STOP_IMMEDIATELY';
  severity: 'GREEN' | 'YELLOW' | 'RED' | 'CRITICAL';
  reasoning: string;
  modifications?: TrainingModification[];
  estimatedTimeOff: string;
  followUpRequired: boolean;
  medicalEvaluation: boolean;
}

export interface TrainingModification {
  type: 'VOLUME_REDUCTION' | 'INTENSITY_REDUCTION' | 'CROSS_TRAINING_SUBSTITUTION' | 'COMPLETE_REST';
  percentage?: number;        // % reduction
  duration: string;          // "3_DAYS", "1_WEEK", "2_WEEKS", etc.
  alternatives?: string[];   // Cross-training options
}

export interface ReturnToRunningPhase {
  phase: ReturnPhase;
  duration: string;          // "3-7 days", "7-10 days", etc.
  criteria: string[];        // Advancement criteria
  prescription: string[];    // Daily activities
  advancementTest: string;   // Objective test to advance
}

export interface RehabProtocol {
  injuryType: InjuryType;
  phases: RehabPhase[];
  totalDuration: string;
  successRate: number;       // % based on research
  contraindications: string[];
}

export interface RehabPhase {
  name: string;
  duration: string;
  goals: string[];
  exercises: RehabExercise[];
  criteria: string[];        // Advancement criteria
}

export interface RehabExercise {
  name: string;
  sets: number;
  reps: string;              // "10-15", "30 seconds", etc.
  load: string;              // "Bodyweight", "10-20% BW", etc.
  frequency: string;         // "Daily", "3x weekly", etc.
  progression: string;       // How to advance
  painThreshold: number;     // Maximum acceptable pain 0-10
}

export interface FunctionalTest {
  name: string;
  description: string;
  passingCriteria: string;
  significance: string;      // Why this test matters
  instructions: string[];
}

export interface RedFlag {
  flag: string;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE';
  action: string;
  timeframe: string;         // "IMMEDIATE", "24_HOURS", "48_HOURS"
  medicalRequired: boolean;
}
