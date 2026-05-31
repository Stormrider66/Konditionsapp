import type { ActivityLevel } from '../nutrition-calculator'

export function formatSecondsToTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Translate activity level for AI context.
 */
export function translateActivityLevel(level: ActivityLevel, locale: 'en' | 'sv' = 'en'): string {
  const translations: Record<ActivityLevel, { en: string; sv: string }> = {
    SEDENTARY: { en: 'Sedentary', sv: 'Stillasittande' },
    LIGHT: { en: 'Light activity (1-3 days/week)', sv: 'Lätt aktivitet (1-3 dagar/vecka)' },
    MODERATE: { en: 'Moderate activity (3-5 days/week)', sv: 'Måttlig aktivitet (3-5 dagar/vecka)' },
    ACTIVE: { en: 'Active (6-7 days/week)', sv: 'Aktiv (6-7 dagar/vecka)' },
    VERY_ACTIVE: { en: 'Very active (hard training + physical work)', sv: 'Mycket aktiv (hård träning + fysiskt arbete)' },
    ATHLETE: { en: 'Elite athlete (2+ sessions/day)', sv: 'Elitidrottare (2+ pass/dag)' },
  };
  return translations[level]?.[locale] || level;
}

type SportContextLocale = 'en' | 'sv'

/**
 * Translate foot strike pattern for AI context.
 */
export function translateFootStrike(pattern: string, locale: SportContextLocale = 'en'): string {
  const translations: Record<string, { en: string; sv: string }> = {
    'HEEL_STRIKE': { en: 'Heel strike', sv: 'Hälisättning' },
    'MIDFOOT': { en: 'Midfoot strike', sv: 'Mellanfotisättning' },
    'FOREFOOT': { en: 'Forefoot strike', sv: 'Framfotisättning' },
    'heel': { en: 'Heel strike', sv: 'Hälisättning' },
    'midfoot': { en: 'Midfoot strike', sv: 'Mellanfotisättning' },
    'forefoot': { en: 'Forefoot strike', sv: 'Framfotisättning' },
  };
  return translations[pattern]?.[locale] || pattern;
}

/**
 * Translate injury risk level for AI context.
 */
export function translateRiskLevel(level: string, locale: SportContextLocale = 'en'): string {
  const translations: Record<string, { en: string; sv: string }> = {
    'HIGH': { en: 'High', sv: 'Hög' },
    'MODERATE': { en: 'Moderate', sv: 'Måttlig' },
    'LOW': { en: 'Low', sv: 'Låg' },
    'MINIMAL': { en: 'Minimal', sv: 'Minimal' },
  };
  return translations[level]?.[locale] || level;
}

/**
 * Translate camera angle for AI context.
 */
export function translateCameraAngle(angle: string | null, locale: SportContextLocale = 'en'): string {
  if (!angle) return '';
  const translations: Record<string, { en: string; sv: string }> = {
    'FRONT': { en: 'Front view', sv: 'Framifrån' },
    'SIDE': { en: 'Side view', sv: 'Från sidan' },
    'BACK': { en: 'Back view', sv: 'Bakifrån' },
  };
  return translations[angle]?.[locale] || angle;
}

/**
 * Get view-specific metrics label for context
 */
export function getViewSpecificMetricsLabel(angle: string, locale: SportContextLocale = 'en'): string {
  switch (angle) {
    case 'FRONT':
      return locale === 'sv'
        ? `*Frontalplansanalys - fokus på: armsving, symmetri, knäspårning, höftfall*\n`
        : `*Frontal-plane analysis - focus on: arm swing, symmetry, knee tracking, hip drop*\n`;
    case 'SIDE':
      return locale === 'sv'
        ? `*Sagittalplansanalys - fokus på: fotisättning, lutning, oscillation, höftextension*\n`
        : `*Sagittal-plane analysis - focus on: foot strike, lean, oscillation, hip extension*\n`;
    case 'BACK':
      return locale === 'sv'
        ? `*Posterior analys - fokus på: höftfall, hälpiska, gluteal aktivering, spinal position*\n`
        : `*Posterior analysis - focus on: hip drop, heel whip, glute activation, spinal position*\n`;
    default:
      return '';
  }
}

// Helper functions
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatSwimTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatStationName(station: string): string {
  const names: Record<string, string> = {
    skiErg: 'SkiErg',
    sledPush: 'Sled Push',
    sledPull: 'Sled Pull',
    burpeeBroadJump: 'Burpee Broad Jump',
    rowing: 'Rowing',
    farmersCarry: 'Farmers Carry',
    lunges: 'Lunges',
    wallBalls: 'Wall Balls',
  };
  return names[station] || station;
}
