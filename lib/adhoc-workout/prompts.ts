/**
 * Ad-Hoc Workout Parser Prompts
 *
 * AI prompt templates for parsing workout descriptions from various input sources.
 * Supports text, voice transcription, and image/photo inputs.
 */

import type { ExerciseLibraryEntry } from './types'

type AppLocale = 'en' | 'sv'

function outputLanguageInstruction(locale: AppLocale): string {
  const language = locale === 'sv' ? 'Swedish' : 'English'
  return `OUTPUT LANGUAGE:
- Write all user-facing JSON string values in ${language}: name, notes, rawInterpretation, warnings, segment notes, and exercise notes.
- Keep exerciseId values, enum values, units, and source measurements unchanged.
- Exercise library names may contain Swedish aliases; use them only for matching unless ${language} output naturally requires them.`
}

// ============================================
// SYSTEM CONTEXT
// ============================================

const SYSTEM_CONTEXT: Record<AppLocale, string> = {
  en: `You are an expert in training analysis who can interpret and structure workouts from different input sources.

Your task is to analyze workout descriptions and convert them into structured JSON.

PRINCIPLES:
1. Be pragmatic - make reasonable assumptions when information is missing
2. Match exercises - try to match against the provided exercise library
3. Identify type - classify the workout as CARDIO, STRENGTH, HYBRID, or MIXED
4. Extract details - capture as much relevant information as possible
5. Flag uncertainty - use lower confidence when the input is ambiguous

WORKOUT TYPES:
- CARDIO: Running, cycling, swimming, skiing, rowing, or other endurance training
- STRENGTH: Strength training with weights, machines, bodyweight, weightlifting (snatch, clean and jerk)
- HYBRID: Functional fitness, CrossFit-style, AMRAP, EMOM, For Time, HYROX
- MIXED: Combined sessions (for example running + strength)

SPORT-SPECIFIC METRICS:
- Running: distance (meters), avgPace (sec/km), avgHeartRate, elevationGain, cadence (steps/min)
- Cycling: distance (meters), avgPower (watts), maxPower (watts), normalizedPower (watts), avgSpeed (km/h), cadence (rpm), avgHeartRate, elevationGain
- Cross-country skiing: distance (meters), avgPace (sec/km), avgHeartRate, elevationGain, avgPower (watts if available), technique in notes (classic/skate)
- Swimming: distance (meters), avgPace (seconds per 100m x 10, i.e. sec/km), avgHeartRate
- HYROX: type=HYBRID, sport=HYROX, hybridFormat=HYROX_SIM, movements with stations (SkiErg, Sled Push, Sled Pull, Burpee Broad Jump, Rowing, Farmers Carry, Sandbag Lunges, Wall Balls), total distance, duration
- Strength training/weightlifting: strengthExercises with exerciseName, sets, reps, weight (kg), rpe, weightString (for example "BW", "80% 1RM")
- Rowing (SkiErg/Concept2): distance (meters), avgPace (sec/500m x 2, i.e. sec/km), avgPower (watts), cadence (strokes/min)`,
  sv: `Du är en expert på träningsanalys som kan tolka och strukturera träningspass från olika typer av input.

Din uppgift är att analysera beskrivningar av träningspass och konvertera dem till ett strukturerat JSON-format.

PRINCIPER:
1. Var pragmatisk - gör rimliga antaganden när information saknas
2. Matcha övningar - försök matcha mot det givna övningsbiblioteket
3. Identifiera typ - klassificera passet som CARDIO, STRENGTH, HYBRID eller MIXED
4. Extrahera detaljer - fånga så mycket information som möjligt
5. Flagga osäkerhet - ange låg confidence när input är tvetydig

TRÄNINGSTYPER:
- CARDIO: Löpning, cykling, simning, skidåkning, rodd eller annan konditionsträning
- STRENGTH: Styrketräning med vikter, maskinträning, kroppsviktsträning, tyngdlyftning (snatch, stöt)
- HYBRID: Funktionell fitness, CrossFit-stil, AMRAP, EMOM, For Time, HYROX
- MIXED: Kombinerade pass (t.ex. löpning + styrka)

SPORTSPECIFIKA MÄTVÄRDEN:
- Löpning: distance (meter), avgPace (sek/km), avgHeartRate, elevationGain, cadence (steg/min)
- Cykling: distance (meter), avgPower (watt), maxPower (watt), normalizedPower (watt), avgSpeed (km/h), cadence (rpm), avgHeartRate, elevationGain
- Längdskidåkning: distance (meter), avgPace (sek/km), avgHeartRate, elevationGain, avgPower (watt om tillgängligt), teknik i notes (klassisk/fristil)
- Simning: distance (meter), avgPace (sek per 100m × 10, dvs sek/km), avgHeartRate
- HYROX: type=HYBRID, sport=HYROX, hybridFormat=HYROX_SIM, movements med stationer (SkiErg, Sled Push, Sled Pull, Burpee Broad Jump, Rowing, Farmers Carry, Sandbag Lunges, Wall Balls), total distance, duration
- Styrketräning/Tyngdlyftning: strengthExercises med exerciseName, sets, reps, weight (kg), rpe, weightString (t.ex. "BW", "80% 1RM")
- Rodd (SkiErg/Concept2): distance (meter), avgPace (sek/500m × 2, dvs sek/km), avgPower (watt), cadence (slag/min)`,
}

