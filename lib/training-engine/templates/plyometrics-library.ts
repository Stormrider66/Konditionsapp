/**
 * Plyometric Exercise Library
 *
 * A comprehensive collection of plyometric exercises and protocols organized
 * by intensity level (LOW, MODERATE, HIGH) with progression paths.
 *
 * Ground contact guidelines:
 * - LOW intensity: >250ms ground contact (pogo hops, squat jumps)
 * - MODERATE intensity: 150-250ms (countermovement jumps, bounds)
 * - HIGH intensity: <150ms (depth jumps, reactive hops, max 27 contacts per session)
 *
 * Protocols provide structured session templates for each athlete level,
 * respecting total contact limits and recovery requirements.
 */

import type { PlyometricIntensity } from '@prisma/client'

/**
 * A single plyometric exercise definition with coaching cues and progression info.
 */
export interface PlyometricExerciseTemplate {
  /** Unique identifier for this exercise */
  id: string
  /** English name */
  name: string
  /** Swedish name */
  nameSv: string
  /** Intensity classification (LOW / MODERATE / HIGH) */
  intensity: PlyometricIntensity
  /** Number of ground contacts per repetition */
  contactsPerRep: number
  /** Whether the exercise is performed on one leg at a time */
  isUnilateral: boolean
  /** English description of the exercise */
  description: string
  /** Swedish description of the exercise */
  descriptionSv: string
  /** ID of a less demanding exercise to progress from (optional) */
  progressionFrom?: string
  /** Equipment needed for this exercise */
  equipmentRequired: string[]
  /** Coaching cues in English */
  cues: string[]
  /** Coaching cues in Swedish */
  cuesSv: string[]
}

/**
 * A structured plyometric session protocol for a given athlete level.
 */
export interface PlyometricProtocolTemplate {
  /** Unique identifier for this protocol */
  id: string
  /** English name */
  name: string
  /** Swedish name */
  nameSv: string
  /** Athlete level this protocol is designed for */
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE'
  /** Exercises included in this protocol with prescribed volume */
  exercises: { exerciseId: string; sets: number; reps: number }[]
  /** Target total ground contacts for the session */
  targetContacts: number
  /** English description of the protocol */
  description: string
  /** Swedish description of the protocol */
  descriptionSv: string
}

// =============================================================================
// PLYOMETRIC EXERCISES
// =============================================================================

/**
 * Plyometric exercise library organized by intensity level.
 */
