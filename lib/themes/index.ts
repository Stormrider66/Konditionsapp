/**
 * Theme System Exports
 *
 * Central export point for the workout theme system.
 */

// Types
export type { ThemeId, ThemePreferences, WorkoutTheme } from './types';
export { DEFAULT_THEME_PREFERENCES, AVAILABLE_THEMES } from './types';

// Theme definitions
export { THEMES, FITAPP_DARK_THEME, MINIMALIST_WHITE_THEME, getTheme } from './definitions';

// Utilities
export {
  themeToCssVars,
  applyThemeToElement,
  getThemeStyles,
  getThemeColor,
  hexToRgb,
  getPdfColors,
} from './theme-utils';

// React context
export {
  WorkoutThemeProvider,
  useWorkoutTheme,
  useWorkoutThemeOptional,
  getThemeById,
} from './ThemeProvider';
