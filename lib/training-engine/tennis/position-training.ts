/**
 * Tennis Training Engine
 *
 * Play style-specific training definitions, physical benchmarks,
 * season periodization, and injury prevention for tennis players.
 */

// Play style types (tennis uses play styles rather than positions)
export type TennisPlayStyle = 'aggressive_baseliner' | 'serve_and_volleyer' | 'all_court' | 'counter_puncher' | 'big_server';
export type SeasonPhase = 'off_season' | 'pre_season' | 'in_season' | 'tournament';

// Play style profile interface
export interface PlayStyleProfile {
  playStyle: TennisPlayStyle;
  displayName: string;
  description: string;
  keyPhysicalAttributes: string[];
  avgRalliesPerSet: { min: number; max: number };
  avgPointsPerMatch: { min: number; max: number };
  courtCoverage: 'baseline' | 'mid_court' | 'full_court' | 'net';
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
    matchPlay: number;
    restDays: number;
  };
}

// Matchday protocol interface (tournament context)
export interface TournamentProtocol {
  day: 'T-3' | 'T-2' | 'T-1' | 'Match' | 'T+1' | 'T+2';
  focus: string;
  intensity: 'high' | 'medium' | 'low' | 'recovery';
  activities: string[];
}

// Physical benchmarks interface
export interface PhysicalBenchmarks {
  sprint5m: number | null; // seconds
  sprint10m: number | null; // seconds
  sprint20m: number | null; // seconds
  agilitySpider: number | null; // seconds (spider drill)
  agility505: number | null; // seconds (5-10-5 shuttle)
  verticalJump: number | null; // cm
  medicineBallThrow: number | null; // meters (3kg ball)
  yoyoIR1Level: number | null;
  shoulderStrengthRatio: number | null; // ER/IR ratio percentage
  gripStrength: number | null; // kg
}

// Match data interface
export interface MatchData {
  matchId: string;
  date: Date;
  opponent: string;
  surface: 'hard' | 'clay' | 'grass' | 'indoor';
  duration: number; // minutes
  setsPlayed: number;
  gamesWon: number;
  gamesLost: number;
  aces: number;
  doubleFaults: number;
  firstServePercentage: number;
  winnersCount: number;
  unforcedErrors: number;
  distanceCovered: number | null; // meters
  playerLoadScore: number;
}

