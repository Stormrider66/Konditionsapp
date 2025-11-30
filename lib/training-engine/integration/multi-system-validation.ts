/**
 * Multi-System Validation Cascade
 *
 * Coordinates validation across all training engine systems to handle:
 * 1. Conflicting constraints (e.g., Norwegian Method eligibility + active injury)
 * 2. Priority ordering (which system takes precedence)
 * 3. Dependency chains (workout modifications depend on program state)
 * 4. State consistency (ensure all systems are synchronized)
 *
 * Priority Order (highest to lowest):
 * 1. INJURY - Safety first, all other systems subordinate
 * 2. READINESS - Daily readiness overrides planned workouts
 * 3. FIELD_TESTS - Test readiness affects test validity
 * 4. NORWEGIAN_METHOD - Prerequisites must be met before enabling
 * 5. PROGRAM_GENERATION - Base program created
 * 6. WORKOUT_MODIFICATION - Daily adjustments based on above
 */

import { PrismaClient } from '@prisma/client';
import { validateNorwegianMethodEligibility } from './norwegian-validation';
import { processInjuryDetection } from './injury-management';

export interface SystemState {
  athleteId: string;
  timestamp: Date;
  injury?: {
    active: boolean;
    type?: string;
    painLevel?: number;
    restrictedModalities: string[];
  };
  readiness?: {
    score: number; // 0-100
    decision: 'PROCEED' | 'REDUCE' | 'EASY' | 'REST';
    reasoning: string[];
  };
  norwegianMethod?: {
    enabled: boolean;
    eligible: boolean;
    currentPhase?: number;
    canProgress?: boolean;
  };
  lactateData?: {
    lastTestAge: number; // days
    testValid: boolean;
    zonesValid: boolean;
  };
  fieldTests?: {
    nextScheduled?: Date;
    canTest: boolean;
    blockingReasons: string[];
  };
  program?: {
    active: boolean;
    paused: boolean;
    methodology: string;
    weekNumber: number;
  };
}

export interface ValidationResult {
  valid: boolean;
  blockers: ValidationBlocker[];
  warnings: ValidationWarning[];
  systemState: SystemState;
  recommendations: string[];
}

export interface ValidationBlocker {
  system: 'INJURY' | 'READINESS' | 'NORWEGIAN' | 'LACTATE' | 'FIELD_TEST' | 'PROGRAM';
  severity: 'CRITICAL' | 'HIGH';
  message: string;
  blockedActions: string[];
  requiredResolution: string;
}

export interface ValidationWarning {
  system: 'INJURY' | 'READINESS' | 'NORWEGIAN' | 'LACTATE' | 'FIELD_TEST' | 'PROGRAM';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  recommendation: string;
}

/**
 * Validate entire system state for an athlete
 */
