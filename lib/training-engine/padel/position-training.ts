/**
 * Padel Training Engine
 *
 * Position-specific training definitions, physical benchmarks,
 * season periodization, and injury prevention for padel players.
 */

// Position types (padel players typically specialize in one side)
export type PadelPosition = 'right_side' | 'left_side' | 'all_court';
export type SeasonPhase = 'off_season' | 'pre_season' | 'in_season' | 'tournament';

// Position profile interface
export interface PositionProfile {
  position: PadelPosition;
  displayName: string;
  description: string;
  keyPhysicalAttributes: string[];
  avgRalliesPerSet: { min: number; max: number };
  avgPointsPerMatch: { min: number; max: number };
  courtCoverage: string;
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

// Tournament protocol interface
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
  agilitySpider: number | null; // seconds
  agility505: number | null; // seconds (5-10-5 shuttle)
  lateralShuffle: number | null; // seconds (10m lateral)
  verticalJump: number | null; // cm
  medicineBallThrow: number | null; // meters (3kg ball)
  yoyoIR1Level: number | null;
  gripStrength: number | null; // kg
  reactionTime: number | null; // ms
}

export type PadelLocale = 'en' | 'sv';

const ENGLISH_PHRASES: Record<string, string> = {
  'Högersida (Derechos)': 'Right side (Derechos)',
  'Vänstersida (Revés)': 'Left side (Revés)',
  Allroundspelare: 'All-court player',
  'Offensiv spelare som dominerar med forehand från högersidan. Ansvarar för avslut och smash. Kräver explosiv kraft och aggressivt spel.': 'Offensive player who dominates with the forehand from the right side. Responsible for finishing and smashes. Requires explosive power and aggressive play.',
  'Strategisk spelare som styr spelet från vänstersidan. Stark backhand och utmärkt läsförmåga. Fokus på placering och lobbar.': 'Strategic player who controls play from the left side. Strong backhand and excellent reading ability. Focuses on placement and lobs.',
  'Flexibel spelare som kan spela båda sidorna effektivt. Anpassar sig efter partner och motståndarpar. Taktiskt mångsidig.': 'Flexible player who can play both sides effectively. Adapts to partner and opponents. Tactically versatile.',
  Explosivitet: 'Explosiveness',
  Smashkraft: 'Smash power',
  Forehandstyrka: 'Forehand strength',
  Reaktionssnabbhet: 'Reaction speed',
  'Vertikalt hopp': 'Vertical jump',
  Spelförståelse: 'Game understanding',
  Backhandstyrka: 'Backhand strength',
  Uthållighet: 'Endurance',
  Positionering: 'Positioning',
  'Lateralt snabbhet': 'Lateral speed',
  Mångsidighet: 'Versatility',
  Anpassningsförmåga: 'Adaptability',
  Kondition: 'Conditioning',
  'Taktisk förståelse': 'Tactical understanding',
  Balans: 'Balance',
  'Höger sida, fokus på nätspel och smash': 'Right side, focused on net play and smash',
  'Vänster sida, täcker mittplan och lobbar': 'Left side, covers the middle and lobs',
  'Hela banan, flexibel positionering': 'Whole court, flexible positioning',
  Framåtrush: 'Forward rushes',
  'Vertikala hopp': 'Vertical jumps',
  'Snabba starter': 'Fast starts',
  'Rotation för smash': 'Smash rotation',
  Sidledsförflyttning: 'Lateral movement',
  Positionsväxlingar: 'Position switches',
  'Defensiva rörelser': 'Defensive movements',
  'Snabb återhämtning': 'Fast recovery',
  'Alla riktningar': 'All directions',
  'Varierad hastighet': 'Varied speed',
  'Snabba positionsbyten': 'Fast position changes',
  'Anpassad rörelse': 'Adapted movement',
  Grundstyrka: 'Base strength',
  'Aerob bas': 'Aerobic base',
  Skadeförebyggande: 'Injury prevention',
  Teknikutveckling: 'Technique development',
  Rörlighet: 'Mobility',
  'Explosiv kraft': 'Explosive power',
  'Padelspecifik kondition': 'Padel-specific conditioning',
  Matchsimulering: 'Match simulation',
  Partnerspel: 'Partner play',
  Styrkeunderhåll: 'Strength maintenance',
  Återhämtning: 'Recovery',
  Matchförberedelse: 'Match preparation',
  'Taktisk anpassning': 'Tactical adaptation',
  'Peak performance': 'Peak performance',
  'Mental förberedelse': 'Mental preparation',
  'Taktisk perfektion': 'Tactical precision',
  'Maximal återhämtning': 'Maximal recovery',
  'Hypertrofi och maxstyrka med fokus på bål, axlar och ben': 'Hypertrophy and maximum strength focused on trunk, shoulders, and legs',
  'Aerob basträning och gradvis uppbyggnad av intensitet': 'Aerobic base training and gradual intensity build-up',
  'Kraftutveckling och rotationsstyrka för slag': 'Power development and rotational strength for shots',
  'Intervallträning och padelspecifika löpövningar': 'Interval training and padel-specific running drills',
  'Underhåll av styrka och explosivitet med låg volym': 'Strength and explosiveness maintenance with low volume',
  'Matchspecifik kondition och aktiv återhämtning': 'Match-specific conditioning and active recovery',
  'Endast aktiveringsövningar och lätt underhåll': 'Activation drills and light maintenance only',
  'Lätt rörelse och återhämtning mellan matcher': 'Light movement and recovery between matches',
  Rotatorkuff: 'Rotator cuff',
  Mobilitet: 'Mobility',
  Stabilitet: 'Stability',
  Styrka: 'Strength',
  Rehab: 'Rehab',
  Core: 'Core',
  'Anti-rotation': 'Anti-rotation',
  Kontroll: 'Control',
  Power: 'Power',
  Plyometrics: 'Plyometrics',
  Kvickhet: 'Agility',
  Reaktion: 'Reaction',
  'External rotation med band': 'Band external rotation',
  Greppträning: 'Grip training',
  'Greppträning med boll': 'Ball grip training',
  'Smash-hopp med medicinboll': 'Medicine ball smash jumps',
  Rotationskast: 'Rotational throws',
  '3x15 per arm': '3x15 per arm',
  '3x30s per sida': '3x30s per side',
  '3x12 per riktning': '3x12 per direction',
  '3x10 per sida': '3x10 per side',
  '3x8 per ben': '3x8 per leg',
  '3x30s per ben': '3x30s per leg',
  '3x12 per sida': '3x12 per side',
  '3x8 per sida': '3x8 per side',
  '3x8 per riktning': '3x8 per direction',
  'Armbågen vid sidan': 'Elbow at the side',
  'Försiktig posterior kapselstretch': 'Gentle posterior capsule stretch',
  'Fokus på scapula protraction': 'Focus on scapular protraction',
  'Hög kabel, utåtrotation': 'High cable, external rotation',
  'Både flexion och extension': 'Both flexion and extension',
  'Långsam excentrisk fas': 'Slow eccentric phase',
  'Med lätt vikt': 'With light weight',
  'Variera greppstyrka': 'Vary grip strength',
  'Kontrollerad rörelse': 'Controlled movement',
  'Ryggen i golvet': 'Back on the floor',
  'Flödande rörelse': 'Flowing movement',
  'Kontrollerad anti-rotation': 'Controlled anti-rotation',
  'Fokus på knäkontroll': 'Focus on knee control',
  'Padelspecifik rörelse': 'Padel-specific movement',
  'Med band': 'With band',
  Kontrollerad: 'Controlled',
  'Progressivt instabilt underlag': 'Progressively unstable surface',
  'Band runt fotleder': 'Band around ankles',
  'Full ROM': 'Full ROM',
  'Försiktig stretch': 'Gentle stretch',
  'Kläm och släpp': 'Squeeze and release',
  Höftrotation: 'Hip rotation',
  Halvknästående: 'Half-kneeling',
  'Gluteus medius': 'Gluteus medius',
  'Simulera smashrörelse': 'Simulate smash motion',
  'Forehand-specifik': 'Forehand-specific',
  'Backhand-specifik': 'Backhand-specific',
  Sidledsrörelse: 'Lateral movement',
  'Korta pauser': 'Short rests',
  'Alla plan': 'All planes',
  'Varierade mönster': 'Varied patterns',
  'Följ partnerns rörelser': "Follow your partner's movements",
  'Kommunicera tydligt med din partner om vem som tar lobben': 'Communicate clearly with your partner about who takes the lob',
  'Var beredd att täcka mitten när din partner går för smash': 'Be ready to cover the middle when your partner goes for a smash',
  'Fokusera på att avsluta poäng när du får chansen vid nätet': 'Focus on finishing points when you get the chance at the net',
  'Håll koll på motståndarnas positioner för att hitta öppningar': 'Track opponent positions to find openings',
  'Styr tempot i spelet och diktera var bollen ska gå': 'Control the pace and dictate where the ball should go',
  'Var beredd att täcka hela vänster sida inklusive lobbar': 'Be ready to cover the entire left side including lobs',
  'Kommunicera med din partner om positionsbyten': 'Communicate with your partner about position switches',
  'Använd lobbar strategiskt för att skapa tid': 'Use lobs strategically to create time',
  'Anpassa ditt spel efter din partners styrkor': "Adapt your game to your partner's strengths",
  'Var flexibel med sidbyten under matchen': 'Stay flexible with side switches during the match',
  'Kommunicera konstant om vem som tar vilken boll': 'Communicate constantly about who takes each ball',
  'Utnyttja din mångsidighet för att överraska motståndarna': 'Use your versatility to surprise opponents',
  'Låg matchbelastning - kan öka volymen': 'Low match load - can increase volume',
  'Hög matchbelastning - prioritera återhämtning': 'High match load - prioritize recovery',
  'Optimal matchbelastning': 'Optimal match load',
};

