/**
 * Sport-Specific Context Builder for AI Chat
 *
 * Builds rich, sport-specific context from athlete data for AI conversations.
 */

import { SportType } from '@prisma/client';
import { SPORT_PROMPTS, METHODOLOGIES } from './program-prompts';
import {
  calculateBMR,
  calculateTDEE,
  calculateBMI,
  generateNutritionPlan,
  calculateWeightTimeline,
  getProteinRequirements,
  calculateHydration,
  categorizeBodyFat,
  calculateIdealWeightRange,
  type ActivityLevel,
  type CaloricGoal,
} from './nutrition-calculator';

// Type definitions for athlete data
interface AthleteData {
  id: string;
  name: string;
  gender: string | null;
  birthDate: Date | null;
  height: number | null;
  weight: number | null;
  sportProfile: SportProfile | null;
  tests: TestData[];
  raceResults: RaceResult[];
  trainingPrograms: TrainingProgram[];
  injuryAssessments: InjuryAssessment[];
  fieldTests?: FieldTest[];
  dailyCheckIns?: DailyCheckIn[];
  bodyCompositions?: BodyComposition[];
  videoAnalyses?: VideoAnalysis[];
}

interface VideoAnalysis {
  id: string;
  createdAt: Date;
  videoType: string | null;
  cameraAngle: string | null;
  formScore: number | null;
  issuesDetected: string[] | null;
  recommendations: string[] | null;
  runningGaitAnalysis: RunningGaitAnalysis | null;
}

interface RunningGaitAnalysis {
  id: string;
  cadence: number | null;
  groundContactTime: number | null;
  verticalOscillation: number | null;
  strideLength: number | null;
  footStrikePattern: string | null;
  asymmetryPercent: number | null;
  leftContactTime: number | null;
  rightContactTime: number | null;
  injuryRiskLevel: string | null;
  injuryRiskScore: number | null;
  injuryRiskFactors: string[] | null;
  runningEfficiency: number | null;
  energyLeakages: string[] | null;
  coachingCues: string[] | null;
  drillRecommendations: string[] | null;
  overallScore: number | null;
  summary: string | null;
}

interface BodyComposition {
  measurementDate: Date;
  weightKg: number | null;
  bodyFatPercent: number | null;
  muscleMassKg: number | null;
  visceralFat: number | null;
  boneMassKg: number | null;
  waterPercent: number | null;
  bmrKcal: number | null;
  metabolicAge: number | null;
}

interface SportProfile {
  primarySport: SportType;
  secondarySports: SportType[] | null;
  runningSettings: RunningSettings | null;
  cyclingSettings: CyclingSettings | null;
  swimmingSettings: SwimmingSettings | null;
  triathlonSettings: TriathlonSettings | null;
  hyroxSettings: HyroxSettings | null;
  skiingSettings: SkiingSettings | null;
  generalFitnessSettings: GeneralFitnessSettings | null;
  runningExperience: string | null;
  cyclingExperience: string | null;
  swimmingExperience: string | null;
  strengthExperience: string | null;
}

interface RunningSettings {
  targetRace?: string;
  weeklyVolume?: number;
  preferredMethodology?: string;
  longestRun?: number;
  currentPaces?: {
    easy?: string;
    tempo?: string;
    threshold?: string;
    interval?: string;
  };
}

interface CyclingSettings {
  currentFtp?: number;
  weight?: number;
  bikeTypes?: string[];
  indoorOutdoorRatio?: number;
  primaryDiscipline?: string;
}

interface SwimmingSettings {
  currentCss?: string;
  poolLength?: number;
  primaryStroke?: string;
  openWaterExperience?: boolean;
  weeklyDistance?: number;
}

interface TriathlonSettings {
  targetDistance?: string;
  swimCss?: string;
  bikeFtp?: number;
  runVdot?: number;
  weakestDiscipline?: string;
  strongestDiscipline?: string;
}

