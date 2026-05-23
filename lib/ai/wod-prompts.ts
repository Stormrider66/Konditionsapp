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
  WODWorkoutType,
  WODEquipment,
  WODFocusArea,
  AdjustedIntensity,
  WODCandidateBlueprint,
} from '@/types/wod'
import { WOD_LABELS } from '@/types/wod'
import { generateGuardrailConstraints, getExcludedExerciseCategories } from './wod-guardrails'
import { buildConstitutionPreamble } from '@/lib/ai/constitution'

// ============================================
// MAIN PROMPT BUILDER
// ============================================

/**
 * Build the complete WOD generation prompt
 */
export function buildWODPrompt(
  context: WODAthleteContext,
  request: WODRequest,
  guardrails: WODGuardrailResult,
  locale: 'en' | 'sv' = 'en',
  options?: {
    selectedCandidate?: WODCandidateBlueprint
    promptVariantAdjustment?: string | null
  }
): string {
  const workoutType = request.workoutType || 'strength'
  if (locale !== 'sv') {
    return buildEnglishWODPrompt(context, request, guardrails, workoutType, options)
  }

  const modePrompt = getModePrompt(request.mode)
  const workoutTypePrompt = getWorkoutTypePrompt(workoutType)
  const sportContext = getSportContext(context.primarySport)
  const constraintsSection = generateGuardrailConstraints(guardrails, 'sv')
  const excludedCategories = getExcludedExerciseCategories(guardrails.excludedAreas)
  const jsonTemplate = getJsonTemplate(workoutType)
  const explicitEquipment = normalizeRequestedEquipment(request.equipment || ['none'])
  const outputLanguage = locale === 'sv' ? 'SWEDISH' : 'ENGLISH'
  const learningSection = formatLearningSection(context, locale)
  const autoIntentSection = formatAutoIntentSection(context, locale)
  const candidateSection = formatSelectedCandidateSection(options?.selectedCandidate, locale)
  const promptVariantSection = formatPromptVariantAdjustment(options?.promptVariantAdjustment, locale)

  return `${SYSTEM_CONTEXT}

## OUTPUT LANGUAGE
Generate all user-facing workout copy in ${outputLanguage}. Use Swedish only when the user locale is sv.

${modePrompt}

${workoutTypePrompt}

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
${formatRecentWorkouts(context.recentWorkouts, locale)}

## BEGRÄNSNINGAR OCH JUSTERINGAR
${constraintsSection}

${excludedCategories.length > 0 ? `\n## EXKLUDERADE ÖVNINGSKATEGORIER\n${excludedCategories.join(', ')}\n` : ''}

## PASSSPECIFIKATION
- **Träningstyp**: ${WOD_LABELS.workoutTypes[workoutType].title}
- **Längd**: ${request.duration || 45} minuter
- **Önskad utrustning**: ${formatEquipment(explicitEquipment)}
- **Fokusområde**: ${request.focusArea ? WOD_LABELS.focusAreas[request.focusArea] : 'Helkropp'}
- **Justerad intensitet**: ${WOD_LABELS.intensity[guardrails.adjustedIntensity]}

${buildEquipmentConstraintSection(explicitEquipment)}

${formatLocationEquipment(context.locationEquipment, explicitEquipment)}

${autoIntentSection}

${learningSection}

${candidateSection}

${promptVariantSection}

${context.aiInstructions ? `## SPECIFIKA INSTRUKTIONER FÖR DENNA ATLET\n${context.aiInstructions}\n` : ''}
## OUTPUT FORMAT

Svara ENDAST med JSON i följande format (ingen annan text):

\`\`\`json
${jsonTemplate}
\`\`\`

VIKTIGT:
- Alla användarvända texter ska vara på ${outputLanguage}
- Övningsnamn ska ha både svenskt namn (nameSv) och engelskt namn (name)
- Passet ska passa den angivna längden exakt
- Respektera ALLA begränsningar ovan
- Använd ENDAST den utrustning som uttryckligen är tillåten för detta pass
- Inkludera alltid uppvärmning och nedvarvning
- Var kreativ med passnamnet - gör det inspirerande!
- ALDRIG använd "tröskel" eller "threshold" för styrkepass - det är endast ett konditionsbegrepp
- För styrkepass, använd istället: "Kraft", "Power", "Styrka", "Explosiv", "Funktionell", etc.
- Inkludera ALLTID instruktioner för VARJE övning`
}

