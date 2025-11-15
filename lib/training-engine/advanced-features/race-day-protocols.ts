/**
 * Race-Day Execution Protocols
 *
 * Distance-specific protocols for:
 * - Warmup routines
 * - Pacing strategies
 * - Fueling protocols
 * - Mental strategies
 * - Post-race recovery
 */

import {
  RaceDayProtocol,
  WarmupProtocol,
  PacingStrategy,
  FuelingProtocol,
  MentalStrategy,
  RecoveryProtocol,
  PacingContingency
} from './types';

/**
 * Generate race-day protocol for specific distance
 */
export function generateRaceDayProtocol(
  distance: string,
  targetTime: number,
  lt2Pace: number,
  athleteLevel: string
): RaceDayProtocol {

  switch (distance) {
    case '5K':
      return generate5KProtocol(targetTime, lt2Pace, athleteLevel);
    case '10K':
      return generate10KProtocol(targetTime, lt2Pace, athleteLevel);
    case 'HALF_MARATHON':
      return generateHalfMarathonProtocol(targetTime, lt2Pace, athleteLevel);
    case 'MARATHON':
      return generateMarathonProtocol(targetTime, lt2Pace, athleteLevel);
    default:
      throw new Error(`Unsupported race distance: ${distance}`);
  }
}

/**
 * 5K Race Protocol
 * High-intensity, anaerobic contribution, requires extensive warmup
 */
function generate5KProtocol(targetTime: number, lt2Pace: number, athleteLevel: string): RaceDayProtocol {
  const targetPace = targetTime / 5; // sec/km

  return {
    distance: '5K',

    warmup: {
      duration: 25,
      timing: '20-30 minutes before start',
      structure: [
        {
          phase: 'Easy Jogging',
          duration: 10,
          intensity: 'Z1-Z2',
          purpose: 'Elevate HR and body temperature',
          paceGuidance: '30-40 sec/km slower than LT2'
        },
        {
          phase: 'Dynamic Drills',
          duration: 5,
          intensity: 'Progressive',
          purpose: 'Activate neuromuscular system',
          paceGuidance: 'A-skip, high knees, butt kicks'
        },
        {
          phase: 'Strides',
          duration: 5,
          intensity: 'Building to race pace',
          purpose: 'Prime race pace neuromuscular patterns',
          paceGuidance: '4-6 × 80m building to race pace'
        },
        {
          phase: 'Race Pace Touches',
          duration: 3,
          intensity: 'Race pace',
          purpose: 'Final race pace confirmation',
          paceGuidance: '2 × 200m at goal pace'
        },
        {
          phase: 'Final Prep',
          duration: 2,
          intensity: 'Easy',
          purpose: 'Settle nerves, final prep',
          paceGuidance: 'Easy jog to start line'
        }
      ],
      distanceSpecific: [
        'Extensive warmup critical for 5K due to immediate high intensity',
        'Must elevate HR to ~80% max before race start',
        'Practice race pace during warmup to confirm feel'
      ]
    },

    pacing: {
      strategy: 'EVEN',
      splits: [
        {
          segment: '0-1K',
          targetPace: targetPace * 0.99, // 1% faster than average
          effort: 'Controlled aggressive',
          keyPoints: [
            'Get out well but not sprinting',
            'Settle into rhythm by 400m',
            'Should feel "comfortably hard"'
          ]
        },
        {
          segment: '1-3K',
          targetPace: targetPace,
          effort: 'Steady state',
          keyPoints: [
            'Lock into target pace',
            'Focus on relaxation and efficiency',
            'Resist urge to surge with others'
          ]
        },
        {
          segment: '3-4K',
          targetPace: targetPace,
          effort: 'Maintain focus',
          keyPoints: [
            'Mental toughness zone',
            'Lactate accumulating but manageable',
            'Prepare for final kilometer'
          ]
        },
        {
          segment: '4-5K',
          targetPace: targetPace * 0.97, // 3% faster
          effort: 'Progressive to kick',
          keyPoints: [
            'Begin progressive increase',
            'Use remaining anaerobic capacity',
            'Final 200m all-out sprint'
          ]
        }
      ],
      contingencies: [
        {
          situation: 'Feeling excellent at 3K',
          action: 'Begin progressive increase early',
          riskAssessment: 'Low risk if fitness is there'
        },
        {
          situation: 'Feeling poor at 2K',
          action: 'Settle for time goal, avoid blowup',
          riskAssessment: 'High risk of severe positive split'
        }
      ]
    },

    fueling: {
      preRace: {
        timing: '3-4 hours before',
        carbohydrates: '1-4g per kg body weight',
        recommendations: [
          'Familiar foods only',
          'Moderate glycemic index',
          'Adequate hydration'
        ]
      },
      duringRace: {
        strategy: 'NONE',
        rationale: 'Race too short for mid-race fueling',
        hydration: 'Only if very hot conditions'
      },
      postRace: {
        immediate: '30-60g carbs + 15-25g protein within 30 minutes',
        purpose: 'Glycogen replenishment and recovery'
      }
    },

    mental: {
      strategy: 'ASSOCIATIVE',
      focus: 'Internal body awareness and pace control',
      techniques: [
        'Pace awareness and split checking',
        'Breathing rhythm focus',
        'Form cues (relaxation, efficiency)',
        'Positive self-talk during difficult phases'
      ],
      raceSpecific: [
        '5K requires constant pace awareness',
        'No time for dissociative strategies',
        'Mental toughness critical in kilometers 3-4'
      ]
    },

    recovery: {
      immediate: [
        'Cool down with 10-15 minutes easy jogging',
        'Hydrate based on sweat loss',
        'Carbohydrate + protein within 30 minutes'
      ],
      firstWeek: [
        'Days 1-2: Rest or easy cross-training only',
        'Days 3-5: Easy runs 20-40 minutes',
        'Day 6+: Resume quality if feeling fresh'
      ],
      returnToTraining: '5-7 days for full training resumption'
    }
  };
}

