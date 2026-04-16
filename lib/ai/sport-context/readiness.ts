import type { DailyCheckIn } from './types'

/**
 * Build readiness context from recent check-ins
 */
export function buildReadinessContext(checkIns: DailyCheckIn[]): string {
  if (!checkIns || checkIns.length === 0) return '';

  const recent = checkIns.slice(0, 7);
  const avgSleep = recent.reduce((sum, c) => sum + (c.sleepQuality || 0), 0) / recent.length;
  const avgFatigue = recent.reduce((sum, c) => sum + (c.fatigue || 0), 0) / recent.length;
  const avgSoreness = recent.reduce((sum, c) => sum + (c.soreness || 0), 0) / recent.length;

  let context = `\n### Aktuell träningsberedskap (senaste 7 dagarna)\n`;
  context += `- **Sömnkvalitet**: ${avgSleep.toFixed(1)}/10\n`;
  context += `- **Trötthet**: ${avgFatigue.toFixed(1)}/10\n`;
  context += `- **Muskelömhet**: ${avgSoreness.toFixed(1)}/10\n`;

  // Readiness score
  const readiness = (avgSleep * 0.4) + ((10 - avgFatigue) * 0.3) + ((10 - avgSoreness) * 0.3);
  context += `- **Beredskapspoäng**: ${readiness.toFixed(1)}/10`;

  if (readiness < 5) context += ' (Vila rekommenderas)';
  else if (readiness < 7) context += ' (Lätt träning)';
  else context += ' (Normal träning)';

  context += '\n';

  return context;
}