export const PLYOMETRIC_EXERCISES: PlyometricExerciseTemplate[] = [
  // ──────────────────────────────────────────────
  // LOW INTENSITY (>250ms ground contact)
  // ──────────────────────────────────────────────
  {
    id: 'plyo-pogo-hops',
    name: 'Pogo Hops',
    nameSv: 'Pogohopp',
    intensity: 'LOW',
    contactsPerRep: 1,
    isUnilateral: false,
    description:
      'Rapid small hops with stiff ankles, minimizing ground contact time while staying low. Develops ankle stiffness and elastic energy return.',
    descriptionSv:
      'Snabba små hopp med styva anklar, minimerar markkontakttid och håller sig låg. Utvecklar ankelstyvhet och elastisk energiåtervinning.',
    equipmentRequired: [],
    cues: [
      'Keep ankles locked and stiff',
      'Minimize ground contact time',
      'Stay tall through hips',
      'Use arms for rhythm',
    ],
    cuesSv: [
      'Håll anklarna låsta och styva',
      'Minimera markkontakttid',
      'Stå rak i höfterna',
      'Använd armarna för rytm',
    ],
  },
  {
    id: 'plyo-squat-jump',
    name: 'Squat Jump',
    nameSv: 'Knäböjshopp',
    intensity: 'LOW',
    contactsPerRep: 1,
    isUnilateral: false,
    description:
      'Jump from a static half-squat position without countermovement. Develops concentric power production from a dead stop.',
    descriptionSv:
      'Hopp från statisk halvknäböj utan motrörelse. Utvecklar koncentrisk kraftproduktion från stillastående.',
    equipmentRequired: [],
    cues: [
      'Hold the bottom position for 2 seconds before jumping',
      'Drive through the full foot',
      'Extend hips, knees, and ankles fully',
      'Land softly and reset',
    ],
    cuesSv: [
      'Håll bottenpositionen 2 sekunder före hopp',
      'Driv genom hela foten',
      'Sträck ut höfter, knän och anklar fullt',
      'Landa mjukt och återställ',
    ],
  },
  {
    id: 'plyo-ankle-hops',
    name: 'Ankle Hops (Double Leg)',
    nameSv: 'Ankelhopp (dubbla ben)',
    intensity: 'LOW',
    contactsPerRep: 1,
    isUnilateral: false,
    description:
      'Continuous small hops using only ankle plantar flexion. Knees remain nearly straight. Builds calf-achilles elastic stiffness.',
    descriptionSv:
      'Kontinuerliga små hopp med bara ankelns plantarflexion. Knäna förblir nästan raka. Bygger vad-hälsenas elastiska styvhet.',
    equipmentRequired: [],
    cues: [
      'Keep knees almost straight',
      'Push off from toes only',
      'Quick ground contact',
      'Think "hot coals" under feet',
    ],
    cuesSv: [
      'Håll knäna nästan raka',
      'Tryck ifrån bara med tårna',
      'Snabb markkontakt',
      'Tänk "glödande kol" under fötterna',
    ],
  },
  {
    id: 'plyo-box-step-off-land',
    name: 'Box Step-Off and Stick',
    nameSv: 'Steg av låda och håll',
    intensity: 'LOW',
    contactsPerRep: 1,
    isUnilateral: false,
    description:
      'Step off a low box (20-30cm) and absorb the landing in a quarter squat. Teaches proper landing mechanics before progressing to depth jumps.',
    descriptionSv:
      'Steg av en låg låda (20-30cm) och absorbera landningen i en kvarts knäböj. Lär ut korrekt landningsteknik inför progression till djuphopp.',
    progressionFrom: undefined,
    equipmentRequired: ['Plyo-låda (20-30cm)'],
    cues: [
      'Step off, do not jump off',
      'Land with both feet simultaneously',
      'Absorb through hips and knees',
      'Freeze the landing for 2 seconds',
    ],
    cuesSv: [
      'Steg av, hoppa inte av',
      'Landa med båda fötterna samtidigt',
      'Absorbera genom höfter och knän',
      'Frys landningen i 2 sekunder',
    ],
  },
  {
    id: 'plyo-lateral-line-hops',
    name: 'Lateral Line Hops',
    nameSv: 'Sidohopp över linje',
    intensity: 'LOW',
    contactsPerRep: 1,
    isUnilateral: false,
    description:
      'Quick side-to-side hops over a line on the ground. Develops lateral ankle stability and frontal plane reactive ability.',
    descriptionSv:
      'Snabba sidohopp över en linje på golvet. Utvecklar lateral ankelstabilitet och reaktiv förmåga i frontalplanet.',
    equipmentRequired: [],
    cues: [
      'Stay light on the feet',
      'Keep hips level',
      'Minimize lateral drift',
      'Land softly on balls of feet',
    ],
    cuesSv: [
      'Var lätt på fötterna',
      'Håll höfterna i nivå',
      'Minimera sidoförskjutning',
      'Landa mjukt på framfötterna',
    ],
  },

  // ──────────────────────────────────────────────
  // MODERATE INTENSITY (150-250ms ground contact)
  // ──────────────────────────────────────────────
  {
    id: 'plyo-cmj',
    name: 'Countermovement Jump',
    nameSv: 'Motrörelsehopp',
    intensity: 'MODERATE',
    contactsPerRep: 1,
    isUnilateral: false,
    description:
      'Rapid dip and jump for maximum height. Uses the stretch-shortening cycle for greater power output than squat jumps.',
    descriptionSv:
      'Snabb nedsjunk och hopp för maximal höjd. Använder stretch-shortening-cykeln för större kraftutveckling än knäböjshopp.',
    progressionFrom: 'plyo-squat-jump',
    equipmentRequired: [],
    cues: [
      'Quick dip, explosive jump',
      'Swing arms aggressively upward',
      'Full triple extension at takeoff',
      'Land in the same spot you took off',
    ],
    cuesSv: [
      'Snabb nedsjunk, explosivt hopp',
      'Svinga armarna aggressivt uppåt',
      'Full trippelextension vid avfärd',
      'Landa på samma plats du hoppade från',
    ],
  },
  {
    id: 'plyo-broad-jump',
    name: 'Standing Broad Jump',
    nameSv: 'Stående längdhopp',
    intensity: 'MODERATE',
    contactsPerRep: 1,
    isUnilateral: false,
    description:
      'Maximum-distance horizontal jump from standstill. Develops horizontal force production crucial for sprinting and running acceleration.',
    descriptionSv:
      'Maximalt horisontellt hopp från stillastående. Utvecklar horisontell kraftproduktion avgörande för sprint och löpacceleration.',
    progressionFrom: 'plyo-cmj',
    equipmentRequired: [],
    cues: [
      'Swing arms back then forward aggressively',
      'Push at 45-degree angle',
      'Drive knees forward during flight',
      'Land with both feet, absorb through hips',
    ],
    cuesSv: [
      'Svinga armarna bakåt sedan framåt aggressivt',
      'Tryck i 45 graders vinkel',
      'Driv knäna framåt under flygfasen',
      'Landa med båda fötterna, absorbera genom höfterna',
    ],
  },
  {
    id: 'plyo-alternating-bounds',
    name: 'Alternating Bounds',
    nameSv: 'Alternerande språnghopp',
    intensity: 'MODERATE',
    contactsPerRep: 1,
    isUnilateral: true,
    description:
      'Exaggerated running strides with maximal flight time. Each bound is a single-leg takeoff and opposite-leg landing, building running-specific power.',
    descriptionSv:
      'Överdrivna löpsteg med maximal flygtid. Varje språng är ett enbensavstamp och landning på motsatt ben, bygger löpspecifik kraft.',
    progressionFrom: 'plyo-broad-jump',
    equipmentRequired: [],
    cues: [
      'Drive knee high on takeoff',
      'Maximize flight distance',
      'Land actively, pulling foot back',
      'Maintain upright posture',
    ],
    cuesSv: [
      'Driv knäet högt vid avstamp',
      'Maximera flygdistans',
      'Landa aktivt, dra foten bakåt',
      'Behåll upprätt hållning',
    ],
  },
  {
    id: 'plyo-box-jump',
    name: 'Box Jump',
    nameSv: 'Lådhopp',
    intensity: 'MODERATE',
    contactsPerRep: 1,
    isUnilateral: false,
    description:
      'Jump onto a box from standing. Reduces landing impact compared to ground jumps, making it a good moderate-intensity option for building explosive hip extension.',
    descriptionSv:
      'Hopp upp på en låda från stående. Minskar landningsimpakten jämfört med markhopp, vilket gör det till ett bra medelintensivt alternativ för att bygga explosiv höftextension.',
    progressionFrom: 'plyo-cmj',
    equipmentRequired: ['Plyo-låda'],
    cues: [
      'Arms back, then drive up',
      'Land softly on top of box',
      'Stand fully upright at top',
      'Step down, do not jump down',
    ],
    cuesSv: [
      'Armarna bakåt, sedan driv uppåt',
      'Landa mjukt på lådan',
      'Stå helt upprätt i toppen',
      'Kliv ner, hoppa inte ner',
    ],
  },
  {
    id: 'plyo-single-leg-hop',
    name: 'Single Leg Hop (Continuous)',
    nameSv: 'Enbenshopp (kontinuerliga)',
    intensity: 'MODERATE',
    contactsPerRep: 1,
    isUnilateral: true,
    description:
      'Continuous forward hops on one leg. Develops single-leg reactive strength and running-specific elastic energy use.',
    descriptionSv:
      'Kontinuerliga framåthopp på ett ben. Utvecklar enbens reaktiv styrka och löpspecifik elastisk energianvändning.',
    progressionFrom: 'plyo-pogo-hops',
    equipmentRequired: [],
    cues: [
      'Stay tall, do not collapse at hip',
      'Quick ground contact',
      'Drive knee forward on each hop',
      'Keep ankle stiff at contact',
    ],
    cuesSv: [
      'Stå rak, sjunk inte i höften',
      'Snabb markkontakt',
      'Driv knäet framåt vid varje hopp',
      'Håll ankeln styv vid kontakt',
    ],
  },

  // ──────────────────────────────────────────────
  // HIGH INTENSITY (<150ms ground contact)
  // ──────────────────────────────────────────────
  {
    id: 'plyo-depth-jump',
    name: 'Depth Jump',
    nameSv: 'Djuphopp',
    intensity: 'HIGH',
    contactsPerRep: 1,
    isUnilateral: false,
    description:
      'Step off a box (30-60cm) and immediately jump for max height upon landing. The gold standard for reactive strength development. Requires excellent landing mechanics.',
    descriptionSv:
      'Steg av en låda (30-60cm) och hoppa omedelbart för maximal höjd vid landning. Guldstandarden för reaktiv styrkeutveckling. Kräver utmärkt landningsteknik.',
    progressionFrom: 'plyo-box-step-off-land',
    equipmentRequired: ['Plyo-låda (30-60cm)'],
    cues: [
      'Step off, do not jump off the box',
      'Minimize ground contact time',
      'React instantly upon landing',
      'Think "hot surface" - get off the ground fast',
    ],
    cuesSv: [
      'Steg av, hoppa inte av lådan',
      'Minimera markkontakttid',
      'Reagera omedelbart vid landning',
      'Tänk "het yta" - lämna marken snabbt',
    ],
  },
  {
    id: 'plyo-depth-jump-to-broad',
    name: 'Depth Jump to Broad Jump',
    nameSv: 'Djuphopp till längdhopp',
    intensity: 'HIGH',
    contactsPerRep: 1,
    isUnilateral: false,
    description:
      'Step off a box and immediately broad jump for maximum distance. Combines vertical reactive loading with horizontal force production.',
    descriptionSv:
      'Steg av en låda och hoppa omedelbart framåt för maximal distans. Kombinerar vertikal reaktiv belastning med horisontell kraftproduktion.',
    progressionFrom: 'plyo-depth-jump',
    equipmentRequired: ['Plyo-låda (30-50cm)'],
    cues: [
      'Land and redirect force forward',
      'Aggressive arm swing forward',
      'Minimize ground contact, maximize distance',
      'Land under control',
    ],
    cuesSv: [
      'Landa och omdirigera kraften framåt',
      'Aggressiv armsving framåt',
      'Minimera markkontakt, maximera distans',
      'Landa under kontroll',
    ],
  },
  {
    id: 'plyo-single-leg-depth-hop',
    name: 'Single Leg Depth Hop',
    nameSv: 'Enbens djuphopp',
    intensity: 'HIGH',
    contactsPerRep: 1,
    isUnilateral: true,
    description:
      'Step off a low box (20-30cm) onto one leg and hop for height. Extremely demanding on the ankle-knee complex. Only for well-trained athletes.',
    descriptionSv:
      'Steg av en låg låda (20-30cm) på ett ben och hoppa för höjd. Extremt krävande för ankel-knäkomplexet. Bara för vältränade idrottare.',
    progressionFrom: 'plyo-depth-jump',
    equipmentRequired: ['Plyo-låda (20-30cm)'],
    cues: [
      'Use a LOW box only (20-30cm)',
      'Land and react on the same leg',
      'Maintain hip and knee alignment',
      'Stop immediately if any joint pain',
    ],
    cuesSv: [
      'Använd BARA en LÅG låda (20-30cm)',
      'Landa och reagera på samma ben',
      'Behåll höft- och knälinjering',
      'Sluta omedelbart vid ledsmärta',
    ],
  },
  {
    id: 'plyo-hurdle-hops',
    name: 'Hurdle Hops (Continuous)',
    nameSv: 'Häckhopp (kontinuerliga)',
    intensity: 'HIGH',
    contactsPerRep: 1,
    isUnilateral: false,
    description:
      'Continuous maximal jumps over mini-hurdles (30-45cm). Each landing transitions immediately into the next takeoff with minimal ground contact.',
    descriptionSv:
      'Kontinuerliga maximala hopp över minihäckar (30-45cm). Varje landning övergår omedelbart till nästa avstamp med minimal markkontakt.',
    progressionFrom: 'plyo-cmj',
    equipmentRequired: ['Minihäckar (30-45cm)'],
    cues: [
      'Spend as little time on the ground as possible',
      'Keep hips high between hurdles',
      'Drive arms up aggressively each jump',
      'Land and take off from the same spot',
    ],
    cuesSv: [
      'Spendera så lite tid som möjligt på marken',
      'Håll höfterna högt mellan häckarna',
      'Driv armarna uppåt aggressivt vid varje hopp',
      'Landa och lyft från samma position',
    ],
  },
]

