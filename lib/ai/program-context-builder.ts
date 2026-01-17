/**
 * Program Context Builder for AI Studio
 *
 * Compiles wizard form data, athlete tests, profile, and documents
 * into a comprehensive context for AI program generation.
 */

import { SportType } from '@prisma/client'
import { METHODOLOGIES } from './program-prompts'
import type { FitnessEstimate } from '@/lib/training/fitness-estimation'

// Types for wizard form data
export interface WizardFormData {
  // Basic info
  sport: SportType
  goal: string
  dataSource: 'TEST' | 'PROFILE' | 'MANUAL'
  clientId: string
  clientName: string

  // Program settings
  testId?: string
  durationWeeks: number
  targetRaceDate?: Date
  sessionsPerWeek: number
  methodology?: string

  // Manual values
  manualFtp?: number
  manualCss?: string
  manualVdot?: number

  // Sport-specific
  weeklyHours?: number
  bikeType?: string
  technique?: string
  poolLength?: string

  // Athlete profile
  experienceLevel?: string
  currentWeeklyVolume?: number

  // Race results
  recentRaceDistance?: string
  recentRaceTime?: string
  targetTime?: string

  // Training additions
  includeStrength: boolean
  strengthSessionsPerWeek?: number
  coreSessionsPerWeek?: number
  alternativeTrainingSessionsPerWeek?: number
  scheduleStrengthAfterRunning?: boolean
  scheduleCoreAfterRunning?: boolean

  // Equipment
  hasLactateMeter?: boolean
  hasPowerMeter?: boolean

  // HYROX specific
  hyroxStationTimes?: {
    skierg?: string
    sledPush?: string
    sledPull?: string
    burpeeBroadJump?: string
    rowing?: string
    farmersCarry?: string
    sandbagLunge?: string
    wallBalls?: string
    averageRunPace?: string
  }
  hyroxDivision?: string
  hyroxGender?: string
  hyroxBodyweight?: number

  // Strength PRs
  strengthPRs?: {
    deadlift?: number
    backSquat?: number
    benchPress?: number
    overheadPress?: number
    barbellRow?: number
    pullUps?: number
  }

  notes?: string
}

// Test data from database
export interface TestData {
  id: string
  testDate: Date
  testType: string
  maxHR: number | null
  vo2max: number | null
  maxLactate?: number | null
  aerobicThreshold: { hr?: number; heartRate?: number; value?: number; unit?: string; lactate?: number } | null
  anaerobicThreshold: { hr?: number; heartRate?: number; value?: number; unit?: string; lactate?: number } | null
  trainingZones?: Array<{
    zone: number
    hrMin: number
    hrMax: number
    percentMin: number
    percentMax: number
    effect?: string
  }> | null
}

// Race result data
export interface RaceResultData {
  raceName: string | null
  raceDate: Date
  distance: string
  timeMinutes: number
  timeFormatted: string | null
  vdot: number | null
  avgHeartRate?: number | null
}

// Athlete profile data
export interface AthleteProfileData {
  name: string
  gender?: string | null
  birthDate?: Date | null
  height?: number | null
  weight?: number | null
  sportProfile?: {
    primarySport: SportType
    runningExperience?: string | null
    cyclingExperience?: string | null
    swimmingExperience?: string | null
    strengthExperience?: string | null
    runningSettings?: Record<string, unknown> | null
    cyclingSettings?: Record<string, unknown> | null
    swimmingSettings?: Record<string, unknown> | null
  } | null
}

// Injury data
export interface InjuryData {
  injuryType: string
  status: string
  painLevel: number
  affectedArea?: string | null
  assessmentDate: Date
}

// Full context for AI
export interface ProgramContext {
  wizardData: WizardFormData
  athlete?: AthleteProfileData
  recentTests?: TestData[]
  raceResults?: RaceResultData[]
  injuries?: InjuryData[]
  documentIds?: string[]
  fitnessEstimate?: FitnessEstimate  // Fitness level for zone width adjustment
}

/**
 * Build a comprehensive AI prompt from program context
 */
