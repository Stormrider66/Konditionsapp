/**
 * AI Strength Program Prompts
 *
 * Specialized prompts for AI-powered strength session and program generation.
 * Extends the AI Studio for strength-specific use cases.
 */

import type { StrengthPhase } from '@prisma/client'
import { buildConstitutionPreamble } from '@/lib/ai/constitution'

type AppLocale = 'en' | 'sv'

// Strength phase descriptions for AI context
export const STRENGTH_PHASE_CONTEXT: Record<StrengthPhase, {
  name: string
  nameSv: string
  description: string
  sets: string
  reps: string
  intensity: string
  rest: string
  tempo: string
  focus: string[]
}> = {
  ANATOMICAL_ADAPTATION: {
    name: 'Anatomical Adaptation',
    nameSv: 'Anatomisk Anpassning',
    description: 'Bygg arbetskapacitet, sen- och ligamentanpassning, teknikfokus',
    sets: '2-3',
    reps: '12-20',
    intensity: '40-60% 1RM',
    rest: '30-60 sek',
    tempo: '2-0-2-0 (kontrollerat)',
    focus: [
      'Hög volym, låg intensitet',
      'Perfekt teknik',
      'Progressiv belastning på senor',
      'Grund för kommande faser',
    ],
  },
  MAXIMUM_STRENGTH: {
    name: 'Maximum Strength',
    nameSv: 'Maxstyrka',
    description: 'Maximera kraftproduktion genom neurala anpassningar och muskelrekrytering',
    sets: '3-5',
    reps: '3-6',
    intensity: '80-95% 1RM',
    rest: '2-5 min',
    tempo: '3-1-1-0 (långsam excentrisk, explosiv koncentrisk)',
    focus: [
      'Lågt antal repetitioner, hög intensitet',
      'Fullständig vila mellan set',
      'Fokus på stora lyft (knäböj, marklyft, RDL)',
      'Minimal hypertrofi (låg volym)',
    ],
  },
  POWER: {
    name: 'Power',
    nameSv: 'Explosivitet',
    description: 'Konvertera styrka till explosiv kraft och hastighet',
    sets: '3-5',
    reps: '4-6',
    intensity: '30-60% 1RM (HASTIGHET prioriteras)',
    rest: '2-3 min',
    tempo: 'X-0-X-0 (explosivt)',
    focus: [
      'HASTIGHET är prioritet, inte vikt',
      'Minska belastning om hastigheten sjunker >10%',
      'Plyometrisk integration (40-100 kontakter)',
      'Explosiv intention varje rep',
    ],
  },
  MAINTENANCE: {
    name: 'Maintenance',
    nameSv: 'Underhåll',
    description: 'Bibehåll styrkevinster medan löpning prioriteras',
    sets: '2',
    reps: '3-5',
    intensity: '80-85% 1RM',
    rest: '2-3 min',
    tempo: '2-0-1-0',
    focus: [
      'Minimal volym (minska trötthet)',
      'Behåll intensitet (bevara neurala anpassningar)',
      '1x per vecka tillräckligt för de flesta',
      'Schemalägg 48+ timmar före kvalitetspass',
    ],
  },
  TAPER: {
    name: 'Taper',
    nameSv: 'Taper',
    description: 'Minska trötthet, bibehåll neuromuskulär beredskap',
    sets: '1-2',
    reps: '3-5',
    intensity: '80-85% 1RM',
    rest: '2-3 min',
    tempo: '2-0-1-0',
    focus: [
      'Volymreduktion: 41-60% av underhåll',
      'Behåll intensitet (samma vikter)',
      'Sluta 7-10 dagar före tävling',
      'Prioritera återhämtning helt',
    ],
  },
}

