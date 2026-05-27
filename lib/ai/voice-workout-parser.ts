/**
 * Voice Workout Parser
 *
 * Parses voice transcriptions to extract structured workout intent.
 * Uses Gemini for transcription + intent parsing, then resolves
 * athlete/team names and dates to database IDs.
 */

import { prisma } from '@/lib/prisma'
import {
  createGoogleGenAIClient,
  generateContent,
  createInlineData,
  createText,
  getGeminiModelId,
  type AiCallMeta,
} from '@/lib/ai/google-genai-client'
import type {
  VoiceWorkoutIntent,
  VoiceWorkoutTarget,
  VoiceWorkoutType,
} from '@/types/voice-workout'
import {
  addDays,
  addWeeks,
  nextMonday,
  nextTuesday,
  nextWednesday,
  nextThursday,
  nextFriday,
  nextSaturday,
  nextSunday,
  format,
  parse,
  isValid,
} from 'date-fns'
import { enUS, sv } from 'date-fns/locale'

// ============================================
// TYPES
// ============================================

interface ParsedIntentRaw {
  transcription: string
  target: {
    type: 'ATHLETE' | 'TEAM'
    name: string
  }
  schedule: {
    dateText: string
    timeText?: string
  }
  workout: {
    type: 'CARDIO' | 'STRENGTH' | 'HYBRID'
    subtype?: string
    name?: string
    duration?: number
    structure: Array<{
      type: 'warmup' | 'main' | 'cooldown' | 'interval' | 'exercise' | 'rest'
      duration?: number
      zone?: number
      reps?: number
      sets?: number
      repsCount?: string
      exerciseName?: string
      rest?: number
      description?: string
    }>
  }
  confidence: number
  ambiguities: string[]
}

type AppLocale = 'en' | 'sv'

function t(locale: AppLocale, en: string, svText: string): string {
  return locale === 'sv' ? svText : en
}

// ============================================
// MAIN PARSER
// ============================================

/**
 * Parse voice audio and extract workout intent.
 * Handles transcription, intent parsing, and resolution of names/dates.
 *
 * @param audioBase64 - Base64 encoded audio data
 * @param mimeType - Audio MIME type
 * @param coachId - Coach's user ID for resolving athletes/teams
 * @param googleApiKey - Google API key for Gemini
 */
