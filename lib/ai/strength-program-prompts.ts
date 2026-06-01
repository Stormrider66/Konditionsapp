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
  descriptionSv: string
  sets: string
  reps: string
  intensity: string
  intensitySv: string
  rest: string
  restSv: string
  tempo: string
  tempoSv: string
  focus: string[]
  focusSv: string[]
}> = {
  ANATOMICAL_ADAPTATION: {
    name: 'Anatomical Adaptation',
    nameSv: 'Anatomisk Anpassning',
    description: 'Build work capacity, tendon and ligament tolerance, and technical consistency.',
    descriptionSv: 'Bygg arbetskapacitet, sen- och ligamentanpassning, teknikfokus',
    sets: '2-3',
    reps: '12-20',
    intensity: '40-60% 1RM',
    intensitySv: '40-60% 1RM',
    rest: '30-60 sec',
    restSv: '30-60 sek',
    tempo: '2-0-2-0 (controlled)',
    tempoSv: '2-0-2-0 (kontrollerat)',
    focus: [
      'High volume, low intensity',
      'Perfect technique',
      'Progressive tendon loading',
      'Foundation for later phases',
    ],
    focusSv: [
      'Hög volym, låg intensitet',
      'Perfekt teknik',
      'Progressiv belastning på senor',
      'Grund för kommande faser',
    ],
  },
  MAXIMUM_STRENGTH: {
    name: 'Maximum Strength',
    nameSv: 'Maxstyrka',
    description: 'Maximize force production through neural adaptation and muscle recruitment.',
    descriptionSv: 'Maximera kraftproduktion genom neurala anpassningar och muskelrekrytering',
    sets: '3-5',
    reps: '3-6',
    intensity: '80-95% 1RM',
    intensitySv: '80-95% 1RM',
    rest: '2-5 min',
    restSv: '2-5 min',
    tempo: '3-1-1-0 (slow eccentric, explosive concentric)',
    tempoSv: '3-1-1-0 (långsam excentrisk, explosiv koncentrisk)',
    focus: [
      'Low reps, high intensity',
      'Full rest between sets',
      'Emphasize major lifts such as squats, deadlifts, and Romanian deadlifts',
      'Limit hypertrophy fatigue with controlled volume',
    ],
    focusSv: [
      'Lågt antal repetitioner, hög intensitet',
      'Fullständig vila mellan set',
      'Fokus på stora lyft (knäböj, marklyft, RDL)',
      'Minimal hypertrofi (låg volym)',
    ],
  },
  POWER: {
    name: 'Power',
    nameSv: 'Explosivitet',
    description: 'Convert strength into explosive force and speed.',
    descriptionSv: 'Konvertera styrka till explosiv kraft och hastighet',
    sets: '3-5',
    reps: '4-6',
    intensity: '30-60% 1RM (speed is prioritized)',
    intensitySv: '30-60% 1RM (HASTIGHET prioriteras)',
    rest: '2-3 min',
    restSv: '2-3 min',
    tempo: 'X-0-X-0 (explosive)',
    tempoSv: 'X-0-X-0 (explosivt)',
    focus: [
      'Speed is the priority, not load',
      'Reduce load if movement speed drops by more than 10%',
      'Include plyometric work when appropriate',
      'Use explosive intent on every rep',
    ],
    focusSv: [
      'HASTIGHET är prioritet, inte vikt',
      'Minska belastning om hastigheten sjunker >10%',
      'Plyometrisk integration (40-100 kontakter)',
      'Explosiv intention varje rep',
    ],
  },
  MAINTENANCE: {
    name: 'Maintenance',
    nameSv: 'Underhåll',
    description: 'Maintain strength gains while endurance or sport training is prioritized.',
    descriptionSv: 'Bibehåll styrkevinster medan löpning prioriteras',
    sets: '2',
    reps: '3-5',
    intensity: '80-85% 1RM',
    intensitySv: '80-85% 1RM',
    rest: '2-3 min',
    restSv: '2-3 min',
    tempo: '2-0-1-0',
    tempoSv: '2-0-1-0',
    focus: [
      'Minimal volume to reduce fatigue',
      'Maintain intensity to preserve neural adaptations',
      'One session per week is enough for many athletes',
      'Schedule 48+ hours before key workouts when possible',
    ],
    focusSv: [
      'Minimal volym (minska trötthet)',
      'Behåll intensitet (bevara neurala anpassningar)',
      '1x per vecka tillräckligt för de flesta',
      'Schemalägg 48+ timmar före kvalitetspass',
    ],
  },
  TAPER: {
    name: 'Taper',
    nameSv: 'Taper',
    description: 'Reduce fatigue while maintaining neuromuscular readiness.',
    descriptionSv: 'Minska trötthet, bibehåll neuromuskulär beredskap',
    sets: '1-2',
    reps: '3-5',
    intensity: '80-85% 1RM',
    intensitySv: '80-85% 1RM',
    rest: '2-3 min',
    restSv: '2-3 min',
    tempo: '2-0-1-0',
    tempoSv: '2-0-1-0',
    focus: [
      'Reduce volume by roughly 41-60% from maintenance',
      'Maintain intensity with familiar loads',
      'Stop heavy strength work 7-10 days before the target event',
      'Prioritize recovery completely',
    ],
    focusSv: [
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
  descriptionSv: string
  exerciseEmphasis: string[]
  exerciseEmphasisSv: string[]
  sampleExercises: string[]
  sampleExercisesSv: string[]
}> = {
  strength: {
    name: 'General Strength',
    nameSv: 'Generell Styrka',
    description: 'Build total-body strength with an emphasis on major movement patterns.',
    descriptionSv: 'Bygga total kroppsstyrka med fokus på de stora lyften',
    exerciseEmphasis: [
      'Posterior-chain hip-dominant movements',
      'Knee-dominant movements',
      'Core stability',
    ],
    exerciseEmphasisSv: [
      'Posterior chain (höftdominerade rörelser)',
      'Knee dominance (knädominerade rörelser)',
      'Core stabilitet',
    ],
    sampleExercises: [
      'Squat',
      'Deadlift',
      'Romanian deadlift',
      'Bulgarian split squat',
      'Hip thrust',
    ],
    sampleExercisesSv: [
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
    description: 'Develop explosive strength and speed.',
    descriptionSv: 'Explosiv styrka och snabbhet',
    exerciseEmphasis: [
      'Plyometric exercises',
      'Olympic-lift variations',
      'Explosive movements',
    ],
    exerciseEmphasisSv: [
      'Plyometriska övningar',
      'Olympiska lyft (varianter)',
      'Explosiva rörelser',
    ],
    sampleExercises: [
      'Box jumps',
      'Power clean',
      'Jump squats',
      'Medicine ball throws',
      'Depth jumps',
    ],
    sampleExercisesSv: [
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
    description: 'Balanced training to reduce injury risk.',
    descriptionSv: 'Balanserad träning för att minska skaderisk',
    exerciseEmphasis: [
      'Unilateral exercises to address asymmetry',
      'Core stability',
      'Foot and ankle strength',
      'Hamstring strength such as Nordic curls',
    ],
    exerciseEmphasisSv: [
      'Unilaterala övningar för asymmetrikorrigering',
      'Core stabilitet',
      'Fot- och ankelstyrka',
      'Hamstringsstyrka (Nordic curls)',
    ],
    sampleExercises: [
      'Single-leg Romanian deadlift',
      'Nordic hamstring curl',
      'Copenhagen adductor',
      'Pallof press',
      'Eccentric calf raise',
    ],
    sampleExercisesSv: [
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
    description: 'Strength training that improves running efficiency.',
    descriptionSv: 'Styrketräning som förbättrar löpeffektivitet',
    exerciseEmphasis: [
      'Posterior-chain force production',
      'Unilateral strength',
      'Plyometrics for stiffness and elastic return',
      'Core stability',
    ],
    exerciseEmphasisSv: [
      'Posterior chain för framdrivning',
      'Unilaterala övningar',
      'Plyometrik för styvhet',
      'Core för stabilitet',
    ],
    sampleExercises: [
      'Step-ups',
      'Single-leg squat',
      'Calf raises',
      'Pogos',
      'Plank',
    ],
    sampleExercisesSv: [
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
    description: 'Hamstrings, glutes, and lower back; critical for running power and injury prevention.',
    descriptionSv: 'Hamstrings, gluteus, nedre rygg - kritiskt för löpkraft och skadeprevention',
    keyExercises: ['Romanian deadlift', 'Nordic hamstring', 'Hip thrust', 'Deadlift'],
    keyExercisesSv: ['RDL', 'Nordic Hamstring', 'Höftlyft', 'Marklyft'],
  },
  KNEE_DOMINANCE: {
    name: 'Knee Dominance',
    nameSv: 'Knädominerade',
    description: 'Quadriceps and knee stability; important for hills, deceleration, and shock absorption.',
    descriptionSv: 'Quadriceps och knästabilitet - viktigt för backträning och stötdämpning',
    keyExercises: ['Squat', 'Goblet squat', 'Bulgarian split squat', 'Step-ups'],
    keyExercisesSv: ['Knäböj', 'Goblet Squat', 'Bulgarian Split Squat', 'Step-ups'],
  },
  UNILATERAL: {
    name: 'Unilateral',
    nameSv: 'Unilaterala',
    description: 'Single-leg work for balance, asymmetry correction, and sport transfer.',
    descriptionSv: 'Enbensövningar för balans och asymmetrikorrigering',
    keyExercises: ['Lunges', 'Single-leg Romanian deadlift', 'Step-ups', 'Pistol squat'],
    keyExercisesSv: ['Lunges', 'Single Leg RDL', 'Step-ups', 'Pistol Squat'],
  },
  ANTI_ROTATION_CORE: {
    name: 'Anti-Rotation Core',
    nameSv: 'Core (anti-rotation)',
    description: 'Core stability that resists rotation and supports efficient movement.',
    descriptionSv: 'Core-stabilitet som motstår rotation - avgörande för löpeffektivitet',
    keyExercises: ['Pallof press', 'Bird dog', 'Dead bug', 'Farmers walk'],
    keyExercisesSv: ['Pallof Press', 'Bird Dog', 'Dead Bug', 'Farmers Walk'],
  },
  FOOT_ANKLE: {
    name: 'Foot/Ankle',
    nameSv: 'Fot/Ankel',
    description: 'Calf and intrinsic-foot strength for shock absorption and propulsion.',
    descriptionSv: 'Vadstyrka och fot-intrinsic styrka för stötdämpning och framdrivning',
    keyExercises: ['Calf raises', 'Tibialis raises', 'Single-leg calf raise'],
    keyExercisesSv: ['Calf Raises', 'Tibialis Raises', 'Single Leg Calf Raise'],
  },
  UPPER_BODY: {
    name: 'Upper Body',
    nameSv: 'Överkropp',
    description: 'Posture, arm drive, and trunk support.',
    descriptionSv: 'Armsvingsstyrka och hållning',
    keyExercises: ['Push-ups', 'Rows', 'Planks'],
    keyExercisesSv: ['Push-ups', 'Rodd', 'Armhävningar', 'Plankor'],
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
${phaseInfo.descriptionSv}

**Parametrar för denna fas:**
- Set: ${phaseInfo.sets}
- Reps: ${phaseInfo.reps}
- Intensitet: ${phaseInfo.intensitySv}
- Vila: ${phaseInfo.restSv}
- Tempo: ${phaseInfo.tempoSv}

**Fokusområden:**
${phaseInfo.focusSv.map((f) => `- ${f}`).join('\n')}

### MÅL: ${goalInfo.nameSv}
${goalInfo.descriptionSv}

**Övningsemfas:**
${goalInfo.exerciseEmphasisSv.map((e) => `- ${e}`).join('\n')}

**Exempelövningar:**
${goalInfo.sampleExercisesSv.map((e) => `- ${e}`).join('\n')}

### BIOMECHANISK BALANS
Passet ska inkludera övningar från följande kategorier:
${Object.entries(BIOMECHANICAL_PILLARS)
  .map(([, info]) => `- ${info.nameSv}: ${info.descriptionSv}`)
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
- Målintensitet: ${phaseInfo.intensitySv}
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
  const context = STRENGTH_PHASE_CONTEXT[phase]
  return {
    name: context.name,
    description: context.description,
    intensity: context.intensity,
    rest: context.rest,
    tempo: context.tempo,
    focus: context.focus,
  }
}

function getStrengthGoalContextEn(goal: string): {
  name: string
  description: string
  exerciseEmphasis: string[]
  sampleExercises: string[]
} {
  const context = STRENGTH_GOAL_CONTEXT[goal] || STRENGTH_GOAL_CONTEXT.strength
  return {
    name: context.name,
    description: context.description,
    exerciseEmphasis: context.exerciseEmphasis,
    sampleExercises: context.sampleExercises,
  }
}

function getBiomechanicalPillarsEn(): Array<{ name: string; description: string }> {
  return Object.values(BIOMECHANICAL_PILLARS).map((info) => ({
    name: info.name,
    description: info.description,
  }))
}

export const strengthPrompts = {
  STRENGTH_PHASE_CONTEXT,
  STRENGTH_GOAL_CONTEXT,
  BIOMECHANICAL_PILLARS,
  generateStrengthSessionPrompt,
  modifyStrengthSessionPrompt,
  progressionRecommendationPrompt,
}
