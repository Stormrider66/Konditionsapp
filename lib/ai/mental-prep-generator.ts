/**
 * Mental Prep Generator
 *
 * Generates personalized mental preparation content for upcoming races:
 * - Day 3: Visualization exercises
 * - Day 2: Race plan and strategy
 * - Day 1: Affirmations and confidence boosters
 */

import { generateAIResponse } from './ai-service'

export type MentalPrepType = 'VISUALIZATION' | 'RACE_PLAN' | 'AFFIRMATIONS'

export interface MentalPrepContext {
  raceName: string
  raceDate: Date
  distance: string // "5K", "10K", "HALF", "MARATHON"
  targetTime: string | null
  targetPace: number | null // sec/km
  classification: string // "A", "B", "C"
  athleteName: string
  coachUserId: string
}

export interface MentalPrepContent {
  title: string
  subtitle: string
  prepType: MentalPrepType
  mainContent: string
  preview: string
  bulletPoints: string[]
  daysUntilRace: number
}

const DISTANCE_LABELS: Record<string, string> = {
  '5K': '5 km',
  '10K': '10 km',
  HALF: 'Halvmaraton',
  MARATHON: 'Maraton',
}

function formatPace(secPerKm: number): string {
  const min = Math.floor(secPerKm / 60)
  const sec = Math.round(secPerKm % 60)
  return `${min}:${sec.toString().padStart(2, '0')}/km`
}

function getDaysLabel(days: number): string {
  if (days === 1) return 'imorgon'
  return `om ${days} dagar`
}

/**
 * Generate visualization content for Day 3
 */
async function generateVisualization(
  ctx: MentalPrepContext,
  daysUntilRace: number
): Promise<MentalPrepContent> {
  const distanceLabel = DISTANCE_LABELS[ctx.distance] || ctx.distance
  const paceStr = ctx.targetPace ? formatPace(ctx.targetPace) : null

  const prompt = `Du är en mental coach för löpare. Skriv en guidad visualiseringsövning för en atlet som ska springa ett lopp.

Lopp: ${ctx.raceName}
Distans: ${distanceLabel}
${ctx.targetTime ? `Måltid: ${ctx.targetTime}` : ''}
${paceStr ? `Målpace: ${paceStr}` : ''}
Prioritet: ${ctx.classification === 'A' ? 'A-lopp (säsongens viktigaste)' : ctx.classification === 'B' ? 'B-lopp (viktigt)' : 'C-lopp (träningslopp)'}

Skriv en visualiseringsövning på svenska som:
1. Börjar med att atleten blundar och tar djupa andetag
2. Visualiserar startområdet och nervositeten som förvandlas till fokus
3. Går igenom loppets tre faser: start, mitten, finish
4. Inkluderar hantering av tuffa moment
5. Slutar med att korsa mållinjen starkt

Skriv i andra person ("du ser dig själv..."). Håll texten mellan 200-300 ord.
Skriv ENDAST visualiseringstexten, ingen introduktion eller avslutning.`

  const mainContent = await generateAIResponse(ctx.coachUserId, prompt, {
    maxTokens: 800,
    temperature: 0.7,
  })

  // Extract preview (first 2-3 sentences)
  const sentences = mainContent.split(/(?<=[.!?])\s+/)
  const preview = sentences.slice(0, 3).join(' ')

  return {
    title: 'Mental förberedelse - Visualisering',
    subtitle: `${ctx.raceName} ${getDaysLabel(daysUntilRace)}`,
    prepType: 'VISUALIZATION',
    mainContent,
    preview,
    bulletPoints: [
      'Blunda och ta djupa andetag',
      'Visualisera startområdet',
      'Känn din pace genom loppet',
      'Se dig själv korsa mållinjen',
    ],
    daysUntilRace,
  }
}

/**
 * Generate race plan content for Day 2
 */
