/**
 * HYROX Station Analysis Prompts
 *
 * Prompts for AI video analysis of HYROX stations.
 * Supports all 8 HYROX stations with station-specific technical cues.
 */

// HYROX station types
export type HyroxStationType =
  | 'SKIERG'
  | 'SLED_PUSH'
  | 'SLED_PULL'
  | 'BURPEE_BROAD_JUMP'
  | 'ROWING'
  | 'FARMERS_CARRY'
  | 'SANDBAG_LUNGE'
  | 'WALL_BALLS';

type AppLocale = 'en' | 'sv';

export const HYROX_STATION_LABELS: Record<HyroxStationType, string> = {
  SKIERG: 'SkiErg',
  SLED_PUSH: 'Sled Push',
  SLED_PULL: 'Sled Pull',
  BURPEE_BROAD_JUMP: 'Burpee Broad Jump',
  ROWING: 'Rowing',
  FARMERS_CARRY: 'Farmers Carry',
  SANDBAG_LUNGE: 'Sandbag Lunge',
  WALL_BALLS: 'Wall Balls',
};

// Check if video type is HYROX
export function isHyroxVideoType(videoType: string | null): boolean {
  return videoType === 'HYROX_STATION';
}

// Get FPS for HYROX analysis (4 FPS like strength exercises)
export function getHyroxFPS(): number {
  return 4;
}

// Base system prompt for HYROX analysis
const HYROX_BASE_SYSTEM_PROMPT_SV = `Du är en expert HYROX-coach och rörelsanalytiker. Analysera denna video av en HYROX-station och ge detaljerad feedback på svenska.

VIKTIGT:
- Svara ENDAST med ett JSON-objekt, ingen annan text
- Alla värden ska vara på svenska
- Poäng ska vara heltal mellan 0-100
- Identifiera specifika styrkor och svagheter
- Ge konkreta, genomförbara förbättringsförslag
- Relatera till HYROX-tävlingskontext och hur tekniken påverkar totaltiden`;

const HYROX_BASE_SYSTEM_PROMPT_EN = `You are an expert HYROX coach and movement analyst. Analyze this HYROX station video and give detailed feedback in English.

IMPORTANT:
- Respond ONLY with a JSON object, no other text
- All user-facing string values must be in English
- Scores must be integers between 0-100
- Identify specific strengths and weaknesses
- Give concrete, actionable improvement suggestions
- Relate the feedback to HYROX race context and how technique affects total time`;

// Station-specific prompts
const SKIERG_PROMPT = `${HYROX_BASE_SYSTEM_PROMPT_SV}

STATION: SkiErg (1000m)
Analysera SkiErg-tekniken med fokus på:

1. DRAGFAS
- Draglängd och armextension vid start
- Höftgångjärnsdjup (hip hinge)
- Benbidrag till kraftutveckling
- Koordination mellan armar och kropp

2. ÅTERHÄMTNINGSFAS
- Armåterhämtningens hastighet
- Bibehållen spänning i ryggen
- Förberedelse för nästa drag

3. HYROX-STRATEGI
- Hållbart tempo för 1000m
- Energihantering efter löpningen
- Tecken på utmattning

Svara med följande JSON-struktur:
{
  "overallScore": number,
  "efficiencyScore": number,
  "formScore": number,
  "paceConsistency": number,
  "coreStability": number,
  "breathingPattern": "GOOD" | "INCONSISTENT" | "POOR",
  "movementCadence": number,
  "pullLength": "SHORT" | "OPTIMAL" | "LONG",
  "hipHingeDepth": "SHALLOW" | "OPTIMAL" | "EXCESSIVE",
  "armExtension": "INCOMPLETE" | "FULL" | "OVEREXTENDED",
  "legDriveContribution": "MINIMAL" | "MODERATE" | "SIGNIFICANT",
  "fatigueIndicators": { "earlyPhase": string[], "latePhase": string[] },
  "insights": {
    "strengths": string[],
    "weaknesses": string[],
    "drills": [{ "drill": string, "focus": string, "priority": number }],
    "raceStrategyTips": string[]
  }
}`;

