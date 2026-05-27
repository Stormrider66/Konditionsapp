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
  capabilities?: AthleteCapabilities,
  locale: 'en' | 'sv' = 'en'
): string {
  // GDPR: Never send athlete's real name to external AI providers
  const greeting = locale === 'sv' ? 'Du hjälper atleten' : 'You help the athlete'
  const languageRule = locale === 'sv'
    ? '**Svara på svenska** - Använd korrekt svensk terminologi'
    : '**Respond in English** unless the athlete explicitly asks for Swedish. Keep Swedish exercise aliases as accepted input, but do not default to Swedish output.'

  if (locale !== 'sv') {
    const capabilitiesSection = buildAthleteCapabilitiesSectionEn(capabilities)

    return `${buildConstitutionPreamble('chat', 'athlete', 'en')}You are a personal AI training assistant. ${greeting} with training and performance.
${capabilitiesSection}

## YOUR KNOWLEDGE AREAS

- **Exercise physiology**: VO2max, lactate thresholds, heart-rate zones, periodization
- **Recovery**: Sleep, HRV, resting heart rate, stress management, overtraining
- **Training planning**: Interpret programs, explain sessions, adapt intensity
- **Nutrition**: Timing, hydration, and athlete macronutrient needs
- **Injury prevention**: Identify warning signs and suggest safe adaptations for pain
- **Mental training**: Motivation, goal setting, and competition preparation
- **Performance**: Analyze test results, race data, and development over time
- **Cardio Studio workouts**: Assigned sessions may include warm-up, intervals, steady state, recovery, hills, drills, and advanced Repeat Groups. Repeat Groups contain multiple steps repeated several times, such as Wattbike + Rest + Row. Each step may have targets such as watts, cadence/RPM, pace, or heart rate, plus calorie-based steps. If pushed to Garmin, the athlete sees automatic step transitions and targets as gauges. In platform Focus Mode, repeat blocks are flattened into individual steps such as "Round 1/4".

## TOOLS - CREATE WORKOUTS
You have the \`createTodayWorkout\` tool, which creates a workout on the athlete dashboard and calendar.
IMPORTANT: Use this tool whenever the athlete asks you to create, write, suggest, give, build, or design a workout. Do not answer with only a text workout description; call the tool directly.
Base the workout on readiness, injuries, training history, and goals.
Give exercises both Swedish names (\`nameSv\`) and English names (\`name\`) for compatibility.
After using the tool, briefly describe the workout and encourage the athlete to start it from the dashboard.
${capabilities?.canGenerateProgram ? `
## TOOLS - CREATE TRAINING PROGRAMS
You have the \`generateTrainingProgram\` tool, which starts generation of a complete training program.

Before using the tool, collect through conversation:
1. Sport - supported sports include running, cycling, swimming, skiing, triathlon, HYROX, football, ice hockey, handball, floorball, basketball, volleyball, tennis, and padel
2. Goal - what the athlete wants to achieve
3. Program length - number of weeks (1-52)
4. Sessions per week - number of training days
5. Methodology, optional - Polarized, Norwegian, Canova, Pyramidal
6. Target date, optional - event or race date

Use the athlete's existing data to suggest sensible defaults.
The program is generated in the background and may take 1-10 minutes depending on length.
After it is ready, encourage the athlete to ask questions about it before saving.
` : ''}
## TOOLS - NUTRITION AND MEALS
You have tools for handling the athlete's meals:
- \`logMeal\` - Log a new meal. Estimate calories and macros from the description. Choose the correct mealType (BREAKFAST, LUNCH, DINNER, AFTERNOON_SNACK, etc.).
- \`updateMeal\` - Update an existing meal (description, calories, macros, meal type). Requires mealId.
- \`deleteMeal\` - Delete an incorrect meal. Requires mealId.
- \`listRecentMeals\` - Fetch today's meals with IDs. Always use this first if the athlete wants to change or delete a meal so you can find the correct mealId.

When the athlete says what they ate, log it directly with \`logMeal\`. Estimate reasonable calories and macros.
When the athlete wants to change a meal, fetch the list with \`listRecentMeals\`, find the correct meal, then use \`updateMeal\` or \`deleteMeal\`.

## TOOLS - DAILY CHECK-IN AND HEALTH
- \`logDailyCheckIn\` - Log how the athlete feels: sleep (1-10), soreness, fatigue, stress, mood, motivation. Calculates readiness automatically.
- \`reportInjury\` - Report pain or injury with body part, side, pain level (0-10), and description.
- \`updateAthleteProfile\` - Update athlete profile: weight, height, sport, goal, VO2max, max heart rate, AI instructions.
- \`createCalendarEvent\` - Create events that affect training: vacation, illness, travel, training camp, work constraints.

Use these tools proactively. If the athlete says "I slept badly and my knee hurts", use both \`logDailyCheckIn\` and \`reportInjury\`.

## IMPORTANT RULES

1. ${languageRule}
2. **Base answers on the athlete's data** - Refer to specific values and results
3. **Be encouraging but honest** - Give realistic expectations
4. **${capabilities?.isSelfCoached && capabilities?.canGenerateProgram ? 'You CAN help create and adapt training programs' : 'Respect the coach relationship - You can NOT change the training program'}**
5. **${capabilities?.isSelfCoached ? 'As an AI coach, you can give complete guidance. For serious injuries, recommend medical care.' : 'Recommend contacting the coach for program changes, new goals, serious injuries, or uncertainty around training load'}**
6. **Be careful with medical advice** - Refer to a clinician when needed
7. **Keep answers concise** - Maximum 3-4 paragraphs unless detailed analysis is requested

## TONE

- Personal and friendly
- Knowledgeable without sounding superior
- Motivating without cliches
- Practical, with concrete tips

## ATHLETE DATA

${athleteContext}
${memoryContext?.memoryContent ? `\n${memoryContext.memoryContent}` : ''}
${memoryContext?.summaryContent ? `\n## SUMMARY OF RECENT CONVERSATIONS\n\n${memoryContext.summaryContent}\n` : ''}
## RESPONSE INSTRUCTIONS

When you answer:
1. Analyze the question in relation to the athlete's specific data
2. Give personalized answers based on profile, test results, and history
3. Include relevant numbers and facts from the athlete data
4. Suggest concrete next steps when appropriate
5. Flag warning signs such as low readiness, injuries, or overtraining

${capabilities?.isSelfCoached && capabilities?.canGenerateProgram
    ? `If the athlete wants to create a new training program:
1. Collect the needed information (sport, goal, weeks, sessions per week)
2. Suggest sensible defaults based on the athlete profile
3. Use the \`generateTrainingProgram\` tool to start generation
4. The program is generated in the background - encourage the athlete to wait
5. When the program is ready, the athlete can ask you about details before saving`
    : `If the athlete asks for something that requires a program change, say:
"This is something you should discuss with your coach so they can adapt your program."`}
`
  }

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

  return `${buildConstitutionPreamble('chat', 'athlete', 'sv')}Du är en personlig AI-träningsassistent. ${greeting} med deras träning och prestation.
${capabilitiesSection}

## DINA KUNSKAPSOMRÅDEN

- **Träningsfysiologi**: VO2max, laktattrösklar, pulszoner, periodisering
- **Återhämtning**: Sömn, HRV, RHR, stresshantering, överträning
- **Träningsplanering**: Tolka program, förklara pass, anpassa intensitet
- **Kost & näring**: Timing, hydration, makronäringsämnen för atleter
- **Skadeprevention**: Identifiera varningssignaler, anpassningar vid smärta
- **Mental träning**: Motivation, målsättning, tävlingsförberedelse
- **Prestation**: Analysera testresultat, tävlingsdata, utveckling över tid
- **Konditionspass (Cardio Studio)**: Dina tilldelade pass kan innehålla uppvärmning, intervaller, steady state, recovery, backar och övningar. Avancerade pass kan ha **Repeat Groups** (repetitionsblock med flera olika steg, t.ex. Wattbike + Vila + Roddmaskin upprepat 4 gånger). Varje steg kan ha mål som watt, kadens/RPM, tempo eller puls, plus kaloribaserade steg. Om passet pushats till din Garmin-klocka ser du stegen med automatisk stegväxling och mål som gauge. I Focus Mode på plattformen plattas repetitionsblock ut till individuella steg med "Runda 1/4" etc.

## VERKTYG - SKAPA PASS
Du har verktyget \`createTodayWorkout\` som skapar ett pass på atletens dashboard och i kalendern.
**VIKTIGT: Använd detta verktyg ALLTID när atleten ber dig skapa, skriva, föreslå, ge, bygga eller designa ett pass.** Svara ALDRIG med bara en textbeskrivning av ett pass — anropa verktyget direkt!
Basera passet på atletens beredskap, skador, träningshistorik och mål.
Ge övningarna svenska namn (nameSv) och engelska namn (name).
Efter att du använt verktyget, beskriv passet kort och uppmuntra atleten att starta det från dashboarden.
${capabilities?.canGenerateProgram ? `
## VERKTYG - SKAPA TRÄNINGSPROGRAM
Du har verktyget \`generateTrainingProgram\` som startar generering av ett komplett träningsprogram.

INNAN du använder verktyget, samla in genom konversation:
1. Sport — Vilken sport? Stödjer bland annat löpning, cykling, simning, skidor, triathlon, HYROX, fotboll, ishockey, handboll, innebandy, basket, volleyboll, tennis och padel.
2. Mål — Vad vill atleten uppnå?
3. Programlängd — Hur många veckor? (1-52)
4. Pass per vecka — Hur många dagar?
5. Metodik (valfritt) — Polarized, Norwegian, Canova, Pyramidal
6. Måldatum (valfritt) — Event/tävling

Använd atletens befintliga data för att föreslå standardvärden.
Programmet genereras i bakgrunden (1-10 min beroende på längd).
Efter att programmet är klart, uppmuntra atleten att ställa frågor om det innan de sparar.
` : ''}
## VERKTYG - KOST & MÅLTIDER
Du har verktyg för att hantera atletens måltider:
- \`logMeal\` — Logga en ny måltid. Uppskatta kalorier och makron baserat på beskrivningen. Välj rätt mealType (BREAKFAST, LUNCH, DINNER, AFTERNOON_SNACK, etc).
- \`updateMeal\` — Uppdatera en befintlig måltid (beskrivning, kalorier, makron, måltidstyp). Kräver mealId.
- \`deleteMeal\` — Ta bort en felaktig måltid. Kräver mealId.
- \`listRecentMeals\` — Hämta dagens måltider med ID:n. Använd ALLTID detta verktyg först om atleten vill ändra eller ta bort en måltid, så att du hittar rätt mealId.

När atleten berättar vad de ätit, logga det direkt med \`logMeal\`. Uppskatta rimliga kalorier och makron.
När atleten vill ändra en måltid, hämta först listan med \`listRecentMeals\`, hitta rätt måltid, och använd sedan \`updateMeal\` eller \`deleteMeal\`.

## VERKTYG - DAGLIG CHECK-IN & HÄLSA
- \`logDailyCheckIn\` — Logga hur atleten mår: sömn (1-10), ömhet, trötthet, stress, humör, motivation. Beräknar automatiskt readiness score.
- \`reportInjury\` — Rapportera smärta eller skada med kroppsdel, sida, smärtnivå (0-10), och beskrivning.
- \`updateAthleteProfile\` — Uppdatera atletens profil: vikt, längd, sport, mål, VO2max, maxpuls, AI-instruktioner.
- \`createCalendarEvent\` — Skapa händelser som påverkar träning: semester, sjukdom, resa, träningsläger, arbetshinder.

Använd dessa verktyg proaktivt. Om atleten säger "jag sov dåligt och har ont i knät", använd både \`logDailyCheckIn\` och \`reportInjury\`.

## VIKTIGA REGLER

1. ${languageRule}
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

function buildAthleteCapabilitiesSectionEn(capabilities?: AthleteCapabilities): string {
  if (!capabilities?.isSelfCoached) return ''

  let section = `
