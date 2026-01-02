/**
 * Program Parser for AI Output
 *
 * Extracts and validates structured training program data from AI-generated responses.
 * Enhanced to support detailed workout segments with pace, HR zones, and power targets.
 */

import { z } from 'zod';

// Schema for a workout segment (warmup, work, interval, cooldown, etc.)
const WorkoutSegmentSchema = z.object({
  order: z.number(),
  type: z.enum(['warmup', 'work', 'interval', 'cooldown', 'rest', 'exercise']),
  duration: z.number().optional(), // minutes
  distance: z.number().optional(), // km
  pace: z.string().optional(), // "5:00/km" format
  zone: z.number().min(1).max(5).optional(), // Training zone 1-5
  heartRate: z.string().optional(), // "140-150 bpm" or zone-based range
  power: z.number().optional(), // watts (for cycling)
  reps: z.number().optional(), // repetitions for intervals
  // Strength/exercise specific
  exerciseId: z.string().optional(),
  sets: z.number().optional(),
  repsCount: z.string().optional(), // "10" or "10-12" or "AMRAP"
  weight: z.string().optional(), // "80kg" or "BW" or "50% 1RM"
  tempo: z.string().optional(), // "3-1-1"
  rest: z.number().optional(), // seconds between sets
  description: z.string().optional(),
  notes: z.string().optional(),
});

// Schema for a single workout/session - enhanced version
const WorkoutSchema = z.object({
  type: z.enum([
    'REST',
    'RUNNING',
    'CYCLING',
    'SWIMMING',
    'STRENGTH',
    'CROSS_TRAINING',
    'HYROX',
    'SKIING',
    'CORE',
    'PLYOMETRIC',
    'RECOVERY',
    'ALTERNATIVE',
    'OTHER'
  ]),
  name: z.string().optional(),
  duration: z.number().optional(), // total minutes
  distance: z.number().optional(), // total km
  zone: z.union([z.string(), z.number()]).optional(), // primary zone
  description: z.string(),
  intensity: z.enum(['recovery', 'easy', 'moderate', 'threshold', 'interval', 'max', 'hard', 'race_pace']).optional(),
  // Enhanced: detailed segments with pace/HR/power targets
  segments: z.array(WorkoutSegmentSchema).optional(),
  // Legacy interval support (converted to segments)
  intervals: z.array(z.object({
    repetitions: z.number(),
    workDuration: z.number(), // seconds or meters
    workIntensity: z.string(),
    restDuration: z.number(),
    restIntensity: z.string().optional()
  })).optional(),
  // Running-specific targets
  targetPace: z.string().optional(), // "5:00/km"
  targetHR: z.string().optional(), // "140-150 bpm"
  // Cycling-specific targets
  targetPower: z.number().optional(), // watts
  targetPowerZone: z.number().optional(), // 1-7
  // Swimming-specific
  targetPace100m: z.string().optional(), // "1:45/100m"
  notes: z.string().optional()
});

// Schema for a day in the weekly template
const DayTemplateSchema = z.union([
  z.object({
    type: z.literal('REST'),
    description: z.string().optional()
  }),
  WorkoutSchema
]);

// Schema for a training phase
const PhaseSchema = z.object({
  name: z.string(),
  weeks: z.string(), // e.g., "1-4"
  focus: z.string(),
  weeklyTemplate: z.record(z.string(), DayTemplateSchema).optional(),
  volumeGuidance: z.string().optional(),
  keyWorkouts: z.array(z.string()).optional(),
  notes: z.string().optional()
});

// Main program schema
const ProgramSchema = z.object({
  name: z.string(),
  description: z.string(),
  totalWeeks: z.number(),
  methodology: z.string().optional(),
  weeklySchedule: z.object({
    sessionsPerWeek: z.number(),
    restDays: z.array(z.number()).optional() // 0=Monday, 6=Sunday
  }).optional(),
  phases: z.array(PhaseSchema),
  notes: z.string().optional()
});

export type ParsedProgram = z.infer<typeof ProgramSchema>;
export type ParsedPhase = z.infer<typeof PhaseSchema>;
export type ParsedWorkout = z.infer<typeof WorkoutSchema>;
export type ParsedWorkoutSegment = z.infer<typeof WorkoutSegmentSchema>;

