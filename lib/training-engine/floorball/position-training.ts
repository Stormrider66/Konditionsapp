/**
 * Floorball (Innebandy) Position-Specific Training Definitions
 *
 * Provides position-specific physical profiles, training recommendations,
 * season periodization, and injury prevention for floorball players.
 */

// ==================== TYPES ====================

export type FloorballPosition = 'goalkeeper' | 'defender' | 'center' | 'forward';

export type SeasonPhase = 'off_season' | 'pre_season' | 'in_season' | 'playoffs';

export interface PositionProfile {
  position: FloorballPosition;
  displayName: string;
  description: string;
  physicalDemands: {
    aerobicCapacity: 'low' | 'moderate' | 'high' | 'very_high';
    sprintDemand: 'low' | 'moderate' | 'high' | 'very_high';
    agilityDemand: 'low' | 'moderate' | 'high' | 'very_high';
    stickWork: 'low' | 'moderate' | 'high' | 'very_high';
    shootingPower: 'low' | 'moderate' | 'high' | 'very_high';
    lowBodyPosition: 'low' | 'moderate' | 'high' | 'very_high';
  };
  avgMatchDistanceKm: { min: number; max: number };
  avgSprintsPerMatch: { min: number; max: number };
  avgShiftsPerMatch: { min: number; max: number };
  avgShiftLengthSec: { min: number; max: number };
  commonInjuries: string[];
  keyPhysicalAttributes: string[];
}

export interface ExerciseRecommendation {
  name: string;
  category: 'strength' | 'power' | 'endurance' | 'agility' | 'mobility' | 'prevention';
  setsReps: string;
  notes: string;
  priority: 'essential' | 'recommended' | 'optional';
}

export interface SeasonPhaseTraining {
  phase: SeasonPhase;
  displayName: string;
  durationWeeks: { min: number; max: number };
  focus: string[];
  strengthEmphasis: string;
  conditioningEmphasis: string;
  matchdayProtocol: MatchdayProtocol;
  weeklyStructure: {
    strengthSessions: number;
    conditioningSessions: number;
    technicalSessions: number;
    restDays: number;
  };
}

export interface MatchdayProtocol {
  'MD-3': string[];
  'MD-2': string[];
  'MD-1': string[];
  'MD': string[];
  'MD+1': string[];
  'MD+2': string[];
}

export interface PhysicalBenchmarks {
  position: FloorballPosition;
  elite: {
    yoyoIR1Level: number;
    beepTestLevel: number;
    sprint20m: number;
    sprint30m: number;
    agilityTest: number; // 5-10-5 shuttle
    standingLongJump: number; // cm
  };
  good: {
    yoyoIR1Level: number;
    beepTestLevel: number;
    sprint20m: number;
    sprint30m: number;
    agilityTest: number;
    standingLongJump: number;
  };
}

// ==================== POSITION PROFILES ====================

