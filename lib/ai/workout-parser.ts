/**
 * Workout Importer — schemas + per-type system prompts.
 *
 * Sibling to `program-parser.ts`, but for a SINGLE workout in one of four
 * studio shapes:
 *   - STRENGTH → matches StrengthSessionData (sections: warmup/main/core/cooldown)
 *   - CARDIO   → matches CardioSessionData   (segments with seconds/meters)
 *   - HYBRID   → matches HybridWorkoutBuilder.initialData (format + movements)
 *   - AGILITY  → matches AgilityWorkout      (format + drills)
 *
 * The route picks the right schema + prompt by `workoutType`. The output
 * field names match the builders' `initialData` props so the dialog can
 * hand the parsed object straight to the existing builder UI without a
 * second editing surface.
 */

import { z } from 'zod'

// ─── Shared ──────────────────────────────────────────────────────────────────

export type WorkoutImportType = 'STRENGTH' | 'CARDIO' | 'HYBRID' | 'AGILITY'

export const WorkoutImportTypeSchema = z.enum([
  'STRENGTH',
  'CARDIO',
  'HYBRID',
  'AGILITY',
])

/**
 * Strength + agility + hybrid all reference a separate item library
 * (Exercise / AgilityDrill / HybridMovement→Exercise) and need fuzzy
 * resolution after parsing. Cardio doesn't.
 */
export function importTypeNeedsResolution(t: WorkoutImportType): boolean {
  return t !== 'CARDIO'
}

// ─── Strength ───────────────────────────────────────────────────────────────

const StrengthExerciseSchema = z.object({
  // The name we show in the builder until it resolves to a real Exercise FK.
  exerciseName: z.string().min(1).optional(),
  sets: z.number().int().positive().optional(),
  // AI may emit "5", "5-8", "AMRAP", "30s" — keep flexible.
  reps: z.union([z.number(), z.string()]).optional(),
  // kg as plain number when the source spells it out.
  weight: z.number().nonnegative().optional(),
  // Free text fallback — "BW", "Kroppsvikt", "60% 1RM" — stored on notes
  // since StrengthSessionExercise doesn't carry a string weight column.
  weightLabel: z.string().optional(),
  restSeconds: z.number().int().nonnegative().optional(),
  tempo: z.string().optional(),
  rpe: z.union([z.number(), z.string()]).optional(),
  notes: z.string().optional(),
})

const StrengthSectionSchema = z.object({
  notes: z.string().optional(),
  duration: z.number().int().positive().optional(),
  exercises: z.array(StrengthExerciseSchema).optional(),
})

export const StrengthWorkoutImportSchema = z.object({
  workoutType: z.literal('STRENGTH'),
  name: z.string().min(1),
  description: z.string().optional(),
  // Free-form. The builder's PHASE_MAP normalises if it can — otherwise the
  // string survives as-is so coach can adjust.
  phase: z.string().optional(),
  exercises: z.array(StrengthExerciseSchema),
  warmupData: StrengthSectionSchema.optional(),
  prehabData: StrengthSectionSchema.optional(),
  coreData: StrengthSectionSchema.optional(),
  cooldownData: StrengthSectionSchema.optional(),
  estimatedDuration: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
})
export type ParsedStrengthWorkout = z.infer<typeof StrengthWorkoutImportSchema>

// ─── Cardio ─────────────────────────────────────────────────────────────────

const CARDIO_FLAT_TYPES = [
  'WARMUP',
  'COOLDOWN',
  'INTERVAL',
  'STEADY',
  'RECOVERY',
  'HILL',
  'DRILLS',
] as const

const CARDIO_REPEAT_STEP_TYPES = ['INTERVAL', 'RECOVERY', 'REST', 'STEADY'] as const

const CardioFlatSegmentSchema = z.object({
  type: z.enum(CARDIO_FLAT_TYPES),
  // Seconds + meters to match CardioSessionData. The builder divides by
  // 60 / 1000 when it loads initialData, so we emit raw SI here.
  duration: z.number().int().nonnegative().optional(),
  distance: z.number().nonnegative().optional(),
  pace: z.string().optional(), // "5:30/km"
  zone: z.number().int().min(1).max(5).optional(),
  notes: z.string().optional(),
})

const CardioRepeatStepSchema = z.object({
  type: z.enum(CARDIO_REPEAT_STEP_TYPES),
  duration: z.number().int().nonnegative().optional(),
  distance: z.number().nonnegative().optional(),
  pace: z.string().optional(),
  zone: z.number().int().min(1).max(5).optional(),
  notes: z.string().optional(),
})

