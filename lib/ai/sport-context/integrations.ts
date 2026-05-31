import type { GarminMetricsData, StravaActivityData } from './types'

type SportContextLocale = 'en' | 'sv'

function dateLocale(locale: SportContextLocale): string {
  return locale === 'sv' ? 'sv-SE' : 'en-US'
}

function t(locale: SportContextLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

/**
 * Build Strava integration context (PRO tier only)
 *
 * Provides AI with recent training data from Strava for better analysis.
 */
export function buildStravaContext(activities: StravaActivityData[], locale: SportContextLocale = 'en'): string {
  if (!activities || activities.length === 0) return '';

  let context = `\n## ${t(locale, 'STRAVA DATA (last 14 days)', 'STRAVA-DATA (Senaste 14 dagarna)')}\n`;
  context += `*${t(locale, 'Automatically synced training data for better AI analysis', 'Automatiskt synkad träningsdata för bättre AI-analys')}*\n\n`;

  // Calculate summary stats
  const recentActivities = activities.slice(0, 20);
  const totalDistance = recentActivities.reduce((sum, a) => sum + (a.distance || 0), 0) / 1000; // km
  const totalTime = recentActivities.reduce((sum, a) => sum + (a.movingTime || 0), 0) / 3600; // hours
  const totalTSS = recentActivities.reduce((sum, a) => sum + (a.tss || 0), 0);

  // Group by type
  const byType: Record<string, { count: number; distance: number; time: number }> = {};
  for (const activity of recentActivities) {
    const type = activity.mappedType || 'OTHER';
    if (!byType[type]) {
      byType[type] = { count: 0, distance: 0, time: 0 };
    }
    byType[type].count++;
    byType[type].distance += (activity.distance || 0) / 1000;
    byType[type].time += (activity.movingTime || 0) / 3600;
  }

  context += `### ${t(locale, `Training overview (${recentActivities.length} activities)`, `Träningsöversikt (${recentActivities.length} aktiviteter)`)}\n`;
  context += `- **${t(locale, 'Total distance', 'Total distans')}**: ${totalDistance.toFixed(1)} km\n`;
  context += `- **${t(locale, 'Total time', 'Total tid')}**: ${totalTime.toFixed(1)} ${t(locale, 'hours', 'timmar')}\n`;
  context += `- **${t(locale, 'Accumulated TSS', 'Ackumulerad TSS')}**: ${Math.round(totalTSS)}\n`;
  context += `- **${t(locale, 'Average TSS/day', 'Genomsnittlig TSS/dag')}**: ${Math.round(totalTSS / 14)}\n\n`;

  // Per-type breakdown
  context += `### ${t(locale, 'Distribution by type', 'Fördelning per typ')}\n`;
  context += `| ${t(locale, 'Type', 'Typ')} | ${t(locale, 'Count', 'Antal')} | ${t(locale, 'Distance', 'Distans')} | ${t(locale, 'Time', 'Tid')} |\n`;
  context += `|-----|-------|---------|-----|\n`;
  for (const [type, data] of Object.entries(byType)) {
    const typeName = translateActivityType(type, locale);
    context += `| ${typeName} | ${data.count} | ${data.distance.toFixed(1)} km | ${data.time.toFixed(1)}h |\n`;
  }

  // Recent activities list
  context += `\n### ${t(locale, 'Recent activities', 'Senaste aktiviteter')}\n`;
  for (const activity of recentActivities.slice(0, 5)) {
    const date = new Date(activity.startDate).toLocaleDateString(dateLocale(locale));
    const distance = activity.distance ? `${(activity.distance / 1000).toFixed(1)} km` : '';
    const time = activity.movingTime ? formatDuration(activity.movingTime) : '';
    const hr = activity.averageHeartrate ? `${Math.round(activity.averageHeartrate)} bpm` : '';

    context += `- **${date}** ${activity.name} (${activity.type}): ${distance} ${time}`;
    if (hr) context += ` | ${t(locale, 'HR', 'Puls')}: ${hr}`;
    if (activity.tss) context += ` | TSS: ${activity.tss}`;
    context += '\n';
  }

  // Training load analysis
  const avgDailyTSS = totalTSS / 14;
  let loadStatus = '';
  if (avgDailyTSS < 30) {
    loadStatus = t(locale, 'Low load - room to increase', 'Låg belastning - utrymme för ökning');
  } else if (avgDailyTSS < 50) {
    loadStatus = t(locale, 'Moderate load - good base', 'Måttlig belastning - bra bas');
  } else if (avgDailyTSS < 70) {
    loadStatus = t(locale, 'High load - monitor recovery', 'Hög belastning - övervaka återhämtning');
  } else {
    loadStatus = t(locale, 'Very high load - overtraining risk', 'Mycket hög belastning - risk för överträning');
  }
  context += `\n### ${t(locale, 'Load analysis', 'Belastningsanalys')}\n`;
  context += `- **${t(locale, 'Status', 'Status')}**: ${loadStatus}\n`;

  return context;
}

/**
 * Build Garmin integration context (PRO tier only)
 *
 * Provides AI with health metrics from Garmin for holistic analysis.
 */
export function buildGarminContext(metrics: GarminMetricsData, locale: SportContextLocale = 'en'): string {
  if (!metrics) return '';

  let context = `\n## ${t(locale, 'GARMIN HEALTH DATA (last 7 days)', 'GARMIN HÄLSODATA (Senaste 7 dagarna)')}\n`;
  context += `*${t(locale, 'Automatically synced health data for better readiness analysis', 'Automatiskt synkad hälsodata för bättre beredskapsanalys')}*\n\n`;

  // Calculate averages
  const recentDays = metrics.recentDays || [];
  if (recentDays.length === 0) return '';

  const avgSleep = recentDays.reduce((sum, d) => sum + (d.sleepHours || 0), 0) / recentDays.length;
  const avgSleepQuality = recentDays.reduce((sum, d) => sum + (d.sleepQuality || 0), 0) / recentDays.length;
  const avgHRV = recentDays.filter(d => d.hrv).reduce((sum, d) => sum + (d.hrv || 0), 0) /
                 (recentDays.filter(d => d.hrv).length || 1);
  const avgRHR = recentDays.filter(d => d.restingHR).reduce((sum, d) => sum + (d.restingHR || 0), 0) /
                 (recentDays.filter(d => d.restingHR).length || 1);
  const avgSteps = recentDays.reduce((sum, d) => sum + (d.steps || 0), 0) / recentDays.length;
  const avgStress = recentDays.filter(d => d.stressLevel !== null).reduce((sum, d) => sum + (d.stressLevel || 0), 0) /
                    (recentDays.filter(d => d.stressLevel !== null).length || 1);

  context += `### ${t(locale, 'Average health metrics', 'Genomsnittliga hälsometriker')}\n`;
  context += `| ${t(locale, 'Metric', 'Metrik')} | ${t(locale, 'Value', 'Värde')} | ${t(locale, 'Status', 'Status')} |\n`;
  context += `|--------|-------|--------|\n`;
  context += `| ${t(locale, 'Sleep', 'Sömn')} | ${avgSleep.toFixed(1)} ${t(locale, 'h', 'tim')} | ${getSleepStatus(avgSleep, locale)} |\n`;
  context += `| ${t(locale, 'Sleep quality', 'Sömnkvalitet')} | ${avgSleepQuality.toFixed(1)}/10 | ${getQualityStatus(avgSleepQuality, locale)} |\n`;
  if (avgHRV > 0) {
    context += `| HRV | ${avgHRV.toFixed(0)} ms | ${getHRVStatus(avgHRV, locale)} |\n`;
  }
  if (avgRHR > 0) {
    context += `| ${t(locale, 'Resting heart rate', 'Vilopuls')} | ${avgRHR.toFixed(0)} bpm | ${getRHRStatus(avgRHR, locale)} |\n`;
  }
  context += `| ${t(locale, 'Daily steps', 'Dagliga steg')} | ${Math.round(avgSteps).toLocaleString()} | ${getStepsStatus(avgSteps, locale)} |\n`;
  if (avgStress > 0) {
    context += `| ${t(locale, 'Stress level', 'Stressnivå')} | ${avgStress.toFixed(1)}/10 | ${getStressStatus(avgStress, locale)} |\n`;
  }

  // Readiness score
  if (metrics.readinessScore !== null) {
    context += `\n### ${t(locale, 'Readiness score', 'Beredskapspoäng')}\n`;
    context += `- **${t(locale, "Today's readiness", 'Dagens beredskap')}**: ${metrics.readinessScore}/100`;
    if (metrics.readinessScore < 40) {
      context += ` ⚠️ ${t(locale, 'Rest recommended', 'Vila rekommenderas')}\n`;
    } else if (metrics.readinessScore < 60) {
      context += ` ⚡ ${t(locale, 'Light training', 'Lätt träning')}\n`;
    } else if (metrics.readinessScore < 80) {
      context += ` ✅ ${t(locale, 'Normal training', 'Normal träning')}\n`;
    } else {
      context += ` 🔥 ${t(locale, 'Optimal for hard training', 'Optimal för hård träning')}\n`;
    }
  }

  // Weekly TSS from Garmin activities
  if (metrics.weeklyTSS > 0) {
    context += `\n### ${t(locale, 'Weekly load (Garmin)', 'Veckobelastning (Garmin)')}\n`;
    context += `- **Total TSS**: ${Math.round(metrics.weeklyTSS)}\n`;
  }

  // Daily breakdown table
  context += `\n### ${t(locale, 'Daily overview', 'Daglig översikt')}\n`;
  context += `| ${t(locale, 'Date', 'Datum')} | ${t(locale, 'Sleep', 'Sömn')} | HRV | RHR | ${t(locale, 'Steps', 'Steg')} |\n`;
  context += `|-------|------|-----|-----|------|\n`;
  for (const day of recentDays.slice(0, 7)) {
    const date = new Date(day.date).toLocaleDateString(dateLocale(locale), { weekday: 'short', day: 'numeric' });
    const sleep = day.sleepHours ? `${day.sleepHours.toFixed(1)}h` : '-';
    const hrv = day.hrv ? `${Math.round(day.hrv)}` : '-';
    const rhr = day.restingHR ? `${Math.round(day.restingHR)}` : '-';
    const steps = day.steps ? Math.round(day.steps).toLocaleString() : '-';
    context += `| ${date} | ${sleep} | ${hrv} | ${rhr} | ${steps} |\n`;
  }

  // Recommendations based on data
  context += `\n### ${t(locale, 'AI recommendations based on Garmin data', 'AI-rekommendationer baserat på Garmin-data')}\n`;
  if (avgSleep < 6.5) {
    context += `- ⚠️ ${t(locale, 'Sleep deficit detected - prioritize recovery', 'Sömnbrist detekterad - prioritera återhämtning')}\n`;
  }
  if (avgHRV > 0 && avgHRV < 40) {
    context += `- ⚠️ ${t(locale, 'Low HRV - consider reducing intensity', 'Låg HRV - överväg att minska intensitet')}\n`;
  }
  if (avgStress > 6) {
    context += `- ⚠️ ${t(locale, 'High stress level - include relaxation', 'Hög stressnivå - inkludera avslappning')}\n`;
  }
  if (avgSleep >= 7 && avgSleepQuality >= 7) {
    context += `- ✅ ${t(locale, 'Good sleep - ready for quality sessions', 'God sömn - redo för kvalitetspass')}\n`;
  }

  return context;
}

// Helper functions for Garmin status
export function getSleepStatus(hours: number, locale: SportContextLocale = 'en'): string {
  if (hours >= 7.5) return t(locale, '✅ Excellent', '✅ Utmärkt');
  if (hours >= 7) return t(locale, '✅ Good', '✅ Bra');
  if (hours >= 6) return t(locale, '⚡ Acceptable', '⚡ Acceptabel');
  return t(locale, '⚠️ Insufficient', '⚠️ Otillräcklig');
}

export function getQualityStatus(quality: number, locale: SportContextLocale = 'en'): string {
  if (quality >= 8) return t(locale, '✅ Excellent', '✅ Utmärkt');
  if (quality >= 6) return t(locale, '✅ Good', '✅ Bra');
  if (quality >= 4) return t(locale, '⚡ Average', '⚡ Medel');
  return t(locale, '⚠️ Low', '⚠️ Låg');
}

export function getHRVStatus(hrv: number, locale: SportContextLocale = 'en'): string {
  if (hrv >= 60) return t(locale, '✅ High', '✅ Hög');
  if (hrv >= 45) return t(locale, '✅ Normal', '✅ Normal');
  if (hrv >= 30) return t(locale, '⚡ Low-normal', '⚡ Låg-normal');
  return t(locale, '⚠️ Low', '⚠️ Låg');
}

export function getRHRStatus(rhr: number, locale: SportContextLocale = 'en'): string {
  if (rhr <= 55) return t(locale, '✅ Excellent', '✅ Utmärkt');
  if (rhr <= 65) return t(locale, '✅ Good', '✅ Bra');
  if (rhr <= 75) return t(locale, '⚡ Normal', '⚡ Normal');
  return t(locale, '⚠️ Elevated', '⚠️ Förhöjd');
}

export function getStepsStatus(steps: number, locale: SportContextLocale = 'en'): string {
  if (steps >= 10000) return t(locale, '✅ Active', '✅ Aktiv');
  if (steps >= 7000) return t(locale, '✅ Good', '✅ Bra');
  if (steps >= 5000) return t(locale, '⚡ Average', '⚡ Medel');
  return t(locale, '⚠️ Sedentary', '⚠️ Stillasittande');
}

export function getStressStatus(stress: number, locale: SportContextLocale = 'en'): string {
  if (stress <= 3) return t(locale, '✅ Low', '✅ Låg');
  if (stress <= 5) return t(locale, '⚡ Average', '⚡ Medel');
  if (stress <= 7) return t(locale, '⚠️ High', '⚠️ Hög');
  return t(locale, '🔴 Very high', '🔴 Mycket hög');
}

export function translateActivityType(type: string, locale: SportContextLocale = 'en'): string {
  const translations: Record<string, Record<SportContextLocale, string>> = {
    RUNNING: { en: 'Running', sv: 'Löpning' },
    CYCLING: { en: 'Cycling', sv: 'Cykling' },
    SWIMMING: { en: 'Swimming', sv: 'Simning' },
    CROSS_TRAINING: { en: 'Cross-training', sv: 'Korsträning' },
    STRENGTH: { en: 'Strength', sv: 'Styrka' },
    SKIING: { en: 'Skiing', sv: 'Skidåkning' },
    RECOVERY: { en: 'Recovery', sv: 'Återhämtning' },
    OTHER: { en: 'Other', sv: 'Övrigt' },
  };
  return translations[type]?.[locale] || type;
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
