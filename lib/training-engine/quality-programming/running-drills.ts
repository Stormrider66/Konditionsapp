/**
 * Running Drills Integration System
 *
 * Progressive technical skill development:
 * - Beginners: Learn basic mechanics (A-march, high knees)
 * - Intermediate: Coordination and speed (A-skip, B-march)
 * - Advanced: Power and transfer (B-skip, bounding, strides)
 */

import { RunningDrill, DrillProgression } from './types';

/**
 * Core running drills library
 */
export const RUNNING_DRILLS: RunningDrill[] = [
  {
    name: 'A-March → A-Skip',
    category: 'TECHNICAL',
    focus: ['knee lift', 'lower-leg strength', 'efficient footstrike'],
    sets: 3,
    distance: 50,
    intensity: 'Progressive',
    rest: 'Walk back to start',
    beginner: {
      weeks: '1-4',
      volume: '2 sets × 30m',
      frequency: '1x weekly',
      focus: 'Learn proper mechanics'
    },
    intermediate: {
      weeks: '5-12',
      volume: '2-3 sets × 40m',
      frequency: '2x weekly',
      focus: 'Coordination and speed'
    },
    advanced: {
      weeks: '13+',
      volume: '3 sets × 50m',
      frequency: '2x weekly',
      focus: 'Power and running-specific transfer'
    },
    timing: [
      'Before speed workouts (10-15 min post warm-up)',
      'After easy runs as standalone session',
      'Separate session 6+ hours from hard running'
    ],
    frequency: '2x weekly optimal'
  },

  {
    name: 'B-March → B-Skip',
    category: 'TECHNICAL',
    focus: ['hamstring strength', 'leg snap-back', 'posterior chain'],
    sets: 3,
    distance: 50,
    intensity: 'Progressive',
    rest: 'Walk back to start',
    beginner: {
      weeks: 'Not recommended',
      volume: 'N/A',
      frequency: 'N/A',
      focus: 'Master A-march first'
    },
    intermediate: {
      weeks: '8-16',
      volume: '2-3 sets × 40m',
      frequency: '2x weekly',
      focus: 'Hamstring engagement'
    },
    advanced: {
      weeks: '12+',
      volume: '3 sets × 50m',
      frequency: '2x weekly',
      focus: 'Power development'
    },
    timing: [
      'Before speed workouts',
      'After easy runs',
      'Part of dynamic warmup'
    ],
    frequency: '2x weekly'
  },

  {
    name: 'Bounding',
    category: 'POWER',
    focus: ['horizontal power', 'exaggerated stride', 'ground force'],
    sets: 3,
    distance: 100,
    intensity: '85-95% effort',
    rest: '2-3 minutes',
    beginner: {
      weeks: 'Not recommended',
      volume: 'N/A',
      frequency: 'N/A',
      focus: 'Build strength base first'
    },
    intermediate: {
      weeks: 'Not recommended',
      volume: 'N/A',
      frequency: 'N/A',
      focus: 'Develop technical skills first'
    },
    advanced: {
      weeks: '16+',
      volume: '3 sets × 50-100m',
      frequency: '1-2x weekly',
      focus: 'Horizontal power development'
    },
    timing: [
      'Before speed workouts only',
      'Never after hard running',
      'Separate power session'
    ],
    frequency: '1-2x weekly maximum'
  },

  {
    name: 'Strides',
    category: 'SPEED',
    focus: ['neuromuscular coordination', 'running economy', 'leg speed'],
    sets: 6,
    distance: 80,
    intensity: 'Build to 85-95% max speed',
    rest: 'Walk back recovery',
    beginner: {
      weeks: '4+',
      volume: '4-6 × 60m',
      frequency: '1-2x weekly',
      focus: 'Learn acceleration and relaxation'
    },
    intermediate: {
      weeks: '1+',
      volume: '6-8 × 80m',
      frequency: '2x weekly',
      focus: 'Speed and coordination'
    },
    advanced: {
      weeks: '1+',
      volume: '6-10 × 100m',
      frequency: '2-3x weekly',
      focus: 'Neuromuscular power'
    },
    timing: [
      'End of easy runs',
      'Before speed workouts',
      'Separate technical session'
    ],
    frequency: '2-3x weekly'
  }
];

/**
 * Select appropriate drills based on athlete level and focus
 */
