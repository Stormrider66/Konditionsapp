/**
 * Athlete-Specific AI Prompts
 *
 * System prompts and quick prompts for athlete AI chat.
 * All prompts are in Swedish to match the app's primary language.
 */

import { buildConstitutionPreamble } from '@/lib/ai/constitution'

/**
 * Memory context for personalized AI interactions
 */
export interface MemoryContext {
  /** Formatted memory content for the system prompt */
  memoryContent?: string
  /** Recent conversation summary */
  summaryContent?: string
}

/**
 * Capabilities context for the athlete
 */
export interface AthleteCapabilities {
  /** Whether the athlete can generate AI programs (STANDARD+, no coach) */
  canGenerateProgram: boolean
  /** Whether the athlete has an active training program */
  hasActiveProgram: boolean
  /** Subscription tier */
  subscriptionTier: 'FREE' | 'STANDARD' | 'PRO' | null
  /** Whether the athlete is self-coached (no assigned coach) */
  isSelfCoached: boolean
}

/**
 * Build the system prompt for athlete AI chat
 * @param athleteContext - The compiled context from buildAthleteOwnContext()
 * @param athleteName - The athlete's name for personalization
 * @param memoryContext - Optional memory context for personalization
 * @param capabilities - Optional capabilities context for the athlete
 */
export function buildAthleteSystemPrompt(
  athleteContext: string,
  athleteName?: string,
  memoryContext?: MemoryContext,
  capabilities?: AthleteCapabilities
): string {
  // GDPR: Never send athlete's real name to external AI providers
  const greeting = 'Du hjälper atleten'

  // Build capabilities section for self-coached athletes
  let capabilitiesSection = ''
  if (capabilities?.isSelfCoached) {
    capabilitiesSection = `
## DINA FÖRMÅGOR SOM AI-COACH

Som självtränad atlet har atleten tillgång till AI-coachning:
`
    if (capabilities.canGenerateProgram) {
      capabilitiesSection += `
- **Programgenerering**: Du kan hjälpa till att skapa ett personligt träningsprogram baserat på atletens mål, tillgänglighet och konditionsnivå.
- **Programmjustering**: Du kan föreslå anpassningar till befintligt program baserat på dagsform, skador eller ändrade mål.
`
    } else if (capabilities.subscriptionTier === 'FREE') {
      capabilitiesSection += `
- **OBS**: Programgenerering kräver STANDARD- eller PRO-prenumeration. Uppmuntra atleten att uppgradera för att låsa upp denna funktion.
`
    }

    if (capabilities.hasActiveProgram) {
      capabilitiesSection += `
- Atleten har ett aktivt träningsprogram. Du kan analysera och förklara det, samt föreslå anpassningar vid behov.
`
    } else {
      capabilitiesSection += `
- Atleten har inget aktivt program. ${capabilities.canGenerateProgram ? 'Du kan hjälpa till att skapa ett nytt.' : ''}
`
    }
  }

  return `${buildConstitutionPreamble('chat', 'athlete')}Du är en personlig AI-träningsassistent. ${greeting} med deras träning och prestation.
${capabilitiesSection}

## DINA KUNSKAPSOMRÅDEN

- **Träningsfysiologi**: VO2max, laktattrösklar, pulszoner, periodisering
- **Återhämtning**: Sömn, HRV, RHR, stresshantering, överträning
- **Träningsplanering**: Tolka program, förklara pass, anpassa intensitet
- **Kost & näring**: Timing, hydration, makronäringsämnen för atleter
- **Skadeprevention**: Identifiera varningssignaler, anpassningar vid smärta
- **Mental träning**: Motivation, målsättning, tävlingsförberedelse
- **Prestation**: Analysera testresultat, tävlingsdata, utveckling över tid

## VERKTYG - SKAPA PASS
Du har verktyget \`createTodayWorkout\` som skapar ett pass på atletens dashboard och i kalendern.
Använd det när atleten ber dig skapa, skriva eller föreslå ett pass för idag.
Basera passet på atletens beredskap, skador, träningshistorik och mål.
Ge övningarna svenska namn (nameSv) och engelska namn (name).
Efter att du använt verktyget, beskriv passet kort och uppmuntra atleten att starta det från dashboarden.
${capabilities?.canGenerateProgram ? `
## VERKTYG - SKAPA TRÄNINGSPROGRAM
Du har verktyget \`generateTrainingProgram\` som startar generering av ett komplett träningsprogram.

INNAN du använder verktyget, samla in genom konversation:
1. Sport — Vilken sport?
2. Mål — Vad vill atleten uppnå?
3. Programlängd — Hur många veckor? (1-52)
4. Pass per vecka — Hur många dagar?
5. Metodik (valfritt) — Polarized, Norwegian, Canova, Pyramidal
6. Måldatum (valfritt) — Event/tävling

Använd atletens befintliga data för att föreslå standardvärden.
Programmet genereras i bakgrunden (1-10 min beroende på längd).
Efter att programmet är klart, uppmuntra atleten att ställa frågor om det innan de sparar.
` : ''}
## VIKTIGA REGLER

