/**
 * Multi-Part Program Generation Prompts
 *
 * Prompts for outline generation and phase-by-phase detailed generation.
 */

import type { GenerationContext, PhaseConfig, GeneratedPhase, ProgramOutline } from './types'

// ============================================
// System Prompts
// ============================================

export const PROGRAM_GENERATOR_SYSTEM_PROMPT = `Du är en erfaren tränare och idrottsfysiolog som skapar individualiserade träningsprogram.

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

// ============================================
// Outline Prompt
// ============================================

export function buildOutlinePrompt(context: GenerationContext): string {
  const athleteInfo = buildAthleteInfoSection(context)
  const testInfo = buildTestDataSection(context)
  const additionalInfo = buildAdditionalInfoSection(context)

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
  const athleteInfo = buildAthleteInfoSection(context)
  const testInfo = buildTestDataSection(context)
  const previousPhasesContext = buildPreviousPhasesContext(previousPhases)

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
  if (!context.athleteName && !context.athleteAge) {
    return ''
  }

  const parts: string[] = ['ATLET:']
  if (context.athleteName) parts.push(`- Namn: ${context.athleteName}`)
  if (context.athleteAge) parts.push(`- Ålder: ${context.athleteAge} år`)
  if (context.athleteWeight) parts.push(`- Vikt: ${context.athleteWeight} kg`)
  if (context.athleteHeight) parts.push(`- Längd: ${context.athleteHeight} cm`)
  if (context.experienceLevel) parts.push(`- Erfarenhetsnivå: ${context.experienceLevel}`)

  return parts.join('\n')
}

function buildTestDataSection(context: GenerationContext): string {
  if (!context.vo2max && !context.maxHR && !context.lactateThreshold) {
    return ''
  }

  const parts: string[] = ['TESTDATA:']
  if (context.vo2max) parts.push(`- VO2max: ${context.vo2max} ml/kg/min`)
  if (context.maxHR) parts.push(`- Max puls: ${context.maxHR} bpm`)

  if (context.lactateThreshold) {
    if (context.lactateThreshold.hr) {
      parts.push(`- Tröskel-puls: ${context.lactateThreshold.hr} bpm`)
    }
    if (context.lactateThreshold.pace) {
      parts.push(`- Tröskeltempo: ${context.lactateThreshold.pace}`)
    }
    if (context.lactateThreshold.power) {
      parts.push(`- Tröskeleffekt: ${context.lactateThreshold.power} W`)
    }
  }

  if (context.trainingZones && context.trainingZones.length > 0) {
    parts.push('TRÄNINGSZONER:')
    context.trainingZones.forEach((zone) => {
      const zoneInfo: string[] = [`  Zon ${zone.zone}:`]
      if (zone.minHR && zone.maxHR) zoneInfo.push(`${zone.minHR}-${zone.maxHR} bpm`)
      if (zone.minPace && zone.maxPace) zoneInfo.push(`${zone.minPace}-${zone.maxPace}`)
      parts.push(zoneInfo.join(' '))
    })
  }

  return parts.join('\n')
}

function buildAdditionalInfoSection(context: GenerationContext): string {
  const parts: string[] = []

  if (context.raceResults && context.raceResults.length > 0) {
    parts.push('TÄVLINGSRESULTAT:')
    context.raceResults.forEach((race) => {
      parts.push(`- ${race.name}: ${race.distance} på ${race.time} (${race.date})`)
    })
  }

  if (context.injuries && context.injuries.length > 0) {
    parts.push('AKTIVA SKADOR/BEGRÄNSNINGAR:')
    context.injuries.forEach((injury) => {
      parts.push(`- ${injury.type}: ${injury.status}${injury.notes ? ` - ${injury.notes}` : ''}`)
    })
  }

  if (context.notes) {
    parts.push(`ÖVRIGA KOMMENTARER:\n${context.notes}`)
  }

  return parts.join('\n\n')
}

function buildPreviousPhasesContext(previousPhases: GeneratedPhase[]): string {
  if (previousPhases.length === 0) {
    return ''
  }

  const parts: string[] = ['TIDIGARE FASER (referens för progression):']

  previousPhases.forEach((phase) => {
    parts.push(`\nFas ${phase.phaseNumber}: ${phase.name} (vecka ${phase.weeks})`)
    parts.push(`Fokus: ${phase.focus}`)
    if (phase.keyWorkouts) {
      parts.push(`Nyckelpass: ${phase.keyWorkouts.join(', ')}`)
    }
    if (phase.volumeGuidance) {
      parts.push(`Volym: ${phase.volumeGuidance}`)
    }

    // Include a summary of training types from weekly template
    if (phase.weeklyTemplate) {
      const workoutSummary = summarizeWeeklyTemplate(phase.weeklyTemplate)
      if (workoutSummary) {
        parts.push(`Veckans pass: ${workoutSummary}`)
      }
    }
  })

  return parts.join('\n')
}

function summarizeWeeklyTemplate(template: GeneratedPhase['weeklyTemplate']): string {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
  const summary: string[] = []

  days.forEach((day) => {
    const workout = template[day]
    if (workout && workout.type !== 'REST') {
      summary.push(`${formatDayShort(day)}: ${workout.type}`)
    }
  })

  return summary.join(', ')
}

function formatDayShort(day: string): string {
  const map: Record<string, string> = {
    monday: 'Mån',
    tuesday: 'Tis',
    wednesday: 'Ons',
    thursday: 'Tor',
    friday: 'Fre',
    saturday: 'Lör',
    sunday: 'Sön',
  }
  return map[day] || day
}

function formatSport(sport: string): string {
  const sportNames: Record<string, string> = {
    RUNNING: 'löpning',
    CYCLING: 'cykling',
    SWIMMING: 'simning',
    TRIATHLON: 'triathlon',
    SKIING: 'längdskidåkning',
    HYROX: 'HYROX',
    GENERAL_FITNESS: 'allmän kondition',
  }
  return sportNames[sport] || sport.toLowerCase()
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
