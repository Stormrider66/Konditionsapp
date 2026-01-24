/**
 * Injury Management Integration
 *
 * Coordinates multi-system response to injury detection:
 * 1. Immediate workout modification/cancellation
 * 2. Program adjustment (pause/modify)
 * 3. Cross-training substitution
 * 4. Return-to-running protocol generation
 * 5. Coach notification
 *
 * Implements University of Delaware pain rules:
 * - Pain > 5/10: Complete rest
 * - Pain 3-5/10: Cross-training only
 * - Pain < 3/10: Reduce volume/intensity
 */

import { PrismaClient } from '@prisma/client';
import { createRestrictionFromInjury } from '@/lib/training-restrictions';

export interface InjuryDetection {
  athleteId: string;
  injuryType:
    | 'PLANTAR_FASCIITIS'
    | 'ACHILLES_TENDINOPATHY'
    | 'IT_BAND_SYNDROME'
    | 'PATELLOFEMORAL_SYNDROME'
    | 'SHIN_SPLINTS'
    | 'STRESS_FRACTURE'
    | 'HAMSTRING_STRAIN'
    | 'CALF_STRAIN'
    | 'HIP_FLEXOR';
  painLevel: number; // 0-10
  painTiming: 'BEFORE' | 'DURING' | 'AFTER' | 'CONSTANT';
  acwrRisk?: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  detectionSource: 'DAILY_CHECKIN' | 'WORKOUT_LOG' | 'COACH_ASSESSMENT';
  date: Date;
}

export interface InjuryResponse {
  immediateAction: 'REST' | 'CROSS_TRAINING_ONLY' | 'REDUCE_50' | 'MONITOR';
  workoutModifications: WorkoutModification[];
  crossTrainingSubstitutions: CrossTrainingSubstitution[];
  returnToRunningProtocol?: ReturnToRunningProtocol;
  programAdjustment: ProgramAdjustment;
  coachNotification: CoachNotification;
  estimatedReturnWeeks: number;
}

export interface WorkoutModification {
  workoutId: string;
  date: Date;
  originalType: string;
  action: 'CANCEL' | 'REDUCE_INTENSITY' | 'REDUCE_VOLUME' | 'CONVERT_TO_CROSS_TRAINING';
  reasoning: string;
  modifiedWorkout?: {
    type: string;
    duration: number;
    intensity: string;
    notes: string;
  };
}

export interface CrossTrainingSubstitution {
  originalRunningVolume: number; // km/week
  recommendedModality: 'DWR' | 'CYCLING' | 'ELLIPTICAL' | 'SWIMMING' | 'ALTERG' | 'ROWING';
  equivalentDuration: number; // minutes
  intensity: string;
  fitnessRetention: number; // percentage
  injurySpecificNotes: string;
}

export interface ReturnToRunningProtocol {
  phase: 1 | 2 | 3 | 4 | 5;
  phaseName: string;
  weeks: number;
  runWalkRatio: string;
  frequency: number; // sessions per week
  duration: number; // minutes per session
  intensity: string;
  painThreshold: string;
  progressionCriteria: string[];
  crossTrainingAllowed: boolean;
}

export interface ProgramAdjustment {
  action: 'PAUSE' | 'MODIFY' | 'MAINTAIN';
  pauseWeeks?: number;
  volumeReduction?: number; // percentage
  intensityReduction?: number; // percentage
  goalDateAdjustment?: number; // days to push back
  reasoning: string;
}

export interface CoachNotification {
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  message: string;
  actionRequired: boolean;
  suggestedActions: string[];
  athleteName: string;
  injuryType: string;
  painLevel: number;
}

/**
 * Process injury detection and coordinate multi-system response
 */