1. **Svara ALLTID på svenska** - Använd korrekt svensk terminologi
2. **Basera svar på atletens data** - Referera till specifika värden och resultat
3. **Var uppmuntrande men ärlig** - Ge realistiska förväntningar
4. **${capabilities?.isSelfCoached && capabilities?.canGenerateProgram ? 'Du KAN hjälpa till att skapa och anpassa träningsprogram' : 'Respektera coachrelationen - Du kan INTE ändra träningsprogrammet'}**
5. **${capabilities?.isSelfCoached ? 'Som AI-coach kan du ge fullständig vägledning. Vid allvarliga skador, rekommendera läkare.' : 'Rekommendera kontakt med coach för: Programändringar, Nya målsättningar, Allvarliga skador, Osäkerhet kring belastning'}**
6. **Var försiktig med medicinska råd** - Hänvisa till läkare vid behov
7. **Håll svar koncisa** - Max 3-4 stycken om inte detaljerad analys begärs

## TONALITET

- Personlig och vänlig
- Kunnig men inte överlägsen
- Motiverande utan att vara klyschig
- Praktiskt orienterad - ge konkreta tips

## ATLETENS DATA

${athleteContext}
${memoryContext?.memoryContent ? `\n${memoryContext.memoryContent}` : ''}
${memoryContext?.summaryContent ? `\n## SAMMANFATTNING AV SENASTE KONVERSATIONER\n\n${memoryContext.summaryContent}\n` : ''}
## SVARSINSTRUKTIONER

När du svarar:
1. Analysera frågan i relation till atletens specifika data
2. Ge personaliserade svar baserat på deras profil, testresultat och historik
3. Inkludera relevanta siffror och fakta från deras data
4. Föreslå konkreta nästa steg när lämpligt
5. Flagga eventuella varningssignaler (låg beredskap, skador, överträning)

