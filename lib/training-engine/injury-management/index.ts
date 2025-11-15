/**
 * Injury Management System - Main Entry Point
 *
 * Integrates all injury management components with the main training engine:
 * - Pain assessment with University of Delaware Soreness Rules
 * - ACWR monitoring for injury risk prediction
 * - Return-to-running protocols (5 phases)
 * - Rehabilitation protocols (8 common injuries)
 * - Automatic load reduction
 * - Red flag detection
 * - Functional testing
 */

// Types
export * from './types';

// Pain Assessment
export {
  assessPainAndRecommend,
  detectRedFlags
} from './pain-assessment';

// ACWR Monitoring
export {
  calculateACWR,
  generateACWRDecision,
  monitorACWRTrends
} from './acwr-monitoring';

// Return-to-Running Protocols
export {
  generateReturnProtocol,
  assessPhaseAdvancement,
  getFunctionalTests
} from './return-protocols';

// Rehabilitation Protocols
export {
  getRehabProtocol
} from './rehab-protocols';

// Load Reduction
export {
  calculateLoadReduction,
  applyInjurySpecificModifications,
  reduceIntensity,
  getCrossTrainingAlternatives,
  estimateRecoveryTime
} from './load-reduction';

import { PainAssessment, SorenessRules, ACWRAssessment, InjuryDecision } from './types';
import { assessPainAndRecommend } from './pain-assessment';
import { generateACWRDecision } from './acwr-monitoring';
import { calculateLoadReduction } from './load-reduction';

/**
 * Comprehensive injury assessment
 *
 * Combines pain assessment, ACWR monitoring, and soreness rules
 * to generate unified training recommendations
 */
export async function comprehensiveInjuryAssessment(
  painAssessment: PainAssessment,
  sorenessRules: SorenessRules,
  acwrAssessment: ACWRAssessment,
  trainingHistory: any[]
): Promise<InjuryDecision> {

  // 1. Pain-based decision (highest priority)
  const painDecision = assessPainAndRecommend(painAssessment, sorenessRules);

  // 2. ACWR-based decision
  const acwrDecision = generateACWRDecision(acwrAssessment);

  // 3. Combine decisions (most restrictive wins)
  const finalDecision = combineDecisions(painDecision, acwrDecision);

  // 4. Calculate specific load modifications
  const modifications = calculateLoadReduction(
    finalDecision,
    getCurrentWeeklyVolume(trainingHistory),
    acwrAssessment
  );

  return {
    ...finalDecision,
    modifications
  };
}

/**
 * Combine multiple injury decisions (most restrictive wins)
 */
function combineDecisions(painDecision: InjuryDecision, acwrDecision: InjuryDecision): InjuryDecision {
  const severityOrder = ['GREEN', 'YELLOW', 'RED', 'CRITICAL'];
  const decisionOrder = ['CONTINUE', 'MODIFY', 'REST_1_DAY', 'REST_2_3_DAYS', 'MEDICAL_EVALUATION', 'STOP_IMMEDIATELY'];

  // Use most severe decision
  const mostSevere = severityOrder.indexOf(painDecision.severity) > severityOrder.indexOf(acwrDecision.severity)
    ? painDecision
    : acwrDecision;

  const mostRestrictive = decisionOrder.indexOf(painDecision.decision) > decisionOrder.indexOf(acwrDecision.decision)
    ? painDecision
    : acwrDecision;

  return {
    ...mostRestrictive,
    reasoning: `Combined assessment: ${painDecision.reasoning} | ${acwrDecision.reasoning}`,
    modifications: [...(painDecision.modifications || []), ...(acwrDecision.modifications || [])]
  };
}

function getCurrentWeeklyVolume(trainingHistory: any[]): number {
  // Calculate current weekly volume from last 7 days
  const last7Days = trainingHistory.slice(-7);
  return last7Days.reduce((sum, day) => sum + (day.distance || 0), 0);
}