// Result type for parsing
export type ParseResult = {
  success: boolean;
  program?: ParsedProgram;
  error?: string;
  rawJson?: unknown;
};

/**
 * Extract JSON from AI response text
 */
function extractJsonFromText(text: string): string | null {
  // Try to find JSON in code blocks first
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to find raw JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  return null;
}

/**
 * Parse AI output and extract structured program data
 */
export function parseAIProgram(aiOutput: string): ParseResult {
  try {
    // Extract JSON from the response
    const jsonString = extractJsonFromText(aiOutput);
    if (!jsonString) {
      return {
        success: false,
        error: 'No JSON found in AI response'
      };
    }

    // Parse JSON
    let rawJson: unknown;
    try {
      rawJson = JSON.parse(jsonString);
    } catch {
      return {
        success: false,
        error: 'Invalid JSON in AI response',
        rawJson: jsonString
      };
    }

    // Validate against schema
    const parseResult = ProgramSchema.safeParse(rawJson);
    if (!parseResult.success) {
      return {
        success: false,
        error: `Validation error: ${parseResult.error.message}`,
        rawJson
      };
    }

    return {
      success: true,
      program: parseResult.data,
      rawJson
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error'
    };
  }
}

/**
 * Parse a single workout from AI output
 */
export function parseAIWorkout(aiOutput: string): {
  success: boolean;
  workout?: ParsedWorkout;
  error?: string;
} {
  try {
    const jsonString = extractJsonFromText(aiOutput);
    if (!jsonString) {
      return { success: false, error: 'No JSON found' };
    }

    const rawJson = JSON.parse(jsonString);
    const parseResult = WorkoutSchema.safeParse(rawJson);

    if (!parseResult.success) {
      return {
        success: false,
        error: `Validation error: ${parseResult.error.message}`
      };
    }

    return { success: true, workout: parseResult.data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Valid enum values from Prisma schema
type PeriodPhase = 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' | 'RECOVERY' | 'TRANSITION';
type WorkoutType = 'RUNNING' | 'STRENGTH' | 'PLYOMETRIC' | 'CORE' | 'RECOVERY' | 'CYCLING' | 'SKIING' | 'SWIMMING' | 'TRIATHLON' | 'HYROX' | 'ALTERNATIVE' | 'OTHER';
type WorkoutIntensity = 'RECOVERY' | 'EASY' | 'MODERATE' | 'THRESHOLD' | 'INTERVAL' | 'MAX';

/**
 * Map AI workout type to WorkoutType enum
 */
function mapToWorkoutType(type: string): WorkoutType {
  const normalized = type.toUpperCase().trim();

  // Direct matches
  if (['RUNNING', 'STRENGTH', 'PLYOMETRIC', 'CORE', 'RECOVERY', 'CYCLING', 'SKIING', 'SWIMMING', 'TRIATHLON', 'HYROX', 'ALTERNATIVE', 'OTHER'].includes(normalized)) {
    return normalized as WorkoutType;
  }

  // Map common variations
  if (normalized === 'REST') return 'RECOVERY';
  if (normalized === 'CROSS_TRAINING') return 'ALTERNATIVE';

  return 'OTHER';
}

/**
 * Map AI intensity to WorkoutIntensity enum
 */
function mapToWorkoutIntensity(intensity?: string): WorkoutIntensity {
  if (!intensity) return 'EASY';

  const normalized = intensity.toLowerCase().trim();

  if (normalized === 'easy' || normalized === 'lätt') return 'EASY';
  if (normalized === 'moderate' || normalized === 'medel') return 'MODERATE';
  if (normalized === 'hard' || normalized === 'hård' || normalized === 'threshold') return 'THRESHOLD';
  if (normalized === 'race_pace' || normalized === 'interval' || normalized === 'intervall') return 'INTERVAL';
  if (normalized === 'recovery' || normalized === 'vila' || normalized === 'återhämtning') return 'RECOVERY';
  if (normalized === 'max' || normalized === 'maximal') return 'MAX';
  // Additional mappings for enhanced schema
  if (normalized === 'tempo') return 'THRESHOLD';
  if (normalized === 'easy_long') return 'EASY';
  if (normalized === 'steady') return 'MODERATE';

  return 'EASY';
}

/**
 * Map AI phase name to PeriodPhase enum
 */
function mapToPeriodPhase(phaseName: string): PeriodPhase {
  const normalized = phaseName.toUpperCase().trim();

  // Direct matches
  if (['BASE', 'BUILD', 'PEAK', 'TAPER', 'RECOVERY', 'TRANSITION'].includes(normalized)) {
    return normalized as PeriodPhase;
  }

  // Common variations
  if (normalized.includes('BAS') || normalized.includes('GRUND') || normalized.includes('AEROB')) {
    return 'BASE';
  }
  if (normalized.includes('BYGG') || normalized.includes('BUILD') || normalized.includes('UTVECKL')) {
    return 'BUILD';
  }
  if (normalized.includes('PEAK') || normalized.includes('TOPP') || normalized.includes('SPECIFIC') || normalized.includes('TÄVLING')) {
    return 'PEAK';
  }
  if (normalized.includes('TAPER') || normalized.includes('NEDTRAPP') || normalized.includes('VILA')) {
    return 'TAPER';
  }
  if (normalized.includes('RECOVER') || normalized.includes('ÅTERHÄMT')) {
    return 'RECOVERY';
  }
  if (normalized.includes('TRANS') || normalized.includes('OFF')) {
    return 'TRANSITION';
  }

  // Default to BASE
  return 'BASE';
}

/**
 * Convert parsed program to database-ready format
 */
export function convertToDbFormat(
  program: ParsedProgram,
  clientId: string,
  coachId: string,
  customStartDate?: Date
): {
  programData: {
    name: string;
    description?: string;
    clientId: string;
    coachId: string;
    startDate: Date;
    endDate: Date;
    goalType?: string;
  };
  weeksData: Array<{
    weekNumber: number;
    startDate: Date;
    endDate: Date;
    phase: PeriodPhase;
    focus?: string;
    notes?: string;
    daysData: Array<{
      dayNumber: number; // 1=Monday, 7=Sunday
      date: Date;
      plannedWorkouts: Array<{
        name: string;
        type: WorkoutType;
        intensity: WorkoutIntensity;
        duration?: number;
        distance?: number;
        description?: string;
        instructions?: string;
        segments?: DbSegment[];
      }>;
    }>;
  }>;
} {
  const startDate = customStartDate ? new Date(customStartDate) : new Date();
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + program.totalWeeks * 7 - 1);

  // Parse phases to generate weeks
  const weeksData = generateWeeksFromPhases(program.phases, program.totalWeeks, startDate);

  return {
    programData: {
      name: program.name,
      description: program.description,
      clientId,
      coachId,
      startDate,
      endDate,
      goalType: program.methodology || undefined,
    },
    weeksData
  };
}

/**
 * Generate week data from phases
 */
function generateWeeksFromPhases(
  phases: ParsedPhase[],
  totalWeeks: number,
  programStartDate: Date
): Array<{
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  phase: PeriodPhase;
  focus?: string;
  notes?: string;
  daysData: Array<{
    dayNumber: number;
    date: Date;
    plannedWorkouts: Array<{
      name: string;
      type: WorkoutType;
      intensity: WorkoutIntensity;
      duration?: number;
      distance?: number;
      description?: string;
      instructions?: string;
      segments?: DbSegment[];
    }>;
  }>;
}> {
  const weeks: Array<{
    weekNumber: number;
    startDate: Date;
    endDate: Date;
    phase: PeriodPhase;
    focus?: string;
    notes?: string;
    daysData: Array<{
      dayNumber: number;
      date: Date;
      plannedWorkouts: Array<{
        name: string;
        type: WorkoutType;
        intensity: WorkoutIntensity;
        duration?: number;
        distance?: number;
        description?: string;
        instructions?: string;
        segments?: DbSegment[];
      }>;
    }>;
  }> = [];

  for (let weekNum = 1; weekNum <= totalWeeks; weekNum++) {
    // Find which phase this week belongs to
    const phase = findPhaseForWeek(phases, weekNum);
    const template = phase?.weeklyTemplate;

    // Calculate week start and end dates
    const weekStartDate = new Date(programStartDate);
    weekStartDate.setDate(weekStartDate.getDate() + (weekNum - 1) * 7);

    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);

    // Generate days for this week
    const daysData = generateDaysFromTemplate(template, weekStartDate);

    weeks.push({
      weekNumber: weekNum,
      startDate: weekStartDate,
      endDate: weekEndDate,
      phase: mapToPeriodPhase(phase?.name || 'Base'),
      focus: phase?.focus,
      notes: phase?.volumeGuidance,
      daysData
    });
  }

  return weeks;
}

/**
 * Find which phase a week belongs to
 */
function findPhaseForWeek(phases: ParsedPhase[], weekNumber: number): ParsedPhase | undefined {
  for (const phase of phases) {
    const [start, end] = phase.weeks.split('-').map(Number);
    if (weekNumber >= start && weekNumber <= end) {
      return phase;
    }
  }
  return phases[phases.length - 1]; // Default to last phase
}

// Detailed segment type for database
interface DbSegment {
  order: number;
  type: string;
  duration?: number;
  distance?: number;
  pace?: string;
  zone?: number;
  heartRate?: string;
  power?: number;
  reps?: number;
  sets?: number;
  repsCount?: string;
  weight?: string;
  tempo?: string;
  rest?: number;
  description?: string;
  notes?: string;
}

/**
 * Convert AI segments to database-ready format
 */
function convertSegmentsToDbFormat(workout: ParsedWorkout): DbSegment[] {
  // If workout has detailed segments, use them directly
  if (workout.segments && workout.segments.length > 0) {
    return workout.segments.map((seg) => ({
      order: seg.order,
      type: seg.type,
      duration: seg.duration,
      distance: seg.distance,
      pace: seg.pace,
      zone: seg.zone,
      heartRate: seg.heartRate,
      power: seg.power,
      reps: seg.reps,
      sets: seg.sets,
      repsCount: seg.repsCount,
      weight: seg.weight,
      tempo: seg.tempo,
      rest: seg.rest,
      description: seg.description,
      notes: seg.notes,
    }));
  }

  // Convert legacy intervals to segments
  if (workout.intervals && workout.intervals.length > 0) {
    const segments: DbSegment[] = [];
    let order = 1;

    // Add warmup segment
    segments.push({
      order: order++,
      type: 'warmup',
      duration: 15,
      zone: 1,
      description: 'Uppvärmning',
    });

    // Add interval segments
    workout.intervals.forEach((interval, idx) => {
      // Work segment
      segments.push({
        order: order++,
        type: 'interval',
        duration: interval.workDuration / 60, // Convert seconds to minutes
        zone: parseInt(interval.workIntensity) || 4,
        reps: interval.repetitions,
        description: `Intervall ${idx + 1}`,
      });

      // Rest segment (if not last)
      if (idx < workout.intervals!.length - 1) {
        segments.push({
          order: order++,
          type: 'rest',
          duration: interval.restDuration / 60,
          zone: 1,
          description: 'Vila',
        });
      }
    });

    // Add cooldown segment
    segments.push({
      order: order++,
      type: 'cooldown',
      duration: 10,
      zone: 1,
      description: 'Nedvarvning',
    });

    return segments;
  }

  // Create a simple work segment from the workout details
  const segments: DbSegment[] = [];

  // For running/cycling workouts, add warmup-work-cooldown structure
  if (['RUNNING', 'CYCLING', 'SWIMMING', 'SKIING'].includes(workout.type)) {
    // Warmup
    segments.push({
      order: 1,
      type: 'warmup',
      duration: 10,
      zone: 1,
      pace: undefined,
      description: 'Uppvärmning',
    });

    // Main work
    const mainDuration = (workout.duration || 45) - 20; // Subtract warmup/cooldown time
    segments.push({
      order: 2,
      type: 'work',
      duration: mainDuration > 0 ? mainDuration : 25,
      distance: workout.distance,
      pace: workout.targetPace,
      zone: typeof workout.zone === 'number' ? workout.zone : parseInt(String(workout.zone)) || undefined,
      heartRate: workout.targetHR,
      power: workout.targetPower,
      description: workout.description,
    });

    // Cooldown
    segments.push({
      order: 3,
      type: 'cooldown',
      duration: 10,
      zone: 1,
      description: 'Nedvarvning',
    });
  } else {
    // For strength/other workouts, single work segment
    segments.push({
      order: 1,
      type: 'work',
      duration: workout.duration,
      description: workout.description,
    });
  }

  return segments;
}

/**
 * Generate days from weekly template
 */
function generateDaysFromTemplate(
  template?: Record<string, z.infer<typeof DayTemplateSchema>>,
  weekStartDate?: Date
): Array<{
  dayNumber: number;
  date: Date;
  plannedWorkouts: Array<{
    name: string;
    type: WorkoutType;
    intensity: WorkoutIntensity;
    duration?: number;
    distance?: number;
    description?: string;
    instructions?: string;
    segments?: DbSegment[];
  }>;
}> {
  const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const baseDate = weekStartDate || new Date();
  const days: Array<{
    dayNumber: number;
    date: Date;
    plannedWorkouts: Array<{
      name: string;
      type: WorkoutType;
      intensity: WorkoutIntensity;
      duration?: number;
      distance?: number;
      description?: string;
      instructions?: string;
      segments?: DbSegment[];
    }>;
  }> = [];

  for (let i = 0; i < 7; i++) {
    const dayName = dayNames[i];
    const dayTemplate = template?.[dayName];

    // Calculate date for this day
    const dayDate = new Date(baseDate);
    dayDate.setDate(dayDate.getDate() + i);

    if (!dayTemplate || dayTemplate.type === 'REST') {
      // Rest day - no workouts
      days.push({
        dayNumber: i + 1, // 1-7 instead of 0-6
        date: dayDate,
        plannedWorkouts: []
      });
    } else {
      const workout = dayTemplate as ParsedWorkout;
      const segments = convertSegmentsToDbFormat(workout);

      days.push({
        dayNumber: i + 1, // 1-7 instead of 0-6
        date: dayDate,
        plannedWorkouts: [{
          name: workout.name || workout.type,
          type: mapToWorkoutType(workout.type),
          intensity: mapToWorkoutIntensity(workout.intensity),
          duration: workout.duration,
          distance: workout.distance,
          description: workout.description,
          instructions: workout.notes,
          segments: segments.length > 0 ? segments : undefined
        }]
      });
    }
  }

  return days;
}

/**
 * Validate that a program has minimum required content
 */
export function validateProgramCompleteness(program: ParsedProgram): {
  valid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check basic fields
  if (!program.name || program.name.length < 3) {
    errors.push('Program name is too short');
  }

  if (program.totalWeeks < 1 || program.totalWeeks > 52) {
    errors.push('Program weeks must be between 1 and 52');
  }

  if (!program.phases || program.phases.length === 0) {
    errors.push('Program must have at least one phase');
  }

  // Check phases
  for (const phase of program.phases) {
    if (!phase.weeklyTemplate) {
      warnings.push(`Phase "${phase.name}" has no weekly template`);
    }

    // Check week ranges
    const [start, end] = phase.weeks.split('-').map(Number);
    if (isNaN(start) || isNaN(end)) {
      errors.push(`Invalid week range "${phase.weeks}" in phase "${phase.name}"`);
    }
  }

  // Check for training balance
  const hasRestDays = program.phases.some(p =>
    p.weeklyTemplate && Object.values(p.weeklyTemplate).some(d => d.type === 'REST')
  );
  if (!hasRestDays) {
    warnings.push('Consider adding rest days for recovery');
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors
  };
}

/**
 * Extract program metadata without full parsing
 */
export function extractProgramMetadata(aiOutput: string): {
  name?: string;
  weeks?: number;
  methodology?: string;
  phases?: string[];
} | null {
  try {
    const jsonString = extractJsonFromText(aiOutput);
    if (!jsonString) return null;

    const rawJson = JSON.parse(jsonString);
    return {
      name: rawJson.name,
      weeks: rawJson.totalWeeks,
      methodology: rawJson.methodology,
      phases: rawJson.phases?.map((p: { name: string }) => p.name)
    };
  } catch {
    return null;
  }
}