export async function validateSystemState(
  athleteId: string,
  prisma: PrismaClient
): Promise<ValidationResult> {

  const timestamp = new Date();
  const blockers: ValidationBlocker[] = [];
  const warnings: ValidationWarning[] = [];
  const recommendations: string[] = [];

  // Build comprehensive system state
  const systemState: SystemState = {
    athleteId,
    timestamp
  };

  // Step 1: Check for active injuries (HIGHEST PRIORITY)
  const injuryState = await checkInjuryState(athleteId, prisma);
  systemState.injury = injuryState;

  if (injuryState.active && injuryState.painLevel! > 5) {
    blockers.push({
      system: 'INJURY',
      severity: 'CRITICAL',
      message: `Active ${injuryState.type} injury with pain level ${injuryState.painLevel}/10`,
      blockedActions: ['RUNNING_WORKOUTS', 'FIELD_TESTS', 'NORWEGIAN_METHOD', 'PROGRAM_PROGRESSION'],
      requiredResolution: 'Complete injury rehabilitation protocol before resuming training'
    });
  } else if (injuryState.active && injuryState.painLevel! >= 3) {
    warnings.push({
      system: 'INJURY',
      severity: 'HIGH',
      message: `Active ${injuryState.type} injury with pain level ${injuryState.painLevel}/10`,
      recommendation: 'Restrict to cross-training only until pain < 3/10'
    });
  }

  // Step 2: Check daily readiness (SECOND PRIORITY)
  const readinessState = await checkReadinessState(athleteId, prisma);
  systemState.readiness = readinessState;

  if (readinessState && readinessState.decision === 'REST') {
    blockers.push({
      system: 'READINESS',
      severity: 'HIGH',
      message: `Readiness score: ${readinessState.score}/100 - REST day required`,
      blockedActions: ['THRESHOLD_WORKOUTS', 'INTERVAL_WORKOUTS', 'LONG_RUNS', 'FIELD_TESTS'],
      requiredResolution: 'Complete rest day, reassess tomorrow'
    });
  } else if (readinessState && readinessState.decision === 'REDUCE') {
    warnings.push({
      system: 'READINESS',
      severity: 'MEDIUM',
      message: `Readiness score: ${readinessState.score}/100 - Reduce training load`,
      recommendation: 'Convert planned workouts to EASY intensity, reduce volume by 30%'
    });
  }

  // Step 3: Check lactate data validity
  const lactateState = await checkLactateState(athleteId, prisma);
  systemState.lactateData = lactateState;

  if (!lactateState.testValid) {
    warnings.push({
      system: 'LACTATE',
      severity: 'MEDIUM',
      message: `Last lactate test: ${lactateState.lastTestAge} days ago (>${56} days threshold)`,
      recommendation: 'Schedule new lactate test to update training zones'
    });
  }

  if (!lactateState.zonesValid) {
    blockers.push({
      system: 'LACTATE',
      severity: 'HIGH',
      message: 'No valid training zones - cannot prescribe intensity-based workouts',
      blockedActions: ['THRESHOLD_WORKOUTS', 'NORWEGIAN_METHOD'],
      requiredResolution: 'Complete lactate test to establish training zones'
    });
  }

  // Step 4: Check Norwegian Method eligibility (if enabled)
  const norwegianState = await checkNorwegianState(athleteId, prisma);
  systemState.norwegianMethod = norwegianState;

  if (norwegianState.enabled && !norwegianState.eligible) {
    blockers.push({
      system: 'NORWEGIAN',
      severity: 'CRITICAL',
      message: 'Norwegian Method enabled but prerequisites not met',
      blockedActions: ['DOUBLE_THRESHOLD_SESSIONS'],
      requiredResolution: 'Complete Norwegian Method transition protocol or disable methodology'
    });
  }

  if (norwegianState.enabled && injuryState.active) {
    blockers.push({
      system: 'NORWEGIAN',
      severity: 'CRITICAL',
      message: 'Cannot continue Norwegian Method with active injury',
      blockedActions: ['DOUBLE_THRESHOLD_SESSIONS'],
      requiredResolution: 'Pause Norwegian Method until injury fully resolved'
    });
  }

  // Step 5: Check field test readiness
  const fieldTestState = await checkFieldTestReadiness(athleteId, systemState, prisma);
  systemState.fieldTests = fieldTestState;

  if (fieldTestState.nextScheduled && !fieldTestState.canTest) {
    warnings.push({
      system: 'FIELD_TEST',
      severity: 'MEDIUM',
      message: `Field test scheduled but athlete not ready: ${fieldTestState.blockingReasons.join(', ')}`,
      recommendation: 'Reschedule field test to later date when conditions are met'
    });
  }

  // Step 6: Check program state
  const programState = await checkProgramState(athleteId, prisma);
  systemState.program = programState;

  if (programState.active && programState.paused) {
    warnings.push({
      system: 'PROGRAM',
      severity: 'LOW',
      message: 'Training program is paused',
      recommendation: 'Resume program once injury/readiness issues are resolved'
    });
  }

  // Generate comprehensive recommendations
  recommendations.push(...generateRecommendations(systemState, blockers, warnings));

  return {
    valid: blockers.length === 0,
    blockers,
    warnings,
    systemState,
    recommendations
  };
}

/**
 * Check injury state
 */
async function checkInjuryState(athleteId: string, prisma: PrismaClient) {
  const activeInjury = await prisma.injuryAssessment.findFirst({
    where: {
      clientId: athleteId,
      status: 'ACTIVE'
    },
    orderBy: {
      detectedAt: 'desc'
    }
  });

  if (!activeInjury) {
    return {
      active: false,
      restrictedModalities: []
    };
  }

  // Determine restricted modalities based on injury type
  const restrictionMap: Record<string, string[]> = {
    PLANTAR_FASCIITIS: ['RUNNING', 'ALTERG'],
    ACHILLES_TENDINOPATHY: ['RUNNING', 'CYCLING', 'ALTERG'],
    IT_BAND_SYNDROME: ['RUNNING', 'CYCLING'],
    PATELLOFEMORAL_SYNDROME: ['RUNNING', 'CYCLING', 'ALTERG'],
    SHIN_SPLINTS: ['RUNNING'],
    STRESS_FRACTURE: ['RUNNING', 'ALTERG', 'ELLIPTICAL'],
    HAMSTRING_STRAIN: ['RUNNING', 'CYCLING'],
    CALF_STRAIN: ['RUNNING'],
    HIP_FLEXOR: ['RUNNING', 'CYCLING']
  };

  return {
    active: true,
    type: activeInjury.injuryType ?? undefined,
    painLevel: activeInjury.painLevel,
    restrictedModalities: restrictionMap[activeInjury.injuryType ?? ''] || ['RUNNING']
  };
}

