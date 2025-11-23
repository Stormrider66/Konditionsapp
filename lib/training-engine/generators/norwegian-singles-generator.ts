/**
 * Norwegian Singles Program Generator
 *
 * Generates complete training programs following Norwegian Singles methodology:
 * - E-Q-E-Q-E-Q-LR weekly pattern (2-3 quality sessions)
 * - 20-25% quality volume, 75-80% easy volume
 * - Sub-threshold training at 2.3-3.0 mmol/L
 * - Sustainable for working athletes (5-9 hours/week)
 *
 * Program structure:
 * - 12-week base phase (2 quality → 3 quality progression)
 * - 8-week build phase (peak volume)
 * - 4-week competition phase (maintenance + races)
 * - Deload every 4th week
 */

import { PrismaClient } from '@prisma/client';
import {
  calculateNorwegianSinglesPaces,
  calculatePacesFromFieldTest
} from '../integration/norwegian-singles-validation';
import {
  DISTANCE_INTERVAL_SESSIONS,
  TIME_INTERVAL_SESSIONS,
  X_FACTOR_SESSIONS,
  WEEKLY_MICROCYCLES
} from '../sessions/norwegian-singles-templates';

export interface NorwegianSinglesProgram {
  id: string;
  clientId: string;
  name: string;
  methodology: 'NORWEGIAN_SINGLES';
  startDate: Date;
  endDate: Date;

  // Program configuration
  config: {
    baseWeeklyVolume: number; // km/week starting volume
    targetWeeklyVolume: number; // km/week peak volume
    qualitySessions: 2 | 3; // Quality sessions per week
    includeXFactor: boolean; // Include X-factor sessions

    // Pace targets (from test data)
    lt2Pace: number; // seconds per km
    pace1000m: number;
    pace2000m: number;
    pace3000m: number;
    easyPace: number;

    // Athlete constraints
    maxSessionDuration: number; // minutes
    availableDays: string[]; // Days athlete can train hard
    terrain: 'TRACK' | 'ROAD' | 'TRAIL' | 'MIXED';
  };

  // Generated program structure
  weeks: ProgramWeek[];
}

export interface ProgramWeek {
  weekNumber: number;
  phase: 'BASE' | 'BUILD' | 'PEAK' | 'COMPETITION';
  isDeload: boolean;
  targetVolume: number; // km for the week
  qualityVolume: number; // km of quality work
  days: ProgramDay[];
}

export interface ProgramDay {
  dayOfWeek: number; // 0-6 (Monday = 0)
  date: Date;
  sessionType: 'QUALITY' | 'EASY' | 'LONG' | 'REST';
  workout?: {
    name: string;
    description: string;
    distance?: number; // km
    duration?: number; // minutes
    intervals?: {
      reps: number;
      distance?: number; // meters
      duration?: number; // seconds
      pace: string;
      paceSeconds: number; // seconds per km
      rest: number; // seconds
    };
    targetHR: string;
    targetLactate?: [number, number];
    guidelines: string[];
  };
}

/**
 * Generate complete Norwegian Singles program
 */
