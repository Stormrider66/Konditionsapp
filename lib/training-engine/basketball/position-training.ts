/**
 * Basketball Training Engine
 *
 * Position-specific training definitions, physical benchmarks,
 * season periodization, and injury prevention for basketball players.
 */

// Position types
export type BasketballPosition = 'point_guard' | 'shooting_guard' | 'small_forward' | 'power_forward' | 'center';
export type SeasonPhase = 'off_season' | 'pre_season' | 'in_season' | 'playoffs';

// Position profile interface
export interface PositionProfile {
  position: BasketballPosition;
  displayName: string;
  description: string;
  keyPhysicalAttributes: string[];
  avgMatchDistanceKm: { min: number; max: number };
  avgSprintsPerMatch: { min: number; max: number };
  avgJumpsPerMatch: { min: number; max: number };
  avgMinutesPerMatch: { min: number; max: number };
  primaryMovementPatterns: string[];
  commonInjuries: string[];
}

// Exercise recommendation interface
export interface ExerciseRecommendation {
  name: string;
  category: string;
  setsReps: string;
  notes: string;
  priority: 'essential' | 'recommended' | 'supplementary';
}

// Season phase training interface
export interface SeasonPhaseTraining {
  phase: SeasonPhase;
  focus: string[];
  strengthEmphasis: string;
  conditioningEmphasis: string;
  weeklyStructure: {
    strengthSessions: number;
    conditioningSessions: number;
    technicalSessions: number;
    restDays: number;
  };
}

// Matchday protocol interface
export interface MatchdayProtocol {
  day: 'MD-3' | 'MD-2' | 'MD-1' | 'MD' | 'MD+1' | 'MD+2';
  focus: string;
  intensity: 'high' | 'medium' | 'low' | 'recovery';
  activities: string[];
}

// Physical benchmarks interface
export interface PhysicalBenchmarks {
  verticalJump: number | null; // cm
  standingReach: number | null; // cm
  sprint3_4Court: number | null; // seconds
  laneAgility: number | null; // seconds
  shuttleRun: number | null; // seconds
  benchPress: number | null; // kg
  squat: number | null; // kg
  yoyoIR1Level: number | null;
}

// Quarter data interface
export interface QuarterData {
  quarter: number;
  minutesPlayed: number;
  distanceKm: number;
  sprints: number;
  jumps: number;
  avgHeartRate: number;
  maxHeartRate: number;
}

// Match load data interface
export interface MatchLoadData {
  matchId: string;
  date: Date;
  opponent: string;
  quarters: QuarterData[];
  totalMinutes: number;
  totalDistanceKm: number;
  totalSprints: number;
  totalJumps: number;
  averageHeartRate: number;
  maxHeartRate: number;
  playerLoadScore: number;
}

