/**
 * Theme Definitions
 *
 * Color schemes and styling for FITAPP Dark and Minimalist White themes.
 */

import type { WorkoutTheme, ThemeId } from './types';

export const FITAPP_DARK_THEME: WorkoutTheme = {
  id: 'FITAPP_DARK',
  name: 'FITAPP Dark',
  nameSv: 'FITAPP Mörk',
  colors: {
    // Backgrounds
    background: '#1a1a2e',
    backgroundCard: '#16213e',
    backgroundAccent: '#0f3460',

    // Text
    textPrimary: '#ffffff',
    textSecondary: '#a0aec0',
    textMuted: '#718096',

    // Brand/Accent
    accent: '#e94560',
    accentHover: '#d63b55',
    accentText: '#ffffff',

    // Status colors
    success: '#48bb78',
    warning: '#f6ad55',
    error: '#fc8181',

    // Borders
    border: '#2d3748',
    borderStrong: '#4a5568',

    // Exercise-specific
    exerciseNumber: '#e94560',
    exerciseNumberText: '#ffffff',
    setsReps: '#48bb78',
    restTime: '#4fd1c5',

    // Section colors
    warmup: '#27ae60',
    warmupText: '#ffffff',
    strength: '#e74c3c',
    strengthText: '#ffffff',
    metcon: '#e94560',
    metconText: '#ffffff',
    cooldown: '#3498db',
    cooldownText: '#ffffff',
  },
  typography: {
    fontFamily: "'Inter', 'Helvetica', sans-serif",
    headingWeight: 700,
    bodyWeight: 400,
  },
  spacing: {
    cardPadding: '16px',
    sectionGap: '12px',
  },
  borderRadius: {
    card: '12px',
    button: '8px',
    badge: '6px',
  },
};

export const MINIMALIST_WHITE_THEME: WorkoutTheme = {
  id: 'MINIMALIST_WHITE',
  name: 'Minimalist White',
  nameSv: 'Minimalistisk Vit',
  colors: {
    // Backgrounds
    background: '#ffffff',
    backgroundCard: '#fafafa',
    backgroundAccent: '#f5f5f5',

    // Text
    textPrimary: '#1a1a1a',
    textSecondary: '#4a4a4a',
    textMuted: '#9ca3af',

    // Brand/Accent
    accent: '#1a1a1a',
    accentHover: '#333333',
    accentText: '#ffffff',

    // Status colors
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',

    // Borders
    border: '#e5e7eb',
    borderStrong: '#d1d5db',

    // Exercise-specific
    exerciseNumber: '#1a1a1a',
    exerciseNumberText: '#ffffff',
    setsReps: '#1a1a1a',
    restTime: '#6b7280',

    // Section colors
    warmup: '#22c55e',
    warmupText: '#ffffff',
    strength: '#ef4444',
    strengthText: '#ffffff',
    metcon: '#1a1a1a',
    metconText: '#ffffff',
    cooldown: '#3b82f6',
    cooldownText: '#ffffff',
  },
  typography: {
    fontFamily: "'Inter', 'Helvetica', sans-serif",
    headingWeight: 600,
    bodyWeight: 400,
  },
  spacing: {
    cardPadding: '20px',
    sectionGap: '16px',
  },
  borderRadius: {
    card: '8px',
    button: '6px',
    badge: '4px',
  },
};

// Theme registry
export const THEMES: Record<ThemeId, WorkoutTheme> = {
  FITAPP_DARK: FITAPP_DARK_THEME,
  MINIMALIST_WHITE: MINIMALIST_WHITE_THEME,
};

// Get theme by ID with fallback
export function getTheme(themeId: ThemeId | undefined | null): WorkoutTheme {
  return THEMES[themeId || 'MINIMALIST_WHITE'] || MINIMALIST_WHITE_THEME;
}
