/**
 * Volleyball Training Engine
 *
 * Position-specific training definitions, physical benchmarks,
 * season periodization, and injury prevention for volleyball players.
 */

// Position types
export type VolleyballPosition = 'setter' | 'outside_hitter' | 'opposite_hitter' | 'middle_blocker' | 'libero';
export type SeasonPhase = 'off_season' | 'pre_season' | 'in_season' | 'playoffs';

// Position profile interface
export interface PositionProfile {
  position: VolleyballPosition;
  displayName: string;
  description: string;
  keyPhysicalAttributes: string[];
  avgJumpsPerSet: { min: number; max: number };
  avgJumpsPerMatch: { min: number; max: number };
  avgSpikeHeight: { min: number; max: number }; // cm above net
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
  spikeJump: number | null; // cm (approach jump)
  blockJump: number | null; // cm
  standingReach: number | null; // cm
  agilityTTest: number | null; // seconds
  sprint5m: number | null; // seconds
  yoyoIR1Level: number | null;
  squat: number | null; // kg
  powerClean: number | null; // kg
}

// Set data interface
export interface SetData {
  setNumber: number;
  jumps: number;
  attacks: number;
  blocks: number;
  digs: number;
  serves: number;
}

// Match load data interface
export interface MatchLoadData {
  matchId: string;
  date: Date;
  opponent: string;
  sets: SetData[];
  totalJumps: number;
  totalAttacks: number;
  totalBlocks: number;
  setsPlayed: number;
  playerLoadScore: number;
}

// Position profiles
export const VOLLEYBALL_POSITION_PROFILES: Record<VolleyballPosition, PositionProfile> = {
  setter: {
    position: 'setter',
    displayName: 'Passare',
    description: 'Spelets dirigent som sätter upp bollar för anfall. Kräver utmärkt bollkänsla, snabb reaktion och god spelförståelse.',
    keyPhysicalAttributes: ['Kvickhet', 'Fingerflexibilitet', 'Reaktionssnabbhet', 'Balans', 'Uthållighet'],
    avgJumpsPerSet: { min: 15, max: 25 },
    avgJumpsPerMatch: { min: 60, max: 100 },
    avgSpikeHeight: { min: 20, max: 40 },
    primaryMovementPatterns: ['Sidledsförflyttning', 'Korta sprints', 'Hopppassningar', 'Snabba riktningsändringar'],
    commonInjuries: ['Fingerskador', 'Axelproblem', 'Knäskador', 'Fotledsstukningar'],
  },
  outside_hitter: {
    position: 'outside_hitter',
    displayName: 'Vänsterspiker',
    description: 'Primär anfallare från vänster sida. Allsidig spelare som både anfaller och försvarar. Kräver explosiv hoppkraft och stark axel.',
    keyPhysicalAttributes: ['Vertikal hoppförmåga', 'Axelstyrka', 'Explosivitet', 'Uthållighet', 'Mottagningsförmåga'],
    avgJumpsPerSet: { min: 25, max: 40 },
    avgJumpsPerMatch: { min: 100, max: 160 },
    avgSpikeHeight: { min: 40, max: 70 },
    primaryMovementPatterns: ['Ansatser', 'Vertikala hopp', 'Landningar', 'Försvarsrörelser'],
    commonInjuries: ['Axelskador', 'Knäskador (patellar)', 'Ryggbesvär', 'Fotledsstukningar'],
  },
  opposite_hitter: {
    position: 'opposite_hitter',
    displayName: 'Diagonal/Högerspiker',
    description: 'Kraftfull anfallare från höger sida. Ofta lagets främsta poängplockare med fokus på anfall snarare än försvar.',
    keyPhysicalAttributes: ['Maximal hoppkraft', 'Slagstyrka', 'Explosivitet', 'Blockförmåga', 'Core-styrka'],
    avgJumpsPerSet: { min: 20, max: 35 },
    avgJumpsPerMatch: { min: 80, max: 140 },
    avgSpikeHeight: { min: 45, max: 80 },
    primaryMovementPatterns: ['Kraftfulla ansatser', 'Höga hopp', 'Block', 'Serve'],
    commonInjuries: ['Axelskador', 'Hopparknä', 'Ryggproblem', 'Handledsbesvär'],
  },
  middle_blocker: {
    position: 'middle_blocker',
    displayName: 'Centerblockare',
    description: 'Specialist på block och snabba anfall i mitten. Kräver timing, reaktionssnabbhet och maximal vertikal kraft.',
    keyPhysicalAttributes: ['Reaktionssnabbhet', 'Vertikal hoppförmåga', 'Timing', 'Sidledssnabbhet', 'Räckvidd'],
    avgJumpsPerSet: { min: 30, max: 50 },
    avgJumpsPerMatch: { min: 120, max: 200 },
    avgSpikeHeight: { min: 35, max: 60 },
    primaryMovementPatterns: ['Blockhopp', 'Sidledsförflyttning', 'Snabba anfall', 'Reaktionsrörelser'],
    commonInjuries: ['Knäskador', 'Fotledsskador', 'Axelproblem', 'Fingerskador'],
  },
  libero: {
    position: 'libero',
    displayName: 'Libero',
    description: 'Defensiv specialist som inte hoppar för anfall. Fokus på mottagning och försvar. Kräver utmärkt läsförmåga och reaktionssnabbhet.',
    keyPhysicalAttributes: ['Reaktionssnabbhet', 'Kvickhet', 'Läsförmåga', 'Uthållighet', 'Smidighet'],
    avgJumpsPerSet: { min: 5, max: 15 },
    avgJumpsPerMatch: { min: 20, max: 60 },
    avgSpikeHeight: { min: 0, max: 0 }, // Libero anfaller inte
    primaryMovementPatterns: ['Dykningar', 'Sidledsförflyttning', 'Låga positioner', 'Snabba starter'],
    commonInjuries: ['Knäskador', 'Höftproblem', 'Axelbesvär', 'Handledssmärta'],
  },
};

