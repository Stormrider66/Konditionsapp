export type {
  LiveVoiceSessionConfig,
  WorkoutContextForLive,
  LiveSegmentInfo,
  StrengthWorkoutContextForLive,
  StrengthExerciseForLive,
  LiveToolName,
  LiveSessionEndReport,
  LiveWorkoutStatus,
  LiveExerciseStatus,
  LiveCoachingToolCallbacks,
  LiveVoiceStatus,
} from './types'

export { buildLiveCoachingSystemInstruction, buildStrengthCoachingSystemInstruction } from './system-prompt'
export { CARDIO_COACHING_TOOLS, STRENGTH_COACHING_TOOLS, LIVE_COACHING_TOOLS } from './tools'
