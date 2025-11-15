/**
 * Methodology Blending System
 *
 * Implements sequential methodology transitions (e.g., Lydiard → Canova)
 * Based on elite coaching practices and research showing 3% VO2peak gains
 * from Pyramidal → Polarized transitions
 */

import { MethodologyType, MethodologyTransition, TransitionProtocol } from './types';

/**
 * Methodology compatibility matrix
 * Based on research and elite coaching practices
 */
const METHODOLOGY_COMPATIBILITY: { [key: string]: string } = {
  'NORWEGIAN_TO_PYRAMIDAL': 'HIGH', // Both emphasize threshold work
  'PYRAMIDAL_TO_POLARIZED': 'HIGH', // Research-validated 3% VO2peak gain
  'LYDIARD_TO_CANOVA': 'HIGH',     // Sequential phasing works well
  'POLARIZED_TO_CANOVA': 'MODERATE', // Different intensity approaches
  'NORWEGIAN_TO_CANOVA': 'MODERATE', // Requires lactate monitoring transition
  'CANOVA_TO_NORWEGIAN': 'LOW',     // Conflicting precision requirements
  'NORWEGIAN_TO_POLARIZED': 'LOW'   // Very different clustering approaches
};

/**
 * Design methodology transition protocol
 */
export function designTransitionProtocol(
  from: MethodologyType,
  to: MethodologyType,
  athleteReadiness: number,
  weeksToGoalRace: number
): MethodologyTransition | { error: string } {

  const transitionKey = `${from}_TO_${to}`;
  const compatibility = METHODOLOGY_COMPATIBILITY[transitionKey];

  if (!compatibility) {
    return { error: 'Unsupported methodology transition' };
  }

  if (compatibility === 'LOW' && weeksToGoalRace < 12) {
    return { error: 'Insufficient time for low-compatibility transition' };
  }

  // Prerequisites based on target methodology
  const prerequisites = getTransitionPrerequisites(to, from);

  // Check if athlete meets prerequisites
  const meetsPrerequisites = checkPrerequisites(prerequisites, athleteReadiness);
  if (!meetsPrerequisites.passed) {
    return { error: `Prerequisites not met: ${meetsPrerequisites.missing.join(', ')}` };
  }

  return {
    fromMethodology: from,
    toMethodology: to,
    transitionType: 'SEQUENTIAL',
    compatibility: compatibility as 'HIGH' | 'MODERATE' | 'LOW',
    bridgeWeeks: getBridgeWeeks(compatibility, from, to),
    prerequisites,
    progressMarkers: getProgressMarkers(from, to)
  };
}

/**
 * Generate week-by-week transition protocol
 */
export function generateTransitionWeeks(transition: MethodologyTransition): TransitionProtocol[] {
  const protocols: TransitionProtocol[] = [];

  // Example: Pyramidal (70/25/5) → Polarized (80/15/5) transition
  if (transition.fromMethodology === 'PYRAMIDAL' && transition.toMethodology === 'POLARIZED') {
    protocols.push({
      week: 1,
      volumeAdjustment: 0, // No volume change
      intensityDistribution: { zone1_2: 73, zone3: 22, zone4_5: 5 },
      qualityFocus: 'Reduce Zone 3 work slightly',
      notes: 'Begin shift away from moderate intensity'
    });

    protocols.push({
      week: 2,
      volumeAdjustment: 0,
      intensityDistribution: { zone1_2: 76, zone3: 19, zone4_5: 5 },
      qualityFocus: 'Continue reducing Zone 3',
      notes: 'Monitor recovery - should feel easier overall'
    });

    protocols.push({
      week: 3,
      volumeAdjustment: 0,
      intensityDistribution: { zone1_2: 79, zone3: 16, zone4_5: 5 },
      qualityFocus: 'Almost to polarized distribution',
      notes: 'Quality sessions should feel more distinct'
    });

    protocols.push({
      week: 4,
      volumeAdjustment: 0,
      intensityDistribution: { zone1_2: 80, zone3: 15, zone4_5: 5 },
      qualityFocus: 'Full polarized distribution achieved',
      notes: 'Transition complete - monitor adaptation'
    });
  }

  // Norwegian → Pyramidal transition
  if (transition.fromMethodology === 'NORWEGIAN' && transition.toMethodology === 'PYRAMIDAL') {
    protocols.push({
      week: 1,
      volumeAdjustment: 0,
      intensityDistribution: { zone1_2: 68, zone3: 27, zone4_5: 5 },
      qualityFocus: 'Increase Zone 3 tempo work',
      notes: 'Add more threshold work than typical Norwegian'
    });

    protocols.push({
      week: 2,
      volumeAdjustment: 0,
      intensityDistribution: { zone1_2: 70, zone3: 25, zone4_5: 5 },
      qualityFocus: 'Continue building Zone 3 capacity',
      notes: 'Monitor for excessive fatigue'
    });

    protocols.push({
      week: 3,
      volumeAdjustment: 0,
      intensityDistribution: { zone1_2: 70, zone3: 25, zone4_5: 5 },
      qualityFocus: 'Full pyramidal distribution',
      notes: 'Transition complete'
    });
  }

  // Lydiard → Canova transition
  if (transition.fromMethodology === 'LYDIARD' && transition.toMethodology === 'CANOVA') {
    protocols.push({
      week: 1,
      volumeAdjustment: -10, // Reduce volume 10%
      intensityDistribution: { zone1_2: 75, zone3: 15, zone4_5: 10 },
      qualityFocus: 'Shift to Canova-style fundamental work',
      notes: 'Introduce progressive runs and fundamental endurance'
    });

    protocols.push({
      week: 2,
      volumeAdjustment: -5,
      intensityDistribution: { zone1_2: 70, zone3: 20, zone4_5: 10 },
      qualityFocus: 'Add special endurance work',
      notes: 'Begin race-specific lactate threshold work'
    });

    protocols.push({
      week: 3,
      volumeAdjustment: 0,
      intensityDistribution: { zone1_2: 65, zone3: 25, zone4_5: 10 },
      qualityFocus: 'Full Canova methodology',
      notes: 'Transition complete - monitoring phase specific focus'
    });
  }

  // Polarized → Canova transition
  if (transition.fromMethodology === 'POLARIZED' && transition.toMethodology === 'CANOVA') {
    protocols.push({
      week: 1,
      volumeAdjustment: 0,
      intensityDistribution: { zone1_2: 78, zone3: 17, zone4_5: 5 },
      qualityFocus: 'Introduce Zone 3 threshold work',
      notes: 'Begin adding moderate intensity work'
    });

    protocols.push({
      week: 2,
      volumeAdjustment: 0,
      intensityDistribution: { zone1_2: 75, zone3: 20, zone4_5: 5 },
      qualityFocus: 'Continue building Zone 3',
      notes: 'Monitor recovery - adding new stimulus'
    });

    protocols.push({
      week: 3,
      volumeAdjustment: 0,
      intensityDistribution: { zone1_2: 70, zone3: 23, zone4_5: 7 },
      qualityFocus: 'Add specific endurance work',
      notes: 'Increase Zone 4-5 work'
    });

    protocols.push({
      week: 4,
      volumeAdjustment: 0,
      intensityDistribution: { zone1_2: 65, zone3: 25, zone4_5: 10 },
      qualityFocus: 'Full Canova distribution',
      notes: 'Transition complete'
    });
  }

  // If no specific protocol, generate generic transition
  if (protocols.length === 0) {
    protocols.push({
      week: 1,
      volumeAdjustment: 0,
      intensityDistribution: { zone1_2: 75, zone3: 20, zone4_5: 5 },
      qualityFocus: `Begin ${transition.toMethodology} methodology`,
      notes: 'Generic transition protocol - monitor adaptation'
    });
  }

  return protocols;
}