export async function parseVoiceWorkoutIntent(
  audioBase64: string,
  mimeType: string,
  coachId: string,
  googleApiKey: string,
  locale: AppLocale = 'en',
  meta?: AiCallMeta
): Promise<{ intent: VoiceWorkoutIntent; modelUsed: string }> {
  const client = createGoogleGenAIClient(googleApiKey)
  const modelId = getGeminiModelId('audio')

  // Build the intent parsing prompt
  const prompt = buildIntentParsingPrompt(locale)

  // Call Gemini with audio
  const result = await generateContent(client, modelId, [
    createText(prompt),
    createInlineData(audioBase64, mimeType),
  ], undefined, {
    ...meta,
    userId: meta?.userId ?? coachId,
    category: meta?.category ?? 'coach_voice_workout_parse',
  })

  // Parse the raw intent from AI response
  let rawIntent: ParsedIntentRaw
  try {
    const jsonMatch = result.text.match(/```json\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      rawIntent = JSON.parse(jsonMatch[1])
    } else {
      rawIntent = JSON.parse(result.text)
    }
  } catch {
    // Fallback with transcription only
    rawIntent = createFallbackIntent(result.text, locale)
  }

  // Resolve target name to database ID
  const resolvedTarget = await resolveTargetName(
    rawIntent.target.name,
    rawIntent.target.type,
    coachId
  )

  // Resolve date and time
  const resolvedSchedule = resolveDateAndTime(
    rawIntent.schedule.dateText,
    rawIntent.schedule.timeText,
    locale
  )

  // Build the final intent
  const intent: VoiceWorkoutIntent = {
    transcription: rawIntent.transcription,
    target: resolvedTarget,
    schedule: {
      dateText: rawIntent.schedule.dateText,
      timeText: rawIntent.schedule.timeText,
      resolvedDate: resolvedSchedule.date,
      resolvedTime: resolvedSchedule.time,
    },
    workout: {
      type: rawIntent.workout.type,
      subtype: rawIntent.workout.subtype,
      name: rawIntent.workout.name,
      duration: rawIntent.workout.duration,
      structure: rawIntent.workout.structure,
    },
    confidence: rawIntent.confidence,
    ambiguities: rawIntent.ambiguities,
  }

  return { intent, modelUsed: modelId }
}

/**
 * Parse voice audio for transcription only (no intent parsing).
 * Useful for re-parsing after coach corrections.
 */
export async function transcribeVoiceAudio(
  audioBase64: string,
  mimeType: string,
  googleApiKey: string,
  locale: AppLocale = 'en',
  meta?: AiCallMeta
): Promise<{ transcription: string; modelUsed: string }> {
  const client = createGoogleGenAIClient(googleApiKey)
  const modelId = getGeminiModelId('audio')

  const prompt = t(
    locale,
    'Transcribe this audio recording to clean text. Keep the same language the speaker uses. Return only the transcription, no other text.',
    'Transkribera denna ljudinspelning på svenska. Returnera endast transkriptionen, ingen annan text.'
  )

  const result = await generateContent(client, modelId, [
    createText(prompt),
    createInlineData(audioBase64, mimeType),
  ], undefined, {
    ...meta,
    category: meta?.category ?? 'coach_voice_workout_transcription',
  })

  return {
    transcription: result.text.trim(),
    modelUsed: modelId,
  }
}

// ============================================
// INTENT PARSING PROMPT
// ============================================

/**
 * Build the prompt for intent extraction.
 */
function buildIntentParsingPrompt(locale: AppLocale): string {
  if (locale === 'en') {
    return `You are an experienced training coach who interprets voice commands for creating workouts.

TASK: Transcribe the recording and extract structured data for training planning.

## LISTEN FOR:

### 1. RECIPIENT - Who should do the workout?
- Individual athlete: "John", "Maria Andersson", "Lisa"
- Team: "Team Alpha", "A-team", "juniors", "U19"
- If unclear, guess "ATHLETE" with low confidence

### 2. DATE/TIME - When should the workout happen?
- Relative days: "tomorrow", "today", "the day after tomorrow"
- Weekdays: "on Tuesday", "Thursday", "on Friday"
- Next week: "next Monday", "next week Thursday"
- Absolute dates: "January 27", "the 15th", "February 5"
- Time: "at 6 pm", "at 6 in the morning", "after work", "in the morning"

### 3. WORKOUT TYPE - What type of training?

**CARDIO (running, cycling, swimming):**
- "tempo", "tempo session", "threshold"
- "intervals", "fartlek"
- "long run", "distance session", "LSD"
- "recovery", "recovery run"
- Zones: "zone 2", "zone 3", "easy", "hard"

**STRENGTH:**
- "strength session", "gym"
- "upper body", "lower body", "full body"
- "leg day", "back session", "press session"
- Exercises: "squat", "deadlift", "bench press"

**HYBRID (CrossFit/HYROX style):**
- "AMRAP", "for time", "EMOM"
- "metcon", "conditioning"
- "chipper", "couplet", "triplet"
- "21-15-9", "Fran", "Cindy"

### 4. STRUCTURE - How is the workout built?

**For CARDIO:**
- Warm-up: "10 min warm-up", "jog for 10"
- Main set: "4x4 minutes in zone 4", "30 min tempo"
- Recovery: "3 min rest between", "90 sec rest"
- Cooldown: "10 min cooldown"

**For STRENGTH:**
- Sets x reps: "4 sets of 8 reps", "3x10"
- Exercises: "start with squats, then deadlifts"
- Rest: "90 seconds rest"

**For HYBRID:**
- Format: "20 min AMRAP", "for time with 15 min cap"
- Movements: "10 pull-ups, 20 push-ups, 30 squats"
- Rounds: "5 rounds of..."

## OUTPUT FORMAT

Respond ONLY with JSON using this schema:

\`\`\`json
{
  "transcription": "<full transcription in English, or the speaker's language if they spoke another language>",
  "target": {
    "type": "ATHLETE" or "TEAM",
    "name": "<athlete or team name>"
  },
  "schedule": {
    "dateText": "<original date text, for example 'on Thursday'>",
    "timeText": "<original time text, for example 'at 6 pm'>"
  },
  "workout": {
    "type": "CARDIO" | "STRENGTH" | "HYBRID",
    "subtype": "<more specific type, for example 'intervals', 'tempo', 'AMRAP'>",
    "name": "<suggested workout name, for example '4x4 Intervals'>",
    "duration": <estimated total duration in minutes>,
    "structure": [
      {
        "type": "warmup" | "main" | "cooldown" | "interval" | "exercise" | "rest",
        "duration": <minutes if applicable>,
        "zone": <1-5 for cardio>,
        "reps": <number of intervals/rounds>,
        "sets": <number of sets for strength>,
        "repsCount": "<reps as text, for example '10', '8-12', 'AMRAP'>",
        "exerciseName": "<exercise name>",
        "rest": <rest in seconds>,
        "description": "<free-text description>"
      }
    ]
  },
  "confidence": <0.0-1.0, how confident you are in the interpretation>,
  "ambiguities": ["<things that are unclear and may need clarification>"]
}
\`\`\`

## IMPORTANT:
- If something is not mentioned, leave the field null or use an empty array
- Do NOT guess values that were not mentioned
- If the recipient is unclear, set confidence low and add it to ambiguities
- Structure workout.structure chronologically (warm-up first, etc.)
- For intervals, include rest as a separate structure element
- Write user-facing generated names, descriptions, and ambiguities in English unless the speaker clearly used another language`
  }

  return `Du är en erfaren träningscoach som tolkar röstkommandon för att skapa träningspass.

UPPGIFT: Transkribera inspelningen och extrahera strukturerad data för träningsplanering.

## LYSSNA EFTER:

### 1. MOTTAGARE - Vem ska göra passet?
- Enskild atlet: "Johan", "Maria Andersson", "Lisa"
- Lag: "Team Alpha", "A-laget", "juniorerna", "U19"
- Om oklart, gissa "ATHLETE" med låg confidence

### 2. DATUM/TID - När ska passet göras?
- Relativa dagar: "imorgon", "idag", "i övermorgon"
- Veckodagar: "på tisdag", "i torsdag", "på fredag"
- Nästa vecka: "nästa måndag", "nästa vecka torsdag"
- Absoluta: "27 januari", "den 15:e", "5 februari"
- Tid: "kl 18", "kl 6 på morgonen", "efter jobbet", "på förmiddagen"

### 3. PASSTYP - Vad för typ av träning?

**CARDIO (löpning, cykling, simning):**
- "tempo", "tempopass", "threshold"
- "intervaller", "fartlek"
- "långpass", "distanspass", "LSD"
- "återhämtning", "recovery run"
- Zoner: "zon 2", "zon 3", "lätt", "hårt"

**STRENGTH (styrka):**
- "styrkepass", "gym"
- "överkropp", "underkropp", "helkropp"
- "benpass", "ryggpass", "presspass"
- Övningar: "knäböj", "marklyft", "bänkpress"

**HYBRID (CrossFit/HYROX-stil):**
- "AMRAP", "for time", "EMOM"
- "metcon", "conditioning"
- "chipper", "couplet", "triplet"
- "21-15-9", "Fran", "Cindy"

### 4. STRUKTUR - Hur är passet uppbyggt?

**För CARDIO:**
- Uppvärmning: "10 min uppvärmning", "jogga i 10"
- Huvudpass: "4x4 minuter i zon 4", "30 min tempo"
- Återhämtning: "3 min vila mellan", "90 sek vila"
- Nedvarvning: "10 min cooldown"

**För STRENGTH:**
- Set x reps: "4 set med 8 reps", "3x10"
- Övningar: "börja med knäböj, sen marklyft"
- Vila: "90 sekunders vila"

**För HYBRID:**
- Format: "20 min AMRAP", "for time med 15 min cap"
- Rörelser: "10 pull-ups, 20 push-ups, 30 squats"
- Rundor: "5 rundor av..."

## OUTPUT FORMAT

Svara ENDAST med JSON enligt detta schema:

\`\`\`json
{
  "transcription": "<full transkription på svenska>",
  "target": {
    "type": "ATHLETE" eller "TEAM",
    "name": "<namn på atlet eller lag>"
  },
  "schedule": {
    "dateText": "<ursprunglig text för datum, t.ex. 'på torsdag'>",
    "timeText": "<ursprunglig text för tid, t.ex. 'kl 18'>"
  },
  "workout": {
    "type": "CARDIO" | "STRENGTH" | "HYBRID",
    "subtype": "<mer specifik typ, t.ex. 'intervals', 'tempo', 'AMRAP'>",
    "name": "<föreslaget namn för passet, t.ex. '4x4 Intervaller'>",
    "duration": <total uppskattad längd i minuter>,
    "structure": [
      {
        "type": "warmup" | "main" | "cooldown" | "interval" | "exercise" | "rest",
        "duration": <minuter om tillämpligt>,
        "zone": <1-5 för cardio>,
        "reps": <antal intervaller/rundor>,
        "sets": <antal set för styrka>,
        "repsCount": "<reps som text, t.ex. '10', '8-12', 'AMRAP'>",
        "exerciseName": "<övningsnamn>",
        "rest": <vila i sekunder>,
        "description": "<fritext beskrivning>"
      }
    ]
  },
  "confidence": <0.0-1.0, hur säker du är på tolkningen>,
  "ambiguities": ["<saker som är oklara och kan behöva förtydligas>"]
}
\`\`\`

## VIKTIGT:
- Om något inte nämns, lämna det fältet som null eller tom array
- Gissa INTE värden som inte nämndes
- Om oklart vem mottagaren är, sätt confidence lågt och lägg till i ambiguities
- Strukturera workout.structure kronologiskt (uppvärmning först, etc.)
- För intervaller, inkludera vila som separat struktur-element`
}

// ============================================
// TARGET RESOLUTION
// ============================================

/**
 * Resolve a target name (athlete or team) to database ID.
 * Uses fuzzy matching to handle variations in names.
 */
export async function resolveTargetName(
  name: string,
  type: 'ATHLETE' | 'TEAM',
  coachId: string
): Promise<VoiceWorkoutTarget> {
  const normalizedName = name.toLowerCase().trim()

  if (type === 'TEAM') {
    // Search for teams
    const teams = await prisma.team.findMany({
      where: {
        userId: coachId,
      },
      select: {
        id: true,
        name: true,
      },
    })

    const matches = teams
      .map((team) => ({
        id: team.id,
        name: team.name,
        score: calculateSimilarity(normalizedName, team.name.toLowerCase()),
      }))
      .filter((m) => m.score > 0.3)
      .sort((a, b) => b.score - a.score)

    if (matches.length === 0) {
      return {
        type: 'TEAM',
        name,
        confidence: 0,
        alternatives: teams.slice(0, 5).map((t) => ({ id: t.id, name: t.name })),
      }
    }

    const bestMatch = matches[0]
    return {
      type: 'TEAM',
      name,
      resolvedId: bestMatch.score > 0.7 ? bestMatch.id : undefined,
      alternatives:
        bestMatch.score <= 0.7 ? matches.slice(0, 5).map((m) => ({ id: m.id, name: m.name })) : undefined,
      confidence: bestMatch.score,
    }
  } else {
    // Search for athletes (clients)
    const clients = await prisma.client.findMany({
      where: {
        userId: coachId,
      },
      select: {
        id: true,
        name: true,
      },
    })

    const matches = clients
      .map((client) => ({
        id: client.id,
        name: client.name,
        score: calculateSimilarity(normalizedName, client.name.toLowerCase()),
      }))
      .filter((m) => m.score > 0.3)
      .sort((a, b) => b.score - a.score)

    if (matches.length === 0) {
      return {
        type: 'ATHLETE',
        name,
        confidence: 0,
        alternatives: clients.slice(0, 5).map((c) => ({ id: c.id, name: c.name })),
      }
    }

    const bestMatch = matches[0]
    return {
      type: 'ATHLETE',
      name,
      resolvedId: bestMatch.score > 0.7 ? bestMatch.id : undefined,
      alternatives:
        bestMatch.score <= 0.7 ? matches.slice(0, 5).map((m) => ({ id: m.id, name: m.name })) : undefined,
      confidence: bestMatch.score,
    }
  }
}

/**
 * Calculate string similarity using Levenshtein distance.
 * Returns a score between 0 and 1.
 */
function calculateSimilarity(str1: string, str2: string): number {
  // Check for exact match
  if (str1 === str2) return 1

  // Check if one contains the other
  if (str1.includes(str2) || str2.includes(str1)) {
    const shorter = str1.length < str2.length ? str1 : str2
    const longer = str1.length >= str2.length ? str1 : str2
    return shorter.length / longer.length * 0.9 + 0.1
  }

  // Check first name match (for athletes)
  const firstName1 = str1.split(' ')[0]
  const firstName2 = str2.split(' ')[0]
  if (firstName1 === firstName2 && firstName1.length > 2) {
    return 0.8
  }

  // Levenshtein distance
  const len1 = str1.length
  const len2 = str2.length
  const maxLen = Math.max(len1, len2)

  if (maxLen === 0) return 1

  const matrix: number[][] = []

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      )
    }
  }

  const distance = matrix[len1][len2]
  return 1 - distance / maxLen
}

