/**
 * Football Position-Specific Training Definitions
 *
 * Provides position-specific training guidelines, exercise recommendations,
 * and periodization strategies for football (soccer) players.
 * Includes GPS-based load monitoring integration.
 */

export type FootballPosition = 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
export type SeasonPhase = 'off_season' | 'pre_season' | 'in_season' | 'playoffs';

export interface PositionProfile {
  position: FootballPosition;
  description: string;
  physicalDemands: string[];
  avgMatchDistanceKm: { min: number; max: number };
  avgSprintDistanceM: { min: number; max: number };
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
    volumeMultiplier: number;
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
  matchdayProtocol: MatchdayProtocol;
}

export interface MatchdayProtocol {
  mdMinus4: string; // 4 days before match
  mdMinus3: string;
  mdMinus2: string;
  mdMinus1: string;
  matchday: string;
  mdPlus1: string; // Day after match
  mdPlus2: string;
}

// ==================== POSITION PROFILES ====================

export const FOOTBALL_POSITION_PROFILES: Record<FootballPosition, PositionProfile> = {
  goalkeeper: {
    position: 'goalkeeper',
    description: 'Specialist med fokus på reflexer, positionering och bollhantering. Kräver explosivitet och mental styrka.',
    physicalDemands: [
      'Explosiv lateral rörelse',
      'Vertikal hoppkraft',
      'Reaktionsförmåga',
      'Mental fokus och koncentration',
      'Flexibilitet och rörlighet',
    ],
    avgMatchDistanceKm: { min: 5, max: 6 },
    avgSprintDistanceM: { min: 50, max: 150 },
    primaryStrengthFocus: [
      'Explosiv benkraft',
      'Core-stabilitet',
      'Axel- och armstyrka',
      'Handstyrka och grepp',
    ],
    primaryConditioningFocus: [
      'Korta explosiva intervaller',
      'Reaktionsträning',
      'Uthållighet för hela matcher',
    ],
    commonInjuryRisks: [
      'Axelskador',
      'Handledsskador',
      'Knäskador (ACL/menisk)',
      'Höftflexor',
      'Ryggproblem',
    ],
    keyExercises: [
      { name: 'Box Jumps', category: 'power', description: 'Explosiv vertikal kraft', sets: '4', reps: '5' },
      { name: 'Lateral Bounds', category: 'power', description: 'Lateral explosivitet', sets: '3', reps: '6/sida' },
      { name: 'Medicine Ball Throws', category: 'power', description: 'Utkastsstyrka', sets: '3', reps: '8' },
      { name: 'Single-Leg RDL', category: 'strength', description: 'Balans och hamstrings', sets: '3', reps: '8/ben' },
      { name: 'Plank Variations', category: 'strength', description: 'Core-stabilitet', sets: '3', reps: '30-45 sek' },
      { name: 'Reaction Ball Drills', category: 'skill', description: 'Reaktionsträning', frequency: '2-3x/vecka' },
    ],
    recommendedTestProtocols: [
      'Vertikalt hopp',
      'T-test agility',
      'Reaktionstidstest',
      'Yo-Yo IR1',
    ],
  },

  defender: {
    position: 'defender',
    description: 'Defensiv spelare med fokus på positionering, duellstyrka och speluppbyggnad. Kräver uthållighet och fysisk styrka.',
    physicalDemands: [
      'Hög aerob kapacitet',
      'Duellstyrka i luften och på marken',
      'Acceleration och dekceleration',
      'Positioneringsförmåga',
      'Bollspel och speluppbyggnad',
    ],
    avgMatchDistanceKm: { min: 9, max: 11 },
    avgSprintDistanceM: { min: 200, max: 400 },
    primaryStrengthFocus: [
      'Överkroppsstyrka för dueller',
      'Benstyrka för hopp',
      'Core för stabilitet',
      'Nackstyrka för nickdueller',
    ],
    primaryConditioningFocus: [
      'Aerob uthållighet',
      'Repeated sprint ability',
      'Acceleration/dekceleration',
    ],
    commonInjuryRisks: [
      'Hamstringsskador',
      'Ljumskskador',
      'Fotledsskador',
      'Knäskador',
      'Huvudskador (nickar)',
    ],
    keyExercises: [
      { name: 'Trap Bar Deadlift', category: 'strength', description: 'Helkroppsstyrka', sets: '4', reps: '5-6' },
      { name: 'Single-Leg Squat', category: 'strength', description: 'Unilateral benstyrka', sets: '3', reps: '8/ben' },
      { name: 'Nordic Hamstring Curl', category: 'strength', description: 'Hamstring excentriskt', sets: '3', reps: '5-8' },
      { name: 'Bench Press', category: 'strength', description: 'Överkroppsstyrka', sets: '4', reps: '6-8' },
      { name: 'Countermovement Jump', category: 'power', description: 'Vertikal hoppkraft', sets: '4', reps: '5' },
      { name: 'Copenhagen Plank', category: 'strength', description: 'Adduktorstyrka', sets: '3', reps: '20 sek/sida' },
    ],
    recommendedTestProtocols: [
      'Yo-Yo IR2',
      '30-15 IFT',
      'Vertikalt hopp (CMJ)',
      '10m/30m sprint',
    ],
  },

  midfielder: {
    position: 'midfielder',
    description: 'Box-to-box spelare med högst fysiska krav. Ansvarar för både defensivt och offensivt spel med mycket löpning.',
    physicalDemands: [
      'Högsta aeroba kapaciteten',
      'Mest löpdistans per match',
      'Repeated high-intensity efforts',
      'Snabba riktningsförändringar',
      'Uthållighet för 90+ minuter',
    ],
    avgMatchDistanceKm: { min: 10, max: 13 },
    avgSprintDistanceM: { min: 300, max: 600 },
    primaryStrengthFocus: [
      'Uthållighetsstyrka',
      'Core-stabilitet för dueller',
      'Benstyrka för löpning',
      'Skottsstyrka',
    ],
    primaryConditioningFocus: [
      'Maximal aerob kapacitet',
      'Repeated sprint ability',
      'Hög-intensiva intervaller',
      'Snabb återhämtning',
    ],
    commonInjuryRisks: [
      'Hamstringsskador (vanligast)',
      'Ljumskskador',
      'Överbelastningsskador',
      'Fotledsskador',
      'Knäskador',
    ],
    keyExercises: [
      { name: 'Bulgarian Split Squat', category: 'strength', description: 'Unilateral benstyrka', sets: '3', reps: '8-10/ben' },
      { name: 'Romanian Deadlift', category: 'strength', description: 'Posterior chain', sets: '3', reps: '8-10' },
      { name: 'Hip Thrust', category: 'strength', description: 'Gluteal styrka för sprint', sets: '3', reps: '10-12' },
      { name: 'Sled Push/Pull', category: 'conditioning', description: 'Kondition + styrka', sets: '6-8', reps: '20-30m' },
      { name: 'Rotational Med Ball', category: 'power', description: 'Core-rotation för skott', sets: '3', reps: '8/sida' },
      { name: '4x4 Intervals', category: 'conditioning', description: 'Aerob kapacitet', sets: '4', reps: '4 min @ 90-95% HRmax' },
    ],
    recommendedTestProtocols: [
      'Yo-Yo IR2',
      '30-15 IFT',
      'Repeated Sprint Ability',
      'VO2max test',
    ],
  },

  forward: {
    position: 'forward',
    description: 'Offensiv spelare med fokus på målskytte och assistspel. Kräver maximal sprintförmåga och explosivitet.',
    physicalDemands: [
      'Maximal sprintförmåga',
      'Explosiv acceleration',
      'Skottstyrka',
      'Hoppkraft för nickdueller',
      'Duellstyrka med försvarare',
    ],
    avgMatchDistanceKm: { min: 9, max: 11 },
    avgSprintDistanceM: { min: 400, max: 700 },
    primaryStrengthFocus: [
      'Explosiv benkraft',
      'Sprintaccelerration',
      'Skottstyrka (rotation)',
      'Överkroppsstyrka för dueller',
    ],
    primaryConditioningFocus: [
      'Sprint-uthållighet',
      'Acceleration/top speed',
      'Repeated sprint ability',
      'Anaerob kapacitet',
    ],
    commonInjuryRisks: [
      'Hamstringsskador (hög risk vid sprint)',
      'Ljumskskador',
      'Quadriceps-skador',
      'Fotledsskador',
      'Muskelfiber-skador',
    ],
    keyExercises: [
      { name: 'Hang Power Clean', category: 'power', description: 'Explosiv kraft', sets: '4', reps: '4-5' },
      { name: 'Back Squat', category: 'strength', description: 'Maxstyrka ben', sets: '4', reps: '5-6' },
      { name: 'Sprint Intervals', category: 'conditioning', description: '10-40m max sprint', sets: '8-12', reps: 'sprints' },
      { name: 'Box Jump', category: 'power', description: 'Vertikal explosivitet', sets: '4', reps: '5' },
      { name: 'Cable Woodchop', category: 'strength', description: 'Rotationsstyrka för skott', sets: '3', reps: '10/sida' },
      { name: 'Hip Flexor Stretch', category: 'mobility', description: 'Sprint-rörlighet', frequency: 'Dagligen' },
    ],
    recommendedTestProtocols: [
      '10m/20m/30m sprint',
      'Flying 20m sprint',
      'Repeated Sprint Ability',
      'Vertikalt hopp',
    ],
  },
};

