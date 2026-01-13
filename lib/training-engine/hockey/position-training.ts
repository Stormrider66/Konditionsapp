/**
 * Hockey Position-Specific Training Definitions
 *
 * Provides position-specific training guidelines, exercise recommendations,
 * and periodization strategies for ice hockey players.
 */

export type HockeyPosition = 'center' | 'wing' | 'defense' | 'goalie';
export type SeasonPhase = 'off_season' | 'pre_season' | 'in_season' | 'playoffs';

export interface PositionProfile {
  position: HockeyPosition;
  description: string;
  physicalDemands: string[];
  primaryStrengthFocus: string[];
  primaryConditioningFocus: string[];
  commonInjuryRisks: string[];
  keyExercises: ExerciseRecommendation[];
  recommendedTestProtocols: string[];
}

export interface ExerciseRecommendation {
  name: string;
  category: 'strength' | 'power' | 'conditioning' | 'mobility' | 'skill';
  description: string;
  sets?: string;
  reps?: string;
  intensity?: string;
  frequency?: string;
}

export interface SeasonPhaseTraining {
  phase: SeasonPhase;
  duration: string;
  primaryGoals: string[];
  strengthFocus: {
    volumeMultiplier: number; // 1.0 = normal
    intensityLevel: 'low' | 'moderate' | 'high' | 'max';
    sessionsPerWeek: number;
    focusAreas: string[];
  };
  conditioningFocus: {
    volumeMultiplier: number;
    type: string[];
    sessionsPerWeek: number;
  };
  recoveryPriority: 'low' | 'moderate' | 'high' | 'critical';
  recommendedActivities: string[];
  avoidActivities: string[];
}

// ==================== POSITION PROFILES ====================

