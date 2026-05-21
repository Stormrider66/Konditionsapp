/**
 * Mental Prep Chat Event
 *
 * Custom DOM event used to open the floating AI chat with mental prep context.
 * Dispatched by MentalPrepCard, listened to by AthleteFloatingChat.
 */

export const MENTAL_PREP_CHAT_EVENT = 'mental-prep-chat'

export interface MentalPrepChatEvent {
  prepType: 'VISUALIZATION' | 'RACE_PLAN' | 'AFFIRMATIONS'
  raceName: string
  raceDate: string
  distance: string
  targetTime: string | null
  daysUntilRace: number
}

type AppLocale = 'en' | 'sv'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

const PREP_TYPE_LABELS: Record<AppLocale, Record<MentalPrepChatEvent['prepType'], string>> = {
  en: {
    VISUALIZATION: 'visualization',
    RACE_PLAN: 'race plan',
    AFFIRMATIONS: 'affirmations and mental strength',
  },
  sv: {
    VISUALIZATION: 'visualisering',
    RACE_PLAN: 'tävlingsplan',
    AFFIRMATIONS: 'affirmationer och mental styrka',
  },
}

const DISTANCE_LABELS: Record<AppLocale, Record<string, string>> = {
  en: {
    '5K': '5 km',
    '10K': '10 km',
    HALF: 'half marathon',
    MARATHON: 'marathon',
  },
  sv: {
    '5K': '5 km',
    '10K': '10 km',
    HALF: 'halvmaraton',
    MARATHON: 'maraton',
  },
}

/**
 * Build the initial user message for the mental prep chat session
 */
export function buildMentalPrepMessage(event: MentalPrepChatEvent, locale: AppLocale = 'en'): string {
  const distance = DISTANCE_LABELS[locale][event.distance] || event.distance || ''
  const prepLabel = PREP_TYPE_LABELS[locale][event.prepType] || t(locale, 'mental preparation', 'mental förberedelse')
  const raceName = event.raceName || t(locale, 'my race', 'mitt lopp')
  const daysText = event.daysUntilRace === 1
    ? t(locale, 'tomorrow', 'imorgon')
    : t(locale, `in ${event.daysUntilRace || 0} days`, `om ${event.daysUntilRace || 0} dagar`)

  const distancePart = distance ? ` (${distance})` : ''
  let message = t(
    locale,
    `I want to do mental preparation for ${raceName}${distancePart}, which is ${daysText}. `,
    `Jag vill göra mental förberedelse inför ${raceName}${distancePart} som är ${daysText}. `
  )
  message += t(locale, `Today's focus is ${prepLabel}. `, `Dagens fokus är ${prepLabel}. `)

  if (event.targetTime) {
    message += t(locale, `My target time is ${event.targetTime}. `, `Min måltid är ${event.targetTime}. `)
  }

  message += t(locale, 'Can you guide me through the exercise?', 'Kan du guida mig genom övningen?')

  return message
}

/**
 * Build additional page context for the AI system prompt
 */
