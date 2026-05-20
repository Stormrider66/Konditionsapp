import type { GarminMetricsData, StravaActivityData } from './types'

type SportContextLocale = 'en' | 'sv'

function dateLocale(locale: SportContextLocale): string {
  return locale === 'sv' ? 'sv-SE' : 'en-US'
}

/**
 * Build Strava integration context (PRO tier only)
 *
 * Provides AI with recent training data from Strava for better analysis.
 */
export function buildStravaContext(activities: StravaActivityData[], locale: SportContextLocale = 'en'): string {
  if (!activities || activities.length === 0) return '';

  let context = `\n## STRAVA-DATA (Senaste 14 dagarna)\n`;
  context += `*Automatiskt synkad träningsdata för bättre AI-analys*\n\n`;

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

  context += `### Träningsöversikt (${recentActivities.length} aktiviteter)\n`;
  context += `- **Total distans**: ${totalDistance.toFixed(1)} km\n`;
  context += `- **Total tid**: ${totalTime.toFixed(1)} timmar\n`;
  context += `- **Ackumulerad TSS**: ${Math.round(totalTSS)}\n`;
  context += `- **Genomsnittlig TSS/dag**: ${Math.round(totalTSS / 14)}\n\n`;

  // Per-type breakdown
  context += `### Fördelning per typ\n`;
  context += `| Typ | Antal | Distans | Tid |\n`;
  context += `|-----|-------|---------|-----|\n`;
  for (const [type, data] of Object.entries(byType)) {
    const typeName = translateActivityType(type);
    context += `| ${typeName} | ${data.count} | ${data.distance.toFixed(1)} km | ${data.time.toFixed(1)}h |\n`;
  }

  // Recent activities list
  context += `\n### Senaste aktiviteter\n`;
  for (const activity of recentActivities.slice(0, 5)) {
    const date = new Date(activity.startDate).toLocaleDateString(dateLocale(locale));
    const distance = activity.distance ? `${(activity.distance / 1000).toFixed(1)} km` : '';
    const time = activity.movingTime ? formatDuration(activity.movingTime) : '';
    const hr = activity.averageHeartrate ? `${Math.round(activity.averageHeartrate)} bpm` : '';

    context += `- **${date}** ${activity.name} (${activity.type}): ${distance} ${time}`;
    if (hr) context += ` | Puls: ${hr}`;
    if (activity.tss) context += ` | TSS: ${activity.tss}`;
    context += '\n';
  }

  // Training load analysis
  const avgDailyTSS = totalTSS / 14;
  let loadStatus = '';
  if (avgDailyTSS < 30) {
    loadStatus = 'Låg belastning - utrymme för ökning';
  } else if (avgDailyTSS < 50) {
    loadStatus = 'Måttlig belastning - bra bas';
  } else if (avgDailyTSS < 70) {
    loadStatus = 'Hög belastning - övervaka återhämtning';
  } else {
    loadStatus = 'Mycket hög belastning - risk för överträning';
  }
  context += `\n### Belastningsanalys\n`;
  context += `- **Status**: ${loadStatus}\n`;

  return context;
}

/**
 * Build Garmin integration context (PRO tier only)
 *
 * Provides AI with health metrics from Garmin for holistic analysis.
 */