// Position profiles
export const BASKETBALL_POSITION_PROFILES: Record<BasketballPosition, PositionProfile> = {
  point_guard: {
    position: 'point_guard',
    displayName: 'Playmaker (1)',
    description: 'Spelets regissör som styr tempo och skapar chanser. Kräver utmärkt spelförståelse, bollkontroll och uthållighet.',
    keyPhysicalAttributes: ['Snabbhet', 'Kvickhet', 'Uthållighet', 'Reaktionsförmåga', 'Acceleration'],
    avgMatchDistanceKm: { min: 4.5, max: 6.0 },
    avgSprintsPerMatch: { min: 40, max: 60 },
    avgJumpsPerMatch: { min: 15, max: 30 },
    avgMinutesPerMatch: { min: 25, max: 35 },
    primaryMovementPatterns: ['Sidledsförflyttning', 'Riktningsändringar', 'Sprintstart', 'Backpedal'],
    commonInjuries: ['Fotledsstukningar', 'Knäskador (ACL/MCL)', 'Ljumskproblem', 'Handledsbesvär'],
  },
  shooting_guard: {
    position: 'shooting_guard',
    displayName: 'Shooting Guard (2)',
    description: 'Primär poänggörare från distans. Kräver explosivitet för att skapa skottlägen och god uthållighet för konstant rörelse.',
    keyPhysicalAttributes: ['Vertikal hoppförmåga', 'Snabbhet', 'Acceleration', 'Core-stabilitet', 'Skottuthållighet'],
    avgMatchDistanceKm: { min: 4.0, max: 5.5 },
    avgSprintsPerMatch: { min: 35, max: 55 },
    avgJumpsPerMatch: { min: 25, max: 45 },
    avgMinutesPerMatch: { min: 25, max: 35 },
    primaryMovementPatterns: ['Vertikala hopp', 'Snabba starter', 'Curls/cuts', 'Deceleration'],
    commonInjuries: ['Patellar tendinopati', 'Fotledsstukningar', 'Ryggbesvär', 'Axelproblem'],
  },
  small_forward: {
    position: 'small_forward',
    displayName: 'Small Forward (3)',
    description: 'Allsidig spelare som bidrar i både anfall och försvar. Kombinerar guard-liknande rörlighet med forward-styrka.',
    keyPhysicalAttributes: ['Allsidig atletik', 'Vertikal hoppförmåga', 'Styrka', 'Snabbhet', 'Uthållighet'],
    avgMatchDistanceKm: { min: 4.0, max: 5.5 },
    avgSprintsPerMatch: { min: 35, max: 55 },
    avgJumpsPerMatch: { min: 30, max: 50 },
    avgMinutesPerMatch: { min: 28, max: 36 },
    primaryMovementPatterns: ['Dribblings-drives', 'Post-ups', 'Vertikala hopp', 'Transition running'],
    commonInjuries: ['Knäskador', 'Fotledsstukningar', 'Höftflexorproblem', 'Axelinstabilitet'],
  },
  power_forward: {
    position: 'power_forward',
    displayName: 'Power Forward (4)',
    description: 'Fysisk spelare som dominerar i målarområdet. Kräver explosiv styrka och förmåga att spela fysiskt.',
    keyPhysicalAttributes: ['Explosiv styrka', 'Vertikal hoppförmåga', 'Kroppskontroll', 'Reboundförmåga', 'Core-styrka'],
    avgMatchDistanceKm: { min: 3.5, max: 5.0 },
    avgSprintsPerMatch: { min: 30, max: 45 },
    avgJumpsPerMatch: { min: 40, max: 60 },
    avgMinutesPerMatch: { min: 25, max: 34 },
    primaryMovementPatterns: ['Post-moves', 'Box-outs', 'Vertikala hopp', 'Fysiska dueller'],
    commonInjuries: ['Knäskador', 'Ryggproblem', 'Axelskador', 'Fingerskador'],
  },
  center: {
    position: 'center',
    displayName: 'Center (5)',
    description: 'Lagets ankar i målarområdet. Fokus på rim protection, rebounds och inomhuspoäng. Kräver maximal styrka och vertikal kraft.',
    keyPhysicalAttributes: ['Maxstyrka', 'Vertikal kraft', 'Kroppsmassa', 'Timing', 'Fotarbete'],
    avgMatchDistanceKm: { min: 3.0, max: 4.5 },
    avgSprintsPerMatch: { min: 20, max: 35 },
    avgJumpsPerMatch: { min: 45, max: 70 },
    avgMinutesPerMatch: { min: 22, max: 32 },
    primaryMovementPatterns: ['Vertikala hopp', 'Post-moves', 'Screen setting', 'Rim running'],
    commonInjuries: ['Knäskador', 'Fotproblem', 'Ryggbesvär', 'Axelinstabilitet'],
  },
};

// Season phase training definitions
export const BASKETBALL_SEASON_PHASES: Record<SeasonPhase, SeasonPhaseTraining> = {
  off_season: {
    phase: 'off_season',
    focus: ['Maxstyrka', 'Explosivitet', 'Aerob bas', 'Skadeförebyggande', 'Teknikutveckling'],
    strengthEmphasis: 'Hypertrofi och maxstyrka med fokus på compound-lyft',
    conditioningEmphasis: 'Aerob basträning och gradvis uppbyggnad av intensitet',
    weeklyStructure: {
      strengthSessions: 4,
      conditioningSessions: 3,
      technicalSessions: 2,
      restDays: 2,
    },
  },
  pre_season: {
    phase: 'pre_season',
    focus: ['Basketballspecifik kondition', 'Power', 'Matchhärdighet', 'Taktik', 'Lagsamspel'],
    strengthEmphasis: 'Kraftutveckling och power med basketballspecifika rörelser',
    conditioningEmphasis: 'Högintensiv intervallträning och spelliknande övningar',
    weeklyStructure: {
      strengthSessions: 3,
      conditioningSessions: 4,
      technicalSessions: 4,
      restDays: 1,
    },
  },
  in_season: {
    phase: 'in_season',
    focus: ['Styrkeunderhåll', 'Återhämtning', 'Matchprestation', 'Skadeprevention'],
    strengthEmphasis: 'Underhåll av styrka med låg volym, hög intensitet',
    conditioningEmphasis: 'Matchspecifik kondition genom träning och matcher',
    weeklyStructure: {
      strengthSessions: 2,
      conditioningSessions: 1,
      technicalSessions: 3,
      restDays: 2,
    },
  },
  playoffs: {
    phase: 'playoffs',
    focus: ['Maximal återhämtning', 'Mental förberedelse', 'Taktisk perfektion', 'Peak performance'],
    strengthEmphasis: 'Minimalt underhåll för att bevara explosivitet',
    conditioningEmphasis: 'Endast matchspecifik aktivitet och aktiv återhämtning',
    weeklyStructure: {
      strengthSessions: 1,
      conditioningSessions: 0,
      technicalSessions: 2,
      restDays: 3,
    },
  },
};

