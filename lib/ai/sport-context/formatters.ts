import type { ActivityLevel } from '../nutrition-calculator'

export function formatSecondsToTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Translate activity level to Swedish
 */
export function translateActivityLevel(level: ActivityLevel): string {
  const translations: Record<ActivityLevel, string> = {
    SEDENTARY: 'Stillasittande',
    LIGHT: 'Lätt aktivitet (1-3 dagar/vecka)',
    MODERATE: 'Måttlig aktivitet (3-5 dagar/vecka)',
    ACTIVE: 'Aktiv (6-7 dagar/vecka)',
    VERY_ACTIVE: 'Mycket aktiv (hård träning + fysiskt arbete)',
    ATHLETE: 'Elitidrottare (2+ pass/dag)',
  };
  return translations[level] || level;
}

/**
 * Translate foot strike pattern to Swedish
 */
export function translateFootStrike(pattern: string): string {
  const translations: Record<string, string> = {
    'HEEL_STRIKE': 'Hälisättning',
    'MIDFOOT': 'Mellanfotisättning',
    'FOREFOOT': 'Framfotisättning',
    'heel': 'Hälisättning',
    'midfoot': 'Mellanfotisättning',
    'forefoot': 'Framfotisättning',
  };
  return translations[pattern] || pattern;
}

/**
 * Translate injury risk level to Swedish
 */
export function translateRiskLevel(level: string): string {
  const translations: Record<string, string> = {
    'HIGH': 'Hög',
    'MODERATE': 'Måttlig',
    'LOW': 'Låg',
    'MINIMAL': 'Minimal',
  };
  return translations[level] || level;
}

/**
 * Translate camera angle to Swedish
 */
export function translateCameraAngle(angle: string | null): string {
  if (!angle) return '';
  const translations: Record<string, string> = {
    'FRONT': 'Framifrån',
    'SIDE': 'Från sidan',
    'BACK': 'Bakifrån',
  };
  return translations[angle] || angle;
}

/**
 * Get view-specific metrics label for context
 */
export function getViewSpecificMetricsLabel(angle: string): string {
  switch (angle) {
    case 'FRONT':
      return `*Frontalplansanalys - fokus på: armsving, symmetri, knäspårning, höftfall*\n`;
    case 'SIDE':
      return `*Sagittalplansanalys - fokus på: fotisättning, lutning, oscillation, höftextension*\n`;
    case 'BACK':
      return `*Posterior analys - fokus på: höftfall, hälpiska, gluteal aktivering, spinal position*\n`;
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
