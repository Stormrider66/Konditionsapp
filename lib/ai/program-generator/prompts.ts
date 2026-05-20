/**
 * Multi-Part Program Generation Prompts
 *
 * Prompts for outline generation and phase-by-phase detailed generation.
 */

import type { GenerationContext, PhaseConfig, GeneratedPhase, ProgramOutline } from './types'
import { buildConstitutionPreamble } from '@/lib/ai/constitution'

type AppLocale = 'en' | 'sv'

function getProgramLocale(context?: Pick<GenerationContext, 'locale'>): AppLocale {
  return context?.locale === 'sv' ? 'sv' : 'en'
}

// ============================================
// System Prompts
// ============================================

export function buildProgramGeneratorSystemPrompt(locale: AppLocale = 'en'): string {
  if (locale === 'sv') {
    return `${buildConstitutionPreamble('program')}Du är en erfaren tränare och idrottsfysiolog som skapar individualiserade träningsprogram.

VIKTIGA PRINCIPER:
- Följ vetenskapligt beprövade periodiseringsmetoder
- Progressiv överbelastning med lämplig återhämtning
- Anpassa efter atletens nivå och mål
- Ge konkreta träningspass med tydliga instruktioner
- Svara alltid på svenska

OUTPUT FORMAT:
- Returnera alltid valid JSON
- Följ exakt det schema som efterfrågas
- Inkludera aldrig extra text utanför JSON-objektet`
  }

  return `${buildConstitutionPreamble('program')}You are an experienced coach and exercise physiologist creating individualized training programs.

IMPORTANT PRINCIPLES:
- Follow evidence-based periodization methods
- Use progressive overload with appropriate recovery
- Adapt to the athlete's level and goals
- Provide concrete workouts with clear instructions
- Always write user-facing generated content in English

OUTPUT FORMAT:
- Always return valid JSON
- Follow the requested schema exactly
- Never include extra text outside the JSON object`
}

export const PROGRAM_GENERATOR_SYSTEM_PROMPT = buildProgramGeneratorSystemPrompt('en')

// ============================================
// Outline Prompt
// ============================================

export function buildOutlinePrompt(context: GenerationContext): string {
  const locale = getProgramLocale(context)
  const athleteInfo = buildAthleteInfoSection(context)
  const testInfo = buildTestDataSection(context)
  const additionalInfo = buildAdditionalInfoSection(context)

  if (locale === 'en') {
    return `Create a PERIODIZATION PLAN (structure only) for a ${context.totalWeeks}-week ${formatSport(context.sport, locale)} program.

${athleteInfo}
${testInfo}
${additionalInfo}

GOAL: ${context.goal || 'Improve performance'}
${context.goalDate ? `GOAL DATE: ${context.goalDate}` : ''}
METHODOLOGY: ${context.methodology || 'Polarized (80/20)'}
SESSIONS PER WEEK: ${context.sessionsPerWeek || 5}

CREATE A PERIODIZATION PLAN with the following phases:
- Each phase should be 4-6 weeks
- Include: base phase, build phase, peak phase, and taper (when applicable)
- Adapt the phases to the program length and goal

RETURN ONLY THIS JSON FORMAT:
{
  "programName": "Descriptive program name",
  "description": "Short description of the program and its purpose",
  "methodology": "${context.methodology || 'POLARIZED'}",
  "totalWeeks": ${context.totalWeeks},
  "phases": [
    {
      "phaseNumber": 1,
      "name": "Phase name (for example Base Phase)",
      "weeks": "1-6",
      "focus": "Main focus for the phase",
      "keyWorkouts": ["Key workout 1", "Key workout 2"],
      "volumeGuidance": "Volume guidance for the phase"
    }
  ]
}`
  }

  return `Skapa en PERIODISERINGSPLAN (endast struktur) för ett ${context.totalWeeks}-veckors ${formatSport(context.sport)} program.

${athleteInfo}
${testInfo}
${additionalInfo}

MÅL: ${context.goal || 'Förbättra prestanda'}
${context.goalDate ? `MÅLDATUM: ${context.goalDate}` : ''}
METODIK: ${context.methodology || 'Polariserad (80/20)'}
PASS PER VECKA: ${context.sessionsPerWeek || 5}

SKAPA EN PERIODISERINGSPLAN med följande faser:
- Varje fas ska vara 4-6 veckor
- Inkludera: basfas, uppbyggnadsfas, toppfas, och avtrappning (om tillämpligt)
- Anpassa faserna efter programmets längd och mål

RETURNERA ENDAST DETTA JSON-FORMAT:
{
  "programName": "Beskrivande namn på programmet",
  "description": "Kort beskrivning av programmet och dess syfte",
  "methodology": "${context.methodology || 'POLARIZED'}",
  "totalWeeks": ${context.totalWeeks},
  "phases": [
    {
      "phaseNumber": 1,
      "name": "Fas namn (t.ex. Basfas)",
      "weeks": "1-6",
      "focus": "Huvudfokus för fasen",
      "keyWorkouts": ["Nyckelpass 1", "Nyckelpass 2"],
      "volumeGuidance": "Volymriktlinjer för fasen"
    }
  ]
}`
}

