/**
 * Theme System Types
 *
 * Type definitions for the workout theme system.
 * Supports independent app and PDF theme selections.
 */

// Available theme identifiers
export type ThemeId = 'FITAPP_DARK' | 'MINIMALIST_WHITE';

// Core theme configuration
export interface WorkoutTheme {
  id: ThemeId;
  name: string;
  nameSv: string;

  // Color tokens
  colors: {
    // Backgrounds
    background: string;
    backgroundCard: string;
    backgroundAccent: string;

    // Text
    textPrimary: string;
    textSecondary: string;
    textMuted: string;

    // Brand/Accent
    accent: string;
    accentHover: string;
    accentText: string;

    // Status colors
    success: string;
    warning: string;
    error: string;

    // Borders
    border: string;
    borderStrong: string;

    // Exercise-specific
    exerciseNumber: string;
    exerciseNumberText: string;
    setsReps: string;
    restTime: string;

    // Section colors (for workout sections)
    warmup: string;
    warmupText: string;
    strength: string;
    strengthText: string;
    metcon: string;
    metconText: string;
    cooldown: string;
    cooldownText: string;
  };

  // Typography
  typography: {
    fontFamily: string;
    headingWeight: number;
    bodyWeight: number;
  };

  // Spacing
  spacing: {
    cardPadding: string;
    sectionGap: string;
  };

  // Border radius
  borderRadius: {
    card: string;
    button: string;
    badge: string;
  };
}

// Theme preferences stored in database (SportProfile.themePreferences)
export interface ThemePreferences {
  appTheme: ThemeId;
  pdfTheme: ThemeId;
}

// Default theme preferences
export const DEFAULT_THEME_PREFERENCES: ThemePreferences = {
  appTheme: 'MINIMALIST_WHITE',
  pdfTheme: 'MINIMALIST_WHITE',
};

// List of available themes for UI display
export const AVAILABLE_THEMES: ThemeId[] = ['FITAPP_DARK', 'MINIMALIST_WHITE'];
