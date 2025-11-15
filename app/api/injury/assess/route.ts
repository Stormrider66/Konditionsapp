/**
 * POST /api/injury/assess
 *
 * Assess injury and get return-to-running protocol recommendations
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { validateRequest, successResponse, handleApiError, requireAuth } from '@/lib/api/utils';
import { assessPain } from '@/lib/training-engine/injury-management/pain-assessment';
import { checkACWRRisk } from '@/lib/training-engine/injury-management/acwr-monitoring';
import { getReturnToRunningProtocol } from '@/lib/training-engine/injury-management/return-protocols';
import { getRehabProtocol } from '@/lib/training-engine/injury-management/rehab-protocols';
import prisma from '@/lib/prisma';

const requestSchema = z.object({
  athleteId: z.string(),
  injuryType: z.enum([
    'PLANTAR_FASCIITIS',
    'ACHILLES_TENDINOPATHY',
    'IT_BAND_SYNDROME',
    'PATELLOFEMORAL_PAIN',
    'SHIN_SPLINTS',
    'HAMSTRING_STRAIN',
    'HIP_FLEXOR_STRAIN',
    'STRESS_FRACTURE',
    'GENERAL'
  ]),
  painLevel: z.number().min(0).max(10),
  painTiming: z.enum(['BEFORE', 'DURING', 'AFTER', 'CONSTANT']),
  symptomDuration: z.number().min(1).max(365), // days
  functionalLimitations: z.array(z.string()).optional(),
  previousTreatment: z.array(z.string()).optional(),
  currentACWR: z.number().optional()
});

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

    // Assess pain using University of Delaware rules
    const painAssessment = assessPain({
      currentPain: painLevel,
      painDuringActivity: painTiming === 'DURING' || painTiming === 'CONSTANT' ? painLevel : 0,
      painAfterActivity: painTiming === 'AFTER' || painTiming === 'CONSTANT' ? painLevel : 0,
      morningPain: painTiming === 'CONSTANT' ? painLevel : painLevel * 0.5,
      daysSincePainStarted: symptomDuration
    });

    // Check ACWR risk if available
    let acwrRisk = null;
    if (currentACWR) {
      acwrRisk = checkACWRRisk(currentACWR);
    }

    // Get rehab protocol for specific injury
    const rehabProtocol = getRehabProtocol(injuryType);

    // Get return-to-running protocol
    const returnProtocol = getReturnToRunningProtocol({
      injuryType,
      severity: painLevel > 7 ? 'SEVERE' : painLevel > 4 ? 'MODERATE' : 'MILD',
      daysSinceInjury: symptomDuration
    });

    // Determine overall severity
    const severity = painLevel > 7 || painAssessment.decision === 'STOP' ? 'SEVERE' :
                     painLevel > 4 ? 'MODERATE' : 'MILD';

    // Store injury assessment
    const stored = await prisma.injuryAssessment.create({
      data: {
        athleteId,
        userId: user.id,
        injuryType,
        severity,
        painLevel,
        decision: painAssessment.decision,
        reasoning: painAssessment.reasoning,
        assessedAt: new Date()
      }
    });

    return successResponse({
      assessment: stored,
      decision: painAssessment.decision,
      severity,
      painAssessment: {
        currentPain: painLevel,
        timing: painTiming,
        decision: painAssessment.decision,
        reasoning: painAssessment.reasoning
      },
      acwrRisk: acwrRisk ? {
        zone: acwrRisk.zone,
        injuryRisk: acwrRisk.injuryRisk,
        recommendation: acwrRisk.recommendation
      } : null,
      rehabProtocol: {
        name: rehabProtocol.name,
        phases: rehabProtocol.phases.map(p => ({
          name: p.name,
          duration: p.durationWeeks,
          exercises: p.exercises.slice(0, 3).map(e => e.name) // Top 3 exercises
        })),
        totalDuration: rehabProtocol.totalWeeks
      },
      returnToRunning: {
        currentPhase: returnProtocol.phases[0].name,
        estimatedWeeks: returnProtocol.totalWeeks,
        phases: returnProtocol.phases.map(p => ({
          name: p.name,
          duration: p.durationWeeks,
          description: p.criteria
        }))
      },
      recommendations: generateInjuryRecommendations(painAssessment, severity, injuryType)
    }, 'Injury assessed successfully', 201);
  } catch (error) {
    return handleApiError(error);
  }
}

function generateInjuryRecommendations(painAssessment: any, severity: string, injuryType: string): string[] {
  const recs: string[] = [];

  if (painAssessment.decision === 'STOP') {
    recs.push('🛑 STOP training immediately');
    recs.push('Consult healthcare professional');
  } else if (painAssessment.decision === 'MODIFY') {
    recs.push('⚠️ Modify training - reduce intensity and volume');
    recs.push('Monitor pain closely - stop if it increases');
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