export async function generateNorwegianSinglesProgram(
  clientId: string,
  config: {
    startDate: Date;
    durationWeeks: number;
    baseWeeklyVolume: number;
    targetWeeklyVolume: number;
    qualitySessions: 2 | 3;
    includeXFactor: boolean;
    fiveKTime?: number; // seconds
    fieldTestData?: {
      distance: number;
      duration: number;
      type: '20MIN' | '30MIN';
    };
    availableDays?: string[];
    maxSessionDuration?: number;
    terrain?: 'TRACK' | 'ROAD' | 'TRAIL' | 'MIXED';
  },
  prisma: PrismaClient
): Promise<NorwegianSinglesProgram> {

  // Fetch individual LT2 from most recent threshold calculation (d-max or field test)
  const recentTest = await prisma.test.findFirst({
    where: { clientId },
    orderBy: { testDate: 'desc' },
    include: {
      thresholdCalculation: true
    }
  });

  const individualLT2 = recentTest?.thresholdCalculation?.lt2Lactate || 4.0;

  // Calculate paces from test data (with individualized LT2)
  let paces;
  if (config.fiveKTime) {
    paces = calculateNorwegianSinglesPaces(config.fiveKTime, individualLT2);
  } else if (config.fieldTestData) {
    paces = calculatePacesFromFieldTest(
      config.fieldTestData.distance,
      config.fieldTestData.duration,
      config.fieldTestData.type,
      individualLT2
    );
  } else {
    throw new Error('Must provide either 5K time or field test data');
  }

  // Generate weekly structure
  const weeks: ProgramWeek[] = [];
  const endDate = new Date(config.startDate);
  endDate.setDate(endDate.getDate() + (config.durationWeeks * 7));

  for (let weekNum = 1; weekNum <= config.durationWeeks; weekNum++) {
    const week = generateWeek({
      weekNumber: weekNum,
      startDate: new Date(config.startDate.getTime() + ((weekNum - 1) * 7 * 24 * 60 * 60 * 1000)),
      baseVolume: config.baseWeeklyVolume,
      targetVolume: config.targetWeeklyVolume,
      qualitySessions: config.qualitySessions,
      includeXFactor: config.includeXFactor,
      totalWeeks: config.durationWeeks,
      paces,
      terrain: config.terrain || 'ROAD',
      availableDays: config.availableDays || ['tuesday', 'thursday', 'saturday']
    });

    weeks.push(week);
  }

  return {
    id: `NS_${clientId}_${Date.now()}`,
    clientId,
    name: 'Norwegian Singles Training Program',
    methodology: 'NORWEGIAN_SINGLES',
    startDate: config.startDate,
    endDate,
    config: {
      baseWeeklyVolume: config.baseWeeklyVolume,
      targetWeeklyVolume: config.targetWeeklyVolume,
      qualitySessions: config.qualitySessions,
      includeXFactor: config.includeXFactor,
      lt2Pace: paces.lt2Pace,
      pace1000m: paces.pace1000m,
      pace2000m: paces.pace2000m,
      pace3000m: paces.pace3000m,
      easyPace: paces.easyPace,
      maxSessionDuration: config.maxSessionDuration || 90,
      availableDays: config.availableDays || ['tuesday', 'thursday', 'saturday'],
      terrain: config.terrain || 'ROAD'
    },
    weeks
  };
}

/**
 * Generate single training week
 */
function generateWeek(params: {
  weekNumber: number;
  startDate: Date;
  baseVolume: number;
  targetVolume: number;
  qualitySessions: 2 | 3;
  includeXFactor: boolean;
  totalWeeks: number;
  paces: ReturnType<typeof calculateNorwegianSinglesPaces>;
  terrain: 'TRACK' | 'ROAD' | 'TRAIL' | 'MIXED';
  availableDays: string[];
}): ProgramWeek {

  // Determine training phase
  const phase = determinePhase(params.weekNumber, params.totalWeeks);

  // Check if deload week (every 4th week)
  const isDeload = params.weekNumber % 4 === 0;

  // Calculate week volume with progression
  const weekVolume = calculateWeeklyVolume(
    params.weekNumber,
    params.baseVolume,
    params.targetVolume,
    params.totalWeeks,
    isDeload
  );

  // Calculate quality volume (15-25% of weekly volume)
  const qualityPercentage = calculateQualityPercentage(params.weekNumber, params.totalWeeks, phase);
  const qualityVolume = weekVolume * qualityPercentage;

  // Generate daily workouts
  const days = generateWeeklySchedule({
    weekNumber: params.weekNumber,
    startDate: params.startDate,
    phase,
    isDeload,
    weekVolume,
    qualityVolume,
    qualitySessions: params.qualitySessions,
    includeXFactor: params.includeXFactor,
    paces: params.paces,
    terrain: params.terrain,
    availableDays: params.availableDays
  });

  return {
    weekNumber: params.weekNumber,
    phase,
    isDeload,
    targetVolume: weekVolume,
    qualityVolume,
    days
  };
}