export function getPadelLocale(locale: string): PadelLocale {
  return locale === 'sv' ? 'sv' : 'en';
}

export function translatePadelText(locale: string, value: string): string {
  return getPadelLocale(locale) === 'sv' ? value : ENGLISH_PHRASES[value] ?? value;
}

export function translatePadelList(locale: string, values: string[]): string[] {
  return values.map((value) => translatePadelText(locale, value));
}

// Match data interface
export interface MatchData {
  matchId: string;
  date: Date;
  opponents: string;
  partner: string;
  setsPlayed: number;
  gamesWon: number;
  gamesLost: number;
  duration: number; // minutes
  smashesAttempted: number;
  winnersCount: number;
  unforcedErrors: number;
  playerLoadScore: number;
}

// Position profiles
export const PADEL_POSITION_PROFILES: Record<PadelPosition, PositionProfile> = {
  right_side: {
    position: 'right_side',
    displayName: 'Högersida (Derechos)',
    description: 'Offensiv spelare som dominerar med forehand från högersidan. Ansvarar för avslut och smash. Kräver explosiv kraft och aggressivt spel.',
    keyPhysicalAttributes: ['Explosivitet', 'Smashkraft', 'Forehandstyrka', 'Reaktionssnabbhet', 'Vertikalt hopp'],
    avgRalliesPerSet: { min: 35, max: 50 },
    avgPointsPerMatch: { min: 60, max: 100 },
    courtCoverage: 'Höger sida, fokus på nätspel och smash',
    primaryMovementPatterns: ['Framåtrush', 'Vertikala hopp', 'Snabba starter', 'Rotation för smash'],
    commonInjuries: ['Axelskador', 'Armbågsproblem', 'Ryggbesvär', 'Knäskador'],
  },
  left_side: {
    position: 'left_side',
    displayName: 'Vänstersida (Revés)',
    description: 'Strategisk spelare som styr spelet från vänstersidan. Stark backhand och utmärkt läsförmåga. Fokus på placering och lobbar.',
    keyPhysicalAttributes: ['Spelförståelse', 'Backhandstyrka', 'Uthållighet', 'Positionering', 'Lateralt snabbhet'],
    avgRalliesPerSet: { min: 40, max: 55 },
    avgPointsPerMatch: { min: 65, max: 110 },
    courtCoverage: 'Vänster sida, täcker mittplan och lobbar',
    primaryMovementPatterns: ['Sidledsförflyttning', 'Positionsväxlingar', 'Defensiva rörelser', 'Snabb återhämtning'],
    commonInjuries: ['Tennisarmbåge', 'Axelbesvär', 'Höftproblem', 'Fotledsskador'],
  },
  all_court: {
    position: 'all_court',
    displayName: 'Allroundspelare',
    description: 'Flexibel spelare som kan spela båda sidorna effektivt. Anpassar sig efter partner och motståndarpar. Taktiskt mångsidig.',
    keyPhysicalAttributes: ['Mångsidighet', 'Anpassningsförmåga', 'Kondition', 'Taktisk förståelse', 'Balans'],
    avgRalliesPerSet: { min: 38, max: 52 },
    avgPointsPerMatch: { min: 62, max: 105 },
    courtCoverage: 'Hela banan, flexibel positionering',
    primaryMovementPatterns: ['Alla riktningar', 'Varierad hastighet', 'Snabba positionsbyten', 'Anpassad rörelse'],
    commonInjuries: ['Axelskador', 'Knäproblem', 'Ryggbesvär', 'Handledssmärta'],
  },
};