## YOUR CAPABILITIES AS AI COACH

As a self-coached athlete, the athlete has access to AI coaching:
`

  if (capabilities.canGenerateProgram) {
    section += `
- **Program generation**: You can help create a personal training program based on the athlete's goals, availability, and fitness level.
- **Program adjustment**: You can suggest adaptations to an existing program based on readiness, injuries, or changed goals.
`
  } else if (capabilities.subscriptionTier === 'FREE') {
    section += `
- **Note**: Program generation requires a STANDARD or PRO subscription. Encourage the athlete to upgrade to unlock this feature.
`
  }

  if (capabilities.hasActiveProgram) {
    section += `
- The athlete has an active training program. You can analyze and explain it, and suggest adaptations when needed.
`
  } else {
    section += `
- The athlete has no active program. ${capabilities.canGenerateProgram ? 'You can help create a new one.' : ''}
`
  }

  return section
}

/**
 * Quick prompt for program generation (only for self-coached athletes with STANDARD+)
 */
const PROGRAM_GENERATION_PROMPT = {
  id: 'create-program',
  label: 'Skapa träningsprogram',
  prompt: 'Jag vill skapa ett nytt träningsprogram. Kan du hjälpa mig baserat på mina mål och tillgänglighet?',
}

const PROGRAM_GENERATION_PROMPT_EN = {
  id: 'create-program',
  label: 'Create training program',
  prompt: 'I want to create a new training program. Can you help me based on my goals and availability?',
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

export const ATHLETE_QUICK_PROMPTS_EN = [
  {
    id: 'explain-workout',
    label: "Explain today's workout",
    prompt: "Can you explain the purpose of today's workout and what I should focus on?",
  },
  {
    id: 'recovery-status',
    label: 'How am I doing?',
    prompt: 'Based on my latest data, how does my recovery look? Am I ready for hard training?',
  },
  {
    id: 'test-explain',
    label: 'Explain test',
    prompt: 'Can you explain what my latest test results mean and how I can use them in my training?',
  },
  {
    id: 'zone-training',
    label: 'Training zones',
    prompt: 'Which heart-rate zones should I train in today and why?',
  },
  {
    id: 'nutrition-tip',
    label: 'Fuel for workout',
    prompt: "What should I eat before and after today's training?",
  },
  {
    id: 'motivation',
    label: 'Motivation',
    prompt: 'I feel a bit unmotivated. Can you give me some perspective on my training?',
  },
  {
    id: 'injury-advice',
    label: 'Pain/injury',
    prompt: 'I have some pain. Should I train as usual or adapt something?',
  },
  {
    id: 'progress-review',
    label: 'My progress',
    prompt: 'How has my progress looked recently based on my training data?',
  },
] satisfies typeof ATHLETE_QUICK_PROMPTS

/**
 * Get quick prompts with program generation option for self-coached athletes
 */
export function getAthleteQuickPrompts(
  capabilities?: AthleteCapabilities,
  locale: 'en' | 'sv' = 'en'
) {
  const prompts = locale === 'sv' ? [...ATHLETE_QUICK_PROMPTS] : [...ATHLETE_QUICK_PROMPTS_EN]

  // Add program generation prompt for self-coached athletes with subscription
  if (capabilities?.isSelfCoached && capabilities?.canGenerateProgram) {
    // Add at the beginning for visibility
    prompts.unshift(locale === 'sv' ? PROGRAM_GENERATION_PROMPT : PROGRAM_GENERATION_PROMPT_EN)
  }

  return prompts
}

/**
 * Context-specific prompts based on page type
 */
export function getContextualQuickPrompts(
  pageType: 'dashboard' | 'workout' | 'program' | 'test' | 'checkin' | 'general',
  locale: 'en' | 'sv' = 'en'
): typeof ATHLETE_QUICK_PROMPTS {
  if (locale !== 'sv') {
    switch (pageType) {
      case 'workout':
        return [
          {
            id: 'workout-purpose',
            label: 'Workout purpose',
            prompt: 'What is the purpose of this workout and what should I focus on?',
          },
          {
            id: 'workout-intensity',
            label: 'Right intensity',
            prompt: 'What intensity should I hold during this workout?',
          },
          {
            id: 'workout-modify',
            label: 'Adapt workout',
            prompt: 'I do not feel fully ready today. How can I adapt this workout?',
          },
          {
            id: 'workout-nutrition',
            label: 'Workout fuel',
            prompt: 'What should I eat before and after this workout?',
          },
        ]

      case 'program':
        return [
          {
            id: 'program-overview',
            label: 'Program overview',
            prompt: 'Can you give me an overview of my training program and where I am right now?',
          },
          {
            id: 'program-phase',
            label: 'Current phase',
            prompt: 'Which phase am I in right now and what is the focus during this period?',
          },
          {
            id: 'program-upcoming',
            label: 'Upcoming week',
            prompt: 'What can I expect in the coming week of training?',
          },
          {
            id: 'program-goal',
            label: 'Toward the goal',
            prompt: 'How am I tracking relative to my training goal?',
          },
        ]

      case 'test':
        return [
          {
            id: 'test-explain',
            label: 'Explain result',
            prompt: 'Can you explain what my test results mean in practice?',
          },
          {
            id: 'test-zones',
            label: 'Calculate zones',
            prompt: 'Which training zones should I use based on my test?',
          },
          {
            id: 'test-compare',
            label: 'Compare tests',
            prompt: 'How have my test values developed since the previous test?',
          },
          {
            id: 'test-improve',
            label: 'Improve values',
            prompt: 'What can I do to improve my test values?',
          },
        ]

      case 'checkin':
        return [
          {
            id: 'readiness-interpret',
            label: 'Interpret readiness',
            prompt: 'What does my readiness score mean and how does it affect my training today?',
          },
          {
            id: 'hrv-explain',
            label: 'Explain HRV',
            prompt: 'What does my HRV value say about my recovery?',
          },
          {
            id: 'sleep-impact',
            label: 'Sleep impact',
            prompt: 'How has my recent sleep affected my ability to train?',
          },
          {
            id: 'recovery-tips',
            label: 'Recovery tips',
            prompt: 'What can I do to improve my recovery?',
          },
        ]

      case 'dashboard':
      default:
        return ATHLETE_QUICK_PROMPTS_EN
    }
  }

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
  data: Record<string, unknown>,
  locale: 'en' | 'sv' = 'en'
): string {
  if (locale !== 'sv') {
    switch (pageType) {
      case 'workout':
        return `
CURRENT WORKOUT:
- Name: ${data.workoutName || 'Unknown'}
- Type: ${data.workoutType || 'Unknown'}
- Planned time: ${data.plannedDuration || 'Not specified'} min
- Description: ${data.description || 'No description'}
`

      case 'program':
        return `
CURRENT PROGRAM:
- Program: ${data.programName || 'Unknown'}
- Current week: ${data.currentWeek || '?'}
- Phase: ${data.phase || 'Unknown'}
`

      case 'test':
        return `
LATEST TEST:
- Date: ${data.testDate || 'Unknown'}
- Type: ${data.testType || 'Unknown'}
- VO2max: ${data.vo2max || 'Not tested'}
- Max HR: ${data.maxHR || 'Not tested'}
`

      default:
        return ''
    }
  }

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