// ============================================
// Phase Prompt
// ============================================

export function buildPhasePrompt(
  phaseConfig: PhaseConfig,
  previousPhases: GeneratedPhase[],
  context: GenerationContext,
  outline: ProgramOutline
): string {
  const locale = getProgramLocale(context)
  const athleteInfo = buildAthleteInfoSection(context)
  const testInfo = buildTestDataSection(context)
  const previousPhasesContext = buildPreviousPhasesContext(previousPhases, locale)

  if (locale === 'en') {
    return `Generate detailed workouts for PHASE ${phaseConfig.phaseNumber}: ${phaseConfig.name}
Weeks: ${phaseConfig.weeks}
Focus: ${phaseConfig.focus}

PROGRAM OUTLINE:
- ${outline.totalWeeks} total weeks
- Methodology: ${outline.methodology}
- Phase ${phaseConfig.phaseNumber} of ${outline.phases.length}

${athleteInfo}
${testInfo}

${previousPhasesContext}

${phaseConfig.phaseNumber > 1 ? `
IMPORTANT: Build on the progression from previous phases.
Week ${phaseConfig.startWeek} should continue naturally from week ${phaseConfig.startWeek - 1}.
` : ''}

PHASE-SPECIFIC INFORMATION:
- Key workouts: ${phaseConfig.keyWorkouts?.join(', ') || 'Determine based on focus'}
- Volume guidance: ${phaseConfig.volumeGuidance || 'Progressive increase'}

CREATE A WEEKLY TEMPLATE with workouts for each day.
Sessions per week: ${context.sessionsPerWeek || 5}
Rest days must have type: "REST"

RETURN ONLY THIS JSON FORMAT:
{
  "phaseNumber": ${phaseConfig.phaseNumber},
  "name": "${phaseConfig.name}",
  "weeks": "${phaseConfig.weeks}",
  "focus": "${phaseConfig.focus}",
  "weeklyTemplate": {
    "monday": {
      "type": "RUNNING",
      "name": "Workout name",
      "duration": 60,
      "zone": 2,
      "intensity": "easy",
      "description": "Detailed workout description",
      "segments": [
        {
          "order": 1,
          "type": "warmup",
          "duration": 10,
          "zone": 1,
          "description": "Easy warm-up"
        },
        {
          "order": 2,
          "type": "work",
          "duration": 40,
          "zone": 2,
          "description": "Main session"
        },
        {
          "order": 3,
          "type": "cooldown",
          "duration": 10,
          "zone": 1,
          "description": "Cool-down"
        }
      ]
    },
    "tuesday": { ... },
    "wednesday": { ... },
    "thursday": { ... },
    "friday": { ... },
    "saturday": { ... },
    "sunday": { "type": "REST", "description": "Rest day" }
  },
  "volumeGuidance": "Total weekly volume and intensity distribution",
  "keyWorkouts": ["Most important workouts in this phase"],
  "notes": "Any extra instructions for the phase"
}`
  }

  return `Generera detaljerade träningspass för FAS ${phaseConfig.phaseNumber}: ${phaseConfig.name}
Veckor: ${phaseConfig.weeks}
Fokus: ${phaseConfig.focus}

PROGRAMÖVERSIKT:
- Totalt ${outline.totalWeeks} veckor
- Metodik: ${outline.methodology}
- Fas ${phaseConfig.phaseNumber} av ${outline.phases.length}

${athleteInfo}
${testInfo}

${previousPhasesContext}

${phaseConfig.phaseNumber > 1 ? `
VIKTIGT: Bygga vidare på progressionen från tidigare faser.
Vecka ${phaseConfig.startWeek} ska fortsätta naturligt från vecka ${phaseConfig.startWeek - 1}.
` : ''}

FAS-SPECIFIK INFORMATION:
- Nyckelpass: ${phaseConfig.keyWorkouts?.join(', ') || 'Bestäm baserat på fokus'}
- Volymriktlinjer: ${phaseConfig.volumeGuidance || 'Progressiv ökning'}

SKAPA ETT VECKOTEMPPLATE med träningspass för varje dag.
Pass per vecka: ${context.sessionsPerWeek || 5}
Restdagar ska ha type: "REST"

RETURNERA ENDAST DETTA JSON-FORMAT:
{
  "phaseNumber": ${phaseConfig.phaseNumber},
  "name": "${phaseConfig.name}",
  "weeks": "${phaseConfig.weeks}",
  "focus": "${phaseConfig.focus}",
  "weeklyTemplate": {
    "monday": {
      "type": "RUNNING",
      "name": "Passnamn",
      "duration": 60,
      "zone": 2,
      "intensity": "easy",
      "description": "Detaljerad beskrivning av passet",
      "segments": [
        {
          "order": 1,
          "type": "warmup",
          "duration": 10,
          "zone": 1,
          "description": "Lätt uppvärmning"
        },
        {
          "order": 2,
          "type": "work",
          "duration": 40,
          "zone": 2,
          "description": "Huvudpass"
        },
        {
          "order": 3,
          "type": "cooldown",
          "duration": 10,
          "zone": 1,
          "description": "Nedvarvning"
        }
      ]
    },
    "tuesday": { ... },
    "wednesday": { ... },
    "thursday": { ... },
    "friday": { ... },
    "saturday": { ... },
    "sunday": { "type": "REST", "description": "Vilodag" }
  },
  "volumeGuidance": "Total veckovolym och intensitetsfördelning",
  "keyWorkouts": ["Viktigaste passen denna fas"],
  "notes": "Eventuella extra instruktioner för fasen"
}`
}