// Play style profiles
export const TENNIS_PLAYSTYLE_PROFILES: Record<TennisPlayStyle, PlayStyleProfile> = {
  aggressive_baseliner: {
    playStyle: 'aggressive_baseliner',
    displayName: 'Aggressiv Baslinjespelare',
    description: 'Dominerar från baslinjen med kraftfulla grundslag. Söker att diktera rallys och avsluta poäng med winners från backcourt.',
    keyPhysicalAttributes: ['Explosiv kraft', 'Rotatsstyrka', 'Lateralt snabbhet', 'Uthållighet', 'Corestabilitet'],
    avgRalliesPerSet: { min: 40, max: 60 },
    avgPointsPerMatch: { min: 80, max: 140 },
    courtCoverage: 'baseline',
    primaryMovementPatterns: ['Laterala förflyttningar', 'Split-step', 'Snabba riktningsändringar', 'Rotation'],
    commonInjuries: ['Tennisarmbåge', 'Axelskador', 'Ryggbesvär', 'Knäproblem', 'Handledssmärta'],
  },
  serve_and_volleyer: {
    playStyle: 'serve_and_volleyer',
    displayName: 'Serve-Volleyspelare',
    description: 'Attackerar nätet efter serven. Förlitar sig på stark serve och snabba reflexer vid nät. Kort poängbyggnad.',
    keyPhysicalAttributes: ['Servestyrka', 'Reaktionssnabbhet', 'Explosivitet', 'Handledsflexibilitet', 'Första steget'],
    avgRalliesPerSet: { min: 25, max: 40 },
    avgPointsPerMatch: { min: 70, max: 120 },
    courtCoverage: 'net',
    primaryMovementPatterns: ['Framåtrush', 'Split-step', 'Volley-footwork', 'Snabb acceleration'],
    commonInjuries: ['Axelskador', 'Ryggbesvär', 'Knäskador', 'Vadkramp', 'Handledsbesvär'],
  },
  all_court: {
    playStyle: 'all_court',
    displayName: 'Allroundspelare',
    description: 'Mångsidig spelare som anpassar sig till alla situationer. Kan spela från baslinjen och nätet. Taktiskt intelligent.',
    keyPhysicalAttributes: ['Allsidig kondition', 'Spelförståelse', 'Balans', 'Rörlighet', 'Mental styrka'],
    avgRalliesPerSet: { min: 35, max: 55 },
    avgPointsPerMatch: { min: 75, max: 130 },
    courtCoverage: 'full_court',
    primaryMovementPatterns: ['Alla riktningar', 'Positionsväxlingar', 'Varierad hastighet', 'Anpassning'],
    commonInjuries: ['Axelskador', 'Ryggbesvär', 'Knäproblem', 'Höftbesvär', 'Tennisarmbåge'],
  },
  counter_puncher: {
    playStyle: 'counter_puncher',
    displayName: 'Defensiv Spelare',
    description: 'Utmärkt försvarare som returnerar allt. Väntar på motståndarens misstag. Hög mental uthållighet och löpkapacitet.',
    keyPhysicalAttributes: ['Uthållighet', 'Snabbhet', 'Återhämtningsförmåga', 'Mental styrka', 'Löpkapacitet'],
    avgRalliesPerSet: { min: 50, max: 75 },
    avgPointsPerMatch: { min: 90, max: 160 },
    courtCoverage: 'full_court',
    primaryMovementPatterns: ['Långa sprints', 'Sidledsförflyttning', 'Djupa returer', 'Kontinuerlig rörelse'],
    commonInjuries: ['Löparknä', 'Fotledsstukningar', 'Höftproblem', 'Hälseneskador', 'Överbelastning'],
  },
  big_server: {
    playStyle: 'big_server',
    displayName: 'Servkung',
    description: 'Förlitar sig på kraftfull serve som huvudvapen. Bygger spelet kring servepoäng och korta rallys.',
    keyPhysicalAttributes: ['Servestyrka', 'Explosiv kraft', 'Axelstabilitet', 'Höjd/Räckvidd', 'Slagkraft'],
    avgRalliesPerSet: { min: 30, max: 45 },
    avgPointsPerMatch: { min: 70, max: 120 },
    courtCoverage: 'mid_court',
    primaryMovementPatterns: ['Vertikal rörelse', 'Kort ansats', 'Power rotation', 'Nätapproach'],
    commonInjuries: ['Axelskador', 'Ryggbesvär', 'Magbesvär', 'Armbågsproblem', 'Knäskador'],
  },
};

// Season phase training definitions
export const TENNIS_SEASON_PHASES: Record<SeasonPhase, SeasonPhaseTraining> = {
  off_season: {
    phase: 'off_season',
    focus: ['Grundstyrka', 'Aerob bas', 'Skadeförebyggande', 'Teknikutveckling', 'Rehabilitering'],
    strengthEmphasis: 'Hypertrofi och maxstyrka med fokus på bål, ben och axlar',
    conditioningEmphasis: 'Aerob basträning och gradvis uppbyggnad av intensitet',
    weeklyStructure: {
      strengthSessions: 4,
      conditioningSessions: 3,
      technicalSessions: 3,
      matchPlay: 0,
      restDays: 2,
    },
  },
  pre_season: {
    phase: 'pre_season',
    focus: ['Explosiv kraft', 'Tennisspecifik kondition', 'Matchsimulering', 'Taktik'],
    strengthEmphasis: 'Kraftutveckling och rotationsstyrka för slag',
    conditioningEmphasis: 'Intervallträning och tennisspecifika löpövningar',
    weeklyStructure: {
      strengthSessions: 3,
      conditioningSessions: 3,
      technicalSessions: 5,
      matchPlay: 2,
      restDays: 1,
    },
  },
  in_season: {
    phase: 'in_season',
    focus: ['Styrkeunderhåll', 'Återhämtning', 'Matchförberedelse', 'Taktisk anpassning'],
    strengthEmphasis: 'Underhåll av styrka och explosivitet med låg volym',
    conditioningEmphasis: 'Matchspecifik kondition och aktiv återhämtning',
    weeklyStructure: {
      strengthSessions: 2,
      conditioningSessions: 2,
      technicalSessions: 4,
      matchPlay: 2,
      restDays: 2,
    },
  },
  tournament: {
    phase: 'tournament',
    focus: ['Peak performance', 'Mental förberedelse', 'Taktisk perfektion', 'Maximal återhämtning'],
    strengthEmphasis: 'Endast aktiveringsövningar och lätt underhåll',
    conditioningEmphasis: 'Lätt rörelse och återhämtning mellan matcher',
    weeklyStructure: {
      strengthSessions: 1,
      conditioningSessions: 0,
      technicalSessions: 2,
      matchPlay: 3,
      restDays: 2,
    },
  },
};