const SLED_PUSH_PROMPT = `${HYROX_BASE_SYSTEM_PROMPT_SV}

STATION: Sled Push (50m)
Analysera Sled Push-tekniken med fokus på:

1. KROPPSHÅLLNING
- Kroppsvinkel (ideal 45-60 grader)
- Armarnas låsning mot släden
- Huvudposition och blickriktning

2. DRIVFAS
- Steglängd och frekvens
- Kraftriktning genom släden
- Fotisättning och avskjut

3. HYROX-STRATEGI
- Hållbart tempo vs explosivitet
- Återhämtning från löpningen innan
- Mentalt fokus på 50m distansen

Svara med följande JSON-struktur:
{
  "overallScore": number,
  "efficiencyScore": number,
  "formScore": number,
  "paceConsistency": number,
  "coreStability": number,
  "breathingPattern": "GOOD" | "INCONSISTENT" | "POOR",
  "movementCadence": number,
  "bodyAngle": number,
  "armLockout": "BENT" | "LOCKED" | "OVEREXTENDED",
  "strideLength": "SHORT" | "OPTIMAL" | "OVERSTRIDING",
  "drivePhase": "WEAK" | "GOOD" | "POWERFUL",
  "fatigueIndicators": { "earlyPhase": string[], "latePhase": string[] },
  "insights": {
    "strengths": string[],
    "weaknesses": string[],
    "drills": [{ "drill": string, "focus": string, "priority": number }],
    "raceStrategyTips": string[]
  }
}`;

const SLED_PULL_PROMPT = `${HYROX_BASE_SYSTEM_PROMPT_SV}

STATION: Sled Pull (50m)
Analysera Sled Pull-tekniken med fokus på:

1. DRAGTEKNIK
- Höftdominerad vs armdominerad dragning
- Repets bana och konsistens
- Kraft genom varje drag

2. FÖRANKRING
- Stabilitet i stående position
- Benarbete som motstånd
- Bålstabilitet under drag

3. HANDÖVERFÖRING
- Effektivitet i handgrepp
- Minimering av pauser
- Rytm i dragningen

Svara med följande JSON-struktur:
{
  "overallScore": number,
  "efficiencyScore": number,
  "formScore": number,
  "paceConsistency": number,
  "coreStability": number,
  "breathingPattern": "GOOD" | "INCONSISTENT" | "POOR",
  "movementCadence": number,
  "pullTechnique": "ARM_DOMINANT" | "HIP_DRIVEN" | "MIXED",
  "ropePath": "STRAIGHT" | "DIAGONAL" | "INCONSISTENT",
  "anchorStability": "STABLE" | "SHIFTING" | "UNSTABLE",
  "fatigueIndicators": { "earlyPhase": string[], "latePhase": string[] },
  "insights": {
    "strengths": string[],
    "weaknesses": string[],
    "drills": [{ "drill": string, "focus": string, "priority": number }],
    "raceStrategyTips": string[]
  }
}`;

const BURPEE_BROAD_JUMP_PROMPT = `${HYROX_BASE_SYSTEM_PROMPT_SV}

STATION: Burpee Broad Jump (80 reps, 8x10m segments)
Analysera Burpee Broad Jump-tekniken med fokus på:

1. BURPEE-KOMPONENT
- Nedgång och golvkontakt
- Bröstposition på golvet
- Uppresning och effektivitet

2. HOPPKOMPONENT
- Avskjutskraft och höjd
- Hopplängd och konsistens
- Landningsmekanik

3. ÖVERGÅNGSHASTIGHET
- Tid mellan burpee och hopp
- Flyt i rörelsen
- Energibesparing

Svara med följande JSON-struktur:
{
  "overallScore": number,
  "efficiencyScore": number,
  "formScore": number,
  "paceConsistency": number,
  "coreStability": number,
  "breathingPattern": "GOOD" | "INCONSISTENT" | "POOR",
  "movementCadence": number,
  "burpeeDepth": "SHALLOW" | "FULL" | "EXCESSIVE",
  "jumpDistance": "SHORT" | "GOOD" | "EXCELLENT",
  "transitionSpeed": "SLOW" | "MODERATE" | "FAST",
  "landingMechanics": "POOR" | "ACCEPTABLE" | "GOOD",
  "fatigueIndicators": { "earlyPhase": string[], "latePhase": string[] },
  "insights": {
    "strengths": string[],
    "weaknesses": string[],
    "drills": [{ "drill": string, "focus": string, "priority": number }],
    "raceStrategyTips": string[]
  }
}`;