// Season phase training definitions
export const VOLLEYBALL_SEASON_PHASES: Record<SeasonPhase, SeasonPhaseTraining> = {
  off_season: {
    phase: 'off_season',
    focus: ['Maxstyrka', 'Vertikal kraft', 'Aerob bas', 'Skadeförebyggande', 'Teknikutveckling'],
    strengthEmphasis: 'Hypertrofi och maxstyrka med fokus på benpress och olympiska lyft',
    conditioningEmphasis: 'Aerob basträning och gradvis uppbyggnad av hoppkapacitet',
    weeklyStructure: {
      strengthSessions: 4,
      conditioningSessions: 3,
      technicalSessions: 2,
      restDays: 2,
    },
  },
  pre_season: {
    phase: 'pre_season',
    focus: ['Explosiv kraft', 'Hoppträning', 'Volleybollspecifik kondition', 'Lagspel'],
    strengthEmphasis: 'Kraftutveckling och plyometrics för maximal hoppförmåga',
    conditioningEmphasis: 'Intervallträning och volleybollspecifika övningar',
    weeklyStructure: {
      strengthSessions: 3,
      conditioningSessions: 4,
      technicalSessions: 4,
      restDays: 1,
    },
  },
  in_season: {
    phase: 'in_season',
    focus: ['Styrkeunderhåll', 'Hoppunderhåll', 'Återhämtning', 'Matchprestation'],
    strengthEmphasis: 'Underhåll av styrka och explosivitet med låg volym',
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
    focus: ['Maximal återhämtning', 'Peak performance', 'Mental förberedelse', 'Taktisk perfektion'],
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
export const VOLLEYBALL_BENCHMARKS: Record<VolleyballPosition, { elite: PhysicalBenchmarks; good: PhysicalBenchmarks }> = {
  setter: {
    elite: {
      verticalJump: 75,
      spikeJump: 85,
      blockJump: 70,
      standingReach: 240,
      agilityTTest: 8.5,
      sprint5m: 1.0,
      yoyoIR1Level: 18.0,
      squat: 130,
      powerClean: 85,
    },
    good: {
      verticalJump: 60,
      spikeJump: 70,
      blockJump: 55,
      standingReach: 230,
      agilityTTest: 9.2,
      sprint5m: 1.15,
      yoyoIR1Level: 16.0,
      squat: 105,
      powerClean: 70,
    },
  },
  outside_hitter: {
    elite: {
      verticalJump: 90,
      spikeJump: 105,
      blockJump: 85,
      standingReach: 250,
      agilityTTest: 8.8,
      sprint5m: 1.0,
      yoyoIR1Level: 18.5,
      squat: 150,
      powerClean: 100,
    },
    good: {
      verticalJump: 75,
      spikeJump: 88,
      blockJump: 70,
      standingReach: 240,
      agilityTTest: 9.5,
      sprint5m: 1.15,
      yoyoIR1Level: 16.5,
      squat: 125,
      powerClean: 82,
    },
  },
  opposite_hitter: {
    elite: {
      verticalJump: 95,
      spikeJump: 110,
      blockJump: 88,
      standingReach: 260,
      agilityTTest: 9.0,
      sprint5m: 1.02,
      yoyoIR1Level: 17.5,
      squat: 160,
      powerClean: 105,
    },
    good: {
      verticalJump: 78,
      spikeJump: 92,
      blockJump: 72,
      standingReach: 250,
      agilityTTest: 9.7,
      sprint5m: 1.18,
      yoyoIR1Level: 15.5,
      squat: 132,
      powerClean: 85,
    },
  },
  middle_blocker: {
    elite: {
      verticalJump: 88,
      spikeJump: 100,
      blockJump: 92,
      standingReach: 270,
      agilityTTest: 8.6,
      sprint5m: 1.0,
      yoyoIR1Level: 17.0,
      squat: 155,
      powerClean: 100,
    },
    good: {
      verticalJump: 72,
      spikeJump: 85,
      blockJump: 76,
      standingReach: 260,
      agilityTTest: 9.3,
      sprint5m: 1.15,
      yoyoIR1Level: 15.0,
      squat: 128,
      powerClean: 82,
    },
  },
  libero: {
    elite: {
      verticalJump: 65,
      spikeJump: 75,
      blockJump: 60,
      standingReach: 225,
      agilityTTest: 8.2,
      sprint5m: 0.98,
      yoyoIR1Level: 19.0,
      squat: 120,
      powerClean: 75,
    },
    good: {
      verticalJump: 52,
      spikeJump: 62,
      blockJump: 48,
      standingReach: 215,
      agilityTTest: 9.0,
      sprint5m: 1.12,
      yoyoIR1Level: 17.0,
      squat: 98,
      powerClean: 62,
    },
  },
};

// Matchday protocols
export const MATCHDAY_PROTOCOLS: MatchdayProtocol[] = [
  {
    day: 'MD-3',
    focus: 'Styrka och plyometrics',
    intensity: 'high',
    activities: ['Tunga lyft', 'Hoppträning', 'Volleybollträning', 'Taktik'],
  },
  {
    day: 'MD-2',
    focus: 'Teknisk träning',
    intensity: 'medium',
    activities: ['Spiketräning', 'Blockövningar', 'Serveträning', 'Spelövningar'],
  },
  {
    day: 'MD-1',
    focus: 'Aktivering och förberedelse',
    intensity: 'low',
    activities: ['Lätt bollträning', 'Mobility', 'Walkthrough', 'Mental förberedelse'],
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
    activities: ['Aktiv vila', 'Stretching', 'Massage', 'Videoanalys'],
  },
  {
    day: 'MD+2',
    focus: 'Regenerering',
    intensity: 'low',
    activities: ['Lätt styrka', 'Mobility', 'Teknisk träning', 'Rehab-övningar'],
  },
];

// Injury prevention exercises
export const INJURY_PREVENTION_EXERCISES: Record<string, ExerciseRecommendation[]> = {
  shoulder: [
    { name: 'Band pull-aparts', category: 'Styrka', setsReps: '3x15', notes: 'Fokus på skulderbladsretraction', priority: 'essential' },
    { name: 'External rotation', category: 'Rotatorkuff', setsReps: '3x12 per arm', notes: 'Med band eller lätt vikt', priority: 'essential' },
    { name: 'Y-T-W raises', category: 'Stabilitet', setsReps: '2x10 per position', notes: 'Liggande på mage', priority: 'essential' },
    { name: 'Shoulder sleeper stretch', category: 'Mobilitet', setsReps: '3x30s per sida', notes: 'Försiktig stretch', priority: 'recommended' },
  ],
  knee: [
    { name: 'Nordic hamstring curls', category: 'Styrka', setsReps: '3x6-8', notes: 'Kontrollerad excentrisk fas', priority: 'essential' },
    { name: 'Single-leg squats', category: 'Styrka', setsReps: '3x8 per ben', notes: 'Fokus på knäkontroll', priority: 'essential' },
    { name: 'Terminal knee extensions', category: 'Rehab', setsReps: '3x15', notes: 'Med band runt knät', priority: 'recommended' },
    { name: 'Step-downs', category: 'Kontroll', setsReps: '3x10 per ben', notes: 'Långsam kontrollerad rörelse', priority: 'essential' },
  ],
  ankle: [
    { name: 'Single-leg balance', category: 'Balans', setsReps: '3x30s per ben', notes: 'Progression: blunda, instabil yta', priority: 'essential' },
    { name: 'Calf raises', category: 'Styrka', setsReps: '3x15 per ben', notes: 'Full ROM', priority: 'essential' },
    { name: 'Ankle alphabet', category: 'Mobilitet', setsReps: '2 set per fot', notes: 'Rita alla bokstäver', priority: 'recommended' },
    { name: 'Lateral band walks', category: 'Stabilitet', setsReps: '3x12 per riktning', notes: 'Knäna över tårna', priority: 'recommended' },
  ],
  patellar: [
    { name: 'Isometric wall sits', category: 'Styrka', setsReps: '4x45s', notes: 'Vid 70 graders knävinkel', priority: 'essential' },
    { name: 'Spanish squats', category: 'Rehab', setsReps: '3x15', notes: 'Med band runt knäna', priority: 'essential' },
    { name: 'Single-leg decline squats', category: 'Excentrisk', setsReps: '3x15 per ben', notes: 'Långsam excentrisk fas', priority: 'essential' },
    { name: 'Heavy slow resistance', category: 'Styrka', setsReps: '4x6', notes: '3s upp, 3s ner', priority: 'recommended' },
  ],
  finger: [
    { name: 'Finger extensions', category: 'Styrka', setsReps: '3x15', notes: 'Med gummiband runt fingrarna', priority: 'essential' },
    { name: 'Grip strengthening', category: 'Styrka', setsReps: '3x30s', notes: 'Med tennisboll', priority: 'recommended' },
    { name: 'Finger stretches', category: 'Mobilitet', setsReps: '2x10s per finger', notes: 'Försiktig stretch', priority: 'recommended' },
  ],
};

// Get position-specific recommendations
export function getPositionRecommendations(position: VolleyballPosition): ExerciseRecommendation[] {
  const profile = VOLLEYBALL_POSITION_PROFILES[position];
  const recommendations: ExerciseRecommendation[] = [];

  // Add injury prevention based on common injuries
  profile.commonInjuries.forEach((injury) => {
    const injuryKey = injury.toLowerCase().includes('axel') ? 'shoulder' :
                      injury.toLowerCase().includes('knä') || injury.toLowerCase().includes('patellar') || injury.toLowerCase().includes('hoppar') ? 'knee' :
                      injury.toLowerCase().includes('fotled') ? 'ankle' :
                      injury.toLowerCase().includes('finger') ? 'finger' : null;

    if (injuryKey && INJURY_PREVENTION_EXERCISES[injuryKey]) {
      recommendations.push(...INJURY_PREVENTION_EXERCISES[injuryKey]);
    }
  });

  // Add position-specific exercises
  if (position === 'setter') {
    recommendations.push(
      { name: 'Fingerflexibilitet', category: 'Mobilitet', setsReps: '2x10 per hand', notes: 'Flexion och extension', priority: 'essential' },
      { name: 'Reaktionsträning', category: 'Kvickhet', setsReps: '4x20s', notes: 'Med boll och partner', priority: 'essential' },
      { name: 'Lateral bounds', category: 'Plyometrics', setsReps: '3x8 per sida', notes: 'Fokus på snabb reaktion', priority: 'recommended' },
    );
  }

  if (position === 'outside_hitter' || position === 'opposite_hitter') {
    recommendations.push(
      { name: 'Approach jumps', category: 'Plyometrics', setsReps: '4x6', notes: 'Med full ansats', priority: 'essential' },
      { name: 'Medicine ball throws', category: 'Power', setsReps: '3x8', notes: 'Rotationskast', priority: 'essential' },
      { name: 'Depth jumps', category: 'Plyometrics', setsReps: '3x6', notes: 'Minimal markkontakttid', priority: 'essential' },
    );
  }

  if (position === 'middle_blocker') {
    recommendations.push(
      { name: 'Block jump drills', category: 'Plyometrics', setsReps: '4x8', notes: 'Laterala blockhopp', priority: 'essential' },
      { name: 'Shuffle to jump', category: 'Reaktion', setsReps: '3x10', notes: 'Sidledes sedan hopp', priority: 'essential' },
      { name: 'Continuous jumping', category: 'Uthållighet', setsReps: '3x10', notes: 'Minimal vila mellan hopp', priority: 'recommended' },
    );
  }

  if (position === 'libero') {
    recommendations.push(
      { name: 'Dykträning', category: 'Teknik', setsReps: '3x8 per sida', notes: 'Kontrollerade dykningar', priority: 'essential' },
      { name: 'Quick feet drills', category: 'Kvickhet', setsReps: '4x15s', notes: 'Stege eller konor', priority: 'essential' },
      { name: 'Low position holds', category: 'Styrka', setsReps: '3x30s', notes: 'I defensiv position', priority: 'essential' },
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
  return VOLLEYBALL_SEASON_PHASES[phase];
}

// Get physical benchmarks
export function getPhysicalBenchmarks(position: VolleyballPosition): { elite: PhysicalBenchmarks; good: PhysicalBenchmarks } {
  return VOLLEYBALL_BENCHMARKS[position];
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
  const jumpScore = matchData.totalJumps * 1.5;
  const attackScore = matchData.totalAttacks * 2;
  const blockScore = matchData.totalBlocks * 1.8;
  const setScore = matchData.setsPlayed * 15;

  return Math.round(jumpScore + attackScore + blockScore + setScore);
}

// Get load status
export function getLoadStatus(weeklyLoad: number, avgLoad: number): 'optimal' | 'caution' | 'danger' {
  const ratio = weeklyLoad / avgLoad;
  if (ratio >= 0.8 && ratio <= 1.3) return 'optimal';
  if (ratio >= 0.6 && ratio <= 1.5) return 'caution';
  return 'danger';
}

// Calculate jump load for injury prevention
export function calculateWeeklyJumpLoad(matches: MatchLoadData[], trainingJumps: number): number {
  const matchJumps = matches.reduce((sum, match) => sum + match.totalJumps, 0);
  return matchJumps + trainingJumps;
}

// Get jump load recommendation
export function getJumpLoadRecommendation(weeklyJumps: number, position: VolleyballPosition): string {
  const thresholds: Record<VolleyballPosition, { low: number; high: number }> = {
    setter: { low: 200, high: 400 },
    outside_hitter: { low: 300, high: 600 },
    opposite_hitter: { low: 280, high: 550 },
    middle_blocker: { low: 350, high: 700 },
    libero: { low: 80, high: 200 },
  };

  const { low, high } = thresholds[position];

  if (weeklyJumps < low) return 'Låg hoppbelastning - kan öka volymen';
  if (weeklyJumps > high) return 'Hög hoppbelastning - överväg att minska volymen';
  return 'Optimal hoppbelastning';
}

export default {
  VOLLEYBALL_POSITION_PROFILES,
  VOLLEYBALL_SEASON_PHASES,
  VOLLEYBALL_BENCHMARKS,
  MATCHDAY_PROTOCOLS,
  INJURY_PREVENTION_EXERCISES,
  getPositionRecommendations,
  getSeasonPhaseTraining,
  getPhysicalBenchmarks,
  calculateBenchmarkPercentage,
  getBenchmarkRating,
  calculateMatchLoadScore,
  getLoadStatus,
  calculateWeeklyJumpLoad,
  getJumpLoadRecommendation,
};
