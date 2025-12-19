/**
 * Theme Utilities
 *
 * CSS variable conversion and DOM helpers for theme application.
 */

import type { WorkoutTheme } from './types';

// CSS variable prefix
const VAR_PREFIX = '--wt';

/**
 * Convert a theme to CSS variables object
 */
export function themeToCssVars(theme: WorkoutTheme): Record<string, string> {
  return {
    // Backgrounds
    [`${VAR_PREFIX}-bg`]: theme.colors.background,
    [`${VAR_PREFIX}-bg-card`]: theme.colors.backgroundCard,
    [`${VAR_PREFIX}-bg-accent`]: theme.colors.backgroundAccent,

    // Text
    [`${VAR_PREFIX}-text-primary`]: theme.colors.textPrimary,
    [`${VAR_PREFIX}-text-secondary`]: theme.colors.textSecondary,
    [`${VAR_PREFIX}-text-muted`]: theme.colors.textMuted,

    // Accent
    [`${VAR_PREFIX}-accent`]: theme.colors.accent,
    [`${VAR_PREFIX}-accent-hover`]: theme.colors.accentHover,
    [`${VAR_PREFIX}-accent-text`]: theme.colors.accentText,

    // Status
    [`${VAR_PREFIX}-success`]: theme.colors.success,
    [`${VAR_PREFIX}-warning`]: theme.colors.warning,
    [`${VAR_PREFIX}-error`]: theme.colors.error,

    // Borders
    [`${VAR_PREFIX}-border`]: theme.colors.border,
    [`${VAR_PREFIX}-border-strong`]: theme.colors.borderStrong,

    // Exercise-specific
    [`${VAR_PREFIX}-exercise-num`]: theme.colors.exerciseNumber,
    [`${VAR_PREFIX}-exercise-num-text`]: theme.colors.exerciseNumberText,
    [`${VAR_PREFIX}-sets-reps`]: theme.colors.setsReps,
    [`${VAR_PREFIX}-rest-time`]: theme.colors.restTime,

    // Sections
    [`${VAR_PREFIX}-warmup`]: theme.colors.warmup,
    [`${VAR_PREFIX}-warmup-text`]: theme.colors.warmupText,
    [`${VAR_PREFIX}-strength`]: theme.colors.strength,
    [`${VAR_PREFIX}-strength-text`]: theme.colors.strengthText,
    [`${VAR_PREFIX}-metcon`]: theme.colors.metcon,
    [`${VAR_PREFIX}-metcon-text`]: theme.colors.metconText,
    [`${VAR_PREFIX}-cooldown`]: theme.colors.cooldown,
    [`${VAR_PREFIX}-cooldown-text`]: theme.colors.cooldownText,

    // Spacing & Radius
    [`${VAR_PREFIX}-radius-card`]: theme.borderRadius.card,
    [`${VAR_PREFIX}-radius-btn`]: theme.borderRadius.button,
    [`${VAR_PREFIX}-radius-badge`]: theme.borderRadius.badge,
    [`${VAR_PREFIX}-padding-card`]: theme.spacing.cardPadding,
    [`${VAR_PREFIX}-gap-section`]: theme.spacing.sectionGap,
  };
}

/**
 * Apply theme CSS variables to an element
 */
export function applyThemeToElement(element: HTMLElement, theme: WorkoutTheme): void {
  const vars = themeToCssVars(theme);
  Object.entries(vars).forEach(([key, value]) => {
    element.style.setProperty(key, value);
  });
}

/**
 * Generate inline style object from theme (for React components)
 */
export function getThemeStyles(theme: WorkoutTheme): React.CSSProperties {
  const vars = themeToCssVars(theme);
  const styles: Record<string, string> = {};
  Object.entries(vars).forEach(([key, value]) => {
    styles[key] = value;
  });
  return styles as React.CSSProperties;
}

/**
 * Get a single color from theme for inline use
 */
export function getThemeColor(theme: WorkoutTheme, colorKey: keyof WorkoutTheme['colors']): string {
  return theme.colors[colorKey];
}

/**
 * Convert hex color to RGB values (for PDF libraries that need RGB)
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Get PDF-friendly colors from theme (hex without #)
 */
export function getPdfColors(theme: WorkoutTheme): Record<string, string> {
  return {
    background: theme.colors.background.replace('#', ''),
    backgroundCard: theme.colors.backgroundCard.replace('#', ''),
    textPrimary: theme.colors.textPrimary.replace('#', ''),
    textSecondary: theme.colors.textSecondary.replace('#', ''),
    accent: theme.colors.accent.replace('#', ''),
    warmup: theme.colors.warmup.replace('#', ''),
    strength: theme.colors.strength.replace('#', ''),
    metcon: theme.colors.metcon.replace('#', ''),
    cooldown: theme.colors.cooldown.replace('#', ''),
    success: theme.colors.success.replace('#', ''),
    warning: theme.colors.warning.replace('#', ''),
    error: theme.colors.error.replace('#', ''),
    border: theme.colors.border.replace('#', ''),
  };
}
