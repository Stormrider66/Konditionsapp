import type { AthleteData, CyclingSettings, RunningSettings, SkiingSettings, SwimmingSettings, TriathlonSettings } from '../types'
import { METHODOLOGIES } from '../../program-prompts'
import { calculateZonesFromTest } from '../zones'
import { formatSecondsToTime, formatSwimTime, formatTime } from '../formatters'

/**
 * Build Running-specific context
 */
export function buildRunningContext(athlete: AthleteData): string {
  const sp = athlete.sportProfile;
  const settings = sp?.runningSettings as RunningSettings | null;
  const test = athlete.tests?.[0];
  const races = athlete.raceResults || [];

  let context = `\n## LÖPNINGSSPECIFIK DATA\n`;

  // Experience level
  if (sp?.runningExperience) {
    context += `- **Erfarenhetsnivå**: ${sp.runningExperience}\n`;
  }

  // Target race and methodology
  if (settings?.targetRace) {
    context += `- **Mållopp**: ${settings.targetRace}\n`;
  }
  if (settings?.weeklyVolume) {
    context += `- **Nuvarande veckovolym**: ${settings.weeklyVolume} km/vecka\n`;
  }
  if (settings?.longestRun) {
    context += `- **Längsta löppass**: ${settings.longestRun} km\n`;
  }
  if (settings?.terrainPreference) {
    context += `- **Terräng**: ${settings.terrainPreference}\n`;
  }
  if (settings?.preferredMethodology) {
    const methodology = METHODOLOGIES[settings.preferredMethodology as keyof typeof METHODOLOGIES];
    if (methodology) {
      context += `- **Träningsmetodik**: ${methodology.name}\n`;
      context += `  - ${methodology.description}\n`;
    }
  }

  // Current paces
  if (settings?.currentPaces) {
    const paces = settings.currentPaces;
    context += `\n### Nuvarande tempozoner\n`;
    if (paces.easy) context += `- **Lugnt tempo**: ${paces.easy}/km\n`;
    if (paces.tempo) context += `- **Tempo**: ${paces.tempo}/km\n`;
    if (paces.threshold) context += `- **Tröskel**: ${paces.threshold}/km\n`;
    if (paces.interval) context += `- **Intervall**: ${paces.interval}/km\n`;
  }

  // VDOT from best race
  const bestVdot = races.reduce((max, r) => Math.max(max, r.vdot || 0), 0);
  if (bestVdot > 0) {
    context += `\n### VDOT-baserade temporekommendationer (VDOT: ${bestVdot.toFixed(1)})\n`;
    // Simplified Daniels paces based on VDOT
    const easyPace = 4.5 + (60 - bestVdot) * 0.1; // Approximate
    const tempoPace = 3.8 + (60 - bestVdot) * 0.08;
    const thresholdPace = 3.5 + (60 - bestVdot) * 0.07;
    const intervalPace = 3.2 + (60 - bestVdot) * 0.06;

    context += `- **Easy (E)**: ~${easyPace.toFixed(1)} min/km\n`;
    context += `- **Marathon (M)**: ~${(tempoPace + 0.2).toFixed(1)} min/km\n`;
    context += `- **Threshold (T)**: ~${thresholdPace.toFixed(1)} min/km\n`;
    context += `- **Interval (I)**: ~${intervalPace.toFixed(1)} min/km\n`;
  }

  // Test-based zones
  if (test) {
    context += calculateZonesFromTest(test);
  }

  // Recent races
  if (races.length > 0) {
    context += `\n### Senaste tävlingsresultat\n`;
    for (const race of races.slice(0, 5)) {
      context += `- **${race.raceName || race.distance}** (${new Date(race.raceDate).toLocaleDateString('sv-SE')}): ${race.timeFormatted}`;
      if (race.vdot) context += ` (VDOT: ${race.vdot.toFixed(1)})`;
      context += '\n';
    }
  }

  return context;
}