const CardioRepeatGroupSchema = z.object({
  type: z.literal('REPEAT_GROUP'),
  repeats: z.number().int().positive(),
  /** Seconds of rest between rounds of the group (not between steps). */
  restBetweenRounds: z.number().int().nonnegative().optional(),
  steps: z.array(CardioRepeatStepSchema).min(1),
})

/**
 * A cardio segment is either a flat block (WARMUP, STEADY, etc.) or a
 * REPEAT_GROUP wrapping a sub-sequence that runs N times. Cleaner than
 * flattening "5×1km" into 5 INTERVAL + 4 RECOVERY rows the coach can't
 * easily edit as a unit. The cardio builder already handles both shapes
 * at runtime even though `CardioSessionData['segments']` only types the
 * flat one.
 */
const CardioSegmentSchema = z.discriminatedUnion('type', [
  CardioFlatSegmentSchema.extend({ type: z.literal('WARMUP') }),
  CardioFlatSegmentSchema.extend({ type: z.literal('COOLDOWN') }),
  CardioFlatSegmentSchema.extend({ type: z.literal('INTERVAL') }),
  CardioFlatSegmentSchema.extend({ type: z.literal('STEADY') }),
  CardioFlatSegmentSchema.extend({ type: z.literal('RECOVERY') }),
  CardioFlatSegmentSchema.extend({ type: z.literal('HILL') }),
  CardioFlatSegmentSchema.extend({ type: z.literal('DRILLS') }),
  CardioRepeatGroupSchema,
])

export const CardioWorkoutImportSchema = z.object({
  workoutType: z.literal('CARDIO'),
  name: z.string().min(1),
  description: z.string().optional(),
  // RUNNING / CYCLING / SKIING / SWIMMING / ROWING — the cardio builder
  // accepts any string and renders it; downstream the DB uses an enum.
  sport: z.string().min(1).default('RUNNING'),
  segments: z.array(CardioSegmentSchema),
  totalDuration: z.number().int().nonnegative().optional(), // seconds
  totalDistance: z.number().nonnegative().optional(), // meters
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
})
export type ParsedCardioWorkout = z.infer<typeof CardioWorkoutImportSchema>
export type ParsedCardioSegment = z.infer<typeof CardioSegmentSchema>
export type ParsedCardioRepeatStep = z.infer<typeof CardioRepeatStepSchema>

// ─── Hybrid ─────────────────────────────────────────────────────────────────

const HYBRID_FORMATS = [
  'FOR_TIME',
  'AMRAP',
  'EMOM',
  'TABATA',
  'CHIPPER',
  'LADDER',
  'INTERVALS',
  'HYROX_SIM',
  'CUSTOM',
] as const

const HYBRID_SCALING = ['RX', 'SCALED', 'FOUNDATIONS'] as const

const HybridMovementImportSchema = z.object({
  // Resolved against Exercise (same library strength uses).
  exerciseName: z.string().min(1),
  reps: z.number().int().nonnegative().optional(),
  calories: z.number().int().nonnegative().optional(),
  distance: z.number().nonnegative().optional(), // meters
  duration: z.number().int().nonnegative().optional(), // seconds
  weightMale: z.number().nonnegative().optional(), // kg
  weightFemale: z.number().nonnegative().optional(), // kg
  notes: z.string().optional(),
})

export const HybridWorkoutImportSchema = z.object({
  workoutType: z.literal('HYBRID'),
  name: z.string().min(1),
  description: z.string().optional(),
  format: z.enum(HYBRID_FORMATS).default('CUSTOM'),
  timeCap: z.number().int().nonnegative().optional(), // seconds
  workTime: z.number().int().nonnegative().optional(), // seconds
  restTime: z.number().int().nonnegative().optional(), // seconds
  totalRounds: z.number().int().positive().optional(),
  totalMinutes: z.number().int().positive().optional(),
  repScheme: z.string().optional(), // "21-15-9", "10-9-8-…"
  scalingLevel: z.enum(HYBRID_SCALING).default('RX'),
  movements: z.array(HybridMovementImportSchema),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
})
export type ParsedHybridWorkout = z.infer<typeof HybridWorkoutImportSchema>

// ─── Agility ────────────────────────────────────────────────────────────────