// ============================================
// Helper Functions
// ============================================

function buildAthleteInfoSection(context: GenerationContext): string {
  const locale = getProgramLocale(context)
  if (!context.athleteName && !context.athleteAge) {
    return ''
  }

  const parts: string[] = [locale === 'sv' ? 'ATLET:' : 'ATHLETE:']
  if (context.athleteName) parts.push(`- ${locale === 'sv' ? 'Namn' : 'Name'}: ${context.athleteName}`)
  if (context.athleteAge) parts.push(`- ${locale === 'sv' ? 'Ålder' : 'Age'}: ${context.athleteAge} ${locale === 'sv' ? 'år' : 'years'}`)
  if (context.athleteWeight) parts.push(`- ${locale === 'sv' ? 'Vikt' : 'Weight'}: ${context.athleteWeight} kg`)
  if (context.athleteHeight) parts.push(`- ${locale === 'sv' ? 'Längd' : 'Height'}: ${context.athleteHeight} cm`)
  if (context.experienceLevel) parts.push(`- ${locale === 'sv' ? 'Erfarenhetsnivå' : 'Experience level'}: ${context.experienceLevel}`)

  return parts.join('\n')
}

function buildTestDataSection(context: GenerationContext): string {
  const locale = getProgramLocale(context)
  if (!context.vo2max && !context.maxHR && !context.lactateThreshold) {
    return ''
  }

  const parts: string[] = [locale === 'sv' ? 'TESTDATA:' : 'TEST DATA:']
  if (context.vo2max) parts.push(`- VO2max: ${context.vo2max} ml/kg/min`)
  if (context.maxHR) parts.push(`- ${locale === 'sv' ? 'Max puls' : 'Max heart rate'}: ${context.maxHR} bpm`)

  if (context.lactateThreshold) {
    if (context.lactateThreshold.hr) {
      parts.push(`- ${locale === 'sv' ? 'Tröskel-puls' : 'Threshold heart rate'}: ${context.lactateThreshold.hr} bpm`)
    }
    if (context.lactateThreshold.pace) {
      parts.push(`- ${locale === 'sv' ? 'Tröskeltempo' : 'Threshold pace'}: ${context.lactateThreshold.pace}`)
    }
    if (context.lactateThreshold.power) {
      parts.push(`- ${locale === 'sv' ? 'Tröskeleffekt' : 'Threshold power'}: ${context.lactateThreshold.power} W`)
    }
  }

  if (context.trainingZones && context.trainingZones.length > 0) {
    parts.push(locale === 'sv' ? 'TRÄNINGSZONER:' : 'TRAINING ZONES:')
    context.trainingZones.forEach((zone) => {
      const zoneInfo: string[] = [`  ${locale === 'sv' ? 'Zon' : 'Zone'} ${zone.zone}:`]
      if (zone.minHR && zone.maxHR) zoneInfo.push(`${zone.minHR}-${zone.maxHR} bpm`)
      if (zone.minPace && zone.maxPace) zoneInfo.push(`${zone.minPace}-${zone.maxPace}`)
      parts.push(zoneInfo.join(' '))
    })
  }

  return parts.join('\n')
}