/**
 * 10K Race Protocol
 * Balance of aerobic and anaerobic, moderate warmup
 */
function generate10KProtocol(targetTime: number, lt2Pace: number, athleteLevel: string): RaceDayProtocol {
  const targetPace = targetTime / 10;

  return {
    distance: '10K',

    warmup: {
      duration: 20,
      timing: '15-25 minutes before start',
      structure: [
        {
          phase: 'Easy Jogging',
          duration: 10,
          intensity: 'Z1-Z2',
          purpose: 'Warm up muscles and cardiovascular system',
          paceGuidance: '30-40 sec/km slower than LT2'
        },
        {
          phase: 'Dynamic Drills',
          duration: 4,
          intensity: 'Progressive',
          purpose: 'Activate running muscles',
          paceGuidance: 'High knees, butt kicks, leg swings'
        },
        {
          phase: 'Strides',
          duration: 4,
          intensity: 'Building to race pace',
          purpose: 'Prime neuromuscular system',
          paceGuidance: '3-4 × 80m building to race pace'
        },
        {
          phase: 'Final Prep',
          duration: 2,
          intensity: 'Easy',
          purpose: 'Final mental preparation',
          paceGuidance: 'Easy jog and stretching'
        }
      ],
      distanceSpecific: [
        'Moderate warmup sufficient for 10K',
        'Focus on mental preparation',
        'Confirm race pace feel with strides'
      ]
    },

    pacing: {
      strategy: 'EVEN',
      splits: [
        {
          segment: '0-2K',
          targetPace: targetPace * 0.99,
          effort: 'Controlled',
          keyPoints: [
            'Conservative start',
            'Settle into rhythm by 1K',
            'Should feel controlled and sustainable'
          ]
        },
        {
          segment: '2-8K',
          targetPace: targetPace,
          effort: 'Steady threshold',
          keyPoints: [
            'Lock into target pace',
            'Mentally divide into 2K segments',
            'Stay relaxed and efficient'
          ]
        },
        {
          segment: '8-10K',
          targetPace: targetPace * 0.98,
          effort: 'Progressive increase',
          keyPoints: [
            'Begin gradual acceleration',
            'Final kilometer hard effort',
            'Sprint final 200-400m'
          ]
        }
      ],
      contingencies: [
        {
          situation: 'Feeling great at 6K',
          action: 'Begin gradual acceleration early',
          riskAssessment: 'Moderate risk - could backfire in final 2K'
        },
        {
          situation: 'Struggling at 5K',
          action: 'Focus on maintaining current pace',
          riskAssessment: 'Avoid slowing - psychological victory to hold'
        }
      ]
    },

    fueling: {
      preRace: {
        timing: '3-4 hours before',
        carbohydrates: '2-4g per kg body weight',
        recommendations: [
          'Familiar breakfast',
          'Adequate carbohydrates',
          'Complete 2-3 hours before race'
        ]
      },
      duringRace: {
        strategy: 'MINIMAL',
        rationale: 'Consider water only if hot',
        hydration: 'One water stop at 5K if >20°C'
      },
      postRace: {
        immediate: '40-80g carbs + 20-30g protein within 45 minutes',
        purpose: 'Recovery and glycogen restoration'
      }
    },

    mental: {
      strategy: 'ASSOCIATIVE',
      focus: 'Pace monitoring and effort control',
      techniques: [
        'Break race into 2K segments',
        'Focus on breathing rhythm',
        'Use mantras for difficult sections',
        'Counting down kilometers'
      ],
      raceSpecific: [
        'Mental toughness critical in 5-8K',
        'Stay present in each segment',
        'Positive self-talk essential'
      ]
    },

    recovery: {
      immediate: [
        'Cool down 10-15 minutes easy jogging',
        'Rehydrate based on sweat loss',
        'Carbs + protein within 45 minutes'
      ],
      firstWeek: [
        'Days 1-3: Rest or easy cross-training',
        'Days 4-7: Easy runs building to 60 minutes',
        'Day 8+: Can resume quality if recovered'
      ],
      returnToTraining: '7-10 days for full training resumption'
    }
  };
}