// ============================================
// DATE/TIME RESOLUTION
// ============================================

/**
 * Resolve Swedish date and time text to ISO date/time strings.
 */
export function resolveDateAndTime(
  dateText: string,
  timeText?: string,
  locale: AppLocale = 'en'
): { date?: string; time?: string } {
  const result: { date?: string; time?: string } = {}
  const now = new Date()
  const lowerDate = dateText.toLowerCase().trim()

  // Relative days
  if (lowerDate === 'today' || lowerDate === 'idag' || lowerDate === 'i dag') {
    result.date = format(now, 'yyyy-MM-dd')
  } else if (lowerDate === 'tomorrow' || lowerDate === 'imorgon' || lowerDate === 'i morgon') {
    result.date = format(addDays(now, 1), 'yyyy-MM-dd')
  } else if (
    lowerDate === 'the day after tomorrow' ||
    lowerDate === 'day after tomorrow' ||
    lowerDate === 'i övermorgon' ||
    lowerDate === 'övermorgon'
  ) {
    result.date = format(addDays(now, 2), 'yyyy-MM-dd')
  }
  // Weekdays (next occurrence)
  else if (lowerDate.includes('monday') || lowerDate.includes('måndag') || lowerDate.includes('mandag')) {
    const isNextWeek = lowerDate.includes('next') || lowerDate.includes('nästa')
    const date = nextMonday(now)
    result.date = format(isNextWeek ? addWeeks(date, 1) : date, 'yyyy-MM-dd')
  } else if (lowerDate.includes('tuesday') || lowerDate.includes('tisdag')) {
    const isNextWeek = lowerDate.includes('next') || lowerDate.includes('nästa')
    const date = nextTuesday(now)
    result.date = format(isNextWeek ? addWeeks(date, 1) : date, 'yyyy-MM-dd')
  } else if (lowerDate.includes('wednesday') || lowerDate.includes('onsdag')) {
    const isNextWeek = lowerDate.includes('next') || lowerDate.includes('nästa')
    const date = nextWednesday(now)
    result.date = format(isNextWeek ? addWeeks(date, 1) : date, 'yyyy-MM-dd')
  } else if (lowerDate.includes('thursday') || lowerDate.includes('torsdag')) {
    const isNextWeek = lowerDate.includes('next') || lowerDate.includes('nästa')
    const date = nextThursday(now)
    result.date = format(isNextWeek ? addWeeks(date, 1) : date, 'yyyy-MM-dd')
  } else if (lowerDate.includes('friday') || lowerDate.includes('fredag')) {
    const isNextWeek = lowerDate.includes('next') || lowerDate.includes('nästa')
    const date = nextFriday(now)
    result.date = format(isNextWeek ? addWeeks(date, 1) : date, 'yyyy-MM-dd')
  } else if (lowerDate.includes('saturday') || lowerDate.includes('lördag') || lowerDate.includes('lordag')) {
    const isNextWeek = lowerDate.includes('next') || lowerDate.includes('nästa')
    const date = nextSaturday(now)
    result.date = format(isNextWeek ? addWeeks(date, 1) : date, 'yyyy-MM-dd')
  } else if (lowerDate.includes('sunday') || lowerDate.includes('söndag') || lowerDate.includes('sondag')) {
    const isNextWeek = lowerDate.includes('next') || lowerDate.includes('nästa')
    const date = nextSunday(now)
    result.date = format(isNextWeek ? addWeeks(date, 1) : date, 'yyyy-MM-dd')
  }
  // Absolute dates (try various formats)
  else {
    const absoluteDate = parseAbsoluteDate(dateText, locale)
    if (absoluteDate) {
      result.date = format(absoluteDate, 'yyyy-MM-dd')
    }
  }

  // Parse time
  if (timeText) {
    result.time = parseTimeText(timeText)
  }

  return result
}