export const HOCKEY_POSITION_PROFILES: Record<HockeyPosition, PositionProfile> = {
  center: {
    position: 'center',
    description: 'Tvåvägsspelare med ansvar i båda zonerna. Spelar tekningar, backcheckar aktivt, och driver offensivt spel.',
    physicalDemands: [
      'Hög aerob kapacitet för kontinuerligt spel',
      'Explosiv acceleration för tekningar och breakaways',
      'Styrka i överkroppen för tekningar och dueller',
      'Snabb riktningsförändring',
      'Mental uthållighet för spel i alla zoner',
    ],
    primaryStrengthFocus: [
      'Core-stabilitet för tekningar',
      'Överkroppsstyrka för dueller',
      'Benstyrka för acceleration',
      'Rotationsstyrka för skott',
    ],
    primaryConditioningFocus: [
      'Intervalltolerans (30-60 sek byten)',
      'Aerob baskapacitet',
      'Sprint-uthållighet',
      'Snabb återhämtning mellan byten',
    ],
    commonInjuryRisks: [
      'Ljumskskador',
      'Höftflexor-problematik',
      'Axelskador från kollisioner',
      'Handleds-/handskador från tekningar',
    ],
    keyExercises: [
      { name: 'Cable Woodchops', category: 'strength', description: 'Rotationsstyrka för tekningar och skott', sets: '3', reps: '10-12/sida' },
      { name: 'Trap Bar Deadlift', category: 'strength', description: 'Helkroppsstyrka och acceleration', sets: '4', reps: '5-8' },
      { name: 'Pallof Press', category: 'strength', description: 'Anti-rotation core-styrka', sets: '3', reps: '12-15/sida' },
      { name: 'Bulgarian Split Squat', category: 'strength', description: 'Unilateral benstyrka', sets: '3', reps: '8-10/ben' },
      { name: 'Box Jumps', category: 'power', description: 'Explosiv kraft', sets: '4', reps: '5' },
      { name: 'Bike Intervals', category: 'conditioning', description: '30/30 sek arbete/vila', sets: '10-15', reps: 'intervaller' },
    ],
    recommendedTestProtocols: [
      '30-15 IFT',
      'Vertikalt hopp',
      'Pro-agility test',
      'Bench press 1RM',
    ],
  },

  wing: {
    position: 'wing',
    description: 'Offensiv spelare med fokus på målskytte och playmaking. Kräver hög toppfart och skottechnik.',
    physicalDemands: [
      'Maximal sprintkapacitet',
      'Explosiv skottstyrka',
      'Kvickhet i trånga utrymmen',
      'Uthållighet för forecheck',
    ],
    primaryStrengthFocus: [
      'Skottstyrka (rotation och handleder)',
      'Explosiv benkraft',
      'Handleds-/underarmsstyrka',
      'Core-stabilitet för balans',
    ],
    primaryConditioningFocus: [
      'Sprint-återhämtning',
      'Anaerob kapacitet',
      'Acceleration/dekceleration',
    ],
    commonInjuryRisks: [
      'Hamstringsskador',
      'Ljumskskador',
      'Handledsskador',
      'Axelskador från kroppscheck',
    ],
    keyExercises: [
      { name: 'Rotational Med Ball Throws', category: 'power', description: 'Explosiv rotationskraft för skott', sets: '4', reps: '6-8/sida' },
      { name: 'Wrist Curls/Extensions', category: 'strength', description: 'Handleds-/underarmsstyrka', sets: '3', reps: '15-20' },
      { name: 'Sled Sprints', category: 'power', description: 'Explosiv acceleration', sets: '6-8', reps: '10-20m' },
      { name: 'Single-Leg RDL', category: 'strength', description: 'Hamstring och balans', sets: '3', reps: '8-10/ben' },
      { name: 'Lateral Bounds', category: 'power', description: 'Sidorörelse och explosivitet', sets: '3', reps: '6-8/sida' },
      { name: 'Sprint Intervals', category: 'conditioning', description: '10-20 sek max, 40-60 sek vila', sets: '8-12', reps: 'intervaller' },
    ],
    recommendedTestProtocols: [
      '10m/30m sprint',
      'Lateralt hopp',
      'Shot speed test',
      'Repeated sprint ability',
    ],
  },

  defense: {
    position: 'defense',
    description: 'Defensiv ankare med fokus på positionering, fysiskt spel och puckflytt. Längre istid kräver hög uthållighet.',
    physicalDemands: [
      'Hög aerob kapacitet för långa byten',
      'Stark baklängesåkning',
      'Fysisk styrka för dueller',
      'Skottprecision och kraft från blålinjen',
      'Snabb vändning och pivotering',
    ],
    primaryStrengthFocus: [
      'Överkroppsstyrka för dueller i hörn',
      'Core-stabilitet för balans',
      'Gluteal och höftstyrka',
      'Axelstyrka och stabilitet',
    ],
    primaryConditioningFocus: [
      'Aerob uthållighet för längre byten',
      'Återhämtning mellan intensiva moment',
      'Baklänges-skridskospecifik kondition',
    ],
    commonInjuryRisks: [
      'Höftimpingement',
      'Ljumskskador',
      'Axelskador',
      'Knäskador (MCL/ACL)',
      'Ryggproblem',
    ],
    keyExercises: [
      { name: 'Sumo Deadlift', category: 'strength', description: 'Höft- och glutealstyrka', sets: '4', reps: '5-6' },
      { name: 'Lateral Lunge', category: 'strength', description: 'Lateral rörlighet och styrka', sets: '3', reps: '8-10/sida' },
      { name: 'Face Pulls', category: 'strength', description: 'Axelstabilitet och hållning', sets: '3', reps: '12-15' },
      { name: 'Hip 90/90 Stretch', category: 'mobility', description: 'Höftrörlighet', frequency: 'Dagligen' },
      { name: 'Copenhagen Plank', category: 'strength', description: 'Adduktorstyrka för skadeförebyggande', sets: '3', reps: '20-30 sek/sida' },
      { name: 'Tempo Bike', category: 'conditioning', description: 'Aerob bas, 20-30 min steady state', sets: '1', reps: '20-30 min' },
    ],
    recommendedTestProtocols: [
      '30-15 IFT',
      'T-test agility',
      'Hip ROM screening',
      '3RM Squat',
    ],
  },

  goalie: {
    position: 'goalie',
    description: 'Specialist med unika krav på reaktionsförmåga, flexibilitet och mental fokus. Korta explosiva rörelser.',
    physicalDemands: [
      'Extrem höftflexibilitet (butterfly)',
      'Explosiv lateral kraft',
      'Snabb reaktionsförmåga',
      'Core-stabilitet i alla positioner',
      'Mental uthållighet och fokus',
    ],
    primaryStrengthFocus: [
      'Höft- och glutealstyrka',
      'Quadriceps för butterfly-push',
      'Core-stabilitet i roterade positioner',
      'Explosiv lateral kraft',
    ],
    primaryConditioningFocus: [
      'Korta explosiva intervaller',
      'Reaktionsträning',
      'Mental kondition',
    ],
    commonInjuryRisks: [
      'Höftflexor-tendinopati',
      'Groin strains',
      'Knäskador (menisk, patella)',
      'Höftlabrum-skador',
      'Rygg-/bålskador',
    ],
    keyExercises: [
      { name: '90/90 Hip Lifts', category: 'mobility', description: 'Höftrörlighet i butterfly-position', sets: '3', reps: '10-15' },
      { name: 'Lateral Slide Board', category: 'power', description: 'Lateral push-kraft', sets: '4', reps: '30 sek' },
      { name: 'Goblet Squat', category: 'strength', description: 'Djup huk med god teknik', sets: '3', reps: '10-12' },
      { name: 'Dead Bug Variations', category: 'strength', description: 'Core-kontroll', sets: '3', reps: '10/sida' },
      { name: 'Banded Clamshells', category: 'strength', description: 'Gluteus medius aktivering', sets: '3', reps: '15-20/sida' },
      { name: 'Reaction Ball Drills', category: 'skill', description: 'Reaktionstid och handkoordination', sets: '5-10', reps: 'minuter' },
    ],
    recommendedTestProtocols: [
      'Functional Movement Screen (FMS)',
      'Hip ROM assessment',
      'Lateral push test',
      'Reaction time test',
    ],
  },
};

