/**
 * AI Strength Program Prompts
 *
 * Specialized prompts for AI-powered strength session and program generation.
 * Extends the AI Studio for strength-specific use cases.
 */

import type { StrengthPhase } from '@prisma/client'

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
  } = params

  const phaseInfo = STRENGTH_PHASE_CONTEXT[phase]
  const goalInfo = STRENGTH_GOAL_CONTEXT[goal] || STRENGTH_GOAL_CONTEXT.strength

  return `## UPPGIFT: SKAPA STYRKEPASS

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
  modification: string
): string {
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

/**
 * Generate prompt for progression recommendations
 */
export function progressionRecommendationPrompt(params: {
  exerciseId: string
  exerciseName: string
  recentLogs: Array<{ weight: number; reps: number; date: string }>
  estimated1RM: number
  phase: StrengthPhase
}): string {
  const { exerciseName, recentLogs, estimated1RM, phase } = params
  const phaseInfo = STRENGTH_PHASE_CONTEXT[phase]

  const logSummary = recentLogs
    .slice(0, 5)
    .map((log) => `- ${log.date}: ${log.weight}kg × ${log.reps} reps`)
    .join('\n')

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

export const strengthPrompts = {
  STRENGTH_PHASE_CONTEXT,
  STRENGTH_GOAL_CONTEXT,
  BIOMECHANICAL_PILLARS,
  generateStrengthSessionPrompt,
  modifyStrengthSessionPrompt,
  progressionRecommendationPrompt,
}