export const FLOORBALL_POSITION_PROFILES: Record<FloorballPosition, PositionProfile> = {
  goalkeeper: {
    position: 'goalkeeper',
    displayName: 'Målvakt',
    description: 'Sista utposten - reaktion, positionering och benarbete utan klubba',
    physicalDemands: {
      aerobicCapacity: 'moderate',
      sprintDemand: 'low',
      agilityDemand: 'very_high',
      stickWork: 'low',
      shootingPower: 'low',
      lowBodyPosition: 'very_high',
    },
    avgMatchDistanceKm: { min: 0.5, max: 1.5 },
    avgSprintsPerMatch: { min: 5, max: 15 },
    avgShiftsPerMatch: { min: 1, max: 1 }, // Plays whole match typically
    avgShiftLengthSec: { min: 1200, max: 1800 }, // 20-30 min periods
    commonInjuries: ['hip', 'groin', 'knee', 'ankle', 'back'],
    keyPhysicalAttributes: ['Reaktionsförmåga', 'Lateral rörlighet', 'Flexibilitet', 'Benarbete'],
  },
  defender: {
    position: 'defender',
    displayName: 'Back',
    description: 'Defensiv stabilitet - täcker ytor, bryter spel och startar anfall',
    physicalDemands: {
      aerobicCapacity: 'high',
      sprintDemand: 'high',
      agilityDemand: 'high',
      stickWork: 'high',
      shootingPower: 'moderate',
      lowBodyPosition: 'high',
    },
    avgMatchDistanceKm: { min: 4.0, max: 5.5 },
    avgSprintsPerMatch: { min: 30, max: 50 },
    avgShiftsPerMatch: { min: 15, max: 25 },
    avgShiftLengthSec: { min: 45, max: 90 },
    commonInjuries: ['groin', 'hamstring', 'knee', 'ankle', 'back'],
    keyPhysicalAttributes: ['Positionering', 'Tacklingsstyrka', 'Speluppbyggnad', 'Uthållighet'],
  },
  center: {
    position: 'center',
    displayName: 'Center',
    description: 'Spelmotor - täcker hela planen, defensivt och offensivt arbete',
    physicalDemands: {
      aerobicCapacity: 'very_high',
      sprintDemand: 'very_high',
      agilityDemand: 'very_high',
      stickWork: 'very_high',
      shootingPower: 'high',
      lowBodyPosition: 'high',
    },
    avgMatchDistanceKm: { min: 5.0, max: 7.0 },
    avgSprintsPerMatch: { min: 45, max: 70 },
    avgShiftsPerMatch: { min: 18, max: 28 },
    avgShiftLengthSec: { min: 40, max: 80 },
    commonInjuries: ['groin', 'hamstring', 'knee', 'ankle', 'hip'],
    keyPhysicalAttributes: ['Uthållighet', 'Arbetskapacitet', 'Teknik', 'Spelsinne'],
  },
  forward: {
    position: 'forward',
    displayName: 'Forward/Ytter',
    description: 'Offensiv spets - skapar lägen, avslutar och pressar högt',
    physicalDemands: {
      aerobicCapacity: 'high',
      sprintDemand: 'very_high',
      agilityDemand: 'very_high',
      stickWork: 'very_high',
      shootingPower: 'very_high',
      lowBodyPosition: 'moderate',
    },
    avgMatchDistanceKm: { min: 4.5, max: 6.0 },
    avgSprintsPerMatch: { min: 40, max: 65 },
    avgShiftsPerMatch: { min: 15, max: 25 },
    avgShiftLengthSec: { min: 35, max: 70 },
    commonInjuries: ['hamstring', 'groin', 'ankle', 'knee', 'wrist'],
    keyPhysicalAttributes: ['Snabbhet', 'Avslut', 'Teknik', 'Kreativitet'],
  },
};

// ==================== SEASON PHASE TRAINING ====================