async function generateRacePlan(
  ctx: MentalPrepContext,
  daysUntilRace: number
): Promise<MentalPrepContent> {
  const distanceLabel = DISTANCE_LABELS[ctx.distance] || ctx.distance
  const paceStr = ctx.targetPace ? formatPace(ctx.targetPace) : null

  const prompt = `Du är en erfaren löpcoach. Skapa en tävlingsplan för en atlet som ska springa ett lopp.

Lopp: ${ctx.raceName}
Distans: ${distanceLabel}
${ctx.targetTime ? `Måltid: ${ctx.targetTime}` : ''}
${paceStr ? `Målpace: ${paceStr}` : ''}
Prioritet: ${ctx.classification === 'A' ? 'A-lopp (säsongens viktigaste)' : ctx.classification === 'B' ? 'B-lopp (viktigt)' : 'C-lopp (träningslopp)'}

Skapa en tävlingsplan på svenska som inkluderar:

1. **Pacingstrategi** - Hur ska atleten fördela kraften? (första tredjedelen, mitten, sista tredjedelen)
2. **Plan A** - Om allt känns bra
3. **Plan B** - Om det blir tufft (väder, form, etc.)
4. **Mentala checkpoints** - Vad ska atleten tänka vid olika punkter i loppet?
5. **Pre-race rutin** - Morgonen innan loppet

Skriv konkret och handlingsbart. Använd punktlistor där lämpligt.
Håll texten mellan 250-350 ord.`

  const mainContent = await generateAIResponse(ctx.coachUserId, prompt, {
    maxTokens: 900,
    temperature: 0.7,
  })

  const sentences = mainContent.split(/(?<=[.!?])\s+/)
  const preview = sentences.slice(0, 3).join(' ')

  const bulletPoints: string[] = []
  if (paceStr) {
    bulletPoints.push(`Målpace: ${paceStr}`)
  }
  bulletPoints.push(
    'Starta kontrollerat - spara kraft',
    'Ha en Plan B redo',
    'Fokusera på en kilometer i taget'
  )

  return {
    title: 'Mental förberedelse - Tävlingsplan',
    subtitle: `${ctx.raceName} ${getDaysLabel(daysUntilRace)}`,
    prepType: 'RACE_PLAN',
    mainContent,
    preview,
    bulletPoints,
    daysUntilRace,
  }
}

/**
 * Generate affirmations content for Day 1
 */
async function generateAffirmations(
  ctx: MentalPrepContext,
  daysUntilRace: number
): Promise<MentalPrepContent> {
  const distanceLabel = DISTANCE_LABELS[ctx.distance] || ctx.distance

  const prompt = `Du är en mental coach och motivatör för löpare. Skriv positiva affirmationer och en peppande text för en atlet som ska tävla imorgon.

Lopp: ${ctx.raceName}
Distans: ${distanceLabel}
${ctx.targetTime ? `Måltid: ${ctx.targetTime}` : ''}
Prioritet: ${ctx.classification === 'A' ? 'A-lopp (säsongens viktigaste)' : ctx.classification === 'B' ? 'B-lopp (viktigt)' : 'C-lopp (träningslopp)'}

Skriv på svenska:

1. **5-7 kraftfulla affirmationer** som atleten kan upprepa för sig själv
   - "Jag har tränat för detta"
   - "Min kropp är stark och redo"
   - etc.

2. **En kort peppande text** (100-150 ord) som påminner atleten om:
   - Allt förarbete som lagts ner
   - Att nervositet är energi
   - Att lita på sin träning
   - Att njuta av upplevelsen

3. **Morgonrutin på loppsdagen** - 3-4 enkla steg för att starta dagen rätt

Tonen ska vara varm, stöttande och energigivande.`

  const mainContent = await generateAIResponse(ctx.coachUserId, prompt, {
    maxTokens: 800,
    temperature: 0.8,
  })

  const sentences = mainContent.split(/(?<=[.!?])\s+/)
  const preview = sentences.slice(0, 3).join(' ')

  return {
    title: 'Mental förberedelse - Du är redo!',
    subtitle: `${ctx.raceName} ${getDaysLabel(daysUntilRace)}`,
    prepType: 'AFFIRMATIONS',
    mainContent,
    preview,
    bulletPoints: [
      'Jag har tränat för detta',
      'Min kropp är redo',
      'Jag litar på min förmåga',
      'Idag visar jag vad jag kan',
    ],
    daysUntilRace,
  }
}

/**
 * Generate mental prep content for a specific prep type
 */
export async function generateMentalPrepContent(
  ctx: MentalPrepContext,
  prepType: MentalPrepType,
  daysUntilRace: number
): Promise<MentalPrepContent> {
  switch (prepType) {
    case 'VISUALIZATION':
      return generateVisualization(ctx, daysUntilRace)
    case 'RACE_PLAN':
      return generateRacePlan(ctx, daysUntilRace)
    case 'AFFIRMATIONS':
      return generateAffirmations(ctx, daysUntilRace)
  }
}

/**
 * Determine which prep type to use based on days until race
 */
export function getPrepTypeForDay(daysUntilRace: number): MentalPrepType | null {
  switch (daysUntilRace) {
    case 3:
      return 'VISUALIZATION'
    case 2:
      return 'RACE_PLAN'
    case 1:
      return 'AFFIRMATIONS'
    default:
      return null
  }
}
