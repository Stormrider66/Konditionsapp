/**
 * Anti-Gravity Treadmill (AlterG) Progression System
 *
 * Graduated return to running with precise body weight support
 * Research shows biomechanics preserved at ≥80% body weight
 */

import { AlterGProgression } from './types';

/**
 * Generate AlterG progression protocol
 */
export function generateAlterGProgression(
  injuryType: string,
  severity: 'MILD' | 'MODERATE' | 'SEVERE',
  currentPhase: string,
  weeksInCrossTraining: number
): AlterGProgression[] {

  let progression: AlterGProgression[];

  switch (severity) {
    case 'MILD':
      progression = getMildInjuryProgression();
      break;
    case 'MODERATE':
      progression = getModerateInjuryProgression();
      break;
    case 'SEVERE':
      progression = getSevereInjuryProgression();
      break;
  }

  // Adjust for specific injury types
  return adjustForInjuryType(progression, injuryType);
}

/**
 * Mild injury progression (4-6 weeks)
 */
function getMildInjuryProgression(): AlterGProgression[] {
  return [
    {
      phase: 'INITIAL',
      bodyWeightSupport: 70, // 30% unweighting
      duration: 15,
      intensity: 'Easy pace',
      progressionCriteria: 'Pain-free for 3 consecutive sessions',
      nextPhase: 'Increase body weight to 80%'
    },
    {
      phase: 'BUILDING',
      bodyWeightSupport: 80, // 20% unweighting
      duration: 25,
      intensity: 'Easy to moderate',
      progressionCriteria: 'Pain-free for 5 consecutive sessions',
      nextPhase: 'Increase body weight to 90%'
    },
    {
      phase: 'ADVANCED',
      bodyWeightSupport: 90, // 10% unweighting
      duration: 35,
      intensity: 'Easy to tempo',
      progressionCriteria: 'Pain-free for 1 week',
      nextPhase: 'Progress to 100% body weight'
    },
    {
      phase: 'RETURN_PREP',
      bodyWeightSupport: 100, // Full body weight
      duration: 45,
      intensity: 'Full range including quality work',
      progressionCriteria: 'Pain-free quality work for 1 week',
      nextPhase: 'Transition to ground running'
    }
  ];
}

/**
 * Moderate injury progression (6-8 weeks)
 */
function getModerateInjuryProgression(): AlterGProgression[] {
  return [
    {
      phase: 'INITIAL',
      bodyWeightSupport: 50, // 50% unweighting
      duration: 10,
      intensity: 'Walking to easy jogging',
      progressionCriteria: 'Pain-free for 1 week',
      nextPhase: 'Increase body weight to 65%'
    },
    {
      phase: 'INITIAL',
      bodyWeightSupport: 65, // 35% unweighting
      duration: 20,
      intensity: 'Easy jogging',
      progressionCriteria: 'Pain-free for 1 week',
      nextPhase: 'Increase body weight to 80%'
    },
    {
      phase: 'BUILDING',
      bodyWeightSupport: 80,
      duration: 30,
      intensity: 'Easy to moderate',
      progressionCriteria: 'Pain-free for 1 week',
      nextPhase: 'Increase body weight to 90%'
    },
    {
      phase: 'ADVANCED',
      bodyWeightSupport: 90,
      duration: 40,
      intensity: 'Easy to tempo',
      progressionCriteria: 'Pain-free for 1 week',
      nextPhase: 'Progress to 100% body weight'
    },
    {
      phase: 'RETURN_PREP',
      bodyWeightSupport: 100,
      duration: 50,
      intensity: 'Full range',
      progressionCriteria: 'Pain-free full training for 2 weeks',
      nextPhase: 'Transition to ground running'
    }
  ];
}

/**
 * Severe injury progression (8-12 weeks)
 */
function getSevereInjuryProgression(): AlterGProgression[] {
  return [
    {
      phase: 'INITIAL',
      bodyWeightSupport: 30, // 70% unweighting
      duration: 5,
      intensity: 'Walking only',
      progressionCriteria: 'Pain-free walking for 1 week',
      nextPhase: 'Begin easy jogging at 40% body weight'
    },
    {
      phase: 'INITIAL',
      bodyWeightSupport: 40,
      duration: 10,
      intensity: 'Walking to easy jogging',
      progressionCriteria: 'Pain-free for 1 week',
      nextPhase: 'Increase to 50% body weight'
    },
    {
      phase: 'INITIAL',
      bodyWeightSupport: 50,
      duration: 15,
      intensity: 'Easy jogging',
      progressionCriteria: 'Pain-free for 1 week',
      nextPhase: 'Increase to 65% body weight'
    },
    {
      phase: 'BUILDING',
      bodyWeightSupport: 65,
      duration: 25,
      intensity: 'Easy to moderate',
      progressionCriteria: 'Pain-free for 1 week',
      nextPhase: 'Increase to 80% body weight'
    },
    {
      phase: 'BUILDING',
      bodyWeightSupport: 80,
      duration: 35,
      intensity: 'Easy to moderate',
      progressionCriteria: 'Pain-free for 2 weeks',
      nextPhase: 'Increase to 90% body weight'
    },
    {
      phase: 'ADVANCED',
      bodyWeightSupport: 90,
      duration: 45,
      intensity: 'Easy to tempo',
      progressionCriteria: 'Pain-free for 2 weeks',
      nextPhase: 'Progress to 100% body weight'
    },
    {
      phase: 'RETURN_PREP',
      bodyWeightSupport: 100,
      duration: 60,
      intensity: 'Full range including quality work',
      progressionCriteria: 'Pain-free full training for 3 weeks',
      nextPhase: 'Transition to ground running'
    }
  ];
}