function buildEnglishWODPrompt(
  context: WODAthleteContext,
  request: WODRequest,
  guardrails: WODGuardrailResult,
  workoutType: WODWorkoutType,
  options?: {
    selectedCandidate?: WODCandidateBlueprint
    promptVariantAdjustment?: string | null
  }
): string {
  const modePrompt = getEnglishModePrompt(request.mode)
  const workoutTypePrompt = getEnglishWorkoutTypePrompt(workoutType)
  const sportContext = getEnglishSportContext(context.primarySport)
  const constraintsSection = generateEnglishGuardrailConstraints(guardrails)
  const excludedCategories = getExcludedExerciseCategories(guardrails.excludedAreas)
  const explicitEquipment = normalizeRequestedEquipment(request.equipment || ['none'])
  const learningSection = formatLearningSection(context, 'en')
  const autoIntentSection = formatAutoIntentSection(context, 'en')
  const candidateSection = formatSelectedCandidateSection(options?.selectedCandidate, 'en')
  const promptVariantSection = formatPromptVariantAdjustment(options?.promptVariantAdjustment, 'en')

  return `${buildConstitutionPreamble('wod')}You are an experienced personal trainer and physiologist who creates individualized workouts.

Your job is to generate a complete Workout of the Day based on the athlete profile, current status, and requested session details.

PRINCIPLES:
1. Safety first: always respect injuries, restrictions, and fatigue
2. Progressive load: adapt to the athlete's current level
3. Variation: keep training useful and engaging
4. Functionality: exercises should transfer to the athlete's sport
5. Completeness: include warm-up and cooldown

## OUTPUT LANGUAGE
Generate all user-facing workout copy in ENGLISH. Include both English exercise names in \`name\` and Swedish exercise names in \`nameSv\` for compatibility.

${modePrompt}

${workoutTypePrompt}

## ATHLETE PROFILE
- **Name**: ${context.athleteName}
- **Sport**: ${translateSportEn(context.primarySport)}
- **Experience**: ${translateExperienceEn(context.experienceLevel)}
- **Readiness score**: ${context.readinessScore !== null ? `${context.readinessScore.toFixed(1)}/10` : 'Not available'}

${sportContext}

## TRAINING CONTEXT
- **Weekly load (TSS)**: ${context.weeklyTSS}
- **ACWR zone**: ${context.acwrZone}
- **Current goal**: ${context.currentGoal || 'Not specified'}

## RECENT TRAINING (4 days)
${formatRecentWorkoutsEn(context.recentWorkouts)}

## LIMITATIONS AND ADJUSTMENTS
${constraintsSection}

${excludedCategories.length > 0 ? `\n## EXCLUDED EXERCISE CATEGORIES\n${excludedCategories.join(', ')}\n` : ''}

## SESSION SPECIFICATION
- **Workout type**: ${getWorkoutTypeLabelEn(workoutType)}
- **Duration**: ${request.duration || 45} minutes
- **Requested equipment**: ${formatEquipmentEn(explicitEquipment)}
- **Focus area**: ${request.focusArea ? getFocusAreaLabelEn(request.focusArea) : 'Full body'}
- **Adjusted intensity**: ${getIntensityLabelEn(guardrails.adjustedIntensity)}

${buildEquipmentConstraintSectionEn(explicitEquipment)}

${formatLocationEquipmentEn(context.locationEquipment, explicitEquipment)}

${autoIntentSection}

${learningSection}

${candidateSection}

${promptVariantSection}

${context.aiInstructions ? `## SPECIFIC INSTRUCTIONS FOR THIS ATHLETE\n${context.aiInstructions}\n` : ''}
## OUTPUT FORMAT

Respond ONLY with JSON in this format and no extra text:

\`\`\`json
${getJsonTemplateEn(workoutType)}
\`\`\`

IMPORTANT:
- All user-facing text must be in ENGLISH
- Exercise names must include both English \`name\` and Swedish \`nameSv\`
- The session must fit the requested duration exactly
- Respect ALL limitations above
- Use ONLY equipment explicitly allowed for this session
- Always include warm-up and cooldown
- Be creative with the workout title
- NEVER use "threshold" for strength workouts; threshold is a cardio concept
- For strength workouts, use terms like "Power", "Strength", "Explosive", "Functional", etc.
- Include instructions for EVERY exercise`
}