/**
 * Determine training phase based on week number
 */
function determinePhase(weekNumber: number, totalWeeks: number): ProgramWeek['phase'] {
  const basePhaseWeeks = Math.min(12, Math.floor(totalWeeks * 0.5));
  const buildPhaseWeeks = Math.min(8, Math.floor(totalWeeks * 0.35));

  if (weekNumber <= basePhaseWeeks) {
    return 'BASE';
  } else if (weekNumber <= basePhaseWeeks + buildPhaseWeeks) {
    return 'BUILD';
  } else if (weekNumber <= totalWeeks - 4) {
    return 'PEAK';
  } else {
    return 'COMPETITION';
  }
}

/**
 * Calculate weekly volume with progressive overload
 */
function calculateWeeklyVolume(
  weekNumber: number,
  baseVolume: number,
  targetVolume: number,
  totalWeeks: number,
  isDeload: boolean
): number {
  if (isDeload) {
    // Deload = 75% of current volume
    const currentVolume = baseVolume + ((targetVolume - baseVolume) * ((weekNumber - 1) / totalWeeks));
    return Math.round(currentVolume * 0.75);
  }

  // Linear progression from base to target
  const progression = (targetVolume - baseVolume) * (weekNumber / totalWeeks);
  return Math.round(baseVolume + progression);
}

/**
 * Calculate quality volume percentage based on phase
 */
function calculateQualityPercentage(
  weekNumber: number,
  totalWeeks: number,
  phase: ProgramWeek['phase']
): number {
  switch (phase) {
    case 'BASE':
      // Start at 15%, progress to 20%
      return 0.15 + (0.05 * (weekNumber / (totalWeeks * 0.5)));
    case 'BUILD':
      // Peak at 20-25%
      return 0.23;
    case 'PEAK':
      return 0.25;
    case 'COMPETITION':
      // Reduce to 15-20%
      return 0.18;
    default:
      return 0.20;
  }
}

/**
 * Generate weekly training schedule
 */
function generateWeeklySchedule(params: {
  weekNumber: number;
  startDate: Date;
  phase: ProgramWeek['phase'];
  isDeload: boolean;
  weekVolume: number;
  qualityVolume: number;
  qualitySessions: 2 | 3;
  includeXFactor: boolean;
  paces: ReturnType<typeof calculateNorwegianSinglesPaces>;
  terrain: 'TRACK' | 'ROAD' | 'TRAIL' | 'MIXED';
  availableDays: string[];
}): ProgramDay[] {

  const days: ProgramDay[] = [];

  // Determine pattern based on quality sessions
  let pattern: string[];
  if (params.qualitySessions === 2) {
    pattern = ['E', 'Q', 'E', 'Q', 'E', 'E', 'LR']; // Mon-Sun
  } else {
    pattern = ['E', 'Q', 'E', 'Q', 'E', 'Q', 'LR']; // Mon-Sun
  }

  // Calculate distances for each day type
  const longRunDistance = params.weekVolume * 0.25; // 20-30% of weekly volume
  const qualitySessionDistance = params.qualityVolume / params.qualitySessions;
  const easyDays = pattern.filter(d => d === 'E').length;
  const easyRunDistance = (params.weekVolume - longRunDistance - params.qualityVolume) / easyDays;

  // Track which quality session number we're on
  let qualitySessionNum = 0;

  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const date = new Date(params.startDate);
    date.setDate(date.getDate() + dayIndex);

    const dayType = pattern[dayIndex];

    if (dayType === 'Q') {
      qualitySessionNum++;
      days.push(generateQualityDay({
        dayOfWeek: dayIndex,
        date,
        sessionNumber: qualitySessionNum,
        totalQualitySessions: params.qualitySessions,
        phase: params.phase,
        isDeload: params.isDeload,
        targetDistance: qualitySessionDistance,
        paces: params.paces,
        terrain: params.terrain,
        includeXFactor: params.includeXFactor && qualitySessionNum === 3
      }));
    } else if (dayType === 'LR') {
      days.push(generateLongRun(dayIndex, date, longRunDistance, params.paces.easyPace));
    } else if (dayType === 'E') {
      days.push(generateEasyRun(dayIndex, date, easyRunDistance, params.paces.easyPace));
    }
  }

  return days;
}