// Season phase training definitions
export const PADEL_SEASON_PHASES: Record<SeasonPhase, SeasonPhaseTraining> = {
  off_season: {
    phase: 'off_season',
    focus: ['Grundstyrka', 'Aerob bas', 'Skadeförebyggande', 'Teknikutveckling', 'Rörlighet'],
    strengthEmphasis: 'Hypertrofi och maxstyrka med fokus på bål, axlar och ben',
    conditioningEmphasis: 'Aerob basträning och gradvis uppbyggnad av intensitet',
    weeklyStructure: {
      strengthSessions: 4,
      conditioningSessions: 3,
      technicalSessions: 2,
      matchPlay: 0,
      restDays: 2,
    },
  },
  pre_season: {
    phase: 'pre_season',
    focus: ['Explosiv kraft', 'Padelspecifik kondition', 'Matchsimulering', 'Partnerspel'],
    strengthEmphasis: 'Kraftutveckling och rotationsstyrka för slag',
    conditioningEmphasis: 'Intervallträning och padelspecifika löpövningar',
    weeklyStructure: {
      strengthSessions: 3,
      conditioningSessions: 3,
      technicalSessions: 4,
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
      technicalSessions: 3,
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

// Physical benchmarks by position (elite and good levels)
export const PADEL_BENCHMARKS: Record<PadelPosition, { elite: PhysicalBenchmarks; good: PhysicalBenchmarks }> = {
  right_side: {
    elite: {
      sprint5m: 0.98,
      sprint10m: 1.68,
      agilitySpider: 15.0,
      agility505: 2.18,
      lateralShuffle: 3.8,
      verticalJump: 55,
      medicineBallThrow: 12.0,
      yoyoIR1Level: 18.0,
      gripStrength: 55,
      reactionTime: 180,
    },
    good: {
      sprint5m: 1.08,
      sprint10m: 1.82,
      agilitySpider: 16.5,
      agility505: 2.45,
      lateralShuffle: 4.3,
      verticalJump: 45,
      medicineBallThrow: 10.0,
      yoyoIR1Level: 16.0,
      gripStrength: 45,
      reactionTime: 220,
    },
  },
  left_side: {
    elite: {
      sprint5m: 1.00,
      sprint10m: 1.72,
      agilitySpider: 14.8,
      agility505: 2.15,
      lateralShuffle: 3.6,
      verticalJump: 50,
      medicineBallThrow: 11.0,
      yoyoIR1Level: 19.0,
      gripStrength: 52,
      reactionTime: 175,
    },
    good: {
      sprint5m: 1.10,
      sprint10m: 1.88,
      agilitySpider: 16.2,
      agility505: 2.42,
      lateralShuffle: 4.1,
      verticalJump: 40,
      medicineBallThrow: 9.0,
      yoyoIR1Level: 17.0,
      gripStrength: 42,
      reactionTime: 215,
    },
  },
  all_court: {
    elite: {
      sprint5m: 0.99,
      sprint10m: 1.70,
      agilitySpider: 14.9,
      agility505: 2.16,
      lateralShuffle: 3.7,
      verticalJump: 52,
      medicineBallThrow: 11.5,
      yoyoIR1Level: 18.5,
      gripStrength: 53,
      reactionTime: 178,
    },
    good: {
      sprint5m: 1.09,
      sprint10m: 1.85,
      agilitySpider: 16.4,
      agility505: 2.44,
      lateralShuffle: 4.2,
      verticalJump: 42,
      medicineBallThrow: 9.5,
      yoyoIR1Level: 16.5,
      gripStrength: 43,
      reactionTime: 218,
    },
  },
};

// Tournament protocols
export const TOURNAMENT_PROTOCOLS: TournamentProtocol[] = [
  {
    day: 'T-3',
    focus: 'Sista intensiva träningspass',
    intensity: 'high',
    activities: ['Matchsimulering', 'Smashträning', 'Intensiv styrka', 'Taktik med partner'],
  },
  {
    day: 'T-2',
    focus: 'Teknisk finslipning',
    intensity: 'medium',
    activities: ['Slagträning', 'Lobbträning', 'Nätspel', 'Lätt kondition'],
  },
  {
    day: 'T-1',
    focus: 'Aktivering och förberedelse',
    intensity: 'low',
    activities: ['Lätt hitting med partner', 'Mobility', 'Mental förberedelse', 'Vila'],
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
    { name: 'Scapula push-ups', category: 'Stabilitet', setsReps: '3x12', notes: 'Fokus på scapula protraction', priority: 'essential' },
    { name: 'Face pulls', category: 'Styrka', setsReps: '3x15', notes: 'Hög kabel, utåtrotation', priority: 'recommended' },
  ],
  elbow: [
    { name: 'Wrist curls', category: 'Styrka', setsReps: '3x15', notes: 'Både flexion och extension', priority: 'essential' },
    { name: 'Eccentric wrist extension', category: 'Rehab', setsReps: '3x15', notes: 'Långsam excentrisk fas', priority: 'essential' },
    { name: 'Supination/Pronation', category: 'Mobilitet', setsReps: '3x12 per riktning', notes: 'Med lätt vikt', priority: 'essential' },
    { name: 'Greppträning', category: 'Styrka', setsReps: '3x10s', notes: 'Variera greppstyrka', priority: 'recommended' },
  ],
  back: [
    { name: 'Bird dogs', category: 'Core', setsReps: '3x10 per sida', notes: 'Kontrollerad rörelse', priority: 'essential' },
    { name: 'Dead bugs', category: 'Core', setsReps: '3x10 per sida', notes: 'Ryggen i golvet', priority: 'essential' },
    { name: 'Cat-cow stretches', category: 'Mobilitet', setsReps: '2x10', notes: 'Flödande rörelse', priority: 'essential' },
    { name: 'Pallof press', category: 'Anti-rotation', setsReps: '3x10 per sida', notes: 'Kontrollerad anti-rotation', priority: 'recommended' },
  ],
  knee: [
    { name: 'Single-leg squats', category: 'Styrka', setsReps: '3x8 per ben', notes: 'Fokus på knäkontroll', priority: 'essential' },
    { name: 'Lateral lunges', category: 'Styrka', setsReps: '3x10 per sida', notes: 'Padelspecifik rörelse', priority: 'essential' },
    { name: 'Terminal knee extensions', category: 'Rehab', setsReps: '3x15', notes: 'Med band', priority: 'recommended' },
    { name: 'Step-downs', category: 'Kontroll', setsReps: '3x10 per ben', notes: 'Kontrollerad', priority: 'recommended' },
  ],
  ankle: [
    { name: 'Single-leg balance', category: 'Balans', setsReps: '3x30s per ben', notes: 'Progressivt instabilt underlag', priority: 'essential' },
    { name: 'Calf raises', category: 'Styrka', setsReps: '3x15 per ben', notes: 'Full ROM', priority: 'essential' },
    { name: 'Lateral band walks', category: 'Stabilitet', setsReps: '3x12 per riktning', notes: 'Band runt fotleder', priority: 'essential' },
    { name: 'Ankle circles', category: 'Mobilitet', setsReps: '2x10 per riktning', notes: 'Full ROM', priority: 'recommended' },
  ],
  wrist: [
    { name: 'Wrist circles', category: 'Mobilitet', setsReps: '2x10 per riktning', notes: 'Full ROM', priority: 'essential' },
    { name: 'Wrist flexion/extension stretch', category: 'Mobilitet', setsReps: '3x20s per position', notes: 'Försiktig stretch', priority: 'essential' },
    { name: 'Greppträning med boll', category: 'Styrka', setsReps: '3x15', notes: 'Kläm och släpp', priority: 'recommended' },
  ],
  hip: [
    { name: '90/90 stretch', category: 'Mobilitet', setsReps: '3x30s per sida', notes: 'Höftrotation', priority: 'essential' },
    { name: 'Hip flexor stretch', category: 'Mobilitet', setsReps: '3x30s per sida', notes: 'Halvknästående', priority: 'essential' },
    { name: 'Clamshells', category: 'Styrka', setsReps: '3x15 per sida', notes: 'Gluteus medius', priority: 'essential' },
    { name: 'Fire hydrants', category: 'Mobilitet', setsReps: '3x12 per sida', notes: 'Kontrollerad rörelse', priority: 'recommended' },
  ],
};

// Get position-specific recommendations
export function getPositionRecommendations(position: PadelPosition): ExerciseRecommendation[] {
  const profile = PADEL_POSITION_PROFILES[position];
  const recommendations: ExerciseRecommendation[] = [];

  // Add injury prevention based on common injuries
  profile.commonInjuries.forEach((injury) => {
    const injuryKey = injury.toLowerCase().includes('axel') ? 'shoulder' :
                      injury.toLowerCase().includes('armbåge') || injury.toLowerCase().includes('tennis') ? 'elbow' :
                      injury.toLowerCase().includes('rygg') ? 'back' :
                      injury.toLowerCase().includes('knä') ? 'knee' :
                      injury.toLowerCase().includes('fotled') ? 'ankle' :
                      injury.toLowerCase().includes('handled') ? 'wrist' :
                      injury.toLowerCase().includes('höft') ? 'hip' : null;

    if (injuryKey && INJURY_PREVENTION_EXERCISES[injuryKey]) {
      recommendations.push(...INJURY_PREVENTION_EXERCISES[injuryKey]);
    }
  });

  // Add position-specific exercises
  if (position === 'right_side') {
    recommendations.push(
      { name: 'Smash-hopp med medicinboll', category: 'Power', setsReps: '3x8', notes: 'Simulera smashrörelse', priority: 'essential' },
      { name: 'Rotationskast', category: 'Power', setsReps: '3x10 per sida', notes: 'Forehand-specifik', priority: 'essential' },
      { name: 'Box jumps', category: 'Plyometrics', setsReps: '3x8', notes: 'Explosiv kraft', priority: 'essential' },
    );
  }

  if (position === 'left_side') {
    recommendations.push(
      { name: 'Backhand rotation throws', category: 'Power', setsReps: '3x10', notes: 'Backhand-specifik', priority: 'essential' },
      { name: 'Lateral bounds', category: 'Plyometrics', setsReps: '3x8 per sida', notes: 'Sidledsrörelse', priority: 'essential' },
      { name: 'Shuttle runs', category: 'Kondition', setsReps: '6x20m', notes: 'Korta pauser', priority: 'essential' },
    );
  }

  if (position === 'all_court') {
    recommendations.push(
      { name: 'Multi-directional lunges', category: 'Styrka', setsReps: '3x8 per riktning', notes: 'Alla plan', priority: 'essential' },
      { name: 'Agility ladder drills', category: 'Kvickhet', setsReps: '4x30s', notes: 'Varierade mönster', priority: 'essential' },
      { name: 'Partner mirror drills', category: 'Reaktion', setsReps: '4x30s', notes: 'Följ partnerns rörelser', priority: 'essential' },
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
  return PADEL_SEASON_PHASES[phase];
}

// Get physical benchmarks
export function getPhysicalBenchmarks(position: PadelPosition): { elite: PhysicalBenchmarks; good: PhysicalBenchmarks } {
  return PADEL_BENCHMARKS[position];
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
  const durationScore = matchData.duration * 1.0;
  const intensityScore = (matchData.winnersCount + matchData.smashesAttempted) * 2;
  const setScore = matchData.setsPlayed * 20;

  return Math.round(durationScore + intensityScore + setScore);
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

// Get load recommendation based on position
export function getLoadRecommendation(weeklyMinutes: number, position: PadelPosition, locale: string = 'sv'): string {
  const thresholds: Record<PadelPosition, { low: number; high: number }> = {
    right_side: { low: 180, high: 480 },
    left_side: { low: 200, high: 520 },
    all_court: { low: 190, high: 500 },
  };

  const { low, high } = thresholds[position];

  if (weeklyMinutes < low) return translatePadelText(locale, 'Låg matchbelastning - kan öka volymen');
  if (weeklyMinutes > high) return translatePadelText(locale, 'Hög matchbelastning - prioritera återhämtning');
  return translatePadelText(locale, 'Optimal matchbelastning');
}

// Partner synergy tips
export function getPartnerSynergyTips(position: PadelPosition, locale: string = 'sv'): string[] {
  const tips: Record<PadelPosition, string[]> = {
    right_side: [
      'Kommunicera tydligt med din partner om vem som tar lobben',
      'Var beredd att täcka mitten när din partner går för smash',
      'Fokusera på att avsluta poäng när du får chansen vid nätet',
      'Håll koll på motståndarnas positioner för att hitta öppningar',
    ],
    left_side: [
      'Styr tempot i spelet och diktera var bollen ska gå',
      'Var beredd att täcka hela vänster sida inklusive lobbar',
      'Kommunicera med din partner om positionsbyten',
      'Använd lobbar strategiskt för att skapa tid',
    ],
    all_court: [
      'Anpassa ditt spel efter din partners styrkor',
      'Var flexibel med sidbyten under matchen',
      'Kommunicera konstant om vem som tar vilken boll',
      'Utnyttja din mångsidighet för att överraska motståndarna',
    ],
  };

  return translatePadelList(locale, tips[position]);
}

const padelExports = {
  PADEL_POSITION_PROFILES,
  PADEL_SEASON_PHASES,
  PADEL_BENCHMARKS,
  TOURNAMENT_PROTOCOLS,
  INJURY_PREVENTION_EXERCISES,
  getPositionRecommendations,
  getSeasonPhaseTraining,
  getPhysicalBenchmarks,
  calculateBenchmarkPercentage,
  getBenchmarkRating,
  calculateMatchLoadScore,
  getLoadStatus,
  calculateWeeklyMatchLoad,
  getLoadRecommendation,
  getPartnerSynergyTips,
  getPadelLocale,
  translatePadelText,
  translatePadelList,
};

export default padelExports;