export function buildGarminContext(metrics: GarminMetricsData, locale: SportContextLocale = 'en'): string {
  if (!metrics) return '';

  let context = `\n## GARMIN HÄLSODATA (Senaste 7 dagarna)\n`;
  context += `*Automatiskt synkad hälsodata för bättre beredskapsanalys*\n\n`;

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

  context += `### Genomsnittliga hälsometriker\n`;
  context += `| Metrik | Värde | Status |\n`;
  context += `|--------|-------|--------|\n`;
  context += `| Sömn | ${avgSleep.toFixed(1)} tim | ${getSleepStatus(avgSleep)} |\n`;
  context += `| Sömnkvalitet | ${avgSleepQuality.toFixed(1)}/10 | ${getQualityStatus(avgSleepQuality)} |\n`;
  if (avgHRV > 0) {
    context += `| HRV | ${avgHRV.toFixed(0)} ms | ${getHRVStatus(avgHRV)} |\n`;
  }
  if (avgRHR > 0) {
    context += `| Vilopuls | ${avgRHR.toFixed(0)} bpm | ${getRHRStatus(avgRHR)} |\n`;
  }
  context += `| Dagliga steg | ${Math.round(avgSteps).toLocaleString()} | ${getStepsStatus(avgSteps)} |\n`;
  if (avgStress > 0) {
    context += `| Stressnivå | ${avgStress.toFixed(1)}/10 | ${getStressStatus(avgStress)} |\n`;
  }

  // Readiness score
  if (metrics.readinessScore !== null) {
    context += `\n### Beredskapspoäng\n`;
    context += `- **Dagens beredskap**: ${metrics.readinessScore}/100`;
    if (metrics.readinessScore < 40) {
      context += ' ⚠️ Vila rekommenderas\n';
    } else if (metrics.readinessScore < 60) {
      context += ' ⚡ Lätt träning\n';
    } else if (metrics.readinessScore < 80) {
      context += ' ✅ Normal träning\n';
    } else {
      context += ' 🔥 Optimal för hård träning\n';
    }
  }

  // Weekly TSS from Garmin activities
  if (metrics.weeklyTSS > 0) {
    context += `\n### Veckobelastning (Garmin)\n`;
    context += `- **Total TSS**: ${Math.round(metrics.weeklyTSS)}\n`;
  }

  // Daily breakdown table
  context += `\n### Daglig översikt\n`;
  context += `| Datum | Sömn | HRV | RHR | Steg |\n`;
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
  context += `\n### AI-rekommendationer baserat på Garmin-data\n`;
  if (avgSleep < 6.5) {
    context += `- ⚠️ Sömnbrist detekterad - prioritera återhämtning\n`;
  }
  if (avgHRV > 0 && avgHRV < 40) {
    context += `- ⚠️ Låg HRV - överväg att minska intensitet\n`;
  }
  if (avgStress > 6) {
    context += `- ⚠️ Hög stressnivå - inkludera avslappning\n`;
  }
  if (avgSleep >= 7 && avgSleepQuality >= 7) {
    context += `- ✅ God sömn - redo för kvalitetspass\n`;
  }

  return context;
}

// Helper functions for Garmin status
export function getSleepStatus(hours: number): string {
  if (hours >= 7.5) return '✅ Utmärkt';
  if (hours >= 7) return '✅ Bra';
  if (hours >= 6) return '⚡ Acceptabel';
  return '⚠️ Otillräcklig';
}

export function getQualityStatus(quality: number): string {
  if (quality >= 8) return '✅ Utmärkt';
  if (quality >= 6) return '✅ Bra';
  if (quality >= 4) return '⚡ Medel';
  return '⚠️ Låg';
}

export function getHRVStatus(hrv: number): string {
  if (hrv >= 60) return '✅ Hög';
  if (hrv >= 45) return '✅ Normal';
  if (hrv >= 30) return '⚡ Låg-normal';
  return '⚠️ Låg';
}

export function getRHRStatus(rhr: number): string {
  if (rhr <= 55) return '✅ Utmärkt';
  if (rhr <= 65) return '✅ Bra';
  if (rhr <= 75) return '⚡ Normal';
  return '⚠️ Förhöjd';
}

export function getStepsStatus(steps: number): string {
  if (steps >= 10000) return '✅ Aktiv';
  if (steps >= 7000) return '✅ Bra';
  if (steps >= 5000) return '⚡ Medel';
  return '⚠️ Stillasittande';
}

export function getStressStatus(stress: number): string {
  if (stress <= 3) return '✅ Låg';
  if (stress <= 5) return '⚡ Medel';
  if (stress <= 7) return '⚠️ Hög';
  return '🔴 Mycket hög';
}

export function translateActivityType(type: string): string {
  const translations: Record<string, string> = {
    RUNNING: 'Löpning',
    CYCLING: 'Cykling',
    SWIMMING: 'Simning',
    CROSS_TRAINING: 'Korsträning',
    STRENGTH: 'Styrka',
    SKIING: 'Skidåkning',
    RECOVERY: 'Återhämtning',
    OTHER: 'Övrigt',
  };
  return translations[type] || type;
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
