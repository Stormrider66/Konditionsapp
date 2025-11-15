/**
 * Evidence-Based Rehabilitation Protocols
 *
 * Implements specific protocols for 8 most common running injuries:
 * 1. Plantar Fasciitis (6-12 weeks)
 * 2. Achilles Tendinopathy (12+ weeks, Alfredson protocol)
 * 3. IT Band Syndrome (8+ weeks, hip strengthening focus)
 * 4. Patellofemoral Pain (9-12 weeks, combined hip/knee strengthening)
 * 5. Medial Tibial Stress Syndrome (4-12 weeks)
 * 6. Stress Fractures (2-20+ weeks, location-dependent)
 * 7. Hip Flexor Strains (2-8+ weeks, grade-dependent)
 * 8. Hamstring Strains (23-50 days, mechanism-dependent)
 */

import { RehabProtocol, RehabPhase, InjuryType } from './types';

/**
 * Get complete rehabilitation protocol for specific injury
 */
export function getRehabProtocol(injuryType: string, severity?: string): RehabProtocol {
  switch (injuryType) {
    case 'PLANTAR_FASCIITIS':
      return getPlantar FasciitisProtocol();
    case 'ACHILLES_TENDINOPATHY':
      return getAchillesProtocol();
    case 'IT_BAND_SYNDROME':
      return getITBandProtocol();
    case 'PATELLOFEMORAL_PAIN':
      return getPatellofemoralProtocol();
    case 'MEDIAL_TIBIAL_STRESS':
      return getShinSplintProtocol();
    case 'STRESS_FRACTURE':
      return getStressFractureProtocol(severity);
    case 'HIP_FLEXOR_STRAIN':
      return getHipFlexorProtocol(severity);
    case 'HAMSTRING_STRAIN':
      return getHamstringProtocol(severity);
    default:
      return getGenericProtocol();
  }
}

/**
 * Plantar Fasciitis Protocol (6-12 weeks)
 * 3-phase approach: Acute → Subacute → Strengthening
 */
function getPlantar FasciitisProtocol(): RehabProtocol {
  return {
    injuryType: 'PLANTAR_FASCIITIS',
    totalDuration: '6-12 weeks',
    successRate: 85, // % based on research
    contraindications: [
      'Acute rupture (rare)',
      'Infection signs',
      'Neurological symptoms'
    ],
    phases: [
      {
        name: 'Acute Phase',
        duration: '1-3 weeks',
        goals: [
          'Pain management',
          'Reduce inflammation',
          'Gentle mobility restoration'
        ],
        exercises: [
          {
            name: 'Toe Towel Curls',
            sets: 3,
            reps: '15',
            load: 'Bodyweight',
            frequency: 'Daily',
            progression: 'Add small weight when 15 reps easy',
            painThreshold: 3
          },
          {
            name: 'Gentle Calf Stretches',
            sets: 3,
            reps: '30 seconds',
            load: 'Bodyweight',
            frequency: 'Daily',
            progression: 'Increase duration to 45 seconds',
            painThreshold: 4
          },
          {
            name: 'Heel Lifts',
            sets: 3,
            reps: '12',
            load: 'Bodyweight',
            frequency: 'Daily',
            progression: 'Increase to 15 reps, then single leg',
            painThreshold: 3
          },
          {
            name: 'Frozen Water Bottle Roll',
            sets: 1,
            reps: '5-10 minutes',
            load: 'Light pressure',
            frequency: 'Daily',
            progression: 'Increase pressure tolerance',
            painThreshold: 5
          }
        ],
        criteria: [
          'Morning pain ≤4/10',
          'Walking pain ≤2/10',
          'Can complete all exercises with pain ≤3/10'
        ]
      },
      {
        name: 'Subacute Phase',
        duration: '4-8 weeks',
        goals: [
          'Progressive strengthening',
          'Improve tissue capacity',
          'Restore normal function'
        ],
        exercises: [
          {
            name: 'Progressive Heel Raises',
            sets: 3,
            reps: '15 bilateral → 15 single leg → weighted',
            load: 'Bodyweight → 10-20% BW',
            frequency: '3x weekly',
            progression: 'Bilateral → Single leg → Add 10% BW weekly',
            painThreshold: 3
          },
          {
            name: 'Arch Doming',
            sets: 3,
            reps: '10',
            load: 'Bodyweight',
            frequency: 'Daily',
            progression: 'Hold for 5 → 10 seconds',
            painThreshold: 2
          },
          {
            name: 'Calf Stretching',
            sets: 3,
            reps: '30 seconds',
            load: 'Bodyweight',
            frequency: 'Daily',
            progression: 'Maintain flexibility gains',
            painThreshold: 3
          },
          {
            name: 'Toe Spread Exercises',
            sets: 3,
            reps: '15',
            load: 'Bodyweight',
            frequency: 'Daily',
            progression: 'Add resistance band',
            painThreshold: 2
          }
        ],
        criteria: [
          'Morning pain ≤3/10',
          'Walking 45+ minutes without symptoms',
          'Can complete 15 single-leg heel raises'
        ]
      },
      {
        name: 'Strengthening Phase',
        duration: '8-12 weeks',
        goals: [
          'Advanced strengthening',
          'Return to impact activities',
          'Prevent recurrence'
        ],
        exercises: [
          {
            name: 'Weighted Single-Leg Heel Raises',
            sets: 3,
            reps: '12',
            load: '20-30% BW',
            frequency: '3x weekly',
            progression: 'Increase weight 10% weekly when pain ≤3/10',
            painThreshold: 3
          },
          {
            name: 'Eccentric Heel Drops',
            sets: 3,
            reps: '15',
            load: 'Bodyweight',
            frequency: '3x weekly',
            progression: 'Add weight when 15 reps achieved',
            painThreshold: 4
          },
          {
            name: 'Resistance Band Toe Exercises',
            sets: 3,
            reps: '15',
            load: 'Light resistance',
            frequency: 'Daily',
            progression: 'Increase resistance band strength',
            painThreshold: 2
          }
        ],
        criteria: [
          'Morning pain ≤2/10',
          'Can complete 25+ single-leg heel raises pain-free',
          'Walking 45+ minutes without symptoms',
          'Ready for return-to-running protocol'
        ]
      }
    ]
  };
}

