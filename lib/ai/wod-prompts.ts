/**
 * WOD Prompts
 *
 * AI prompt templates for Workout of the Day generation.
 * Three modes: Structured, Casual, and Fun.
 */

import type {
  WODAthleteContext,
  WODRequest,
  WODGuardrailResult,
  WODMode,
  WODEquipment,
} from '@/types/wod'
import { WOD_LABELS } from '@/types/wod'
import { generateGuardrailConstraints, getExcludedExerciseCategories } from './wod-guardrails'

// ============================================
// MAIN PROMPT BUILDER
// ============================================

/**
 * Build the complete WOD generation prompt
 */
export function buildWODPrompt(
  context: WODAthleteContext,
  request: WODRequest,
  guardrails: WODGuardrailResult
): string {
  const modePrompt = getModePrompt(request.mode)
  const sportContext = getSportContext(context.primarySport)
  const constraintsSection = generateGuardrailConstraints(guardrails)
  const excludedCategories = getExcludedExerciseCategories(guardrails.excludedAreas)

  return `${SYSTEM_CONTEXT}

${modePrompt}

## ATLET PROFIL
- **Namn**: ${context.athleteName}
- **Sport**: ${translateSport(context.primarySport)}
- **Erfarenhet**: ${translateExperience(context.experienceLevel)}
- **Beredskapspoäng**: ${context.readinessScore !== null ? `${context.readinessScore.toFixed(1)}/10` : 'Ej tillgänglig'}

${sportContext}

## TRÄNINGSKONTEXT
- **Veckobelastning (TSS)**: ${context.weeklyTSS}
- **ACWR-zon**: ${context.acwrZone}
- **Nuvarande mål**: ${context.currentGoal || 'Ej angivet'}

## SENASTE TRÄNING (4 dagar)
${formatRecentWorkouts(context.recentWorkouts)}

## BEGRÄNSNINGAR OCH JUSTERINGAR
${constraintsSection}

${excludedCategories.length > 0 ? `\n## EXKLUDERADE ÖVNINGSKATEGORIER\n${excludedCategories.join(', ')}\n` : ''}

## PASSSPECIFIKATION
- **Längd**: ${request.duration || 45} minuter
- **Utrustning**: ${formatEquipment(request.equipment || ['none'])}
- **Fokusområde**: ${request.focusArea ? WOD_LABELS.focusAreas[request.focusArea] : 'Helkropp'}
- **Justerad intensitet**: ${WOD_LABELS.intensity[guardrails.adjustedIntensity]}

## OUTPUT FORMAT

Svara ENDAST med JSON i följande format (ingen annan text):

\`\`\`json
${JSON_OUTPUT_TEMPLATE}
\`\`\`

VIKTIGT:
- Alla texter ska vara på SVENSKA
- Övningsnamn ska ha både svenskt namn (nameSv) och engelskt namn (name)
- Passet ska passa den angivna längden exakt
- Respektera ALLA begränsningar ovan
- Inkludera alltid uppvärmning och nedvarvning
- Var kreativ med passnamnet - gör det inspirerande!
- ALDRIG använd "tröskel" eller "threshold" för styrkepass - det är endast ett konditionsbegrepp
- För styrkepass, använd istället: "Kraft", "Power", "Styrka", "Explosiv", "Funktionell", etc.
- Inkludera ALLTID instruktioner för VARJE övning`
}

// ============================================
// SYSTEM CONTEXT
// ============================================

const SYSTEM_CONTEXT = `Du är en erfaren personlig tränare och fysiolog som skapar individuellt anpassade träningspass.

Din uppgift är att generera ett komplett träningspass (Workout of the Day) baserat på atletens profil, nuvarande tillstånd och specifikationer.

PRINCIPER:
1. Säkerhet först - respektera alltid skador och trötthet
2. Progressiv belastning - anpassa efter atletens nivå
3. Variation - variera övningar för att hålla träningen intressant
4. Funktionalitet - övningar ska ha överföring till atletens sport
5. Helhet - inkludera alltid uppvärmning och nedvarvning`

