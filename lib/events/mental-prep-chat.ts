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

const PREP_TYPE_LABELS: Record<MentalPrepChatEvent['prepType'], string> = {
  VISUALIZATION: 'visualisering',
  RACE_PLAN: 'tävlingsplan',
  AFFIRMATIONS: 'affirmationer och mental styrka',
}

const DISTANCE_LABELS: Record<string, string> = {
  '5K': '5 km',
  '10K': '10 km',
  HALF: 'halvmaraton',
  MARATHON: 'maraton',
}

/**
 * Build the initial user message for the mental prep chat session
 */
export function buildMentalPrepMessage(event: MentalPrepChatEvent): string {
  const distance = DISTANCE_LABELS[event.distance] || event.distance || ''
  const prepLabel = PREP_TYPE_LABELS[event.prepType] || 'mental förberedelse'
  const raceName = event.raceName || 'mitt lopp'
  const daysText = event.daysUntilRace === 1
    ? 'imorgon'
    : `om ${event.daysUntilRace || 0} dagar`

  const distancePart = distance ? ` (${distance})` : ''
  let message = `Jag vill göra mental förberedelse inför ${raceName}${distancePart} som är ${daysText}. `
  message += `Dagens fokus är ${prepLabel}. `

  if (event.targetTime) {
    message += `Min måltid är ${event.targetTime}. `
  }

  message += 'Kan du guida mig genom övningen?'

  return message
}

/**
 * Build additional page context for the AI system prompt
 */
export function buildMentalPrepPageContext(event: MentalPrepChatEvent): string {
  const distance = DISTANCE_LABELS[event.distance] || event.distance || 'okänd'
  const prepLabel = PREP_TYPE_LABELS[event.prepType] || 'mental förberedelse'
  const raceName = event.raceName || 'Lopp'

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
