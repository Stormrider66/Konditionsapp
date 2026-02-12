/**
 * Sport Report Templates
 *
 * Configuration for 17 sports + default fallback.
 * Each sport has metrics, color scheme, units, and AI prompt instructions.
 */

export interface SportReportConfig {
  displayName: string
  primaryMetrics: string[]
  secondaryMetrics: string[]
  colorScheme: string
  intensityUnit: string
  specialInstructions: string
}

export const SPORT_REPORT_CONFIGS: Record<string, SportReportConfig> = {
  RUNNING: {
    displayName: 'Running',
    primaryMetrics: ['VO2max', 'LT2 Pace', 'Running Economy'],
    secondaryMetrics: ['LT1 Pace', 'Max HR', 'VDOT'],
    colorScheme: 'warm gradient from orange to deep red, with subtle gold accents',
    intensityUnit: 'min/km',
    specialInstructions: 'Show pace values in min/km format. Highlight threshold pace prominently. Include running silhouette or track motif.',
  },
  CYCLING: {
    displayName: 'Cycling',
    primaryMetrics: ['FTP', 'W/kg', 'VO2max'],
    secondaryMetrics: ['LT2 Power', 'Max HR', 'Efficiency Factor'],
    colorScheme: 'cool gradient from blue to teal, with electric cyan accents',
    intensityUnit: 'W',
    specialInstructions: 'Show power values in watts and W/kg. Highlight FTP prominently. Include cycling/road motif.',
  },
  SKIING: {
    displayName: 'Cross-Country Skiing',
    primaryMetrics: ['VO2max', 'LT2 Pace', 'Skiing Economy'],
    secondaryMetrics: ['LT1 Pace', 'Max HR', 'Double-Pole Power'],
    colorScheme: 'frost gradient from white to ice blue, with silver accents',
    intensityUnit: 'min/km',
    specialInstructions: 'Show pace values in min/km. Include snow/mountain landscape motif. Winter aesthetic with crisp typography.',
  },
  SWIMMING: {
    displayName: 'Swimming',
    primaryMetrics: ['CSS', 'VO2max', 'Stroke Rate'],
    secondaryMetrics: ['SWOLF', 'Stroke Count', 'Threshold Pace'],
    colorScheme: 'ocean gradient from deep blue to aqua, with wave-like patterns',
    intensityUnit: 'min/100m',
    specialInstructions: 'Show pace values in min/100m format. Include pool lane or open water motif.',
  },
  TRIATHLON: {
    displayName: 'Triathlon',
    primaryMetrics: ['CSS', 'FTP', 'VDOT'],
    secondaryMetrics: ['T2 Pace', 'W/kg', 'Swim CSS'],
    colorScheme: 'multi-section gradient: blue (swim) → green (bike) → orange (run)',
    intensityUnit: 'mixed',
    specialInstructions: 'Show all three disciplines. Use swim/bike/run sections. Mixed units: min/100m, W, min/km.',
  },
  HYROX: {
    displayName: 'HYROX',
    primaryMetrics: ['Total Time', 'Station Avg', '5K Running Pace'],
    secondaryMetrics: ['Sled Push', 'SkiErg', 'Farmers Carry'],
    colorScheme: 'neon green to dark charcoal, with industrial/urban accents',
    intensityUnit: 'sec',
    specialInstructions: 'Show station times and running splits. HYROX competition aesthetic. Industrial/race feel.',
  },
  TEAM_ICE_HOCKEY: {
    displayName: 'Ice Hockey',
    primaryMetrics: ['VO2max', 'Sprint Speed', 'Peak Power'],
    secondaryMetrics: ['Agility', 'Recovery Rate', 'Anaerobic Capacity'],
    colorScheme: 'white to deep navy blue, with ice crystal accents',
    intensityUnit: 'km/h',
    specialInstructions: 'Show sprint metrics and power. Ice rink/hockey motif. Emphasize explosive performance.',
  },
  TEAM_FOOTBALL: {
    displayName: 'Football',
    primaryMetrics: ['Sprint Speed', 'Agility', 'VO2max'],
    secondaryMetrics: ['Repeated Sprint', 'Change of Direction', 'Yo-Yo IR1'],
    colorScheme: 'green pitch to dark forest, with white line markings accent',
    intensityUnit: 'km/h',
    specialInstructions: 'Show sprint and agility metrics. Football pitch aesthetic. Emphasize repeated high-intensity efforts.',
  },
  TEAM_HANDBALL: {
    displayName: 'Handball',
    primaryMetrics: ['Throw Speed', 'Sprint Speed', 'Agility'],
    secondaryMetrics: ['Jump Height', 'VO2max', 'Reaction Time'],
    colorScheme: 'warm gradient from golden yellow to deep red',
    intensityUnit: 'km/h',
    specialInstructions: 'Show throwing power and speed metrics. Court sports aesthetic. Emphasize explosive upper and lower body.',
  },
  TEAM_FLOORBALL: {
    displayName: 'Floorball',
    primaryMetrics: ['Sprint Speed', 'Agility', 'Endurance'],
    secondaryMetrics: ['Shot Speed', 'Recovery', 'Change of Direction'],
    colorScheme: 'orange to charcoal dark, with high-contrast accents',
    intensityUnit: 'km/h',
    specialInstructions: 'Show sprint and agility metrics. Indoor court aesthetic. Emphasize speed and endurance balance.',
  },
  TEAM_BASKETBALL: {
    displayName: 'Basketball',
    primaryMetrics: ['Vertical Jump', 'Sprint Speed', 'Agility'],
    secondaryMetrics: ['Lane Agility', 'Repeated Sprint', 'VO2max'],
    colorScheme: 'red to black gradient, with orange basketball accent',
    intensityUnit: 'cm/s',
    specialInstructions: 'Show vertical jump and agility prominently. Court/hoop motif. Emphasize explosiveness.',
  },
  TEAM_VOLLEYBALL: {
    displayName: 'Volleyball',
    primaryMetrics: ['Spike Jump', 'Block Jump', 'Agility'],
    secondaryMetrics: ['Approach Jump', 'Lateral Speed', 'Reaction'],
    colorScheme: 'blue to gold gradient, with net pattern accent',
    intensityUnit: 'cm',
    specialInstructions: 'Show jump heights prominently. Volleyball court/net motif. Emphasize vertical performance.',
  },
  TENNIS: {
    displayName: 'Tennis',
    primaryMetrics: ['Serve Speed', 'Agility', 'VO2max'],
    secondaryMetrics: ['Lateral Quickness', 'Recovery', 'Sprint'],
    colorScheme: 'grass green to white, with clean court line accents',
    intensityUnit: 'km/h',
    specialInstructions: 'Show serve speed and agility metrics. Tennis court aesthetic. Emphasize lateral movement.',
  },
  PADEL: {
    displayName: 'Padel',
    primaryMetrics: ['Smash Speed', 'Agility', 'Lateral Speed'],
    secondaryMetrics: ['Recovery', 'Sprint', 'Endurance'],
    colorScheme: 'teal to deep blue, with glass court accent',
    intensityUnit: 'km/h',
    specialInstructions: 'Show smash power and agility metrics. Padel court/glass wall motif. Emphasize lateral and reactive performance.',
  },
  FUNCTIONAL_FITNESS: {
    displayName: 'Functional Fitness',
    primaryMetrics: ['Benchmark WODs', '1RMs', 'Gymnastics Skills'],
    secondaryMetrics: ['VO2max', 'Aerobic Base', 'Work Capacity'],
    colorScheme: 'red to dark charcoal, with chalk/barbell texture',
    intensityUnit: 'kg/time',
    specialInstructions: 'Show benchmark times and lift numbers. CrossFit/functional aesthetic. Emphasize all-round fitness.',
  },
  GENERAL_FITNESS: {
    displayName: 'General Fitness',
    primaryMetrics: ['Body Composition', 'VO2max', 'Strength'],
    secondaryMetrics: ['Flexibility', 'Balance', 'Endurance'],
    colorScheme: 'purple to blue gradient, with wellness/health tones',
    intensityUnit: 'mixed',
    specialInstructions: 'Show overall health metrics. Clean, modern health aesthetic. Balance strength and cardio metrics.',
  },
  STRENGTH: {
    displayName: 'Strength Training',
    primaryMetrics: ['1RM Squat', '1RM Bench', '1RM Deadlift'],
    secondaryMetrics: ['Total Volume', 'Wilks Score', 'Progression Rate'],
    colorScheme: 'steel gray to dark charcoal, with iron/metallic accents',
    intensityUnit: 'kg',
    specialInstructions: 'Show big 3 lifts prominently. Powerlifting/barbell aesthetic. Emphasize progressive overload.',
  },
}

export const DEFAULT_SPORT_CONFIG: SportReportConfig = {
  displayName: 'Athlete',
  primaryMetrics: ['VO2max', 'Threshold', 'Performance'],
  secondaryMetrics: ['Max HR', 'Endurance', 'Power'],
  colorScheme: 'dark gradient from slate to charcoal, with subtle blue accents',
  intensityUnit: 'mixed',
  specialInstructions: 'Show general athletic performance metrics. Clean, professional sports design.',
}

export function getSportConfig(sportType: string | null): SportReportConfig {
  if (!sportType) return DEFAULT_SPORT_CONFIG
  return SPORT_REPORT_CONFIGS[sportType] || DEFAULT_SPORT_CONFIG
}