/**
 * Half Marathon Protocol
 * Primarily aerobic, minimal warmup
 */
function generateHalfMarathonProtocol(targetTime: number, lt2Pace: number, athleteLevel: string): RaceDayProtocol {
  const targetPace = targetTime / 21.0975;

  return {
    distance: 'HALF_MARATHON',

    warmup: {
      duration: 15,
      timing: '10-20 minutes before start',
      structure: [
        {
          phase: 'Easy Jogging',
          duration: 10,
          intensity: 'Z1',
          purpose: 'Warm up gradually',
          paceGuidance: '40-60 sec/km slower than race pace'
        },
        {
          phase: 'Strides',
          duration: 3,
          intensity: 'Building to race pace',
          purpose: 'Prime race pace feel',
          paceGuidance: '2-3 × 80m at race pace'
        },
        {
          phase: 'Final Prep',
          duration: 2,
          intensity: 'Very easy',
          purpose: 'Mental preparation',
          paceGuidance: 'Walking and final prep'
        }
      ],
      distanceSpecific: [
        'Minimal warmup needed for half marathon',
        'Save energy for the race',
        'First 2K serves as extended warmup'
      ]
    },

    pacing: {
      strategy: 'EVEN',
      splits: [
        {
          segment: '0-5K',
          targetPace: targetPace * 1.01,
          effort: 'Conservative',
          keyPoints: [
            'Start conservatively',
            'Resist urge to go with faster runners',
            'First 5K should feel very comfortable'
          ]
        },
        {
          segment: '5-15K',
          targetPace: targetPace,
          effort: 'Steady threshold',
          keyPoints: [
            'Settle into target pace',
            'Focus on efficiency and rhythm',
            'Monitor fueling and hydration'
          ]
        },
        {
          segment: '15-21K',
          targetPace: targetPace * 0.99,
          effort: 'Progressive effort',
          keyPoints: [
            'Gradual increase in effort',
            'Final 5K tests mental toughness',
            'Final 2K all you have left'
          ]
        }
      ],
      contingencies: [
        {
          situation: 'Feeling strong at 15K',
          action: 'Begin controlled acceleration',
          riskAssessment: 'Low risk if pacing was conservative'
        },
        {
          situation: 'Struggling at 10K',
          action: 'Reassess and potentially slow slightly',
          riskAssessment: 'Better to slow 5 sec/km than blow up'
        }
      ]
    },

    fueling: {
      preRace: {
        timing: '3-4 hours before',
        carbohydrates: '2-4g per kg body weight',
        recommendations: [
          'High-carb breakfast',
          'Familiar foods only',
          'Finish 3 hours before start'
        ]
      },
      duringRace: {
        strategy: 'GEL_AND_WATER',
        rationale: 'Maintain blood glucose and hydration',
        hydration: 'Water every 5K, gel at 10K'
      },
      postRace: {
        immediate: '60-100g carbs + 25-35g protein within 60 minutes',
        purpose: 'Glycogen restoration and muscle repair'
      }
    },

    mental: {
      strategy: 'ASSOCIATIVE',
      focus: 'Pace control and effort monitoring',
      techniques: [
        'Break race into 5K segments',
        'Use checkpoints for motivation',
        'Breathing rhythm awareness',
        'Positive visualization'
      ],
      raceSpecific: [
        'Mental challenge in 15-18K zone',
        'Focus on process not outcome',
        'Count down final 5K by kilometer'
      ]
    },

    recovery: {
      immediate: [
        'Walk 10-15 minutes',
        'Rehydrate and refuel immediately',
        'Light stretching after cooling down'
      ],
      firstWeek: [
        'Week 1: Easy running only, 50-70% volume',
        'Week 2: Build to 80% volume, add tempo',
        'Week 3+: Full training if recovered'
      ],
      returnToTraining: '10-14 days for full training resumption'
    }
  };
}