/**
 * Check readiness state
 */
async function checkReadinessState(athleteId: string, prisma: PrismaClient) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkIn = await prisma.dailyCheckIn.findFirst({
    where: {
      clientId: athleteId,
      date: {
        gte: today
      }
    }
  });

  if (!checkIn || !checkIn.readinessScore) {
    return undefined;
  }

  // Determine decision based on readiness score
  let decision: 'PROCEED' | 'REDUCE' | 'EASY' | 'REST';
  const reasoning: string[] = [];

  if (checkIn.readinessScore < 40) {
    decision = 'REST';
    reasoning.push('Readiness critically low (<40)');
  } else if (checkIn.readinessScore < 60) {
    decision = 'EASY';
    reasoning.push('Readiness low (40-60), easy training only');
  } else if (checkIn.readinessScore < 75) {
    decision = 'REDUCE';
    reasoning.push('Readiness moderate (60-75), reduce intensity');
  } else {
    decision = 'PROCEED';
    reasoning.push('Readiness good (≥75), proceed as planned');
  }

  // Add specific flags
  if (checkIn.sleepQuality && checkIn.sleepQuality < 3) {
    reasoning.push('Poor sleep quality');
  }
  if (checkIn.soreness && checkIn.soreness > 7) {
    reasoning.push('High muscle soreness');
  }

  return {
    score: checkIn.readinessScore,
    decision,
    reasoning
  };
}

/**
 * Check lactate data state
 */
async function checkLactateState(athleteId: string, prisma: PrismaClient) {
  const recentTest = await prisma.test.findFirst({
    where: {
      clientId: athleteId,
      testType: {
        in: ['RUNNING', 'CYCLING']
      }
    },
    orderBy: {
      testDate: 'desc'
    },
    include: {
      testStages: true
    }
  });

  if (!recentTest) {
    return {
      lastTestAge: 999,
      testValid: false,
      zonesValid: false
    };
  }

  const testAge = Math.floor((Date.now() - recentTest.testDate.getTime()) / (24 * 60 * 60 * 1000));
  const testValid = testAge <= 56; // 8 weeks

  // Check if we have valid zones (aerobic and anaerobic thresholds)
  const hasValidZones = !!recentTest.aerobicThreshold && !!recentTest.anaerobicThreshold;

  return {
    lastTestAge: testAge,
    testValid,
    zonesValid: hasValidZones
  };
}

/**
 * Check Norwegian Method state
 */
async function checkNorwegianState(athleteId: string, prisma: PrismaClient) {
  const profile = await prisma.athleteProfile.findUnique({
    where: { clientId: athleteId }
  });

  const activeProgram = await prisma.trainingProgramEngine.findFirst({
    where: {
      clientId: athleteId,
      status: 'ACTIVE'
    }
  });

  const norwegianEnabled = activeProgram?.methodology === 'NORWEGIAN';

  if (!norwegianEnabled) {
    return {
      enabled: false,
      eligible: false
    };
  }

  // Check eligibility
  const eligibility = await validateNorwegianMethodEligibility(athleteId, prisma);

  return {
    enabled: true,
    eligible: eligibility.eligible,
    currentPhase: profile?.norwegianPhase ?? undefined,
    canProgress: eligibility.eligible
  };
}

/**
 * Check field test readiness
 */
async function checkFieldTestReadiness(
  athleteId: string,
  systemState: SystemState,
  prisma: PrismaClient
) {
  const nextTest = await prisma.fieldTestSchedule.findFirst({
    where: {
      clientId: athleteId,
      completed: false,
      scheduledDate: {
        gte: new Date()
      }
    },
    orderBy: {
      scheduledDate: 'asc'
    }
  });

  if (!nextTest) {
    return {
      canTest: true,
      blockingReasons: []
    };
  }

  const blockingReasons: string[] = [];

  // Can't test if injured
  if (systemState.injury?.active && systemState.injury.painLevel! > 2) {
    blockingReasons.push(`Active injury (pain ${systemState.injury.painLevel}/10)`);
  }

  // Can't test if readiness too low
  if (systemState.readiness && systemState.readiness.score < 75) {
    blockingReasons.push(`Low readiness (${systemState.readiness.score}/100)`);
  }

  // Need 48-hour taper before test
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const recentHardWorkouts = await prisma.workoutLog.findMany({
    where: {
      workout: {
        day: {
          week: {
            program: {
              clientId: athleteId
            }
          }
        }
      },
      completedAt: {
        gte: twoDaysAgo
      },
      perceivedEffort: {
        gte: 8
      }
    }
  });

  if (recentHardWorkouts.length > 0) {
    blockingReasons.push('Hard workout within 48 hours (insufficient taper)');
  }

  return {
    nextScheduled: nextTest.scheduledDate,
    canTest: blockingReasons.length === 0,
    blockingReasons
  };
}