const ROWING_PROMPT = `${HYROX_BASE_SYSTEM_PROMPT_SV}

STATION: Rodd (1000m)
Analysera roddtekniken med fokus på:

1. DRIVFAS
- Sekvens: ben → rygg → armar
- Kraftutveckling genom benen
- Layback-vinkel och timing

2. CATCH-POSITION
- Kompression vid återhämtning
- Arm- och handledsposition
- Shins vertikala vid catch

3. SLAG-EFFEKTIVITET
- Slagfrekvens vs kraftutveckling
- Jämn kraftkurva
- Återhämtningsfasens hastighet

Svara med följande JSON-struktur:
{
  "overallScore": number,
  "efficiencyScore": number,
  "formScore": number,
  "paceConsistency": number,
  "coreStability": number,
  "breathingPattern": "GOOD" | "INCONSISTENT" | "POOR",
  "movementCadence": number,
  "driveSequence": "CORRECT" | "ARMS_EARLY" | "BACK_EARLY",
  "laybackAngle": number,
  "catchPosition": "COMPRESSED" | "OPTIMAL" | "OVERREACHING",
  "strokeRate": number,
  "powerApplication": "FRONT_LOADED" | "EVEN" | "BACK_LOADED",
  "fatigueIndicators": { "earlyPhase": string[], "latePhase": string[] },
  "insights": {
    "strengths": string[],
    "weaknesses": string[],
    "drills": [{ "drill": string, "focus": string, "priority": number }],
    "raceStrategyTips": string[]
  }
}`;

const FARMERS_CARRY_PROMPT = `${HYROX_BASE_SYSTEM_PROMPT_SV}

STATION: Farmers Carry (200m)
Analysera Farmers Carry-tekniken med fokus på:

1. HÅLLNING
- Skulderposition (packade vs eleverade)
- Bålkontroll och upprätt position
- Huvudposition

2. GÅNGTEKNIK
- Stegmönster och frekvens
- Höftrörelse och stabilitet
- Sidorörelse (minimering)

3. GREPPHANTERING
- Grepptrötthet över distansen
- Kettlebell-kontroll
- Andning under belastning

Svara med följande JSON-struktur:
{
  "overallScore": number,
  "efficiencyScore": number,
  "formScore": number,
  "paceConsistency": number,
  "coreStability": number,
  "breathingPattern": "GOOD" | "INCONSISTENT" | "POOR",
  "movementCadence": number,
  "shoulderPack": "ELEVATED" | "PACKED" | "DEPRESSED",
  "trunkPosture": "UPRIGHT" | "LEANING" | "SWAYING",
  "stridePattern": "SHORT_CHOPPY" | "SMOOTH" | "OVERSTRIDING",
  "gripFatigue": "NONE" | "MODERATE" | "SIGNIFICANT",
  "fatigueIndicators": { "earlyPhase": string[], "latePhase": string[] },
  "insights": {
    "strengths": string[],
    "weaknesses": string[],
    "drills": [{ "drill": string, "focus": string, "priority": number }],
    "raceStrategyTips": string[]
  }
}`;

const SANDBAG_LUNGE_PROMPT = `${HYROX_BASE_SYSTEM_PROMPT_SV}

STATION: Sandbag Lunge (100m)
Analysera Sandbag Lunge-tekniken med fokus på:

1. SANDSÄCKSPOSITION
- Placering på axlarna/bröstet
- Stabilitet under rörelsen
- Omfördelning vid trötthet

2. UTFALLSTEKNIK
- Steglängd och knäspårning
- Bakbenets kontakt med golvet
- Uppresningsfas

3. BALANS OCH KONTROLL
- Bålposition och framåtlutning
- Lateralt svajavande
- Tempo och rytm

Svara med följande JSON-struktur:
{
  "overallScore": number,
  "efficiencyScore": number,
  "formScore": number,
  "paceConsistency": number,
  "coreStability": number,
  "breathingPattern": "GOOD" | "INCONSISTENT" | "POOR",
  "movementCadence": number,
  "bagPosition": "HIGH_CHEST" | "SHOULDER" | "DROPPING",
  "kneeTracking": "GOOD" | "VALGUS" | "VARUS",
  "stepLength": "SHORT" | "OPTIMAL" | "OVERSTRIDING",
  "torsoPosition": "UPRIGHT" | "FORWARD_LEAN" | "EXCESSIVE_LEAN",
  "fatigueIndicators": { "earlyPhase": string[], "latePhase": string[] },
  "insights": {
    "strengths": string[],
    "weaknesses": string[],
    "drills": [{ "drill": string, "focus": string, "priority": number }],
    "raceStrategyTips": string[]
  }
}`;