export async function processInjuryDetection(
  injury: InjuryDetection,
  prisma: PrismaClient,
  options?: {
    persistRecord?: boolean
    createRestriction?: boolean
    createdByUserId?: string
  }
): Promise<InjuryResponse> {

  const shouldPersistRecord = options?.persistRecord !== false;
  const shouldCreateRestriction = options?.createRestriction !== false;

  // Step 1: Apply University of Delaware pain rules
  const immediateAction = determineImmediateAction(injury.painLevel, injury.painTiming);

  // Step 2: Get athlete's upcoming workouts
  const upcomingWorkouts = await getUpcomingWorkouts(injury.athleteId, prisma);

  // Step 3: Modify/cancel workouts based on pain level
  const workoutModifications = generateWorkoutModifications(
    upcomingWorkouts,
    immediateAction,
    injury
  );

  // Step 4: Generate cross-training substitutions
  const crossTrainingSubstitutions = generateCrossTrainingSubstitutions(
    injury,
    upcomingWorkouts
  );

  // Step 5: Create return-to-running protocol if needed
  let returnToRunningProtocol: ReturnToRunningProtocol | undefined;
  let estimatedReturnWeeks = 0;

  if (immediateAction === 'REST' || immediateAction === 'CROSS_TRAINING_ONLY') {
    returnToRunningProtocol = generateReturnToRunningProtocol(injury);
    estimatedReturnWeeks = calculateEstimatedReturn(injury);
  }

  // Step 6: Determine program adjustment
  const programAdjustment = determineProgramAdjustment(
    injury,
    immediateAction,
    estimatedReturnWeeks
  );

  // Step 7: Generate coach notification
  const coachNotification = await generateCoachNotification(
    injury,
    immediateAction,
    estimatedReturnWeeks,
    prisma
  );

  // Step 8: Persist injury record and modifications
  let injuryAssessmentId: string | null = null;
  if (shouldPersistRecord) {
    injuryAssessmentId = await persistInjuryRecord(injury, prisma);
  }
  await applyWorkoutModifications(workoutModifications, prisma);

  // Step 9: Create training restriction from injury (physio system integration)
  if (shouldCreateRestriction && injuryAssessmentId) {
    try {
      // Map immediate action to restriction parameters
      const volumeReduction = immediateAction === 'REST' ? 100
        : immediateAction === 'CROSS_TRAINING_ONLY' ? 100
        : immediateAction === 'REDUCE_50' ? 50
        : 20;

      const maxIntensityZone = immediateAction === 'REST' ? 1
        : immediateAction === 'CROSS_TRAINING_ONLY' ? 2
        : immediateAction === 'REDUCE_50' ? 3
        : 4;

      // Duration based on estimated return weeks
      const durationDays = estimatedReturnWeeks * 7;

      await createRestrictionFromInjury(
        injury.athleteId,
        injuryAssessmentId,
        options?.createdByUserId || 'SYSTEM',
        {
          volumeReduction,
          maxIntensityZone,
          durationDays,
          notes: `Auto-created from injury cascade: ${injury.injuryType} (pain ${injury.painLevel}/10). ${programAdjustment.reasoning}`,
        }
      );
    } catch (restrictionError) {
      // Log but don't fail the main flow if restriction creation fails
      console.error('Failed to create training restriction from injury:', restrictionError);
    }
  }

  return {
    immediateAction,
    workoutModifications,
    crossTrainingSubstitutions,
    returnToRunningProtocol,
    programAdjustment,
    coachNotification,
    estimatedReturnWeeks
  };
}

/**
 * Determine immediate action based on University of Delaware pain rules
 */
function determineImmediateAction(
  painLevel: number,
  painTiming: InjuryDetection['painTiming']
): InjuryResponse['immediateAction'] {

  // CRITICAL: Pain > 5 OR constant pain = complete rest
  if (painLevel > 5 || painTiming === 'CONSTANT') {
    return 'REST';
  }

  // HIGH: Pain 3-5 during/after running = cross-training only
  if (painLevel >= 3 && painLevel <= 5 && (painTiming === 'DURING' || painTiming === 'AFTER')) {
    return 'CROSS_TRAINING_ONLY';
  }

  // MEDIUM: Pain < 3 = reduce by 50% and monitor
  if (painLevel < 3) {
    return 'REDUCE_50';
  }

  return 'MONITOR';
}