// ============================================
// MODE-SPECIFIC PROMPTS
// ============================================

function getModePrompt(mode: WODMode): string {
  switch (mode) {
    case 'structured':
      return STRUCTURED_MODE_PROMPT
    case 'casual':
      return CASUAL_MODE_PROMPT
    case 'fun':
      return FUN_MODE_PROMPT
    default:
      return STRUCTURED_MODE_PROMPT
  }
}

const STRUCTURED_MODE_PROMPT = `## PASSTYP: STRUKTURERAT

Du skapar ett VETENSKAPLIGT BASERAT pass som följer träningsprinciper:

- Följ atletens periodiseringsplan och nuvarande fas
- Använd etablerade träningsmetoder (Polarized, Norwegian, etc.)
- Balansera belastning med återhämtning
- Inkludera specifik uppvärmning för huvuddelen
- Fokusera på kvalitet över kvantitet
- Ge tydliga instruktioner för tempo och vila

Tonen ska vara professionell men uppmuntrande.`

const CASUAL_MODE_PROMPT = `## PASSTYP: AVSLAPPNAT

Du skapar ett FLEXIBELT pass för någon som bara vill röra på sig:

- Ingen press på prestation
- Enklare övningar som alla kan göra
- Fokus på välmående och rörelse
- "Gör så mycket du orkar" är OK
- Kortare vilotider, mer flöde
- Alternativa övningar vid behov

Tonen ska vara avslappnad och inbjudande. Använd fraser som:
- "Ta det i din egen takt"
- "Lyssna på kroppen"
- "Det viktigaste är att du rör dig"`

const FUN_MODE_PROMPT = `## PASSTYP: BARA KUL!

Du skapar ett ÖVERRASKANDE och VARIERAT pass för maximal glädje:

- Blanda olika träningsformer kreativt
- Inkludera lekfulla element
- Använd udda tidsformat (t.ex. AMRAP, EMOM, Tabata)
- Ge övningar roliga namn
- Lägg till mini-utmaningar
- Gör det socialt om möjligt (partner-övningar)

Tonen ska vara energisk och lekfull. Använd:
- Motiverande undertitlar
- Humoristiska instruktioner (men fortfarande korrekta)
- "Achievement unlocked"-känsla`

// ============================================
// SPORT-SPECIFIC CONTEXT
// ============================================

function getSportContext(sport: string): string {
  const contexts: Record<string, string> = {
    RUNNING: `## SPORTSPECIFIK KONTEXT: LÖPNING
- Fokusera på löpspecifik styrka (posterior chain, core stabilitet)
- Inkludera löparövningar (drills, plyometrics) i uppvärmningen
- Undvik överbelastning av nedre extremiteterna
- Prioritera enbensstyrka och explosivitet`,

    CYCLING: `## SPORTSPECIFIK KONTEXT: CYKLING
- Fokusera på quadriceps och höftflexorernas styrka
- Core-stabilitet för kraftöverföring
- Rörlighet i höfter och nedre rygg
- Undvik överdriven överkroppsträning`,

    SWIMMING: `## SPORTSPECIFIK KONTEXT: SIMNING
- Fokusera på axelstabilitet och skulderbladsmuskulatur
- Core-rotation och stabilitet
- Rörlighet i axlar och bröstrygg
- Latissimus dorsi och dorsalkedjan`,

    TRIATHLON: `## SPORTSPECIFIK KONTEXT: TRIATHLON
- Balansera mellan tre discipliner
- Övergångsspecifik träning
- Allsidig konditionsträning
- Undvik överbelastning på en muskelgrupp`,

    HYROX: `## SPORTSPECIFIK KONTEXT: HYROX
- Funktionell fitness med uthållighet
- Stationsspecifik träning (sled, skierg, rodd, etc.)
- Snabba övergångar mellan övningar
- Grepstyrka och arbetskapacitet`,

    SKIING: `## SPORTSPECIFIK KONTEXT: SKIDOR
- Balans och koordination
- Stavar-specifik överkroppsträning
- Core-rotation för stakning
- Benuthållighet och explosivitet`,

    GENERAL_FITNESS: `## SPORTSPECIFIK KONTEXT: ALLMÄN FITNESS
- Allsidig träning för hälsa
- Balanserad kropp
- Grundläggande rörlighet och styrka
- Vardagsfunktionella rörelser`,
  }

  return contexts[sport] || contexts.GENERAL_FITNESS
}

