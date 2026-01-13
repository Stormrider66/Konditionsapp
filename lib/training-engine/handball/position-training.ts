/**
 * Handball Position-Specific Training Definitions
 *
 * Provides position-specific physical profiles, training recommendations,
 * season periodization, and injury prevention for handball players.
 */

// ==================== TYPES ====================

export type HandballPosition = 'goalkeeper' | 'wing' | 'back' | 'center_back' | 'pivot';

export type SeasonPhase = 'off_season' | 'pre_season' | 'in_season' | 'playoffs';

export interface PositionProfile {
  position: HandballPosition;
  displayName: string;
  description: string;
  physicalDemands: {
    aerobicCapacity: 'low' | 'moderate' | 'high' | 'very_high';
    sprintDemand: 'low' | 'moderate' | 'high' | 'very_high';
    jumpingDemand: 'low' | 'moderate' | 'high' | 'very_high';
    throwingPower: 'low' | 'moderate' | 'high' | 'very_high';
    contactDuels: 'low' | 'moderate' | 'high' | 'very_high';
    agility: 'low' | 'moderate' | 'high' | 'very_high';
  };
  avgMatchDistanceKm: { min: number; max: number };
  avgSprintsPerMatch: { min: number; max: number };
  avgJumpsPerMatch: { min: number; max: number };
  avgThrowsPerMatch: { min: number; max: number };
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
  position: HandballPosition;
  elite: {
    yoyoIR1Level: number;
    yoyoIR2Level: number;
    sprint10m: number;
    sprint20m: number;
    cmjHeight: number;
    medicineBallThrow: number; // kg ball, meters
    tTestAgility: number; // seconds
  };
  good: {
    yoyoIR1Level: number;
    yoyoIR2Level: number;
    sprint10m: number;
    sprint20m: number;
    cmjHeight: number;
    medicineBallThrow: number;
    tTestAgility: number;
  };
}

// ==================== POSITION PROFILES ====================