// ==================== SEASON PHASE TRAINING ====================

export const HOCKEY_SEASON_PHASES: Record<SeasonPhase, SeasonPhaseTraining> = {
  off_season: {
    phase: 'off_season',
    duration: '8-12 veckor (maj-juli)',
    primaryGoals: [
      'Bygga aerob baskapacitet',
      'Maxstyrka och hypertrofi',
      'Åtgärda skador och obalanser',
      'Rörlighet och mobilitet',
    ],
    strengthFocus: {
      volumeMultiplier: 1.2,
      intensityLevel: 'high',
      sessionsPerWeek: 4,
      focusAreas: ['Maxstyrka', 'Hypertrofi', 'Rörlighet', 'Obalanser'],
    },
    conditioningFocus: {
      volumeMultiplier: 1.0,
      type: ['Aerob bas (löpning, cykling)', 'Låg-intensiv intervall', 'Cross-training'],
      sessionsPerWeek: 3,
    },
    recoveryPriority: 'moderate',
    recommendedActivities: [
      'Löpning (gradvis uppbyggnad)',
      'Cykling (indoor/outdoor)',
      'Simning',
      'Styrketräning med fokus på maxstyrka',
      'Yoga/rörlighet',
    ],
    avoidActivities: [
      'Hög-intensiv sprint tidigt',
      'Maximal is-träning',
    ],
  },

  pre_season: {
    phase: 'pre_season',
    duration: '4-6 veckor (augusti-september)',
    primaryGoals: [
      'Sport-specifik kondition',
      'Explosivitet och power',
      'Is-specifik träning',
      'Höja anaerob kapacitet',
    ],
    strengthFocus: {
      volumeMultiplier: 0.9,
      intensityLevel: 'high',
      sessionsPerWeek: 3,
      focusAreas: ['Power', 'Explosivitet', 'Sport-specifik styrka'],
    },
    conditioningFocus: {
      volumeMultiplier: 1.3,
      type: ['Bytessimulering (30-60 sek)', 'Sprint-intervaller', 'On-ice kondition'],
      sessionsPerWeek: 4,
    },
    recoveryPriority: 'moderate',
    recommendedActivities: [
      'Is-träning (ökar gradvis)',
      'Intervallträning på cykel/löpning',
      'Plyometrics',
      'Agility och snabbhetsdrills',
      'Styrketräning med power-fokus',
    ],
    avoidActivities: [
      'Långdistans steady-state',
      'Hög volym styrketräning',
    ],
  },

  in_season: {
    phase: 'in_season',
    duration: 'September-mars/april',
    primaryGoals: [
      'Underhålla styrka och power',
      'Optimal återhämtning',
      'Matchförberedelse',
      'Skadeförebyggande',
    ],
    strengthFocus: {
      volumeMultiplier: 0.6,
      intensityLevel: 'moderate',
      sessionsPerWeek: 2,
      focusAreas: ['Underhåll', 'Explosivitet', 'Skadeförebyggande'],
    },
    conditioningFocus: {
      volumeMultiplier: 0.5,
      type: ['Underhåll via matcher och träning', 'Lätt cardio för återhämtning'],
      sessionsPerWeek: 1,
    },
    recoveryPriority: 'high',
    recommendedActivities: [
      'Korta styrkepass (30-40 min)',
      'Aktiv återhämtning (pool, cykel)',
      'Mobilitet och stretching',
      'Matchförberedelse',
      'Mental träning',
    ],
    avoidActivities: [
      'Hög volym off-ice träning',
      'Nya/okända övningar',
      'Långdistans kondition',
    ],
  },

  playoffs: {
    phase: 'playoffs',
    duration: '2-8 veckor (mars-maj)',
    primaryGoals: [
      'Maximal återhämtning',
      'Mental förberedelse',
      'Underhålla topp-form',
      'Minimera skaderisk',
    ],
    strengthFocus: {
      volumeMultiplier: 0.3,
      intensityLevel: 'low',
      sessionsPerWeek: 1,
      focusAreas: ['Aktivering', 'Mobilitet'],
    },
    conditioningFocus: {
      volumeMultiplier: 0.2,
      type: ['Aktivering endast', 'Lätt cykel/promenad'],
      sessionsPerWeek: 0,
    },
    recoveryPriority: 'critical',
    recommendedActivities: [
      'Aktivering före matcher',
      'Pool-återhämtning',
      'Massage och behandling',
      'Mental förberedelse',
      'Sömnoptimering',
    ],
    avoidActivities: [
      'Styrketräning (mer än lätt aktivering)',
      'Off-ice kondition',
      'Nya aktiviteter',
      'Allt som kan orsaka trötthet eller skada',
    ],
  },
};

