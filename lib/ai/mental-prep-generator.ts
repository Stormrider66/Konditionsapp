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
type AppLocale = 'en' | 'sv'

export interface MentalPrepContext {
  raceName: string
  raceDate: Date
  distance: string // "5K", "10K", "HALF", "MARATHON"
  targetTime: string | null
  targetPace: number | null // sec/km
  classification: string // "A", "B", "C"
  athleteName: string
  coachUserId: string
  clientId?: string
  locale?: AppLocale
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

const DISTANCE_LABELS: Record<string, { en: string; sv: string }> = {
  '5K': { en: '5 km', sv: '5 km' },
  '10K': { en: '10 km', sv: '10 km' },
  HALF: { en: 'Half marathon', sv: 'Halvmaraton' },
  MARATHON: { en: 'Marathon', sv: 'Maraton' },
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function getDistanceLabel(distance: string, locale: AppLocale): string {
  return DISTANCE_LABELS[distance]?.[locale] || distance
}

function formatPace(secPerKm: number): string {
  const min = Math.floor(secPerKm / 60)
  const sec = Math.round(secPerKm % 60)
  return `${min}:${sec.toString().padStart(2, '0')}/km`
}

function getDaysLabel(days: number, locale: AppLocale): string {
  if (days === 1) return t(locale, 'tomorrow', 'imorgon')
  return t(locale, `in ${days} days`, `om ${days} dagar`)
}

function getPriorityLabel(classification: string, locale: AppLocale): string {
  if (classification === 'A') {
    return t(locale, 'A race (most important race of the season)', 'A-lopp (säsongens viktigaste)')
  }
  if (classification === 'B') {
    return t(locale, 'B race (important)', 'B-lopp (viktigt)')
  }
  return t(locale, 'C race (training race)', 'C-lopp (träningslopp)')
}

/**
 * Generate visualization content for Day 3
 */
async function generateVisualization(
  ctx: MentalPrepContext,
  daysUntilRace: number
): Promise<MentalPrepContent> {
  const locale = ctx.locale ?? 'en'
  const distanceLabel = getDistanceLabel(ctx.distance, locale)
  const paceStr = ctx.targetPace ? formatPace(ctx.targetPace) : null

  const prompt = locale === 'sv'
    ? `Du är en mental coach för löpare. Skriv en guidad visualiseringsövning för en atlet som ska springa ett lopp.

Lopp: ${ctx.raceName}
Distans: ${distanceLabel}
${ctx.targetTime ? `Mål-tid: ${ctx.targetTime}` : ''}
${paceStr ? `Målpace: ${paceStr}` : ''}
Prioritet: ${getPriorityLabel(ctx.classification, locale)}

Skriv en visualiseringsövning på svenska som:
1. Börjar med att atleten blundar och tar djupa andetag
2. Visualiserar startområdet och nervositeten som förvandlas till fokus
3. Går igenom loppets tre faser: start, mitten, finish
4. Inkluderar hantering av tuffa moment
5. Slutar med att korsa mållinjen starkt

Skriv i andra person ("du ser dig själv..."). Håll texten mellan 200-300 ord.
Skriv ENDAST visualiseringstexten, ingen introduktion eller avslutning.`
    : `You are a mental coach for runners. Write a guided visualization exercise for an athlete who is about to race.

Race: ${ctx.raceName}
Distance: ${distanceLabel}
${ctx.targetTime ? `Target time: ${ctx.targetTime}` : ''}
${paceStr ? `Target pace: ${paceStr}` : ''}
Priority: ${getPriorityLabel(ctx.classification, locale)}

Write a visualization exercise in English that:
1. Starts with the athlete closing their eyes and taking deep breaths
2. Visualizes the start area and nerves transforming into focus
3. Walks through the three phases of the race: start, middle, finish
4. Includes handling difficult moments
5. Ends with crossing the finish line strongly

Write in second person ("you see yourself..."). Keep the text between 200-300 words.
Write ONLY the visualization text, no introduction or closing.`

  const mainContent = await generateAIResponse(ctx.coachUserId, prompt, {
    maxTokens: 800,
    temperature: 0.7,
    clientId: ctx.clientId,
    category: 'athlete_mental_prep',
  })

  // Extract preview (first 2-3 sentences)
  const sentences = mainContent.split(/(?<=[.!?])\s+/)
  const preview = sentences.slice(0, 3).join(' ')

  return {
    title: t(locale, 'Mental preparation - Visualization', 'Mental förberedelse - Visualisering'),
    subtitle: `${ctx.raceName} ${getDaysLabel(daysUntilRace, locale)}`,
    prepType: 'VISUALIZATION',
    mainContent,
    preview,
    bulletPoints: locale === 'sv'
      ? [
          'Blunda och ta djupa andetag',
          'Visualisera startområdet',
          'Känn din pace genom loppet',
          'Se dig själv korsa mållinjen',
        ]
      : [
          'Close your eyes and take deep breaths',
          'Visualize the start area',
          'Feel your pace through the race',
          'See yourself crossing the finish line',
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
  const locale = ctx.locale ?? 'en'
  const distanceLabel = getDistanceLabel(ctx.distance, locale)
  const paceStr = ctx.targetPace ? formatPace(ctx.targetPace) : null

  const prompt = locale === 'sv'
    ? `Du är en erfaren löpcoach. Skapa en tävlingsplan för en atlet som ska springa ett lopp.

Lopp: ${ctx.raceName}
Distans: ${distanceLabel}
${ctx.targetTime ? `Mål-tid: ${ctx.targetTime}` : ''}
${paceStr ? `Målpace: ${paceStr}` : ''}
Prioritet: ${getPriorityLabel(ctx.classification, locale)}

Skapa en tävlingsplan på svenska som inkluderar:

1. **Pacingstrategi** - Hur ska atleten fördela kraften? (första tredjedelen, mitten, sista tredjedelen)
2. **Plan A** - Om allt känns bra
3. **Plan B** - Om det blir tufft (väder, form, etc.)
4. **Mentala checkpoints** - Vad ska atleten tänka vid olika punkter i loppet?
5. **Pre-race rutin** - Morgonen innan loppet

Skriv konkret och handlingsbart. Använd punktlistor där lämpligt.
Håll texten mellan 250-350 ord.`
    : `You are an experienced running coach. Create a race plan for an athlete who is about to race.

Race: ${ctx.raceName}
Distance: ${distanceLabel}
${ctx.targetTime ? `Target time: ${ctx.targetTime}` : ''}
${paceStr ? `Target pace: ${paceStr}` : ''}
Priority: ${getPriorityLabel(ctx.classification, locale)}

Create a race plan in English that includes:

1. **Pacing strategy** - How should the athlete distribute effort? (first third, middle, final third)
2. **Plan A** - If everything feels good
3. **Plan B** - If it gets tough (weather, form, etc.)
4. **Mental checkpoints** - What should the athlete focus on at different points in the race?
5. **Pre-race routine** - The morning before the race

Write concretely and actionably. Use bullet lists where appropriate.
Keep the text between 250-350 words.`

  const mainContent = await generateAIResponse(ctx.coachUserId, prompt, {
    maxTokens: 900,
    temperature: 0.7,
    clientId: ctx.clientId,
    category: 'athlete_mental_prep',
  })

  const sentences = mainContent.split(/(?<=[.!?])\s+/)
  const preview = sentences.slice(0, 3).join(' ')

  const bulletPoints: string[] = []
  if (paceStr) {
    bulletPoints.push(t(locale, `Target pace: ${paceStr}`, `Målpace: ${paceStr}`))
  }
  bulletPoints.push(...(locale === 'sv'
    ? [
        'Starta kontrollerat - spara kraft',
        'Ha en Plan B redo',
        'Fokusera på en kilometer i taget',
      ]
    : [
        'Start controlled - save energy',
        'Have a Plan B ready',
        'Focus on one kilometer at a time',
      ]))

  return {
    title: t(locale, 'Mental preparation - Race plan', 'Mental förberedelse - Tävlingsplan'),
    subtitle: `${ctx.raceName} ${getDaysLabel(daysUntilRace, locale)}`,
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
  const locale = ctx.locale ?? 'en'
  const distanceLabel = getDistanceLabel(ctx.distance, locale)

  const prompt = locale === 'sv'
    ? `Du är en mental coach och motivatör för löpare. Skriv positiva affirmationer och en peppande text för en atlet som ska tävla imorgon.

Lopp: ${ctx.raceName}
Distans: ${distanceLabel}
${ctx.targetTime ? `Mål-tid: ${ctx.targetTime}` : ''}
Prioritet: ${getPriorityLabel(ctx.classification, locale)}

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
    : `You are a mental coach and motivator for runners. Write positive affirmations and an encouraging text for an athlete racing tomorrow.

Race: ${ctx.raceName}
Distance: ${distanceLabel}
${ctx.targetTime ? `Target time: ${ctx.targetTime}` : ''}
Priority: ${getPriorityLabel(ctx.classification, locale)}

Write in English:

1. **5-7 powerful affirmations** the athlete can repeat to themselves
   - "I have trained for this"
   - "My body is strong and ready"
   - etc.

2. **A short encouraging text** (100-150 words) reminding the athlete:
   - Of all the preparation they have done
   - That nerves are energy
   - To trust their training
   - To enjoy the experience

3. **Race morning routine** - 3-4 simple steps to start the day well

The tone should be warm, supportive, and energizing.`

  const mainContent = await generateAIResponse(ctx.coachUserId, prompt, {
    maxTokens: 800,
    temperature: 0.8,
    clientId: ctx.clientId,
    category: 'athlete_mental_prep',
  })

  const sentences = mainContent.split(/(?<=[.!?])\s+/)
  const preview = sentences.slice(0, 3).join(' ')

  return {
    title: t(locale, 'Mental preparation - You are ready!', 'Mental förberedelse - Du är redo!'),
    subtitle: `${ctx.raceName} ${getDaysLabel(daysUntilRace, locale)}`,
    prepType: 'AFFIRMATIONS',
    mainContent,
    preview,
    bulletPoints: locale === 'sv'
      ? [
          'Jag har tränat för detta',
          'Min kropp är redo',
          'Jag litar på min förmåga',
          'Idag visar jag vad jag kan',
        ]
      : [
          'I have trained for this',
          'My body is ready',
          'I trust my ability',
          'Today I show what I can do',
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