// Physical benchmarks by play style (elite and good levels)
export const TENNIS_BENCHMARKS: Record<TennisPlayStyle, { elite: PhysicalBenchmarks; good: PhysicalBenchmarks }> = {
  aggressive_baseliner: {
    elite: {
      sprint5m: 0.98,
      sprint10m: 1.70,
      sprint20m: 2.95,
      agilitySpider: 15.5,
      agility505: 2.2,
      verticalJump: 55,
      medicineBallThrow: 12.5,
      yoyoIR1Level: 18.5,
      shoulderStrengthRatio: 75,
      gripStrength: 55,
    },
    good: {
      sprint5m: 1.08,
      sprint10m: 1.85,
      sprint20m: 3.20,
      agilitySpider: 17.0,
      agility505: 2.5,
      verticalJump: 45,
      medicineBallThrow: 10.5,
      yoyoIR1Level: 16.5,
      shoulderStrengthRatio: 65,
      gripStrength: 45,
    },
  },
  serve_and_volleyer: {
    elite: {
      sprint5m: 0.95,
      sprint10m: 1.65,
      sprint20m: 2.90,
      agilitySpider: 15.0,
      agility505: 2.15,
      verticalJump: 60,
      medicineBallThrow: 13.0,
      yoyoIR1Level: 17.5,
      shoulderStrengthRatio: 78,
      gripStrength: 58,
    },
    good: {
      sprint5m: 1.05,
      sprint10m: 1.80,
      sprint20m: 3.15,
      agilitySpider: 16.5,
      agility505: 2.45,
      verticalJump: 50,
      medicineBallThrow: 11.0,
      yoyoIR1Level: 15.5,
      shoulderStrengthRatio: 68,
      gripStrength: 48,
    },
  },
  all_court: {
    elite: {
      sprint5m: 1.00,
      sprint10m: 1.72,
      sprint20m: 2.98,
      agilitySpider: 15.2,
      agility505: 2.18,
      verticalJump: 52,
      medicineBallThrow: 12.0,
      yoyoIR1Level: 19.0,
      shoulderStrengthRatio: 75,
      gripStrength: 52,
    },
    good: {
      sprint5m: 1.10,
      sprint10m: 1.88,
      sprint20m: 3.25,
      agilitySpider: 16.8,
      agility505: 2.48,
      verticalJump: 42,
      medicineBallThrow: 10.0,
      yoyoIR1Level: 17.0,
      shoulderStrengthRatio: 65,
      gripStrength: 42,
    },
  },
  counter_puncher: {
    elite: {
      sprint5m: 1.02,
      sprint10m: 1.75,
      sprint20m: 3.00,
      agilitySpider: 14.8,
      agility505: 2.20,
      verticalJump: 48,
      medicineBallThrow: 11.0,
      yoyoIR1Level: 20.0,
      shoulderStrengthRatio: 72,
      gripStrength: 50,
    },
    good: {
      sprint5m: 1.12,
      sprint10m: 1.90,
      sprint20m: 3.28,
      agilitySpider: 16.2,
      agility505: 2.50,
      verticalJump: 38,
      medicineBallThrow: 9.0,
      yoyoIR1Level: 18.0,
      shoulderStrengthRatio: 62,
      gripStrength: 40,
    },
  },
  big_server: {
    elite: {
      sprint5m: 1.00,
      sprint10m: 1.72,
      sprint20m: 2.98,
      agilitySpider: 16.0,
      agility505: 2.30,
      verticalJump: 62,
      medicineBallThrow: 14.0,
      yoyoIR1Level: 17.0,
      shoulderStrengthRatio: 80,
      gripStrength: 60,
    },
    good: {
      sprint5m: 1.10,
      sprint10m: 1.88,
      sprint20m: 3.25,
      agilitySpider: 17.5,
      agility505: 2.60,
      verticalJump: 52,
      medicineBallThrow: 12.0,
      yoyoIR1Level: 15.0,
      shoulderStrengthRatio: 70,
      gripStrength: 50,
    },
  },
};