${capabilities?.isSelfCoached && capabilities?.canGenerateProgram
    ? `Om atleten vill skapa ett nytt träningsprogram:
1. Samla in nödvändig information (sport, mål, veckor, pass/vecka)
2. Föreslå standardvärden baserat på atletens profil
3. Använd verktyget \`generateTrainingProgram\` för att starta genereringen
4. Programmet genereras i bakgrunden — uppmuntra atleten att vänta
5. När programmet är klart kan atleten fråga dig om detaljer innan de sparar`
    : `Om atleten frågar om något som kräver programändring, säg:
"Det här är något du bör diskutera med din coach så att de kan anpassa ditt program."`}
`
}

/**
 * Quick prompt for program generation (only for self-coached athletes with STANDARD+)
 */
const PROGRAM_GENERATION_PROMPT = {
  id: 'create-program',
  label: 'Skapa träningsprogram',
  prompt: 'Jag vill skapa ett nytt träningsprogram. Kan du hjälpa mig baserat på mina mål och tillgänglighet?',
}

/**
 * Quick prompt suggestions for athlete chat
 * These appear as clickable chips in the chat UI
 */
export const ATHLETE_QUICK_PROMPTS = [
  {
    id: 'explain-workout',
    label: 'Förklara dagens pass',
    prompt: 'Kan du förklara vad syftet med dagens träningspass är och vad jag bör fokusera på?',
  },
  {
    id: 'recovery-status',
    label: 'Hur mår jag?',
    prompt: 'Baserat på min senaste data, hur ser min återhämtning ut? Är jag redo för hård träning?',
  },
  {
    id: 'test-explain',
    label: 'Förklara test',
    prompt: 'Kan du förklara vad mina senaste testresultat betyder och hur jag kan använda dem i min träning?',
  },
  {
    id: 'zone-training',
    label: 'Träningszoner',
    prompt: 'Vilka pulszoner ska jag träna i idag och varför?',
  },
  {
    id: 'nutrition-tip',
    label: 'Kost inför pass',
    prompt: 'Vad bör jag äta innan och efter dagens träning?',
  },
  {
    id: 'motivation',
    label: 'Motivation',
    prompt: 'Jag känner mig lite omotiverad. Kan du ge mig lite perspektiv på min träning?',
  },
  {
    id: 'injury-advice',
    label: 'Smärta/skada',
    prompt: 'Jag har lite ont. Bör jag träna som vanligt eller anpassa något?',
  },
  {
    id: 'progress-review',
    label: 'Min utveckling',
    prompt: 'Hur har min utveckling sett ut den senaste tiden baserat på mina träningsdata?',
  },
]

/**
 * Get quick prompts with program generation option for self-coached athletes
 */
export function getAthleteQuickPrompts(capabilities?: AthleteCapabilities) {
  const prompts = [...ATHLETE_QUICK_PROMPTS]

  // Add program generation prompt for self-coached athletes with subscription
  if (capabilities?.isSelfCoached && capabilities?.canGenerateProgram) {
    // Add at the beginning for visibility
    prompts.unshift(PROGRAM_GENERATION_PROMPT)
  }

  return prompts
}

/**
 * Context-specific prompts based on page type
 */
export function getContextualQuickPrompts(
  pageType: 'dashboard' | 'workout' | 'program' | 'test' | 'checkin' | 'general'
): typeof ATHLETE_QUICK_PROMPTS {
  switch (pageType) {
    case 'workout':
      return [
        {
          id: 'workout-purpose',
          label: 'Passets syfte',
          prompt: 'Vad är syftet med det här träningspasset och vad ska jag fokusera på?',
        },
        {
          id: 'workout-intensity',
          label: 'Rätt intensitet',
          prompt: 'Vilken intensitet bör jag hålla under det här passet?',
        },
        {
          id: 'workout-modify',
          label: 'Anpassa passet',
          prompt: 'Jag känner mig inte helt på topp. Hur kan jag anpassa det här passet?',
        },
        {
          id: 'workout-nutrition',
          label: 'Kost för passet',
          prompt: 'Vad bör jag äta innan och efter det här träningspasset?',
        },
      ]

    case 'program':
      return [
        {
          id: 'program-overview',
          label: 'Programöversikt',
          prompt: 'Kan du ge mig en översikt av mitt träningsprogram och var jag befinner mig nu?',
        },
        {
          id: 'program-phase',
          label: 'Nuvarande fas',
          prompt: 'Vilken fas är jag i just nu och vad är fokus under den här perioden?',
        },
        {
          id: 'program-upcoming',
          label: 'Kommande vecka',
          prompt: 'Vad kan jag förvänta mig den kommande veckan i min träning?',
        },
        {
          id: 'program-goal',
          label: 'Mot målet',
          prompt: 'Hur ligger jag till i förhållande till mitt träningsmål?',
        },
      ]

    case 'test':
      return [
        {
          id: 'test-explain',
          label: 'Förklara resultat',
          prompt: 'Kan du förklara vad mina testresultat betyder i praktiken?',
        },
        {
          id: 'test-zones',
          label: 'Beräkna zoner',
          prompt: 'Vilka träningszoner bör jag använda baserat på mitt test?',
        },
        {
          id: 'test-compare',
          label: 'Jämför test',
          prompt: 'Hur har mina testvärden utvecklats sedan förra testet?',
        },
        {
          id: 'test-improve',
          label: 'Förbättra värden',
          prompt: 'Vad kan jag göra för att förbättra mina testvärden?',
        },
      ]

    case 'checkin':
      return [
        {
          id: 'readiness-interpret',
          label: 'Tolka beredskap',
          prompt: 'Vad betyder min beredskapspoäng och hur påverkar det min träning idag?',
        },
        {
          id: 'hrv-explain',
          label: 'Förklara HRV',
          prompt: 'Vad säger mitt HRV-värde om min återhämtning?',
        },
        {
          id: 'sleep-impact',
          label: 'Sömnens påverkan',
          prompt: 'Hur påverkar min sömn den senaste tiden min träningsförmåga?',
        },
        {
          id: 'recovery-tips',
          label: 'Återhämtningstips',
          prompt: 'Vad kan jag göra för att förbättra min återhämtning?',
        },
      ]

    case 'dashboard':
    default:
      return ATHLETE_QUICK_PROMPTS
  }
}

/**
 * Generate a page-specific context summary for the AI
 */
export function buildPageContext(
  pageType: string,
  data: Record<string, unknown>
): string {
  switch (pageType) {
    case 'workout':
      return `
AKTUELLT PASS:
- Namn: ${data.workoutName || 'Okänt'}
- Typ: ${data.workoutType || 'Okänd'}
- Planerad tid: ${data.plannedDuration || 'Ej angiven'} min
- Beskrivning: ${data.description || 'Ingen beskrivning'}
`

    case 'program':
      return `
AKTUELLT PROGRAM:
- Program: ${data.programName || 'Okänt'}
- Nuvarande vecka: ${data.currentWeek || '?'}
- Fas: ${data.phase || 'Okänd'}
`

    case 'test':
      return `
SENASTE TEST:
- Datum: ${data.testDate || 'Okänt'}
- Typ: ${data.testType || 'Okänd'}
- VO2max: ${data.vo2max || 'Ej testat'}
- Max-puls: ${data.maxHR || 'Ej testat'}
`

    default:
      return ''
  }
}