// ==================== TRAINING RECOMMENDATIONS ====================

export interface WeeklyTrainingTemplate {
  position: HockeyPosition;
  phase: SeasonPhase;
  weekStructure: DayPlan[];
}

export interface DayPlan {
  day: string;
  sessions: SessionPlan[];
}

export interface SessionPlan {
  type: 'strength' | 'conditioning' | 'ice' | 'recovery' | 'off';
  focus: string;
  duration: number; // minutes
  intensity: 'low' | 'moderate' | 'high' | 'max';
  notes?: string;
}

/**
 * Get position-specific training recommendations
 */
export function getPositionRecommendations(position: HockeyPosition): PositionProfile {
  return HOCKEY_POSITION_PROFILES[position];
}

/**
 * Get season phase training guidelines
 */
export function getSeasonPhaseTraining(phase: SeasonPhase): SeasonPhaseTraining {
  return HOCKEY_SEASON_PHASES[phase];
}

/**
 * Calculate recommended training load based on position and season phase
 */
export function calculateTrainingLoad(
  position: HockeyPosition,
  phase: SeasonPhase,
  matchesThisWeek: number
): {
  strengthSessions: number;
  conditioningSessions: number;
  recoveryPriority: string;
  notes: string[];
} {
  const phaseConfig = HOCKEY_SEASON_PHASES[phase];
  const positionProfile = HOCKEY_POSITION_PROFILES[position];

  let strengthSessions = phaseConfig.strengthFocus.sessionsPerWeek;
  let conditioningSessions = phaseConfig.conditioningFocus.sessionsPerWeek;
  const notes: string[] = [];

  // Adjust for match load
  if (matchesThisWeek >= 3) {
    strengthSessions = Math.max(0, strengthSessions - 2);
    conditioningSessions = 0;
    notes.push('Hög matchbelastning - minimera off-ice träning');
  } else if (matchesThisWeek === 2) {
    strengthSessions = Math.max(1, strengthSessions - 1);
    conditioningSessions = Math.max(0, conditioningSessions - 1);
    notes.push('Normal matchbelastning - fokus på återhämtning');
  }

  // Goalie-specific adjustments
  if (position === 'goalie') {
    notes.push('Prioritera höftrörlighet och reaktionsträning');
    notes.push('Undvik hög volym styrketräning som kan påverka rörlighet');
  }

  // Defense-specific for longer ice time
  if (position === 'defense') {
    notes.push('Längre istid kräver god aerob kapacitet');
    notes.push('Fokusera på höft- och ljumskförebyggande');
  }

  return {
    strengthSessions,
    conditioningSessions,
    recoveryPriority: phaseConfig.recoveryPriority,
    notes,
  };
}

