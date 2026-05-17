import type { HockeyProgramBlockType } from './hockey-program-blocks'

export type HockeyBuilderPresetKind = 'cardio' | 'hybrid' | 'agility'

export interface HockeyCardioPreset {
  id: string
  blockType: Extract<
    HockeyProgramBlockType,
    'AEROBIC_BASE' | 'THRESHOLD' | 'REPEATED_SPRINT_ABILITY' | 'SHIFT_REPEAT_CONDITIONING' | 'ERG_POWER'
  >
  name: string
  sport: 'TEAM_ICE_HOCKEY' | 'CYCLING' | 'GENERAL_FITNESS'
  description: string
  segments: Array<{
    type: 'WARMUP' | 'COOLDOWN' | 'INTERVAL' | 'STEADY' | 'RECOVERY' | 'DRILLS' | 'REPEAT_GROUP'
    duration?: number
    distance?: number
    zone?: number
    repeats?: number
    restDuration?: number
    restBetweenRounds?: number
    notes?: string
    steps?: Array<{
      type: 'INTERVAL' | 'STEADY' | 'RECOVERY'
      duration?: number
      distance?: number
      zone?: number
      calories?: number
      targetType?: string
      targetValue?: string
      equipment?: string
      notes?: string
    }>
  }>
  tags: string[]
}

export interface HockeyHybridPreset {
  id: string
  blockType: Extract<HockeyProgramBlockType, 'HYBRID_CONDITIONING' | 'SLED_POWER' | 'MED_BALL_POWER'>
  name: string
  format: 'AMRAP' | 'FOR_TIME' | 'EMOM' | 'TABATA' | 'CHIPPER' | 'LADDER' | 'INTERVALS' | 'HYROX_SIM' | 'CUSTOM'
  description: string
  totalMinutes?: number
  totalRounds?: number
  workTime?: number
  restTime?: number
  timeCap?: number
  repScheme?: string
  movements: Array<{
    exerciseName: string
    order: number
    reps?: number
    calories?: number
    distance?: number
    duration?: number
    weightMale?: number
    weightFemale?: number
    notes?: string
  }>
  tags: string[]
}

export interface HockeyAgilityPreset {
  id: string
  blockType: Extract<HockeyProgramBlockType, 'ACCELERATION' | 'DECELERATION_COD' | 'REACTIVE_AGILITY' | 'LATERAL_POWER'>
  name: string
  format: 'CIRCUIT' | 'STATION_ROTATION' | 'INTERVAL' | 'PROGRESSIVE' | 'REACTIVE' | 'TESTING'
  primaryFocus: 'COD' | 'REACTIVE_AGILITY' | 'SPEED_ACCELERATION' | 'PLYOMETRICS' | 'FOOTWORK' | 'BALANCE'
  description: string
  totalDuration: number
  targetSports: ['TEAM_ICE_HOCKEY']
  drillBlueprints: Array<{
    category: HockeyAgilityPreset['primaryFocus']
    name: string
    sectionType: 'WARMUP' | 'MAIN' | 'CORE' | 'COOLDOWN'
    sets?: number
    reps?: number
    duration?: number
    restSeconds?: number
    notes: string
  }>
  tags: string[]
}

