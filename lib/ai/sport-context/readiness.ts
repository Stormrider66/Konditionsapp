import type { DailyCheckIn } from './types'

type SportContextLocale = 'en' | 'sv'

function t(locale: SportContextLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

/**
 * Build readiness context from recent check-ins
 */
export function buildReadinessContext(checkIns: DailyCheckIn[], locale: SportContextLocale = 'en'): string {
  if (!checkIns || checkIns.length === 0) return '';

  const recent = checkIns.slice(0, 7);
  const avgSleep = recent.reduce((sum, c) => sum + (c.sleepQuality || 0), 0) / recent.length;
  const avgFatigue = recent.reduce((sum, c) => sum + (c.fatigue || 0), 0) / recent.length;
  const avgSoreness = recent.reduce((sum, c) => sum + (c.soreness || 0), 0) / recent.length;

  let context = `\n### ${t(locale, 'Current training readiness (last 7 days)', 'Aktuell träningsberedskap (senaste 7 dagarna)')}\n`;
  context += `- **${t(locale, 'Sleep quality', 'Sömnkvalitet')}**: ${avgSleep.toFixed(1)}/10\n`;
  context += `- **${t(locale, 'Fatigue', 'Trötthet')}**: ${avgFatigue.toFixed(1)}/10\n`;
  context += `- **${t(locale, 'Muscle soreness', 'Muskelömhet')}**: ${avgSoreness.toFixed(1)}/10\n`;

  // Readiness score
  const readiness = (avgSleep * 0.4) + ((10 - avgFatigue) * 0.3) + ((10 - avgSoreness) * 0.3);
  context += `- **${t(locale, 'Readiness score', 'Beredskapspoäng')}**: ${readiness.toFixed(1)}/10`;

  if (readiness < 5) context += ` (${t(locale, 'Rest recommended', 'Vila rekommenderas')})`;
  else if (readiness < 7) context += ` (${t(locale, 'Light training', 'Lätt träning')})`;
  else context += ` (${t(locale, 'Normal training', 'Normal träning')})`;

  context += '\n';

  return context;
}
