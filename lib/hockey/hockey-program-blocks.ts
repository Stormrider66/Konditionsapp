export type HockeyProgramBuilderKind =
  | 'cardio'
  | 'hybrid'
  | 'agility'
  | 'strength'
  | 'sport_workout'
  | 'manual_drill'

export type HockeyProgramBlockType =
  | 'AEROBIC_BASE'
  | 'THRESHOLD'
  | 'REPEATED_SPRINT_ABILITY'
  | 'SHIFT_REPEAT_CONDITIONING'
  | 'ERG_POWER'
  | 'ACCELERATION'
  | 'DECELERATION_COD'
  | 'REACTIVE_AGILITY'
  | 'LATERAL_POWER'
  | 'HYBRID_CONDITIONING'
  | 'SLED_POWER'
  | 'MED_BALL_POWER'
  | 'STRENGTH_POWER'
  | 'PREHAB_STABILITY'
  | 'ON_ICE_SKILL'
  | 'TACTICAL_TEAM_PLAY'

export interface HockeyProgramBlockRoute {
  blockType: HockeyProgramBlockType
  label: string
  builder: HockeyProgramBuilderKind
  toolName:
    | 'createCardioSession'
    | 'createHybridWorkout'
    | 'createSportWorkout'
    | 'generateStrengthSession'
    | 'manual'
  studioLabel: string
  useWhen: string
  avoid: string
}

export const HOCKEY_PROGRAM_BLOCK_ROUTES: Record<HockeyProgramBlockType, HockeyProgramBlockRoute> = {
  AEROBIC_BASE: {
    blockType: 'AEROBIC_BASE',
    label: 'Aerobic base',
    builder: 'cardio',
    toolName: 'createCardioSession',
    studioLabel: 'Cardio Studio',
    useWhen: 'Low to moderate continuous or interval conditioning, bike, run, row, ski, swim, or off-ice aerobic capacity.',
    avoid: 'Do not build as strength circuits just because the athlete is a hockey player.',
  },
  THRESHOLD: {
    blockType: 'THRESHOLD',
    label: 'Threshold conditioning',
    builder: 'cardio',
    toolName: 'createCardioSession',
    studioLabel: 'Cardio Studio',
    useWhen: 'LT1/LT2, VO2max, ramp, 4x4, Norwegian-style, or controlled interval work tied to heart rate, pace, power, or lactate.',
    avoid: 'Do not mix with heavy lifts unless the coach explicitly asks for a hybrid session.',
  },
  REPEATED_SPRINT_ABILITY: {
    blockType: 'REPEATED_SPRINT_ABILITY',
    label: 'Repeated sprint ability',
    builder: 'cardio',
    toolName: 'createCardioSession',
    studioLabel: 'Cardio Studio',
    useWhen: 'Repeated sprints such as 6x30 m, 7x40 m, short bike/row/ski bursts, fatigue drop, resistance, and recovery between high-power reps.',
    avoid: 'Do not store as normal strength or generic plyometrics.',
  },
  SHIFT_REPEAT_CONDITIONING: {
    blockType: 'SHIFT_REPEAT_CONDITIONING',
    label: 'Shift repeat conditioning',
    builder: 'cardio',
    toolName: 'createCardioSession',
    studioLabel: 'Cardio Studio',
    useWhen: 'Work/rest blocks that mimic hockey shifts, for example 30-45 s hard with bench-length recovery across many repeats.',
    avoid: 'Do not force into agility unless the main goal is movement quality or decision making.',
  },
  ERG_POWER: {
    blockType: 'ERG_POWER',
    label: 'Erg power',
    builder: 'cardio',
    toolName: 'createCardioSession',
    studioLabel: 'Cardio Studio',
    useWhen: 'Wattbike, SkiErg, rower, or air bike power intervals with power, calories, duration, and repeat-group structure.',
    avoid: 'Do not make this a hybrid workout unless movements are combined with stations or loaded carries.',
  },
  ACCELERATION: {
    blockType: 'ACCELERATION',
    label: 'Acceleration',
    builder: 'agility',
    toolName: 'createSportWorkout',
    studioLabel: 'Agility Studio',
    useWhen: 'First-step speed, 5-20 m acceleration, starts, skating-specific acceleration patterns, and speed technique.',
    avoid: 'Do not bury as a warmup inside strength when it is the main training effect.',
  },
  DECELERATION_COD: {
    blockType: 'DECELERATION_COD',
    label: 'Deceleration and change of direction',
    builder: 'agility',
    toolName: 'createSportWorkout',
    studioLabel: 'Agility Studio',
    useWhen: 'Braking, edge control off-ice, 5-10-5, cutting, cone drills, and change-of-direction quality.',
    avoid: 'Do not treat as conditioning if quality and mechanics are the purpose.',
  },
  REACTIVE_AGILITY: {
    blockType: 'REACTIVE_AGILITY',
    label: 'Reactive agility',
    builder: 'agility',
    toolName: 'createSportWorkout',
    studioLabel: 'Agility Studio',
    useWhen: 'Mirror drills, partner reaction, decision-making, random cueing, and game-like movement reads.',
    avoid: 'Do not flatten into scripted footwork when the point is perception and reaction.',
  },
  LATERAL_POWER: {
    blockType: 'LATERAL_POWER',
    label: 'Lateral power',
    builder: 'agility',
    toolName: 'createSportWorkout',
    studioLabel: 'Agility Studio',
    useWhen: 'Bounds, lateral hops, skating-stride power, and off-ice lateral explosiveness with movement-quality focus.',
    avoid: 'Do not duplicate as strength unless loaded progression and force production are the main targets.',
  },
  HYBRID_CONDITIONING: {
    blockType: 'HYBRID_CONDITIONING',
    label: 'Hybrid conditioning',
    builder: 'hybrid',
    toolName: 'createHybridWorkout',
    studioLabel: 'Hybrid Studio',
    useWhen: 'Mixed circuits, EMOM, AMRAP, for-time, stations, carries, cal work, and hockey off-ice conditioning blocks.',
    avoid: 'Do not use for pure threshold or repeat sprint sessions that need interval data.',
  },
  SLED_POWER: {
    blockType: 'SLED_POWER',
    label: 'Sled power',
    builder: 'hybrid',
    toolName: 'createHybridWorkout',
    studioLabel: 'Hybrid Studio',
    useWhen: 'Sled push, sled pull, resisted drive, and station-based power conditioning.',
    avoid: 'Do not make it a strength exercise unless the coach wants sets, reps, and load progression only.',
  },
  MED_BALL_POWER: {
    blockType: 'MED_BALL_POWER',
    label: 'Medicine ball power',
    builder: 'hybrid',
    toolName: 'createHybridWorkout',
    studioLabel: 'Hybrid Studio',
    useWhen: 'Throws paired with conditioning, rotation, contact prep, or power circuits.',
    avoid: 'Do not use Hybrid Studio for isolated technical throw progressions.',
  },
  STRENGTH_POWER: {
    blockType: 'STRENGTH_POWER',
    label: 'Strength and power',
    builder: 'strength',
    toolName: 'generateStrengthSession',
    studioLabel: 'Strength Studio',
    useWhen: 'Loaded strength, max strength, power lifts, flywheel, plyometric strength progressions, and gym-based force development.',
    avoid: 'Do not include the whole hockey conditioning plan in the strength build.',
  },
  PREHAB_STABILITY: {
    blockType: 'PREHAB_STABILITY',
    label: 'Prehab and stability',
    builder: 'strength',
    toolName: 'generateStrengthSession',
    studioLabel: 'Strength Studio',
    useWhen: 'Groin, hip, shoulder, ankle, trunk, Copenhagen progressions, activation, and risk-area stability blocks.',
    avoid: 'Do not count as the main strength dose unless the goal is injury prevention.',
  },
  ON_ICE_SKILL: {
    blockType: 'ON_ICE_SKILL',
    label: 'On-ice skill',
    builder: 'manual_drill',
    toolName: 'manual',
    studioLabel: 'Manual drill or sport workout note',
    useWhen: 'Skating, puck handling, shooting, position-specific technical drills, and coach-led ice practice content.',
    avoid: 'Do not pretend the current gym/cardio builders can fully prescribe on-ice tactical detail.',
  },
  TACTICAL_TEAM_PLAY: {
    blockType: 'TACTICAL_TEAM_PLAY',
    label: 'Tactical team play',
    builder: 'manual_drill',
    toolName: 'manual',
    studioLabel: 'Manual drill or team practice plan',
    useWhen: 'Forecheck, breakout, special teams, line tactics, and tactical session planning.',
    avoid: 'Do not convert tactical work into physical load unless the coach asks for a conditioning estimate.',
  },
}