/**
 * Parse absolute date text in Swedish formats.
 */
function parseAbsoluteDate(text: string, locale: AppLocale = 'en'): Date | null {
  const now = new Date()
  const currentYear = now.getFullYear()

  // Swedish month names
  const months: Record<string, number> = {
    januari: 0,
    jan: 0,
    februari: 1,
    feb: 1,
    mars: 2,
    mar: 2,
    april: 3,
    apr: 3,
    maj: 4,
    juni: 5,
    jun: 5,
    juli: 6,
    jul: 6,
    augusti: 7,
    aug: 7,
    september: 8,
    sep: 8,
    sept: 8,
    oktober: 9,
    okt: 9,
    november: 10,
    nov: 10,
    december: 11,
    dec: 11,
    january: 0,
    february: 1,
    march: 2,
    may: 4,
    june: 5,
    july: 6,
    august: 7,
    october: 9,
  }

  // Try "27 januari" or "den 27 januari"
  const dayMonthMatch = text.match(/(?:den\s+|the\s+)?(\d{1,2})(?::?e|:?a|st|nd|rd|th)?\s+([a-zåäö]+)/i)
  if (dayMonthMatch) {
    const day = parseInt(dayMonthMatch[1], 10)
    const monthName = dayMonthMatch[2].toLowerCase()
    const month = months[monthName]
    if (month !== undefined && day >= 1 && day <= 31) {
      let year = currentYear
      // If the date is in the past, assume next year
      const date = new Date(year, month, day)
      if (date < now) {
        year = currentYear + 1
      }
      return new Date(year, month, day)
    }
  }

  const monthDayMatch = text.match(/([a-zåäö]+)\s+(\d{1,2})(?:st|nd|rd|th)?/i)
  if (monthDayMatch) {
    const monthName = monthDayMatch[1].toLowerCase()
    const day = parseInt(monthDayMatch[2], 10)
    const month = months[monthName]
    if (month !== undefined && day >= 1 && day <= 31) {
      let year = currentYear
      const date = new Date(year, month, day)
      if (date < now) {
        year = currentYear + 1
      }
      return new Date(year, month, day)
    }
  }

  // Try "15/1" or "15-1" or "15.1"
  const numericMatch = text.match(/(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?/)
  if (numericMatch) {
    const day = parseInt(numericMatch[1], 10)
    const month = parseInt(numericMatch[2], 10) - 1
    let year = numericMatch[3] ? parseInt(numericMatch[3], 10) : currentYear
    if (year < 100) year += 2000

    if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
      return new Date(year, month, day)
    }
  }

  // Try to parse with date-fns
  const formats = ['d MMMM', 'd MMM', 'dd/MM', 'dd-MM', 'yyyy-MM-dd']
  for (const fmt of formats) {
    try {
      const parsed = parse(text, fmt, now, { locale: locale === 'sv' ? sv : enUS })
      if (isValid(parsed)) {
        // Adjust year if parsed date is in the past
        if (parsed < now && !fmt.includes('yyyy')) {
          parsed.setFullYear(currentYear + 1)
        }
        return parsed
      }
    } catch {
      continue
    }
  }

  return null
}