// Physical benchmarks by position (elite and good levels)
export const BASKETBALL_BENCHMARKS: Record<BasketballPosition, { elite: PhysicalBenchmarks; good: PhysicalBenchmarks }> = {
  point_guard: {
    elite: {
      verticalJump: 85,
      standingReach: 245,
      sprint3_4Court: 3.1,
      laneAgility: 10.5,
      shuttleRun: 28.0,
      benchPress: 85,
      squat: 140,
      yoyoIR1Level: 20.0,
    },
    good: {
      verticalJump: 70,
      standingReach: 235,
      sprint3_4Court: 3.4,
      laneAgility: 11.2,
      shuttleRun: 30.0,
      benchPress: 70,
      squat: 115,
      yoyoIR1Level: 18.0,
    },
  },
  shooting_guard: {
    elite: {
      verticalJump: 90,
      standingReach: 255,
      sprint3_4Court: 3.15,
      laneAgility: 10.7,
      shuttleRun: 28.5,
      benchPress: 90,
      squat: 150,
      yoyoIR1Level: 19.5,
    },
    good: {
      verticalJump: 75,
      standingReach: 245,
      sprint3_4Court: 3.45,
      laneAgility: 11.4,
      shuttleRun: 30.5,
      benchPress: 75,
      squat: 125,
      yoyoIR1Level: 17.5,
    },
  },
  small_forward: {
    elite: {
      verticalJump: 88,
      standingReach: 270,
      sprint3_4Court: 3.2,
      laneAgility: 10.8,
      shuttleRun: 29.0,
      benchPress: 100,
      squat: 160,
      yoyoIR1Level: 19.0,
    },
    good: {
      verticalJump: 73,
      standingReach: 260,
      sprint3_4Court: 3.5,
      laneAgility: 11.5,
      shuttleRun: 31.0,
      benchPress: 82,
      squat: 135,
      yoyoIR1Level: 17.0,
    },
  },
  power_forward: {
    elite: {
      verticalJump: 85,
      standingReach: 285,
      sprint3_4Court: 3.3,
      laneAgility: 11.0,
      shuttleRun: 29.5,
      benchPress: 115,
      squat: 175,
      yoyoIR1Level: 18.0,
    },
    good: {
      verticalJump: 70,
      standingReach: 275,
      sprint3_4Court: 3.6,
      laneAgility: 11.8,
      shuttleRun: 31.5,
      benchPress: 95,
      squat: 150,
      yoyoIR1Level: 16.0,
    },
  },
  center: {
    elite: {
      verticalJump: 80,
      standingReach: 305,
      sprint3_4Court: 3.5,
      laneAgility: 11.5,
      shuttleRun: 31.0,
      benchPress: 130,
      squat: 190,
      yoyoIR1Level: 16.5,
    },
    good: {
      verticalJump: 65,
      standingReach: 295,
      sprint3_4Court: 3.8,
      laneAgility: 12.3,
      shuttleRun: 33.0,
      benchPress: 105,
      squat: 160,
      yoyoIR1Level: 14.5,
    },
  },
};

// Matchday protocols
export const MATCHDAY_PROTOCOLS: MatchdayProtocol[] = [
  {
    day: 'MD-3',
    focus: 'Styrka och power',
    intensity: 'high',
    activities: ['Tunga lyft', 'Plyometrics', 'Basketballträning', 'Taktikgenomgång'],
  },
  {
    day: 'MD-2',
    focus: 'Teknisk träning',
    intensity: 'medium',
    activities: ['Skottträning', 'Spelövningar', 'Konditionsarbete', 'Mobility'],
  },
  {
    day: 'MD-1',
    focus: 'Aktivering och förberedelse',
    intensity: 'low',
    activities: ['Lätt shooting', 'Walkthrough', 'Stretching', 'Mental förberedelse'],
  },
  {
    day: 'MD',
    focus: 'Matchdag',
    intensity: 'high',
    activities: ['Uppvärmning', 'Aktivering', 'Match', 'Nedvarvning'],
  },
  {
    day: 'MD+1',
    focus: 'Återhämtning',
    intensity: 'recovery',
    activities: ['Aktiv vila', 'Poolträning', 'Massage', 'Videoanalys'],
  },
  {
    day: 'MD+2',
    focus: 'Regenerering och lätt träning',
    intensity: 'low',
    activities: ['Lätt styrka', 'Mobility', 'Skottträning', 'Rehab-övningar'],
  },
];