export function buildWODCandidatePrompt(
  context: WODAthleteContext,
  request: WODRequest,
  guardrails: WODGuardrailResult,
  locale: 'en' | 'sv' = 'en',
  promptVariantAdjustment?: string | null
): string {
  const workoutType = request.workoutType || 'strength'
  const explicitEquipment = normalizeRequestedEquipment(request.equipment || ['none'])
  const constraintsSection = locale === 'sv'
    ? generateGuardrailConstraints(guardrails, 'sv')
    : generateEnglishGuardrailConstraints(guardrails)
  const learningSection = formatLearningSection(context, locale)
  const autoIntentSection = formatAutoIntentSection(context, locale)
  const promptVariantSection = formatPromptVariantAdjustment(promptVariantAdjustment, locale)
  const outputLanguage = locale === 'sv' ? 'SWEDISH' : 'ENGLISH'

  return `${locale === 'sv' ? SYSTEM_CONTEXT : `${buildConstitutionPreamble('wod')}You are an experienced personal trainer and physiologist.`}

## TASK
Create exactly 3 compact candidate blueprints for today's workout. Do not write the full workout yet.
The app will score these candidates for safety, athlete preference fit, readiness fit, equipment fit, and variety, then expand only the winner.

## OUTPUT LANGUAGE
Use ${outputLanguage} for title, summary, rationale, and section labels. Enum values must stay in English exactly as specified.

## ATHLETE
- Name: ${context.athleteName}
- Sport: ${locale === 'sv' ? translateSport(context.primarySport) : translateSportEn(context.primarySport)}
- Experience: ${locale === 'sv' ? translateExperience(context.experienceLevel) : translateExperienceEn(context.experienceLevel)}
- Readiness: ${context.readinessScore !== null ? `${context.readinessScore.toFixed(1)}/10` : 'not available'}
- Weekly load: ${context.weeklyTSS} TSS
- ACWR zone: ${context.acwrZone}
- Goal: ${context.currentGoal || 'not specified'}

## RECENT TRAINING
${locale === 'sv' ? formatRecentWorkouts(context.recentWorkouts, locale) : formatRecentWorkoutsEn(context.recentWorkouts)}

## LIMITS
${constraintsSection}

## REQUEST
- workoutType: ${workoutType}
- mode: ${request.mode}
- duration: ${request.duration || 45}
- equipment: ${explicitEquipment.join(', ')}
- focusArea: ${request.focusArea || 'full_body'}
- adjustedIntensity: ${guardrails.adjustedIntensity}

${autoIntentSection}

${learningSection}

${promptVariantSection}

## OUTPUT FORMAT
Respond only with JSON:
\`\`\`json
{
  "candidates": [
    {
      "id": "candidate-1",
      "title": "Short candidate title",
      "summary": "One-sentence description",
      "format": "Structured blocks | EMOM | AMRAP | Intervals | Circuit | For Time | Tabata",
      "workoutType": "${workoutType}",
      "mode": "${request.mode}",
      "duration": ${request.duration || 45},
      "intensity": "${guardrails.adjustedIntensity}",
      "equipment": ${JSON.stringify(explicitEquipment)},
      "focusArea": "${request.focusArea || 'full_body'}",
      "sections": ["Warm-up 8 min", "Main 30 min", "Cooldown 7 min"],
      "keyExercises": ["Exercise 1", "Exercise 2", "Exercise 3"],
      "rationale": "Why this is a good fit today"
    }
  ]
}
\`\`\`

IMPORTANT:
- Return exactly 3 candidates with ids candidate-1, candidate-2, candidate-3
- Each candidate must fit the requested duration
- Use only requested equipment
- Respect all safety limits and excluded areas
- Make the candidates meaningfully different from each other`
}

function formatAutoIntentSection(
  context: WODAthleteContext,
  locale: 'en' | 'sv'
): string {
  const intent = context.wodAutoIntent
  if (!intent) return ''
  const heading = locale === 'sv' ? '## SNABBVAL FRÅN TRÄNINGSRYTM' : '## ONE-TAP RHYTHM INTENT'
  const signals = intent.signals.length > 0
    ? intent.signals.map((signal) => `- ${signal}`).join('\n')
    : '- No strong pattern signals available'
  const instruction = locale === 'sv'
    ? 'Detta är ett snabbt automatiskt val baserat på atletens tidigare rytm. Följ intentionen om den inte krockar med säkerhetsreglerna.'
    : 'This is a fast automatic choice based on the athlete rhythm. Follow the intent unless safety rules conflict.'

  return `${heading}
- source: ${intent.source}
- confidence: ${Math.round(intent.confidence * 100)}%
- reason: ${intent.reason}
${signals}

${instruction}`
}

function formatLearningSection(
  context: WODAthleteContext,
  locale: 'en' | 'sv'
): string {
  const lines: string[] = []
  if (context.wodPreferenceProfile?.promptSummary) {
    lines.push(
      locale === 'sv'
        ? `Personlig inlärning: ${context.wodPreferenceProfile.promptSummary}`
        : `Personal learning: ${context.wodPreferenceProfile.promptSummary}`
    )
  }
  for (const hint of context.globalLearningHints || []) {
    lines.push(
      locale === 'sv'
        ? `Anonymt kohortmönster: ${hint}`
        : `Anonymous cohort pattern: ${hint}`
    )
  }

  if (lines.length === 0) return ''

  return `${locale === 'sv' ? '## INLÄRDA PREFERENSER' : '## LEARNED PREFERENCES'}
${lines.join('\n')}

Use personal learning before anonymous cohort patterns. Never override safety limits.`
}

function formatSelectedCandidateSection(
  candidate: WODCandidateBlueprint | undefined,
  locale: 'en' | 'sv'
): string {
  if (!candidate) return ''
  const heading = locale === 'sv' ? '## VINNANDE KANDIDAT ATT EXPANDERA' : '## WINNING CANDIDATE TO EXPAND'
  return `${heading}
- id: ${candidate.id}
- title: ${candidate.title}
- summary: ${candidate.summary}
- format: ${candidate.format}
- intensity: ${candidate.intensity}
- sections: ${candidate.sections.join(' | ')}
- key exercises: ${candidate.keyExercises.join(', ')}
- rationale: ${candidate.rationale}

Expand this selected blueprint into the final full workout JSON. Keep the core idea, structure, duration, and safety profile intact.`
}