interface HyroxSettings {
  targetCategory?: string;
  targetTime?: string;
  stationTimes?: {
    skiErg?: number;
    sledPush?: number;
    sledPull?: number;
    burpeeBroadJump?: number;
    rowing?: number;
    farmersCarry?: number;
    lunges?: number;
    wallBalls?: number;
  };
  runSplits?: number[];
  strengthPRs?: {
    deadlift?: number;
    squat?: number;
    benchPress?: number;
  };
}

interface SkiingSettings {
  technique?: 'CLASSIC' | 'SKATE' | 'BOTH';
  equipment?: string[];
  preferredTerrain?: string;
  raceDistances?: string[];
}

interface GeneralFitnessSettings {
  goals?: string[];
  activityTypes?: string[];
  limitations?: string[];
  targetWeight?: number;
  currentBodyFat?: number;
}

interface TestData {
  id: string;
  testDate: Date;
  testType: string;
  maxHR: number | null;
  vo2max: number | null;
  aerobicThreshold: { hr?: number; value?: number; unit?: string } | null;
  anaerobicThreshold: { hr?: number; value?: number; unit?: string } | null;
  testStages: TestStage[];
}

interface TestStage {
  sequence: number;
  speed?: number | null;
  power?: number | null;
  pace?: string | null;
  heartRate: number | null;
  lactate: number | null;
}

interface RaceResult {
  id: string;
  raceName: string | null;
  raceDate: Date;
  distance: string;
  timeFormatted: string | null;
  vdot: number | null;
  avgHeartRate?: number | null;
  notes?: string | null;
}

interface TrainingProgram {
  id: string;
  name: string;
  goalType: string | null;
  goalRace: string | null;
  startDate: Date;
  endDate: Date;
}

interface InjuryAssessment {
  id: string;
  injuryType: string;
  status: string;
  painLevel: number;
  affectedArea?: string | null;
}

interface FieldTest {
  id: string;
  testType: string;
  date: Date;
  results: Record<string, unknown> | null;
}

interface DailyCheckIn {
  date: Date;
  sleepQuality: number | null;
  sleepHours: number | null;
  fatigue: number | null;
  soreness: number | null;
  mood: number | null;
  restingHR: number | null;
  hrv: number | null;
}

/**
 * Calculate training zones from lactate test
 */
function calculateZonesFromTest(test: TestData): string {
  const lt1 = test.aerobicThreshold;
  const lt2 = test.anaerobicThreshold;

  if (!lt1 && !lt2) return '';

  let zones = '\n### Beräknade träningszoner';

  if (lt1?.hr && lt2?.hr && test.maxHR) {
    const maxHR = test.maxHR;
    zones += `
| Zon | Namn | HR-intervall | % maxHR |
|-----|------|--------------|---------|
| Z1 | Återhämtning | <${Math.round(lt1.hr * 0.9)} | <${Math.round((lt1.hr * 0.9 / maxHR) * 100)}% |
| Z2 | Aerob bas | ${Math.round(lt1.hr * 0.9)}-${lt1.hr} | ${Math.round((lt1.hr * 0.9 / maxHR) * 100)}-${Math.round((lt1.hr / maxHR) * 100)}% |
| Z3 | Tempo | ${lt1.hr}-${Math.round((lt1.hr + lt2.hr) / 2)} | ${Math.round((lt1.hr / maxHR) * 100)}-${Math.round(((lt1.hr + lt2.hr) / 2 / maxHR) * 100)}% |
| Z4 | Tröskel | ${Math.round((lt1.hr + lt2.hr) / 2)}-${lt2.hr} | ${Math.round(((lt1.hr + lt2.hr) / 2 / maxHR) * 100)}-${Math.round((lt2.hr / maxHR) * 100)}% |
| Z5 | VO2max | ${lt2.hr}-${maxHR} | ${Math.round((lt2.hr / maxHR) * 100)}-100% |`;
  }

  return zones;
}

/**
 * Build Running-specific context
 */