const AGILITY_FORMATS = [
  'CIRCUIT',
  'STATION_ROTATION',
  'INTERVAL',
  'PROGRESSIVE',
  'REACTIVE',
  'TESTING',
] as const

const AGILITY_SECTIONS = ['WARMUP', 'MAIN', 'COOLDOWN'] as const

const AgilityDrillImportSchema = z.object({
  // Resolved against AgilityDrill library.
  drillName: z.string().min(1),
  sectionType: z.enum(AGILITY_SECTIONS).default('MAIN'),
  sets: z.number().int().positive().optional(),
  reps: z.number().int().positive().optional(),
  duration: z.number().int().positive().optional(), // seconds per rep
  restSeconds: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
})

export const AgilityWorkoutImportSchema = z.object({
  workoutType: z.literal('AGILITY'),
  name: z.string().min(1),
  description: z.string().optional(),
  format: z.enum(AGILITY_FORMATS).default('CIRCUIT'),
  totalDuration: z.number().int().positive().optional(), // minutes
  restBetweenDrills: z.number().int().nonnegative().optional(), // seconds
  drills: z.array(AgilityDrillImportSchema),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
})
export type ParsedAgilityWorkout = z.infer<typeof AgilityWorkoutImportSchema>

// ─── Discriminated union + per-type accessor ────────────────────────────────

export const WorkoutImportSchema = z.discriminatedUnion('workoutType', [
  StrengthWorkoutImportSchema,
  CardioWorkoutImportSchema,
  HybridWorkoutImportSchema,
  AgilityWorkoutImportSchema,
])
export type ParsedWorkoutImport = z.infer<typeof WorkoutImportSchema>

export function schemaForType(t: WorkoutImportType) {
  switch (t) {
    case 'STRENGTH':
      return StrengthWorkoutImportSchema
    case 'CARDIO':
      return CardioWorkoutImportSchema
    case 'HYBRID':
      return HybridWorkoutImportSchema
    case 'AGILITY':
      return AgilityWorkoutImportSchema
  }
}

// ─── JSON extraction (mirrors program-parser repair logic) ──────────────────