function buildAdditionalInfoSection(context: GenerationContext): string {
  const locale = getProgramLocale(context)
  const parts: string[] = []

  if (context.raceResults && context.raceResults.length > 0) {
    parts.push(locale === 'sv' ? 'TÄVLINGSRESULTAT:' : 'RACE RESULTS:')
    context.raceResults.forEach((race) => {
      parts.push(`- ${race.name}: ${race.distance} ${locale === 'sv' ? 'på' : 'in'} ${race.time} (${race.date})`)
    })
  }

  if (context.injuries && context.injuries.length > 0) {
    parts.push(locale === 'sv' ? 'AKTIVA SKADOR/BEGRÄNSNINGAR:' : 'ACTIVE INJURIES/LIMITATIONS:')
    context.injuries.forEach((injury) => {
      parts.push(`- ${injury.type}: ${injury.status}${injury.notes ? ` - ${injury.notes}` : ''}`)
    })
  }

  if (context.notes) {
    parts.push(`${locale === 'sv' ? 'ÖVRIGA KOMMENTARER' : 'ADDITIONAL COMMENTS'}:\n${context.notes}`)
  }

  return parts.join('\n\n')
}

function buildPreviousPhasesContext(previousPhases: GeneratedPhase[], locale: AppLocale): string {
  if (previousPhases.length === 0) {
    return ''
  }

  const parts: string[] = [locale === 'sv' ? 'TIDIGARE FASER (referens för progression):' : 'PREVIOUS PHASES (progression reference):']

  previousPhases.forEach((phase) => {
    parts.push(`\n${locale === 'sv' ? 'Fas' : 'Phase'} ${phase.phaseNumber}: ${phase.name} (${locale === 'sv' ? 'vecka' : 'weeks'} ${phase.weeks})`)
    parts.push(`${locale === 'sv' ? 'Fokus' : 'Focus'}: ${phase.focus}`)
    if (phase.keyWorkouts) {
      parts.push(`${locale === 'sv' ? 'Nyckelpass' : 'Key workouts'}: ${phase.keyWorkouts.join(', ')}`)
    }
    if (phase.volumeGuidance) {
      parts.push(`${locale === 'sv' ? 'Volym' : 'Volume'}: ${phase.volumeGuidance}`)
    }

    // Include a summary of training types from weekly template
    if (phase.weeklyTemplate) {
      const workoutSummary = summarizeWeeklyTemplate(phase.weeklyTemplate, locale)
      if (workoutSummary) {
        parts.push(`${locale === 'sv' ? 'Veckans pass' : 'Weekly workouts'}: ${workoutSummary}`)
      }
    }
  })

  return parts.join('\n')
}