/**
 * Get upcoming workouts for athlete (next 14 days)
 */
async function getUpcomingWorkouts(athleteId: string, prisma: PrismaClient) {
  const today = new Date();
  const twoWeeksFromNow = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

  return await prisma.trainingDay.findMany({
    where: {
      week: {
        program: {
          clientId: athleteId,
          isActive: true
        }
      },
      date: {
        gte: today,
        lte: twoWeeksFromNow
      }
    },
    include: {
      workouts: {
        include: {
          segments: true
        }
      }
    },
    orderBy: {
      date: 'asc'
    }
  });
}

/**
 * Generate workout modifications based on injury severity
 */
function generateWorkoutModifications(
  upcomingWorkouts: any[],
  action: InjuryResponse['immediateAction'],
  injury: InjuryDetection
): WorkoutModification[] {

  const modifications: WorkoutModification[] = [];

  for (const day of upcomingWorkouts) {
    for (const workout of day.workouts) {
      // Skip rest days and non-running workouts
      if (workout.type === 'REST' || workout.type === 'STRENGTH') {
        continue;
      }

      let modification: WorkoutModification;

      switch (action) {
        case 'REST':
          modification = {
            workoutId: workout.id,
            date: day.date,
            originalType: workout.type,
            action: 'CANCEL',
            reasoning: `Complete rest required (pain level ${injury.painLevel}/10)`,
          };
          break;

        case 'CROSS_TRAINING_ONLY':
          modification = {
            workoutId: workout.id,
            date: day.date,
            originalType: workout.type,
            action: 'CONVERT_TO_CROSS_TRAINING',
            reasoning: `Convert to cross-training (pain level ${injury.painLevel}/10, ${injury.injuryType})`,
            modifiedWorkout: {
              type: 'CROSS_TRAINING',
              duration: workout.totalDuration * 1.2, // 20% longer for equivalent stimulus
              intensity: workout.intensityType,
              notes: `Original: ${workout.type}. Converted due to ${injury.injuryType}.`
            }
          };
          break;

        case 'REDUCE_50':
          modification = {
            workoutId: workout.id,
            date: day.date,
            originalType: workout.type,
            action: 'REDUCE_VOLUME',
            reasoning: `50% volume reduction (pain level ${injury.painLevel}/10)`,
            modifiedWorkout: {
              type: workout.type,
              duration: workout.totalDuration * 0.5,
              intensity: 'EASY',
              notes: `Reduced to 50% volume, EASY intensity only. Monitor pain closely.`
            }
          };
          break;

        case 'MONITOR':
          modification = {
            workoutId: workout.id,
            date: day.date,
            originalType: workout.type,
            action: 'REDUCE_INTENSITY',
            reasoning: `Reduce intensity, monitor symptoms (pain level ${injury.painLevel}/10)`,
            modifiedWorkout: {
              type: workout.type,
              duration: workout.totalDuration,
              intensity: 'EASY',
              notes: `Keep EASY intensity. Stop if pain increases above 3/10.`
            }
          };
          break;
      }

      modifications.push(modification);
    }
  }

  return modifications;
}

/**
 * Generate cross-training substitutions based on injury type
 */