// Injury prevention exercises
export const INJURY_PREVENTION_EXERCISES: Record<string, ExerciseRecommendation[]> = {
  ankle: [
    { name: 'Single-leg balance', category: 'Balans', setsReps: '3x30s per ben', notes: 'Progression: blunda, instabil yta', priority: 'essential' },
    { name: 'Ankle alphabet', category: 'Mobilitet', setsReps: '2 set per fot', notes: 'Rita alla bokstäver i luften', priority: 'essential' },
    { name: 'Calf raises', category: 'Styrka', setsReps: '3x15 per ben', notes: 'Full ROM, kontrollerad excentrisk fas', priority: 'essential' },
    { name: 'Lateral band walks', category: 'Stabilitet', setsReps: '3x12 per riktning', notes: 'Håll knäna över tårna', priority: 'recommended' },
  ],
  knee: [
    { name: 'Nordic hamstring curls', category: 'Styrka', setsReps: '3x6-8', notes: 'Kontrollerad excentrisk fas', priority: 'essential' },
    { name: 'Single-leg squats', category: 'Styrka', setsReps: '3x8 per ben', notes: 'Fokus på knäkontroll', priority: 'essential' },
    { name: 'Terminal knee extensions', category: 'Rehab', setsReps: '3x15', notes: 'Med band runt knät', priority: 'recommended' },
    { name: 'Step-downs', category: 'Kontroll', setsReps: '3x10 per ben', notes: 'Långsam kontrollerad rörelse', priority: 'essential' },
  ],
  back: [
    { name: 'Bird dogs', category: 'Core', setsReps: '3x10 per sida', notes: 'Håll neutral rygg', priority: 'essential' },
    { name: 'Dead bugs', category: 'Core', setsReps: '3x12 per sida', notes: 'Pressa ländryggen mot golvet', priority: 'essential' },
    { name: 'Cat-cow stretches', category: 'Mobilitet', setsReps: '2x10', notes: 'Långsamma kontrollerade rörelser', priority: 'recommended' },
    { name: 'Glute bridges', category: 'Styrka', setsReps: '3x15', notes: 'Full höftextension', priority: 'essential' },
  ],
  shoulder: [
    { name: 'Band pull-aparts', category: 'Styrka', setsReps: '3x15', notes: 'Drag ihop skulderbladen', priority: 'essential' },
    { name: 'External rotation', category: 'Rotatorkuff', setsReps: '3x12 per arm', notes: 'Med band eller lätt vikt', priority: 'essential' },
    { name: 'Face pulls', category: 'Styrka', setsReps: '3x15', notes: 'Fokus på bakre deltoid', priority: 'recommended' },
    { name: 'YTWL raises', category: 'Stabilitet', setsReps: '2x8 per position', notes: 'Liggande på mage', priority: 'recommended' },
  ],
  patellar_tendon: [
    { name: 'Isometric wall sits', category: 'Styrka', setsReps: '4x45s', notes: 'Vid 70 graders knävinkel', priority: 'essential' },
    { name: 'Spanish squats', category: 'Rehab', setsReps: '3x15', notes: 'Med band runt knäna', priority: 'essential' },
    { name: 'Single-leg decline squats', category: 'Excentrisk', setsReps: '3x15 per ben', notes: 'Långsam excentrisk fas', priority: 'essential' },
    { name: 'Heavy slow resistance', category: 'Styrka', setsReps: '4x6', notes: '3s upp, 3s ner', priority: 'recommended' },
  ],
};