// Tournament protocols
export const TOURNAMENT_PROTOCOLS: TournamentProtocol[] = [
  {
    day: 'T-3',
    focus: 'Sista intensiva träningspass',
    intensity: 'high',
    activities: ['Matchsimulering', 'Taktikträning', 'Intensiv styrka', 'Mentalt fokus'],
  },
  {
    day: 'T-2',
    focus: 'Teknisk finslipning',
    intensity: 'medium',
    activities: ['Slagträning', 'Serveträning', 'Lätt kondition', 'Spelanalys'],
  },
  {
    day: 'T-1',
    focus: 'Aktivering och förberedelse',
    intensity: 'low',
    activities: ['Lätt hitting', 'Mobility', 'Mental förberedelse', 'Vila'],
  },
  {
    day: 'Match',
    focus: 'Matchdag',
    intensity: 'high',
    activities: ['Uppvärmning', 'Aktivering', 'Match', 'Nedvarvning', 'Återhämtning'],
  },
  {
    day: 'T+1',
    focus: 'Aktiv återhämtning',
    intensity: 'recovery',
    activities: ['Pool/simning', 'Stretching', 'Massage', 'Lätt promenad'],
  },
  {
    day: 'T+2',
    focus: 'Lätt träning',
    intensity: 'low',
    activities: ['Lätt hitting', 'Mobility', 'Skadeförebyggande', 'Nästa match prep'],
  },
];

// Injury prevention exercises
export const INJURY_PREVENTION_EXERCISES: Record<string, ExerciseRecommendation[]> = {
  shoulder: [
    { name: 'External rotation med band', category: 'Rotatorkuff', setsReps: '3x15 per arm', notes: 'Armbågen vid sidan', priority: 'essential' },
    { name: 'Sleeper stretch', category: 'Mobilitet', setsReps: '3x30s per sida', notes: 'Försiktig posterior kapselstretch', priority: 'essential' },
    { name: 'Serratus wall slides', category: 'Scapula', setsReps: '3x12', notes: 'Fokus på scapula protraction', priority: 'essential' },
    { name: 'YTW raises', category: 'Stabilitet', setsReps: '2x10 per position', notes: 'Liggande på mage', priority: 'recommended' },
    { name: 'Prone horizontal abduction', category: 'Styrka', setsReps: '3x12', notes: 'Med lätt vikt', priority: 'recommended' },
  ],
  elbow: [
    { name: 'Wrist curls', category: 'Styrka', setsReps: '3x15', notes: 'Både flexion och extension', priority: 'essential' },
    { name: 'Eccentric wrist extension', category: 'Rehab', setsReps: '3x15', notes: 'Långsam excentrisk fas', priority: 'essential' },
    { name: 'Supination/Pronation', category: 'Mobilitet', setsReps: '3x12 per riktning', notes: 'Med lätt vikt', priority: 'essential' },
    { name: 'Flexbar Tyler twist', category: 'Rehab', setsReps: '3x15', notes: 'För lateral epikondylit', priority: 'recommended' },
  ],
  back: [
    { name: 'Bird dogs', category: 'Core', setsReps: '3x10 per sida', notes: 'Kontrollerad rörelse', priority: 'essential' },
    { name: 'Dead bugs', category: 'Core', setsReps: '3x10 per sida', notes: 'Ryggen i golvet', priority: 'essential' },
    { name: 'Cat-cow stretches', category: 'Mobilitet', setsReps: '2x10', notes: 'Flödande rörelse', priority: 'essential' },
    { name: 'Side plank rotations', category: 'Rotation', setsReps: '3x8 per sida', notes: 'Kontrollerad rotation', priority: 'recommended' },
  ],
  knee: [
    { name: 'Single-leg squats', category: 'Styrka', setsReps: '3x8 per ben', notes: 'Fokus på knäkontroll', priority: 'essential' },
    { name: 'Nordic hamstring curls', category: 'Styrka', setsReps: '3x6', notes: 'Excentrisk fokus', priority: 'essential' },
    { name: 'Terminal knee extensions', category: 'Rehab', setsReps: '3x15', notes: 'Med band', priority: 'recommended' },
    { name: 'Step-downs', category: 'Kontroll', setsReps: '3x10 per ben', notes: 'Kontrollerad', priority: 'recommended' },
  ],
  ankle: [
    { name: 'Single-leg balance', category: 'Balans', setsReps: '3x30s per ben', notes: 'Progressivt instabilt underlag', priority: 'essential' },
    { name: 'Calf raises', category: 'Styrka', setsReps: '3x15 per ben', notes: 'Full ROM', priority: 'essential' },
    { name: 'Ankle alphabet', category: 'Mobilitet', setsReps: '2 set per fot', notes: 'Rita alla bokstäver', priority: 'recommended' },
    { name: 'Lateral band walks', category: 'Stabilitet', setsReps: '3x12 per riktning', notes: 'Band runt fotleder', priority: 'recommended' },
  ],
  wrist: [
    { name: 'Wrist circles', category: 'Mobilitet', setsReps: '2x10 per riktning', notes: 'Full ROM', priority: 'essential' },
    { name: 'Wrist flexion/extension stretch', category: 'Mobilitet', setsReps: '3x20s per position', notes: 'Försiktig stretch', priority: 'essential' },
    { name: 'Rice bucket exercises', category: 'Styrka', setsReps: '2x30s', notes: 'Öppna/stäng händer', priority: 'recommended' },
  ],
};