export const FLOORBALL_SEASON_PHASES: Record<SeasonPhase, SeasonPhaseTraining> = {
  off_season: {
    phase: 'off_season',
    displayName: 'Off-season',
    durationWeeks: { min: 8, max: 12 },
    focus: [
      'Aerob basträning',
      'Maxstyrka',
      'Rörlighet och mobilitet',
      'Skaderehabilitering',
      'Teknisk utveckling',
    ],
    strengthEmphasis: 'Hypertrofi och maxstyrka (4-8 rep, 70-85% 1RM)',
    conditioningEmphasis: 'Aerob bas (låg-medel intensitet, 30-60 min löpning/cykel)',
    matchdayProtocol: {
      'MD-3': ['Ingen match'],
      'MD-2': ['Ingen match'],
      'MD-1': ['Ingen match'],
      'MD': ['Ingen match'],
      'MD+1': ['Ingen match'],
      'MD+2': ['Ingen match'],
    },
    weeklyStructure: {
      strengthSessions: 4,
      conditioningSessions: 3,
      technicalSessions: 2,
      restDays: 1,
    },
  },
  pre_season: {
    phase: 'pre_season',
    displayName: 'Försäsong',
    durationWeeks: { min: 6, max: 8 },
    focus: [
      'Explosiv styrka',
      'Intervallträning',
      'Snabbhet och agility',
      'Sport-specifik kondition',
      'Taktisk träning',
    ],
    strengthEmphasis: 'Power och explosivitet (3-5 rep, 75-90% 1RM + plyometrics)',
    conditioningEmphasis: 'Intervaller (20-60 sek arbete, matchsimulering)',
    matchdayProtocol: {
      'MD-3': ['Styrka (underkropp)', 'Teknik'],
      'MD-2': ['Intervaller', 'Taktik'],
      'MD-1': ['Aktivering', 'Lätt teknik'],
      'MD': ['Träningsmatch'],
      'MD+1': ['Aktiv vila', 'Pool/cykel'],
      'MD+2': ['Styrka (överkropp)', 'Mobilitet'],
    },
    weeklyStructure: {
      strengthSessions: 3,
      conditioningSessions: 3,
      technicalSessions: 4,
      restDays: 1,
    },
  },
  in_season: {
    phase: 'in_season',
    displayName: 'Säsong',
    durationWeeks: { min: 20, max: 28 },
    focus: [
      'Underhåll av fysik',
      'Matchförberedelse',
      'Återhämtning',
      'Skadeförebyggande',
      'Taktiska justeringar',
    ],
    strengthEmphasis: 'Underhåll (2-4 rep, 80-90% 1RM, låg volym)',
    conditioningEmphasis: 'Matchspecifik (korta intervaller vid behov)',
    matchdayProtocol: {
      'MD-3': ['Styrka', 'Lagträning'],
      'MD-2': ['Lagträning', 'Taktik', 'Fasta situationer'],
      'MD-1': ['Aktivering', 'Skott', 'Mental förberedelse'],
      'MD': ['Match'],
      'MD+1': ['Aktiv återhämtning', 'Pool', 'Stretching'],
      'MD+2': ['Styrka (lätt)', 'Teknik'],
    },
    weeklyStructure: {
      strengthSessions: 2,
      conditioningSessions: 1,
      technicalSessions: 4,
      restDays: 1,
    },
  },
  playoffs: {
    phase: 'playoffs',
    displayName: 'Slutspel',
    durationWeeks: { min: 2, max: 6 },
    focus: [
      'Optimal återhämtning',
      'Mental skärpa',
      'Matchskärpa',
      'Skadehantering',
      'Lagsammanhållning',
    ],
    strengthEmphasis: 'Aktivering endast (lätt, explosivt)',
    conditioningEmphasis: 'Minimal - endast aktivering',
    matchdayProtocol: {
      'MD-3': ['Lätt lagträning', 'Video'],
      'MD-2': ['Lätt teknik', 'Fasta situationer'],
      'MD-1': ['Aktivering', 'Mental förberedelse', 'Vila'],
      'MD': ['Match'],
      'MD+1': ['Aktiv återhämtning', 'Behandling'],
      'MD+2': ['Lätt aktivering', 'Taktik'],
    },
    weeklyStructure: {
      strengthSessions: 1,
      conditioningSessions: 0,
      technicalSessions: 3,
      restDays: 2,
    },
  },
};

// ==================== PHYSICAL BENCHMARKS ====================

