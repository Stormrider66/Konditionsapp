/**
 * Map free-text exercise names (English + Swedish) to Garmin's controlled FIT
 * exercise vocabulary (`exerciseCategory` + `exerciseName`), so workout steps
 * pushed to a Garmin watch display a real exercise name instead of "Unknown"
 * ("Okänd") and let Garmin count reps / attribute the movement.
 *
 * Enum values come from the Garmin FIT SDK Profile (exercise_category +
 * *_exercise_name), sent verbatim in UPPER_SNAKE_CASE. Verified against the
 * live Garmin Training API (2026-07-01): the API stores these fields and the
 * watch renders them, even on a CARDIO_TRAINING workout.
 *
 * Design: deterministic, server-side keyword matching — NOT model-supplied
 * enums (the model would hallucinate). Ordered most-specific first. Anything
 * unmatched returns null → the step keeps only its free-text description, i.e.
 * no worse than before. When a movement has a real category but no confident
 * specific name (e.g. ski erg), we return the category alone rather than force
 * a wrong name.
 */

export interface GarminExerciseRef {
  exerciseCategory: string
  exerciseName?: string
}

interface Matcher {
  pattern: RegExp
  ref: GarminExerciseRef
}

// Ordered: compound / specific movements BEFORE the generic single-word ones
// they contain (e.g. "clean and jerk" before "clean"; "air squat" before
// "squat"; "assault bike" before "bike"; "ski erg" before "row"/"erg").
const MATCHERS: Matcher[] = [
  // ── Olympic lifts ───────────────────────────────────────────────
  { pattern: /clean\s*(?:and|&|\+|,|\/)?\s*jerk|frivändning\s*(?:med|och|&|\+)?\s*stöt|\bc\s*&\s*j\b|\bcnj\b/, ref: { exerciseCategory: 'OLYMPIC_LIFT', exerciseName: 'CLEAN_AND_JERK' } },
  { pattern: /\bsnatch\b|\bryck\b/, ref: { exerciseCategory: 'OLYMPIC_LIFT', exerciseName: 'SNATCH' } },
  { pattern: /power\s*clean|hang\s*clean|squat\s*clean|\bclean\b|frivändning/, ref: { exerciseCategory: 'OLYMPIC_LIFT', exerciseName: 'CLEAN' } },
  { pattern: /push\s*jerk|split\s*jerk|\bjerk\b|\bstöt\b/, ref: { exerciseCategory: 'OLYMPIC_LIFT', exerciseName: 'PUSH_JERK' } },

  // ── Squat family (specific before generic) ──────────────────────
  { pattern: /thruster/, ref: { exerciseCategory: 'SQUAT', exerciseName: 'THRUSTERS' } },
  { pattern: /wall\s*ball|väggboll|wallball/, ref: { exerciseCategory: 'SQUAT', exerciseName: 'WALL_BALL' } },
  { pattern: /goblet/, ref: { exerciseCategory: 'SQUAT', exerciseName: 'GOBLET_SQUAT' } },
  { pattern: /front\s*squat|frontböj|frontknäböj/, ref: { exerciseCategory: 'SQUAT', exerciseName: 'BARBELL_FRONT_SQUAT' } },
  { pattern: /air\s*squat|luftböj|bodyweight\s*squat|knäböj\s*utan\s*vikt/, ref: { exerciseCategory: 'SQUAT', exerciseName: 'AIR_SQUAT' } },
  { pattern: /back\s*squat|knäböj|\bsquat\b|\bböj\b/, ref: { exerciseCategory: 'SQUAT', exerciseName: 'BARBELL_BACK_SQUAT' } },

  // ── Deadlift ────────────────────────────────────────────────────
  { pattern: /romanian\s*deadlift|\brdl\b|rumänsk\s*mark/, ref: { exerciseCategory: 'DEADLIFT', exerciseName: 'ROMANIAN_DEADLIFT' } },
  { pattern: /sumo\s*deadlift|sumomark/, ref: { exerciseCategory: 'DEADLIFT', exerciseName: 'SUMO_DEADLIFT' } },
  { pattern: /deadlift|marklyft|\bmark\b/, ref: { exerciseCategory: 'DEADLIFT', exerciseName: 'BARBELL_DEADLIFT' } },

  // ── Plyo / jumps ────────────────────────────────────────────────
  { pattern: /box\s*jump|boxhopp|lådhopp|box\s*jump\s*over/, ref: { exerciseCategory: 'PLYO', exerciseName: 'BOX_JUMP' } },
  { pattern: /box\s*step|step[\s-]?up|uppsteg|stepup/, ref: { exerciseCategory: 'SQUAT', exerciseName: 'STEP_UP' } },
  { pattern: /burpee|burpé/, ref: { exerciseCategory: 'TOTAL_BODY', exerciseName: 'BURPEE' } },

  // ── Core / hanging ──────────────────────────────────────────────
  { pattern: /toes?\s*(?:to|2)\s*bar|\bt2b\b|tå(?:r|na)?\s*(?:till|to)\s*stång|tåtillstång/, ref: { exerciseCategory: 'CRUNCH', exerciseName: 'TOES_TO_BAR' } },
  { pattern: /hanging\s*knee|knä(?:lyft|höjning)?\s*i?\s*häng|häng.*knä/, ref: { exerciseCategory: 'LEG_RAISE', exerciseName: 'HANGING_KNEE_RAISE' } },
  { pattern: /hanging\s*leg|leg\s*raise|benlyft|häng.*ben/, ref: { exerciseCategory: 'LEG_RAISE', exerciseName: 'HANGING_LEG_RAISE' } },
  { pattern: /sit[\s-]?up|situp|magböj|magövning/, ref: { exerciseCategory: 'SIT_UP', exerciseName: 'SIT_UP' } },
  { pattern: /\bplank\b|planka/, ref: { exerciseCategory: 'PLANK', exerciseName: 'PLANK' } },

  // ── Push / pull ─────────────────────────────────────────────────
  { pattern: /push[\s-]?up|pushup|armhävning/, ref: { exerciseCategory: 'PUSH_UP', exerciseName: 'PUSH_UP' } },
  { pattern: /chin[\s-]?up|hakhäv/, ref: { exerciseCategory: 'PULL_UP', exerciseName: 'CHIN_UP' } },
  { pattern: /pull[\s-]?up|pullup|\bchins?\b|räckhäv/, ref: { exerciseCategory: 'PULL_UP', exerciseName: 'PULL_UP' } },

  // ── Kettlebell ──────────────────────────────────────────────────
  { pattern: /kettlebell\s*swing|\bkb\s*swing\b|kettlebellsving|kettlebell\s*sving|\bswing\b|\bsving\b/, ref: { exerciseCategory: 'HIP_RAISE', exerciseName: 'KETTLEBELL_SWING' } },

  // ── Lunge (walking before plain) ────────────────────────────────
  { pattern: /walking\s*lunge|gående\s*utfall|walking\s*barbell\s*lunge/, ref: { exerciseCategory: 'LUNGE', exerciseName: 'WALKING_LUNGE' } },
  { pattern: /\blunge\b|\butfall\b|utfallssteg|utfallsteg/, ref: { exerciseCategory: 'LUNGE', exerciseName: 'LUNGE' } },

  // ── Cardio machines ─────────────────────────────────────────────
  { pattern: /\bair\s*bike\b|airbike|airdyne|air[\s-]?dyne|echo\s*bike|echobike/, ref: { exerciseCategory: 'INDOOR_BIKE', exerciseName: 'AIR_BIKE' } },
  { pattern: /assault/, ref: { exerciseCategory: 'INDOOR_BIKE', exerciseName: 'ASSAULT_BIKE' } },
  { pattern: /watt\s*bike|wattbike|spin\s*bike|spinning|stationary\s*bike|motionscykel|\bbike\b|\bcykel\b/, ref: { exerciseCategory: 'INDOOR_BIKE', exerciseName: 'STATIONARY_BIKE' } },
  // Ski erg has NO FIT enum → generic CARDIO category only (never reuse rowing).
  { pattern: /ski\s*erg|skierg|ski[\s-]?erg|skidergometer|skidmaskin|skiergo/, ref: { exerciseCategory: 'CARDIO' } },
  { pattern: /rowing|rower|\brow\b|roddmaskin|\brodd\b/, ref: { exerciseCategory: 'ROW', exerciseName: 'INDOOR_ROW' } },

  // ── Running ─────────────────────────────────────────────────────
  { pattern: /treadmill|löpband/, ref: { exerciseCategory: 'RUN_INDOOR', exerciseName: 'TREADMILL' } },
  { pattern: /running|\brun\b|löpning|\blöp\b|jogging|\bjogg/, ref: { exerciseCategory: 'RUN', exerciseName: 'RUN' } },
]

/**
 * Resolve the best Garmin exercise reference from one or more free-text names
 * (e.g. English name + Swedish name, or equipment + notes). Returns null when
 * nothing matches confidently.
 */
export function resolveGarminExercise(
  ...texts: Array<string | null | undefined>
): GarminExerciseRef | null {
  const hay = texts.filter(Boolean).join(' ').toLowerCase().trim()
  if (!hay) return null
  for (const m of MATCHERS) {
    if (m.pattern.test(hay)) return m.ref
  }
  return null
}

/** Extract a kilogram weight from free text ("40 kg", "40kg", "6 x 40 kg"). */
export function extractWeightKg(
  ...texts: Array<string | null | undefined>
): number | undefined {
  const hay = texts.filter(Boolean).join(' ')
  const match = hay.match(/(\d+(?:[.,]\d+)?)\s*kg\b/i)
  if (!match) return undefined
  const value = Number(match[1].replace(',', '.'))
  return Number.isFinite(value) && value > 0 ? value : undefined
}