/**
 * Achilles Tendinopathy Protocol (12+ weeks)
 * Implements Alfredson eccentric protocol (gold standard)
 */
function getAchillesProtocol(): RehabProtocol {
  return {
    injuryType: 'ACHILLES_TENDINOPATHY',
    totalDuration: '12+ weeks',
    successRate: 78, // Alfredson protocol success rate
    contraindications: [
      'Complete rupture',
      'Acute inflammatory signs',
      'Insertional calcification (relative)'
    ],
    phases: [
      {
        name: 'Pain Management',
        duration: '1-2 weeks',
        goals: [
          'Reduce pain and inflammation',
          'Maintain pain-free range of motion',
          'Begin gentle loading'
        ],
        exercises: [
          {
            name: 'Pain-Free Range of Motion',
            sets: 3,
            reps: '10',
            load: 'Bodyweight',
            frequency: 'Daily',
            progression: 'Increase range as tolerated',
            painThreshold: 3
          },
          {
            name: 'Isometric Calf Holds',
            sets: 5,
            reps: '10 seconds',
            load: '50-70% MVC',
            frequency: 'Daily',
            progression: 'Increase hold time to 15 seconds',
            painThreshold: 5
          }
        ],
        criteria: [
          'Pain ≤4/10 during daily activities',
          'Can walk without significant limping',
          'Morning stiffness ≤15 minutes'
        ]
      },
      {
        name: 'Eccentric Loading (Alfredson Protocol)',
        duration: '12 weeks minimum',
        goals: [
          'Stimulate tendon remodeling',
          'Increase tendon capacity',
          'Restore function'
        ],
        exercises: [
          {
            name: 'Eccentric Heel Drops - Straight Knee',
            sets: 3,
            reps: '15',
            load: 'Bodyweight → Weighted',
            frequency: 'Daily (2x daily)',
            progression: 'Add weight via backpack when 3×15 achieved at pain ≤5/10',
            painThreshold: 5
          },
          {
            name: 'Eccentric Heel Drops - Bent Knee',
            sets: 3,
            reps: '15',
            load: 'Bodyweight → Weighted',
            frequency: 'Daily (2x daily)',
            progression: 'Add weight via backpack when 3×15 achieved at pain ≤5/10',
            painThreshold: 5
          }
        ],
        criteria: [
          'VISA-A score >80/100',
          'Morning stiffness <5 minutes',
          'Can complete all exercises with acceptable pain',
          '≥80% heel-rise endurance vs unaffected side'
        ]
      },
      {
        name: 'Return to Activity',
        duration: '4-8 weeks',
        goals: [
          'Progress to running',
          'Maintain tendon capacity',
          'Prevent recurrence'
        ],
        exercises: [
          {
            name: 'Continue Eccentric Protocol',
            sets: 3,
            reps: '15',
            load: 'Weighted',
            frequency: 'Daily',
            progression: 'Maintain throughout return to running',
            painThreshold: 3
          },
          {
            name: 'Single-Leg Hops',
            sets: 3,
            reps: '20',
            load: 'Bodyweight',
            frequency: '3x weekly',
            progression: 'Increase distance and speed',
            painThreshold: 2
          }
        ],
        criteria: [
          'VISA-A score >80/100',
          '20 consecutive single-leg hops pain-free',
          'Return-to-running protocol completed successfully'
        ]
      }
    ]
  };
}