export const FLOORBALL_BENCHMARKS: Record<FloorballPosition, PhysicalBenchmarks> = {
  goalkeeper: {
    position: 'goalkeeper',
    elite: {
      yoyoIR1Level: 17.0,
      beepTestLevel: 11.0,
      sprint20m: 3.20,
      sprint30m: 4.40,
      agilityTest: 4.8,
      standingLongJump: 230,
    },
    good: {
      yoyoIR1Level: 15.5,
      beepTestLevel: 10.0,
      sprint20m: 3.35,
      sprint30m: 4.60,
      agilityTest: 5.2,
      standingLongJump: 215,
    },
  },
  defender: {
    position: 'defender',
    elite: {
      yoyoIR1Level: 19.5,
      beepTestLevel: 12.5,
      sprint20m: 3.05,
      sprint30m: 4.20,
      agilityTest: 4.5,
      standingLongJump: 260,
    },
    good: {
      yoyoIR1Level: 18.0,
      beepTestLevel: 11.5,
      sprint20m: 3.20,
      sprint30m: 4.40,
      agilityTest: 4.9,
      standingLongJump: 245,
    },
  },
  center: {
    position: 'center',
    elite: {
      yoyoIR1Level: 21.0,
      beepTestLevel: 13.5,
      sprint20m: 3.00,
      sprint30m: 4.15,
      agilityTest: 4.4,
      standingLongJump: 265,
    },
    good: {
      yoyoIR1Level: 19.5,
      beepTestLevel: 12.5,
      sprint20m: 3.15,
      sprint30m: 4.35,
      agilityTest: 4.8,
      standingLongJump: 250,
    },
  },
  forward: {
    position: 'forward',
    elite: {
      yoyoIR1Level: 20.0,
      beepTestLevel: 13.0,
      sprint20m: 2.95,
      sprint30m: 4.10,
      agilityTest: 4.3,
      standingLongJump: 270,
    },
    good: {
      yoyoIR1Level: 18.5,
      beepTestLevel: 12.0,
      sprint20m: 3.10,
      sprint30m: 4.30,
      agilityTest: 4.7,
      standingLongJump: 255,
    },
  },
};

// ==================== INJURY PREVENTION ====================

export const INJURY_PREVENTION_EXERCISES: Record<string, ExerciseRecommendation[]> = {
  groin: [
    {
      name: 'Copenhagen Adductor',
      category: 'prevention',
      setsReps: '3x8 per sida',
      notes: 'Gradvis progression, börja med kort hävarm',
      priority: 'essential',
    },
    {
      name: 'Side-lying Hip Adduction',
      category: 'strength',
      setsReps: '3x12 per sida',
      notes: 'Lyft underbenet, håll kvar i toppen',
      priority: 'recommended',
    },
    {
      name: 'Lateral Lunge',
      category: 'strength',
      setsReps: '3x10 per sida',
      notes: 'Kontrollerad rörelse, aktivera adduktorer',
      priority: 'recommended',
    },
  ],
  hamstring: [
    {
      name: 'Nordic Hamstring Curl',
      category: 'prevention',
      setsReps: '3x5-8',
      notes: 'Kontrollerad excentrisk fas, partner eller maskin',
      priority: 'essential',
    },
    {
      name: 'Single Leg RDL',
      category: 'strength',
      setsReps: '3x8 per ben',
      notes: 'Håll ryggen rak, aktivera hamstrings',
      priority: 'essential',
    },
    {
      name: 'Glute Bridge March',
      category: 'prevention',
      setsReps: '3x10 per ben',
      notes: 'Höften stabil, aktivera gluteus',
      priority: 'recommended',
    },
  ],
  knee: [
    {
      name: 'Terminal Knee Extension',
      category: 'prevention',
      setsReps: '3x15 per ben',
      notes: 'Band runt knä, aktivera VMO',
      priority: 'essential',
    },
    {
      name: 'Single Leg Squat to Box',
      category: 'strength',
      setsReps: '3x8 per ben',
      notes: 'Kontrollera knäposition, låt inte knät falla inåt',
      priority: 'essential',
    },
    {
      name: 'Step Downs',
      category: 'prevention',
      setsReps: '3x10 per ben',
      notes: 'Långsam kontrollerad rörelse',
      priority: 'recommended',
    },
  ],
  ankle: [
    {
      name: 'Calf Raises',
      category: 'strength',
      setsReps: '3x15',
      notes: 'Full range of motion, båda raka och böjda knän',
      priority: 'essential',
    },
    {
      name: 'Single Leg Balance',
      category: 'prevention',
      setsReps: '3x30 sek per ben',
      notes: 'Progressera till instabil yta och stängda ögon',
      priority: 'essential',
    },
    {
      name: 'Ankle Circles',
      category: 'mobility',
      setsReps: '2x10 per riktning',
      notes: 'Stor cirkelrörelse',
      priority: 'optional',
    },
  ],
  hip: [
    {
      name: 'Hip 90/90 Stretch',
      category: 'mobility',
      setsReps: '3x30 sek per sida',
      notes: 'Håll ryggen rak',
      priority: 'essential',
    },
    {
      name: 'Clamshell',
      category: 'prevention',
      setsReps: '3x15 per sida',
      notes: 'Aktivera gluteus medius',
      priority: 'essential',
    },
    {
      name: 'Hip Flexor Stretch',
      category: 'mobility',
      setsReps: '3x30 sek per sida',
      notes: 'Knästående, pressa höften framåt',
      priority: 'recommended',
    },
  ],
  back: [
    {
      name: 'Bird Dog',
      category: 'prevention',
      setsReps: '3x10 per sida',
      notes: 'Aktivera core, håll ryggen neutral',
      priority: 'essential',
    },
    {
      name: 'Dead Bug',
      category: 'prevention',
      setsReps: '3x10 per sida',
      notes: 'Pressa ländryggen mot golvet',
      priority: 'essential',
    },
    {
      name: 'Cat-Cow',
      category: 'mobility',
      setsReps: '2x10',
      notes: 'Långsam, kontrollerad rörelse',
      priority: 'recommended',
    },
  ],
  wrist: [
    {
      name: 'Wrist Curls',
      category: 'strength',
      setsReps: '3x15',
      notes: 'Lätt vikt, full rörelseomfång',
      priority: 'recommended',
    },
    {
      name: 'Wrist Rotations',
      category: 'mobility',
      setsReps: '2x10 per riktning',
      notes: 'Med lätt vikt eller klubba',
      priority: 'optional',
    },
  ],
};