function formatPromptVariantAdjustment(
  adjustment: string | null | undefined,
  locale: 'en' | 'sv'
): string {
  if (!adjustment) return ''
  return `${locale === 'sv' ? '## AKTIV WOD-STRATEGIVARIANT' : '## ACTIVE WOD STRATEGY VARIANT'}
${adjustment}`
}

function getEnglishModePrompt(mode: WODMode): string {
  switch (mode) {
    case 'casual':
      return `## SESSION STYLE: CASUAL

Create a flexible workout for someone who wants to move without pressure:
- Keep exercises simple and accessible
- Focus on wellbeing and movement quality
- "Do what you can" is acceptable
- Use shorter rests and smoother flow
- Include alternatives when useful

Tone: relaxed, inviting, and practical.`
    case 'fun':
      return `## SESSION STYLE: JUST FOR FUN

Create a surprising and varied workout:
- Mix training formats creatively
- Include playful elements
- Use formats such as AMRAP, EMOM, Tabata, For Time, or Chipper
- Add small challenges when appropriate
- Keep instructions correct and safe

Tone: energetic and playful.`
    case 'structured':
    default:
      return `## SESSION STYLE: STRUCTURED

Create a science-based workout that follows training principles:
- Respect the athlete's current phase and training plan
- Use established methods where relevant
- Balance load with recovery
- Include a specific warm-up for the main work
- Prioritize quality over quantity
- Give clear guidance for tempo, rest, and execution

Tone: professional and encouraging.`
  }
}

function getEnglishWorkoutTypePrompt(workoutType: WODWorkoutType): string {
  switch (workoutType) {
    case 'cardio':
      return `## WORKOUT TYPE: CARDIO

Create a cardio workout focused on endurance and cardiovascular fitness:
- Include 3 sections: WARMUP -> MAIN -> COOLDOWN, with no separate Core section
- Use intervals, steady state, or zone-based work
- Specify duration, distance, pace, watts, or heart-rate zones where relevant
- Vary intensity across the session
- Adapt to available equipment`
    case 'mixed':
      return `## WORKOUT TYPE: MIXED

Create a functional mixed workout combining strength and cardio:
- Include all 4 sections: WARMUP -> MAIN -> CORE -> COOLDOWN
- Use formats such as AMRAP, EMOM, For Time, Tabata, or Chipper
- Combine strength exercises with cardio bursts
- Make time formats explicit
- Use functional movements with broad transfer`
    case 'core':
      return `## WORKOUT TYPE: CORE

Create a core-focused workout for trunk stability:
- Include 3 sections: WARMUP -> MAIN -> COOLDOWN, with no separate Core section
- Keep the MAIN section core-focused
- Mix anti-rotation, anti-extension, anti-flexion, carries, and stability work
- Adapt holds and reps to the athlete's level`
    case 'strength':
    default:
      return `## WORKOUT TYPE: STRENGTH

Create a strength workout focused on muscle development and power:
- Structure with sets, reps, and rest periods
- Include all 4 sections: WARMUP -> MAIN -> CORE -> COOLDOWN
- Progress load based on athlete level
- Use weights such as "Bodyweight", "Light", "Moderate", "Heavy", or "% of 1RM"
- Give clear tempo guidance when useful
- Focus on compound movements in the main section`
  }
}

function getEnglishSportContext(sport: string): string {
  const contexts: Record<string, string> = {
    RUNNING: `## SPORT-SPECIFIC CONTEXT: RUNNING
- Emphasize running-specific strength: posterior chain, trunk stability, and single-leg control
- Include running drills or plyometrics in the warm-up when appropriate
- Avoid unnecessary lower-limb overload
- Prioritize single-leg strength and elasticity`,
    CYCLING: `## SPORT-SPECIFIC CONTEXT: CYCLING
- Emphasize quadriceps, hip flexors, and trunk stiffness for power transfer
- Include hip and lower-back mobility when useful
- Avoid excessive upper-body fatigue unless requested`,
    SWIMMING: `## SPORT-SPECIFIC CONTEXT: SWIMMING
- Emphasize shoulder stability, scapular control, and trunk rotation
- Include shoulder and thoracic mobility
- Target lats and posterior chain support`,
    TRIATHLON: `## SPORT-SPECIFIC CONTEXT: TRIATHLON
- Balance the three disciplines
- Include transition-relevant conditioning when useful
- Avoid overloading a single muscle group`,
    HYROX: `## SPORT-SPECIFIC CONTEXT: HYROX
- Emphasize functional fitness and endurance
- Include station-specific work when equipment allows
- Manage grip strength, transitions, and work capacity`,
    SKIING: `## SPORT-SPECIFIC CONTEXT: SKIING
- Emphasize balance, coordination, pole-specific upper-body strength, trunk rotation, and leg endurance`,
    GENERAL_FITNESS: `## SPORT-SPECIFIC CONTEXT: GENERAL FITNESS
- Build balanced strength, mobility, conditioning, and health-oriented movement`,
  }

  return contexts[sport] || contexts.GENERAL_FITNESS
}