/**
 * Parse time text in Swedish formats.
 */
function parseTimeText(text: string): string | undefined {
  const lower = text.toLowerCase().trim()

  // "kl 18", "kl. 18:30", "18:00"
  const timeMatch = lower.match(/(?:kl\.?\s*|at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/)
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10)
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0
    const meridiem = timeMatch[3]

    // Adjust for AM/PM hints
    if (meridiem === 'am' && hours === 12) {
      hours = 0
    } else if (meridiem === 'pm' && hours < 12) {
      hours += 12
    } else if (lower.includes('morning') || lower.includes('morgon') || lower.includes('förmiddag') || lower.includes('fm')) {
      // Morning, keep as is if < 12
    } else if (
      lower.includes('afternoon') ||
      lower.includes('evening') ||
      lower.includes('after work') ||
      lower.includes('eftermiddag') ||
      lower.includes('em') ||
      lower.includes('kväll')
    ) {
      // Afternoon/evening, add 12 if < 12
      if (hours < 12) hours += 12
    }

    // Sanity check
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    }
  }

  // Time of day phrases
  if (lower.includes('morning') || lower.includes('morgon') || lower.includes('förmiddag')) {
    return '09:00'
  } else if (lower.includes('lunch') || lower.includes('middag')) {
    return '12:00'
  } else if (lower.includes('afternoon') || lower.includes('eftermiddag')) {
    return '15:00'
  } else if (lower.includes('evening') || lower.includes('after work') || lower.includes('kväll')) {
    return '18:00'
  }

  return undefined
}