// ==================== UTILITY FUNCTIONS ====================

export function getPositionRecommendations(position: FloorballPosition): ExerciseRecommendation[] {
  const profile = FLOORBALL_POSITION_PROFILES[position];
  const recommendations: ExerciseRecommendation[] = [];

  // Add injury prevention exercises based on common injuries for the position
  profile.commonInjuries.forEach((injury) => {
    const exercises = INJURY_PREVENTION_EXERCISES[injury];
    if (exercises) {
      recommendations.push(...exercises.filter((e) => e.priority === 'essential'));
    }
  });

  // Add position-specific exercises
  if (position === 'goalkeeper') {
    recommendations.push({
      name: 'Lateral Bound',
      category: 'power',
      setsReps: '3x6 per sida',
      notes: 'Explosiv sidoförflyttning, stabil landning',
      priority: 'essential',
    });
    recommendations.push({
      name: 'Split Squat Hold',
      category: 'strength',
      setsReps: '3x30 sek per ben',
      notes: 'Låg position, simulerar målvaktsställning',
      priority: 'essential',
    });
  } else if (position === 'defender') {
    recommendations.push({
      name: 'Lateral Shuffle',
      category: 'agility',
      setsReps: '4x10m',
      notes: 'Låg position, snabba fötter',
      priority: 'essential',
    });
    recommendations.push({
      name: 'Goblet Squat',
      category: 'strength',
      setsReps: '3x10',
      notes: 'Djup position för spelarbete',
      priority: 'essential',
    });
  } else if (position === 'center') {
    recommendations.push({
      name: 'Shuttle Run (5-10-5)',
      category: 'agility',
      setsReps: '6x',
      notes: 'Snabba vändningar, låg position',
      priority: 'essential',
    });
    recommendations.push({
      name: 'Box Jump',
      category: 'power',
      setsReps: '3x8',
      notes: 'Fokus på snabb respons från golvet',
      priority: 'essential',
    });
  } else if (position === 'forward') {
    recommendations.push({
      name: 'Sprint Starts',
      category: 'power',
      setsReps: '6x10m',
      notes: 'Explosiv start från stående',
      priority: 'essential',
    });
    recommendations.push({
      name: 'Medicine Ball Rotation',
      category: 'power',
      setsReps: '3x10 per sida',
      notes: 'Simulerar skottrörelse',
      priority: 'essential',
    });
  }

  return recommendations;
}