export const HOCKEY_PHASE_5_BUILDER_COVERAGE = [
  'Cardio Studio already covers aerobic base, threshold, repeated sprint ability, shift-repeat intervals, and erg power when the main variables are time, distance, power, calories, heart rate, lactate, or repeat-group structure.',
  'Hybrid Studio already covers mixed off-ice conditioning, sled work, carries, medicine-ball circuits, EMOM, AMRAP, for-time, tabata, chipper, ladder, intervals, and HYROX-style station sessions.',
  'Agility Studio already covers acceleration, change of direction, reactive agility, footwork, plyometrics, balance, LTAD filtering, sport associations, equipment filtering, and station-style agility sessions.',
  'Strength Studio now covers hockey strength, power, flywheel, unilateral strength, plyometrics, and separate prehab/stability sections.',
  'On-ice technical and tactical work still needs manual drill support or future hockey practice-planner primitives.',
] as const

export const HOCKEY_PHASE_5_GAPS = [
  'No dedicated hockey practice-plan builder for on-ice technical drills, line tactics, special teams, and practice flow.',
  'No first-class hockey block object that can combine builder outputs into one periodized weekly plan with load accounting.',
  'Agility Studio has sport tagging but not a hockey-specific seeded drill pack for edge-control analogs, reactive reads, and position-specific off-ice drills.',
  'Cardio Studio can build repeated-shift work, but hockey-specific presets such as 7x40 m, 30-45 s shift repeats, and bench-recovery templates should be added later.',
] as const

export function getHockeyProgramBlockRoute(blockType: HockeyProgramBlockType): HockeyProgramBlockRoute {
  return HOCKEY_PROGRAM_BLOCK_ROUTES[blockType]
}

export function getHockeyProgramBlocksForBuilder(builder: HockeyProgramBuilderKind): HockeyProgramBlockRoute[] {
  return Object.values(HOCKEY_PROGRAM_BLOCK_ROUTES).filter((route) => route.builder === builder)
}

export function formatHockeyProgramRoutingForPrompt(): string {
  const builderOrder: HockeyProgramBuilderKind[] = ['cardio', 'hybrid', 'agility', 'strength', 'manual_drill']

  return builderOrder
    .map((builder) => {
      const routes = getHockeyProgramBlocksForBuilder(builder)
      if (routes.length === 0) return null

      return `- ${routes[0].studioLabel}: ${routes.map((route) => route.label).join(', ')}.`
    })
    .filter(Boolean)
    .join('\n')
}