function generateEnglishGuardrailConstraints(guardrails: WODGuardrailResult): string {
  const constraints = [`INTENSITY: ${getIntensityDescriptionEn(guardrails.adjustedIntensity)}`]

  if (guardrails.excludedAreas.length > 0) {
    constraints.push(`AVOID COMPLETELY: Exercises loading ${guardrails.excludedAreas.join(', ')}`)
  }

  if (guardrails.restrictionConstraints) {
    constraints.push(`Physio restrictions: ${guardrails.restrictionConstraints}`)
  }

  return constraints.join('\n')
}

function getIntensityDescriptionEn(intensity: AdjustedIntensity): string {
  switch (intensity) {
    case 'recovery':
      return 'Only light movement and mobility. No strain. Focus on recovery.'
    case 'easy':
      return 'Easy intensity. The athlete should be able to talk comfortably. Max 60% HRmax.'
    case 'moderate':
      return 'Moderate intensity. The athlete can talk in short sentences. 60-75% HRmax.'
    case 'threshold':
      return 'Higher intensity allowed if appropriate. Intervals may be included. 75-90% HRmax.'
  }
}

function getJsonTemplateEn(workoutType: WODWorkoutType): string {
  const includeCore = workoutType === 'strength' || workoutType === 'mixed'
  const coreSection = includeCore
    ? `,
    {
      "type": "CORE",
      "name": "Core",
      "duration": 5,
      "exercises": []
    }`
    : ''

  return `{
  "title": "Inspiring English workout title",
  "subtitle": "Short motivational subtitle",
  "description": "2-3 sentences explaining what the workout targets and why it fits the athlete today",
  "sections": [
    {
      "type": "WARMUP",
      "name": "Warm-up",
      "duration": 8,
      "exercises": [
        {
          "name": "Exercise Name",
          "nameSv": "Övningsnamn på svenska",
          "sets": 2,
          "reps": "10 each",
          "instructions": "Clear instructions in English"
        }
      ],
      "notes": "Optional section-specific note in English"
    },
    {
      "type": "MAIN",
      "name": "Main set",
      "duration": 30,
      "exercises": [
        {
          "name": "Exercise Name",
          "nameSv": "Övningsnamn på svenska",
          "sets": 3,
          "reps": "12",
          "weight": "Moderate",
          "restSeconds": 60,
          "instructions": "Clear instructions in English"
        }
      ]
    }${coreSection},
    {
      "type": "COOLDOWN",
      "name": "Cooldown",
      "duration": 7,
      "exercises": []
    }
  ],
  "coachNotes": "AI-generated explanation in English of why this workout was selected for the athlete today"
}`
}

// ============================================
// SYSTEM CONTEXT
// ============================================

const SYSTEM_CONTEXT = `${buildConstitutionPreamble('wod')}Du är en erfaren personlig tränare och fysiolog som skapar individuellt anpassade träningspass.

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
// WORKOUT TYPE-SPECIFIC PROMPTS
// ============================================

function getWorkoutTypePrompt(workoutType: WODWorkoutType): string {
  switch (workoutType) {
    case 'strength':
      return STRENGTH_TYPE_PROMPT
    case 'cardio':
      return CARDIO_TYPE_PROMPT
    case 'mixed':
      return MIXED_TYPE_PROMPT
    case 'core':
      return CORE_TYPE_PROMPT
    default:
      return STRENGTH_TYPE_PROMPT
  }
}

const STRENGTH_TYPE_PROMPT = `## TRÄNINGSTYP: STYRKA

Du skapar ett STYRKEPASS med fokus på muskeluppbyggnad och kraft:

- Strukturera med sets, reps och viloperioder
- Inkludera alla 4 sektioner: WARMUP → MAIN → CORE → COOLDOWN
- Progressiv belastning baserat på atletens nivå
- Ange vikt som "Kroppsvikt", "Lätt", "Måttlig", "Tung" eller "% av 1RM"
- Ge tydliga tempoangavelser (t.ex. "3-1-1")
- Fokusera på kompoundövningar i huvuddelen`

const CARDIO_TYPE_PROMPT = `## TRÄNINGSTYP: KONDITION

Du skapar ett KONDITIONSPASS med fokus på uthållighet och kardiovaskulär fitness:

- Inkludera 3 sektioner: WARMUP → MAIN → COOLDOWN (INGEN Core-sektion)
- Använd intervaller, steady-state eller zonbaserad träning
- Ange duration, distans och/eller puls-zoner för varje övning
- Variera intensitet genom passet (t.ex. pyramidintervaller, fartlek)
- Anpassa till tillgänglig utrustning (löpband, cykel, rodd, etc.)
- Inkludera pace/watt-rekommendationer baserat på atletens nivå`

const MIXED_TYPE_PROMPT = `## TRÄNINGSTYP: MIXAT (CrossFit/HYROX-stil)