export function buildCyclingContext(athlete: AthleteData): string {
  const sp = athlete.sportProfile;
  const settings = sp?.cyclingSettings as CyclingSettings | null;
  const test = athlete.tests?.find(t => t.testType === 'CYCLING');

  let context = `\n## CYKELSPECIFIK DATA\n`;

  if (sp?.cyclingExperience) {
    context += `- **Erfarenhetsnivå**: ${sp.cyclingExperience}\n`;
  }

  if (settings?.currentFtp) {
    context += `- **FTP**: ${settings.currentFtp}W\n`;

    // Calculate W/kg if weight available
    const weight = settings.weight || athlete.weight;
    if (weight) {
      const wkg = settings.currentFtp / weight;
      context += `- **W/kg**: ${wkg.toFixed(2)}\n`;

      // Performance classification
      let classification = '';
      if (wkg >= 5.5) classification = 'World Tour Pro';
      else if (wkg >= 5.0) classification = 'Continental Pro';
      else if (wkg >= 4.5) classification = 'Cat 1 / Elite Amateur';
      else if (wkg >= 4.0) classification = 'Cat 2 / Strong Amateur';
      else if (wkg >= 3.5) classification = 'Cat 3 / Recreational Racer';
      else if (wkg >= 3.0) classification = 'Cat 4 / Fitness Cyclist';
      else classification = 'Beginner';

      context += `- **Klassificering**: ${classification}\n`;
    }

    // FTP-based power zones
    const ftp = settings.currentFtp;
    context += `\n### Effektzoner (baserat på FTP ${ftp}W)\n`;
    context += `| Zon | Namn | Watt | % FTP |\n`;
    context += `|-----|------|------|-------|\n`;
    context += `| Z1 | Active Recovery | <${Math.round(ftp * 0.55)} | <55% |\n`;
    context += `| Z2 | Endurance | ${Math.round(ftp * 0.56)}-${Math.round(ftp * 0.75)} | 56-75% |\n`;
    context += `| Z3 | Tempo | ${Math.round(ftp * 0.76)}-${Math.round(ftp * 0.90)} | 76-90% |\n`;
    context += `| Z4 | Threshold | ${Math.round(ftp * 0.91)}-${Math.round(ftp * 1.05)} | 91-105% |\n`;
    context += `| Z5 | VO2max | ${Math.round(ftp * 1.06)}-${Math.round(ftp * 1.20)} | 106-120% |\n`;
    context += `| Z6 | Anaerobic | ${Math.round(ftp * 1.21)}-${Math.round(ftp * 1.50)} | 121-150% |\n`;
    context += `| Z7 | Neuromuscular | >${Math.round(ftp * 1.50)} | >150% |\n`;
  }

  if (settings?.primaryDiscipline) {
    context += `\n- **Primär disciplin**: ${settings.primaryDiscipline}\n`;
  }
  if (settings?.bikeTypes && settings.bikeTypes.length > 0) {
    context += `- **Cykeltyper**: ${settings.bikeTypes.join(', ')}\n`;
  }

  return context;
}


export function buildSwimmingContext(athlete: AthleteData): string {
  const sp = athlete.sportProfile;
  const settings = sp?.swimmingSettings as SwimmingSettings | null;

  let context = `\n## SIMSPECIFIK DATA\n`;

  if (sp?.swimmingExperience) {
    context += `- **Erfarenhetsnivå**: ${sp.swimmingExperience}\n`;
  }

  if (settings?.currentCss) {
    context += `- **CSS (Critical Swim Speed)**: ${settings.currentCss}/100m\n`;

    // Parse CSS time and calculate zones
    const cssMatch = settings.currentCss.match(/(\d+):(\d+)/);
    if (cssMatch) {
      const cssSeconds = parseInt(cssMatch[1]) * 60 + parseInt(cssMatch[2]);

      context += `\n### CSS-baserade simzoner\n`;
      context += `| Zon | Namn | Tempo/100m |\n`;
      context += `|-----|------|------------|\n`;
      context += `| CSS-6 | Recovery | ${formatSwimTime(cssSeconds + 15)} |\n`;
      context += `| CSS-5 | Endurance | ${formatSwimTime(cssSeconds + 10)} |\n`;
      context += `| CSS-4 | Tempo | ${formatSwimTime(cssSeconds + 6)} |\n`;
      context += `| CSS-3 | Threshold | ${formatSwimTime(cssSeconds)} |\n`;
      context += `| CSS-2 | VO2max | ${formatSwimTime(cssSeconds - 4)} |\n`;
      context += `| CSS-1 | Sprint | ${formatSwimTime(cssSeconds - 8)} |\n`;
    }
  }

  if (settings?.primaryStroke) {
    context += `\n- **Huvudsimsätt**: ${settings.primaryStroke}\n`;
  }
  if (settings?.poolLength) {
    context += `- **Bassänglängd**: ${settings.poolLength}m\n`;
  }
  if (settings?.weeklyDistance) {
    context += `- **Veckovolym**: ${settings.weeklyDistance}m\n`;
  }
  if (settings?.openWaterExperience) {
    context += `- **Öppet vatten-erfarenhet**: Ja\n`;
  }

  return context;
}