// ============================================
// OUTPUT FORMAT TEMPLATE
// ============================================

const JSON_OUTPUT_TEMPLATE: Record<AppLocale, string> = {
  en: `{
  "type": "CARDIO" | "STRENGTH" | "HYBRID" | "MIXED",
  "confidence": 0.0-1.0,
  "name": "Workout name (optional)",
  "duration": 45,
  "distance": 5000,
  "intensity": "EASY" | "MODERATE" | "THRESHOLD" | "INTERVAL" | "MAX" | "RECOVERY",

  "sport": "RUNNING" | "CYCLING" | "SKIING" | "SWIMMING" | "HYROX" | "STRENGTH" | "GENERAL_FITNESS" | "FUNCTIONAL_FITNESS" | null,
  "cardioSegments": [
    {
      "type": "WARMUP" | "COOLDOWN" | "INTERVAL" | "STEADY" | "RECOVERY" | "HILL" | "DRILLS",
      "duration": 300,
      "distance": 1000,
      "pace": "5:30/km",
      "zone": 2,
      "notes": "Easy jog"
    }
  ],
  "avgHeartRate": 145,
  "maxHeartRate": 175,
  "avgPace": 330,
  "elevationGain": 150,
  "avgPower": 210,
  "maxPower": 450,
  "normalizedPower": 225,
  "cadence": 90,
  "avgSpeed": 32.5,

  "strengthExercises": [
    {
      "exerciseId": "matched-id-or-null",
      "exerciseName": "Back Squat",
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

  "hybridFormat": "AMRAP" | "FOR_TIME" | "EMOM" | "TABATA" | "CHIPPER" | "LADDER" | "INTERVALS" | "HYROX_SIM" | "CUSTOM" | null,
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
  "notes": "Extracted notes from input",

  "rawInterpretation": "Short explanation of what was interpreted",
  "warnings": ["List of uncertainties or issues"]
}`,
  sv: `{
  "type": "CARDIO" | "STRENGTH" | "HYBRID" | "MIXED",
  "confidence": 0.0-1.0,
  "name": "Passnamn (valfritt)",
  "duration": 45,
  "distance": 5000,
  "intensity": "EASY" | "MODERATE" | "THRESHOLD" | "INTERVAL" | "MAX" | "RECOVERY",

  "sport": "RUNNING" | "CYCLING" | "SKIING" | "SWIMMING" | "HYROX" | "STRENGTH" | "GENERAL_FITNESS" | "FUNCTIONAL_FITNESS" | null,
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
  "avgPower": 210,
  "maxPower": 450,
  "normalizedPower": 225,
  "cadence": 90,
  "avgSpeed": 32.5,

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

  "hybridFormat": "AMRAP" | "FOR_TIME" | "EMOM" | "TABATA" | "CHIPPER" | "LADDER" | "INTERVALS" | "HYROX_SIM" | "CUSTOM" | null,
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
}`,
}

// ============================================
// WORKOUT SHORTHAND DICTIONARY
// ============================================

const SHORTHAND_DICTIONARY: Record<AppLocale, string> = {
  en: `
## COMMON ABBREVIATIONS

### Strength
- BS = Back Squat
- FS = Front Squat
- OHS = Overhead Squat
- DL = Deadlift
- RDL = Romanian Deadlift
- BP = Bench Press
- OHP = Overhead Press
- BB = Barbell
- DB = Dumbbell
- KB = Kettlebell
- BW = Bodyweight
- 1RM = One Rep Max

### Reps and Sets
- 3x10 = 3 sets of 10 reps
- 5x5 = 5 sets of 5 reps
- AMRAP = As Many Reps/Rounds As Possible
- EMOM = Every Minute On the Minute
- E2MOM = Every 2 Minutes On the Minute
- RFT = Rounds For Time
- 21-15-9 = Rep scheme (21 reps, then 15, then 9)

### Cardio
- E = Easy
- M = Moderate
- T = Threshold
- Z1-Z5 = Zones (1=rest, 5=max)
- HR = Heart Rate
- LT = Lactate Threshold
- TRIMP = Training Impulse

### CrossFit/Functional Fitness
- WOD = Workout of the Day
- Rx = Prescribed weight/standard
- Scaled = Scaled version
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
- 3-1-1 = 3s down, 1s pause, 1s up
- Eccentric = Negative reps
- Concentric = Positive reps
- Isometric = Static hold

### Intensity
- RPE = Rate of Perceived Exertion (1-10)
- @6 = RPE 6
- Max = Maximum effort
`,
  sv: `
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
`,
}