// ============================================
// JSON OUTPUT TEMPLATE
// ============================================

const JSON_OUTPUT_TEMPLATE = `{
  "title": "Inspirerande svenskt namn på passet",
  "subtitle": "Kort motiverande undertitel",
  "description": "2-3 meningar som beskriver vad passet fokuserar på och varför det är bra för atleten idag",
  "sections": [
    {
      "type": "WARMUP",
      "name": "Uppvärmning",
      "duration": 8,
      "exercises": [
        {
          "name": "Exercise Name",
          "nameSv": "Övningsnamn på Svenska",
          "sets": 2,
          "reps": "10 vardera",
          "instructions": "Tydliga instruktioner på svenska"
        }
      ],
      "notes": "Valfri sektion-specifik notering"
    },
    {
      "type": "MAIN",
      "name": "Huvudpass",
      "duration": 25,
      "exercises": [
        {
          "name": "Exercise Name",
          "nameSv": "Övningsnamn på Svenska",
          "sets": 3,
          "reps": "12",
          "weight": "Måttlig",
          "restSeconds": 60,
          "instructions": "Tydliga instruktioner"
        }
      ]
    },
    {
      "type": "CORE",
      "name": "Core",
      "duration": 5,
      "exercises": []
    },
    {
      "type": "COOLDOWN",
      "name": "Nedvarvning",
      "duration": 7,
      "exercises": []
    }
  ],
  "coachNotes": "AI-genererad förklaring av varför detta pass valdes för atleten idag baserat på deras tillstånd och mål"
}`

// ============================================
// HELPER FUNCTIONS
// ============================================

function translateSport(sport: string): string {
  const translations: Record<string, string> = {
    RUNNING: 'Löpning',
    CYCLING: 'Cykling',
    SWIMMING: 'Simning',
    TRIATHLON: 'Triathlon',
    HYROX: 'HYROX',
    SKIING: 'Skidor',
    GENERAL_FITNESS: 'Allmän fitness',
  }
  return translations[sport] || sport
}

function translateExperience(level: string): string {
  const translations: Record<string, string> = {
    BEGINNER: 'Nybörjare',
    RECREATIONAL: 'Motionär',
    ADVANCED: 'Avancerad',
    ELITE: 'Elit',
  }
  return translations[level] || level
}

function formatRecentWorkouts(
  workouts: WODAthleteContext['recentWorkouts']
): string {
  if (workouts.length === 0) {
    return '- Inga loggade pass de senaste 4 dagarna'
  }

  return workouts
    .slice(0, 5)
    .map(w => {
      const date = new Date(w.date).toLocaleDateString('sv-SE', { weekday: 'short' })
      const muscles = w.muscleGroups?.length ? ` (${w.muscleGroups.slice(0, 2).join(', ')})` : ''
      return `- ${date}: ${translateWorkoutType(w.type)} - ${translateIntensity(w.intensity)}${muscles}`
    })
    .join('\n')
}

function translateWorkoutType(type: string): string {
  const translations: Record<string, string> = {
    RUNNING: 'Löpning',
    STRENGTH: 'Styrka',
    CYCLING: 'Cykling',
    SWIMMING: 'Simning',
    PLYOMETRIC: 'Plyometri',
    CORE: 'Core',
    RECOVERY: 'Återhämtning',
    FLEXIBILITY: 'Rörlighet',
  }
  return translations[type] || type
}

function translateIntensity(intensity: string): string {
  const translations: Record<string, string> = {
    RECOVERY: 'Vila',
    EASY: 'Lätt',
    MODERATE: 'Måttlig',
    THRESHOLD: 'Tröskel',
    INTERVAL: 'Intervall',
    MAX: 'Max',
  }
  return translations[intensity] || intensity
}

