/**
 * Live Voice Coaching Tool Declarations
 *
 * Function calling tools available to the Live API model during workout coaching.
 * These are locked into the ephemeral token and executed client-side.
 */

import { Type, type FunctionDeclaration } from '@google/genai'

export const LIVE_COACHING_TOOLS: FunctionDeclaration[] = [
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
    name: 'pause_workout',
    description: 'Pause the workout timer',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'resume_workout',
    description: 'Resume the workout timer after a pause',
    parameters: {
      type: Type.OBJECT,
      properties: {},
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
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'get_current_status',
    description:
      'Get the current workout status including segment info, time remaining, and progress',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'get_heart_rate',
    description:
      "Get the athlete's current heart rate and zone from their HR monitor",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'adjust_intensity',
    description:
      "Note that the athlete wants to adjust their workout intensity. This doesn't change the plan but records their preference.",
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