const WALL_BALLS_PROMPT = `${HYROX_BASE_SYSTEM_PROMPT_SV}

STATION: Wall Balls (100 reps för kvinnor, 75 reps för män - baserat på tävlingsklass)
Analysera Wall Balls-tekniken med fokus på:

1. SQUAT-KOMPONENT
- Knäböjdjup (parallell eller under)
- Knäspårning över tårna
- Uppresningskraft

2. KASTTEKNIK
- Höftdriven vs armdriven kast
- Bollens bana till målet
- Full armextension

3. FÅNGSTPOSITION
- Bollens fångstläge
- Övergång till nästa rep
- Rytm och konsistens

Svara med följande JSON-struktur:
{
  "overallScore": number,
  "efficiencyScore": number,
  "formScore": number,
  "paceConsistency": number,
  "coreStability": number,
  "breathingPattern": "GOOD" | "INCONSISTENT" | "POOR",
  "movementCadence": number,
  "squatDepth": "SHALLOW" | "PARALLEL" | "DEEP",
  "throwMechanics": "ARM_DOMINANT" | "HIP_DRIVEN" | "COORDINATED",
  "wallBallCatchHeight": "HIGH" | "OPTIMAL" | "LOW",
  "rhythmConsistency": number,
  "fatigueIndicators": { "earlyPhase": string[], "latePhase": string[] },
  "insights": {
    "strengths": string[],
    "weaknesses": string[],
    "drills": [{ "drill": string, "focus": string, "priority": number }],
    "raceStrategyTips": string[]
  }
}`;

// Map station types to prompts
const STATION_PROMPTS: Record<HyroxStationType, string> = {
  SKIERG: SKIERG_PROMPT,
  SLED_PUSH: SLED_PUSH_PROMPT,
  SLED_PULL: SLED_PULL_PROMPT,
  BURPEE_BROAD_JUMP: BURPEE_BROAD_JUMP_PROMPT,
  ROWING: ROWING_PROMPT,
  FARMERS_CARRY: FARMERS_CARRY_PROMPT,
  SANDBAG_LUNGE: SANDBAG_LUNGE_PROMPT,
  WALL_BALLS: WALL_BALLS_PROMPT,
};