/**
 * Get prerequisites for transitioning TO a methodology
 */
function getTransitionPrerequisites(toMethodology: MethodologyType, fromMethodology: MethodologyType): string[] {
  const prerequisites: string[] = [];

  switch (toMethodology) {
    case 'NORWEGIAN':
      prerequisites.push('Minimum 100km/week for ≥12 weeks');
      prerequisites.push('Threshold capacity ≥40min continuous');
      prerequisites.push('Lactate control 2.3-3.0 mmol/L demonstrated');
      prerequisites.push('Morning RHR stable within 3 bpm baseline');
      prerequisites.push('HRV baseline established');
      break;

    case 'CANOVA':
      prerequisites.push('Clear race goal with target time');
      prerequisites.push('6-10 weeks to competition phase');
      prerequisites.push('Lactate control established OR field test completed');
      break;

    case 'POLARIZED':
      prerequisites.push('Good recovery from moderate intensity demonstrated');
      prerequisites.push('Entering competition phase');
      prerequisites.push('Race calendar requiring sharpness');
      break;

    case 'PYRAMIDAL':
      prerequisites.push('Solid aerobic base established');
      prerequisites.push('8+ weeks to goal race');
      prerequisites.push('No current injury concerns');
      break;

    case 'LYDIARD':
      prerequisites.push('Long-term training focus (16+ weeks available)');
      prerequisites.push('Aerobic base building phase appropriate');
      prerequisites.push('Not in immediate competition phase');
      break;
  }

  // Add universal prerequisites
  prerequisites.push('Stable recovery markers for 7+ days');
  prerequisites.push('No injury concerns');
  prerequisites.push('Minimum 6 weeks in current methodology');

  return prerequisites;
}

/**
 * Get bridge weeks based on compatibility
 */
function getBridgeWeeks(compatibility: string, from: MethodologyType, to: MethodologyType): number {
  switch (compatibility) {
    case 'HIGH': return 3; // 3-week bridge
    case 'MODERATE': return 4; // 4-week bridge
    case 'LOW': return 6; // 6-week bridge
    default: return 4;
  }
}

/**
 * Get progress markers for transition
 */
function getProgressMarkers(from: MethodologyType, to: MethodologyType): string[] {
  return [
    'Resting HR within 3 bpm of baseline',
    'HRV ≥90% of baseline for 3+ consecutive days',
    'Successful completion of bridge week protocols',
    'No excessive fatigue or declining performance',
    'Psychological adaptation to new training style'
  ];
}

/**
 * Check if athlete meets prerequisites
 */
function checkPrerequisites(prerequisites: string[], athleteReadiness: number): {
  passed: boolean;
  missing: string[];
} {
  // This would check actual athlete data against prerequisites
  // For now, simplified implementation
  return {
    passed: athleteReadiness >= 7.5,
    missing: athleteReadiness < 7.5 ? ['Insufficient readiness score'] : []
  };
}