/**
 * Adjust progression for specific injury types
 */
function adjustForInjuryType(
  progression: AlterGProgression[],
  injuryType: string
): AlterGProgression[] {

  const adjusted = [...progression];

  switch (injuryType) {
    case 'STRESS_FRACTURE':
      // More conservative progression, longer at each phase
      adjusted.forEach(phase => {
        phase.bodyWeightSupport = Math.max(30, phase.bodyWeightSupport - 10); // More unweighting
        phase.progressionCriteria = phase.progressionCriteria.replace('1 week', '2 weeks');
      });
      break;

    case 'PLANTAR_FASCIITIS':
      // Focus on soft landing mechanics
      adjusted.forEach(phase => {
        phase.progressionCriteria += ' + No morning pain increase';
      });
      break;

    case 'ACHILLES_TENDINOPATHY':
      // Avoid speed work until later phases
      adjusted.forEach((phase, index) => {
        if (index < adjusted.length - 1) {
          phase.intensity = phase.intensity.replace('tempo', 'moderate');
        }
      });
      break;

    case 'PATELLOFEMORAL_PAIN':
      // Start with even more unweighting
      adjusted.forEach(phase => {
        phase.bodyWeightSupport = Math.max(30, phase.bodyWeightSupport - 5);
      });
      break;

    case 'IT_BAND_SYNDROME':
      // Avoid excessive incline
      adjusted.forEach(phase => {
        phase.progressionCriteria += ' + 0% incline only';
      });
      break;
  }

  return adjusted;
}

/**
 * Assess readiness to progress AlterG phase
 */
export function assessAlterGProgression(
  currentPhase: AlterGProgression,
  completedSessions: number,
  painLevels: number[],
  performanceMetrics: any
): {
  readyToProgress: boolean;
  reasoning: string;
  recommendations: string[];
} {

  // Check minimum session requirement
  const minSessions = getMinimumSessions(currentPhase.phase);
  if (completedSessions < minSessions) {
    return {
      readyToProgress: false,
      reasoning: `Need ${minSessions - completedSessions} more sessions at current level`,
      recommendations: [`Complete ${minSessions} sessions before progressing`]
    };
  }

  // Check pain levels
  const maxPain = Math.max(...painLevels);
  const avgPain = painLevels.reduce((a, b) => a + b) / painLevels.length;

  if (maxPain > 2 || avgPain > 1) {
    return {
      readyToProgress: false,
      reasoning: 'Pain levels too high for progression',
      recommendations: [
        'All sessions must be ≤2/10 pain',
        'Consider reducing body weight support',
        'Focus on pain-free movement patterns'
      ]
    };
  }

  // Check biomechanics (if available)
  if (performanceMetrics?.asymmetry > 10) {
    return {
      readyToProgress: false,
      reasoning: 'Gait asymmetry detected',
      recommendations: [
        'Address asymmetry before progressing',
        'Consider physiotherapy evaluation',
        'Focus on symmetrical movement patterns'
      ]
    };
  }

  return {
    readyToProgress: true,
    reasoning: 'All progression criteria met',
    recommendations: [
      'Progress to next phase',
      'Continue monitoring pain and biomechanics',
      'Maintain conservative approach'
    ]
  };
}

function getMinimumSessions(phase: string): number {
  switch (phase) {
    case 'INITIAL': return 5;
    case 'BUILDING': return 7;
    case 'ADVANCED': return 7;
    case 'RETURN_PREP': return 10;
    default: return 5;
  }
}

/**
 * Calculate metabolic adjustments for body weight support
 */
export function calculateMetabolicAdjustments(
  bodyWeightSupport: number,
  targetPace: number,
  targetHR: number
): {
  adjustedPace: number;
  adjustedHR: number;
  inclineCompensation?: number;
} {

  // Research: HR decreases 8.6% at 20% support, 13.3% at 40% support
  const supportPercentage = (100 - bodyWeightSupport) / 100;
  const hrReduction = supportPercentage * 0.25; // 25% max HR reduction at full support

  // Pace adjustment - need to run faster to maintain metabolic demand
  const paceAdjustment = supportPercentage * 0.15; // 15% faster at full support

  // Alternative: incline compensation (every 2% incline = 6.4% VO2 increase)
  const inclineForCompensation = (supportPercentage * 0.15) / 0.064 * 2; // Convert to incline %

  return {
    adjustedPace: targetPace * (1 - paceAdjustment),
    adjustedHR: Math.round(targetHR * (1 - hrReduction)),
    inclineCompensation: Math.round(inclineForCompensation * 10) / 10
  };
}