// ============================================
// TEXT PARSING PROMPT
// ============================================

/**
 * Build prompt for parsing free-form text workout descriptions
 */
export function buildTextParsingPrompt(
  text: string,
  exerciseLibrary: ExerciseLibraryEntry[],
  locale: AppLocale = 'en',
): string {
  const exerciseList = formatExerciseLibrary(exerciseLibrary, locale)

  if (locale === 'sv') {
    return `${SYSTEM_CONTEXT.sv}

${outputLanguageInstruction(locale)}

${SHORTHAND_DICTIONARY.sv}

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
${JSON_OUTPUT_TEMPLATE.sv}
\`\`\`

VIKTIGT:
- Svara ENDAST med JSON, ingen annan text
- duration är i MINUTER — t.ex. 37:16 = 37, 1:05:00 = 65
- distance är i METER (inte kilometer!) — t.ex. 5 km = 5000, 7,14 km = 7140, 400m = 400
- avgPace är i SEKUNDER PER KILOMETER — t.ex. 5:13/km = 313, 6:00/km = 360
- avgHeartRate och maxHeartRate i BPM — t.ex. 148 bpm = 148
- estimatedCalories som heltal — t.ex. 533 kcal = 533
- cardioSegments.duration är i sekunder
- cardioSegments.distance är i meter
- Om du inte kan extrahera ett värde, utelämna fältet
- confidence ska vara lägre (0.5-0.7) om input är vag
- Var generös med tolkning men ärlig med confidence

DISTANSBERÄKNING:
- Beräkna alltid total distance från intervaller: "10x400m" = 4000 meter
- Inkludera uppvärmning/nedvarvning i totaldistansen om det nämns
- Uppskatta distans från duration för kardiopass utan angiven distans:
  - Promenad: ~5000m per 60 min (ca 83m/min)
  - Rask promenad: ~6000m per 60 min (ca 100m/min)
  - Lätt löpning: ~9000m per 60 min (ca 150m/min)
  - Normal löpning: ~10000m per 60 min
  - Cykling: ~25000m per 60 min
  - Simning: ~2000m per 60 min
- Summera cardioSegments-distanser till top-level distance om de finns`
  }

  return `${SYSTEM_CONTEXT.en}

${outputLanguageInstruction(locale)}

${SHORTHAND_DICTIONARY.en}

## EXERCISE LIBRARY

Try to match exercises against this library. Use exerciseId when a match is found.
If no match exists, set isCustom: true and exerciseId: null.

${exerciseList}

## INPUT TO INTERPRET

The following text describes a workout that an athlete completed:

"""
${text}
"""

## INSTRUCTIONS

1. Analyze the text carefully
2. Identify workout type (CARDIO, STRENGTH, HYBRID, MIXED)
3. Extract every detail you can find:
   - Duration/time
   - Distance (for cardio)
   - Exercises, sets, reps, weights (for strength)
   - Format (AMRAP, EMOM, etc. for hybrid)
   - Intensity and feeling
4. Match exercises against the library
5. Set confidence based on how certain you are
6. Add warnings for unclear information

## OUTPUT

Return ONLY JSON in the following format (no other text):

\`\`\`json
${JSON_OUTPUT_TEMPLATE.en}
\`\`\`

IMPORTANT:
- Return ONLY JSON, no other text
- duration is in MINUTES — for example 37:16 = 37, 1:05:00 = 65
- distance is in METERS (not kilometers) — for example 5 km = 5000, 7.14 km = 7140, 400m = 400
- avgPace is in SECONDS PER KILOMETER — for example 5:13/km = 313, 6:00/km = 360
- avgHeartRate and maxHeartRate are in BPM — for example 148 bpm = 148
- estimatedCalories as an integer — for example 533 kcal = 533
- cardioSegments.duration is in seconds
- cardioSegments.distance is in meters
- If you cannot extract a value, omit the field
- confidence should be lower (0.5-0.7) when input is vague
- Be generous with interpretation but honest with confidence

DISTANCE CALCULATION:
- Always calculate total distance from intervals: "10x400m" = 4000 meters
- Include warm-up/cool-down in total distance when mentioned
- Estimate distance from duration for cardio sessions without a stated distance:
  - Walk: ~5000m per 60 min (about 83m/min)
  - Brisk walk: ~6000m per 60 min (about 100m/min)
  - Easy running: ~9000m per 60 min (about 150m/min)
  - Normal running: ~10000m per 60 min
  - Cycling: ~25000m per 60 min
  - Swimming: ~2000m per 60 min
- Sum cardioSegments distances into top-level distance when present`
}