Du skapar ett FUNKTIONELLT MIXAT PASS som kombinerar styrka och kondition:

- Inkludera alla 4 sektioner: WARMUP → MAIN → CORE → COOLDOWN
- Använd CrossFit/HYROX-format: AMRAP, EMOM, For Time, Tabata, eller Chipper
- Kombinera styrkeövningar med kardiobursts
- Ange tidsformat tydligt (t.ex. "AMRAP 12 min", "EMOM x 8")
- Funktionella rörelser som har bred överföring
- Inkludera stationsövergångar och vila strategiskt`

const CORE_TYPE_PROMPT = `## TRÄNINGSTYP: CORE

Du skapar ett CORE-FOKUSERAT PASS med fokus på bålstabilitet:

- Inkludera 3 sektioner: WARMUP → MAIN → COOLDOWN (INGEN separat Core-sektion)
- Hela MAIN-sektionen är core-fokuserad
- Blanda anti-rotation, anti-extension, anti-flexion övningar
- Inkludera stabilitet, balans och funktionella core-rörelser
- Variation: plank-varianter, pallof press, dead bugs, carries, etc.
- Anpassa duration (holds) och reps efter atletens nivå`

// ============================================
// WORKOUT TYPE-SPECIFIC JSON TEMPLATES
// ============================================

function getJsonTemplate(workoutType: WODWorkoutType): string {
  switch (workoutType) {
    case 'cardio':
    case 'core':
      return JSON_THREE_SECTION_TEMPLATE
    case 'strength':
    case 'mixed':
    default:
      return JSON_OUTPUT_TEMPLATE
  }
}

const JSON_THREE_SECTION_TEMPLATE = `{
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
      "duration": 30,
      "exercises": [
        {
          "name": "Exercise Name",
          "nameSv": "Övningsnamn på Svenska",
          "sets": 3,
          "reps": "12",
          "instructions": "Tydliga instruktioner"
        }
      ]
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

function translateSportEn(sport: string): string {
  const translations: Record<string, string> = {
    RUNNING: 'Running',
    CYCLING: 'Cycling',
    SWIMMING: 'Swimming',
    TRIATHLON: 'Triathlon',
    HYROX: 'HYROX',
    SKIING: 'Skiing',
    GENERAL_FITNESS: 'General fitness',
  }
  return translations[sport] || sport
}

function translateExperienceEn(level: string): string {
  const translations: Record<string, string> = {
    BEGINNER: 'Beginner',
    RECREATIONAL: 'Recreational',
    ADVANCED: 'Advanced',
    ELITE: 'Elite',
  }
  return translations[level] || level
}

function getWorkoutTypeLabelEn(type: WODWorkoutType): string {
  const labels: Record<WODWorkoutType, string> = {
    strength: 'Strength',
    cardio: 'Cardio',
    mixed: 'Mixed',
    core: 'Core',
  }
  return labels[type]
}

function getFocusAreaLabelEn(focusArea: WODFocusArea): string {
  const labels: Record<WODFocusArea, string> = {
    upper_body: 'Upper body',
    lower_body: 'Lower body',
    full_body: 'Full body',
    cardio: 'Cardio',
    recovery: 'Recovery',
    sport_specific: 'Sport-specific',
  }
  return labels[focusArea]
}

function getIntensityLabelEn(intensity: AdjustedIntensity): string {
  const labels: Record<AdjustedIntensity, string> = {
    recovery: 'Recovery',
    easy: 'Easy',
    moderate: 'Moderate',
    threshold: 'Threshold',
  }
  return labels[intensity]
}

function formatRecentWorkoutsEn(
  workouts: WODAthleteContext['recentWorkouts']
): string {
  if (workouts.length === 0) {
    return '- No logged workouts in the last 4 days'
  }

  return workouts
    .slice(0, 5)
    .map(w => {
      const date = new Date(w.date).toLocaleDateString('en-US', { weekday: 'short' })
      const muscles = w.muscleGroups?.length ? ` (${w.muscleGroups.slice(0, 2).join(', ')})` : ''
      const name = w.name ? ` ${w.name}` : ''
      const source = w.source ? ` [${translateWorkoutSourceEn(w.source)}]` : ''
      return `- ${date}:${source} ${translateWorkoutTypeEn(w.type)}${name} - ${translateIntensityEn(w.intensity)}${muscles}`
    })
    .join('\n')
}

function translateWorkoutTypeEn(type: string): string {
  const translations: Record<string, string> = {
    RUNNING: 'Running',
    STRENGTH: 'Strength',
    CYCLING: 'Cycling',
    SWIMMING: 'Swimming',
    PLYOMETRIC: 'Plyometrics',
    CORE: 'Core',
    RECOVERY: 'Recovery',
    FLEXIBILITY: 'Mobility',
  }
  return translations[type] || type
}

function translateIntensityEn(intensity: string): string {
  const translations: Record<string, string> = {
    RECOVERY: 'Recovery',
    EASY: 'Easy',
    MODERATE: 'Moderate',
    THRESHOLD: 'Threshold',
    INTERVAL: 'Interval',
    MAX: 'Max',
  }
  return translations[intensity] || intensity
}

function translateWorkoutSourceEn(source: 'program' | 'adhoc' | 'wod'): string {
  if (source === 'adhoc') return 'ad hoc'
  if (source === 'wod') return 'AI workout'
  return 'program'
}

function formatEquipmentEn(equipment: WODEquipment[]): string {
  const labels: Record<WODEquipment, string> = {
    none: 'No equipment, bodyweight only',
    dumbbells: 'Dumbbells',
    barbell: 'Barbell',
    kettlebell: 'Kettlebell',
    resistance_band: 'Resistance band',
    pull_up_bar: 'Pull-up bar',
    treadmill: 'Treadmill',
    bike: 'Bike',
    rower: 'Rower',
    skierg: 'SkiErg',
    airbike: 'Airbike',
    crosstrainer: 'Crosstrainer',
    step_machine: 'Stair machine',
    jump_rope: 'Jump rope',
    wall_ball: 'Wall ball',
    box: 'Plyo box',
    sled: 'Sled',
    sandbag: 'Sandbag',
    medicine_ball: 'Medicine ball',
    stability_ball: 'Stability ball',
    cable_machine: 'Cable machine',
    ez_curl_bar: 'EZ curl bar',
    rings: 'Rings',
  }

  if (equipment.length === 0 || (equipment.length === 1 && equipment[0] === 'none')) {
    return labels.none
  }

  return equipment
    .filter(e => e !== 'none')
    .map(e => labels[e] || e)
    .join(', ')
}

function buildEquipmentConstraintSectionEn(equipment: WODEquipment[]): string {
  if (equipment.length === 1 && equipment[0] === 'none') {
    return `## EQUIPMENT RESTRICTION
IMPORTANT: Create a workout that uses only bodyweight and open floor space. Do not use machines, weights, or other equipment.`
  }

  return `## EQUIPMENT RESTRICTION
IMPORTANT: This workout MUST be built only with the following equipment: ${formatEquipmentEn(equipment)}.
The athlete may also use bodyweight, but must NOT use any equipment outside the list above even if more equipment exists at the gym.`
}

function formatLocationEquipmentEn(
  locationEquipment: WODAthleteContext['locationEquipment'],
  requestedEquipment: WODEquipment[]
): string {
  if (!locationEquipment || locationEquipment.equipment.length === 0) {
    return ''
  }

  const equipmentFilter = new Set(normalizeRequestedEquipment(requestedEquipment))
  const filteredEquipment =
    equipmentFilter.has('none')
      ? []
      : locationEquipment.equipment.filter((item) => {
          const mapped = mapLocationEquipmentToWOD(item.nameSv || item.name)
          return mapped ? equipmentFilter.has(mapped) : false
        })

  const equipmentToRender = filteredEquipment.length > 0 ? filteredEquipment : locationEquipment.equipment
  const byCategory: Record<string, string[]> = {}
  for (const item of equipmentToRender) {
    const category = translateEquipmentCategoryEn(item.category)
    if (!byCategory[category]) {
      byCategory[category] = []
    }
    const qty = item.quantity > 1 ? ` (${item.quantity})` : ''
    byCategory[category].push(`${item.name}${qty}`)
  }

  const categoryLines = Object.entries(byCategory)
    .map(([cat, items]) => `- **${cat}**: ${items.join(', ')}`)
    .join('\n')

  return `## AVAILABLE MATCHING EQUIPMENT AT ${locationEquipment.locationName.toUpperCase()}
Use only equipment that is both available at the location and allowed in the session specification above.

${categoryLines}

Use this equipment to create an effective session within the selected constraints.`
}

function translateEquipmentCategoryEn(category: string): string {
  const translations: Record<string, string> = {
    CARDIO_MACHINE: 'Cardio machines',
    STRENGTH_MACHINE: 'Strength machines',
    FREE_WEIGHTS: 'Free weights',
    RACKS: 'Racks and stations',
    TESTING: 'Testing equipment',
    ACCESSORIES: 'Accessories',
    RECOVERY: 'Recovery',
  }
  return translations[category] || category
}

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
  workouts: WODAthleteContext['recentWorkouts'],
  locale: 'en' | 'sv' = 'en'
): string {
  if (workouts.length === 0) {
    return '- Inga loggade pass de senaste 4 dagarna'
  }

  return workouts
    .slice(0, 5)
    .map(w => {
      const date = new Date(w.date).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US', { weekday: 'short' })
      const muscles = w.muscleGroups?.length ? ` (${w.muscleGroups.slice(0, 2).join(', ')})` : ''
      const name = w.name ? ` ${w.name}` : ''
      const source = w.source ? ` [${translateWorkoutSource(w.source)}]` : ''
      return `- ${date}:${source} ${translateWorkoutType(w.type)}${name} - ${translateIntensity(w.intensity)}${muscles}`
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

function normalizeRequestedEquipment(equipment: WODEquipment[]): WODEquipment[] {
  const withoutNone = equipment.filter(e => e !== 'none')
  return withoutNone.length > 0 ? withoutNone : ['none']
}

function buildEquipmentConstraintSection(equipment: WODEquipment[]): string {
  if (equipment.length === 1 && equipment[0] === 'none') {
    return `## UTRUSTNINGSRESTRIKTION
VIKTIGT: Skapa ett pass som endast använder kroppsvikt och fri golvyta. Använd inte maskiner, vikter eller annan utrustning.`
  }

  return `## UTRUSTNINGSRESTRIKTION
VIKTIGT: Detta pass MÅSTE byggas enbart med följande utrustning: ${formatEquipment(equipment)}.
Du får dessutom använda kroppsvikt, men du får INTE använda någon annan utrustning än listan ovan även om gymmet har mer tillgängligt.`
}

/**
 * Format location equipment for the prompt
 * Shows what's available at the athlete's gym
 */
function formatLocationEquipment(
  locationEquipment: WODAthleteContext['locationEquipment'],
  requestedEquipment: WODEquipment[]
): string {
  if (!locationEquipment || locationEquipment.equipment.length === 0) {
    return ''
  }

  const equipmentFilter = new Set(normalizeRequestedEquipment(requestedEquipment))
  const filteredEquipment =
    equipmentFilter.has('none')
      ? []
      : locationEquipment.equipment.filter((item) => {
          const mapped = mapLocationEquipmentToWOD(item.nameSv || item.name)
          return mapped ? equipmentFilter.has(mapped) : false
        })

  const equipmentToRender = filteredEquipment.length > 0 ? filteredEquipment : locationEquipment.equipment

  // Group equipment by category for cleaner output
  const byCategory: Record<string, string[]> = {}
  for (const item of equipmentToRender) {
    const category = translateEquipmentCategory(item.category)
    if (!byCategory[category]) {
      byCategory[category] = []
    }
    const name = item.nameSv || item.name
    const qty = item.quantity > 1 ? ` (${item.quantity}st)` : ''
    byCategory[category].push(`${name}${qty}`)
  }

  const categoryLines = Object.entries(byCategory)
    .map(([cat, items]) => `- **${cat}**: ${items.join(', ')}`)
    .join('\n')

  return `## TILLGÄNGLIG MATCHANDE UTRUSTNING PÅ ${locationEquipment.locationName.toUpperCase()}
Använd endast utrustning som både finns på platsen och är tillåten i passpecifikationen ovan.

${categoryLines}

Använd denna utrustning för att skapa ett effektivt pass inom de valda ramarna.`
}

/**
 * Translate equipment category to Swedish
 */
function translateEquipmentCategory(category: string): string {
  const translations: Record<string, string> = {
    CARDIO_MACHINE: 'Konditionsmaskiner',
    STRENGTH_MACHINE: 'Styrkebyggare',
    FREE_WEIGHTS: 'Fria vikter',
    RACKS: 'Rack & stationer',
    TESTING: 'Testutrstning',
    ACCESSORIES: 'Tillbehör',
    RECOVERY: 'Återhämtning',
  }
  return translations[category] || category
}

function mapLocationEquipmentToWOD(name: string): WODEquipment | null {
  const lowered = name.toLowerCase()

  if (lowered.includes('treadmill') || lowered.includes('löpband')) return 'treadmill'
  if (lowered.includes('assault bike') || lowered.includes('air bike') || lowered.includes('airbike')) return 'airbike'
  if (lowered.includes('bikeerg') || lowered === 'bike' || lowered.includes('cykel')) return 'bike'
  if (lowered.includes('skierg') || lowered.includes('ski erg')) return 'skierg'
  if (lowered.includes('rower') || lowered.includes('rodd')) return 'rower'
  if (lowered.includes('dumbbell') || lowered.includes('hantel')) return 'dumbbells'
  if (lowered.includes('barbell') || lowered.includes('skivstång')) return 'barbell'
  if (lowered.includes('kettlebell')) return 'kettlebell'
  if (lowered.includes('band') || lowered.includes('gummi')) return 'resistance_band'
  if (lowered.includes('pull-up') || lowered.includes('räcke')) return 'pull_up_bar'
  if (lowered.includes('cable')) return 'cable_machine'
  if (lowered.includes('rings')) return 'rings'
  if (lowered.includes('box')) return 'box'
  if (lowered.includes('sled')) return 'sled'
  if (lowered.includes('sandbag')) return 'sandbag'
  if (lowered.includes('wall ball')) return 'wall_ball'
  if (lowered.includes('jump rope') || lowered.includes('hopprep')) return 'jump_rope'
  if (lowered.includes('medicine ball')) return 'medicine_ball'
  if (lowered.includes('stability ball') || lowered.includes('pilatesboll')) return 'stability_ball'

  return null
}

function translateWorkoutSource(source: 'program' | 'adhoc' | 'wod'): string {
  if (source === 'adhoc') return 'ad-hoc'
  if (source === 'wod') return 'ai-pass'
  return 'program'
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
