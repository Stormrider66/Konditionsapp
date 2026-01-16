/**
 * Ad-Hoc Workout Parser Prompts
 *
 * AI prompt templates for parsing workout descriptions from various input sources.
 * Supports text, voice transcription, and image/photo inputs.
 */

import type { ExerciseLibraryEntry } from './types'

// ============================================
// SYSTEM CONTEXT
// ============================================

const SYSTEM_CONTEXT = `Du är en expert på träningsanalys som kan tolka och strukturera träningspass från olika typer av input.

Din uppgift är att analysera beskrivningar av träningspass och konvertera dem till ett strukturerat JSON-format.

PRINCIPER:
1. Var pragmatisk - gör rimliga antaganden när information saknas
2. Matcha övningar - försök matcha mot det givna övningsbiblioteket
3. Identifiera typ - klassificera passet som CARDIO, STRENGTH, HYBRID eller MIXED
4. Extrahera detaljer - fånga så mycket information som möjligt
5. Flagga osäkerhet - ange låg confidence när input är tvetydig

TRÄNINGSTYPER:
- CARDIO: Löpning, cykling, simning, skidåkning, rodd eller annan konditionsträning
- STRENGTH: Styrketräning med vikter, maskinträning, kroppsviktsträning
- HYBRID: Funktionell fitness, CrossFit-stil, AMRAP, EMOM, For Time
- MIXED: Kombinerade pass (t.ex. löpning + styrka)`

// ============================================
// OUTPUT FORMAT TEMPLATE
// ============================================

const JSON_OUTPUT_TEMPLATE = `{
  "type": "CARDIO" | "STRENGTH" | "HYBRID" | "MIXED",
  "confidence": 0.0-1.0,
  "name": "Passnamn (valfritt)",
  "duration": 45,
  "distance": 5.0,
  "intensity": "EASY" | "MODERATE" | "THRESHOLD" | "INTERVAL" | "MAX" | "RECOVERY",

  "sport": "RUNNING" | "CYCLING" | "SKIING" | "SWIMMING" | null,
  "cardioSegments": [
    {
      "type": "WARMUP" | "COOLDOWN" | "INTERVAL" | "STEADY" | "RECOVERY" | "HILL" | "DRILLS",
      "duration": 300,
      "distance": 1000,
      "pace": "5:30/km",
      "zone": 2,
      "notes": "Lätt jogg"
    }
  ],
  "avgHeartRate": 145,
  "maxHeartRate": 175,
  "avgPace": 330,
  "elevationGain": 150,

  "strengthExercises": [
    {
      "exerciseId": "matched-id-or-null",
      "exerciseName": "Knäböj",
      "matchConfidence": 0.95,
      "sets": 3,
      "reps": 10,
      "weight": 80,
      "weightString": "80kg",
      "rest": 90,
      "rpe": 7,
      "notes": "ATG",
      "isCustom": false
    }
  ],

  "hybridFormat": "AMRAP" | "FOR_TIME" | "EMOM" | "TABATA" | "CHIPPER" | "LADDER" | "INTERVALS" | null,
  "timeCap": 1200,
  "repScheme": "21-15-9",
  "movements": [
    {
      "order": 1,
      "exerciseId": "matched-id-or-null",
      "name": "Thrusters",
      "matchConfidence": 0.9,
      "reps": 21,
      "weight": 43,
      "weightUnit": "kg",
      "isCustom": false
    }
  ],

  "perceivedEffort": 7,
  "feeling": "GOOD" | "GREAT" | "OKAY" | "TIRED" | "EXHAUSTED" | null,
  "notes": "Extraherade anteckningar från input",

  "rawInterpretation": "Kort förklaring av vad som tolkades",
  "warnings": ["Lista av osäkerheter eller problem"]
}`

// ============================================
// WORKOUT SHORTHAND DICTIONARY
// ============================================