// ============================================
// IMAGE PARSING PROMPT
// ============================================

/**
 * Build prompt for parsing workout from photo/screenshot
 */
export function buildImageParsingPrompt(
  exerciseLibrary: ExerciseLibraryEntry[],
  locale: AppLocale = 'en',
): string {
  const exerciseList = formatExerciseLibrary(exerciseLibrary, locale)

  if (locale === 'sv') {
    return `${SYSTEM_CONTEXT.sv}

${outputLanguageInstruction(locale)}

${SHORTHAND_DICTIONARY.sv}

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
${JSON_OUTPUT_TEMPLATE.sv}
\`\`\`

VIKTIGT:
- Tolka handskrift så gott du kan
- Förkortningar är vanliga (se ordlista ovan)
- Whiteboard-text kan vara ofullständig
- Sätt confidence baserat på läsbarhet
- Lägg till warnings för text du inte kunde läsa
- distance är i METER (inte kilometer!) — t.ex. 5 km = 5000, 7,14 km = 7140, 400m = 400
- duration är i MINUTER — t.ex. 37:16 = 37, 1:05:00 = 65
- avgPace är i SEKUNDER PER KILOMETER — t.ex. 5:13/km = 313
- avgHeartRate och maxHeartRate i BPM — t.ex. 148 bpm = 148
- estimatedCalories som heltal — t.ex. 533 kcal = 533
- SKÄRMDUMPAR FRÅN APPAR (Garmin, Strava, etc.): Läs av ALLA visade värden — distans, puls, tempo, kalorier, höjdmeter etc. Konvertera alltid km till meter (multiplicera med 1000)
- Om bilden inte innehåller ett träningspass, returnera:
  { "type": "MIXED", "confidence": 0, "rawInterpretation": "Kunde inte identifiera träningspass", "warnings": ["Bilden verkar inte innehålla ett träningspass"] }`
  }

  return `${SYSTEM_CONTEXT.en}

${outputLanguageInstruction(locale)}

${SHORTHAND_DICTIONARY.en}

## EXERCISE LIBRARY

Try to match exercises against this library:

${exerciseList}

## INSTRUCTIONS

You will receive an image that contains a workout. It may be:
- A gym whiteboard
- A paper with a handwritten program
- A screenshot from an app or website
- An image of a training program

Analyze the image and:
1. Read all text you can see
2. Identify workout type (CARDIO, STRENGTH, HYBRID, MIXED)
3. Extract exercises, sets, reps, weights, and times
4. Match exercises against the library
5. Handle handwriting and abbreviations

## OUTPUT

Return ONLY JSON in the following format (no other text):

\`\`\`json
${JSON_OUTPUT_TEMPLATE.en}
\`\`\`

IMPORTANT:
- Interpret handwriting as well as you can
- Abbreviations are common (see dictionary above)
- Whiteboard text may be incomplete
- Set confidence based on readability
- Add warnings for text you could not read
- distance is in METERS (not kilometers) — for example 5 km = 5000, 7.14 km = 7140, 400m = 400
- duration is in MINUTES — for example 37:16 = 37, 1:05:00 = 65
- avgPace is in SECONDS PER KILOMETER — for example 5:13/km = 313
- avgHeartRate and maxHeartRate are in BPM — for example 148 bpm = 148
- estimatedCalories as an integer — for example 533 kcal = 533
- APP SCREENSHOTS (Garmin, Strava, etc.): read ALL shown values — distance, heart rate, pace, calories, elevation, etc. Always convert km to meters (multiply by 1000)
- If the image does not contain a workout, return:
  { "type": "MIXED", "confidence": 0, "rawInterpretation": "Could not identify a workout", "warnings": ["The image does not appear to contain a workout"] }`
}

// ============================================
// VOICE TRANSCRIPTION PARSING PROMPT
// ============================================

/**
 * Build prompt for parsing transcribed voice input
 */
