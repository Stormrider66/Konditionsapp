/**
 * POST /api/injury/assess
 *
 * Assess injury and get return-to-running protocol recommendations
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { validateRequest, successResponse, handleApiError, requireAuth } from '@/lib/api/utils';
import { assessPainAndRecommend } from '@/lib/training-engine/injury-management/pain-assessment';
import { generateReturnProtocol } from '@/lib/training-engine/injury-management/return-protocols';

// Local helper function to assess ACWR risk from a single value
function checkACWRRisk(acwr: number): { zone: string; injuryRisk: string; recommendation: string } {
  if (acwr < 0.8) {
    return { zone: 'DETRAINING', injuryRisk: 'LOW', recommendation: 'Gradual load increase recommended (5-10% weekly)' };
  } else if (acwr <= 1.3) {
    return { zone: 'OPTIMAL', injuryRisk: 'LOW', recommendation: 'Continue current progression' };
  } else if (acwr <= 1.5) {
    return { zone: 'CAUTION', injuryRisk: 'MODERATE', recommendation: 'Maintain current load, do not increase' };
  } else if (acwr <= 2.0) {
    return { zone: 'DANGER', injuryRisk: 'HIGH', recommendation: 'Reduce load 20-30%' };
  } else {
    return { zone: 'CRITICAL', injuryRisk: 'VERY_HIGH', recommendation: 'Reduce load 40-50% or complete rest' };
  }
}
import { getRehabProtocol } from '@/lib/training-engine/injury-management/rehab-protocols';
import {
  processInjuryDetection,
  type InjuryDetection,
} from '@/lib/training-engine/integration/injury-management';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

const requestSchema = z.object({
  athleteId: z.string(),
  injuryType: z.enum([
    'PLANTAR_FASCIITIS',
    'ACHILLES_TENDINOPATHY',
    'IT_BAND_SYNDROME',
    'PATELLOFEMORAL_PAIN',
    'MEDIAL_TIBIAL_STRESS',
    'HAMSTRING_STRAIN',
    'HIP_FLEXOR_STRAIN',
    'STRESS_FRACTURE',
    'OTHER'
  ]),
  painLevel: z.number().min(0).max(10),
  painTiming: z.enum(['BEFORE', 'DURING', 'AFTER', 'CONSTANT']),
  symptomDuration: z.number().min(1).max(365), // days
  functionalLimitations: z.array(z.string()).optional(),
  previousTreatment: z.array(z.string()).optional(),
  currentACWR: z.number().optional()
});

type InjuryAssessmentRequest = z.infer<typeof requestSchema>;

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const validation = await validateRequest(request, requestSchema);
    if (!validation.success) return validation.response;

    const {
      athleteId,
      injuryType,
      painLevel,
      painTiming,
      symptomDuration,
      functionalLimitations,
      previousTreatment,
      currentACWR
    } = validation.data;

    const sorenessRules = buildSorenessFlags(painTiming)
    const painDecision = assessPainAndRecommend(
      {
        painLevel,
        location: injuryType,
        timing: mapPainTiming(painTiming),
        gaitAffected: false,
        swelling: false,
        rangeOfMotion: 'NORMAL',
        functionalImpact: deriveFunctionalImpact(painLevel),
      },
      sorenessRules
    );

    // Check ACWR risk if available
    let acwrRisk = null;
    if (currentACWR) {
      acwrRisk = checkACWRRisk(currentACWR);
    }

    // Get rehab protocol for specific injury
    const rehabProtocol = getRehabProtocol(injuryType);

    const severity = painDecision.severity;
    const severityLevel = painLevel > 7 ? 'SEVERE' : painLevel > 4 ? 'MODERATE' : 'MILD';
    const returnProtocol = generateReturnProtocol(injuryType, severityLevel, 40);

    const recommendedProtocol = {
      rehab: {
        injuryType: rehabProtocol.injuryType,
        phases: rehabProtocol.phases.map(phase => ({
          name: phase.name,
          duration: phase.duration,
          focus: phase.goals,
        })),
        totalDuration: rehabProtocol.totalDuration,
      },
      returnToRun: returnProtocol,
      modifications: painDecision.modifications ?? [],
    }

    const sorenessDetails = mapSorenessFlagsToModel(sorenessRules)

    const stored = await prisma.injuryAssessment.create({
      data: {
        clientId: athleteId,
        painLevel,
        painTiming: mapPainTimingLabel(painTiming),
        painDuringWarmup: sorenessDetails.painDuringWarmup,
        painContinuesThroughout: sorenessDetails.painContinuesThroughout,
        painDisappearsAfterWarmup: sorenessDetails.painDisappearsAfterWarmup,
        painRedevelopsLater: sorenessDetails.painRedevelopsLater,
        painPersists1HourPost: sorenessDetails.painPersists1HourPost,
        gaitAffected: false,
        swelling: false,
        rangeOfMotion: 'NORMAL',
        weightBearing: null,
        assessment: painDecision.decision,
        status: 'ACTIVE',
        injuryType,
        phase: painLevel > 7 ? 'ACUTE' : painLevel > 4 ? 'SUBACUTE' : 'CHRONIC',
        recommendedProtocol: JSON.parse(JSON.stringify(recommendedProtocol)),
        estimatedTimeOff: painDecision.estimatedTimeOff,
        notes: buildAssessmentNotes(functionalLimitations, previousTreatment),
      }
    });

    const cascade = await runIntegrationCascade({
      athleteId,
      injuryType,
      painLevel,
      painTiming,
      acwrRisk,
    });

    return successResponse({
      assessment: stored,
      decision: painDecision.decision,
      severity,
      painAssessment: {
        currentPain: painLevel,
        timing: painTiming,
        decision: painDecision.decision,
        reasoning: painDecision.reasoning
      },
      acwrRisk: acwrRisk ? {
        zone: acwrRisk.zone,
        injuryRisk: acwrRisk.injuryRisk,
        recommendation: acwrRisk.recommendation
      } : null,
      rehabProtocol: {
        injuryType: rehabProtocol.injuryType,
        phases: rehabProtocol.phases.map(p => ({
          name: p.name,
          duration: p.duration,
          exercises: p.exercises.slice(0, 3).map(e => e.name) // Top 3 exercises
        })),
        totalDuration: rehabProtocol.totalDuration
      },
      returnToRunning: {
        nextPhase: returnProtocol[0]?.phase ?? null,
        phases: returnProtocol
      },
      recommendations: generateInjuryRecommendations(painDecision, severity, injuryType),
      cascade,
    }, 'Injury assessed successfully', 201);
  } catch (error) {
    return handleApiError(error);
  }
}

function generateInjuryRecommendations(painDecision: any, severity: string, injuryType: string): string[] {
  const recs: string[] = [];

  switch (painDecision.decision) {
    case 'STOP_IMMEDIATELY':
    case 'MEDICAL_EVALUATION':
      recs.push('🛑 Stop training immediately');
      recs.push('Schedule medical evaluation');
      break;
    case 'REST_2_3_DAYS':
    case 'REST_1_DAY':
      recs.push('⚠️ Rest recommended before resuming activity');
      recs.push('Introduce cross-training alternatives if pain-free');
      break;
    case 'MODIFY':
      recs.push('⚠️ Modify training - reduce intensity and volume');
      recs.push('Monitor pain closely - stop if it increases');
      break;
    default:
      recs.push('Continue with caution and monitor symptoms daily');
      break;
  }

  if (severity === 'SEVERE') {
    recs.push('Severe injury - expect 6-12 weeks for full recovery');
    recs.push('Consider medical imaging to rule out stress fracture');
  } else if (severity === 'MODERATE') {
    recs.push('Moderate injury - expect 3-6 weeks for recovery');
    recs.push('Begin rehab exercises immediately');
  } else {
    recs.push('Mild injury - continue modified training with monitoring');
    recs.push('Address underlying biomechanical issues');
  }

  // Injury-specific recommendations
  switch (injuryType) {
    case 'PLANTAR_FASCIITIS':
      recs.push('Ice bottle rolls, calf stretching, night splints');
      break;
    case 'ACHILLES_TENDINOPATHY':
      recs.push('Eccentric heel drops crucial for recovery');
      break;
    case 'IT_BAND_SYNDROME':
      recs.push('Hip strengthening (glute med) is key');
      break;
  }

  return recs;
}

function mapPainTiming(value: 'BEFORE' | 'DURING' | 'AFTER' | 'CONSTANT') {
  switch (value) {
    case 'BEFORE':
      return 'DURING_WARMUP';
    case 'DURING':
      return 'DURING_WORKOUT';
    case 'AFTER':
      return 'POST_WORKOUT';
    case 'CONSTANT':
    default:
      return 'CONSTANT';
  }
}

function mapPainTimingLabel(value: 'BEFORE' | 'DURING' | 'AFTER' | 'CONSTANT') {
  switch (value) {
    case 'BEFORE':
      return 'DURING_WARMUP';
    case 'DURING':
      return 'DURING_WORKOUT';
    case 'AFTER':
      return 'REDEVELOPS_LATER';
    case 'CONSTANT':
    default:
      return 'CONSTANT';
  }
}

function buildSorenessFlags(timing: 'BEFORE' | 'DURING' | 'AFTER' | 'CONSTANT') {
  return {
    painDuringWarmup: timing === 'BEFORE' || timing === 'DURING' || timing === 'CONSTANT',
    painContinuesThroughout: timing === 'DURING' || timing === 'CONSTANT',
    painDisappearsAfterWarmup: timing === 'BEFORE',
    painRedevelopsLater: timing === 'AFTER',
    painPersists1HourPost: timing === 'CONSTANT' || timing === 'AFTER',
    painAltersGait: false,
  };
}

function mapSorenessFlagsToModel(flags: ReturnType<typeof buildSorenessFlags>) {
  return {
    painDuringWarmup: flags.painDuringWarmup,
    painContinuesThroughout: flags.painContinuesThroughout,
    painDisappearsAfterWarmup: flags.painDisappearsAfterWarmup,
    painRedevelopsLater: flags.painRedevelopsLater,
    painPersists1HourPost: flags.painPersists1HourPost,
  };
}

function deriveFunctionalImpact(painLevel: number): 'NONE' | 'MILD' | 'MODERATE' | 'SEVERE' {
  if (painLevel >= 7) return 'SEVERE';
  if (painLevel >= 5) return 'MODERATE';
  if (painLevel >= 3) return 'MILD';
  return 'NONE';
}

function buildAssessmentNotes(limitations?: string[], treatments?: string[]) {
  const notes: string[] = [];
  if (limitations?.length) {
    notes.push(`Functional limitations: ${limitations.join(', ')}`);
  }
  if (treatments?.length) {
    notes.push(`Previous treatments: ${treatments.join(', ')}`);
  }
  return notes.join(' | ') || null;
}

async function runIntegrationCascade(params: {
  athleteId: string;
  injuryType: InjuryAssessmentRequest['injuryType'];
  painLevel: number;
  painTiming: 'BEFORE' | 'DURING' | 'AFTER' | 'CONSTANT';
  acwrRisk: ReturnType<typeof checkACWRRisk> | null;
}) {
  const integrationType = mapInjuryTypeForIntegration(params.injuryType);
  if (!integrationType) {
    return null;
  }

  try {
    const response = await processInjuryDetection(
      {
        athleteId: params.athleteId,
        injuryType: integrationType,
        painLevel: params.painLevel,
        painTiming: params.painTiming,
        acwrRisk: mapAcwrZoneToRisk(params.acwrRisk?.zone),
        detectionSource: 'COACH_ASSESSMENT',
        date: new Date(),
      } satisfies InjuryDetection,
      prisma,
      { persistRecord: false },
    );

    return {
      immediateAction: response.immediateAction,
      workoutModifications: response.workoutModifications,
      crossTrainingSubstitutions: response.crossTrainingSubstitutions,
      returnToRunningProtocol: response.returnToRunningProtocol,
      programAdjustment: response.programAdjustment,
      coachNotification: response.coachNotification,
      estimatedReturnWeeks: response.estimatedReturnWeeks,
    };
  } catch (error) {
    logger.error('Failed to run injury integration cascade', { athleteId: params.athleteId }, error);
    return null;
  }
}

function mapInjuryTypeForIntegration(
  type: InjuryAssessmentRequest['injuryType'],
): InjuryDetection['injuryType'] | null {
  // Map from request schema types to InjuryDetection types
  const map: Record<InjuryAssessmentRequest['injuryType'], InjuryDetection['injuryType'] | null> = {
    PLANTAR_FASCIITIS: 'PLANTAR_FASCIITIS',
    ACHILLES_TENDINOPATHY: 'ACHILLES_TENDINOPATHY',
    IT_BAND_SYNDROME: 'IT_BAND_SYNDROME',
    PATELLOFEMORAL_PAIN: 'PATELLOFEMORAL_SYNDROME',
    MEDIAL_TIBIAL_STRESS: 'SHIN_SPLINTS',
    HAMSTRING_STRAIN: 'HAMSTRING_STRAIN',
    HIP_FLEXOR_STRAIN: 'HIP_FLEXOR',
    STRESS_FRACTURE: 'STRESS_FRACTURE',
    OTHER: null,
  };

  return map[type] ?? null;
}

function mapAcwrZoneToRisk(
  zone?: ReturnType<typeof checkACWRRisk>['zone'],
): InjuryDetection['acwrRisk'] | undefined {
  if (!zone) return undefined;
  const map: Record<string, InjuryDetection['acwrRisk']> = {
    DETRAINING: 'LOW',
    OPTIMAL: 'LOW',
    CAUTION: 'MODERATE',
    DANGER: 'HIGH',
    CRITICAL: 'CRITICAL',
  };

  return map[zone];
}