// Goal-specific emphasis
export const STRENGTH_GOAL_CONTEXT: Record<string, {
  name: string
  nameSv: string
  description: string
  exerciseEmphasis: string[]
  sampleExercises: string[]
}> = {
  strength: {
    name: 'General Strength',
    nameSv: 'Generell Styrka',
    description: 'Bygga total kroppsstyrka med fokus på de stora lyften',
    exerciseEmphasis: [
      'Posterior chain (höftdominerade rörelser)',
      'Knee dominance (knädominerade rörelser)',
      'Core stabilitet',
    ],
    sampleExercises: [
      'Knäböj',
      'Marklyft',
      'RDL (Romanian Deadlift)',
      'Bulgarian Split Squat',
      'Höftlyft',
    ],
  },
  power: {
    name: 'Power Development',
    nameSv: 'Kraftutveckling',
    description: 'Explosiv styrka och snabbhet',
    exerciseEmphasis: [
      'Plyometriska övningar',
      'Olympiska lyft (varianter)',
      'Explosiva rörelser',
    ],
    sampleExercises: [
      'Box Jumps',
      'Frivändning',
      'Jump Squats',
      'Medicinbollskast',
      'Depth Jumps',
    ],
  },
  'injury-prevention': {
    name: 'Injury Prevention',
    nameSv: 'Skadeförebyggande',
    description: 'Balanserad träning för att minska skaderisk',
    exerciseEmphasis: [
      'Unilaterala övningar för asymmetrikorrigering',
      'Core stabilitet',
      'Fot- och ankelstyrka',
      'Hamstringsstyrka (Nordic curls)',
    ],
    sampleExercises: [
      'Single Leg RDL',
      'Nordic Hamstring Curl',
      'Copenhagen Adductor',
      'Pallof Press',
      'Calf Raises (eccentriskt)',
    ],
  },
  'running-economy': {
    name: 'Running Economy',
    nameSv: 'Löpekonomi',
    description: 'Styrketräning som förbättrar löpeffektivitet',
    exerciseEmphasis: [
      'Posterior chain för framdrivning',
      'Unilaterala övningar',
      'Plyometrik för styvhet',
      'Core för stabilitet',
    ],
    sampleExercises: [
      'Step-ups',
      'Single Leg Squat',
      'Calf Raises',
      'Pogos/Hoppning',
      'Planka',
    ],
  },
}

// Biomechanical pillar descriptions
export const BIOMECHANICAL_PILLARS = {
  POSTERIOR_CHAIN: {
    name: 'Posterior Chain',
    nameSv: 'Bakre kedjan',
    description: 'Hamstrings, gluteus, nedre rygg - kritiskt för löpkraft och skadeprevention',
    keyExercises: ['RDL', 'Nordic Hamstring', 'Höftlyft', 'Marklyft'],
  },
  KNEE_DOMINANCE: {
    name: 'Knee Dominance',
    nameSv: 'Knädominerade',
    description: 'Quadriceps och knästabilitet - viktigt för backträning och stötdämpning',
    keyExercises: ['Knäböj', 'Goblet Squat', 'Bulgarian Split Squat', 'Step-ups'],
  },
  UNILATERAL: {
    name: 'Unilateral',
    nameSv: 'Unilaterala',
    description: 'Enbensövningar för balans och asymmetrikorrigering',
    keyExercises: ['Lunges', 'Single Leg RDL', 'Step-ups', 'Pistol Squat'],
  },
  ANTI_ROTATION_CORE: {
    name: 'Anti-Rotation Core',
    nameSv: 'Core (anti-rotation)',
    description: 'Core-stabilitet som motstår rotation - avgörande för löpeffektivitet',
    keyExercises: ['Pallof Press', 'Bird Dog', 'Dead Bug', 'Farmers Walk'],
  },
  FOOT_ANKLE: {
    name: 'Foot/Ankle',
    nameSv: 'Fot/Ankel',
    description: 'Vadstyrka och fot-intrinsic styrka för stötdämpning och framdrivning',
    keyExercises: ['Calf Raises', 'Tibialis Raises', 'Single Leg Calf Raise'],
  },
  UPPER_BODY: {
    name: 'Upper Body',
    nameSv: 'Överkropp',
    description: 'Armsvingsstyrka och hållning',
    keyExercises: ['Push-ups', 'Rodd', 'Armhävningar', 'Plankor'],
  },
}

/**
 * Generate AI prompt for creating a strength session
 */