export const HANDBALL_POSITION_PROFILES: Record<HandballPosition, PositionProfile> = {
  goalkeeper: {
    position: 'goalkeeper',
    displayName: 'Målvakt',
    description: 'Sista utposten - reaktionsförmåga, positionering och explosivitet',
    physicalDemands: {
      aerobicCapacity: 'moderate',
      sprintDemand: 'low',
      jumpingDemand: 'high',
      throwingPower: 'moderate',
      contactDuels: 'low',
      agility: 'very_high',
    },
    avgMatchDistanceKm: { min: 1.5, max: 2.5 },
    avgSprintsPerMatch: { min: 5, max: 15 },
    avgJumpsPerMatch: { min: 30, max: 60 },
    avgThrowsPerMatch: { min: 10, max: 25 },
    commonInjuries: ['shoulder', 'hip', 'knee', 'finger', 'groin'],
    keyPhysicalAttributes: ['Reaktionsförmåga', 'Lateral rörlighet', 'Explosiv kraft', 'Flexibilitet'],
  },
  wing: {
    position: 'wing',
    displayName: 'Ytter',
    description: 'Snabb och smidig - löpningar, genombrott och avslut från vinkel',
    physicalDemands: {
      aerobicCapacity: 'very_high',
      sprintDemand: 'very_high',
      jumpingDemand: 'high',
      throwingPower: 'moderate',
      contactDuels: 'moderate',
      agility: 'very_high',
    },
    avgMatchDistanceKm: { min: 4.0, max: 5.5 },
    avgSprintsPerMatch: { min: 40, max: 70 },
    avgJumpsPerMatch: { min: 15, max: 30 },
    avgThrowsPerMatch: { min: 5, max: 15 },
    commonInjuries: ['ankle', 'knee_acl', 'hamstring', 'shoulder', 'groin'],
    keyPhysicalAttributes: ['Sprintsnabbhet', 'Kvickhet', 'Hoppkraft', 'Uthållighet'],
  },
  back: {
    position: 'back',
    displayName: 'Vänster-/Högernia',
    description: 'Skyttekung - kraftfulla avslut, genombrott och speluppbyggnad',
    physicalDemands: {
      aerobicCapacity: 'high',
      sprintDemand: 'high',
      jumpingDemand: 'very_high',
      throwingPower: 'very_high',
      contactDuels: 'high',
      agility: 'high',
    },
    avgMatchDistanceKm: { min: 3.5, max: 5.0 },
    avgSprintsPerMatch: { min: 30, max: 50 },
    avgJumpsPerMatch: { min: 25, max: 50 },
    avgThrowsPerMatch: { min: 15, max: 35 },
    commonInjuries: ['shoulder', 'knee', 'ankle', 'back', 'elbow'],
    keyPhysicalAttributes: ['Skottstyrka', 'Hoppkraft', 'Överkroppsstyrka', 'Acceleration'],
  },
  center_back: {
    position: 'center_back',
    displayName: 'Mittnia/Playmaker',
    description: 'Spelmotor - dirigerar spelet, skapar lägen och överblick',
    physicalDemands: {
      aerobicCapacity: 'very_high',
      sprintDemand: 'high',
      jumpingDemand: 'high',
      throwingPower: 'high',
      contactDuels: 'high',
      agility: 'very_high',
    },
    avgMatchDistanceKm: { min: 4.0, max: 5.5 },
    avgSprintsPerMatch: { min: 35, max: 55 },
    avgJumpsPerMatch: { min: 20, max: 40 },
    avgThrowsPerMatch: { min: 10, max: 25 },
    commonInjuries: ['knee', 'ankle', 'shoulder', 'groin', 'back'],
    keyPhysicalAttributes: ['Spelsinne', 'Uthållighet', 'Kvickhet', 'Beslutsfattande'],
  },
  pivot: {
    position: 'pivot',
    displayName: 'Lansen/Pivot',
    description: 'Murbrytare - spärrar, blockerar och avslutar i trängsel',
    physicalDemands: {
      aerobicCapacity: 'high',
      sprintDemand: 'moderate',
      jumpingDemand: 'moderate',
      throwingPower: 'moderate',
      contactDuels: 'very_high',
      agility: 'high',
    },
    avgMatchDistanceKm: { min: 3.0, max: 4.5 },
    avgSprintsPerMatch: { min: 20, max: 35 },
    avgJumpsPerMatch: { min: 10, max: 25 },
    avgThrowsPerMatch: { min: 8, max: 20 },
    commonInjuries: ['shoulder', 'knee', 'back', 'finger', 'ankle'],
    keyPhysicalAttributes: ['Kroppsstyrka', 'Balans', 'Kontaktstyrka', 'Snabba fötter'],
  },
};

// ==================== SEASON PHASE TRAINING ====================