export const HOCKEY_CARDIO_PRESETS: HockeyCardioPreset[] = [
  {
    id: 'hockey-7x40-rsa',
    blockType: 'REPEATED_SPRINT_ABILITY',
    name: 'Hockey 7x40 m RSA',
    sport: 'TEAM_ICE_HOCKEY',
    description: 'Repeated sprint ability session that mirrors the hockey 7x40 m test profile.',
    segments: [
      { type: 'WARMUP', duration: 600, zone: 1, notes: 'Easy pulse raise, dynamic hips, ankles, groin, and 3 progressive starts.' },
      {
        type: 'INTERVAL',
        repeats: 7,
        distance: 40,
        restDuration: 10,
        zone: 5,
        notes: 'Max-quality 40 m sprint. Track best, average, last rep, fatigue drop, and resistance.',
      },
      { type: 'COOLDOWN', duration: 420, zone: 1, notes: 'Easy flush and breathing downshift.' },
    ],
    tags: ['hockey', 'rsa', '7x40', 'repeated-sprint'],
  },
  {
    id: 'hockey-shift-repeat-12x35',
    blockType: 'SHIFT_REPEAT_CONDITIONING',
    name: 'Hockey shift repeat 12x35s',
    sport: 'TEAM_ICE_HOCKEY',
    description: 'Bench-rhythm conditioning for repeated high-power shifts.',
    segments: [
      { type: 'WARMUP', duration: 720, zone: 1, notes: 'Build from easy movement into 3 short high-cadence bursts.' },
      {
        type: 'REPEAT_GROUP',
        repeats: 12,
        restBetweenRounds: 75,
        notes: 'Each round should feel like one hard shift followed by bench recovery.',
        steps: [
          { type: 'INTERVAL', duration: 35, zone: 5, targetType: 'RPE', targetValue: '9/10', notes: 'Hard shift-quality effort.' },
          { type: 'RECOVERY', duration: 75, zone: 1, notes: 'Bench recovery. Breathe down fast.' },
        ],
      },
      { type: 'COOLDOWN', duration: 480, zone: 1, notes: 'Easy flush.' },
    ],
    tags: ['hockey', 'shift-repeat', 'conditioning'],
  },
  {
    id: 'hockey-wattbike-power-repeat',
    blockType: 'ERG_POWER',
    name: 'Hockey Wattbike power repeats',
    sport: 'CYCLING',
    description: 'Low-impact off-ice power intervals for skaters who need repeat output without extra running load.',
    segments: [
      { type: 'WARMUP', duration: 600, zone: 1, notes: 'Cadence build and 3 short spin-ups.' },
      {
        type: 'REPEAT_GROUP',
        repeats: 10,
        restBetweenRounds: 90,
        steps: [
          {
            type: 'INTERVAL',
            duration: 20,
            zone: 5,
            equipment: 'Wattbike',
            targetType: 'power',
            targetValue: 'peak repeatable watts',
            notes: 'Explosive but repeatable. Stop if output collapses.',
          },
          { type: 'RECOVERY', duration: 90, zone: 1, equipment: 'Wattbike', notes: 'Very easy spin.' },
        ],
      },
      { type: 'COOLDOWN', duration: 420, zone: 1, notes: 'Easy spin.' },
    ],
    tags: ['hockey', 'wattbike', 'erg-power'],
  },
]

export const HOCKEY_HYBRID_PRESETS: HockeyHybridPreset[] = [
  {
    id: 'hockey-sled-drive-emom',
    blockType: 'SLED_POWER',
    name: 'Hockey sled drive EMOM',
    format: 'EMOM',
    description: 'Repeat-power sled and trunk session for skating drive and contact readiness.',
    totalMinutes: 16,
    movements: [
      { exerciseName: 'Sled Push', order: 1, distance: 15, weightMale: 80, weightFemale: 55, notes: 'Odd minutes: powerful low drive.' },
      { exerciseName: 'Farmer Carry', order: 2, distance: 30, weightMale: 32, weightFemale: 24, notes: 'Even minutes: tall trunk, stable shoulders.' },
    ],
    tags: ['hockey', 'sled', 'repeat-power'],
  },
  {
    id: 'hockey-contact-prep-circuit',
    blockType: 'HYBRID_CONDITIONING',
    name: 'Hockey contact-prep circuit',
    format: 'INTERVALS',
    description: 'Station-based off-ice conditioning with rotation, carries, and trunk stiffness.',
    totalRounds: 4,
    workTime: 40,
    restTime: 20,
    movements: [
      { exerciseName: 'Medicine Ball Rotational Throw', order: 1, reps: 6, notes: 'Explosive each side.' },
      { exerciseName: 'SkiErg', order: 2, calories: 10, notes: 'Hard but technically clean.' },
      { exerciseName: 'Sandbag Bear Hug Carry', order: 3, distance: 25, weightMale: 40, weightFemale: 25, notes: 'Brace and walk fast.' },
      { exerciseName: 'Lateral Bound', order: 4, reps: 8, notes: 'Stick each landing.' },
    ],
    tags: ['hockey', 'contact-prep', 'hybrid-conditioning'],
  },
  {
    id: 'hockey-med-ball-power-ladder',
    blockType: 'MED_BALL_POWER',
    name: 'Hockey med-ball power ladder',
    format: 'LADDER',
    description: 'Rotational and overhead power with short conditioning pressure.',
    repScheme: '10-8-6-4',
    movements: [
      { exerciseName: 'Medicine Ball Slam', order: 1, reps: 10, notes: 'Reset and throw hard.' },
      { exerciseName: 'Medicine Ball Rotational Throw', order: 2, reps: 8, notes: 'Per side.' },
      { exerciseName: 'Burpee Broad Jump', order: 3, reps: 6, notes: 'Controlled landing, no sloppy reps.' },
    ],
    tags: ['hockey', 'medicine-ball', 'power'],
  },
]