// Get position-specific recommendations
export function getPositionRecommendations(position: BasketballPosition): ExerciseRecommendation[] {
  const profile = BASKETBALL_POSITION_PROFILES[position];
  const recommendations: ExerciseRecommendation[] = [];

  // Add injury prevention based on common injuries
  profile.commonInjuries.forEach((injury) => {
    const injuryKey = injury.toLowerCase().includes('fotled') ? 'ankle' :
                      injury.toLowerCase().includes('knä') || injury.toLowerCase().includes('patellar') ? 'knee' :
                      injury.toLowerCase().includes('rygg') ? 'back' :
                      injury.toLowerCase().includes('axel') ? 'shoulder' : null;

    if (injuryKey && INJURY_PREVENTION_EXERCISES[injuryKey]) {
      recommendations.push(...INJURY_PREVENTION_EXERCISES[injuryKey]);
    }
  });

  // Add position-specific exercises
  if (position === 'point_guard' || position === 'shooting_guard') {
    recommendations.push(
      { name: 'Lateral bounds', category: 'Plyometrics', setsReps: '3x8 per sida', notes: 'Fokus på snabb riktningsändring', priority: 'essential' },
      { name: 'Reactive agility drills', category: 'Kvickhet', setsReps: '4x20s', notes: 'Med visuella signaler', priority: 'essential' },
      { name: 'Jump rope intervals', category: 'Kondition', setsReps: '5x60s', notes: 'Variera fotsteg', priority: 'recommended' },
    );
  }

  if (position === 'small_forward') {
    recommendations.push(
      { name: 'Box jumps', category: 'Plyometrics', setsReps: '4x6', notes: 'Fokus på maximal höjd', priority: 'essential' },
      { name: 'Medicine ball slams', category: 'Power', setsReps: '3x10', notes: 'Full kropp explosivitet', priority: 'essential' },
      { name: 'Shuttle runs', category: 'Kondition', setsReps: '6x', notes: 'Fullplans sprints', priority: 'recommended' },
    );
  }

  if (position === 'power_forward' || position === 'center') {
    recommendations.push(
      { name: 'Heavy squats', category: 'Styrka', setsReps: '5x5', notes: 'Fokus på maxstyrka', priority: 'essential' },
      { name: 'Depth jumps', category: 'Plyometrics', setsReps: '3x6', notes: 'Minimal markkontakttid', priority: 'essential' },
      { name: 'Post footwork drills', category: 'Teknik', setsReps: '3x5min', notes: 'Drop steps och pivots', priority: 'essential' },
    );
  }

  // Remove duplicates based on name
  const uniqueRecommendations = recommendations.filter((rec, index, self) =>
    index === self.findIndex((r) => r.name === rec.name)
  );

  return uniqueRecommendations;
}

// Get season phase training
export function getSeasonPhaseTraining(phase: SeasonPhase): SeasonPhaseTraining {
  return BASKETBALL_SEASON_PHASES[phase];
}

// Get physical benchmarks
export function getPhysicalBenchmarks(position: BasketballPosition): { elite: PhysicalBenchmarks; good: PhysicalBenchmarks } {
  return BASKETBALL_BENCHMARKS[position];
}

// Calculate benchmark percentage
export function calculateBenchmarkPercentage(
  actual: number | null,
  elite: number,
  lowerIsBetter = false
): number | null {
  if (actual === null) return null;
  if (lowerIsBetter) {
    return Math.min(100, Math.round((elite / actual) * 100));
  }
  return Math.min(100, Math.round((actual / elite) * 100));
}

// Get benchmark rating
export function getBenchmarkRating(
  actual: number | null,
  elite: number,
  good: number,
  lowerIsBetter = false
): 'elite' | 'good' | 'developing' | null {
  if (actual === null) return null;
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

// Calculate match load score
export function calculateMatchLoadScore(matchData: MatchLoadData): number {
  const distanceScore = matchData.totalDistanceKm * 10;
  const sprintScore = matchData.totalSprints * 2;
  const jumpScore = matchData.totalJumps * 1.5;
  const minuteScore = matchData.totalMinutes * 1.2;
  const hrScore = ((matchData.averageHeartRate - 100) / 100) * 20;

  return Math.round(distanceScore + sprintScore + jumpScore + minuteScore + hrScore);
}

// Get load status
export function getLoadStatus(weeklyLoad: number, avgLoad: number): 'optimal' | 'caution' | 'danger' {
  const ratio = weeklyLoad / avgLoad;
  if (ratio >= 0.8 && ratio <= 1.3) return 'optimal';
  if (ratio >= 0.6 && ratio <= 1.5) return 'caution';
  return 'danger';
}

export default {
  BASKETBALL_POSITION_PROFILES,
  BASKETBALL_SEASON_PHASES,
  BASKETBALL_BENCHMARKS,
  MATCHDAY_PROTOCOLS,
  INJURY_PREVENTION_EXERCISES,
  getPositionRecommendations,
  getSeasonPhaseTraining,
  getPhysicalBenchmarks,
  calculateBenchmarkPercentage,
  getBenchmarkRating,
  calculateMatchLoadScore,
  getLoadStatus,
};