/**
 * IT Band Syndrome Protocol (8+ weeks)
 * Focus on hip abductor and external rotator strengthening
 */
function getITBandProtocol(): RehabProtocol {
  return {
    injuryType: 'IT_BAND_SYNDROME',
    totalDuration: '8-12 weeks',
    successRate: 75,
    contraindications: ['Acute hip pathology', 'Snapping hip syndrome (severe)'],
    phases: [
      {
        name: 'Acute Phase',
        duration: '1-2 weeks',
        goals: ['Reduce lateral knee pain', 'Begin hip strengthening', 'Modify aggravating activities'],
        exercises: [
          {
            name: 'Clamshells',
            sets: 3,
            reps: '15',
            load: 'Bodyweight → Light band',
            frequency: 'Daily',
            progression: 'Add resistance band',
            painThreshold: 3
          },
          {
            name: 'Side-Lying Hip Abduction',
            sets: 3,
            reps: '12',
            load: 'Bodyweight',
            frequency: 'Daily',
            progression: 'Add ankle weight',
            painThreshold: 3
          }
        ],
        criteria: ['Pain ≤4/10 during daily activities', 'Can perform hip exercises pain-free']
      },
      {
        name: 'Strengthening Phase',
        duration: '6-8 weeks',
        goals: ['Build hip abductor strength', 'Improve running mechanics', 'Increase training tolerance'],
        exercises: [
          {
            name: 'Single-Leg Squats',
            sets: 3,
            reps: '10',
            load: 'Bodyweight',
            frequency: '3x weekly',
            progression: 'Increase depth, add weight',
            painThreshold: 3
          },
          {
            name: 'Step-Downs',
            sets: 3,
            reps: '12',
            load: 'Bodyweight',
            frequency: '3x weekly',
            progression: 'Increase step height',
            painThreshold: 3
          }
        ],
        criteria: ['Single-leg squat with good form', 'No lateral knee pain during running']
      }
    ]
  };
}

/**
 * Additional protocols for other injuries (simplified for brevity)
 */
function getPatellofemoralProtocol(): RehabProtocol {
  return {
    injuryType: 'PATELLOFEMORAL_PAIN',
    totalDuration: '9-12 weeks',
    successRate: 70,
    contraindications: ['Patellar dislocation', 'Patellar tendon rupture'],
    phases: [
      {
        name: 'Pain Management & Strengthening',
        duration: '9-12 weeks',
        goals: ['Reduce anterior knee pain', 'Strengthen quadriceps and hips', 'Improve tracking'],
        exercises: [
          {
            name: 'Quad Sets',
            sets: 3,
            reps: '15',
            load: 'Bodyweight',
            frequency: 'Daily',
            progression: 'Hold contractions longer',
            painThreshold: 3
          },
          {
            name: 'Step-Ups',
            sets: 3,
            reps: '10',
            load: 'Bodyweight',
            frequency: '3x weekly',
            progression: 'Add weight, increase height',
            painThreshold: 3
          }
        ],
        criteria: ['Pain-free stairs', 'Single-leg squat to 60 degrees']
      }
    ]
  };
}