function generateCrossTrainingSubstitutions(
  injury: InjuryDetection,
  upcomingWorkouts: any[]
): CrossTrainingSubstitution[] {

  const substitutions: CrossTrainingSubstitution[] = [];

  // Calculate weekly running volume
  const totalRunningMinutes = upcomingWorkouts.reduce((sum, day) => {
    return sum + day.workouts.reduce((daySum: number, w: any) => {
      return w.type !== 'REST' && w.type !== 'STRENGTH' ? daySum + w.totalDuration : daySum;
    }, 0);
  }, 0);

  const weeklyVolume = totalRunningMinutes / 2; // 2 weeks of data

  // Injury-specific modality recommendations
  const modalityMap: Record<InjuryDetection['injuryType'], {
    primary: CrossTrainingSubstitution['recommendedModality'];
    fitnessRetention: number;
    notes: string;
  }> = {
    PLANTAR_FASCIITIS: {
      primary: 'DWR',
      fitnessRetention: 98,
      notes: 'Deep water running maintains fitness with zero impact. Avoid cycling (dorsiflexion stress).'
    },
    ACHILLES_TENDINOPATHY: {
      primary: 'DWR',
      fitnessRetention: 98,
      notes: 'DWR ideal. Swimming also good. Avoid AlterG/cycling (calf loading).'
    },
    IT_BAND_SYNDROME: {
      primary: 'SWIMMING',
      fitnessRetention: 45,
      notes: 'Swimming or DWR. Avoid cycling (knee flexion aggravates ITB).'
    },
    PATELLOFEMORAL_SYNDROME: {
      primary: 'DWR',
      fitnessRetention: 98,
      notes: 'DWR excellent. Avoid cycling and AlterG (knee loading).'
    },
    SHIN_SPLINTS: {
      primary: 'CYCLING',
      fitnessRetention: 75,
      notes: 'Cycling or DWR. AlterG at 50% once pain < 2/10.'
    },
    STRESS_FRACTURE: {
      primary: 'DWR',
      fitnessRetention: 98,
      notes: 'DWR or swimming ONLY. Minimum 6 weeks no impact. Medical clearance required.'
    },
    HAMSTRING_STRAIN: {
      primary: 'SWIMMING',
      fitnessRetention: 45,
      notes: 'Swimming ideal. Avoid cycling (hip flexion). AlterG once pain < 2/10.'
    },
    CALF_STRAIN: {
      primary: 'CYCLING',
      fitnessRetention: 75,
      notes: 'Cycling with low resistance. DWR once pain < 2/10.'
    },
    HIP_FLEXOR: {
      primary: 'SWIMMING',
      fitnessRetention: 45,
      notes: 'Swimming with pull buoy. Avoid cycling (hip flexion aggravates).'
    }
  };

  const recommendation = modalityMap[injury.injuryType];

  substitutions.push({
    originalRunningVolume: weeklyVolume,
    recommendedModality: recommendation.primary,
    equivalentDuration: calculateEquivalentDuration(weeklyVolume, recommendation.fitnessRetention),
    intensity: injury.painLevel > 5 ? 'EASY' : 'MODERATE',
    fitnessRetention: recommendation.fitnessRetention,
    injurySpecificNotes: recommendation.notes
  });

  return substitutions;
}

function calculateEquivalentDuration(runningMinutes: number, retention: number): number {
  // Higher retention = less duration needed
  // Formula: running_time * (100 / retention)
  return Math.round(runningMinutes * (100 / retention));
}

/**
 * Generate return-to-running protocol based on injury type
 */
