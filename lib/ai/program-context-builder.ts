/**
 * Program Context Builder for AI Studio
 *
 * Compiles wizard form data, athlete tests, profile, and documents
 * into a comprehensive context for AI program generation.
 */

import { SportType } from '@prisma/client'
import { METHODOLOGIES } from './program-prompts'
import type { FitnessEstimate } from '@/lib/training/fitness-estimation'
import { buildTeamSportPromptSection } from '@/lib/program-generator/team-sports/prompt-section'

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

  hockeySettings?: Record<string, unknown> | null
  footballSettings?: Record<string, unknown> | null
  basketballSettings?: Record<string, unknown> | null
  handballSettings?: Record<string, unknown> | null
  floorballSettings?: Record<string, unknown> | null
  volleyballSettings?: Record<string, unknown> | null
  tennisSettings?: Record<string, unknown> | null
  padelSettings?: Record<string, unknown> | null

  notes?: string
  locale?: 'en' | 'sv'
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
    hockeySettings?: Record<string, unknown> | null
    footballSettings?: Record<string, unknown> | null
    basketballSettings?: Record<string, unknown> | null
    handballSettings?: Record<string, unknown> | null
    floorballSettings?: Record<string, unknown> | null
    volleyballSettings?: Record<string, unknown> | null
    tennisSettings?: Record<string, unknown> | null
    padelSettings?: Record<string, unknown> | null
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
  locale?: 'en' | 'sv'
  athlete?: AthleteProfileData
  recentTests?: TestData[]
  raceResults?: RaceResultData[]
  injuries?: InjuryData[]
  documentIds?: string[]
  fitnessEstimate?: FitnessEstimate  // Fitness level for zone width adjustment
  hockeySettings?: Record<string, unknown> | null
  footballSettings?: Record<string, unknown> | null
  basketballSettings?: Record<string, unknown> | null
  handballSettings?: Record<string, unknown> | null
  floorballSettings?: Record<string, unknown> | null
  volleyballSettings?: Record<string, unknown> | null
  tennisSettings?: Record<string, unknown> | null
  padelSettings?: Record<string, unknown> | null
}

/**
 * Build a comprehensive AI prompt from program context
 */