function summarizeWeeklyTemplate(template: GeneratedPhase['weeklyTemplate'], locale: AppLocale): string {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
  const summary: string[] = []

  days.forEach((day) => {
    const workout = template[day]
    if (workout && workout.type !== 'REST') {
      summary.push(`${formatDayShort(day, locale)}: ${workout.type}`)
    }
  })

  return summary.join(', ')
}

function formatDayShort(day: string, locale: AppLocale): string {
  const svMap: Record<string, string> = {
    monday: 'Mån',
    tuesday: 'Tis',
    wednesday: 'Ons',
    thursday: 'Tor',
    friday: 'Fre',
    saturday: 'Lör',
    sunday: 'Sön',
  }
  const enMap: Record<string, string> = {
    monday: 'Mon',
    tuesday: 'Tue',
    wednesday: 'Wed',
    thursday: 'Thu',
    friday: 'Fri',
    saturday: 'Sat',
    sunday: 'Sun',
  }
  return (locale === 'sv' ? svMap : enMap)[day] || day
}

function formatSport(sport: string, locale: AppLocale = 'sv'): string {
  const svNames: Record<string, string> = {
    RUNNING: 'löpning',
    CYCLING: 'cykling',
    SWIMMING: 'simning',
    TRIATHLON: 'triathlon',
    SKIING: 'längdskidåkning',
    HYROX: 'HYROX',
    GENERAL_FITNESS: 'allmän kondition',
  }
  const enNames: Record<string, string> = {
    RUNNING: 'running',
    CYCLING: 'cycling',
    SWIMMING: 'swimming',
    TRIATHLON: 'triathlon',
    SKIING: 'cross-country skiing',
    HYROX: 'HYROX',
    GENERAL_FITNESS: 'general fitness',
  }
  return (locale === 'sv' ? svNames : enNames)[sport] || sport.toLowerCase()
}

// ============================================
// Response Parsing
// ============================================

/**
 * Extract JSON from AI response (handles code blocks and raw JSON)
 */
export function extractJsonFromResponse(response: string): string {
  // Try to extract from code block first
  const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim()
  }

  // Try to find raw JSON object
  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    return jsonMatch[0]
  }

  throw new Error('No valid JSON found in response')
}

/**
 * Parse and validate outline response
 */
export function parseOutlineResponse(response: string): ProgramOutline {
  const jsonStr = extractJsonFromResponse(response)
  const parsed = JSON.parse(jsonStr)

  // Basic validation
  if (!parsed.programName || !parsed.phases || !Array.isArray(parsed.phases)) {
    throw new Error('Invalid outline structure: missing programName or phases')
  }

  // Validate phases
  parsed.phases.forEach((phase: PhaseConfig, index: number) => {
    if (!phase.name || !phase.weeks || !phase.focus) {
      throw new Error(`Invalid phase ${index + 1}: missing name, weeks, or focus`)
    }
  })

  return parsed as ProgramOutline
}

/**
 * Parse and validate phase response
 */
export function parsePhaseResponse(response: string): GeneratedPhase {
  const jsonStr = extractJsonFromResponse(response)
  const parsed = JSON.parse(jsonStr)

  // Basic validation
  if (!parsed.weeklyTemplate) {
    throw new Error('Invalid phase structure: missing weeklyTemplate')
  }

  return parsed as GeneratedPhase
}