// ==================== SEASON PHASE TRAINING ====================

export const FOOTBALL_SEASON_PHASES: Record<SeasonPhase, SeasonPhaseTraining> = {
  off_season: {
    phase: 'off_season',
    duration: '4-6 veckor (juni-juli)',
    primaryGoals: [
      'Bygga aerob baskapacitet',
      'Maxstyrka och hypertrofi',
      'Åtgärda skador och obalanser',
      'Mental vila',
    ],
    strengthFocus: {
      volumeMultiplier: 1.2,
      intensityLevel: 'high',
      sessionsPerWeek: 4,
      focusAreas: ['Maxstyrka', 'Hypertrofi', 'Obalanser', 'Rörlighet'],
    },
    conditioningFocus: {
      volumeMultiplier: 0.8,
      type: ['Aerob bas (löpning)', 'Cross-training', 'Låg-intensiv intervall'],
      sessionsPerWeek: 3,
    },
    recoveryPriority: 'moderate',
    matchdayProtocol: {
      mdMinus4: 'Styrkepass (hög volym)',
      mdMinus3: 'Konditionspass',
      mdMinus2: 'Teknisk träning',
      mdMinus1: 'Vila eller lätt aktivitet',
      matchday: 'Ingen match',
      mdPlus1: 'Aktiv återhämtning',
      mdPlus2: 'Styrkepass',
    },
  },

  pre_season: {
    phase: 'pre_season',
    duration: '4-6 veckor (juli-augusti)',
    primaryGoals: [
      'Fotbollsspecifik kondition',
      'Explosivitet och power',
      'Taktisk inlärning',
      'Höja anaerob kapacitet',
    ],
    strengthFocus: {
      volumeMultiplier: 0.9,
      intensityLevel: 'high',
      sessionsPerWeek: 3,
      focusAreas: ['Power', 'Explosivitet', 'Skadeförebyggande'],
    },
    conditioningFocus: {
      volumeMultiplier: 1.3,
      type: ['Hög-intensiva intervaller', 'Small-sided games', 'Sprint-träning'],
      sessionsPerWeek: 4,
    },
    recoveryPriority: 'moderate',
    matchdayProtocol: {
      mdMinus4: 'Hög-intensiv träning',
      mdMinus3: 'Taktik + kondition',
      mdMinus2: 'Medel intensitet',
      mdMinus1: 'Aktivering',
      matchday: 'Träningsmatch',
      mdPlus1: 'Aktiv återhämtning',
      mdPlus2: 'Analys + styrka',
    },
  },

  in_season: {
    phase: 'in_season',
    duration: 'Augusti-maj (10 månader)',
    primaryGoals: [
      'Underhålla fysisk kapacitet',
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
      type: ['Underhåll via matcher', 'Kompletterande intervaller', 'Aktiv återhämtning'],
      sessionsPerWeek: 1,
    },
    recoveryPriority: 'high',
    matchdayProtocol: {
      mdMinus4: 'Hög intensitet, lägre volym',
      mdMinus3: 'Taktik + set pieces',
      mdMinus2: 'Reducerad volym',
      mdMinus1: 'Aktivering + taktik',
      matchday: 'MATCH',
      mdPlus1: 'Aktiv återhämtning (de som spelade)',
      mdPlus2: 'Styrka (de som inte spelade) + lätt för startande',
    },
  },

  playoffs: {
    phase: 'playoffs',
    duration: 'Slutspel/avgörande matcher',
    primaryGoals: [
      'Maximal återhämtning',
      'Mental förberedelse',
      'Underhålla toppform',
      'Minimera skaderisk',
    ],
    strengthFocus: {
      volumeMultiplier: 0.4,
      intensityLevel: 'low',
      sessionsPerWeek: 1,
      focusAreas: ['Aktivering', 'Mobilitet'],
    },
    conditioningFocus: {
      volumeMultiplier: 0.3,
      type: ['Aktivering', 'Taktik'],
      sessionsPerWeek: 0,
    },
    recoveryPriority: 'critical',
    matchdayProtocol: {
      mdMinus4: 'Medel intensitet',
      mdMinus3: 'Taktik + set pieces',
      mdMinus2: 'Lätt träning',
      mdMinus1: 'Aktivering endast',
      matchday: 'MATCH',
      mdPlus1: 'Återhämtning prioritet',
      mdPlus2: 'Lätt aktivering',
    },
  },
};