function buildRunningContext(athlete: AthleteData): string {
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

/**
 * Build HYROX-specific context
 */
function buildHyroxContext(athlete: AthleteData): string {
  const sp = athlete.sportProfile;
  const settings = sp?.hyroxSettings as HyroxSettings | null;

  let context = `\n## HYROX-SPECIFIK DATA\n`;

  if (settings?.targetCategory) {
    context += `- **Tävlingskategori**: ${settings.targetCategory}\n`;
  }
  if (settings?.targetTime) {
    context += `- **Måltid**: ${settings.targetTime}\n`;
  }

  // Station times
  if (settings?.stationTimes) {
    const st = settings.stationTimes;
    context += `\n### Stationstider\n`;
    context += `| Station | Tid | Benchmark* |\n`;
    context += `|---------|-----|------------|\n`;
    if (st.skiErg) context += `| SkiErg (1000m) | ${formatTime(st.skiErg)} | ~4:00 |\n`;
    if (st.sledPush) context += `| Sled Push (50m) | ${formatTime(st.sledPush)} | ~1:30 |\n`;
    if (st.sledPull) context += `| Sled Pull (50m) | ${formatTime(st.sledPull)} | ~1:30 |\n`;
    if (st.burpeeBroadJump) context += `| Burpee Broad Jump (80m) | ${formatTime(st.burpeeBroadJump)} | ~3:00 |\n`;
    if (st.rowing) context += `| Rowing (1000m) | ${formatTime(st.rowing)} | ~4:00 |\n`;
    if (st.farmersCarry) context += `| Farmers Carry (200m) | ${formatTime(st.farmersCarry)} | ~2:00 |\n`;
    if (st.lunges) context += `| Lunges (100m) | ${formatTime(st.lunges)} | ~3:30 |\n`;
    if (st.wallBalls) context += `| Wall Balls (100 reps) | ${formatTime(st.wallBalls)} | ~5:00 |\n`;
    context += `*Benchmark = Pro-nivå\n`;

    // Calculate total station time
    const totalStation = Object.values(st).reduce((sum, t) => sum + (t || 0), 0);
    context += `\n**Total stationstid**: ${formatTime(totalStation)}\n`;
  }

  // Run splits
  if (settings?.runSplits && settings.runSplits.length > 0) {
    const avgSplit = settings.runSplits.reduce((a, b) => a + b, 0) / settings.runSplits.length;
    context += `\n### Löpsplits (8 x 1km)\n`;
    context += `- **Snitt**: ${formatTime(avgSplit)}/km\n`;
    context += `- **Total löptid**: ${formatTime(avgSplit * 8)}\n`;
  }

  // Strength PRs
  if (settings?.strengthPRs) {
    const prs = settings.strengthPRs;
    context += `\n### Styrke-PRs\n`;
    if (prs.deadlift) context += `- **Marklyft**: ${prs.deadlift} kg\n`;
    if (prs.squat) context += `- **Knäböj**: ${prs.squat} kg\n`;
    if (prs.benchPress) context += `- **Bänkpress**: ${prs.benchPress} kg\n`;
  }

  // Identify limiters
  if (settings?.stationTimes) {
    const st = settings.stationTimes;
    const benchmarks = {
      skiErg: 240, sledPush: 90, sledPull: 90, burpeeBroadJump: 180,
      rowing: 240, farmersCarry: 120, lunges: 210, wallBalls: 300
    };

    const limiters: string[] = [];
    for (const [station, time] of Object.entries(st)) {
      if (time && benchmarks[station as keyof typeof benchmarks]) {
        const benchmark = benchmarks[station as keyof typeof benchmarks];
        if (time > benchmark * 1.3) {
          limiters.push(station);
        }
      }
    }

    if (limiters.length > 0) {
      context += `\n### Identifierade förbättringsområden\n`;
      context += limiters.map(l => `- ${formatStationName(l)}`).join('\n');
      context += '\n';
    }
  }

  return context;
}

/**
 * Build Cycling-specific context
 */
function buildCyclingContext(athlete: AthleteData): string {
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

/**
 * Build Swimming-specific context
 */
function buildSwimmingContext(athlete: AthleteData): string {
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

/**
 * Build Triathlon-specific context
 */
function buildTriathlonContext(athlete: AthleteData): string {
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

/**
 * Build Skiing-specific context
 */
function buildSkiingContext(athlete: AthleteData): string {
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

/**
 * Build General Fitness-specific context with nutrition
 */
function buildGeneralFitnessContext(athlete: AthleteData): string {
  const sp = athlete.sportProfile;
  const settings = sp?.generalFitnessSettings as GeneralFitnessSettings | null;

  let context = `\n## ALLMÄN FITNESS DATA\n`;

  if (settings?.goals && settings.goals.length > 0) {
    context += `### Mål\n`;
    for (const goal of settings.goals) {
      context += `- ${goal}\n`;
    }
  }

  if (settings?.activityTypes && settings.activityTypes.length > 0) {
    context += `\n### Prefererade aktiviteter\n`;
    context += settings.activityTypes.join(', ') + '\n';
  }

  if (settings?.limitations && settings.limitations.length > 0) {
    context += `\n### Begränsningar/Hänsyn\n`;
    for (const limitation of settings.limitations) {
      context += `- ${limitation}\n`;
    }
  }

  // Calculate age
  const age = athlete.birthDate
    ? Math.floor((Date.now() - new Date(athlete.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  // Check for measured body composition data
  const bodyComp = athlete.bodyCompositions?.[0];
  const measuredWeight = bodyComp?.weightKg || athlete.weight;
  const measuredBodyFat = bodyComp?.bodyFatPercent || settings?.currentBodyFat;

  // Full nutrition calculations if we have required data
  if (measuredWeight && athlete.height && age && athlete.gender) {
    const gender = athlete.gender as 'MALE' | 'FEMALE';

    // Determine activity level based on settings
    let activityLevel: ActivityLevel = 'MODERATE';
    if (settings?.activityTypes && settings.activityTypes.length > 3) {
      activityLevel = 'ACTIVE';
    } else if (!settings?.activityTypes || settings.activityTypes.length === 0) {
      activityLevel = 'LIGHT';
    }

    // Use measured BMR if available, otherwise calculate
    const bmr = bodyComp?.bmrKcal || calculateBMR({
      weightKg: measuredWeight,
      heightCm: athlete.height,
      ageYears: age,
      gender,
    });

    const tdee = calculateTDEE({
      weightKg: measuredWeight,
      heightCm: athlete.height,
      ageYears: age,
      gender,
      activityLevel,
    });

    const { bmi, category: bmiCategory } = calculateBMI(measuredWeight, athlete.height);
    const idealWeight = calculateIdealWeightRange(athlete.height, gender);

    context += `\n### Metabolism & Energibehov\n`;
    context += `- **BMR (Basalmetabolism)**: ${bmr} kcal/dag${bodyComp?.bmrKcal ? ' (mätt)' : ' (beräknat)'}\n`;
    context += `- **TDEE (Totalt dagligt energibehov)**: ${tdee} kcal/dag\n`;
    context += `- **Aktivitetsnivå**: ${translateActivityLevel(activityLevel)}\n`;

    context += `\n### Kroppssammansättning\n`;
    context += `- **Vikt**: ${measuredWeight} kg${bodyComp?.weightKg ? ' (senast mätt)' : ''}\n`;
    context += `- **Längd**: ${athlete.height} cm\n`;
    context += `- **BMI**: ${bmi} (${bmiCategory})\n`;
    context += `- **Idealvikt**: ${idealWeight.min}-${idealWeight.max} kg\n`;

    // Use bioimpedance data if available
    if (bodyComp) {
      if (bodyComp.bodyFatPercent) {
        const fatCategory = categorizeBodyFat(bodyComp.bodyFatPercent, gender, age);
        const fatMass = Math.round((measuredWeight * bodyComp.bodyFatPercent / 100) * 10) / 10;
        context += `- **Kroppsfett**: ${bodyComp.bodyFatPercent}% (${fatCategory}) - mätt\n`;
        context += `- **Fettmassa**: ${fatMass} kg\n`;
      }
      if (bodyComp.muscleMassKg) {
        context += `- **Muskelmassa**: ${bodyComp.muscleMassKg} kg - mätt\n`;
      }
      if (bodyComp.waterPercent) {
        context += `- **Vätska**: ${bodyComp.waterPercent}%\n`;
      }
      if (bodyComp.visceralFat) {
        context += `- **Visceralt fett**: ${bodyComp.visceralFat}\n`;
      }
      if (bodyComp.metabolicAge) {
        context += `- **Metabolisk ålder**: ${bodyComp.metabolicAge} år\n`;
      }
    } else if (measuredBodyFat) {
      // Fall back to settings body fat if no bioimpedance data
      const fatCategory = categorizeBodyFat(measuredBodyFat, gender, age);
      const fatMass = Math.round((measuredWeight * measuredBodyFat / 100) * 10) / 10;
      const leanMass = Math.round((measuredWeight - fatMass) * 10) / 10;

      context += `- **Kroppsfett**: ${measuredBodyFat}% (${fatCategory})\n`;
      context += `- **Fettmassa**: ${fatMass} kg\n`;
      context += `- **Fettfri massa**: ${leanMass} kg\n`;
    }

    // Weight goal calculations
    if (settings?.targetWeight && measuredWeight) {
      const weightDiff = measuredWeight - settings.targetWeight;
      const isLoss = weightDiff > 0;

      context += `\n### Viktmål\n`;
      context += `- **Målvikt**: ${settings.targetWeight} kg\n`;
      context += `- **Förändring**: ${isLoss ? '-' : '+'}${Math.abs(weightDiff).toFixed(1)} kg\n`;

      // Calculate timeline
      const timeline = calculateWeightTimeline(
        measuredWeight,
        settings.targetWeight,
        isLoss ? 0.5 : 0.25 // 0.5 kg/week loss, 0.25 kg/week gain
      );

      context += `- **Uppskattad tid**: ${timeline.weeks} veckor\n`;
      context += `- **Dagligt kaloribehov**: ${tdee + timeline.dailyDeficit} kcal\n`;

      // Generate nutrition plan
      const goal: CaloricGoal = isLoss ? 'MODERATE_LOSS' : 'MILD_GAIN';
      const profile = isLoss ? 'HIGH_PROTEIN' : 'BALANCED';
      const plan = generateNutritionPlan(
        {
          weightKg: measuredWeight,
          heightCm: athlete.height,
          ageYears: age,
          gender,
          activityLevel,
        },
        goal,
        profile
      );

      context += `\n### Näringsrekommendation\n`;
      context += `- **Målkalorier**: ${plan.targetCalories} kcal/dag\n`;
      context += `- **Protein**: ${plan.macros.protein.grams}g (${plan.macros.protein.percentage}%)\n`;
      context += `- **Kolhydrater**: ${plan.macros.carbs.grams}g (${plan.macros.carbs.percentage}%)\n`;
      context += `- **Fett**: ${plan.macros.fat.grams}g (${plan.macros.fat.percentage}%)\n`;

      if (plan.recommendations.length > 0) {
        context += `\n### Kostråd\n`;
        for (const rec of plan.recommendations.slice(0, 4)) {
          context += `- ${rec}\n`;
        }
      }

      if (plan.warnings.length > 0) {
        context += `\n### Varningar\n`;
        for (const warning of plan.warnings) {
          context += `⚠️ ${warning}\n`;
        }
      }
    }

    // Protein requirements
    const proteinGoal = settings?.goals?.some(g =>
      g.toLowerCase().includes('muskel') || g.toLowerCase().includes('styrka')
    ) ? 'MUSCLE_GAIN' : (settings?.targetWeight && settings.targetWeight < measuredWeight ? 'WEIGHT_LOSS' : 'SEDENTARY');

    const proteinReq = getProteinRequirements(
      measuredWeight,
      proteinGoal as 'SEDENTARY' | 'WEIGHT_LOSS' | 'MUSCLE_GAIN'
    );
    context += `\n### Proteinbehov\n`;
    context += `- **Rekommenderat**: ${proteinReq.recommended}g/dag\n`;
    context += `- **Intervall**: ${proteinReq.min}-${proteinReq.max}g/dag\n`;

    // Hydration
    const hydration = calculateHydration(measuredWeight, activityLevel);
    context += `\n### Vätskeintag\n`;
    context += `- **Dagligt behov**: ${Math.round(hydration.withActivityML / 100) / 10} liter\n`;

  } else {
    // Fallback simple context if missing data
    if (settings?.targetWeight || settings?.currentBodyFat) {
      context += `\n### Kroppssammansättning\n`;
      if (athlete.weight) context += `- **Nuvarande vikt**: ${athlete.weight} kg\n`;
      if (settings?.targetWeight) context += `- **Målvikt**: ${settings.targetWeight} kg\n`;
      if (settings?.currentBodyFat) context += `- **Fettprocent**: ${settings.currentBodyFat}%\n`;
    }

    if (athlete.weight && athlete.height) {
      const { bmi, category } = calculateBMI(athlete.weight, athlete.height);
      context += `- **BMI**: ${bmi} (${category})\n`;
    }
  }

  return context;
}

/**
 * Translate activity level to Swedish
 */
function translateActivityLevel(level: ActivityLevel): string {
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
 * Build readiness context from recent check-ins
 */
function buildReadinessContext(checkIns: DailyCheckIn[]): string {
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

/**
 * Build video analysis context from running gait analysis
 */
function buildVideoAnalysisContext(videoAnalyses: VideoAnalysis[]): string {
  if (!videoAnalyses || videoAnalyses.length === 0) return '';

  let context = `\n## VIDEOANALYSER - LÖPTEKNIK\n`;
  context += `*Följande data kommer från AI-driven videoanalys av atletens löpteknik:*\n`;

  // Check which camera angles are available for cross-referencing
  const availableAngles = videoAnalyses
    .filter(v => v.cameraAngle)
    .map(v => v.cameraAngle);
  const hasMultipleViews = new Set(availableAngles).size > 1;

  for (const video of videoAnalyses) {
    const date = new Date(video.createdAt).toLocaleDateString('sv-SE');
    const angleLabel = translateCameraAngle(video.cameraAngle);
    const angleInfo = angleLabel ? ` (${angleLabel})` : '';
    context += `\n### Analys från ${date}${angleInfo}\n`;

    // Add view-specific context
    if (video.cameraAngle) {
      context += getViewSpecificMetricsLabel(video.cameraAngle);
    }

    if (video.formScore) {
      context += `- **Teknisk formpoäng**: ${video.formScore}/100\n`;
    }

    // Issues and recommendations from general video analysis
    if (video.issuesDetected && video.issuesDetected.length > 0) {
      context += `- **Identifierade problem**: ${video.issuesDetected.join(', ')}\n`;
    }
    if (video.recommendations && video.recommendations.length > 0) {
      context += `- **Generella rekommendationer**: ${video.recommendations.join(', ')}\n`;
    }

    // Detailed running gait analysis
    const gait = video.runningGaitAnalysis;
    if (gait) {
      context += `\n#### Biomekanisk löpanalys\n`;

      // Cadence and timing metrics
      if (gait.cadence) {
        const cadenceStatus = gait.cadence < 170 ? '(låg - kan förbättras)' :
                              gait.cadence > 190 ? '(hög - bra effektivitet)' :
                              '(normal)';
        context += `- **Kadans**: ${gait.cadence} steg/min ${cadenceStatus}\n`;
      }
      if (gait.groundContactTime) {
        const gctStatus = gait.groundContactTime > 280 ? '(lång - indikerar ineffektivitet)' :
                          gait.groundContactTime < 200 ? '(kort - elitliknande)' :
                          '(normal)';
        context += `- **Markkontakttid**: ${gait.groundContactTime} ms ${gctStatus}\n`;
      }
      if (gait.verticalOscillation) {
        const voStatus = gait.verticalOscillation > 10 ? '(hög - energiläckage)' :
                         gait.verticalOscillation < 6 ? '(låg - effektivt)' :
                         '(normal)';
        context += `- **Vertikal oscillation**: ${gait.verticalOscillation} cm ${voStatus}\n`;
      }
      if (gait.strideLength) {
        context += `- **Steglängd**: ${gait.strideLength} m\n`;
      }
      if (gait.footStrikePattern) {
        context += `- **Fotisättning**: ${translateFootStrike(gait.footStrikePattern)}\n`;
      }

      // Asymmetry analysis - critical for injury prevention
      if (gait.asymmetryPercent !== null) {
        const asymmetryStatus = gait.asymmetryPercent > 8 ? '⚠️ HÖG ASYMMETRI - skaderisk' :
                                gait.asymmetryPercent > 4 ? '⚡ Måttlig asymmetri' :
                                '✅ Balanserad';
        context += `\n#### Asymmetrianalys\n`;
        context += `- **Asymmetrigrad**: ${gait.asymmetryPercent}% ${asymmetryStatus}\n`;
        if (gait.leftContactTime && gait.rightContactTime) {
          const longerSide = gait.leftContactTime > gait.rightContactTime ? 'vänster' : 'höger';
          context += `- **Markkontakt vänster/höger**: ${gait.leftContactTime}/${gait.rightContactTime} ms (längre på ${longerSide} sida)\n`;
        }
      }

      // Injury risk assessment
      if (gait.injuryRiskLevel) {
        context += `\n#### Skaderiskbedömning\n`;
        const riskEmoji = gait.injuryRiskLevel === 'HIGH' ? '🔴' :
                          gait.injuryRiskLevel === 'MODERATE' ? '🟡' : '🟢';
        context += `- **Skaderisk**: ${riskEmoji} ${translateRiskLevel(gait.injuryRiskLevel)}`;
        if (gait.injuryRiskScore) {
          context += ` (${gait.injuryRiskScore}/100)`;
        }
        context += '\n';
        if (gait.injuryRiskFactors && gait.injuryRiskFactors.length > 0) {
          context += `- **Riskfaktorer**: ${gait.injuryRiskFactors.join(', ')}\n`;
        }
      }

      // Efficiency metrics
      if (gait.runningEfficiency) {
        context += `\n#### Löpeffektivitet\n`;
        context += `- **Effektivitetspoäng**: ${gait.runningEfficiency}%\n`;
      }
      if (gait.energyLeakages && gait.energyLeakages.length > 0) {
        context += `- **Identifierade energiläckage**: ${gait.energyLeakages.join(', ')}\n`;
      }

      // Coaching recommendations - critical for program design
      if (gait.coachingCues && gait.coachingCues.length > 0) {
        context += `\n#### Coachingråd för träningen\n`;
        for (const cue of gait.coachingCues) {
          context += `- ${cue}\n`;
        }
      }

      if (gait.drillRecommendations && gait.drillRecommendations.length > 0) {
        context += `\n#### Rekommenderade tekniska övningar\n`;
        for (const drill of gait.drillRecommendations) {
          context += `- ${drill}\n`;
        }
      }

      if (gait.summary) {
        context += `\n#### Sammanfattning\n${gait.summary}\n`;
      }
    }
  }

  // Add cross-referencing guidance when multiple views are available
  if (hasMultipleViews) {
    context += `\n### Korsreferens - Flera kameraperspektiv tillgängliga\n`;
    context += `*Atleten har analyserats från flera vinklar. Korrelera fynd mellan perspektiven:*\n`;
    context += `- **Front + Sida**: Kontrollera att knäspårning (front) matchar fotisättning (sida)\n`;
    context += `- **Front + Bak**: Jämför höftfall från båda perspektiv för fullständig symmetrianalys\n`;
    context += `- **Sida + Bak**: Korrelera gluteal aktivering (bak) med höftextension (sida)\n`;
    context += `- Vid motsägande data, prioritera sidovyn för sagittalplansmekanik och frontvyn för frontalplansmekanik\n`;
  }

  // Add guidance for using video analysis in program design
  context += `\n### Hur använda videoanalysdata i programdesign\n`;
  context += `- Hög asymmetri (>8%) → Inkludera unilaterala styrkeövningar och balansarbete\n`;
  context += `- Lång markkontakttid → Lägg till plyometriska övningar och kadensdrills\n`;
  context += `- Hög vertikal oscillation → Fokusera på core-styrka och höftflexibilitet\n`;
  context += `- Identifierade skaderisker → Anpassa volym och intensitet, lägg till preventionsövningar\n`;
  context += `- Använd rekommenderade övningar som uppvärmning eller teknikpass\n`;

  return context;
}

/**
 * Translate foot strike pattern to Swedish
 */
function translateFootStrike(pattern: string): string {
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
function translateRiskLevel(level: string): string {
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
function translateCameraAngle(angle: string | null): string {
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
function getViewSpecificMetricsLabel(angle: string): string {
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
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatSwimTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatStationName(station: string): string {
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

/**
 * Main function: Build complete sport-specific context
 */
export function buildSportSpecificContext(athlete: AthleteData): string {
  const primarySport = athlete.sportProfile?.primarySport;

  if (!primarySport) {
    return '';
  }

  // Get sport-specific prompt info
  const sportPrompt = SPORT_PROMPTS[primarySport];

  let context = `\n${sportPrompt.systemContext}\n`;
  context += `\n${sportPrompt.zoneGuidance}\n`;

  // Add sport-specific data
  switch (primarySport) {
    case 'RUNNING':
      context += buildRunningContext(athlete);
      // Include video analysis for running gait
      if (athlete.videoAnalyses && athlete.videoAnalyses.length > 0) {
        context += buildVideoAnalysisContext(athlete.videoAnalyses);
      }
      break;
    case 'HYROX':
      context += buildHyroxContext(athlete);
      // Include running video analysis for HYROX (has running component)
      if (athlete.videoAnalyses && athlete.videoAnalyses.length > 0) {
        context += buildVideoAnalysisContext(athlete.videoAnalyses);
      }
      break;
    case 'CYCLING':
      context += buildCyclingContext(athlete);
      break;
    case 'SWIMMING':
      context += buildSwimmingContext(athlete);
      break;
    case 'TRIATHLON':
      context += buildTriathlonContext(athlete);
      context += buildSwimmingContext(athlete); // Include swim data
      context += buildCyclingContext(athlete); // Include cycling data
      context += buildRunningContext(athlete); // Include running data
      // Include video analysis for the running component
      if (athlete.videoAnalyses && athlete.videoAnalyses.length > 0) {
        context += buildVideoAnalysisContext(athlete.videoAnalyses);
      }
      break;
    case 'SKIING':
      context += buildSkiingContext(athlete);
      break;
    case 'GENERAL_FITNESS':
      context += buildGeneralFitnessContext(athlete);
      break;
    case 'STRENGTH':
      // Strength uses general fitness context + strength experience
      context += buildGeneralFitnessContext(athlete);
      if (athlete.sportProfile?.strengthExperience) {
        context += `\n- **Styrketräningserfarenhet**: ${athlete.sportProfile.strengthExperience}\n`;
      }
      break;
  }

  // Add readiness context if available
  if (athlete.dailyCheckIns && athlete.dailyCheckIns.length > 0) {
    context += buildReadinessContext(athlete.dailyCheckIns);
  }

  // Add session types and periodization notes
  context += `\n### Rekommenderade passtyper\n`;
  for (const session of sportPrompt.sessionTypes.slice(0, 6)) {
    context += `- ${session}\n`;
  }

  context += `\n${sportPrompt.periodizationNotes}\n`;

  return context;
}

export type { AthleteData, SportProfile };