function repairTruncatedJson(json: string): string | null {
  if (!/[\{\[]/.test(json)) return null
  let repaired = json.trim()
  repaired = repaired.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"]*$/, '')
  repaired = repaired.replace(/,\s*$/, '')
  let openBraces = 0
  let openBrackets = 0
  let inString = false
  let escape = false
  for (const ch of repaired) {
    if (escape) {
      escape = false
      continue
    }
    if (ch === '\\' && inString) {
      escape = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (ch === '{') openBraces++
    else if (ch === '}') openBraces--
    else if (ch === '[') openBrackets++
    else if (ch === ']') openBrackets--
  }
  if (inString) repaired += '"'
  while (openBrackets > 0) {
    repaired += ']'
    openBrackets--
  }
  while (openBraces > 0) {
    repaired += '}'
    openBraces--
  }
  try {
    JSON.parse(repaired)
    return repaired
  } catch {
    return null
  }
}

function extractJsonFromText(text: string): string | null {
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlock) {
    const extracted = codeBlock[1].trim()
    try {
      JSON.parse(extracted)
      return extracted
    } catch {
      const repaired = repairTruncatedJson(extracted)
      if (repaired) return repaired
    }
  }
  const truncBlock = text.match(/```(?:json)?\s*([\s\S]+)$/)
  if (truncBlock && !codeBlock) {
    const repaired = repairTruncatedJson(truncBlock[1].trim())
    if (repaired) return repaired
  }
  const objMatch = text.match(/\{[\s\S]*\}/)
  if (objMatch) {
    try {
      JSON.parse(objMatch[0])
      return objMatch[0]
    } catch {
      const repaired = repairTruncatedJson(objMatch[0])
      if (repaired) return repaired
    }
  }
  const truncObj = text.match(/(\{[\s\S]+)$/)
  if (truncObj && !objMatch) {
    const repaired = repairTruncatedJson(truncObj[1])
    if (repaired) return repaired
  }
  return null
}

export type ParseWorkoutResult<T> =
  | { success: true; workout: T; rawJson: unknown }
  | { success: false; error: string; rawJson?: unknown }

export function parseAIWorkout<T extends WorkoutImportType>(
  aiOutput: string,
  workoutType: T
): ParseWorkoutResult<
  T extends 'STRENGTH'
    ? ParsedStrengthWorkout
    : T extends 'CARDIO'
      ? ParsedCardioWorkout
      : T extends 'HYBRID'
        ? ParsedHybridWorkout
        : ParsedAgilityWorkout
> {
  try {
    const jsonString = extractJsonFromText(aiOutput)
    if (!jsonString) {
      return { success: false, error: 'No JSON found in AI response' }
    }
    let raw: unknown
    try {
      raw = JSON.parse(jsonString)
    } catch {
      return { success: false, error: 'Invalid JSON in AI response', rawJson: jsonString }
    }
    // Force the discriminator so the schema picks the right branch even when
    // the model forgot to emit it.
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      ;(raw as Record<string, unknown>).workoutType = workoutType
    }
    const schema = schemaForType(workoutType)
    const result = schema.safeParse(raw)
    if (!result.success) {
      const issues = result.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', ')
      return { success: false, error: `Validation error: ${issues}`, rawJson: raw }
    }
    return { success: true, workout: result.data as never, rawJson: raw }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown parsing error',
    }
  }
}

// ─── Per-type system prompts ─────────────────────────────────────────────────

const COMMON_RULES = `Output STRICT JSON only. No prose before or after, no code fences.
Capture EVERY exercise / segment / movement / drill the source describes — never summarize with "...and others".
Preserve the source's language in name, description, notes. Do NOT translate to English.
Omit fields you can't read confidently rather than guessing. Numeric durations / distances should be numbers, not strings.
NEVER emit placeholder names like "Övning 1", "Exercise 2", "Drill A", "Movement 3" — copy the actual name verbatim from the source. If you can't read a name, omit the whole item.`

const STRENGTH_PROMPT = `You are an expert strength coach who imports a SINGLE strength workout into a structured JSON shape.

Output JSON matching:
{
  "name": string,
  "description"?: string,
  "phase"?: string,           // e.g. "Maxstyrka", "Strength", "Power", "Maintenance"
  "exercises": [              // MAIN section
    {
      "exerciseName": string,
      "sets"?: number,
      "reps"?: number | string,   // "5", "5-8", "AMRAP", "30s"
      "weight"?: number,          // kg, plain number
      "weightLabel"?: string,     // "Kroppsvikt", "60% 1RM", "BW" — use when load isn't a kg number
      "restSeconds"?: number,
      "tempo"?: string,           // "3-1-X"
      "rpe"?: number | string,    // "7", "7-8"
      "notes"?: string
    }
  ],
  "warmupData"?:   { "notes"?: string, "duration"?: number, "exercises"?: [ ...same shape... ] },
  "prehabData"?:   { "notes"?: string, "duration"?: number, "exercises"?: [ ...same shape... ] },
  "coreData"?:     { "notes"?: string, "duration"?: number, "exercises"?: [ ...same shape... ] },
  "cooldownData"?: { "notes"?: string, "duration"?: number, "exercises"?: [ ...same shape... ] },
  "estimatedDuration"?: number,    // minutes
  "tags"?: string[],
  "notes"?: string
}

${COMMON_RULES}

EXERCISE NAMES
- Use the cleanest human-readable form: "Knäböj", "Bench Press", "Romanian Deadlift". Strip equipment parentheticals like "(bar)", "(hantel)" — the library knows about bars.
- NEVER include sets/reps/weight in the name itself. "Knäböj 5x5 @ 60kg" → exerciseName:"Knäböj", sets:5, reps:5, weight:60.

SECTION ROUTING
- Dynamic stretches, mobility, ramp-up sets → warmupData.exercises.
- The primary lifts (squat, bench, deadlift, OHP, rows, etc.) → exercises (the MAIN section).
- Stability, prehab, groin/hip/shoulder/ankle control, Copenhagen, activation circuits → prehabData.exercises.
- Plank, dead bug, anti-rotation, hollow holds, etc. → coreData.exercises.
- Static stretches, foam rolling, breathing → cooldownData.exercises.

REPS / WEIGHT / REST
- "5 x 5" → sets:5, reps:5
- "3 x 8-12" → sets:3, reps:"8-12"
- "3 x 30 s" → sets:3, reps:"30s"
- "Vila 3 min" → restSeconds:180
- "60 kg" → weight:60. "BW" or "Kroppsvikt" → weightLabel:"Kroppsvikt".

FIELD DISCIPLINE
- Don't dump RPE, tempo, muscle group into description/notes when there's a dedicated field. Free prose like "fokusera på djupet" goes in notes.

Now extract the strength workout JSON.`

const CARDIO_PROMPT = `You are an expert endurance coach who imports a SINGLE cardio session into a structured JSON shape.

Output JSON matching:
{
  "name": string,
  "description"?: string,
  "sport": "RUNNING" | "CYCLING" | "SWIMMING" | "SKIING" | "ROWING" | string,
  "segments": [
    // Flat segment — for one-shot blocks like warmup, cooldown, a single steady run:
    {
      "type": "WARMUP" | "STEADY" | "INTERVAL" | "RECOVERY" | "HILL" | "DRILLS" | "COOLDOWN",
      "duration"?: number,    // SECONDS
      "distance"?: number,    // METERS
      "pace"?: string,        // "5:30/km", "1:45/100m"
      "zone"?: number,        // 1-5
      "notes"?: string
    }
    // OR a repeat group — for "Nx interval" patterns. Wraps a sub-sequence
    // that runs N times. Use this whenever the source describes Nx of
    // anything (5×1km, 8×400m, 6×3min) — it's far easier for the coach to
    // edit the prescription as a unit afterward.
    {
      "type": "REPEAT_GROUP",
      "repeats": number,             // N
      "restBetweenRounds"?: number,  // SECONDS — only when source explicitly calls out rest BETWEEN whole rounds (not per-step)
      "steps": [                     // The body of one round
        {
          "type": "INTERVAL" | "RECOVERY" | "REST" | "STEADY",
          "duration"?: number,        // seconds
          "distance"?: number,        // meters
          "pace"?: string,
          "zone"?: number,
          "notes"?: string
        }
      ]
    }
  ],
  "totalDuration"?: number,   // seconds
  "totalDistance"?: number,   // meters
  "tags"?: string[],
  "notes"?: string
}

${COMMON_RULES}

UNITS — VERY IMPORTANT
- duration is in SECONDS (not minutes). "10 min uppvärmning" → duration:600.
- distance is in METERS (not km). "5 km" → distance:5000. "400 m" → distance:400.

INTERVALS — PREFER REPEAT_GROUP
- "5×1km @ 3:40 with 90s rest jog" → ONE REPEAT_GROUP with repeats:5 and steps:[{type:"INTERVAL",distance:1000,pace:"3:40/km",zone:4},{type:"RECOVERY",duration:90,zone:1}].
- "8×400m fast / 200m easy" → REPEAT_GROUP repeats:8, steps:[{INTERVAL,distance:400,...},{RECOVERY,distance:200,...}].
- "6×3 min @ tempo, 90s vila" → REPEAT_GROUP repeats:6, steps:[{INTERVAL,duration:180,zone:4},{RECOVERY,duration:90,zone:1}].
- Wrap warmup/cooldown around the group as separate flat segments.
- Only emit individual flat INTERVAL/RECOVERY segments when the source describes a non-uniform sequence ("3min @ tempo, 90s easy, 1min @ max, 60s easy") that doesn't repeat cleanly.

ZONES
- If source uses HR zones 1–5, copy the number into zone.
- If source uses pace ("Z2 ~5:30/km"), set zone to the number AND fill pace.

Now extract the cardio session JSON.`

const HYBRID_PROMPT = `You are an expert hybrid / functional fitness coach who imports a SINGLE hybrid workout (CrossFit, HYROX, conditioning) into a structured JSON shape.

Output JSON matching:
{
  "name": string,
  "description"?: string,
  "format": "FOR_TIME" | "AMRAP" | "EMOM" | "TABATA" | "CHIPPER" | "LADDER" | "INTERVALS" | "HYROX_SIM" | "CUSTOM",
  "timeCap"?: number,         // seconds — 0 / omit if no cap
  "workTime"?: number,        // seconds — for EMOM / Tabata work portion
  "restTime"?: number,        // seconds — for EMOM / Tabata rest portion
  "totalRounds"?: number,     // for fixed-round workouts
  "totalMinutes"?: number,    // EMOM total minutes
  "repScheme"?: string,       // "21-15-9", "10-9-8-7-6-5-4-3-2-1"
  "scalingLevel": "RX" | "SCALED" | "FOUNDATIONS",
  "movements": [
    {
      "exerciseName": string,
      "reps"?: number,
      "calories"?: number,
      "distance"?: number,    // meters
      "duration"?: number,    // seconds
      "weightMale"?: number,  // kg
      "weightFemale"?: number, // kg
      "notes"?: string
    }
  ],
  "tags"?: string[],
  "notes"?: string
}

${COMMON_RULES}

FORMAT DETECTION
- "AMRAP X min" → format:"AMRAP", totalMinutes:X.
- "For time" / "FT" / "Cap X min" → format:"FOR_TIME", timeCap:X*60.
- "EMOM X min" → format:"EMOM", totalMinutes:X (workTime usually 60, sometimes split between odd/even movements).
- "Tabata" → format:"TABATA", workTime:20, restTime:10.
- "21-15-9 …" → format:"FOR_TIME", repScheme:"21-15-9".
- HYROX-style 8-stations + run → format:"HYROX_SIM".

MOVEMENT NAMES
- Use canonical names: "Thruster", "Pull-up", "Wall Ball", "Burpee", "Box Jump", "Kettlebell Swing", "Sled Push", "Wall Ball Shot", "Run".
- Don't put weights in the name. "Thruster @ 43kg" → exerciseName:"Thruster", weightMale:43.

WEIGHTS
- Rx weights are typically given as Male/Female: "43/30 kg" → weightMale:43, weightFemale:30.

Now extract the hybrid workout JSON.`

const AGILITY_PROMPT = `You are an expert agility / athletic-development coach who imports a SINGLE agility workout into a structured JSON shape.

Output JSON matching:
{
  "name": string,
  "description"?: string,
  "format": "CIRCUIT" | "STATION_ROTATION" | "INTERVAL" | "PROGRESSIVE" | "REACTIVE" | "TESTING",
  "totalDuration"?: number,           // minutes
  "restBetweenDrills"?: number,       // seconds
  "drills": [
    {
      "drillName": string,
      "sectionType": "WARMUP" | "MAIN" | "COOLDOWN",
      "sets"?: number,
      "reps"?: number,
      "duration"?: number,            // seconds per rep
      "restSeconds"?: number,
      "notes"?: string
    }
  ],
  "tags"?: string[],
  "notes"?: string
}

${COMMON_RULES}

FORMAT DETECTION
- Multiple drills back-to-back → CIRCUIT.
- Stations with team rotation → STATION_ROTATION.
- Work/rest intervals → INTERVAL.
- Progressively harder drills → PROGRESSIVE.
- Reaction-based / random cue → REACTIVE.
- Standardized testing (5-10-5, T-test, Illinois, 40yd) → TESTING.

DRILL NAMES
- Use the canonical drill name: "5-10-5 Pro Agility", "T-Test", "Illinois Agility Test", "Ladder In-In-Out-Out", "Cone Hex Drill", "Reactive Mirror Drill".
- Strip rep/distance from the name: "10x 5-10-5 with 30s rest" → drillName:"5-10-5 Pro Agility", reps:10, restSeconds:30.

SECTION ROUTING
- Skips, ankle hops, dynamic mobility → WARMUP.
- The actual agility drills → MAIN.
- Walking, breathing, static stretches → COOLDOWN.

Now extract the agility workout JSON.`

export function systemPromptForType(t: WorkoutImportType): string {
  switch (t) {
    case 'STRENGTH':
      return STRENGTH_PROMPT
    case 'CARDIO':
      return CARDIO_PROMPT
    case 'HYBRID':
      return HYBRID_PROMPT
    case 'AGILITY':
      return AGILITY_PROMPT
  }
}

/**
 * Pull the names from a parsed workout that need fuzzy resolution against
 * the corresponding library (Exercise / AgilityDrill). Cardio returns [].
 */
export function extractResolvableNames(
  parsed: ParsedWorkoutImport
): string[] {
  switch (parsed.workoutType) {
    case 'STRENGTH': {
      const all: string[] = []
      for (const e of parsed.exercises) if (e.exerciseName) all.push(e.exerciseName)
      for (const sec of [parsed.warmupData, parsed.prehabData, parsed.coreData, parsed.cooldownData]) {
        for (const e of sec?.exercises ?? []) if (e.exerciseName) all.push(e.exerciseName)
      }
      return all
    }
    case 'HYBRID':
      return parsed.movements.map((m) => m.exerciseName).filter((n): n is string => !!n)
    case 'AGILITY':
      return parsed.drills.map((d) => d.drillName).filter((n): n is string => !!n)
    case 'CARDIO':
      return []
  }
}
