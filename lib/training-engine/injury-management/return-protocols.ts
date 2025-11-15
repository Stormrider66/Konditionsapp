/**
 * Return-to-Running Protocols
 *
 * Implements 5-phase progressive return system:
 * 1. Walking (pain-free 30+ minutes)
 * 2. Walk-Run Intervals (4:1 → 1:4 ratios)
 * 3. Continuous Running (10 → 30 minutes)
 * 4. Volume Building (50% → 100% pre-injury)
 * 5. Intensity Return (strides → threshold → full training)
 */

import { ReturnToRunningPhase, FunctionalTest, ReturnPhase } from './types';

/**
 * Generate return-to-running protocol based on injury type and severity
 */
export function generateReturnProtocol(
  injuryType: string,
  severity: 'MILD' | 'MODERATE' | 'SEVERE',
  preInjuryVolume: number // km/week
): ReturnToRunningPhase[] {

  const baseProtocol: ReturnToRunningPhase[] = [
    {
      phase: 'WALKING',
      duration: '3-7 days',
      criteria: [
        'Pain-free walking 30+ minutes at ≥3.5 mph',
        'Full pain-free range of motion',
        'No swelling or discoloration',
        'Normal weight bearing'
      ],
      prescription: [
        'Day 1-2: 10-15 min walking',
        'Day 3-4: 20 min walking',
        'Day 5-7: 30 min walking',
        'All walking must be completely pain-free'
      ],
      advancementTest: '3 consecutive pain-free 30-minute walks'
    },
    {
      phase: 'WALK_RUN',
      duration: '7-14 days',
      criteria: [
        'Complete walking phase successfully',
        'Pain ≤2/10 during all activities',
        'No pain 1 hour post-activity'
      ],
      prescription: [
        'Week 1: 1min run / 4min walk × 6 (30min total)',
        'Week 1: 2min run / 3min walk × 6 (30min total)',
        'Week 2: 3min run / 2min walk × 6 (30min total)',
        'Week 2: 4min run / 1min walk × 6 (30min total)',
        'Perform 3× weekly with rest days between'
      ],
      advancementTest: '6 successful attempts at 4:1 run:walk ratio'
    },
    {
      phase: 'CONTINUOUS',
      duration: '10-14 days',
      criteria: [
        'Complete walk-run phase successfully',
        'Pain ≤2/10 during continuous running',
        'No gait alterations observed'
      ],
      prescription: [
        'Week 1: 10 min continuous easy running',
        'Week 1: 15 min continuous easy running',
        'Week 2: 20 min continuous easy running',
        'Week 2: 30 min continuous easy running',
        'All runs at conversational pace'
      ],
      advancementTest: '3 consecutive pain-free 30-minute runs'
    },
    {
      phase: 'VOLUME_BUILD',
      duration: '14-21 days',
      criteria: [
        'Complete continuous phase successfully',
        'Functional tests passed (see functional-tests.ts)',
        'Limb symmetry ≥90%'
      ],
      prescription: [
        'Week 1: 50% of pre-injury weekly volume',
        'Week 2: 70% of pre-injury weekly volume',
        'Week 3: 85% of pre-injury weekly volume',
        'Week 4: 100% of pre-injury weekly volume',
        'Increase no more than 10% per week'
      ],
      advancementTest: 'Pain-free completion of 100% pre-injury volume for 1 week'
    },
    {
      phase: 'INTENSITY_RETURN',
      duration: '14-21 days',
      criteria: [
        'Complete volume building successfully',
        'All functional tests passed',
        'Psychological confidence restored'
      ],
      prescription: [
        'Week 1: Add strides (4-6 × 20sec)',
        'Week 2: Add tempo intervals (3-4 × 3min)',
        'Week 3: Add threshold work (2 × 8-10min)',
        'Week 4+: Return to normal training'
      ],
      advancementTest: 'Successful completion of threshold work without pain or performance decline'
    }
  ];

  // Modify protocol based on injury severity
  return adjustProtocolForSeverity(baseProtocol, severity, injuryType);
}

/**
 * Adjust return protocol based on injury severity
 */