// =============================================================================
// PLYOMETRIC PROTOCOLS
// =============================================================================

/**
 * Structured plyometric session protocols, one per athlete level.
 */
export const PLYOMETRIC_PROTOCOLS: PlyometricProtocolTemplate[] = [
  // ──────────────────────────────────────────────
  // BEGINNER PROTOCOL
  // ──────────────────────────────────────────────
  {
    id: 'plyo-protocol-beginner',
    name: 'Beginner Plyometric Introduction',
    nameSv: 'Nybörjare Plyometrisk Introduktion',
    level: 'BEGINNER',
    exercises: [
      { exerciseId: 'plyo-ankle-hops', sets: 2, reps: 10 },
      { exerciseId: 'plyo-pogo-hops', sets: 2, reps: 10 },
      { exerciseId: 'plyo-squat-jump', sets: 3, reps: 5 },
      { exerciseId: 'plyo-box-step-off-land', sets: 2, reps: 5 },
      { exerciseId: 'plyo-lateral-line-hops', sets: 2, reps: 8 },
    ],
    targetContacts: 81,
    description:
      'Low-intensity introduction to plyometric training. Focuses on ankle stiffness, proper landing mechanics, and basic jump technique. All exercises above 250ms ground contact. Perform 1-2 times per week with 48+ hours between sessions.',
    descriptionSv:
      'Lågintensiv introduktion till plyometrisk träning. Fokus på ankelstyvhet, korrekt landningsteknik och grundläggande hoppteknik. Alla övningar över 250ms markkontakt. Genomför 1-2 gånger per vecka med 48+ timmar mellan pass.',
  },

  // ──────────────────────────────────────────────
  // INTERMEDIATE PROTOCOL
  // ──────────────────────────────────────────────
  {
    id: 'plyo-protocol-intermediate',
    name: 'Intermediate Plyometric Development',
    nameSv: 'Medel Plyometrisk Utveckling',
    level: 'INTERMEDIATE',
    exercises: [
      { exerciseId: 'plyo-pogo-hops', sets: 2, reps: 10 },
      { exerciseId: 'plyo-cmj', sets: 3, reps: 5 },
      { exerciseId: 'plyo-box-jump', sets: 3, reps: 5 },
      { exerciseId: 'plyo-broad-jump', sets: 3, reps: 4 },
      { exerciseId: 'plyo-single-leg-hop', sets: 2, reps: 5 },
    ],
    targetContacts: 67,
    description:
      'Mixed low-to-moderate intensity plyometric session. Introduces countermovement and single-leg exercises. Builds upon beginner landing mechanics with reactive components. Perform 2 times per week with 48+ hours between sessions.',
    descriptionSv:
      'Blandat låg-till-medel intensivt plyometriskt pass. Introducerar motrörelse och enbensövningar. Bygger vidare på nybörjarens landningsteknik med reaktiva komponenter. Genomför 2 gånger per vecka med 48+ timmar mellan pass.',
  },

  // ──────────────────────────────────────────────
  // ADVANCED PROTOCOL
  // ──────────────────────────────────────────────
  {
    id: 'plyo-protocol-advanced',
    name: 'Advanced Plyometric Power',
    nameSv: 'Avancerad Plyometrisk Kraft',
    level: 'ADVANCED',
    exercises: [
      { exerciseId: 'plyo-pogo-hops', sets: 2, reps: 10 },
      { exerciseId: 'plyo-alternating-bounds', sets: 3, reps: 6 },
      { exerciseId: 'plyo-depth-jump', sets: 4, reps: 4 },
      { exerciseId: 'plyo-cmj', sets: 3, reps: 5 },
      { exerciseId: 'plyo-hurdle-hops', sets: 3, reps: 5 },
    ],
    targetContacts: 68,
    description:
      'High-intensity plyometric session featuring depth jumps and continuous hurdle hops. Demands excellent landing mechanics and reactive strength base. Keep high-intensity contacts under 27 per session. Perform 2 times per week with 72 hours between sessions.',
    descriptionSv:
      'Högintensivt plyometriskt pass med djuphopp och kontinuerliga häckhopp. Kräver utmärkt landningsteknik och reaktiv styrkegrund. Håll högintensiva kontakter under 27 per pass. Genomför 2 gånger per vecka med 72 timmar mellan pass.',
  },

  // ──────────────────────────────────────────────
  // ELITE PROTOCOL
  // ──────────────────────────────────────────────
  {
    id: 'plyo-protocol-elite',
    name: 'Elite Reactive Plyometrics',
    nameSv: 'Elit Reaktiv Plyometri',
    level: 'ELITE',
    exercises: [
      { exerciseId: 'plyo-ankle-hops', sets: 2, reps: 10 },
      { exerciseId: 'plyo-alternating-bounds', sets: 3, reps: 8 },
      { exerciseId: 'plyo-depth-jump', sets: 4, reps: 4 },
      { exerciseId: 'plyo-depth-jump-to-broad', sets: 3, reps: 3 },
      { exerciseId: 'plyo-single-leg-depth-hop', sets: 3, reps: 3 },
      { exerciseId: 'plyo-hurdle-hops', sets: 3, reps: 5 },
    ],
    targetContacts: 88,
    description:
      'Maximum-intensity plyometric session for elite athletes. Combines depth jumps, single-leg reactive work, and continuous high-intensity hops. Requires 2+ years of structured plyometric training. Monitor total high-intensity contacts carefully (max 27). Perform 2 times per week with 72+ hours between sessions. Reduce or skip during competition periods.',
    descriptionSv:
      'Maxintensivt plyometriskt pass för elitidrottare. Kombinerar djuphopp, enbens reaktivt arbete och kontinuerliga högintensiva hopp. Kräver 2+ års strukturerad plyometrisk träning. Övervaka totala högintensiva kontakter noggrant (max 27). Genomför 2 gånger per vecka med 72+ timmar mellan pass. Minska eller hoppa över under tävlingsperioder.',
  },
]

export default PLYOMETRIC_EXERCISES