/**
 * Marathon Protocol
 * Highly aerobic, conservative pacing, extensive fueling
 */
function generateMarathonProtocol(targetTime: number, lt2Pace: number, athleteLevel: string): RaceDayProtocol {
  const targetPace = targetTime / 42.195;

  return {
    distance: 'MARATHON',

    warmup: {
      duration: 10,
      timing: '5-15 minutes before start',
      structure: [
        {
          phase: 'Easy Jogging',
          duration: 8,
          intensity: 'Z1',
          purpose: 'Gentle warmup only',
          paceGuidance: '60+ sec/km slower than race pace'
        },
        {
          phase: 'Final Prep',
          duration: 2,
          intensity: 'Walking',
          purpose: 'Mental preparation',
          paceGuidance: 'Walking, stretching, bathroom'
        }
      ],
      distanceSpecific: [
        'Minimal warmup for marathon',
        'Save all energy for the race',
        'First 5-10K serves as warmup'
      ]
    },

    pacing: {
      strategy: 'NEGATIVE_SPLIT',
      splits: [
        {
          segment: '0-10K',
          targetPace: targetPace * 1.02,
          effort: 'Very conservative',
          keyPoints: [
            'Start slower than goal pace',
            'Resist adrenaline surge',
            'Should feel ridiculously easy'
          ]
        },
        {
          segment: '10-30K',
          targetPace: targetPace,
          effort: 'Controlled and steady',
          keyPoints: [
            'Lock into goal pace',
            'Monitor fueling every 5K',
            'Stay mentally present'
          ]
        },
        {
          segment: '30-35K',
          targetPace: targetPace,
          effort: 'Mental toughness zone',
          keyPoints: [
            'Critical segment - hold pace',
            'Use all mental strategies',
            'Focus on next aid station only'
          ]
        },
        {
          segment: '35-42K',
          targetPace: targetPace * 0.98,
          effort: 'Give everything remaining',
          keyPoints: [
            'Pace will likely slow - fight it',
            'If feeling good, can push',
            'Final 2K purely mental'
          ]
        }
      ],
      contingencies: [
        {
          situation: 'Feeling great at 30K',
          action: 'Begin very gradual acceleration',
          riskAssessment: 'Moderate risk - proceed cautiously'
        },
        {
          situation: 'Struggling before 30K',
          action: 'Slow to sustainable pace immediately',
          riskAssessment: 'Critical - early struggles compound'
        }
      ]
    },

    fueling: {
      preRace: {
        timing: '3-4 hours before',
        carbohydrates: '3-4g per kg body weight',
        recommendations: [
          'High-carb, low-fiber breakfast',
          'Tested in training',
          'Complete 3-4 hours before start'
        ]
      },
      duringRace: {
        strategy: 'GEL_EVERY_5K',
        rationale: 'Maintain blood glucose throughout',
        hydration: 'Water at every station, sports drink alternating'
      },
      postRace: {
        immediate: '80-120g carbs + 30-40g protein within 90 minutes',
        purpose: 'Critical recovery window - extensive depletion'
      }
    },

    mental: {
      strategy: 'MIXED',
      focus: 'Segmentation and present-moment focus',
      techniques: [
        'Break into 10K segments',
        'Focus only on current segment',
        'Use mantras in difficult sections',
        'Dissociation techniques after 30K if needed'
      ],
      raceSpecific: [
        'Marathon is 90% mental after 30K',
        'Have multiple mental strategies prepared',
        'Expect and accept suffering in final 10K'
      ]
    },

    recovery: {
      immediate: [
        'Walk 15-20 minutes minimum',
        'Aggressive rehydration and refueling',
        'Ice bath if available',
        'Compression garments'
      ],
      firstWeek: [
        'Week 1-2: Active recovery, 50% volume max',
        'Week 3-4: Build aerobic base, no quality',
        'Week 5-6: Reintroduce threshold work',
        'Week 7-8: Full training if ready'
      ],
      returnToTraining: '3-4 weeks for full training resumption'
    }
  };
}