// ============================================
// FALLBACK
// ============================================

/**
 * Create a fallback intent when parsing fails.
 */
function createFallbackIntent(rawText: string, locale: AppLocale = 'en'): ParsedIntentRaw {
  return {
    transcription: rawText,
    target: {
      type: 'ATHLETE',
      name: '',
    },
    schedule: {
      dateText: '',
      timeText: undefined,
    },
    workout: {
      type: 'CARDIO' as VoiceWorkoutType,
      subtype: undefined,
      name: undefined,
      duration: undefined,
      structure: [],
    },
    confidence: 0.2,
    ambiguities: [
      t(locale, 'Could not interpret the voice command correctly', 'Kunde inte tolka röstkommandot korrekt'),
      t(locale, 'Please specify recipient (athlete or team)', 'Vänligen specificera mottagare (atlet eller lag)'),
      t(locale, 'Please specify date', 'Vänligen specificera datum'),
      t(locale, 'Please specify workout type', 'Vänligen specificera typ av pass'),
    ],
  }
}

// ============================================
// COACH ATHLETES/TEAMS LOOKUP
// ============================================

/**
 * Get all athletes and teams for a coach (for target selection UI).
 */
export async function getCoachAthletesAndTeams(coachId: string): Promise<{
  athletes: Array<{ id: string; name: string; email?: string }>
  teams: Array<{ id: string; name: string; memberCount: number }>
}> {
  const [clients, teams] = await Promise.all([
    prisma.client.findMany({
      where: { userId: coachId },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
    prisma.team.findMany({
      where: { userId: coachId },
      select: {
        id: true,
        name: true,
        _count: { select: { members: true } },
      },
      orderBy: { name: 'asc' },
    }),
  ])

  return {
    athletes: clients.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email || undefined,
    })),
    teams: teams.map((t) => ({
      id: t.id,
      name: t.name,
      memberCount: t._count.members,
    })),
  }
}