export const HOCKEY_AGILITY_PRESETS: HockeyAgilityPreset[] = [
  {
    id: 'hockey-first-step-acceleration',
    blockType: 'ACCELERATION',
    name: 'Hockey first-step acceleration',
    format: 'PROGRESSIVE',
    primaryFocus: 'SPEED_ACCELERATION',
    description: 'First-step speed and short acceleration session for off-ice hockey preparation.',
    totalDuration: 30,
    targetSports: ['TEAM_ICE_HOCKEY'],
    drillBlueprints: [
      { category: 'SPEED_ACCELERATION', name: 'Falling start 5 m', sectionType: 'MAIN', sets: 3, reps: 3, restSeconds: 45, notes: 'Explode on first two steps.' },
      { category: 'SPEED_ACCELERATION', name: 'Lateral start to 10 m sprint', sectionType: 'MAIN', sets: 3, reps: 2, restSeconds: 60, notes: 'Open hips fast, no false step.' },
      { category: 'PLYOMETRICS', name: 'Low pogo to sprint', sectionType: 'MAIN', sets: 2, reps: 4, restSeconds: 45, notes: 'Stiff ankle into quick acceleration.' },
    ],
    tags: ['hockey', 'acceleration', 'first-step'],
  },
  {
    id: 'hockey-5-10-5-deceleration',
    blockType: 'DECELERATION_COD',
    name: 'Hockey 5-10-5 deceleration',
    format: 'TESTING',
    primaryFocus: 'COD',
    description: 'Change-of-direction quality for hockey 5-10-5 performance.',
    totalDuration: 35,
    targetSports: ['TEAM_ICE_HOCKEY'],
    drillBlueprints: [
      { category: 'COD', name: 'Deceleration stick 5 m', sectionType: 'MAIN', sets: 3, reps: 3, restSeconds: 45, notes: 'Brake with hip back and inside edge control analog.' },
      { category: 'COD', name: '5-10-5 shuttle', sectionType: 'MAIN', sets: 4, reps: 1, restSeconds: 90, notes: 'Time both directions if possible.' },
      { category: 'BALANCE', name: 'Single-leg lateral catch', sectionType: 'COOLDOWN', sets: 2, reps: 5, restSeconds: 30, notes: 'Quiet landing and knee control.' },
    ],
    tags: ['hockey', 'cod', '5-10-5'],
  },
  {
    id: 'hockey-reactive-mirror',
    blockType: 'REACTIVE_AGILITY',
    name: 'Hockey reactive mirror',
    format: 'REACTIVE',
    primaryFocus: 'REACTIVE_AGILITY',
    description: 'Partner/cue-driven movement session for hockey reads and reaction.',
    totalDuration: 30,
    targetSports: ['TEAM_ICE_HOCKEY'],
    drillBlueprints: [
      { category: 'REACTIVE_AGILITY', name: 'Mirror shuffle to sprint', sectionType: 'MAIN', sets: 4, duration: 20, restSeconds: 60, notes: 'React to partner, then sprint on clap.' },
      { category: 'REACTIVE_AGILITY', name: 'Color call lateral cut', sectionType: 'MAIN', sets: 3, reps: 5, restSeconds: 45, notes: 'Random color or number cue.' },
      { category: 'FOOTWORK', name: 'Quick feet exit', sectionType: 'WARMUP', sets: 2, duration: 20, restSeconds: 30, notes: 'Fast feet, then clean exit angle.' },
    ],
    tags: ['hockey', 'reactive-agility', 'decision'],
  },
]

export function getHockeyBuilderPresets(kind?: HockeyBuilderPresetKind) {
  if (kind === 'cardio') return HOCKEY_CARDIO_PRESETS
  if (kind === 'hybrid') return HOCKEY_HYBRID_PRESETS
  if (kind === 'agility') return HOCKEY_AGILITY_PRESETS

  return [...HOCKEY_CARDIO_PRESETS, ...HOCKEY_HYBRID_PRESETS, ...HOCKEY_AGILITY_PRESETS]
}

export function getHockeyBuilderPresetsForBlock(blockType: HockeyProgramBlockType) {
  return getHockeyBuilderPresets().filter((preset) => preset.blockType === blockType)
}

export function formatHockeyBuilderPresetGuidanceForPrompt(): string {
  const cardio = HOCKEY_CARDIO_PRESETS.map((preset) => preset.name).join(', ')
  const hybrid = HOCKEY_HYBRID_PRESETS.map((preset) => preset.name).join(', ')
  const agility = HOCKEY_AGILITY_PRESETS.map((preset) => preset.name).join(', ')

  return [
    `- Cardio hockey presets: ${cardio}.`,
    `- Hybrid hockey presets: ${hybrid}.`,
    `- Agility hockey presets: ${agility}.`,
  ].join('\n')
}