// Get play style-specific recommendations
export function getPlayStyleRecommendations(playStyle: TennisPlayStyle): ExerciseRecommendation[] {
  const profile = TENNIS_PLAYSTYLE_PROFILES[playStyle];
  const recommendations: ExerciseRecommendation[] = [];

  // Add injury prevention based on common injuries
  profile.commonInjuries.forEach((injury) => {
    const injuryKey = injury.toLowerCase().includes('axel') ? 'shoulder' :
                      injury.toLowerCase().includes('armbåge') || injury.toLowerCase().includes('tennis') ? 'elbow' :
                      injury.toLowerCase().includes('rygg') || injury.toLowerCase().includes('mag') ? 'back' :
                      injury.toLowerCase().includes('knä') || injury.toLowerCase().includes('löpar') ? 'knee' :
                      injury.toLowerCase().includes('fotled') || injury.toLowerCase().includes('häl') || injury.toLowerCase().includes('vad') ? 'ankle' :
                      injury.toLowerCase().includes('handled') ? 'wrist' : null;

    if (injuryKey && INJURY_PREVENTION_EXERCISES[injuryKey]) {
      recommendations.push(...INJURY_PREVENTION_EXERCISES[injuryKey]);
    }
  });

  // Add play style-specific exercises
  if (playStyle === 'aggressive_baseliner') {
    recommendations.push(
      { name: 'Medicine ball rotational throws', category: 'Power', setsReps: '3x8 per sida', notes: 'Maximal rotation', priority: 'essential' },
      { name: 'Lateral bounds', category: 'Plyometrics', setsReps: '3x8 per sida', notes: 'Kraftig avfärd', priority: 'essential' },
      { name: 'Cable wood chops', category: 'Rotation', setsReps: '3x12 per sida', notes: 'Kontrollerad kraft', priority: 'essential' },
    );
  }

  if (playStyle === 'serve_and_volleyer') {
    recommendations.push(
      { name: 'Overhead medicine ball throws', category: 'Power', setsReps: '3x8', notes: 'Servespecifik', priority: 'essential' },
      { name: 'Split-step to sprint', category: 'Reaktion', setsReps: '4x6', notes: 'Maximal acceleration', priority: 'essential' },
      { name: 'Box jumps', category: 'Plyometrics', setsReps: '3x8', notes: 'Explosiv kraft', priority: 'essential' },
    );
  }

  if (playStyle === 'all_court') {
    recommendations.push(
      { name: 'Multi-directional lunges', category: 'Styrka', setsReps: '3x8 per riktning', notes: 'Alla plan', priority: 'essential' },
      { name: 'Agility ladder drills', category: 'Kvickhet', setsReps: '4x30s', notes: 'Varierade mönster', priority: 'essential' },
      { name: 'Rotational core work', category: 'Core', setsReps: '3x12 per sida', notes: 'Anti-rotation', priority: 'essential' },
    );
  }

  if (playStyle === 'counter_puncher') {
    recommendations.push(
      { name: 'Shuttle runs', category: 'Kondition', setsReps: '6x20m', notes: 'Korta pauser', priority: 'essential' },
      { name: 'Side shuffles', category: 'Kvickhet', setsReps: '4x30s', notes: 'Låg position', priority: 'essential' },
      { name: 'Recovery runs', category: 'Uthållighet', setsReps: '3x400m', notes: 'Tennistempo', priority: 'essential' },
    );
  }

  if (playStyle === 'big_server') {
    recommendations.push(
      { name: 'Overhead throws', category: 'Power', setsReps: '4x6', notes: 'Tung boll', priority: 'essential' },
      { name: 'Shoulder stability complex', category: 'Stabilitet', setsReps: '2 rundor', notes: 'Rotatorkuff fokus', priority: 'essential' },
      { name: 'Vertical jumps', category: 'Plyometrics', setsReps: '3x6', notes: 'Maximal höjd', priority: 'essential' },
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
  return TENNIS_SEASON_PHASES[phase];
}

// Get physical benchmarks
export function getPhysicalBenchmarks(playStyle: TennisPlayStyle): { elite: PhysicalBenchmarks; good: PhysicalBenchmarks } {
  return TENNIS_BENCHMARKS[playStyle];
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
export function calculateMatchLoadScore(matchData: MatchData): number {
  const durationScore = matchData.duration * 1.2;
  const intensityScore = (matchData.winnersCount + matchData.aces) * 3;
  const effortScore = matchData.setsPlayed * 25;
  const distanceScore = matchData.distanceCovered ? matchData.distanceCovered / 100 : 0;

  return Math.round(durationScore + intensityScore + effortScore + distanceScore);
}

// Get weekly load status
export function getLoadStatus(weeklyLoad: number, avgLoad: number): 'optimal' | 'caution' | 'danger' {
  const ratio = weeklyLoad / avgLoad;
  if (ratio >= 0.8 && ratio <= 1.3) return 'optimal';
  if (ratio >= 0.6 && ratio <= 1.5) return 'caution';
  return 'danger';
}

// Calculate weekly match load
export function calculateWeeklyMatchLoad(matches: MatchData[]): number {
  return matches.reduce((sum, match) => sum + match.playerLoadScore, 0);
}

// Get load recommendation based on play style
export function getLoadRecommendation(weeklyMinutes: number, playStyle: TennisPlayStyle): string {
  const thresholds: Record<TennisPlayStyle, { low: number; high: number }> = {
    aggressive_baseliner: { low: 300, high: 720 },
    serve_and_volleyer: { low: 280, high: 660 },
    all_court: { low: 320, high: 780 },
    counter_puncher: { low: 360, high: 840 },
    big_server: { low: 260, high: 600 },
  };

  const { low, high } = thresholds[playStyle];

  if (weeklyMinutes < low) return 'Låg matchbelastning - kan öka volymen';
  if (weeklyMinutes > high) return 'Hög matchbelastning - prioritera återhämtning';
  return 'Optimal matchbelastning';
}

// Surface-specific considerations
export function getSurfaceConsiderations(surface: 'hard' | 'clay' | 'grass' | 'indoor'): string[] {
  const considerations: Record<string, string[]> = {
    hard: [
      'Högre belastning på leder - prioritera mjuka skor',
      'Snabbare tempo - kortare återhämtningstid mellan slag',
      'Viktigare med stötdämpning och fotledsstabilitet',
    ],
    clay: [
      'Längre rallys - fokus på uthållighet',
      'Glidteknik viktigt - träna specifik fotwork',
      'Lägre skaderisk men högre konditionskrav',
    ],
    grass: [
      'Snabbare spel - reaktionssnabbhet prioriterat',
      'Låg studs - anpassa slagteknik',
      'Halkrisk - bra skor och fotledsstabilitet',
    ],
    indoor: [
      'Konsekvent studs - förutsägbart spel',
      'Ofta snabbare tempo',
      'Viktigt med luftkonditionering och vätskeintag',
    ],
  };

  return considerations[surface] || [];
}

const tennisExports = {
  TENNIS_PLAYSTYLE_PROFILES,
  TENNIS_SEASON_PHASES,
  TENNIS_BENCHMARKS,
  TOURNAMENT_PROTOCOLS,
  INJURY_PREVENTION_EXERCISES,
  getPlayStyleRecommendations,
  getSeasonPhaseTraining,
  getPhysicalBenchmarks,
  calculateBenchmarkPercentage,
  getBenchmarkRating,
  calculateMatchLoadScore,
  getLoadStatus,
  calculateWeeklyMatchLoad,
  getLoadRecommendation,
  getSurfaceConsiderations,
};

export default tennisExports;