const SHORTHAND_DICTIONARY = `
## VANLIGA FÖRKORTNINGAR

### Styrka
- BS = Back Squat (Knäböj)
- FS = Front Squat
- OHS = Overhead Squat
- DL = Deadlift (Marklyft)
- RDL = Romanian Deadlift
- BP = Bench Press (Bänkpress)
- OHP = Overhead Press (Militärpress)
- BB = Barbell (Skivstång)
- DB = Dumbbell (Hantel)
- KB = Kettlebell
- BW = Bodyweight (Kroppsvikt)
- 1RM = One Rep Max

### Reps och Sets
- 3x10 = 3 sets med 10 reps
- 5x5 = 5 sets med 5 reps
- AMRAP = As Many Reps/Rounds As Possible
- EMOM = Every Minute On the Minute
- E2MOM = Every 2 Minutes On the Minute
- RFT = Rounds For Time
- 21-15-9 = Rep scheme (21 reps, sedan 15, sedan 9)

### Kondition
- E = Easy/Lätt
- M = Moderate/Medel
- T = Threshold/Tröskel
- Z1-Z5 = Zoner (1=vila, 5=max)
- HR = Heart Rate (Puls)
- LT = Lactate Threshold (Mjölksyratröskel)
- TRIMP = Training Impulse

### CrossFit/Funktionell Fitness
- WOD = Workout of the Day
- Rx = Prescribed (Föreskriven vikt/standard)
- Scaled = Nedskalad
- C2B = Chest to Bar (Pull-ups)
- T2B = Toes to Bar
- HSPU = Handstand Push-ups
- MU = Muscle-ups
- DU = Double Unders
- SU = Single Unders
- C&J = Clean and Jerk
- PC = Power Clean
- SC = Squat Clean
- PS = Power Snatch
- SS = Squat Snatch

### Tempo
- 3-1-1 = 3s ner, 1s paus, 1s upp
- Eccentric = Negativa reps
- Concentric = Positiva reps
- Isometric = Statisk

### Intensitet
- RPE = Rate of Perceived Exertion (1-10)
- @6 = RPE 6
- Max = Maximal ansträngning
`

// ============================================
// TEXT PARSING PROMPT
// ============================================

/**
 * Build prompt for parsing free-form text workout descriptions
 */
export function buildTextParsingPrompt(
  text: string,
  exerciseLibrary: ExerciseLibraryEntry[]
): string {
  const exerciseList = formatExerciseLibrary(exerciseLibrary)

  return `${SYSTEM_CONTEXT}

${SHORTHAND_DICTIONARY}

## ÖVNINGSBIBLIOTEK

Försök matcha övningar mot detta bibliotek. Använd exerciseId om match hittas.
Om ingen match finns, sätt isCustom: true och exerciseId: null.

${exerciseList}

## INPUT ATT TOLKA

Följande text beskriver ett träningspass som en atlet har genomfört:

"""
${text}
"""

## INSTRUKTIONER

1. Analysera texten noggrant
2. Identifiera passtyp (CARDIO, STRENGTH, HYBRID, MIXED)
3. Extrahera alla detaljer du kan hitta:
   - Duration/tid
   - Distans (för kondition)
   - Övningar, sets, reps, vikter (för styrka)
   - Format (AMRAP, EMOM, etc. för hybrid)
   - Intensitet och känsla
4. Matcha övningar mot biblioteket
5. Sätt confidence baserat på hur säker du är
6. Lägg till warnings för oklarheter

## OUTPUT

Svara ENDAST med JSON i följande format (ingen annan text):

\`\`\`json
${JSON_OUTPUT_TEMPLATE}
\`\`\`

VIKTIGT:
- Svara ENDAST med JSON, ingen annan text
- duration är i minuter, inte sekunder
- distance är i kilometer
- avgPace är i sekunder per kilometer
- cardioSegments.duration är i sekunder
- cardioSegments.distance är i meter
- Om du inte kan extrahera ett värde, utelämna fältet
- confidence ska vara lägre (0.5-0.7) om input är vag
- Var generös med tolkning men ärlig med confidence`
}

// ============================================
// IMAGE PARSING PROMPT
// ============================================

/**
 * Build prompt for parsing workout from photo/screenshot
 */
export function buildImageParsingPrompt(
  exerciseLibrary: ExerciseLibraryEntry[]
): string {
  const exerciseList = formatExerciseLibrary(exerciseLibrary)

  return `${SYSTEM_CONTEXT}

${SHORTHAND_DICTIONARY}

## ÖVNINGSBIBLIOTEK

Försök matcha övningar mot detta bibliotek:

${exerciseList}

## INSTRUKTIONER

Du får en bild som innehåller ett träningspass. Det kan vara:
- En whiteboard på ett gym
- Ett papper med handskrivet program
- En skärmdump från en app eller hemsida
- En bild av ett träningsprogram

Analysera bilden och:
1. Läs av all text du kan se
2. Identifiera passtyp (CARDIO, STRENGTH, HYBRID, MIXED)
3. Extrahera övningar, sets, reps, vikter, tider
4. Matcha övningar mot biblioteket
5. Hantera handskrift och förkortningar

## OUTPUT

Svara ENDAST med JSON i följande format (ingen annan text):

\`\`\`json
${JSON_OUTPUT_TEMPLATE}
\`\`\`

VIKTIGT:
- Tolka handskrift så gott du kan
- Förkortningar är vanliga (se ordlista ovan)
- Whiteboard-text kan vara ofullständig
- Sätt confidence baserat på läsbarhet
- Lägg till warnings för text du inte kunde läsa
- Om bilden inte innehåller ett träningspass, returnera:
  { "type": "MIXED", "confidence": 0, "rawInterpretation": "Kunde inte identifiera träningspass", "warnings": ["Bilden verkar inte innehålla ett träningspass"] }`
}