export function buildMentalPrepPageContext(event: MentalPrepChatEvent, locale: AppLocale = 'en'): string {
  const distance = DISTANCE_LABELS[locale][event.distance] || event.distance || t(locale, 'unknown', 'okänd')
  const prepLabel = PREP_TYPE_LABELS[locale][event.prepType] || t(locale, 'mental preparation', 'mental förberedelse')
  const raceName = event.raceName || t(locale, 'Race', 'Lopp')

  if (locale !== 'sv') {
    return `
## MENTAL PREPARATION - ACTIVE SESSION

The athlete has started a guided mental preparation exercise. Act as a mental coach.

**Race:** ${raceName}
**Distance:** ${distance}
**Days remaining:** ${event.daysUntilRace || 0}
${event.targetTime ? `**Target time:** ${event.targetTime}` : ''}
**Exercise:** ${prepLabel}

### INSTRUCTIONS FOR THIS SESSION

${event.prepType === 'VISUALIZATION' ? `**VISUALIZATION (Day 3 before race)**
Guide the athlete through a step-by-step visualization exercise:
1. Start with relaxation - ask the athlete to close their eyes and take deep breaths
2. Visualize the start area - smells, sounds, other runners
3. See themselves starting the race at the right pace
4. Visualize the middle section - how do they handle fatigue?
5. Finish by crossing the finish line strongly
6. Ask how it felt and give feedback

Write in second person ("You see yourself..."). Make it personal and vivid.
Be interactive - ask questions between steps and adapt based on responses.` : ''}
${event.prepType === 'RACE_PLAN' ? `**RACE PLAN (Day 2 before race)**
Help the athlete build a race plan through conversation:
1. Ask about experience with the distance and previous results
2. Discuss pacing strategy - conservative start, negative splits?
3. Build Plan A (everything goes well) and Plan B (tough conditions)
4. Identify mental checkpoints during the race
5. Discuss the pre-race routine - evening before and morning of the race

Be concrete and action-oriented. Use athlete data when available.` : ''}
${event.prepType === 'AFFIRMATIONS' ? `**AFFIRMATIONS (Day 1 before race)**
Build the athlete's confidence:
1. Ask how the athlete feels about the race (nerves, expectations?)
2. Create personal affirmations based on their answers
3. Remind them of the work they have done (reference data if possible)
4. Walk through a simple morning routine for race day
5. End with an encouraging summary

Tone should be warm, supportive, and energizing. Turn nerves into positive energy.` : ''}

### TONE
- Personal and present - like a mental coach sitting beside them
- Ask questions and let the athlete answer - make it a dialogue, not a monologue
- Adapt to the athlete's responses and emotional state
- Keep each message reasonably short (3-5 paragraphs max)
- End each message with a question or prompt to keep the dialogue going
`
  }

  return `
## MENTAL FÖRBEREDELSE — AKTIV SESSION

Atleten har startat en guidad mental förberedelseövning. Du ska agera som mental coach.

**Lopp:** ${raceName}
**Distans:** ${distance}
**Dagar kvar:** ${event.daysUntilRace || 0}
${event.targetTime ? `**Måltid:** ${event.targetTime}` : ''}
**Övning:** ${prepLabel}

### INSTRUKTIONER FÖR DENNA SESSION

${event.prepType === 'VISUALIZATION' ? `**VISUALISERING (Dag 3 före lopp)**
Guida atleten genom en steg-för-steg visualiseringsövning:
1. Börja med avslappning — be atleten blunda och ta djupa andetag
2. Visualisera startområdet — dofter, ljud, andra löpare
3. Se sig själv starta loppet i rätt tempo
4. Visualisera mittenpartiet — hur hanterar man tröttheten?
5. Avsluta med att korsa mållinjen starkt
6. Fråga hur det kändes och ge feedback

Skriv i andra person ("Du ser dig själv..."). Gör det personligt och levande.
Var interaktiv — ställ frågor mellan stegen och anpassa baserat på svar.` : ''}
${event.prepType === 'RACE_PLAN' ? `**TÄVLINGSPLAN (Dag 2 före lopp)**
Hjälp atleten bygga en tävlingsplan genom konversation:
1. Fråga om erfarenhet av distansen och tidigare resultat
2. Diskutera pacingstrategi — konservativ start, negativa splits?
3. Bygg Plan A (allt går bra) och Plan B (tuffa förhållanden)
4. Identifiera mentala checkpoints under loppet
5. Diskutera pre-race rutin — kvällen innan och morgonen

Var konkret och handlingsorienterad. Använd atletens data om tillgänglig.` : ''}
${event.prepType === 'AFFIRMATIONS' ? `**AFFIRMATIONER (Dag 1 före lopp)**
Bygg upp atletens självförtroende:
1. Fråga vad atleten känner inför loppet (nervositet, förväntan?)
2. Skapa personliga affirmationer baserat på deras svar
3. Påminn om det förarbete de lagt ner (referera data om möjligt)
4. Gå igenom en enkel morgonrutin för loppsdagen
5. Avsluta med en peppande sammanfattning

Tonen ska vara varm, stöttande och energigivande. Omvandla nervositet till positiv energi.` : ''}

### TONSTIL
- Personlig och närvarande — som en mental coach som sitter bredvid
- Ställ frågor och låt atleten svara — gör det till en dialog, inte en monolog
- Anpassa efter atletens svar och känsloläge
- Håll varje meddelande lagom långt (3-5 stycken max)
- Avsluta varje meddelande med en fråga eller uppmaning för att hålla dialogen igång
`
}
