/**
 * Ad-Hoc Workout Logging System
 *
 * Central export for all ad-hoc workout functionality.
 */

// Types
export * from './types'

// Prompts
export {
  buildTextParsingPrompt,
  buildImageParsingPrompt,
  buildVoiceParsingPrompt,
  buildTranscriptionPrompt,
  mapStravaType,
  mapGarminType,
} from './prompts'

// Exercise Matcher
export {
  getExerciseLibrary,
  matchExercise,
  matchExercises,
  getExerciseSuggestions,
  clearExerciseCache,
} from './exercise-matcher'

// Parser
export {
  parseWorkoutFromText,
  parseWorkoutFromImage,
  parseWorkoutFromVoice,
  parseWorkoutFromStrava,
  parseWorkoutFromGarmin,
  getParserConfigForAthlete,
  getApiKeyForCoach,
  createParserConfigWithKey,
} from './parser'