// ============================================
// VOICE TRANSCRIPTION PARSING PROMPT
// ============================================

/**
 * Build prompt for parsing transcribed voice input
 */
export function buildVoiceParsingPrompt(
  transcription: string,
  exerciseLibrary: ExerciseLibraryEntry[]
): string {
  const exerciseList = formatExerciseLibrary(exerciseLibrary)

  return `${SYSTEM_CONTEXT}

${SHORTHAND_DICTIONARY}

## ÖVNINGSBIBLIOTEK

Försök matcha övningar mot detta bibliotek:

${exerciseList}

## KONTEXT

Följande är en transkription av ett röstmeddelande där en atlet beskriver ett träningspass de genomfört.

Tänk på:
- Talet kan vara informellt och vardagligt
- Siffror kan uttalas på olika sätt ("tre gånger tio" = 3x10)
- Atleten kanske inte nämner alla detaljer
- Svenska och engelska termer kan blandas

## TRANSKRIPTION

"""
${transcription}
"""

## INSTRUKTIONER

1. Tolka det informella talet
2. Identifiera passtyp (CARDIO, STRENGTH, HYBRID, MIXED)
3. Extrahera alla detaljer du kan höra/förstå:
   - "sprang i en halvtimme" = duration: 30
   - "körde tre set med tio reps knäböj" = 3x10 squats
   - "kändes tungt" = perceivedEffort: 8 eller feeling: "TIRED"
4. Matcha övningar mot biblioteket
5. Var generös med tolkning

## OUTPUT

Svara ENDAST med JSON i följande format (ingen annan text):

\`\`\`json
${JSON_OUTPUT_TEMPLATE}
\`\`\`

VIKTIGT:
- Röstinput är ofta vag - gör rimliga antaganden
- Om atleten säger "körde ben" utan detaljer, sätt lägre confidence
- "Kändes bra/tungt/lätt" mappar till feeling och perceivedEffort
- Tid uttryckt som "en timme" = 60 minuter
- "5 km" eller "fem kilometer" = distance: 5`
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format exercise library for prompt injection
 */
function formatExerciseLibrary(exercises: ExerciseLibraryEntry[]): string {
  if (exercises.length === 0) {
    return 'Inget övningsbibliotek tillgängligt - markera alla övningar som isCustom: true'
  }

  // Group by category
  const grouped = exercises.reduce((acc, ex) => {
    const category = ex.category || 'OTHER'
    if (!acc[category]) acc[category] = []
    acc[category].push(ex)
    return acc
  }, {} as Record<string, ExerciseLibraryEntry[]>)

  let output = ''
  for (const [category, exs] of Object.entries(grouped)) {
    output += `\n### ${category}\n`
    for (const ex of exs.slice(0, 30)) { // Limit per category to manage prompt size
      const names = [ex.name]
      if (ex.nameSv && ex.nameSv !== ex.name) names.push(ex.nameSv)
      if (ex.nameEn && ex.nameEn !== ex.name) names.push(ex.nameEn)
      output += `- ID: ${ex.id} | ${names.join(' / ')}${ex.equipment ? ` [${ex.equipment}]` : ''}\n`
    }
    if (exs.length > 30) {
      output += `  ... och ${exs.length - 30} fler ${category}-övningar\n`
    }
  }

  return output
}

/**
 * Build prompt for transcribing audio (before parsing)
 */
export function buildTranscriptionPrompt(): string {
  return `Transkribera detta röstmeddelande på svenska.

Atleten beskriver ett träningspass de har genomfört.

INSTRUKTIONER:
1. Skriv ut exakt vad som sägs
2. Inkludera pauser som "..." om relevanta
3. Behåll alla siffror och mått
4. Korrigera inte grammatik - skriv som det låter
5. Om ord är otydliga, gissa bästa tolkning

Svara ENDAST med transkriptionen, ingen annan text.`
}

/**
 * Get the JSON output schema description for validation
 */
export function getOutputSchema(): string {
  return JSON_OUTPUT_TEMPLATE
}

// ============================================
// STRAVA/GARMIN MAPPING (No AI needed)
// ============================================

/**
 * Map Strava activity type to our workout type
 */
export function mapStravaType(stravaType: string): {
  workoutType: 'CARDIO' | 'STRENGTH' | 'HYBRID' | 'MIXED'
  sport: string | null
  intensity: string
} {
  const typeMap: Record<string, { workoutType: 'CARDIO' | 'STRENGTH' | 'HYBRID' | 'MIXED'; sport: string | null; intensity: string }> = {
    'Run': { workoutType: 'CARDIO', sport: 'RUNNING', intensity: 'MODERATE' },
    'TrailRun': { workoutType: 'CARDIO', sport: 'RUNNING', intensity: 'MODERATE' },
    'VirtualRun': { workoutType: 'CARDIO', sport: 'RUNNING', intensity: 'MODERATE' },
    'Ride': { workoutType: 'CARDIO', sport: 'CYCLING', intensity: 'MODERATE' },
    'VirtualRide': { workoutType: 'CARDIO', sport: 'CYCLING', intensity: 'MODERATE' },
    'MountainBikeRide': { workoutType: 'CARDIO', sport: 'CYCLING', intensity: 'THRESHOLD' },
    'GravelRide': { workoutType: 'CARDIO', sport: 'CYCLING', intensity: 'MODERATE' },
    'Swim': { workoutType: 'CARDIO', sport: 'SWIMMING', intensity: 'MODERATE' },
    'NordicSki': { workoutType: 'CARDIO', sport: 'SKIING', intensity: 'MODERATE' },
    'BackcountrySki': { workoutType: 'CARDIO', sport: 'SKIING', intensity: 'THRESHOLD' },
    'WeightTraining': { workoutType: 'STRENGTH', sport: null, intensity: 'MODERATE' },
    'Crossfit': { workoutType: 'HYBRID', sport: null, intensity: 'THRESHOLD' },
    'Workout': { workoutType: 'MIXED', sport: null, intensity: 'MODERATE' },
    'Yoga': { workoutType: 'MIXED', sport: null, intensity: 'RECOVERY' },
    'Walk': { workoutType: 'CARDIO', sport: 'RUNNING', intensity: 'EASY' },
    'Hike': { workoutType: 'CARDIO', sport: 'RUNNING', intensity: 'EASY' },
    'Rowing': { workoutType: 'CARDIO', sport: null, intensity: 'MODERATE' },
  }

  return typeMap[stravaType] || { workoutType: 'MIXED', sport: null, intensity: 'MODERATE' }
}

/**
 * Map Garmin activity type to our workout type
 */
export function mapGarminType(garminType: string): {
  workoutType: 'CARDIO' | 'STRENGTH' | 'HYBRID' | 'MIXED'
  sport: string | null
  intensity: string
} {
  const typeMap: Record<string, { workoutType: 'CARDIO' | 'STRENGTH' | 'HYBRID' | 'MIXED'; sport: string | null; intensity: string }> = {
    'running': { workoutType: 'CARDIO', sport: 'RUNNING', intensity: 'MODERATE' },
    'trail_running': { workoutType: 'CARDIO', sport: 'RUNNING', intensity: 'MODERATE' },
    'treadmill_running': { workoutType: 'CARDIO', sport: 'RUNNING', intensity: 'MODERATE' },
    'cycling': { workoutType: 'CARDIO', sport: 'CYCLING', intensity: 'MODERATE' },
    'indoor_cycling': { workoutType: 'CARDIO', sport: 'CYCLING', intensity: 'MODERATE' },
    'mountain_biking': { workoutType: 'CARDIO', sport: 'CYCLING', intensity: 'THRESHOLD' },
    'swimming': { workoutType: 'CARDIO', sport: 'SWIMMING', intensity: 'MODERATE' },
    'lap_swimming': { workoutType: 'CARDIO', sport: 'SWIMMING', intensity: 'MODERATE' },
    'open_water_swimming': { workoutType: 'CARDIO', sport: 'SWIMMING', intensity: 'MODERATE' },
    'cross_country_skiing': { workoutType: 'CARDIO', sport: 'SKIING', intensity: 'MODERATE' },
    'strength_training': { workoutType: 'STRENGTH', sport: null, intensity: 'MODERATE' },
    'cardio': { workoutType: 'CARDIO', sport: null, intensity: 'MODERATE' },
    'walking': { workoutType: 'CARDIO', sport: 'RUNNING', intensity: 'EASY' },
    'hiking': { workoutType: 'CARDIO', sport: 'RUNNING', intensity: 'EASY' },
    'yoga': { workoutType: 'MIXED', sport: null, intensity: 'RECOVERY' },
    'pilates': { workoutType: 'MIXED', sport: null, intensity: 'EASY' },
    'rowing': { workoutType: 'CARDIO', sport: null, intensity: 'MODERATE' },
    'indoor_rowing': { workoutType: 'CARDIO', sport: null, intensity: 'MODERATE' },
  }

  return typeMap[garminType.toLowerCase()] || { workoutType: 'MIXED', sport: null, intensity: 'MODERATE' }
}