export const HANDBALL_SEASON_PHASES: Record<SeasonPhase, SeasonPhaseTraining> = {
  off_season: {
    phase: 'off_season',
    displayName: 'Off-season',
    durationWeeks: { min: 6, max: 10 },
    focus: [
      'Aerob basträning',
      'Maxstyrka uppbyggnad',
      'Rörlighet och mobilitet',
      'Skaderehabilitering',
      'Teknikutveckling',
    ],
    strengthEmphasis: 'Hypertrofi och maxstyrka (4-8 rep, 70-85% 1RM)',
    conditioningEmphasis: 'Aerob bas (låg-medel intensitet, 30-60 min)',
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
      'Explosiv styrka och power',
      'Sport-specifik kondition',
      'Repeated sprint ability',
      'Plyometrics och hopp',
      'Taktisk träning',
    ],
    strengthEmphasis: 'Power och explosivitet (3-5 rep, 75-90% 1RM + plyometrics)',
    conditioningEmphasis: 'Intervaller (15-60 sek arbete, kortare vila)',
    matchdayProtocol: {
      'MD-3': ['Tung styrka (överkropp)', 'Teknik'],
      'MD-2': ['Intervaller', 'Taktik'],
      'MD-1': ['Aktivering', 'Lätt teknik'],
      'MD': ['Träningsmatch'],
      'MD+1': ['Aktiv vila', 'Pool/cykel'],
      'MD+2': ['Lätt styrka', 'Mobilitet'],
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
    durationWeeks: { min: 20, max: 30 },
    focus: [
      'Underhåll av styrka och power',
      'Matchförberedelse',
      'Återhämtning',
      'Skadeförebyggande',
      'Taktisk anpassning',
    ],
    strengthEmphasis: 'Underhåll (2-4 rep, 80-90% 1RM, låg volym)',
    conditioningEmphasis: 'Matchspecifik (korta intervaller, spelsimulering)',
    matchdayProtocol: {
      'MD-3': ['Styrka (fokus underkropp)', 'Lagträning'],
      'MD-2': ['Lagträning', 'Taktik', 'Set pieces'],
      'MD-1': ['Aktivering', 'Skott', 'Mental prep'],
      'MD': ['Match'],
      'MD+1': ['Aktiv återhämtning', 'Pool', 'Stretching'],
      'MD+2': ['Styrka (överkropp)', 'Lätt teknik'],
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
      'Mental förberedelse',
      'Matchskärpa',
      'Injury prevention',
      'Lagsammanhållning',
    ],
    strengthEmphasis: 'Aktivering endast (lätt, explosivt)',
    conditioningEmphasis: 'Minimal - endast aktivering',
    matchdayProtocol: {
      'MD-3': ['Lätt lagträning', 'Video'],
      'MD-2': ['Lätt teknik', 'Set pieces'],
      'MD-1': ['Aktivering', 'Mental prep', 'Vila'],
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

export const HANDBALL_BENCHMARKS: Record<HandballPosition, PhysicalBenchmarks> = {
  goalkeeper: {
    position: 'goalkeeper',
    elite: {
      yoyoIR1Level: 17.5,
      yoyoIR2Level: 19.0,
      sprint10m: 1.75,
      sprint20m: 3.10,
      cmjHeight: 45,
      medicineBallThrow: 12.0, // 3kg ball
      tTestAgility: 9.0,
    },
    good: {
      yoyoIR1Level: 16.0,
      yoyoIR2Level: 17.5,
      sprint10m: 1.85,
      sprint20m: 3.25,
      cmjHeight: 40,
      medicineBallThrow: 10.5,
      tTestAgility: 9.8,
    },
  },
  wing: {
    position: 'wing',
    elite: {
      yoyoIR1Level: 20.5,
      yoyoIR2Level: 22.0,
      sprint10m: 1.65,
      sprint20m: 2.95,
      cmjHeight: 50,
      medicineBallThrow: 11.5,
      tTestAgility: 8.5,
    },
    good: {
      yoyoIR1Level: 19.0,
      yoyoIR2Level: 20.5,
      sprint10m: 1.75,
      sprint20m: 3.10,
      cmjHeight: 45,
      medicineBallThrow: 10.0,
      tTestAgility: 9.2,
    },
  },
  back: {
    position: 'back',
    elite: {
      yoyoIR1Level: 19.5,
      yoyoIR2Level: 21.0,
      sprint10m: 1.68,
      sprint20m: 3.00,
      cmjHeight: 52,
      medicineBallThrow: 14.0,
      tTestAgility: 8.8,
    },
    good: {
      yoyoIR1Level: 18.0,
      yoyoIR2Level: 19.5,
      sprint10m: 1.78,
      sprint20m: 3.15,
      cmjHeight: 46,
      medicineBallThrow: 12.0,
      tTestAgility: 9.5,
    },
  },
  center_back: {
    position: 'center_back',
    elite: {
      yoyoIR1Level: 20.0,
      yoyoIR2Level: 21.5,
      sprint10m: 1.70,
      sprint20m: 3.02,
      cmjHeight: 48,
      medicineBallThrow: 12.5,
      tTestAgility: 8.6,
    },
    good: {
      yoyoIR1Level: 18.5,
      yoyoIR2Level: 20.0,
      sprint10m: 1.80,
      sprint20m: 3.18,
      cmjHeight: 43,
      medicineBallThrow: 11.0,
      tTestAgility: 9.3,
    },
  },
  pivot: {
    position: 'pivot',
    elite: {
      yoyoIR1Level: 18.5,
      yoyoIR2Level: 20.0,
      sprint10m: 1.72,
      sprint20m: 3.05,
      cmjHeight: 46,
      medicineBallThrow: 13.5,
      tTestAgility: 9.2,
    },
    good: {
      yoyoIR1Level: 17.0,
      yoyoIR2Level: 18.5,
      sprint10m: 1.82,
      sprint20m: 3.20,
      cmjHeight: 41,
      medicineBallThrow: 11.5,
      tTestAgility: 10.0,
    },
  },
};

// ==================== INJURY PREVENTION ====================

export const INJURY_PREVENTION_EXERCISES: Record<string, ExerciseRecommendation[]> = {
  shoulder: [
    {
      name: 'External Rotation med band',
      category: 'prevention',
      setsReps: '3x15 per arm',
      notes: 'Armbågen fixerad vid sidan, kontrollerad rörelse',
      priority: 'essential',
    },
    {
      name: 'YTW Raises',
      category: 'prevention',
      setsReps: '3x10 varje position',
      notes: 'Liggande på mage, aktivera rotatorkuffen',
      priority: 'essential',
    },
    {
      name: 'Face Pulls',
      category: 'prevention',
      setsReps: '3x15',
      notes: 'Dra mot ansiktet, externa rotation i slutposition',
      priority: 'recommended',
    },
    {
      name: 'Sleeper Stretch',
      category: 'mobility',
      setsReps: '3x30 sek per arm',
      notes: 'Liggande på sidan, försiktig stretch',
      priority: 'recommended',
    },
  ],
  knee: [
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
      notes: 'Kontrollerad rörelse, aktivera hamstrings',
      priority: 'essential',
    },
    {
      name: 'Terminal Knee Extension',
      category: 'prevention',
      setsReps: '3x15 per ben',
      notes: 'Band runt knä, aktivera VMO',
      priority: 'recommended',
    },
    {
      name: 'Spanish Squat',
      category: 'prevention',
      setsReps: '3x12',
      notes: 'Band runt knä bakom, skjut knäna framåt',
      priority: 'recommended',
    },
  ],
  ankle: [
    {
      name: 'Calf Raises (raka knän)',
      category: 'strength',
      setsReps: '3x15',
      notes: 'Full range of motion, kontrollera nedfasen',
      priority: 'essential',
    },
    {
      name: 'Single Leg Balance',
      category: 'prevention',
      setsReps: '3x30 sek per ben',
      notes: 'Progressera till instabil yta',
      priority: 'essential',
    },
    {
      name: 'Alphabet Ankles',
      category: 'mobility',
      setsReps: '1x A-Z per fot',
      notes: 'Rita alfabetet med tårna',
      priority: 'optional',
    },
  ],
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
      name: 'Sumo Squat',
      category: 'strength',
      setsReps: '3x10',
      notes: 'Bred ställning, aktivera adduktorer',
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
  finger: [
    {
      name: 'Finger Extensions med band',
      category: 'prevention',
      setsReps: '3x15',
      notes: 'Band runt fingrarna, spreta ut',
      priority: 'essential',
    },
    {
      name: 'Grip Strength (ball squeeze)',
      category: 'strength',
      setsReps: '3x10 sek håll',
      notes: 'Tennisboll eller grip trainer',
      priority: 'recommended',
    },
  ],
};

// ==================== UTILITY FUNCTIONS ====================

export function getPositionRecommendations(position: HandballPosition): ExerciseRecommendation[] {
  const profile = HANDBALL_POSITION_PROFILES[position];
  const recommendations: ExerciseRecommendation[] = [];

  // Add injury prevention exercises based on common injuries for the position
  profile.commonInjuries.forEach((injury) => {
    const exercises = INJURY_PREVENTION_EXERCISES[injury];
    if (exercises) {
      recommendations.push(...exercises.filter((e) => e.priority === 'essential'));
    }
  });

  // Add position-specific strength exercises
  if (position === 'goalkeeper') {
    recommendations.push({
      name: 'Lateral Bound',
      category: 'power',
      setsReps: '3x6 per sida',
      notes: 'Explosiv sidoförflyttning, stabil landning',
      priority: 'essential',
    });
    recommendations.push({
      name: 'Split Squat Jump',
      category: 'power',
      setsReps: '3x8',
      notes: 'Explosiv uppåt, mjuk landning',
      priority: 'essential',
    });
  } else if (position === 'wing') {
    recommendations.push({
      name: 'Sprint Intervals',
      category: 'endurance',
      setsReps: '8x20m, 30 sek vila',
      notes: 'Maximal intensitet, full återhämtning',
      priority: 'essential',
    });
    recommendations.push({
      name: 'Box Jump',
      category: 'power',
      setsReps: '3x8',
      notes: 'Fokus på snabb respons från golvet',
      priority: 'essential',
    });
  } else if (position === 'back') {
    recommendations.push({
      name: 'Medicine Ball Rotational Throw',
      category: 'power',
      setsReps: '3x8 per sida',
      notes: 'Kraftfull rotation från höfterna',
      priority: 'essential',
    });
    recommendations.push({
      name: 'Landmine Press',
      category: 'strength',
      setsReps: '3x8 per arm',
      notes: 'Stående, enkelarms press med rotation',
      priority: 'essential',
    });
  } else if (position === 'center_back') {
    recommendations.push({
      name: 'Agility Ladder',
      category: 'agility',
      setsReps: '5x genomgång',
      notes: 'Olika mönster, fokus på snabba fötter',
      priority: 'essential',
    });
    recommendations.push({
      name: 'Shuttle Run',
      category: 'endurance',
      setsReps: '6x20m',
      notes: 'Snabba vändningar, simulerar matchrörelser',
      priority: 'essential',
    });
  } else if (position === 'pivot') {
    recommendations.push({
      name: 'Goblet Squat',
      category: 'strength',
      setsReps: '3x10',
      notes: 'Djup position, upprätthåll bålstabilitet',
      priority: 'essential',
    });
    recommendations.push({
      name: 'Pallof Press',
      category: 'strength',
      setsReps: '3x10 per sida',
      notes: 'Anti-rotation, stabil bål',
      priority: 'essential',
    });
  }

  return recommendations;
}

export function getSeasonPhaseTraining(phase: SeasonPhase): SeasonPhaseTraining {
  return HANDBALL_SEASON_PHASES[phase];
}

export function getPhysicalBenchmarks(position: HandballPosition): PhysicalBenchmarks {
  return HANDBALL_BENCHMARKS[position];
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

// ==================== MATCH LOAD MONITORING ====================

export interface MatchLoadData {
  totalDistance: number;
  highIntensityDistance: number; // >15 km/h
  sprintDistance: number; // >20 km/h
  accelerations: number;
  decelerations: number;
  jumps: number;
  throws: number;
  playingTime: number; // minutes
}

export function calculateMatchLoadScore(data: MatchLoadData, position: HandballPosition): number {
  const profile = HANDBALL_POSITION_PROFILES[position];

  // Weighted score based on position demands
  let score = 0;

  // Distance factor (normalized to position average)
  const avgDistance = (profile.avgMatchDistanceKm.min + profile.avgMatchDistanceKm.max) / 2;
  score += (data.totalDistance / avgDistance) * 25;

  // Sprint factor
  const avgSprints = (profile.avgSprintsPerMatch.min + profile.avgSprintsPerMatch.max) / 2;
  const sprintCount = data.sprintDistance / 20; // Approximate sprint count
  score += (sprintCount / avgSprints) * 25;

  // Jump factor
  const avgJumps = (profile.avgJumpsPerMatch.min + profile.avgJumpsPerMatch.max) / 2;
  score += (data.jumps / avgJumps) * 25;

  // High intensity actions
  score += ((data.accelerations + data.decelerations) / 100) * 25;

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
const handballTrainingModule = {
  HANDBALL_POSITION_PROFILES,
  HANDBALL_SEASON_PHASES,
  HANDBALL_BENCHMARKS,
  INJURY_PREVENTION_EXERCISES,
  getPositionRecommendations,
  getSeasonPhaseTraining,
  getPhysicalBenchmarks,
  calculateBenchmarkPercentage,
  getBenchmarkRating,
  calculateMatchLoadScore,
  getLoadStatus,
};

export default handballTrainingModule;