const STATION_GUIDANCE_EN: Record<HyroxStationType, string> = {
  SKIERG: `STATION: SkiErg (1000m)
Analyze SkiErg technique with focus on:

1. PULL PHASE
- Pull length and arm extension at the start
- Hip-hinge depth
- Leg contribution to power production
- Coordination between arms and body

2. RECOVERY PHASE
- Arm recovery speed
- Maintained back tension
- Preparation for the next pull

3. HYROX STRATEGY
- Sustainable pacing for 1000m
- Energy management after the run
- Signs of fatigue`,
  SLED_PUSH: `STATION: Sled Push (50m)
Analyze Sled Push technique with focus on:

1. BODY POSITION
- Body angle (ideal 45-60 degrees)
- Arm lockout against the sled
- Head position and gaze direction

2. DRIVE PHASE
- Stride length and frequency
- Force direction through the sled
- Foot placement and push-off

3. HYROX STRATEGY
- Sustainable pace versus explosiveness
- Recovery from the preceding run
- Mental focus across the 50m distance`,
  SLED_PULL: `STATION: Sled Pull (50m)
Analyze Sled Pull technique with focus on:

1. PULLING TECHNIQUE
- Hip-driven versus arm-dominant pulling
- Rope path and consistency
- Force through each pull

2. ANCHORING
- Stability in the standing position
- Leg work as resistance
- Trunk stability during the pull

3. HAND TRANSFER
- Grip-switch efficiency
- Minimizing pauses
- Pulling rhythm`,
  BURPEE_BROAD_JUMP: `STATION: Burpee Broad Jump (80 reps, 8x10m segments)
Analyze Burpee Broad Jump technique with focus on:

1. BURPEE COMPONENT
- Descent and floor contact
- Chest position on the floor
- Getting up efficiently

2. JUMP COMPONENT
- Push-off power and height
- Jump distance and consistency
- Landing mechanics

3. TRANSITION SPEED
- Time between burpee and jump
- Flow through the movement
- Energy conservation`,
  ROWING: `STATION: Rowing (1000m)
Analyze rowing technique with focus on:

1. DRIVE PHASE
- Sequence: legs -> trunk -> arms
- Power production through the legs
- Layback angle and timing

2. CATCH POSITION
- Compression during recovery
- Arm and wrist position
- Vertical shins at the catch

3. STROKE EFFICIENCY
- Stroke rate versus power production
- Smooth power curve
- Recovery-phase speed`,
  FARMERS_CARRY: `STATION: Farmers Carry (200m)
Analyze Farmers Carry technique with focus on:

1. POSTURE
- Shoulder position (packed versus elevated)
- Trunk control and upright posture
- Head position

2. WALKING TECHNIQUE
- Step pattern and cadence
- Hip movement and stability
- Minimizing side-to-side motion

3. GRIP MANAGEMENT
- Grip fatigue across the distance
- Kettlebell control
- Breathing under load`,
  SANDBAG_LUNGE: `STATION: Sandbag Lunge (100m)
Analyze Sandbag Lunge technique with focus on:

1. SANDBAG POSITION
- Placement on shoulders/chest
- Stability during movement
- Repositioning under fatigue

2. LUNGE TECHNIQUE
- Step length and knee tracking
- Rear-knee contact with the floor
- Rising phase

3. BALANCE AND CONTROL
- Trunk position and forward lean
- Lateral wobble
- Tempo and rhythm`,
  WALL_BALLS: `STATION: Wall Balls (100 reps for women, 75 reps for men - based on race category)
Analyze Wall Balls technique with focus on:

1. SQUAT COMPONENT
- Squat depth (parallel or below)
- Knee tracking over toes
- Rising power

2. THROWING TECHNIQUE
- Hip-driven versus arm-driven throw
- Ball path to target
- Full arm extension

3. CATCH POSITION
- Ball catch position
- Transition into the next rep
- Rhythm and consistency`,
};

function getJsonSchemaFromPrompt(prompt: string): string {
  const schemaStart = prompt.indexOf('{\n')
  return schemaStart === -1 ? '' : prompt.slice(schemaStart)
}

/**
 * Build the HYROX station analysis prompt
 */
export function buildHyroxPrompt(
  stationType: HyroxStationType,
  athleteContext?: {
    hyroxCategory?: string;
    stationTimes?: Record<string, number>;
    weakStations?: string[];
    strongStations?: string[];
  },
  locale: AppLocale = 'en'
): string {
  let prompt = STATION_PROMPTS[stationType];
  if (locale === 'en') {
    prompt = `${HYROX_BASE_SYSTEM_PROMPT_EN}

${STATION_GUIDANCE_EN[stationType]}

Respond with the following JSON structure:
${getJsonSchemaFromPrompt(STATION_PROMPTS[stationType])}`;
  }

  // Add athlete context if available
  if (athleteContext) {
    let context = locale === 'sv' ? '\n\nATLETKONTEXT:' : '\n\nATHLETE CONTEXT:';

    if (athleteContext.hyroxCategory) {
      context += locale === 'sv'
        ? `\n- Tävlingsklass: ${athleteContext.hyroxCategory}`
        : `\n- Race category: ${athleteContext.hyroxCategory}`;
    }

    if (athleteContext.weakStations?.includes(stationType)) {
      context += locale === 'sv'
        ? '\n- OBS: Detta är en av atletens SVAGA stationer - prioritera förbättringsförslag'
        : '\n- NOTE: This is one of the athlete\'s WEAK stations - prioritize improvement suggestions';
    }

    if (athleteContext.strongStations?.includes(stationType)) {
      context += locale === 'sv'
        ? '\n- Detta är en av atletens STARKA stationer - fokusera på finslipning'
        : '\n- This is one of the athlete\'s STRONG stations - focus on fine-tuning';
    }

    if (athleteContext.stationTimes?.[stationType]) {
      context += locale === 'sv'
        ? `\n- Tidigare bästa tid: ${athleteContext.stationTimes[stationType]} sekunder`
        : `\n- Previous best time: ${athleteContext.stationTimes[stationType]} seconds`;
    }

    prompt += context;
  }

  return prompt;
}