// ==================== GPS LOAD MONITORING ====================

export interface GPSLoadThresholds {
  totalDistance: { low: number; moderate: number; high: number };
  highSpeedRunning: { low: number; moderate: number; high: number }; // >19.8 km/h
  sprintDistance: { low: number; moderate: number; high: number }; // >25.2 km/h
  accelerations: { low: number; moderate: number; high: number }; // >3 m/s²
  decelerations: { low: number; moderate: number; high: number }; // <-3 m/s²
}

export const GPS_LOAD_THRESHOLDS: Record<FootballPosition, GPSLoadThresholds> = {
  goalkeeper: {
    totalDistance: { low: 4000, moderate: 5000, high: 6000 },
    highSpeedRunning: { low: 50, moderate: 100, high: 200 },
    sprintDistance: { low: 20, moderate: 50, high: 100 },
    accelerations: { low: 10, moderate: 20, high: 30 },
    decelerations: { low: 10, moderate: 20, high: 30 },
  },
  defender: {
    totalDistance: { low: 8000, moderate: 10000, high: 12000 },
    highSpeedRunning: { low: 300, moderate: 500, high: 700 },
    sprintDistance: { low: 100, moderate: 200, high: 350 },
    accelerations: { low: 30, moderate: 50, high: 70 },
    decelerations: { low: 30, moderate: 50, high: 70 },
  },
  midfielder: {
    totalDistance: { low: 10000, moderate: 11500, high: 13000 },
    highSpeedRunning: { low: 500, moderate: 700, high: 900 },
    sprintDistance: { low: 150, moderate: 300, high: 500 },
    accelerations: { low: 40, moderate: 60, high: 80 },
    decelerations: { low: 40, moderate: 60, high: 80 },
  },
  forward: {
    totalDistance: { low: 8500, moderate: 10000, high: 11500 },
    highSpeedRunning: { low: 500, moderate: 700, high: 900 },
    sprintDistance: { low: 200, moderate: 400, high: 600 },
    accelerations: { low: 35, moderate: 55, high: 75 },
    decelerations: { low: 35, moderate: 55, high: 75 },
  },
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Get position-specific training recommendations
 */
export function getPositionRecommendations(position: FootballPosition): PositionProfile {
  return FOOTBALL_POSITION_PROFILES[position];
}

/**
 * Get season phase training guidelines
 */
export function getSeasonPhaseTraining(phase: SeasonPhase): SeasonPhaseTraining {
  return FOOTBALL_SEASON_PHASES[phase];
}

/**
 * Calculate training load based on position and GPS data
 */
export function calculateGPSLoadStatus(
  position: FootballPosition,
  gpsData: {
    totalDistanceM: number;
    highSpeedRunningM: number;
    sprintDistanceM: number;
    accelerations: number;
    decelerations: number;
  }
): {
  overall: 'low' | 'moderate' | 'high' | 'very_high';
  metrics: Record<string, { value: number; status: string }>;
  recommendations: string[];
} {
  const thresholds = GPS_LOAD_THRESHOLDS[position];
  const metrics: Record<string, { value: number; status: string }> = {};
  let highCount = 0;
  let moderateCount = 0;

  // Check total distance
  if (gpsData.totalDistanceM >= thresholds.totalDistance.high) {
    metrics.totalDistance = { value: gpsData.totalDistanceM, status: 'high' };
    highCount++;
  } else if (gpsData.totalDistanceM >= thresholds.totalDistance.moderate) {
    metrics.totalDistance = { value: gpsData.totalDistanceM, status: 'moderate' };
    moderateCount++;
  } else {
    metrics.totalDistance = { value: gpsData.totalDistanceM, status: 'low' };
  }

  // Check high-speed running
  if (gpsData.highSpeedRunningM >= thresholds.highSpeedRunning.high) {
    metrics.highSpeedRunning = { value: gpsData.highSpeedRunningM, status: 'high' };
    highCount++;
  } else if (gpsData.highSpeedRunningM >= thresholds.highSpeedRunning.moderate) {
    metrics.highSpeedRunning = { value: gpsData.highSpeedRunningM, status: 'moderate' };
    moderateCount++;
  } else {
    metrics.highSpeedRunning = { value: gpsData.highSpeedRunningM, status: 'low' };
  }

  // Check sprint distance
  if (gpsData.sprintDistanceM >= thresholds.sprintDistance.high) {
    metrics.sprintDistance = { value: gpsData.sprintDistanceM, status: 'high' };
    highCount++;
  } else if (gpsData.sprintDistanceM >= thresholds.sprintDistance.moderate) {
    metrics.sprintDistance = { value: gpsData.sprintDistanceM, status: 'moderate' };
    moderateCount++;
  } else {
    metrics.sprintDistance = { value: gpsData.sprintDistanceM, status: 'low' };
  }

  // Determine overall status
  let overall: 'low' | 'moderate' | 'high' | 'very_high';
  if (highCount >= 3) {
    overall = 'very_high';
  } else if (highCount >= 1) {
    overall = 'high';
  } else if (moderateCount >= 2) {
    overall = 'moderate';
  } else {
    overall = 'low';
  }

  // Generate recommendations
  const recommendations: string[] = [];
  if (overall === 'very_high') {
    recommendations.push('Hög belastning - prioritera återhämtning');
    recommendations.push('Reducera träningsvolym nästa dag');
    recommendations.push('Överväg extra vila eller lätt pass');
  } else if (overall === 'high') {
    recommendations.push('Måttlig belastning - normal återhämtning');
    recommendations.push('Undvik högintensiv träning dagen efter');
  } else if (overall === 'moderate') {
    recommendations.push('Normal belastning');
    recommendations.push('Kan genomföra planerad träning');
  } else {
    recommendations.push('Låg belastning - kan öka intensiteten');
    recommendations.push('Överväg kompletterande konditionsträning');
  }

  return { overall, metrics, recommendations };
}

/**
 * Calculate ACWR (Acute:Chronic Workload Ratio) from GPS data
 */
export function calculateACWR(
  weeklyLoads: number[], // Last 4 weeks, newest first
): {
  ratio: number;
  zone: 'undertraining' | 'optimal' | 'caution' | 'danger';
  recommendation: string;
} {
  if (weeklyLoads.length < 4) {
    return {
      ratio: 1.0,
      zone: 'optimal',
      recommendation: 'Otillräcklig data för ACWR-beräkning',
    };
  }

  const acuteLoad = weeklyLoads[0]; // Current week
  const chronicLoad = (weeklyLoads[0] + weeklyLoads[1] + weeklyLoads[2] + weeklyLoads[3]) / 4;
  const ratio = chronicLoad > 0 ? acuteLoad / chronicLoad : 1.0;

  let zone: 'undertraining' | 'optimal' | 'caution' | 'danger';
  let recommendation: string;

  if (ratio < 0.8) {
    zone = 'undertraining';
    recommendation = 'Belastningen är för låg - öka träningsvolymen gradvis';
  } else if (ratio <= 1.3) {
    zone = 'optimal';
    recommendation = 'Optimal belastningsbalans - fortsätt nuvarande plan';
  } else if (ratio <= 1.5) {
    zone = 'caution';
    recommendation = 'Varning: Hög akut belastning - var uppmärksam på skaderisk';
  } else {
    zone = 'danger';
    recommendation = 'Fara: Mycket hög skaderisk - reducera belastningen omedelbart';
  }

  return { ratio: Math.round(ratio * 100) / 100, zone, recommendation };
}

/**
 * Generate injury prevention exercises for position
 */
export function getInjuryPreventionExercises(position: FootballPosition): ExerciseRecommendation[] {
  const commonExercises: ExerciseRecommendation[] = [
    { name: 'Nordic Hamstring Curl', category: 'strength', description: 'Hamstring excentriskt - #1 skadeförebyggande', sets: '3', reps: '5-8' },
    { name: 'Copenhagen Plank', category: 'strength', description: 'Adduktorstyrka - ljumskförebyggande', sets: '3', reps: '15-20 sek/sida' },
    { name: 'Single-Leg Glute Bridge', category: 'strength', description: 'Gluteal aktivering', sets: '3', reps: '12/sida' },
    { name: 'FIFA 11+ Warmup', category: 'mobility', description: 'Komplett uppvärmningsprogram', frequency: 'Före varje träning' },
  ];

  const positionSpecific: Record<FootballPosition, ExerciseRecommendation[]> = {
    goalkeeper: [
      { name: 'Shoulder Stability', category: 'strength', description: 'Rotatorkuff-styrka', sets: '3', reps: '12-15' },
      { name: 'Hip Mobility Drills', category: 'mobility', description: 'Höftrörlighet för kast', frequency: 'Dagligen' },
    ],
    defender: [
      { name: 'Neck Strengthening', category: 'strength', description: 'Nackstyrka för nickdueller', sets: '2', reps: '15' },
      { name: 'Landing Mechanics', category: 'skill', description: 'Landningsteknik', frequency: '2x/vecka' },
    ],
    midfielder: [
      { name: 'Hip Flexor Stretch', category: 'mobility', description: 'Mot överbelastning', frequency: 'Dagligen' },
      { name: 'Calf Raises', category: 'strength', description: 'Achilles-förebyggande', sets: '3', reps: '15' },
    ],
    forward: [
      { name: 'Sprint Preparation', category: 'mobility', description: 'Dynamisk uppvärmning', frequency: 'Före sprint-träning' },
      { name: 'Eccentric Hamstring', category: 'strength', description: 'Extra hamstring-fokus', sets: '4', reps: '6' },
    ],
  };

  return [...commonExercises, ...(positionSpecific[position] || [])];
}

const footballTrainingModule = {
  FOOTBALL_POSITION_PROFILES,
  FOOTBALL_SEASON_PHASES,
  GPS_LOAD_THRESHOLDS,
  getPositionRecommendations,
  getSeasonPhaseTraining,
  calculateGPSLoadStatus,
  calculateACWR,
  getInjuryPreventionExercises,
};

export default footballTrainingModule;