function getShinSplintProtocol(): RehabProtocol {
  return {
    injuryType: 'MEDIAL_TIBIAL_STRESS',
    totalDuration: '4-12 weeks',
    successRate: 80,
    contraindications: ['Stress fracture', 'Compartment syndrome'],
    phases: [
      {
        name: 'Rehabilitation',
        duration: '4-12 weeks',
        goals: ['Reduce tibial pain', 'Strengthen lower leg', 'Modify biomechanics'],
        exercises: [
          {
            name: 'Toe Raises',
            sets: 3,
            reps: '15',
            load: 'Bodyweight',
            frequency: 'Daily',
            progression: 'Single leg, add weight',
            painThreshold: 3
          },
          {
            name: 'Heel Walks',
            sets: 3,
            reps: '30 seconds',
            load: 'Bodyweight',
            frequency: 'Daily',
            progression: 'Increase duration',
            painThreshold: 3
          }
        ],
        criteria: ['Palpation tenderness ≤2/10', 'Hop test passed']
      }
    ]
  };
}

function getStressFractureProtocol(severity?: string): RehabProtocol {
  return {
    injuryType: 'STRESS_FRACTURE',
    totalDuration: '6-20+ weeks (location dependent)',
    successRate: 90,
    contraindications: ['High-risk locations require surgery'],
    phases: [
      {
        name: 'Bone Healing',
        duration: '6-12 weeks',
        goals: ['Allow bone healing', 'Maintain fitness', 'Address biomechanics'],
        exercises: [
          {
            name: 'Pool Running',
            sets: 1,
            reps: '20-40 minutes',
            load: 'Bodyweight',
            frequency: '3-5x weekly',
            progression: 'Increase duration',
            painThreshold: 0
          }
        ],
        criteria: ['Pain-free weight bearing', 'Medical clearance', 'Imaging confirmation']
      }
    ]
  };
}

function getHipFlexorProtocol(severity?: string): RehabProtocol {
  return {
    injuryType: 'HIP_FLEXOR_STRAIN',
    totalDuration: '2-8+ weeks',
    successRate: 85,
    contraindications: ['Complete tear'],
    phases: [
      {
        name: 'Rehabilitation',
        duration: '4-6 weeks',
        goals: ['Restore range of motion', 'Rebuild strength', 'Return to activity'],
        exercises: [
          {
            name: 'Hip Flexor Stretches',
            sets: 3,
            reps: '30 seconds',
            load: 'Bodyweight',
            frequency: 'Daily',
            progression: 'Increase stretch',
            painThreshold: 4
          },
          {
            name: 'Straight Leg Raises',
            sets: 3,
            reps: '12',
            load: 'Bodyweight',
            frequency: 'Daily',
            progression: 'Add ankle weight',
            painThreshold: 3
          }
        ],
        criteria: ['Full ROM', 'Strength ≥90% of unaffected side']
      }
    ]
  };
}

function getHamstringProtocol(severity?: string): RehabProtocol {
  return {
    injuryType: 'HAMSTRING_STRAIN',
    totalDuration: '3-7 weeks',
    successRate: 85,
    contraindications: ['Complete tear', 'Avulsion fracture'],
    phases: [
      {
        name: 'Rehabilitation',
        duration: '4-6 weeks',
        goals: ['Restore flexibility', 'Rebuild eccentric strength', 'Prevent reinjury'],
        exercises: [
          {
            name: 'Nordic Hamstring Curls',
            sets: 3,
            reps: '8',
            load: 'Bodyweight',
            frequency: '2-3x weekly',
            progression: 'Increase depth and control',
            painThreshold: 4
          },
          {
            name: 'Single-Leg RDLs',
            sets: 3,
            reps: '10',
            load: 'Bodyweight → Weighted',
            frequency: '3x weekly',
            progression: 'Add weight gradually',
            painThreshold: 3
          }
        ],
        criteria: ['Askling H-test passed', 'Sprint mechanics normalized']
      }
    ]
  };
}

function getGenericProtocol(): RehabProtocol {
  return {
    injuryType: 'OTHER',
    totalDuration: '4-8 weeks',
    successRate: 70,
    contraindications: ['Seek medical evaluation for diagnosis'],
    phases: [
      {
        name: 'General Rehabilitation',
        duration: '4-8 weeks',
        goals: ['Reduce pain', 'Restore function', 'Build strength'],
        exercises: [
          {
            name: 'General Strengthening',
            sets: 3,
            reps: '12-15',
            load: 'Appropriate to injury',
            frequency: '3x weekly',
            progression: 'Gradual load increase',
            painThreshold: 3
          }
        ],
        criteria: ['Pain ≤2/10', 'Functional tests passed']
      }
    ]
  };
}