/**
 * Generate quality training day
 */
function generateQualityDay(params: {
  dayOfWeek: number;
  date: Date;
  sessionNumber: number;
  totalQualitySessions: number;
  phase: ProgramWeek['phase'];
  isDeload: boolean;
  targetDistance: number; // km of quality work
  paces: ReturnType<typeof calculateNorwegianSinglesPaces>;
  terrain: 'TRACK' | 'ROAD' | 'TRAIL' | 'MIXED';
  includeXFactor: boolean;
}): ProgramDay {

  // If X-factor day, use hill repeats
  if (params.includeXFactor) {
    const xFactorSession = X_FACTOR_SESSIONS[0]; // 20x200m hills

    return {
      dayOfWeek: params.dayOfWeek,
      date: params.date,
      sessionType: 'QUALITY',
      workout: {
        name: xFactorSession.name,
        description: xFactorSession.description,
        distance: 8, // Approximate
        duration: 65,
        intervals: {
          reps: params.isDeload ? 15 : 20,
          distance: 200,
          pace: '800m-1500m race pace',
          paceSeconds: params.paces.pace1000m - 30, // Significantly faster than threshold
          rest: 70
        },
        targetHR: xFactorSession.targetHR,
        targetLactate: xFactorSession.targetLactate,
        guidelines: xFactorSession.stopConditions
      }
    };
  }

  // Select session based on session number and phase
  const session = selectQualitySession({
    sessionNumber: params.sessionNumber,
    phase: params.phase,
    terrain: params.terrain,
    targetDistance: params.targetDistance
  });

  // Adjust reps if deload week
  const reps = params.isDeload
    ? Math.ceil(session.baseReps * 0.75)
    : session.baseReps;

  return {
    dayOfWeek: params.dayOfWeek,
    date: params.date,
    sessionType: 'QUALITY',
    workout: {
      name: session.name,
      description: session.description,
      distance: session.totalDistance,
      duration: session.estimatedDuration,
      intervals: {
        reps,
        distance: session.intervalDistance,
        pace: session.paceDescription,
        paceSeconds: session.paceSeconds(params.paces),
        rest: session.rest
      },
      targetHR: '82-87% HRmax (may drift to 86-91%)',
      targetLactate: [2.3, 3.0],
      guidelines: [
        'Maintain "comfortably hard" effort',
        'Can speak short sentences (4-8 words)',
        'STOP if HR exceeds 92% HRmax',
        'Each rep should feel sustainable'
      ]
    }
  };
}

/**
 * Select appropriate quality session
 */