export function buildVoiceParsingPrompt(
  transcription: string,
  exerciseLibrary: ExerciseLibraryEntry[],
  locale: AppLocale = 'en',
): string {
  const exerciseList = formatExerciseLibrary(exerciseLibrary, locale)

  if (locale === 'sv') {
    return `${SYSTEM_CONTEXT.sv}

${outputLanguageInstruction(locale)}

${SHORTHAND_DICTIONARY.sv}

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
${JSON_OUTPUT_TEMPLATE.sv}
\`\`\`

VIKTIGT:
- Röstinput är ofta vag - gör rimliga antaganden
- Om atleten säger "körde ben" utan detaljer, sätt lägre confidence
- "Kändes bra/tungt/lätt" mappar till feeling och perceivedEffort
- duration är i MINUTER — "en timme" = 60, "37 minuter" = 37
- distance är i METER (inte kilometer!) — "5 km" eller "fem kilometer" = 5000, "7,14 km" = 7140
- avgPace är i SEKUNDER PER KILOMETER — "5:13 per km" = 313, "sex minuter per km" = 360
- avgHeartRate och maxHeartRate i BPM — "puls 148" = 148
- estimatedCalories som heltal — "533 kalorier" = 533
- Beräkna distans från intervaller: "10x400m" = distance: 4000
- Uppskatta distans för kardiopass utan angiven distans baserat på duration och typ`
  }

  return `${SYSTEM_CONTEXT.en}

${outputLanguageInstruction(locale)}

${SHORTHAND_DICTIONARY.en}

## EXERCISE LIBRARY

Try to match exercises against this library:

${exerciseList}

## CONTEXT

The following is a transcript of a voice message where an athlete describes a completed workout.

Keep in mind:
- Speech can be informal and conversational
- Numbers can be spoken in different ways ("three times ten" = 3x10)
- The athlete may not mention every detail
- Swedish and English terms may be mixed

## TRANSCRIPT

"""
${transcription}
"""

## INSTRUCTIONS

1. Interpret the informal speech
2. Identify workout type (CARDIO, STRENGTH, HYBRID, MIXED)
3. Extract every detail you can hear/understand:
   - "ran for half an hour" = duration: 30
   - "did three sets of ten reps squats" = 3x10 squats
   - "felt heavy" = perceivedEffort: 8 or feeling: "TIRED"
4. Match exercises against the library
5. Be generous with interpretation

## OUTPUT

Return ONLY JSON in the following format (no other text):

\`\`\`json
${JSON_OUTPUT_TEMPLATE.en}
\`\`\`

IMPORTANT:
- Voice input is often vague - make reasonable assumptions
- If the athlete says "did legs" without details, use lower confidence
- "Felt good/heavy/easy" maps to feeling and perceivedEffort
- duration is in MINUTES — "one hour" = 60, "37 minutes" = 37
- distance is in METERS (not kilometers) — "5 km" or "five kilometers" = 5000, "7.14 km" = 7140
- avgPace is in SECONDS PER KILOMETER — "5:13 per km" = 313, "six minutes per km" = 360
- avgHeartRate and maxHeartRate are in BPM — "heart rate 148" = 148
- estimatedCalories as an integer — "533 calories" = 533
- Calculate distance from intervals: "10x400m" = distance: 4000
- Estimate distance for cardio sessions without a stated distance based on duration and type`
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format exercise library for prompt injection
 */
function formatExerciseLibrary(exercises: ExerciseLibraryEntry[], locale: AppLocale): string {
  if (exercises.length === 0) {
    return locale === 'sv'
      ? 'Inget övningsbibliotek tillgängligt - markera alla övningar som isCustom: true'
      : 'No exercise library available - mark all exercises as isCustom: true'
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
      output += locale === 'sv'
        ? `  ... och ${exs.length - 30} fler ${category}-övningar\n`
        : `  ... and ${exs.length - 30} more ${category} exercises\n`
    }
  }

  return output
}

/**
 * Build prompt for transcribing audio (before parsing)
 */
export function buildTranscriptionPrompt(locale: AppLocale = 'en'): string {
  if (locale === 'sv') {
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

  return `Transcribe this voice message into English text.

The athlete is describing a workout they completed.

INSTRUCTIONS:
1. Write exactly what is said, translated into natural English where needed
2. Include pauses as "..." if relevant
3. Preserve all numbers and measurements
4. Keep exercise names, workout names, and brand names as close to the source as possible
5. If words are unclear, make the best reasonable interpretation

Return ONLY the transcription, no other text.`
}

/**
 * Get the JSON output schema description for validation
 */
export function getOutputSchema(locale: AppLocale = 'en'): string {
  return JSON_OUTPUT_TEMPLATE[locale]
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