export function generateStrengthSessionPrompt(params: {
  phase: StrengthPhase
  goal: string
  athleteLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE'
  equipmentAvailable: string[]
  timeAvailable: number
  includeWarmup: boolean
  includeCore: boolean
  includeCooldown: boolean
  athleteContext?: string
  locale?: AppLocale
}): string {
  const {
    phase,
    goal,
    athleteLevel,
    equipmentAvailable,
    timeAvailable,
    includeWarmup,
    includeCore,
    includeCooldown,
    athleteContext,
    locale = 'en',
  } = params

  const phaseInfo = STRENGTH_PHASE_CONTEXT[phase]
  const goalInfo = STRENGTH_GOAL_CONTEXT[goal] || STRENGTH_GOAL_CONTEXT.strength

  if (locale !== 'sv') {
    const phaseContext = getStrengthPhaseContextEn(phase)
    const goalContext = getStrengthGoalContextEn(goal)

    return `${buildConstitutionPreamble('program', undefined, 'en')}## TASK: CREATE STRENGTH SESSION

Create a complete strength session for a runner or athlete.

### ATHLETE PROFILE
- Level: ${formatAthleteLevelEn(athleteLevel)}
- Available time: ${timeAvailable} minutes
- Available equipment: ${equipmentAvailable.join(', ')}
${athleteContext ? `- Additional context: ${athleteContext}` : ''}

### TRAINING PHASE: ${phaseContext.name}
${phaseContext.description}

**Parameters for this phase:**
- Sets: ${phaseInfo.sets}
- Reps: ${phaseInfo.reps}
- Intensity: ${phaseContext.intensity}
- Rest: ${phaseContext.rest}
- Tempo: ${phaseContext.tempo}

**Focus areas:**
${phaseContext.focus.map((f) => `- ${f}`).join('\n')}

### GOAL: ${goalContext.name}
${goalContext.description}

**Exercise emphasis:**
${goalContext.exerciseEmphasis.map((e) => `- ${e}`).join('\n')}

**Example exercises:**
${goalContext.sampleExercises.map((e) => `- ${e}`).join('\n')}

### BIOMECHANICAL BALANCE
Include exercises from these categories:
${getBiomechanicalPillarsEn().map((info) => `- ${info.name}: ${info.description}`).join('\n')}

### SECTIONS TO INCLUDE
${includeWarmup ? '- WARM-UP (8-10 min): Dynamic mobility and activation' : ''}
- MAIN SET: Strength exercises following the phase parameters
${includeCore ? '- CORE (5-7 min): Stabilization exercises' : ''}
${includeCooldown ? '- COOLDOWN (5-7 min): Static stretching and easy mobility' : ''}

### OUTPUT FORMAT

Return the session in this JSON format:

\`\`\`json
{
  "name": "Session name in English",
  "description": "Short English session description",
  "phase": "${phase}",
  "estimatedDuration": ${timeAvailable},
  "sections": [
    {
      "type": "WARMUP",
      "exercises": [
        {
          "exerciseName": "Exercise name in English",
          "sets": 1,
          "reps": "10",
          "restSeconds": 0,
          "notes": "Instructions in English"
        }
      ],
      "notes": "Section instructions in English",
      "duration": 8
    },
    {
      "type": "MAIN",
      "exercises": [
        {
          "exerciseName": "Exercise name in English",
          "sets": 3,
          "reps": 8,
          "weight": null,
          "restSeconds": 90,
          "tempo": "3-0-1-0",
          "notes": "Instructions in English"
        }
      ]
    },
    {
      "type": "CORE",
      "exercises": [],
      "notes": "Focus on control",
      "duration": 5
    },
    {
      "type": "COOLDOWN",
      "exercises": [],
      "notes": "Stretch the major muscle groups",
      "duration": 7
    }
  ],
  "totalExercises": 8,
  "totalSets": 18,
  "coachNotes": "General coach notes in English"
}
\`\`\`

### IMPORTANT PRINCIPLES
1. Choose exercises that match the athlete's level and available equipment
2. Follow the phase parameters for sets, reps, and rest
3. Ensure biomechanical balance (posterior chain, knee dominance, unilateral work, core)
4. Prioritize safety and correct technique
5. Write all user-facing names, descriptions, notes, and instructions in English
`
  }

  return `${buildConstitutionPreamble('program', undefined, 'sv')}## UPPGIFT: SKAPA STYRKEPASS

Du ska skapa ett komplett styrkepass för en löpare/idrottare.

### ATLETPROFIL
- Nivå: ${athleteLevel}
- Tillgänglig tid: ${timeAvailable} minuter
- Tillgänglig utrustning: ${equipmentAvailable.join(', ')}
${athleteContext ? `- Ytterligare kontext: ${athleteContext}` : ''}

### TRÄNINGSFAS: ${phaseInfo.nameSv}
${phaseInfo.description}

**Parametrar för denna fas:**
- Set: ${phaseInfo.sets}
- Reps: ${phaseInfo.reps}
- Intensitet: ${phaseInfo.intensity}
- Vila: ${phaseInfo.rest}
- Tempo: ${phaseInfo.tempo}

**Fokusområden:**
${phaseInfo.focus.map((f) => `- ${f}`).join('\n')}

### MÅL: ${goalInfo.nameSv}
${goalInfo.description}

**Övningsemfas:**
${goalInfo.exerciseEmphasis.map((e) => `- ${e}`).join('\n')}

**Exempelövningar:**
${goalInfo.sampleExercises.map((e) => `- ${e}`).join('\n')}

### BIOMECHANISK BALANS
Passet ska inkludera övningar från följande kategorier:
${Object.entries(BIOMECHANICAL_PILLARS)
  .map(([, info]) => `- ${info.nameSv}: ${info.description}`)
  .join('\n')}

### SEKTIONER ATT INKLUDERA
${includeWarmup ? '- UPPVÄRMNING (8-10 min): Dynamisk stretching och aktivering' : ''}
- HUVUDPASS: Styrkeövningar enligt fasens parametrar
${includeCore ? '- CORE (5-7 min): Stabiliseringsövningar' : ''}
${includeCooldown ? '- NEDVARVNING (5-7 min): Statisk stretching' : ''}

### OUTPUT FORMAT

Returnera passet i följande JSON-format:

\`\`\`json
{
  "name": "Passnamn",
  "description": "Kort beskrivning av passet",
  "phase": "${phase}",
  "estimatedDuration": ${timeAvailable},
  "sections": [
    {
      "type": "WARMUP",
      "exercises": [
        {
          "exerciseName": "Övningsnamn på svenska",
          "sets": 1,
          "reps": "10",
          "restSeconds": 0,
          "notes": "Instruktioner"
        }
      ],
      "notes": "Sektionsinstruktioner",
      "duration": 8
    },
    {
      "type": "MAIN",
      "exercises": [
        {
          "exerciseName": "Övningsnamn på svenska",
          "sets": 3,
          "reps": 8,
          "weight": null,
          "restSeconds": 90,
          "tempo": "3-0-1-0",
          "notes": "Instruktioner"
        }
      ]
    },
    {
      "type": "CORE",
      "exercises": [...],
      "notes": "Fokusera på kontroll",
      "duration": 5
    },
    {
      "type": "COOLDOWN",
      "exercises": [...],
      "notes": "Stretcha alla stora muskelgrupper",
      "duration": 7
    }
  ],
  "totalExercises": 8,
  "totalSets": 18,
  "coachNotes": "Generella anteckningar för passet"
}
\`\`\`

### VIKTIGA PRINCIPER
1. Välj övningar som passar atletens nivå och tillgänglig utrustning
2. Följ fasens parametrar för set, reps och vila
3. Säkerställ biomechanisk balans (posterior chain, knee dominance, unilateral, core)
4. Prioritera säkerhet och korrekt teknik
5. Ge tydliga instruktioner på svenska
`
}