export function buildTriathlonContext(athlete: AthleteData): string {
  const sp = athlete.sportProfile;
  const settings = sp?.triathlonSettings as TriathlonSettings | null;

  let context = `\n## TRIATHLONSPECIFIK DATA\n`;

  if (settings?.targetDistance) {
    context += `- **Måldistans**: ${settings.targetDistance}\n`;

    // Standard triathlon distances
    const distances: Record<string, string> = {
      'SPRINT': 'Sim 750m, Cykel 20km, Löp 5km',
      'OLYMPIC': 'Sim 1500m, Cykel 40km, Löp 10km',
      'HALF': 'Sim 1900m, Cykel 90km, Löp 21.1km',
      'FULL': 'Sim 3800m, Cykel 180km, Löp 42.2km',
    };
    if (distances[settings.targetDistance]) {
      context += `  - ${distances[settings.targetDistance]}\n`;
    }
  }

  // Discipline metrics
  context += `\n### Disciplindata\n`;
  if (settings?.swimCss) {
    context += `- **Sim CSS**: ${settings.swimCss}/100m\n`;
  }
  if (settings?.bikeFtp) {
    const weight = athlete.weight;
    context += `- **Cykel FTP**: ${settings.bikeFtp}W`;
    if (weight) context += ` (${(settings.bikeFtp / weight).toFixed(2)} W/kg)`;
    context += '\n';
  }
  if (settings?.runVdot) {
    context += `- **Löp VDOT**: ${settings.runVdot}\n`;
  }

  // Discipline balance
  if (settings?.weakestDiscipline) {
    context += `\n### Disciplinbalans\n`;
    context += `- **Svagaste disciplin**: ${settings.weakestDiscipline}\n`;
  }
  if (settings?.strongestDiscipline) {
    context += `- **Starkaste disciplin**: ${settings.strongestDiscipline}\n`;
  }

  // Multi-sport training recommendations
  context += `\n### Träningsrekommendationer för ${settings?.targetDistance || 'triathlon'}\n`;
  context += `- Prioritera svagaste disciplin med ~40% av total tid\n`;
  context += `- Brick-sessions (cykel→löp) minst 1x/vecka\n`;
  context += `- Open water sim om möjligt\n`;

  return context;
}


export function buildSkiingContext(athlete: AthleteData): string {
  const sp = athlete.sportProfile;
  const settings = sp?.skiingSettings as SkiingSettings | null;

  let context = `\n## SKIDÅKNINGSSPECIFIK DATA\n`;

  if (settings?.technique) {
    context += `- **Teknik**: ${settings.technique === 'BOTH' ? 'Klassisk & Fristil' : settings.technique}\n`;
  }
  if (settings?.raceDistances && settings.raceDistances.length > 0) {
    context += `- **Tävlingsdistanser**: ${settings.raceDistances.join(', ')}\n`;
  }
  if (settings?.preferredTerrain) {
    context += `- **Prefererad terräng**: ${settings.preferredTerrain}\n`;
  }
  if (settings?.equipment && settings.equipment.length > 0) {
    context += `- **Utrustning**: ${settings.equipment.join(', ')}\n`;
  }

  context += `\n### Säsongsplanering\n`;
  context += `- **Vår (mar-maj)**: Återhämtning, grundstyrka, teknikdrill\n`;
  context += `- **Sommar (jun-aug)**: Rullskidor, löpning, cykling, styrka\n`;
  context += `- **Höst (sep-nov)**: Intensifiering, snöcamp, specifik träning\n`;
  context += `- **Vinter (dec-feb)**: Tävlingssäsong, underhållsträning\n`;

  return context;
}


