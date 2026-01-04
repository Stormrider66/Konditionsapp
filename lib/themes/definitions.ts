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
    background: '#f8fafc', // Slate-50 - softer than pure white
    backgroundCard: '#ffffff',
    backgroundAccent: '#f1f5f9', // Slate-100

    // Text
    textPrimary: '#0f172a', // Slate-900
    textSecondary: '#334155', // Slate-700 (Darker for better contrast)
    textMuted: '#64748b', // Slate-500 (Darker for better contrast)

    // Brand/Accent
    accent: '#ea580c', // Orange-600 (matching the brand orange used in dark mode)
    accentHover: '#c2410c', // Orange-700
    accentText: '#ffffff',

    // Status colors
    success: '#10b981', // Emerald-500
    warning: '#f59e0b', // Amber-500
    error: '#ef4444', // Red-500

    // Borders
    border: '#e2e8f0', // Slate-200
    borderStrong: '#cbd5e1', // Slate-300

    // Exercise-specific
    exerciseNumber: '#ea580c',
    exerciseNumberText: '#ffffff',
    setsReps: '#0f172a',
    restTime: '#64748b',

    // Section colors
    warmup: '#10b981',
    warmupText: '#ffffff',
    strength: '#ef4444',
    strengthText: '#ffffff',
    metcon: '#ea580c',
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