/**
 * Generate prompt for modifying an existing strength session
 */
export function modifyStrengthSessionPrompt(
  currentSession: string,
  modification: string,
  locale: 'en' | 'sv' = 'en'
): string {
  if (locale === 'sv') {
  return `## UPPGIFT: MODIFIERA STYRKEPASS

### NUVARANDE PASS:
${currentSession}

### ÖNSKAD ÄNDRING:
${modification}

### INSTRUKTIONER:
1. Behåll passens övergripande struktur och mål
2. Gör den begärda ändringen
3. Säkerställ att den biomechaniska balansen bibehålls
4. Justera vila och volym om nödvändigt
5. Förklara kort varför du gjort ändringarna

### OUTPUT FORMAT:
Returnera det modifierade passet i samma JSON-format som ovan, plus en kort förklaring av ändringarna.
`
  }

  return `## TASK: MODIFY STRENGTH SESSION

### CURRENT SESSION:
${currentSession}

### REQUESTED CHANGE:
${modification}

### INSTRUCTIONS:
1. Preserve the session's overall structure and goal
2. Make the requested change
3. Ensure biomechanical balance is maintained
4. Adjust rest and volume if needed
5. Briefly explain why you made the changes
6. Write all user-facing names, descriptions, notes, and explanations in English

### OUTPUT FORMAT:
Return the modified session in the same JSON format as above, plus a short explanation of the changes.
`
}

/**
 * Generate prompt for progression recommendations
 */