/**
 * Generate injury prevention exercises for position
 */
export function getInjuryPreventionExercises(position: HockeyPosition): ExerciseRecommendation[] {
  const commonExercises: ExerciseRecommendation[] = [
    { name: 'Copenhagen Plank', category: 'strength', description: 'Adduktorstyrka - ljumskförebyggande', sets: '3', reps: '15-20 sek/sida' },
    { name: 'Nordic Hamstring Curl', category: 'strength', description: 'Hamstring excentriskt - skadeförebyggande', sets: '3', reps: '5-8' },
    { name: 'Hip 90/90 Mobility', category: 'mobility', description: 'Höftrörlighet', frequency: 'Dagligen', reps: '10/sida' },
    { name: 'Band Pull-Aparts', category: 'strength', description: 'Axelstabilitet', sets: '3', reps: '15-20' },
  ];

  const positionSpecific: Record<HockeyPosition, ExerciseRecommendation[]> = {
    center: [
      { name: 'Rotational Core Work', category: 'strength', description: 'Core för tekningar', sets: '3', reps: '10-12/sida' },
    ],
    wing: [
      { name: 'Wrist Strengthening', category: 'strength', description: 'Handledsstyrka för skott', sets: '3', reps: '15-20' },
    ],
    defense: [
      { name: 'Lateral Mini-Band Walks', category: 'strength', description: 'Höftstabilitet', sets: '3', reps: '15/sida' },
    ],
    goalie: [
      { name: 'Frog Stretch', category: 'mobility', description: 'Adduktor-rörlighet', frequency: 'Dagligen', reps: '60-90 sek' },
      { name: 'Butterfly Mobility Drills', category: 'mobility', description: 'Specifik rörlighet för butterfly', frequency: 'Dagligen' },
    ],
  };

  return [...commonExercises, ...(positionSpecific[position] || [])];
}

export default {
  HOCKEY_POSITION_PROFILES,
  HOCKEY_SEASON_PHASES,
  getPositionRecommendations,
  getSeasonPhaseTraining,
  calculateTrainingLoad,
  getInjuryPreventionExercises,
};