function generateReturnToRunningProtocol(injury: InjuryDetection): ReturnToRunningProtocol {

  // Severity determines starting phase
  const startPhase: 1 | 2 | 3 | 4 | 5 = injury.painLevel > 7 ? 1 : injury.painLevel > 5 ? 2 : 3;

  const phases: ReturnToRunningProtocol[] = [
    {
      phase: 1,
      phaseName: 'Walking Only',
      weeks: 1,
      runWalkRatio: '0:1 (walk only)',
      frequency: 5,
      duration: 20,
      intensity: 'EASY (conversational)',
      painThreshold: 'STOP if pain > 2/10',
      progressionCriteria: [
        '7 consecutive days pain-free walking',
        'No morning stiffness',
        'Full range of motion',
        'Coach/physio clearance'
      ],
      crossTrainingAllowed: true
    },
    {
      phase: 2,
      phaseName: 'Walk/Run Introduction',
      weeks: 2,
      runWalkRatio: '1:4 (1 min run, 4 min walk)',
      frequency: 3,
      duration: 30,
      intensity: 'VERY EASY (conversational++)',
      painThreshold: 'STOP if pain > 1/10',
      progressionCriteria: [
        '6 sessions completed pain-free',
        'No pain 24 hours post-run',
        'HRV within 5% of baseline',
        'Sleep quality maintained'
      ],
      crossTrainingAllowed: true
    },
    {
      phase: 3,
      phaseName: 'Progressive Walk/Run',
      weeks: 2,
      runWalkRatio: '2:3 → 3:2 (gradual progression)',
      frequency: 4,
      duration: 35,
      intensity: 'EASY',
      painThreshold: 'STOP if pain > 2/10',
      progressionCriteria: [
        '8 sessions completed pain-free',
        'No ACWR spikes > 1.3',
        'Functional movement screen passed',
        'Strength exercises pain-free'
      ],
      crossTrainingAllowed: true
    },
    {
      phase: 4,
      phaseName: 'Continuous Running',
      weeks: 2,
      runWalkRatio: '1:0 (continuous running)',
      frequency: 4,
      duration: 40,
      intensity: 'EASY to MODERATE',
      painThreshold: 'Reduce if pain > 1/10',
      progressionCriteria: [
        '8 continuous runs completed',
        'Weekly volume 50% of pre-injury',
        'No injury symptoms for 2 weeks',
        'Ready for 10% weekly volume increases'
      ],
      crossTrainingAllowed: false
    },
    {
      phase: 5,
      phaseName: 'Return to Full Training',
      weeks: 4,
      runWalkRatio: '1:0',
      frequency: 5,
      duration: 60,
      intensity: 'EASY to THRESHOLD (progressive)',
      painThreshold: 'Monitor daily, stop if pain recurs',
      progressionCriteria: [
        'Weekly volume 80% of pre-injury',
        'Intensity progression reintroduced',
        'No injury symptoms for 4 weeks',
        'Race-ready clearance from coach'
      ],
      crossTrainingAllowed: false
    }
  ];

  return phases[startPhase - 1];
}

/**
 * Calculate estimated return to full training
 */
function calculateEstimatedReturn(injury: InjuryDetection): number {

  const baselineWeeks: Record<InjuryDetection['injuryType'], number> = {
    PLANTAR_FASCIITIS: 4,
    ACHILLES_TENDINOPATHY: 6,
    IT_BAND_SYNDROME: 3,
    PATELLOFEMORAL_SYNDROME: 4,
    SHIN_SPLINTS: 4,
    STRESS_FRACTURE: 12, // Minimum 6 weeks no impact + 6 weeks return
    HAMSTRING_STRAIN: 3,
    CALF_STRAIN: 3,
    HIP_FLEXOR: 3
  };

  let weeks = baselineWeeks[injury.injuryType];

  // Adjust based on pain severity
  if (injury.painLevel > 7) weeks += 2;
  else if (injury.painLevel > 5) weeks += 1;

  // Adjust based on ACWR risk
  if (injury.acwrRisk === 'CRITICAL') weeks += 2;
  else if (injury.acwrRisk === 'HIGH') weeks += 1;

  return weeks;
}

/**
 * Determine program adjustment strategy
 */
function determineProgramAdjustment(
  injury: InjuryDetection,
  action: InjuryResponse['immediateAction'],
  estimatedWeeks: number
): ProgramAdjustment {

  if (action === 'REST' || action === 'CROSS_TRAINING_ONLY') {
    return {
      action: 'PAUSE',
      pauseWeeks: estimatedWeeks,
      goalDateAdjustment: estimatedWeeks * 7,
      reasoning: `Complete program pause for ${estimatedWeeks} weeks due to ${injury.injuryType}. Goal date pushed back ${estimatedWeeks} weeks to allow full recovery.`
    };
  }

  if (action === 'REDUCE_50') {
    return {
      action: 'MODIFY',
      volumeReduction: 50,
      intensityReduction: 30,
      goalDateAdjustment: Math.ceil(estimatedWeeks * 3.5), // ~half the delay
      reasoning: `50% volume reduction, 30% intensity reduction for ${estimatedWeeks} weeks. Goal date pushed back ${Math.ceil(estimatedWeeks * 3.5)} days to maintain quality.`
    };
  }

  return {
    action: 'MAINTAIN',
    reasoning: `Continue program with reduced intensity. Monitor symptoms daily.`
  };
}