export function buildProgramPrompt(context: ProgramContext): string {
  const { wizardData, athlete, recentTests, raceResults, injuries } = context
  const locale = context.locale === 'sv' || wizardData.locale === 'sv' ? 'sv' : 'en'
  const outputLanguage = locale === 'sv' ? 'Swedish' : 'English'
  const t = (sv: string, en: string) => (locale === 'sv' ? sv : en)
  const formatDate = (date: Date) => new Date(date).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US')

  let prompt = locale === 'sv' ? '# PROGRAMFÖRFRÅGAN FÖR AI STUDIO\n\n' : '# PROGRAM REQUEST FOR AI STUDIO\n\n'
  prompt += `IMPORTANT: Generate the finished training program and all athlete-facing copy in ${outputLanguage}.\n\n`

  // Athlete Info
  prompt += locale === 'sv' ? '## ATLET\n' : '## ATHLETE\n'
  prompt += `- **${t('Namn', 'Name')}**: ${wizardData.clientName}\n`

  if (athlete) {
    if (athlete.gender) {
      prompt += `- **${t('Kön', 'Gender')}**: ${athlete.gender === 'MALE' ? t('Man', 'Male') : t('Kvinna', 'Female')}\n`
    }
    if (athlete.birthDate) {
      const age = Math.floor((Date.now() - new Date(athlete.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      prompt += `- **${t('Ålder', 'Age')}**: ${age} ${t('år', 'years')}\n`
    }
    if (athlete.height) prompt += `- **${t('Längd', 'Height')}**: ${athlete.height} cm\n`
    if (athlete.weight) prompt += `- **${t('Vikt', 'Weight')}**: ${athlete.weight} kg\n`
  }

  // Experience
  if (wizardData.experienceLevel) {
    const levels: Record<string, string> = {
      beginner: t('Nybörjare', 'Beginner'),
      intermediate: t('Medel', 'Intermediate'),
      advanced: t('Avancerad', 'Advanced')
    }
    prompt += `- **${t('Erfarenhetsnivå', 'Experience level')}**: ${levels[wizardData.experienceLevel] || wizardData.experienceLevel}\n`
  }
  if (wizardData.currentWeeklyVolume) prompt += `- **${t('Nuvarande veckovolym', 'Current weekly volume')}**: ${wizardData.currentWeeklyVolume} ${t('km/vecka', 'km/week')}\n`

  // Fitness Level (for zone width adjustment)
  if (context.fitnessEstimate) {
    const fitnessLabels: Record<string, string> = {
      UNTRAINED: t('Otränad', 'Untrained'),
      BEGINNER: t('Nybörjare', 'Beginner'),
      RECREATIONAL: t('Motionär', 'Recreational'),
      TRAINED: t('Tränad', 'Trained'),
      WELL_TRAINED: t('Vältränad', 'Well trained'),
      ELITE: t('Elit', 'Elite')
    }
    const confidenceLabels: Record<string, string> = {
      HIGH: t('Hög', 'High'),
      MEDIUM: t('Medel', 'Medium'),
      LOW: t('Låg', 'Low')
    }

    prompt += `\n## ${t('FITNESSNIVÅ', 'FITNESS LEVEL')}\n`
    prompt += `- **${t('Nivå', 'Level')}**: ${fitnessLabels[context.fitnessEstimate.level] || context.fitnessEstimate.level}\n`
    if (context.fitnessEstimate.estimatedVO2max) {
      prompt += `- **${t('Uppskattad VO2max', 'Estimated VO2max')}**: ${context.fitnessEstimate.estimatedVO2max.toFixed(1)} ml/kg/min\n`
    }
    prompt += `- **${t('Konfidens', 'Confidence')}**: ${confidenceLabels[context.fitnessEstimate.confidence] || context.fitnessEstimate.confidence}\n`

    prompt += `\n### ${t('Zonbredd-kontext (Accordion-effekten)', 'Zone-width context (accordion effect)')}\n`
    prompt += `- **LT1 (${t('aerob tröskel', 'aerobic threshold')})**: ~${context.fitnessEstimate.lt1PercentHRmax}% ${t('av maxpuls', 'of max HR')}\n`
    prompt += `- **LT2 (${t('anaerob tröskel', 'anaerobic threshold')})**: ~${context.fitnessEstimate.lt2PercentHRmax}% ${t('av maxpuls', 'of max HR')}\n`

    // Add walk/run recommendation for beginners
    if (context.fitnessEstimate.level === 'UNTRAINED' || context.fitnessEstimate.level === 'BEGINNER') {
      prompt += locale === 'sv'
        ? '\n**VIKTIGT**: Atleten har en smal zon 2, vilket innebär att lätt jogging ofta\nhamnar i för hög intensitet. Överväg att inkludera gång/löp-intervaller\n(t.ex. 2 min löpning, 1 min gång) för lågintensiva pass.\n'
        : '\n**IMPORTANT**: The athlete has a narrow zone 2, which means easy jogging often\nlands at too high an intensity. Consider walk/run intervals\n(for example 2 min running, 1 min walking) for low-intensity sessions.\n'
    }
  }

  // Program Request
  prompt += `\n## ${t('PROGRAMFÖRFRÅGAN', 'PROGRAM REQUEST')}\n`
  prompt += `- **Sport**: ${getSportLabel(wizardData.sport, locale)}\n`
  prompt += `- **${t('Mål', 'Goal')}**: ${getGoalLabel(wizardData.goal, locale)}\n`
  prompt += `- **${t('Längd', 'Length')}**: ${wizardData.durationWeeks} ${t('veckor', 'weeks')}\n`
  prompt += `- **${t('Pass per vecka', 'Sessions per week')}**: ${wizardData.sessionsPerWeek}\n`

  if (wizardData.targetRaceDate) {
    prompt += `- **${t('Tävlingsdatum', 'Race date')}**: ${formatDate(wizardData.targetRaceDate)}\n`
  }
  if (wizardData.targetTime) {
    prompt += `- **${t('Måltid', 'Target time')}**: ${wizardData.targetTime}\n`
  }

  prompt += buildTeamSportPromptSection({
    sport: wizardData.sport,
    goal: wizardData.goal,
    sessionsPerWeek: wizardData.sessionsPerWeek,
    locale,
    variant: 'markdown',
    hockeySettings: wizardData.hockeySettings ?? context.hockeySettings,
    footballSettings: wizardData.footballSettings ?? context.footballSettings,
    basketballSettings: wizardData.basketballSettings ?? context.basketballSettings,
    handballSettings: wizardData.handballSettings ?? context.handballSettings,
    floorballSettings: wizardData.floorballSettings ?? context.floorballSettings,
    volleyballSettings: wizardData.volleyballSettings ?? context.volleyballSettings,
    tennisSettings: wizardData.tennisSettings ?? context.tennisSettings,
    padelSettings: wizardData.padelSettings ?? context.padelSettings,
  })

  // Methodology
  if (wizardData.methodology && wizardData.methodology !== 'AUTO') {
    const methodology = METHODOLOGIES[wizardData.methodology as keyof typeof METHODOLOGIES]
    if (methodology) {
      prompt += `\n### ${t('Träningsmetodik', 'Training methodology')}: ${methodology.name}\n`
      prompt += `${methodology.description}\n`
      if (methodology.keyPrinciples && methodology.keyPrinciples.length > 0) {
        prompt += `\n**${t('Nyckelprinciper', 'Key principles')}:**\n`
        for (const principle of methodology.keyPrinciples) {
          prompt += `- ${principle}\n`
        }
      }
    }
  }

  // Recent Test Data
  if (recentTests && recentTests.length > 0) {
    const latestTest = recentTests[0]
    prompt += `\n## ${t('SENASTE TESTRESULTAT', 'LATEST TEST RESULTS')}\n`
    prompt += `- **${t('Testdatum', 'Test date')}**: ${formatDate(latestTest.testDate)}\n`
    prompt += `- **${t('Testtyp', 'Test type')}**: ${latestTest.testType}\n`

    if (latestTest.vo2max) prompt += `- **VO2max**: ${latestTest.vo2max.toFixed(1)} ml/kg/min\n`
    if (latestTest.maxHR) prompt += `- **${t('Max puls', 'Max HR')}**: ${latestTest.maxHR} bpm\n`
    if (latestTest.maxLactate) prompt += `- **${t('Max laktat', 'Max lactate')}**: ${latestTest.maxLactate.toFixed(1)} mmol/L\n`

    // Thresholds
    const lt1 = latestTest.aerobicThreshold
    const lt2 = latestTest.anaerobicThreshold

    if (lt1 || lt2) {
      prompt += `\n### ${t('Tröskelvärden', 'Threshold values')}\n`
      if (lt1) {
        const lt1Hr = lt1.heartRate || lt1.hr
        prompt += `- **LT1 (${t('Aerob tröskel', 'Aerobic threshold')})**: ${lt1Hr ? `${lt1Hr} bpm` : '-'}`
        if (lt1.lactate) prompt += ` @ ${lt1.lactate} mmol/L`
        prompt += '\n'
      }
      if (lt2) {
        const lt2Hr = lt2.heartRate || lt2.hr
        prompt += `- **LT2 (${t('Anaerob tröskel', 'Anaerobic threshold')})**: ${lt2Hr ? `${lt2Hr} bpm` : '-'}`
        if (lt2.lactate) prompt += ` @ ${lt2.lactate} mmol/L`
        prompt += '\n'
      }
    }

    // Training Zones
    if (latestTest.trainingZones && latestTest.trainingZones.length > 0) {
      prompt += `\n### ${t('Träningszoner', 'Training zones')}\n`
      prompt += locale === 'sv' ? '| Zon | HR-intervall | % maxHR | Beskrivning |\n' : '| Zone | HR range | % max HR | Description |\n'
      prompt += '|-----|--------------|---------|-------------|\n'
      for (const zone of latestTest.trainingZones) {
        prompt += `| Z${zone.zone} | ${zone.hrMin}-${zone.hrMax} bpm | ${zone.percentMin}-${zone.percentMax}% | ${zone.effect || ''} |\n`
      }
    }
  }

  // Race Results
  if (raceResults && raceResults.length > 0) {
    prompt += `\n## ${t('TÄVLINGSRESULTAT', 'RACE RESULTS')}\n`
    for (const race of raceResults.slice(0, 5)) {
      prompt += `- **${race.raceName || race.distance}** (${formatDate(race.raceDate)}): ${race.timeFormatted}`
      if (race.vdot) prompt += ` (VDOT: ${race.vdot.toFixed(1)})`
      prompt += '\n'
    }

    // Best VDOT
    const bestVdot = raceResults.reduce((max, r) => Math.max(max, r.vdot || 0), 0)
    if (bestVdot > 0) {
      prompt += `\n**${t('Bästa VDOT', 'Best VDOT')}**: ${bestVdot.toFixed(1)}\n`
    }
  }

  // Recent race result from wizard
  if (wizardData.recentRaceDistance && wizardData.recentRaceDistance !== 'NONE' && wizardData.recentRaceTime) {
    prompt += `\n### ${t('Senaste tävlingsresultat (från formuläret)', 'Latest race result (from form)')}\n`
    prompt += `- **${t('Distans', 'Distance')}**: ${wizardData.recentRaceDistance}\n`
    prompt += `- **${t('Tid', 'Time')}**: ${wizardData.recentRaceTime}\n`
  }

  // Training Additions
  if (wizardData.includeStrength || (wizardData.coreSessionsPerWeek && wizardData.coreSessionsPerWeek > 0)) {
    prompt += `\n## ${t('TILLÄGG I PROGRAMMET', 'PROGRAM ADD-ONS')}\n`

    if (wizardData.includeStrength) {
      prompt += `- **${t('Styrketräning', 'Strength training')}**: ${wizardData.strengthSessionsPerWeek || 2}x/${t('vecka', 'week')}\n`
      if (wizardData.scheduleStrengthAfterRunning) {
        prompt += `  - ${t('Schemaläggs efter löpning', 'Scheduled after running')}\n`
      }
    }

    if (wizardData.coreSessionsPerWeek && wizardData.coreSessionsPerWeek > 0) {
      prompt += `- **${t('Core-träning', 'Core training')}**: ${wizardData.coreSessionsPerWeek}x/${t('vecka', 'week')}\n`
      if (wizardData.scheduleCoreAfterRunning) {
        prompt += `  - ${t('Schemaläggs efter löpning', 'Scheduled after running')}\n`
      }
    }

    if (wizardData.alternativeTrainingSessionsPerWeek && wizardData.alternativeTrainingSessionsPerWeek > 0) {
      prompt += `- **${t('Alternativ träning', 'Alternative training')}**: ${wizardData.alternativeTrainingSessionsPerWeek}x/${t('vecka', 'week')}\n`
    }
  }

  // Equipment
  if (wizardData.hasLactateMeter || wizardData.hasPowerMeter) {
    prompt += `\n## ${t('UTRUSTNING', 'EQUIPMENT')}\n`
    if (wizardData.hasLactateMeter) prompt += `- ${t('Laktatmätare (Norwegian-metoden möjlig)', 'Lactate meter (Norwegian method possible)')}\n`
    if (wizardData.hasPowerMeter) prompt += `- ${t('Wattmätare', 'Power meter')}\n`
  }

  // HYROX specific
  if (wizardData.sport === 'HYROX' && wizardData.hyroxStationTimes) {
    prompt += `\n## ${t('HYROX-SPECIFIKT', 'HYROX-SPECIFIC')}\n`

    if (wizardData.hyroxDivision) prompt += `- **Division**: ${wizardData.hyroxDivision}\n`
    if (wizardData.hyroxGender) prompt += `- **${t('Kön', 'Gender')}**: ${wizardData.hyroxGender === 'male' ? t('Man', 'Male') : t('Kvinna', 'Female')}\n`
    if (wizardData.hyroxBodyweight) prompt += `- **${t('Kroppsvikt', 'Bodyweight')}**: ${wizardData.hyroxBodyweight} kg\n`

    const st = wizardData.hyroxStationTimes
    const hasStationTimes = Object.values(st).some(v => v)

    if (hasStationTimes) {
      prompt += `\n### ${t('Stationstider', 'Station times')}\n`
      if (st.skierg) prompt += `- SkiErg 1km: ${st.skierg}\n`
      if (st.sledPush) prompt += `- Sled Push 50m: ${st.sledPush}\n`
      if (st.sledPull) prompt += `- Sled Pull 50m: ${st.sledPull}\n`
      if (st.burpeeBroadJump) prompt += `- Burpee Broad Jump 80m: ${st.burpeeBroadJump}\n`
      if (st.rowing) prompt += `- Rowing 1km: ${st.rowing}\n`
      if (st.farmersCarry) prompt += `- Farmers Carry 200m: ${st.farmersCarry}\n`
      if (st.sandbagLunge) prompt += `- Sandbag Lunge 100m: ${st.sandbagLunge}\n`
      if (st.wallBalls) prompt += `- Wall Balls: ${st.wallBalls}\n`
      if (st.averageRunPace) prompt += `- ${t('Genomsnittligt löptempo', 'Average run pace')}: ${st.averageRunPace}/km\n`
    }
  }

  // Strength PRs
  if (wizardData.strengthPRs) {
    const prs = wizardData.strengthPRs
    const hasPRs = Object.values(prs).some(v => v)

    if (hasPRs) {
      prompt += `\n## ${t('STYRKE-PRs (1RM)', 'STRENGTH PRs (1RM)')}\n`
      if (prs.deadlift) prompt += `- **${t('Marklyft', 'Deadlift')}**: ${prs.deadlift} kg\n`
      if (prs.backSquat) prompt += `- **${t('Knäböj', 'Back squat')}**: ${prs.backSquat} kg\n`
      if (prs.benchPress) prompt += `- **${t('Bänkpress', 'Bench press')}**: ${prs.benchPress} kg\n`
      if (prs.overheadPress) prompt += `- **${t('Axelpress', 'Overhead press')}**: ${prs.overheadPress} kg\n`
      if (prs.barbellRow) prompt += `- **${t('Skivstångsrodd', 'Barbell row')}**: ${prs.barbellRow} kg\n`
      if (prs.pullUps) prompt += `- **Chins**: ${prs.pullUps} reps\n`
    }
  }

  // Injuries
  if (injuries && injuries.length > 0) {
    const activeInjuries = injuries.filter(i => i.status !== 'RESOLVED')
    if (activeInjuries.length > 0) {
      prompt += `\n## ${t('AKTIVA SKADOR/HÄNSYN', 'ACTIVE INJURIES/CONSIDERATIONS')}\n`
      for (const injury of activeInjuries) {
        prompt += `- **${injury.injuryType}** (${injury.affectedArea || t('okänt område', 'unknown area')}): `
        prompt += `${t('Smärtnivå', 'Pain level')} ${injury.painLevel}/10, Status: ${injury.status}\n`
      }
    }
  }

  // Notes
  if (wizardData.notes) {
    prompt += `\n## ${t('ANTECKNINGAR FRÅN COACHEN', 'NOTES FROM THE COACH')}\n${wizardData.notes}\n`
  }

  // Instructions for AI
  prompt += '\n---\n\n'
  prompt += locale === 'sv'
    ? '## INSTRUKTIONER\nSkapa ett detaljerat träningsprogram baserat på ovanstående information. Programmet ska innehålla:\n\n1. **Periodisering** med tydliga faser (bas, uppbyggnad, specifik, taper)\n2. **Veckoscheman** med specifika pass för varje dag\n3. **Detaljerade pass** med:\n   - Tempo/intensitet för varje segment (min/km eller puls)\n   - Duration och distans\n   - Pulszon eller tempo-zon\n   - Uppvärmning och nedvarvning\n4. **Progression** från vecka till vecka\n5. **Anpassningar** baserat på atletens nivå och utrustning\n\nOm du vill kan jag förklara mer om programmet eller justera det baserat på feedback.\n'
    : '## INSTRUCTIONS\nCreate a detailed training program based on the information above. The program should include:\n\n1. **Periodization** with clear phases (base, build, specific, taper)\n2. **Weekly schedules** with specific sessions for each day\n3. **Detailed workouts** with:\n   - Pace/intensity for each segment (min/km or heart rate)\n   - Duration and distance\n   - Heart-rate zone or pace zone\n   - Warm-up and cooldown\n4. **Progression** from week to week\n5. **Adaptations** based on the athlete level and equipment\n\nYou may explain more about the program or adjust it based on feedback.\n'
  prompt += '\n---\n\n'
  prompt += locale === 'sv'
    ? '## FORMAT FÖR DETALJERADE PASS\nNär du beskriver pass, inkludera gärna segment-struktur med följande detaljer:\n\n**Löppass exempel:**\n- **Uppvärmning**: 10-15 min @ Zon 1-2 (~6:00-6:30/km, HR 120-140)\n- **Huvudpass**: 40 min @ Zon 3 (5:15/km, HR 155-165) eller intervaller som "5×1000m @ 4:30/km med 2 min vila"\n- **Nedvarvning**: 10 min @ Zon 1 (~6:30/km, HR 110-130)\n\n**Cykelpass exempel:**\n- **Uppvärmning**: 15 min @ Zon 1-2 (< 55% FTP, 100-130W)\n- **Huvudpass**: 2×20 min @ Zon 4 (95-105% FTP, 250-275W) med 5 min vila\n- **Nedvarvning**: 10 min @ Zon 1 (< 55% FTP)\n\n**Intensitetszoner (baserat på testresultat om tillgängliga):**\n- Zon 1: Återhämtning (50-60% maxHR)\n- Zon 2: Aerob bas (60-70% maxHR)\n- Zon 3: Tempo/Tröskel (70-80% maxHR)\n- Zon 4: Anaerob tröskel (80-90% maxHR)\n- Zon 5: VO2max/Intervall (90-100% maxHR)\n'
    : '## DETAILED WORKOUT FORMAT\nWhen describing workouts, include segment structure with these details where useful:\n\n**Running workout example:**\n- **Warm-up**: 10-15 min @ Zone 1-2 (~6:00-6:30/km, HR 120-140)\n- **Main set**: 40 min @ Zone 3 (5:15/km, HR 155-165) or intervals such as "5x1000m @ 4:30/km with 2 min rest"\n- **Cooldown**: 10 min @ Zone 1 (~6:30/km, HR 110-130)\n\n**Cycling workout example:**\n- **Warm-up**: 15 min @ Zone 1-2 (< 55% FTP, 100-130W)\n- **Main set**: 2x20 min @ Zone 4 (95-105% FTP, 250-275W) with 5 min rest\n- **Cooldown**: 10 min @ Zone 1 (< 55% FTP)\n\n**Intensity zones (based on test results when available):**\n- Zone 1: Recovery (50-60% max HR)\n- Zone 2: Aerobic base (60-70% max HR)\n- Zone 3: Tempo/Threshold (70-80% max HR)\n- Zone 4: Anaerobic threshold (80-90% max HR)\n- Zone 5: VO2max/Intervals (90-100% max HR)\n'

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
function getSportLabel(sport: SportType, locale: 'en' | 'sv' = 'en'): string {
  const labels: Record<string, { en: string; sv: string } | string> = {
    RUNNING: { en: 'Running', sv: 'Löpning' },
    CYCLING: { en: 'Cycling', sv: 'Cykling' },
    STRENGTH: { en: 'Strength', sv: 'Styrka' },
    SKIING: { en: 'Skiing', sv: 'Skidåkning' },
    SWIMMING: { en: 'Swimming', sv: 'Simning' },
    TRIATHLON: 'Triathlon',
    HYROX: 'HYROX',
    GENERAL_FITNESS: { en: 'General Fitness', sv: 'Allmän Fitness' },
    TEAM_ICE_HOCKEY: { en: 'Ice Hockey', sv: 'Ishockey' },
    TEAM_FOOTBALL: { en: 'Football', sv: 'Fotboll' },
    TEAM_HANDBALL: { en: 'Handball', sv: 'Handboll' },
    TEAM_FLOORBALL: { en: 'Floorball', sv: 'Innebandy' },
    TEAM_BASKETBALL: { en: 'Basketball', sv: 'Basket' },
    TEAM_VOLLEYBALL: { en: 'Volleyball', sv: 'Volleyboll' },
    TENNIS: 'Tennis',
    PADEL: 'Padel',
  }
  const label = labels[sport]
  if (!label) return sport
  return typeof label === 'string' ? label : label[locale]
}

function getGoalLabel(goal: string, locale: 'en' | 'sv' = 'en'): string {
  const labels: Record<string, { en: string; sv: string } | string> = {
    marathon: { en: 'Marathon', sv: 'Maraton' },
    'half-marathon': { en: 'Half marathon', sv: 'Halvmaraton' },
    '10k': '10 km',
    '5k': '5 km',
    'ftp-builder': { en: 'FTP builder', sv: 'FTP-uppbyggnad' },
    'base-builder': { en: 'Base builder', sv: 'Basbyggnad' },
    'gran-fondo': 'Gran Fondo',
    sprint: 'Sprint',
    olympic: { en: 'Olympic distance', sv: 'Olympisk distans' },
    'half-ironman': { en: 'Half-Ironman', sv: 'Halv-Ironman' },
    ironman: 'Ironman',
    pro: 'Pro Division',
    'age-group': 'Age Group',
    doubles: 'Doubles',
    vasaloppet: 'Vasaloppet',
    'off-season-build': { en: 'Off-season build', sv: 'Off-season uppbyggnad' },
    'pre-season-readiness': { en: 'Pre-season readiness', sv: 'Försäsongsform' },
    'in-season-maintenance': { en: 'In-season maintenance', sv: 'Säsongsunderhåll' },
    'speed-power': { en: 'Speed and power', sv: 'Snabbhet & power' },
    'injury-prevention': { en: 'Injury prevention', sv: 'Skadeprevention' },
    'return-to-play': 'Return to play',
    custom: { en: 'Custom', sv: 'Anpassat' },
  }
  const label = labels[goal]
  if (!label) return goal
  return typeof label === 'string' ? label : label[locale]
}