function adjustProtocolForSeverity(
  protocol: ReturnToRunningPhase[],
  severity: 'MILD' | 'MODERATE' | 'SEVERE',
  injuryType: string
): ReturnToRunningPhase[] {

  const adjustedProtocol = [...protocol];

  switch (severity) {
    case 'MILD':
      // Accelerated protocol - can skip walking phase if no pain
      if (injuryType !== 'STRESS_FRACTURE') {
        adjustedProtocol[0].duration = '1-3 days';
        adjustedProtocol[1].duration = '5-7 days';
      }
      break;

    case 'MODERATE':
      // Standard protocol as defined
      break;

    case 'SEVERE':
      // Extended protocol with longer phases
      adjustedProtocol[0].duration = '7-14 days';
      adjustedProtocol[1].duration = '14-21 days';
      adjustedProtocol[2].duration = '14-21 days';
      adjustedProtocol[3].duration = '21-28 days';
      adjustedProtocol[4].duration = '21-28 days';

      // Add additional criteria for severe injuries
      adjustedProtocol.forEach(phase => {
        phase.criteria.push('Medical clearance obtained');
        if (phase.phase === 'INTENSITY_RETURN') {
          phase.criteria.push('Imaging cleared (if applicable)');
        }
      });
      break;
  }

  // Injury-specific modifications
  switch (injuryType) {
    case 'STRESS_FRACTURE':
      // Stress fractures require longer walking phase
      adjustedProtocol[0].duration = '14-21 days';
      adjustedProtocol[0].criteria.push('Weight-bearing tolerance test passed');
      adjustedProtocol[0].criteria.push('Bone scan cleared (if applicable)');
      break;

    case 'ACHILLES_TENDINOPATHY':
      // Achilles requires heel-rise testing
      adjustedProtocol[3].criteria.push('25+ single-leg heel rises pain-free');
      adjustedProtocol[4].criteria.push('VISA-A score >80/100');
      break;

    case 'PLANTAR_FASCIITIS':
      // Plantar fasciitis requires morning pain assessment
      adjustedProtocol.forEach(phase => {
        phase.criteria.push('Morning pain ≤2/10');
      });
      break;
  }

  return adjustedProtocol;
}

/**
 * Assess readiness to advance to next phase
 */
export function assessPhaseAdvancement(
  currentPhase: ReturnPhase,
  completedAttempts: number,
  painLevels: number[], // Last 3-5 attempts
  functionalTests?: { [testName: string]: boolean }
): {
  readyToAdvance: boolean;
  reasoning: string;
  additionalRequirements?: string[];
} {

  // Minimum attempts required (typically 3-6)
  const minAttempts = currentPhase === 'WALK_RUN' ? 6 : 3;

  if (completedAttempts < minAttempts) {
    return {
      readyToAdvance: false,
      reasoning: `Need ${minAttempts - completedAttempts} more successful attempts`,
      additionalRequirements: [`Complete ${minAttempts} attempts with pain ≤2/10`]
    };
  }

  // Check pain levels
  const maxPain = Math.max(...painLevels);
  const avgPain = painLevels.reduce((a, b) => a + b) / painLevels.length;

  if (maxPain > 2 || avgPain > 1.5) {
    return {
      readyToAdvance: false,
      reasoning: 'Pain levels too high for advancement',
      additionalRequirements: [
        'All activities must be ≤2/10 pain',
        'Average pain should be ≤1.5/10',
        'Consider extending current phase by 3-5 days'
      ]
    };
  }

  // Check functional tests if required
  if (functionalTests && currentPhase === 'VOLUME_BUILD') {
    const requiredTests = ['single_leg_hop', 'heel_rise_endurance', 'balance_test'];
    const failedTests = requiredTests.filter(test => !functionalTests[test]);

    if (failedTests.length > 0) {
      return {
        readyToAdvance: false,
        reasoning: 'Functional tests not passed',
        additionalRequirements: [
          `Complete functional tests: ${failedTests.join(', ')}`,
          'Achieve ≥90% limb symmetry',
          'No compensation patterns observed'
        ]
      };
    }
  }

  return {
    readyToAdvance: true,
    reasoning: 'All advancement criteria met. Ready for next phase.',
    additionalRequirements: []
  };
}

/**
 * Get functional tests for return-to-running
 */
export function getFunctionalTests(): FunctionalTest[] {
  return [
    {
      name: 'Single Leg Hop Test',
      description: 'Hop forward on one leg, measuring distance',
      passingCriteria: '≥90% of unaffected side distance',
      significance: 'Tests explosive power and confidence in injured limb',
      instructions: [
        'Stand on injured leg',
        'Hop forward as far as possible',
        'Land on same leg without losing balance',
        'Measure distance',
        'Compare to unaffected side'
      ]
    },
    {
      name: 'Heel Rise Endurance Test',
      description: 'Maximum repetitions of single-leg heel rises',
      passingCriteria: '≥80% of unaffected side repetitions',
      significance: 'Tests calf strength and Achilles endurance',
      instructions: [
        'Stand on injured leg',
        'Rise up on toes as high as possible',
        'Lower slowly',
        'Repeat until fatigue or form breakdown',
        'Count total repetitions'
      ]
    },
    {
      name: 'Balance Test',
      description: 'Single-leg balance with eyes closed',
      passingCriteria: '30+ seconds without loss of balance',
      significance: 'Tests proprioception and neuromuscular control',
      instructions: [
        'Stand on injured leg',
        'Close eyes',
        'Maintain balance for 30 seconds',
        'No excessive swaying or hopping',
        'Test on both legs for comparison'
      ]
    },
    {
      name: 'Step Down Test',
      description: 'Controlled eccentric lowering from step',
      passingCriteria: 'No pain, no trunk lean, no knee valgus',
      significance: 'Tests eccentric control and knee mechanics',
      instructions: [
        'Stand on 20cm step on injured leg',
        'Lower unaffected leg to floor',
        'Tap floor lightly',
        'Return to start position',
        'Repeat 10 times',
        'Watch for compensation patterns'
      ]
    }
  ];
}