function formatEquipment(equipment: WODEquipment[]): string {
  if (equipment.length === 0 || (equipment.length === 1 && equipment[0] === 'none')) {
    return 'Ingen utrustning (endast kroppsvikt)'
  }

  return equipment
    .filter(e => e !== 'none')
    .map(e => WOD_LABELS.equipment[e] || e)
    .join(', ')
}

// ============================================
// EXERCISE LIBRARY MAPPING
// ============================================

/**
 * Known exercises from the 84-exercise library
 * Used to map AI-generated exercises to existing library entries
 */
export const EXERCISE_LIBRARY_MAP: Record<string, string> = {
  // Posterior Chain
  'romanian deadlift': 'Rumänsk marklyft',
  'rumänsk marklyft': 'Rumänsk marklyft',
  'rdl': 'Rumänsk marklyft',
  'hip thrust': 'Hip Thrust med skivstång',
  'höftlyft': 'Hip Thrust med skivstång',
  'glute bridge': 'Höftbrygga',
  'säteslyft': 'Höftbrygga',
  'höftbrygga': 'Höftbrygga',
  'kettlebell swing': 'Kettlebell Swing',
  'nordic hamstring': 'Nordic Hamstring',
  'nordisk hamstring': 'Nordic Hamstring',
  'good morning': 'Good Mornings',
  'good mornings': 'Good Mornings',
  'marklyft': 'Marklyft',
  'deadlift': 'Marklyft',
  'glute kickback': 'Glute Kickbacks',
  'glute kickbacks': 'Glute Kickbacks',
  'sparkbaksparkar': 'Glute Kickbacks',
  'superman': 'Superman',

  // Knee Dominance
  'squat': 'Knäböj',
  'knäböj': 'Knäböj',
  'back squat': 'Knäböj',
  'goblet squat': 'Goblet Squat',
  'bägarsquat': 'Goblet Squat',
  'front squat': 'Front Squat',
  'bulgarian split squat': 'Bulgarisk utfallsböj',
  'bulgarisk utfall': 'Bulgarisk utfallsböj',
  'bulgarisk utfallsböj': 'Bulgarisk utfallsböj',
  'bulgarisk split squat': 'Bulgarisk utfallsböj',
  'lunge': 'Utfallssteg',
  'utfall': 'Utfallssteg',
  'utfallssteg': 'Utfallssteg',
  'walking lunge': 'Utfallssteg',
  'gående utfall': 'Utfallssteg',
  'bakåtlunges': 'Bakåtlunges',
  'reverse lunge': 'Bakåtlunges',
  'lateral lunge': 'Lateral Lunges',
  'lateral lunges': 'Lateral Lunges',
  'step up': 'Step-Ups (låg)',
  'step-up': 'Step-Ups (låg)',
  'step-ups': 'Step-Ups (låg)',
  'uppsteg': 'Step-Ups (låg)',
  'pistol squat': 'Pistol Squat Progression',
  'enbensknäböj': 'Pistol Squat Progression',
  'single leg squat': 'Pistol Squat Progression',
  'sumo squat': 'Sumo Squats',
  'sumo squats': 'Sumo Squats',
  'sumoknäböj': 'Sumo Squats',
  'wall sit': 'Wall Sit',
  'väggstol': 'Wall Sit',
  'benpress': 'Benpress',
  'leg press': 'Benpress',

  // Core
  'planka': 'Plank',
  'plank': 'Plank',
  'plankan': 'Plank',
  'sidoplanka': 'Sidplank',
  'sidplank': 'Sidplank',
  'side plank': 'Sidplank',
  'dead bug': 'Dead Bug',
  'bird dog': 'Bird Dog',
  'fågelhund': 'Bird Dog',
  'pallof press': 'Pallof Press',
  'russian twist': 'Russian Twist',
  'rysk twist': 'Russian Twist',
  'mountain climber': 'Mountain Climbers',
  'mountain climbers': 'Mountain Climbers',
  'bergsklättrare': 'Mountain Climbers',
  'bicycle crunch': 'Bicycle Crunches',
  'bicycle crunches': 'Bicycle Crunches',
  'cykelcrunches': 'Bicycle Crunches',
  'cykelcrunch': 'Bicycle Crunches',
  'leg raise': 'Leg Raises',
  'leg raises': 'Leg Raises',
  'benlyft': 'Leg Raises',
  'hanging leg raise': 'Leg Raises',
  'v-up': 'V-ups',
  'v-ups': 'V-ups',
  'hollow hold': 'Hollow Hold',
  'hollow body': 'Hollow Hold',
  'hollow body hold': 'Hollow Hold',
  'sit up': 'Sit-ups',
  'sit-up': 'Sit-ups',
  'sit-ups': 'Sit-ups',
  'situps': 'Sit-ups',
  'crunch': 'Crunches',
  'crunches': 'Crunches',
  'ab wheel': 'Ab Wheel Rollouts',
  'ab wheel rollout': 'Ab Wheel Rollouts',
  'copenhagen plank': 'Copenhagen Plank',
  'stir the pot': 'Stir the Pot',
  'suitcase carry': 'Suitcase Carry',
  'farmers walk': 'Farmer\'s Walk',
  'farmer walk': 'Farmer\'s Walk',
  'farmer\'s walk': 'Farmer\'s Walk',

  // Plyometric
  'box jump': 'Lådhopp (18-24")',
  'box jumps': 'Lådhopp (18-24")',
  'lådhopp': 'Lådhopp (18-24")',
  'broad jump': 'Bred hopp (max)',
  'längdhopp': 'Bred hopp (max)',
  'pogo jump': 'Pogo Jumps',
  'pogo jumps': 'Pogo Jumps',
  'lateral hop': 'Lateral Hops',
  'lateral hops': 'Lateral Hops',
  'sidohopp': 'Lateral Hops',
  'skipping': 'Skipping',
  'jump squat': 'Hoppsquat',
  'jump squats': 'Hoppsquat',
  'hoppknäböj': 'Hoppsquat',
  'hoppsquat': 'Hoppsquat',
  'squat jump': 'Hoppsquat',
  'squat jumps': 'Hoppsquat',
  'burpee': 'Burpees',
  'burpees': 'Burpees',
  'tuck jump': 'Tuck Jumps',
  'tuck jumps': 'Tuck Jumps',
  'knälyft hopp': 'Tuck Jumps',
  'split jump': 'Split Jumps',
  'split jumps': 'Split Jumps',
  'hoppande utfall': 'Split Jumps',
  'split squat jump': 'Split Jumps',
  'hopprep': 'Hopprep',
  'jump rope': 'Hopprep',
  'ankelhopp': 'Ankelhopp',
  'ankle hop': 'Ankelhopp',
  'ankle hops': 'Ankelhopp',
  'depth jump': 'Depth Jumps (30cm)',
  'depth jumps': 'Depth Jumps (30cm)',
  'high knees': 'High Knees',
  'höga knän': 'High Knees',
  'butt kicks': 'Butt Kicks',
  'hälarmar': 'Butt Kicks',
  'jumping jacks': 'Jumping Jacks',
  'hampelmannhopp': 'Jumping Jacks',
  'jumping jack': 'Jumping Jacks',

  // Upper Body
  'push up': 'Armhävningar',
  'push-up': 'Armhävningar',
  'push-ups': 'Armhävningar',
  'pushup': 'Armhävningar',
  'pushups': 'Armhävningar',
  'armhävning': 'Armhävningar',
  'armhävningar': 'Armhävningar',
  'pull up': 'Chins',
  'pull-up': 'Chins',
  'pull-ups': 'Chins',
  'pullup': 'Chins',
  'chins': 'Chins',
  'chin-up': 'Chins',
  'chin-ups': 'Chins',
  'bent over row': 'Rodd',
  'rodd': 'Rodd',
  'barbell row': 'Rodd',
  'shoulder press': 'Axelpress',
  'axelpress': 'Axelpress',
  'overhead press': 'Axelpress',
  'military press': 'Axelpress',
  'dips': 'Dips',
  'dip': 'Dips',
  'tricep dips': 'Dips',
  'bench dips': 'Dips',
  'inverted row': 'Inverterad rodd',
  'omvänd rodd': 'Inverterad rodd',
  'inverterad rodd': 'Inverterad rodd',
  'face pull': 'Face Pulls',
  'face pulls': 'Face Pulls',
  'lat pulldown': 'Latsdrag',
  'latsdrag': 'Latsdrag',
  'bänkpress': 'Bänkpress',
  'bench press': 'Bänkpress',
  'wall angels': 'Wall Angels',
  'väggänglar': 'Wall Angels',
  'prone y-raise': 'Prone Y-raise',
  'y-raise': 'Prone Y-raise',
  'y-lyft': 'Prone Y-raise',

  // Foot/Ankle
  'calf raise': 'Tåhävningar (raka ben)',
  'calf raises': 'Tåhävningar (raka ben)',
  'tåhävning': 'Tåhävningar (raka ben)',
  'tåhävningar': 'Tåhävningar (raka ben)',
  'single leg calf raise': 'Enbenig tåhävning',
  'enbens tåhävning': 'Enbenig tåhävning',
  'enbenig tåhävning': 'Enbenig tåhävning',
  'ankle mobility': 'Ankelrörlighet',
  'ankelrörlighet': 'Ankelrörlighet',
  'hälgång': 'Hälgång',
  'heel walk': 'Hälgång',
  'heel walks': 'Hälgång',
  'toe yoga': 'Toe Yoga',

  // Unilateral
  'single leg deadlift': 'Enbenig rumänsk marklyft',
  'enbens marklyft': 'Enbenig rumänsk marklyft',
  'enbenig marklyft': 'Enbenig rumänsk marklyft',
  'single leg rdl': 'Enbenig rumänsk marklyft',
  'skater squat': 'Skater Squats',
  'skater squats': 'Skater Squats',
  'single leg glute bridge': 'Enbensbrygga',
  'enbens säteslyft': 'Enbensbrygga',
  'enbensbrygga': 'Enbensbrygga',
  'single leg bridge': 'Enbensbrygga',

  // Mobility/Warmup
  'hip circle': 'Höftcirklar',
  'hip circles': 'Höftcirklar',
  'höftcirklar': 'Höftcirklar',
  'leg swing': 'Bensving',
  'leg swings': 'Bensving',
  'benpendel': 'Bensving',
  'bensving': 'Bensving',
  'world greatest stretch': 'Världens bästa stretch',
  'worlds greatest stretch': 'Världens bästa stretch',
  'världens bästa stretch': 'Världens bästa stretch',
  'cat cow': 'Katt-Ko',
  'cat-cow': 'Katt-Ko',
  'katt-ko': 'Katt-Ko',
  'foam rolling': 'Foam Rolling',
  'foam roll': 'Foam Rolling',
  'inchworm': 'Inchworm',
  'inchworms': 'Inchworm',

  // Activation/Stability
  'clamshell': 'Clamshells med band',
  'clamshells': 'Clamshells med band',
  'clamshells med band': 'Clamshells med band',
  'hip hikes': 'Hip hikes',
  'hip hike': 'Hip hikes',
  'fire hydrant': 'Fire Hydrants',
  'fire hydrants': 'Fire Hydrants',
}

/**
 * Try to match an AI-generated exercise name to library
 */
export function matchExerciseToLibrary(
  exerciseName: string
): string | undefined {
  const normalized = exerciseName.toLowerCase().trim()

  // Direct match
  if (EXERCISE_LIBRARY_MAP[normalized]) {
    return EXERCISE_LIBRARY_MAP[normalized]
  }

  // Partial match
  for (const [key, value] of Object.entries(EXERCISE_LIBRARY_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value
    }
  }

  return undefined
}