/**
 * Generate coach notification
 */
async function generateCoachNotification(
  injury: InjuryDetection,
  action: InjuryResponse['immediateAction'],
  weeks: number,
  prisma: PrismaClient
): Promise<CoachNotification> {

  // Get athlete name
  const client = await prisma.client.findUnique({
    where: { id: injury.athleteId },
    select: { name: true }
  });

  const urgency = injury.painLevel > 7 ? 'CRITICAL' : injury.painLevel > 5 ? 'HIGH' : 'MEDIUM';

  const actionMap = {
    REST: 'Complete rest prescribed',
    CROSS_TRAINING_ONLY: 'Cross-training substitution initiated',
    REDUCE_50: '50% volume reduction applied',
    MONITOR: 'Monitoring with intensity reduction'
  };

  const suggestedActions: string[] = [];

  if (injury.painLevel > 5) {
    suggestedActions.push('Schedule video call with athlete within 24 hours');
    suggestedActions.push('Consider referral to sports medicine physician');
  }

  if (injury.injuryType === 'STRESS_FRACTURE') {
    suggestedActions.push('URGENT: Medical imaging required - refer to physician immediately');
  }

  suggestedActions.push('Review training load progression (ACWR)');
  suggestedActions.push('Assess biomechanics and running form');
  suggestedActions.push('Review footwear and training surface');

  return {
    urgency,
    title: `${injury.injuryType.replace(/_/g, ' ')} - ${client?.name || 'Athlete'}`,
    message: `Pain level ${injury.painLevel}/10 detected during ${injury.detectionSource}. ${actionMap[action]}. Estimated return: ${weeks} weeks.`,
    actionRequired: urgency === 'CRITICAL' || urgency === 'HIGH',
    suggestedActions,
    athleteName: client?.name || 'Unknown',
    injuryType: injury.injuryType,
    painLevel: injury.painLevel
  };
}

/**
 * Persist injury record to database
 * Returns the created injury assessment ID for linking to restrictions
 */
async function persistInjuryRecord(injury: InjuryDetection, prisma: PrismaClient): Promise<string> {
  // Derive assessment based on pain level
  let assessment = 'CONTINUE';
  if (injury.painLevel > 5) {
    assessment = 'REST';
  } else if (injury.painLevel >= 3) {
    assessment = 'CROSS_TRAIN';
  } else if (injury.painLevel > 0) {
    assessment = 'MODIFY';
  }

  const injuryAssessment = await prisma.injuryAssessment.create({
    data: {
      clientId: injury.athleteId,
      injuryType: injury.injuryType,
      painLevel: injury.painLevel,
      painTiming: injury.painTiming,
      detectedAt: injury.date,
      status: 'ACTIVE',
      assessment
    }
  });

  return injuryAssessment.id;
}

/**
 * Apply workout modifications to database
 */
async function applyWorkoutModifications(
  modifications: WorkoutModification[],
  prisma: PrismaClient
) {
  for (const mod of modifications) {
    if (mod.action === 'CANCEL') {
      await prisma.workout.update({
        where: { id: mod.workoutId },
        data: {
          status: 'CANCELLED',
          coachNotes: mod.reasoning
        }
      });
    } else if (mod.modifiedWorkout) {
      await prisma.workout.update({
        where: { id: mod.workoutId },
        data: {
          type: mod.modifiedWorkout.type as any,
          duration: mod.modifiedWorkout.duration,
          intensity: mod.modifiedWorkout.intensity as any,
          coachNotes: mod.modifiedWorkout.notes,
          status: 'MODIFIED'
        }
      });
    }
  }
}
