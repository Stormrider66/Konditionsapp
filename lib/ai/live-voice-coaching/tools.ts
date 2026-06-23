/**
 * Live Voice Coaching Tool Declarations
 *
 * Function calling tools available to the Live API model during workout coaching.
 * Split into shared, cardio-specific, and strength-specific tools.
 * These are locked into the ephemeral token and executed client-side.
 */

import { Type, type FunctionDeclaration } from '@google/genai'

// ─── Shared Tools (all workout types) ───────────────────────────────────────

const SHARED_TOOLS: FunctionDeclaration[] = [
  {
    name: 'end_coaching',
    description: 'End the voice coaching session. Use when the athlete says "stop coaching", "end session", "that\'s it", or "I\'m done".',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'pause_workout',
    description: 'Pause the workout timer or rest timer',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'resume_workout',
    description: 'Resume the workout after a pause',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'get_current_status',
    description: 'Get the current workout status including progress and what exercise/segment is active',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'get_heart_rate',
    description: "Get the athlete's current heart rate and zone from their HR monitor",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'get_live_metrics',
    description:
      'Get live bike/erg metrics such as power, target power, average power, cadence/RPM, stroke rate, distance, calories, heart rate, and timer state.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'record_post_workout_debrief',
    description:
      'Record the athlete post-workout debrief after asking for RPE, pain/injury, and any notes. This only fills the confirmation form; it does not save the workout.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        sessionRpe: {
          type: Type.INTEGER,
          description: 'Session RPE from 1-10, if the athlete gave one.',
        },
        painMentioned: {
          type: Type.BOOLEAN,
          description: 'Whether the athlete reported pain, injury, or unusual discomfort.',
        },
        painDetails: {
          type: Type.STRING,
          description: 'Brief pain or injury details, if mentioned.',
        },
        notes: {
          type: Type.STRING,
          description: 'Short athlete notes about the workout, adjustments, or how it felt.',
        },
        mood: {
          type: Type.STRING,
          enum: ['positive', 'neutral', 'struggling', 'frustrated'],
          description: 'Observed athlete mood from the debrief.',
        },
      },
    },
  },
  {
    name: 'adjust_intensity',
    description: "Note that the athlete wants to adjust their workout intensity.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        direction: {
          type: Type.STRING,
          enum: ['easier', 'harder'],
          description: 'Whether the athlete wants easier or harder intensity',
        },
        note: {
          type: Type.STRING,
          description: 'Additional context from the athlete',
        },
      },
      required: ['direction'],
    },
  },
]

// ─── Cardio-Specific Tools ──────────────────────────────────────────────────

const CARDIO_TOOLS: FunctionDeclaration[] = [
  {
    name: 'skip_segment',
    description: 'Skip the current workout segment and move to the next one',
    parameters: {
      type: Type.OBJECT,
      properties: {
        reason: {
          type: Type.STRING,
          description: 'Brief reason the athlete wants to skip',
        },
      },
    },
  },
  {
    name: 'extend_segment',
    description: 'Add extra time to the current segment',
    parameters: {
      type: Type.OBJECT,
      properties: {
        seconds: {
          type: Type.INTEGER,
          description: 'Seconds to add. Defaults to 30 if not specified.',
        },
      },
    },
  },
  {
    name: 'mark_segment_complete',
    description: 'Mark the current segment as completed and advance to the next',
    parameters: { type: Type.OBJECT, properties: {} },
  },
]

// ─── Strength-Specific Tools ────────────────────────────────────────────────

const STRENGTH_TOOLS: FunctionDeclaration[] = [
  {
    name: 'log_set',
    description:
      'Log a completed set with weight and reps. Use when the athlete reports finishing a set, e.g. "80 kilos, 8 reps" or "done, same weight".',
    parameters: {
      type: Type.OBJECT,
      properties: {
        weight: {
          type: Type.NUMBER,
          description: 'Weight lifted in kg',
        },
        reps: {
          type: Type.INTEGER,
          description: 'Number of reps completed',
        },
        rpe: {
          type: Type.INTEGER,
          description: 'Rate of perceived exertion (1-10), if the athlete mentions it',
        },
      },
      required: ['weight', 'reps'],
    },
  },
  {
    name: 'get_exercise_status',
    description: 'Get current exercise info: name, sets done/remaining, target weight and reps',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'skip_exercise',
    description: 'Skip the current exercise and move to the next one',
    parameters: {
      type: Type.OBJECT,
      properties: {
        reason: {
          type: Type.STRING,
          description: 'Brief reason for skipping',
        },
      },
    },
  },
  {
    name: 'complete_exercise',
    description: 'Mark the current exercise as done and advance to the next exercise',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'start_rest_timer',
    description: 'Start the rest timer between sets',
    parameters: {
      type: Type.OBJECT,
      properties: {
        seconds: {
          type: Type.INTEGER,
          description: 'Rest duration in seconds. Uses the exercise default if not specified.',
        },
      },
    },
  },
]

// ─── Hybrid-Specific Tools ───────────────────────────────────────────────────

const HYBRID_TOOLS: FunctionDeclaration[] = [
  {
    name: 'complete_round',
    description:
      'Mark the current round as complete. For AMRAP: increments round count. For FOR_TIME/CHIPPER: advances to next round.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        extraReps: {
          type: Type.INTEGER,
          description: 'Partial reps completed if the round was not fully finished (for AMRAP time cap)',
        },
      },
    },
  },
  {
    name: 'get_workout_timer',
    description: 'Get the current elapsed time, remaining time, and round count',
    parameters: { type: Type.OBJECT, properties: {} },
  },
]

// ─── Exported Tool Sets ─────────────────────────────────────────────────────

/** Tools for cardio workouts */
export const CARDIO_COACHING_TOOLS: FunctionDeclaration[] = [...SHARED_TOOLS, ...CARDIO_TOOLS]

/** Tools for strength workouts */
export const STRENGTH_COACHING_TOOLS: FunctionDeclaration[] = [...SHARED_TOOLS, ...STRENGTH_TOOLS]

/** Tools for hybrid workouts */
export const HYBRID_COACHING_TOOLS: FunctionDeclaration[] = [...SHARED_TOOLS, ...HYBRID_TOOLS]

/** All tools (for backward compatibility) */
export const LIVE_COACHING_TOOLS = CARDIO_COACHING_TOOLS
