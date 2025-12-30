/**
 * HYROX Station Analysis Prompts
 *
 * Swedish-language prompts for AI video analysis of HYROX stations.
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

export const HYROX_STATION_LABELS: Record<HyroxStationType, string> = {
  SKIERG: 'SkiErg',
  SLED_PUSH: 'Sled Push',
  SLED_PULL: 'Sled Pull',
  BURPEE_BROAD_JUMP: 'Burpee Broad Jump',
  ROWING: 'Rodd',
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
const HYROX_BASE_SYSTEM_PROMPT = `Du är en expert HYROX-coach och rörelsanalytiker. Analysera denna video av en HYROX-station och ge detaljerad feedback på svenska.

VIKTIGT:
- Svara ENDAST med ett JSON-objekt, ingen annan text
- Alla värden ska vara på svenska
- Poäng ska vara heltal mellan 0-100
- Identifiera specifika styrkor och svagheter
- Ge konkreta, genomförbara förbättringsförslag
- Relatera till HYROX-tävlingskontext och hur tekniken påverkar totaltiden`;

// Station-specific prompts
const SKIERG_PROMPT = `${HYROX_BASE_SYSTEM_PROMPT}

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

const SLED_PUSH_PROMPT = `${HYROX_BASE_SYSTEM_PROMPT}

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

const SLED_PULL_PROMPT = `${HYROX_BASE_SYSTEM_PROMPT}

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

const BURPEE_BROAD_JUMP_PROMPT = `${HYROX_BASE_SYSTEM_PROMPT}

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

const ROWING_PROMPT = `${HYROX_BASE_SYSTEM_PROMPT}

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

const FARMERS_CARRY_PROMPT = `${HYROX_BASE_SYSTEM_PROMPT}

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

const SANDBAG_LUNGE_PROMPT = `${HYROX_BASE_SYSTEM_PROMPT}

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

const WALL_BALLS_PROMPT = `${HYROX_BASE_SYSTEM_PROMPT}

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
  }
): string {
  let prompt = STATION_PROMPTS[stationType];

  // Add athlete context if available
  if (athleteContext) {
    let context = '\n\nATLETKONTEXT:';

    if (athleteContext.hyroxCategory) {
      context += `\n- Tävlingsklass: ${athleteContext.hyroxCategory}`;
    }

    if (athleteContext.weakStations?.includes(stationType)) {
      context += '\n- OBS: Detta är en av atletens SVAGA stationer - prioritera förbättringsförslag';
    }

    if (athleteContext.strongStations?.includes(stationType)) {
      context += '\n- Detta är en av atletens STARKA stationer - fokusera på finslipning';
    }

    if (athleteContext.stationTimes?.[stationType]) {
      context += `\n- Tidigare bästa tid: ${athleteContext.stationTimes[stationType]} sekunder`;
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