export function progressionRecommendationPrompt(params: {
  exerciseId: string
  exerciseName: string
  recentLogs: Array<{ weight: number; reps: number; date: string }>
  estimated1RM: number
  phase: StrengthPhase
  locale?: AppLocale
}): string {
  const { exerciseName, recentLogs, estimated1RM, phase, locale = 'en' } = params
  const phaseInfo = STRENGTH_PHASE_CONTEXT[phase]

  const logSummary = recentLogs
    .slice(0, 5)
    .map((log) => `- ${log.date}: ${log.weight}kg × ${log.reps} reps`)
    .join('\n')

  if (locale !== 'sv') {
    const phaseContext = getStrengthPhaseContextEn(phase)

    return `## TASK: PROGRESSION RECOMMENDATION

### EXERCISE: ${exerciseName}

### RECENT LOGS:
${logSummary}

### ESTIMATED 1RM: ${estimated1RM}kg

### CURRENT PHASE: ${phaseContext.name}
- Target intensity: ${phaseContext.intensity}
- Target reps: ${phaseInfo.reps}

### QUESTION:
Based on the athlete's logs and current phase, recommend:
1. Weight and reps for the next session
2. Whether the athlete should increase load using the 2-for-2 rule
3. Whether a deload is needed after 3+ weeks without progression
4. General tips for continued progression

### OUTPUT FORMAT:
\`\`\`json
{
  "recommendedWeight": 72.5,
  "recommendedReps": 8,
  "recommendedSets": 3,
  "progressionStatus": "READY_TO_INCREASE" | "MAINTAIN" | "DELOAD_RECOMMENDED",
  "reasoning": "Explanation in English",
  "tips": ["Tip 1", "Tip 2"]
}
\`\`\`

Write all user-facing content in English.
`
  }

  return `## UPPGIFT: PROGRESSIONSREKOMMENDATION

### ÖVNING: ${exerciseName}

### SENASTE LOGGAR:
${logSummary}

### ESTIMERAD 1RM: ${estimated1RM}kg

### NUVARANDE FAS: ${phaseInfo.nameSv}
- Målintensitet: ${phaseInfo.intensity}
- Målreps: ${phaseInfo.reps}

### FRÅGA:
Baserat på atletens loggar och nuvarande fas, ge en rekommendation för:
1. Nästa sessions vikt och reps
2. Om atleten bör öka belastning (2-for-2 regeln)
3. Om en deload behövs (3+ veckor utan progression)
4. Allmänna tips för fortsatt progression

### OUTPUT FORMAT:
\`\`\`json
{
  "recommendedWeight": 72.5,
  "recommendedReps": 8,
  "recommendedSets": 3,
  "progressionStatus": "READY_TO_INCREASE" | "MAINTAIN" | "DELOAD_RECOMMENDED",
  "reasoning": "Förklaring på svenska",
  "tips": ["Tips 1", "Tips 2"]
}
\`\`\`
`
}

function formatAthleteLevelEn(level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE'): string {
  const labels = {
    BEGINNER: 'Beginner',
    INTERMEDIATE: 'Intermediate',
    ADVANCED: 'Advanced',
    ELITE: 'Elite',
  } satisfies Record<typeof level, string>

  return labels[level]
}

function getStrengthPhaseContextEn(phase: StrengthPhase): {
  name: string
  description: string
  intensity: string
  rest: string
  tempo: string
  focus: string[]
} {
  const contexts: Record<StrengthPhase, {
    name: string
    description: string
    intensity: string
    rest: string
    tempo: string
    focus: string[]
  }> = {
    ANATOMICAL_ADAPTATION: {
      name: 'Anatomical Adaptation',
      description: 'Build work capacity, tendon and ligament tolerance, and technical consistency.',
      intensity: '40-60% 1RM',
      rest: '30-60 sec',
      tempo: '2-0-2-0 (controlled)',
      focus: [
        'High volume, low intensity',
        'Perfect technique',
        'Progressive tendon loading',
        'Foundation for later phases',
      ],
    },
    MAXIMUM_STRENGTH: {
      name: 'Maximum Strength',
      description: 'Maximize force production through neural adaptation and muscle recruitment.',
      intensity: '80-95% 1RM',
      rest: '2-5 min',
      tempo: '3-1-1-0 (slow eccentric, explosive concentric)',
      focus: [
        'Low reps, high intensity',
        'Full rest between sets',
        'Emphasize major lifts such as squats, deadlifts, and Romanian deadlifts',
        'Limit hypertrophy fatigue with controlled volume',
      ],
    },
    POWER: {
      name: 'Power',
      description: 'Convert strength into explosive force and speed.',
      intensity: '30-60% 1RM (speed is prioritized)',
      rest: '2-3 min',
      tempo: 'X-0-X-0 (explosive)',
      focus: [
        'Speed is the priority, not load',
        'Reduce load if movement speed drops by more than 10%',
        'Include plyometric work when appropriate',
        'Use explosive intent on every rep',
      ],
    },
    MAINTENANCE: {
      name: 'Maintenance',
      description: 'Maintain strength gains while endurance or sport training is prioritized.',
      intensity: '80-85% 1RM',
      rest: '2-3 min',
      tempo: '2-0-1-0',
      focus: [
        'Minimal volume to reduce fatigue',
        'Maintain intensity to preserve neural adaptations',
        'One session per week is enough for many athletes',
        'Schedule 48+ hours before key workouts when possible',
      ],
    },
    TAPER: {
      name: 'Taper',
      description: 'Reduce fatigue while maintaining neuromuscular readiness.',
      intensity: '80-85% 1RM',
      rest: '2-3 min',
      tempo: '2-0-1-0',
      focus: [
        'Reduce volume by roughly 41-60% from maintenance',
        'Maintain intensity with familiar loads',
        'Stop heavy strength work 7-10 days before the target event',
        'Prioritize recovery completely',
      ],
    },
  }

  return contexts[phase]
}