function selectQualitySession(params: {
  sessionNumber: number;
  phase: ProgramWeek['phase'];
  terrain: 'TRACK' | 'ROAD' | 'TRAIL' | 'MIXED';
  targetDistance: number;
}) {
  // Define session library
  const sessions = {
    BASE: [
      {
        name: '6x1000m',
        description: 'Short intervals at 10K-15K pace',
        baseReps: 6,
        intervalDistance: 1000,
        totalDistance: 10,
        estimatedDuration: 60,
        rest: 60,
        paceDescription: '10K-15K pace',
        paceSeconds: (paces: any) => paces.pace1000m
      },
      {
        name: '4x2000m',
        description: 'Medium intervals at HM pace',
        baseReps: 4,
        intervalDistance: 2000,
        totalDistance: 12,
        estimatedDuration: 70,
        rest: 75,
        paceDescription: 'Half marathon pace',
        paceSeconds: (paces: any) => paces.pace2000m
      },
      {
        name: '3x3000m',
        description: 'Long intervals at 30K pace',
        baseReps: 3,
        intervalDistance: 3000,
        totalDistance: 13,
        estimatedDuration: 75,
        rest: 90,
        paceDescription: '30K pace',
        paceSeconds: (paces: any) => paces.pace3000m
      }
    ],
    BUILD: [
      {
        name: '8-10x1000m',
        description: 'Extended short intervals',
        baseReps: 9,
        intervalDistance: 1000,
        totalDistance: 13,
        estimatedDuration: 75,
        rest: 60,
        paceDescription: '10K pace',
        paceSeconds: (paces: any) => paces.pace1000m
      },
      {
        name: '5x2000m',
        description: 'Extended medium intervals',
        baseReps: 5,
        intervalDistance: 2000,
        totalDistance: 14,
        estimatedDuration: 80,
        rest: 75,
        paceDescription: 'Half marathon pace',
        paceSeconds: (paces: any) => paces.pace2000m
      },
      {
        name: '3-4x10min',
        description: 'Long time-based intervals',
        baseReps: 4,
        intervalDistance: 0, // Time-based
        totalDistance: 14,
        estimatedDuration: 85,
        rest: 90,
        paceDescription: 'HM-30K pace',
        paceSeconds: (paces: any) => paces.pace3000m
      }
    ]
  };

  const phaseLibrary = params.phase === 'BASE' ? sessions.BASE : sessions.BUILD;

  // Rotate through session types
  const sessionIndex = (params.sessionNumber - 1) % phaseLibrary.length;
  return phaseLibrary[sessionIndex];
}

/**
 * Generate easy run day
 */
function generateEasyRun(
  dayOfWeek: number,
  date: Date,
  distance: number,
  easyPace: number
): ProgramDay {
  return {
    dayOfWeek,
    date,
    sessionType: 'EASY',
    workout: {
      name: `Easy Run (${Math.round(distance)} km)`,
      description: 'Recovery run at conversational pace. Truly easy.',
      distance: Math.round(distance),
      duration: Math.round((distance * easyPace) / 60),
      targetHR: '<70% HRmax',
      guidelines: [
        'Conversational pace - can speak full sentences',
        'Should feel "extremely slow" if new to polarized training',
        'Purpose: Recovery + volume accumulation',
        'If feels hard → running too fast'
      ]
    }
  };
}

/**
 * Generate long run day
 */
function generateLongRun(
  dayOfWeek: number,
  date: Date,
  distance: number,
  easyPace: number
): ProgramDay {
  return {
    dayOfWeek,
    date,
    sessionType: 'LONG',
    workout: {
      name: `Long Run (${Math.round(distance)} km)`,
      description: 'Sunday long run. SAME pace as easy runs, just longer.',
      distance: Math.round(distance),
      duration: Math.round((distance * easyPace) / 60),
      targetHR: '<70% HRmax',
      guidelines: [
        'Same effort as weekday easy runs (not slower)',
        '75-90 minute duration target',
        'Do NOT combine with quality work',
        'Pure easy pace for entire duration',
        'Kristoffer: "Same pace as my easy runs, just longer"'
      ]
    }
  };
}

/**
 * Export program to database format
 */
export async function saveNorwegianSinglesProgram(
  program: NorwegianSinglesProgram,
  prisma: PrismaClient
) {
  // Convert program to database format
  const periodization = program.weeks.map(week => ({
    week: week.weekNumber,
    phase: week.phase,
    volume: week.targetVolume,
    quality: week.qualityVolume,
    isDeload: week.isDeload
  }));

  // Save to database
  const savedProgram = await prisma.trainingProgramEngine.create({
    data: {
      clientId: program.clientId,
      name: program.name,
      methodology: program.methodology,
      status: 'ACTIVE',
      startDate: program.startDate,
      endDate: program.endDate,
      currentWeek: 1,
      currentPhase: 'BASE',
      periodization: JSON.stringify(periodization),
      weeklyPlans: JSON.stringify(program.weeks),
      targetRaces: JSON.stringify([]),
      volumeProgression: JSON.stringify({
        base: program.config.baseWeeklyVolume,
        target: program.config.targetWeeklyVolume
      }),
      config: JSON.stringify(program.config)
    }
  });

  return savedProgram;
}