export function selectDrillsForAthlete(
  experienceLevel: string,
  runningFocus: string,
  currentWeek: number,
  availableTime: number // minutes
): RunningDrill[] {

  const appropriateDrills = RUNNING_DRILLS.filter(drill => {
    const progression = drill[experienceLevel.toLowerCase() as keyof RunningDrill] as DrillProgression;
    return progression && progression.weeks !== 'Not recommended' && progression.weeks !== 'N/A';
  });

  // Prioritize based on running focus
  let prioritizedDrills = appropriateDrills;

  switch (runningFocus) {
    case 'SPEED':
      prioritizedDrills = appropriateDrills.filter(d =>
        d.category === 'SPEED' || d.category === 'POWER'
      );
      break;
    case 'ENDURANCE':
      prioritizedDrills = appropriateDrills.filter(d =>
        d.category === 'TECHNICAL'
      );
      break;
    case 'TECHNIQUE':
      prioritizedDrills = appropriateDrills.filter(d =>
        d.category === 'TECHNICAL'
      );
      break;
  }

  // Select based on available time
  const timePerDrill = 5; // minutes including rest
  const maxDrills = Math.floor(availableTime / timePerDrill);

  return prioritizedDrills.slice(0, maxDrills);
}

/**
 * Generate drill session structure
 */
export function generateDrillSession(
  selectedDrills: RunningDrill[],
  sessionType: 'STANDALONE' | 'PRE_WORKOUT' | 'POST_EASY_RUN'
): {
  structure: DrillSessionStructure;
  duration: number;
  integration: string;
} {

  const structure: DrillSessionStructure = {
    warmup: sessionType === 'STANDALONE' ? {
      duration: 5,
      activity: '5 minutes easy jogging'
    } : undefined,

    drills: selectedDrills.map(drill => ({
      drill: drill.name,
      sets: drill.sets,
      distance: drill.distance,
      rest: drill.rest,
      focus: drill.focus,
      technique_cues: getDrillCues(drill.name)
    })),

    cooldown: sessionType === 'STANDALONE' ? {
      duration: 5,
      activity: '5 minutes easy jogging + stretching'
    } : undefined
  };

  const duration = calculateSessionDuration(structure);
  const integration = getIntegrationGuidance(sessionType);

  return { structure, duration, integration };
}

interface DrillSessionStructure {
  warmup?: {
    duration: number;
    activity: string;
  };
  drills: {
    drill: string;
    sets: number;
    distance: number;
    rest: string;
    focus: string[];
    technique_cues: string[];
  }[];
  cooldown?: {
    duration: number;
    activity: string;
  };
}

function getDrillCues(drillName: string): string[] {
  const cueMap: { [key: string]: string[] } = {
    'A-March → A-Skip': [
      'Knee to waist height',
      'Midfoot landing under center of mass',
      'Tall posture, slight forward lean',
      'Arms drive straight back'
    ],
    'B-March → B-Skip': [
      'Leg extends forward then snaps back',
      'Powerful hamstring engagement',
      'Quick ground contacts',
      'Maintain rhythm and cadence'
    ],
    'Bounding': [
      'Emphasize both height and distance',
      'Drive knee up and forward',
      'Land on forefoot, absorb and rebound',
      'Exaggerated arm drive'
    ],
    'Strides': [
      'Gradual acceleration to 85-95% max',
      'Maintain relaxed form throughout',
      'Focus on leg turnover, not overstride',
      'Decelerate gradually, don\'t stop abruptly'
    ]
  };

  return cueMap[drillName] || ['Focus on proper form', 'Maintain rhythm'];
}

function calculateSessionDuration(structure: DrillSessionStructure): number {
  let duration = 0;

  if (structure.warmup) duration += structure.warmup.duration;
  if (structure.cooldown) duration += structure.cooldown.duration;

  // Estimate drill time (including rest)
  structure.drills.forEach(drill => {
    const timePerSet = 2; // ~2 minutes per set including rest
    duration += drill.sets * timePerSet;
  });

  return duration;
}

function getIntegrationGuidance(sessionType: string): string {
  switch (sessionType) {
    case 'PRE_WORKOUT':
      return 'Perform after general warmup, before main workout. Serves as neuromuscular activation.';
    case 'POST_EASY_RUN':
      return 'Perform immediately after easy run while muscles are warm. Focus on technique.';
    case 'STANDALONE':
      return 'Separate technical session. Allow 6+ hours from hard running workouts.';
    default:
      return 'Integrate based on training schedule and recovery status.';
  }
}