function getStrengthGoalContextEn(goal: string): {
  name: string
  description: string
  exerciseEmphasis: string[]
  sampleExercises: string[]
} {
  const contexts: Record<string, {
    name: string
    description: string
    exerciseEmphasis: string[]
    sampleExercises: string[]
  }> = {
    strength: {
      name: 'General Strength',
      description: 'Build total-body strength with an emphasis on major movement patterns.',
      exerciseEmphasis: [
        'Posterior-chain hip-dominant movements',
        'Knee-dominant movements',
        'Core stability',
      ],
      sampleExercises: [
        'Squat',
        'Deadlift',
        'Romanian deadlift',
        'Bulgarian split squat',
        'Hip thrust',
      ],
    },
    power: {
      name: 'Power Development',
      description: 'Develop explosive strength and speed.',
      exerciseEmphasis: [
        'Plyometric exercises',
        'Olympic-lift variations',
        'Explosive movements',
      ],
      sampleExercises: [
        'Box jumps',
        'Power clean',
        'Jump squats',
        'Medicine ball throws',
        'Depth jumps',
      ],
    },
    'injury-prevention': {
      name: 'Injury Prevention',
      description: 'Balanced training to reduce injury risk.',
      exerciseEmphasis: [
        'Unilateral exercises to address asymmetry',
        'Core stability',
        'Foot and ankle strength',
        'Hamstring strength such as Nordic curls',
      ],
      sampleExercises: [
        'Single-leg Romanian deadlift',
        'Nordic hamstring curl',
        'Copenhagen adductor',
        'Pallof press',
        'Eccentric calf raise',
      ],
    },
    'running-economy': {
      name: 'Running Economy',
      description: 'Strength training that improves running efficiency.',
      exerciseEmphasis: [
        'Posterior-chain force production',
        'Unilateral strength',
        'Plyometrics for stiffness and elastic return',
        'Core stability',
      ],
      sampleExercises: [
        'Step-ups',
        'Single-leg squat',
        'Calf raises',
        'Pogos',
        'Plank',
      ],
    },
  }

  return contexts[goal] || contexts.strength
}

function getBiomechanicalPillarsEn(): Array<{ name: string; description: string }> {
  return [
    {
      name: 'Posterior Chain',
      description: 'Hamstrings, glutes, and lower back; critical for running power and injury prevention.',
    },
    {
      name: 'Knee Dominance',
      description: 'Quadriceps and knee stability; important for hills, deceleration, and shock absorption.',
    },
    {
      name: 'Unilateral',
      description: 'Single-leg work for balance, asymmetry correction, and sport transfer.',
    },
    {
      name: 'Anti-Rotation Core',
      description: 'Core stability that resists rotation and supports efficient movement.',
    },
    {
      name: 'Foot/Ankle',
      description: 'Calf and intrinsic-foot strength for shock absorption and propulsion.',
    },
    {
      name: 'Upper Body',
      description: 'Posture, arm drive, and trunk support.',
    },
  ]
}

export const strengthPrompts = {
  STRENGTH_PHASE_CONTEXT,
  STRENGTH_GOAL_CONTEXT,
  BIOMECHANICAL_PILLARS,
  generateStrengthSessionPrompt,
  modifyStrengthSessionPrompt,
  progressionRecommendationPrompt,
}