/**
 * Check program state
 */
async function checkProgramState(athleteId: string, prisma: PrismaClient) {
  const program = await prisma.trainingProgram.findFirst({
    where: {
      clientId: athleteId,
      isActive: true
    },
    include: {
      weeks: {
        where: {
          weekNumber: {
            lte: await getCurrentWeekNumber(athleteId, prisma)
          }
        },
        orderBy: {
          weekNumber: 'desc'
        },
        take: 1
      }
    }
  });

  if (!program) {
    return {
      active: false,
      paused: false,
      methodology: 'NONE',
      weekNumber: 0
    };
  }

  return {
    active: true,
    paused: !program.isActive,
    methodology: 'STANDARD',
    weekNumber: program.weeks[0]?.weekNumber || 0
  };
}

async function getCurrentWeekNumber(athleteId: string, prisma: PrismaClient): Promise<number> {
  const program = await prisma.trainingProgram.findFirst({
    where: {
      clientId: athleteId,
      isActive: true
    }
  });

  if (!program) return 0;

  const weeksSinceStart = Math.floor(
    (Date.now() - program.startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
  );

  return weeksSinceStart + 1;
}

/**
 * Generate comprehensive recommendations
 */
function generateRecommendations(
  systemState: SystemState,
  blockers: ValidationBlocker[],
  warnings: ValidationWarning[]
): string[] {

  const recommendations: string[] = [];

  // CRITICAL: If injury + Norwegian enabled
  if (systemState.injury?.active &&
      systemState.norwegianMethod?.enabled &&
      systemState.injury.painLevel! > 3) {
    recommendations.push('⚠️ CRITICAL: Pause Norwegian Method immediately until injury resolved');
    recommendations.push('Switch to cross-training-only protocol');
  }

  // HIGH: If low readiness but high training load
  if (systemState.readiness &&
      systemState.readiness.score < 60 &&
      systemState.norwegianMethod?.enabled) {
    recommendations.push('Consider rest day or easy recovery - Norwegian Method requires high readiness');
  }

  // MEDIUM: If lactate data stale
  if (systemState.lactateData && systemState.lactateData.lastTestAge > 56) {
    recommendations.push('Schedule lactate retest to ensure training zones are current');
  }

  // LOW: General wellness
  if (blockers.length === 0 && warnings.length === 0) {
    recommendations.push('✅ All systems green - proceed with planned training');
  }

  // Injury-specific
  if (systemState.injury?.active) {
    const allowedModalities = ['DWR', 'SWIMMING', 'CYCLING', 'ELLIPTICAL'].filter(
      m => !systemState.injury!.restrictedModalities.includes(m)
    );
    recommendations.push(`Allowed cross-training: ${allowedModalities.join(', ')}`);
  }

  return recommendations;
}

/**
 * Validate specific action against current system state
 */
export async function validateAction(
  athleteId: string,
  action: 'START_NORWEGIAN' | 'SCHEDULE_FIELD_TEST' | 'THRESHOLD_WORKOUT' | 'LONG_RUN' | 'PROGRAM_PROGRESSION',
  prisma: PrismaClient
): Promise<{
  allowed: boolean;
  blockers: string[];
  warnings: string[];
}> {

  const validation = await validateSystemState(athleteId, prisma);

  const blockers: string[] = [];
  const warnings: string[] = [];

  // Check if action is blocked by any system
  for (const blocker of validation.blockers) {
    if (blocker.blockedActions.includes(action) ||
        blocker.blockedActions.includes(action.split('_')[0] + '_WORKOUTS')) {
      blockers.push(`${blocker.system}: ${blocker.message}`);
    }
  }

  // Check for warnings
  if (action === 'THRESHOLD_WORKOUT' && validation.systemState.readiness?.decision === 'REDUCE') {
    warnings.push('Readiness suggests reducing intensity - consider converting to easy run');
  }

  if (action === 'START_NORWEGIAN' && !validation.systemState.lactateData?.zonesValid) {
    blockers.push('Norwegian Method requires valid lactate zones');
  }

  if (action === 'SCHEDULE_FIELD_TEST' && validation.systemState.fieldTests?.canTest === false) {
    blockers.push(`Field test blocked: ${validation.systemState.fieldTests.blockingReasons.join(', ')}`);
  }

  return {
    allowed: blockers.length === 0,
    blockers,
    warnings
  };
}