export function buildProgramPrompt(context: ProgramContext): string {
  const { wizardData, athlete, recentTests, raceResults, injuries } = context

  let prompt = '# PROGRAMFÖRFRÅGAN FÖR AI STUDIO\n\n'

  // Athlete Info
  prompt += '## ATLET\n'
  prompt += `- **Namn**: ${wizardData.clientName}\n`

  if (athlete) {
    if (athlete.gender) prompt += `- **Kön**: ${athlete.gender === 'MALE' ? 'Man' : 'Kvinna'}\n`
    if (athlete.birthDate) {
      const age = Math.floor((Date.now() - new Date(athlete.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      prompt += `- **Ålder**: ${age} år\n`
    }
    if (athlete.height) prompt += `- **Längd**: ${athlete.height} cm\n`
    if (athlete.weight) prompt += `- **Vikt**: ${athlete.weight} kg\n`
  }

  // Experience
  if (wizardData.experienceLevel) {
    const levels: Record<string, string> = {
      beginner: 'Nybörjare',
      intermediate: 'Medel',
      advanced: 'Avancerad'
    }
    prompt += `- **Erfarenhetsnivå**: ${levels[wizardData.experienceLevel] || wizardData.experienceLevel}\n`
  }
  if (wizardData.currentWeeklyVolume) prompt += `- **Nuvarande veckovolym**: ${wizardData.currentWeeklyVolume} km/vecka\n`

  // Fitness Level (for zone width adjustment)
  if (context.fitnessEstimate) {
    const fitnessLabels: Record<string, string> = {
      UNTRAINED: 'Otränad',
      BEGINNER: 'Nybörjare',
      RECREATIONAL: 'Motionär',
      TRAINED: 'Tränad',
      WELL_TRAINED: 'Vältränad',
      ELITE: 'Elit'
    }
    const confidenceLabels: Record<string, string> = {
      HIGH: 'Hög',
      MEDIUM: 'Medel',
      LOW: 'Låg'
    }

    prompt += '\n## FITNESSNIVÅ\n'
    prompt += `- **Nivå**: ${fitnessLabels[context.fitnessEstimate.level] || context.fitnessEstimate.level}\n`
    if (context.fitnessEstimate.estimatedVO2max) {
      prompt += `- **Uppskattad VO2max**: ${context.fitnessEstimate.estimatedVO2max.toFixed(1)} ml/kg/min\n`
    }
    prompt += `- **Konfidens**: ${confidenceLabels[context.fitnessEstimate.confidence] || context.fitnessEstimate.confidence}\n`

    prompt += '\n### Zonbredd-kontext (Accordion-effekten)\n'
    prompt += `- **LT1 (aerob tröskel)**: ~${context.fitnessEstimate.lt1PercentHRmax}% av maxpuls\n`
    prompt += `- **LT2 (anaerob tröskel)**: ~${context.fitnessEstimate.lt2PercentHRmax}% av maxpuls\n`

    // Add walk/run recommendation for beginners
    if (context.fitnessEstimate.level === 'UNTRAINED' || context.fitnessEstimate.level === 'BEGINNER') {
      prompt += '\n**VIKTIGT**: Atleten har en smal zon 2, vilket innebär att lätt jogging ofta\n'
      prompt += 'hamnar i för hög intensitet. Överväg att inkludera gång/löp-intervaller\n'
      prompt += '(t.ex. 2 min löpning, 1 min gång) för lågintensiva pass.\n'
    }
  }

  // Program Request
  prompt += '\n## PROGRAMFÖRFRÅGAN\n'
  prompt += `- **Sport**: ${getSportLabel(wizardData.sport)}\n`
  prompt += `- **Mål**: ${getGoalLabel(wizardData.goal)}\n`
  prompt += `- **Längd**: ${wizardData.durationWeeks} veckor\n`
  prompt += `- **Pass per vecka**: ${wizardData.sessionsPerWeek}\n`

  if (wizardData.targetRaceDate) {
    prompt += `- **Tävlingsdatum**: ${new Date(wizardData.targetRaceDate).toLocaleDateString('sv-SE')}\n`
  }
  if (wizardData.targetTime) {
    prompt += `- **Måltid**: ${wizardData.targetTime}\n`
  }

  // Methodology
  if (wizardData.methodology && wizardData.methodology !== 'AUTO') {
    const methodology = METHODOLOGIES[wizardData.methodology as keyof typeof METHODOLOGIES]
    if (methodology) {
      prompt += `\n### Träningsmetodik: ${methodology.name}\n`
      prompt += `${methodology.description}\n`
      if (methodology.keyPrinciples && methodology.keyPrinciples.length > 0) {
        prompt += `\n**Nyckelprinciper:**\n`
        for (const principle of methodology.keyPrinciples) {
          prompt += `- ${principle}\n`
        }
      }
    }
  }

  // Recent Test Data
  if (recentTests && recentTests.length > 0) {
    const latestTest = recentTests[0]
    prompt += '\n## SENASTE TESTRESULTAT\n'
    prompt += `- **Testdatum**: ${new Date(latestTest.testDate).toLocaleDateString('sv-SE')}\n`
    prompt += `- **Testtyp**: ${latestTest.testType}\n`

    if (latestTest.vo2max) prompt += `- **VO2max**: ${latestTest.vo2max.toFixed(1)} ml/kg/min\n`
    if (latestTest.maxHR) prompt += `- **Max puls**: ${latestTest.maxHR} bpm\n`
    if (latestTest.maxLactate) prompt += `- **Max laktat**: ${latestTest.maxLactate.toFixed(1)} mmol/L\n`

    // Thresholds
    const lt1 = latestTest.aerobicThreshold
    const lt2 = latestTest.anaerobicThreshold

    if (lt1 || lt2) {
      prompt += '\n### Tröskelvärden\n'
      if (lt1) {
        const lt1Hr = lt1.heartRate || lt1.hr
        prompt += `- **LT1 (Aerob tröskel)**: ${lt1Hr ? `${lt1Hr} bpm` : '-'}`
        if (lt1.lactate) prompt += ` @ ${lt1.lactate} mmol/L`
        prompt += '\n'
      }
      if (lt2) {
        const lt2Hr = lt2.heartRate || lt2.hr
        prompt += `- **LT2 (Anaerob tröskel)**: ${lt2Hr ? `${lt2Hr} bpm` : '-'}`
        if (lt2.lactate) prompt += ` @ ${lt2.lactate} mmol/L`
        prompt += '\n'
      }
    }

    // Training Zones
    if (latestTest.trainingZones && latestTest.trainingZones.length > 0) {
      prompt += '\n### Träningszoner\n'
      prompt += '| Zon | HR-intervall | % maxHR | Beskrivning |\n'
      prompt += '|-----|--------------|---------|-------------|\n'
      for (const zone of latestTest.trainingZones) {
        prompt += `| Z${zone.zone} | ${zone.hrMin}-${zone.hrMax} bpm | ${zone.percentMin}-${zone.percentMax}% | ${zone.effect || ''} |\n`
      }
    }
  }

  // Race Results
  if (raceResults && raceResults.length > 0) {
    prompt += '\n## TÄVLINGSRESULTAT\n'
    for (const race of raceResults.slice(0, 5)) {
      prompt += `- **${race.raceName || race.distance}** (${new Date(race.raceDate).toLocaleDateString('sv-SE')}): ${race.timeFormatted}`
      if (race.vdot) prompt += ` (VDOT: ${race.vdot.toFixed(1)})`
      prompt += '\n'
    }

    // Best VDOT
    const bestVdot = raceResults.reduce((max, r) => Math.max(max, r.vdot || 0), 0)
    if (bestVdot > 0) {
      prompt += `\n**Bästa VDOT**: ${bestVdot.toFixed(1)}\n`
    }
  }

  // Recent race result from wizard
  if (wizardData.recentRaceDistance && wizardData.recentRaceDistance !== 'NONE' && wizardData.recentRaceTime) {
    prompt += `\n### Senaste tävlingsresultat (från formuläret)\n`
    prompt += `- **Distans**: ${wizardData.recentRaceDistance}\n`
    prompt += `- **Tid**: ${wizardData.recentRaceTime}\n`
  }

  // Training Additions
  if (wizardData.includeStrength || (wizardData.coreSessionsPerWeek && wizardData.coreSessionsPerWeek > 0)) {
    prompt += '\n## TILLÄGG I PROGRAMMET\n'

    if (wizardData.includeStrength) {
      prompt += `- **Styrketräning**: ${wizardData.strengthSessionsPerWeek || 2}x/vecka\n`
      if (wizardData.scheduleStrengthAfterRunning) {
        prompt += `  - Schemaläggs efter löpning\n`
      }
    }

    if (wizardData.coreSessionsPerWeek && wizardData.coreSessionsPerWeek > 0) {
      prompt += `- **Core-träning**: ${wizardData.coreSessionsPerWeek}x/vecka\n`
      if (wizardData.scheduleCoreAfterRunning) {
        prompt += `  - Schemaläggs efter löpning\n`
      }
    }

    if (wizardData.alternativeTrainingSessionsPerWeek && wizardData.alternativeTrainingSessionsPerWeek > 0) {
      prompt += `- **Alternativ träning**: ${wizardData.alternativeTrainingSessionsPerWeek}x/vecka\n`
    }
  }

  // Equipment
  if (wizardData.hasLactateMeter || wizardData.hasPowerMeter) {
    prompt += '\n## UTRUSTNING\n'
    if (wizardData.hasLactateMeter) prompt += '- Laktatmätare (Norwegian-metoden möjlig)\n'
    if (wizardData.hasPowerMeter) prompt += '- Wattmätare\n'
  }

  // HYROX specific
  if (wizardData.sport === 'HYROX' && wizardData.hyroxStationTimes) {
    prompt += '\n## HYROX-SPECIFIKT\n'

    if (wizardData.hyroxDivision) prompt += `- **Division**: ${wizardData.hyroxDivision}\n`
    if (wizardData.hyroxGender) prompt += `- **Kön**: ${wizardData.hyroxGender === 'male' ? 'Man' : 'Kvinna'}\n`
    if (wizardData.hyroxBodyweight) prompt += `- **Kroppsvikt**: ${wizardData.hyroxBodyweight} kg\n`

    const st = wizardData.hyroxStationTimes
    const hasStationTimes = Object.values(st).some(v => v)

    if (hasStationTimes) {
      prompt += '\n### Stationstider\n'
      if (st.skierg) prompt += `- SkiErg 1km: ${st.skierg}\n`
      if (st.sledPush) prompt += `- Sled Push 50m: ${st.sledPush}\n`
      if (st.sledPull) prompt += `- Sled Pull 50m: ${st.sledPull}\n`
      if (st.burpeeBroadJump) prompt += `- Burpee Broad Jump 80m: ${st.burpeeBroadJump}\n`
      if (st.rowing) prompt += `- Rowing 1km: ${st.rowing}\n`
      if (st.farmersCarry) prompt += `- Farmers Carry 200m: ${st.farmersCarry}\n`
      if (st.sandbagLunge) prompt += `- Sandbag Lunge 100m: ${st.sandbagLunge}\n`
      if (st.wallBalls) prompt += `- Wall Balls: ${st.wallBalls}\n`
      if (st.averageRunPace) prompt += `- Genomsnittligt löptempo: ${st.averageRunPace}/km\n`
    }
  }

  // Strength PRs
  if (wizardData.strengthPRs) {
    const prs = wizardData.strengthPRs
    const hasPRs = Object.values(prs).some(v => v)

    if (hasPRs) {
      prompt += '\n## STYRKE-PRs (1RM)\n'
      if (prs.deadlift) prompt += `- **Marklyft**: ${prs.deadlift} kg\n`
      if (prs.backSquat) prompt += `- **Knäböj**: ${prs.backSquat} kg\n`
      if (prs.benchPress) prompt += `- **Bänkpress**: ${prs.benchPress} kg\n`
      if (prs.overheadPress) prompt += `- **Axelpress**: ${prs.overheadPress} kg\n`
      if (prs.barbellRow) prompt += `- **Skivstångsrodd**: ${prs.barbellRow} kg\n`
      if (prs.pullUps) prompt += `- **Chins**: ${prs.pullUps} reps\n`
    }
  }

  // Injuries
  if (injuries && injuries.length > 0) {
    const activeInjuries = injuries.filter(i => i.status !== 'RESOLVED')
    if (activeInjuries.length > 0) {
      prompt += '\n## AKTIVA SKADOR/HÄNSYN\n'
      for (const injury of activeInjuries) {
        prompt += `- **${injury.injuryType}** (${injury.affectedArea || 'okänt område'}): `
        prompt += `Smärtnivå ${injury.painLevel}/10, Status: ${injury.status}\n`
      }
    }
  }

  // Notes
  if (wizardData.notes) {
    prompt += `\n## ANTECKNINGAR FRÅN COACHEN\n${wizardData.notes}\n`
  }

  // Instructions for AI
  prompt += '\n---\n\n'
  prompt += '## INSTRUKTIONER\n'
  prompt += 'Skapa ett detaljerat träningsprogram baserat på ovanstående information. Programmet ska innehålla:\n\n'
  prompt += '1. **Periodisering** med tydliga faser (bas, uppbyggnad, specifik, taper)\n'
  prompt += '2. **Veckoscheman** med specifika pass för varje dag\n'
  prompt += '3. **Detaljerade pass** med:\n'
  prompt += '   - Tempo/intensitet för varje segment (min/km eller puls)\n'
  prompt += '   - Duration och distans\n'
  prompt += '   - Pulszon eller tempo-zon\n'
  prompt += '   - Uppvärmning och nedvarvning\n'
  prompt += '4. **Progression** från vecka till vecka\n'
  prompt += '5. **Anpassningar** baserat på atletens nivå och utrustning\n\n'
  prompt += 'Om du vill kan jag förklara mer om programmet eller justera det baserat på feedback.\n'
  prompt += '\n---\n\n'
  prompt += '## FORMAT FÖR DETALJERADE PASS\n'
  prompt += 'När du beskriver pass, inkludera gärna segment-struktur med följande detaljer:\n\n'
  prompt += '**Löppass exempel:**\n'
  prompt += '- **Uppvärmning**: 10-15 min @ Zon 1-2 (~6:00-6:30/km, HR 120-140)\n'
  prompt += '- **Huvudpass**: 40 min @ Zon 3 (5:15/km, HR 155-165) eller intervaller som "5×1000m @ 4:30/km med 2 min vila"\n'
  prompt += '- **Nedvarvning**: 10 min @ Zon 1 (~6:30/km, HR 110-130)\n\n'
  prompt += '**Cykelpass exempel:**\n'
  prompt += '- **Uppvärmning**: 15 min @ Zon 1-2 (< 55% FTP, 100-130W)\n'
  prompt += '- **Huvudpass**: 2×20 min @ Zon 4 (95-105% FTP, 250-275W) med 5 min vila\n'
  prompt += '- **Nedvarvning**: 10 min @ Zon 1 (< 55% FTP)\n\n'
  prompt += '**Intensitetszoner (baserat på testresultat om tillgängliga):**\n'
  prompt += '- Zon 1: Återhämtning (50-60% maxHR)\n'
  prompt += '- Zon 2: Aerob bas (60-70% maxHR)\n'
  prompt += '- Zon 3: Tempo/Tröskel (70-80% maxHR)\n'
  prompt += '- Zon 4: Anaerob tröskel (80-90% maxHR)\n'
  prompt += '- Zon 5: VO2max/Intervall (90-100% maxHR)\n'

  return prompt
}

/**
 * Store program context in sessionStorage for transfer to AI Studio
 */
export function storeProgramContext(context: ProgramContext): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('ai-studio-program-context', JSON.stringify(context))
  }
}

/**
 * Retrieve program context from sessionStorage
 */
export function getProgramContext(): ProgramContext | null {
  if (typeof window === 'undefined') return null

  const stored = sessionStorage.getItem('ai-studio-program-context')
  if (!stored) return null

  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

/**
 * Clear stored program context
 */
export function clearProgramContext(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('ai-studio-program-context')
  }
}

// Helper functions
function getSportLabel(sport: SportType): string {
  const labels: Record<string, string> = {
    RUNNING: 'Löpning',
    CYCLING: 'Cykling',
    STRENGTH: 'Styrka',
    SKIING: 'Skidåkning',
    SWIMMING: 'Simning',
    TRIATHLON: 'Triathlon',
    HYROX: 'HYROX',
    GENERAL_FITNESS: 'Allmän Fitness',
  }
  return labels[sport] || sport
}

function getGoalLabel(goal: string): string {
  const labels: Record<string, string> = {
    marathon: 'Maraton',
    'half-marathon': 'Halvmaraton',
    '10k': '10 km',
    '5k': '5 km',
    'ftp-builder': 'FTP-uppbyggnad',
    'base-builder': 'Basbyggnad',
    'gran-fondo': 'Gran Fondo',
    sprint: 'Sprint',
    olympic: 'Olympisk distans',
    'half-ironman': 'Halv-Ironman',
    ironman: 'Ironman',
    pro: 'Pro Division',
    'age-group': 'Age Group',
    doubles: 'Doubles',
    vasaloppet: 'Vasaloppet',
    custom: 'Anpassat',
  }
  return labels[goal] || goal
}
