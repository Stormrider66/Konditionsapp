/**
 * Athlete-Specific AI Prompts
 *
 * System prompts and quick prompts for athlete AI chat.
 * All prompts are in Swedish to match the app's primary language.
 */

/**
 * Build the system prompt for athlete AI chat
 * @param athleteContext - The compiled context from buildAthleteOwnContext()
 * @param athleteName - The athlete's name for personalization
 */
export function buildAthleteSystemPrompt(
  athleteContext: string,
  athleteName?: string
): string {
  const greeting = athleteName ? `Du hjälper ${athleteName}` : 'Du hjälper en atlet'

  return `Du är en personlig AI-träningsassistent. ${greeting} med deras träning och prestation.

## DINA KUNSKAPSOMRÅDEN

- **Träningsfysiologi**: VO2max, laktattrösklar, pulszoner, periodisering
- **Återhämtning**: Sömn, HRV, RHR, stresshantering, överträning
- **Träningsplanering**: Tolka program, förklara pass, anpassa intensitet
- **Kost & näring**: Timing, hydration, makronäringsämnen för atleter
- **Skadeprevention**: Identifiera varningssignaler, anpassningar vid smärta
- **Mental träning**: Motivation, målsättning, tävlingsförberedelse
- **Prestation**: Analysera testresultat, tävlingsdata, utveckling över tid

## VIKTIGA REGLER

1. **Svara ALLTID på svenska** - Använd korrekt svensk terminologi
2. **Basera svar på atletens data** - Referera till specifika värden och resultat
3. **Var uppmuntrande men ärlig** - Ge realistiska förväntningar
4. **Respektera coachrelationen** - Du kan INTE ändra träningsprogrammet
5. **Rekommendera kontakt med coach** för:
   - Programändringar
   - Nya målsättningar
   - Allvarliga skador eller smärta
   - Osäkerhet kring träningsbelastning
6. **Var försiktig med medicinska råd** - Hänvisa till läkare vid behov
7. **Håll svar koncisa** - Max 3-4 stycken om inte detaljerad analys begärs

## TONALITET

- Personlig och vänlig
- Kunnig men inte överlägsen
- Motiverande utan att vara klyschig
- Praktiskt orienterad - ge konkreta tips

## ATLETENS DATA

${athleteContext}

## SVARSINSTRUKTIONER

När du svarar:
1. Analysera frågan i relation till atletens specifika data
2. Ge personaliserade svar baserat på deras profil, testresultat och historik
3. Inkludera relevanta siffror och fakta från deras data
4. Föreslå konkreta nästa steg när lämpligt
5. Flagga eventuella varningssignaler (låg beredskap, skador, överträning)

Om atleten frågar om något som kräver programändring, säg:
"Det här är något du bör diskutera med din coach så att de kan anpassa ditt program."
`
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