// Response interfaces for type safety
export interface HyroxBaseAnalysis {
  overallScore: number;
  efficiencyScore: number;
  formScore: number;
  paceConsistency: number;
  coreStability: number;
  breathingPattern: 'GOOD' | 'INCONSISTENT' | 'POOR';
  movementCadence: number;
  fatigueIndicators?: {
    earlyPhase: string[];
    latePhase: string[];
  };
  insights: {
    strengths: string[];
    weaknesses: string[];
    drills: Array<{ drill: string; focus: string; priority: number }>;
    raceStrategyTips: string[];
  };
}

export interface SkiErgAnalysis extends HyroxBaseAnalysis {
  pullLength: 'SHORT' | 'OPTIMAL' | 'LONG';
  hipHingeDepth: 'SHALLOW' | 'OPTIMAL' | 'EXCESSIVE';
  armExtension: 'INCOMPLETE' | 'FULL' | 'OVEREXTENDED';
  legDriveContribution: 'MINIMAL' | 'MODERATE' | 'SIGNIFICANT';
}

export interface SledPushAnalysis extends HyroxBaseAnalysis {
  bodyAngle: number;
  armLockout: 'BENT' | 'LOCKED' | 'OVEREXTENDED';
  strideLength: 'SHORT' | 'OPTIMAL' | 'OVERSTRIDING';
  drivePhase: 'WEAK' | 'GOOD' | 'POWERFUL';
}

export interface SledPullAnalysis extends HyroxBaseAnalysis {
  pullTechnique: 'ARM_DOMINANT' | 'HIP_DRIVEN' | 'MIXED';
  ropePath: 'STRAIGHT' | 'DIAGONAL' | 'INCONSISTENT';
  anchorStability: 'STABLE' | 'SHIFTING' | 'UNSTABLE';
}

export interface BurpeeBroadJumpAnalysis extends HyroxBaseAnalysis {
  burpeeDepth: 'SHALLOW' | 'FULL' | 'EXCESSIVE';
  jumpDistance: 'SHORT' | 'GOOD' | 'EXCELLENT';
  transitionSpeed: 'SLOW' | 'MODERATE' | 'FAST';
  landingMechanics: 'POOR' | 'ACCEPTABLE' | 'GOOD';
}

export interface RowingAnalysis extends HyroxBaseAnalysis {
  driveSequence: 'CORRECT' | 'ARMS_EARLY' | 'BACK_EARLY';
  laybackAngle: number;
  catchPosition: 'COMPRESSED' | 'OPTIMAL' | 'OVERREACHING';
  strokeRate: number;
  powerApplication: 'FRONT_LOADED' | 'EVEN' | 'BACK_LOADED';
}

export interface FarmersCarryAnalysis extends HyroxBaseAnalysis {
  shoulderPack: 'ELEVATED' | 'PACKED' | 'DEPRESSED';
  trunkPosture: 'UPRIGHT' | 'LEANING' | 'SWAYING';
  stridePattern: 'SHORT_CHOPPY' | 'SMOOTH' | 'OVERSTRIDING';
  gripFatigue: 'NONE' | 'MODERATE' | 'SIGNIFICANT';
}

export interface SandbagLungeAnalysis extends HyroxBaseAnalysis {
  bagPosition: 'HIGH_CHEST' | 'SHOULDER' | 'DROPPING';
  kneeTracking: 'GOOD' | 'VALGUS' | 'VARUS';
  stepLength: 'SHORT' | 'OPTIMAL' | 'OVERSTRIDING';
  torsoPosition: 'UPRIGHT' | 'FORWARD_LEAN' | 'EXCESSIVE_LEAN';
}

export interface WallBallsAnalysis extends HyroxBaseAnalysis {
  squatDepth: 'SHALLOW' | 'PARALLEL' | 'DEEP';
  throwMechanics: 'ARM_DOMINANT' | 'HIP_DRIVEN' | 'COORDINATED';
  wallBallCatchHeight: 'HIGH' | 'OPTIMAL' | 'LOW';
  rhythmConsistency: number;
}

export type HyroxStationAnalysisResult =
  | SkiErgAnalysis
  | SledPushAnalysis
  | SledPullAnalysis
  | BurpeeBroadJumpAnalysis
  | RowingAnalysis
  | FarmersCarryAnalysis
  | SandbagLungeAnalysis
  | WallBallsAnalysis;