export function getSeasonPhaseTraining(phase: SeasonPhase): SeasonPhaseTraining {
  return FLOORBALL_SEASON_PHASES[phase];
}

export function getPhysicalBenchmarks(position: FloorballPosition): PhysicalBenchmarks {
  return FLOORBALL_BENCHMARKS[position];
}

export function calculateBenchmarkPercentage(
  actual: number,
  benchmarkValue: number,
  lowerIsBetter: boolean = false
): number {
  if (lowerIsBetter) {
    return Math.round((benchmarkValue / actual) * 100);
  }
  return Math.round((actual / benchmarkValue) * 100);
}

export function getBenchmarkRating(
  actual: number,
  elite: number,
  good: number,
  lowerIsBetter: boolean = false
): 'elite' | 'good' | 'developing' {
  if (lowerIsBetter) {
    if (actual <= elite) return 'elite';
    if (actual <= good) return 'good';
    return 'developing';
  } else {
    if (actual >= elite) return 'elite';
    if (actual >= good) return 'good';
    return 'developing';
  }
}

// ==================== SHIFT/LOAD MONITORING ====================

export interface ShiftData {
  shiftNumber: number;
  durationSec: number;
  distanceM: number;
  sprintCount: number;
  maxSpeed: number;
  avgHeartRate: number;
}

export interface MatchLoadData {
  totalDistance: number;
  highIntensityDistance: number;
  sprintDistance: number;
  numberOfShifts: number;
  avgShiftDuration: number;
  totalPlayingTime: number;
  accelerations: number;
  decelerations: number;
}

export function calculateMatchLoadScore(data: MatchLoadData, position: FloorballPosition): number {
  const profile = FLOORBALL_POSITION_PROFILES[position];

  let score = 0;

  // Distance factor
  const avgDistance = (profile.avgMatchDistanceKm.min + profile.avgMatchDistanceKm.max) / 2;
  score += (data.totalDistance / 1000 / avgDistance) * 25;

  // Sprint factor
  const avgSprints = (profile.avgSprintsPerMatch.min + profile.avgSprintsPerMatch.max) / 2;
  const estimatedSprints = data.sprintDistance / 25; // ~25m per sprint average
  score += (estimatedSprints / avgSprints) * 25;

  // Shift factor
  const avgShifts = (profile.avgShiftsPerMatch.min + profile.avgShiftsPerMatch.max) / 2;
  score += (data.numberOfShifts / avgShifts) * 25;

  // High intensity factor
  score += ((data.accelerations + data.decelerations) / 80) * 25;

  return Math.round(score);
}

export function getLoadStatus(score: number): {
  status: 'low' | 'optimal' | 'high' | 'very_high';
  color: string;
  recommendation: string;
} {
  if (score < 70) {
    return {
      status: 'low',
      color: 'blue',
      recommendation: 'Låg matchbelastning - överväg extra konditionspass',
    };
  } else if (score <= 100) {
    return {
      status: 'optimal',
      color: 'green',
      recommendation: 'Optimal matchbelastning - fortsätt som planerat',
    };
  } else if (score <= 130) {
    return {
      status: 'high',
      color: 'yellow',
      recommendation: 'Hög belastning - prioritera återhämtning',
    };
  } else {
    return {
      status: 'very_high',
      color: 'red',
      recommendation: 'Mycket hög belastning - extra vila och övervakning',
    };
  }
}

// Default export
const floorballTrainingModule = {
  FLOORBALL_POSITION_PROFILES,
  FLOORBALL_SEASON_PHASES,
  FLOORBALL_BENCHMARKS,
  INJURY_PREVENTION_EXERCISES,
  getPositionRecommendations,
  getSeasonPhaseTraining,
  getPhysicalBenchmarks,
  calculateBenchmarkPercentage,
  getBenchmarkRating,
  calculateMatchLoadScore,
  getLoadStatus,
};

export default floorballTrainingModule;
