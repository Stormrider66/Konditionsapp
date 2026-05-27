/**
 * Prompts for skiing technique video analysis.
 * Supports: Classic diagonal, Skating (V1/V2/V2-alt), Double pole.
 */

export type SkiingTechniqueType = 'SKIING_CLASSIC' | 'SKIING_SKATING' | 'SKIING_DOUBLE_POLE';

export interface SkiingSettings {
  technique?: string;
  primaryDiscipline?: string;
  terrainPreference?: string;
  currentThresholdPace?: number | null;
}

export interface SkiingPromptContext {
  gender: 'MALE' | 'FEMALE' | string;
  experienceLevel?: string;
  skiingSettings?: SkiingSettings;
  athleteName?: string;
  locale?: AppLocale;
}

type AppLocale = 'en' | 'sv';

// Response types for parsing AI output
export interface SkiingPoleAnalysis {
  plantAngle?: number;
  releaseAngle?: number;
  timing?: 'EARLY' | 'ON_TIME' | 'LATE';
  forceApplication?: 'GOOD' | 'WEAK' | 'INCONSISTENT';
  armSymmetry?: number;
}

export interface SkiingHipAnalysis {
  score?: number;
  heightConsistency?: number;
  forwardLean?: number;
  coreEngagement?: 'GOOD' | 'MODERATE' | 'POOR';
}

export interface SkiingWeightTransfer {
  score?: number;
  timing?: 'EARLY' | 'ON_TIME' | 'LATE';
  lateralStability?: number;
}

export interface ClassicKickAnalysis {
  timingScore?: number;
  extension?: 'FULL' | 'PARTIAL' | 'INCOMPLETE';
  waxPocketEngagement?: 'GOOD' | 'PARTIAL' | 'POOR';
}

export interface ClassicGlidePhase {
  duration?: number;
  legRecovery?: 'EFFICIENT' | 'MODERATE' | 'INEFFICIENT';
}

export interface SkatingEdgeAnalysis {
  leftAngle?: number;
  rightAngle?: number;
  symmetry?: number;
  pushOffAngle?: number;
}

export interface SkatingVPattern {
  width?: number;
  frequency?: number;
  consistency?: number;
}

export interface SkatingRecovery {
  legPath?: 'COMPACT' | 'WIDE' | 'INCONSISTENT';
}

export interface DoublePoleTrunkAnalysis {
  flexionRange?: number;
  compressionDepth?: 'SHALLOW' | 'OPTIMAL' | 'EXCESSIVE';
  returnSpeed?: 'FAST' | 'MODERATE' | 'SLOW';
}

export interface DoublePoleRhythm {
  consistency?: number;
  frequency?: number;
}

export interface DoublePoleLegs {
  contribution?: 'SIGNIFICANT' | 'MODERATE' | 'MINIMAL';
  timing?: 'SYNCHRONIZED' | 'EARLY' | 'LATE';
}

export interface SkiingDrill {
  drill: string;
  focus: string;
  priority: number;
}

export interface SkiingInsights {
  strengths: string[];
  weaknesses: string[];
  drills: SkiingDrill[];
  eliteComparison?: string;
}

// Classic Analysis Response
export interface ClassicAnalysisResponse {
  overallScore: number;
  balanceScore: number;
  timingScore: number;
  efficiencyScore: number;
  poleAnalysis: SkiingPoleAnalysis;
  kickAnalysis: ClassicKickAnalysis;
  weightTransfer: SkiingWeightTransfer;
  hipPosition: SkiingHipAnalysis;
  glidePhase: ClassicGlidePhase;
  insights: SkiingInsights;
}

// Skating Analysis Response
export interface SkatingAnalysisResponse {
  skatingVariant: 'V1' | 'V2' | 'V2_ALT';
  overallScore: number;
  balanceScore: number;
  timingScore: number;
  efficiencyScore: number;
  edgeAnalysis: SkatingEdgeAnalysis;
  vPattern: SkatingVPattern;
  poleAnalysis: SkiingPoleAnalysis;
  hipPosition: SkiingHipAnalysis;
  recovery: SkatingRecovery;
  insights: SkiingInsights;
}

// Double Pole Analysis Response
export interface DoublePoleAnalysisResponse {
  overallScore: number;
  powerScore: number;
  rhythmScore: number;
  efficiencyScore: number;
  trunkAnalysis: DoublePoleTrunkAnalysis;
  poleAnalysis: SkiingPoleAnalysis;
  legDrive: DoublePoleLegs;
  rhythm: DoublePoleRhythm;
  hipPosition: SkiingHipAnalysis;
  insights: SkiingInsights;
}

export type SkiingAnalysisResponse = ClassicAnalysisResponse | SkatingAnalysisResponse | DoublePoleAnalysisResponse;

/**
 * Build the appropriate skiing prompt based on technique type
 */
export function buildSkiingPrompt(
  videoType: SkiingTechniqueType,
  context: SkiingPromptContext
): string {
  const { gender, experienceLevel, skiingSettings, athleteName } = context;
  const locale = context.locale === 'sv' ? 'sv' : 'en';

  const genderPronoun = locale === 'sv'
    ? gender === 'MALE' ? 'manlig' : gender === 'FEMALE' ? 'kvinnlig' : ''
    : gender === 'MALE' ? 'male' : gender === 'FEMALE' ? 'female' : '';
  const expLevel = experienceLevel || skiingSettings?.technique || 'INTERMEDIATE';
  const discipline = skiingSettings?.primaryDiscipline || (locale === 'sv' ? 'distans' : 'distance');
  const terrain = skiingSettings?.terrainPreference || (locale === 'sv' ? 'varierad' : 'varied');
  const athleteDesc = athleteName ? `${locale === 'sv' ? 'Atlet' : 'Athlete'}: ${athleteName}` : '';

  switch (videoType) {
    case 'SKIING_CLASSIC':
      return buildClassicPrompt(genderPronoun, expLevel, discipline, terrain, athleteDesc, locale);
    case 'SKIING_SKATING':
      return buildSkatingPrompt(genderPronoun, expLevel, discipline, athleteDesc, locale);
    case 'SKIING_DOUBLE_POLE':
      return buildDoublePolePrompt(genderPronoun, expLevel, athleteDesc, locale);
    default:
      throw new Error(`Unknown skiing video type: ${videoType}`);
  }
}

function buildClassicPrompt(
  genderPronoun: string,
  experienceLevel: string,
  discipline: string,
  terrain: string,
  athleteDesc: string,
  locale: AppLocale
): string {
  if (locale === 'en') {
    return `You are an expert cross-country skiing analyst specializing in classic technique.
Analyze this video of a ${genderPronoun} skier performing diagonal stride.

## IMPORTANT: ANALYZE THE FULL VIDEO
You have access to the full video with multiple frames over time. Analyze the movement across the whole sequence, not just a single frame.

## FOCUS AREAS

### 1. Pole technique
- Pole angle at plant (optimal: 70-80 degrees)
- Pole angle at release (optimal: 10-20 degrees behind horizontal)
- Timing relative to the kick
- Force development through the full pole cycle
- Symmetry between left and right arm

### 2. Kick
- Kick timing relative to center of mass
- Full extension of the kicking leg
- Wax pocket engagement (is the ski pressed down properly?)
- Speed and explosiveness of the kick

### 3. Weight transfer
- Complete weight transfer to the gliding ski
- Timing of the weight shift
- Lateral stability during the glide phase

### 4. Hip and trunk position
- Hip height (high hips are more efficient)
- Forward lean (optimal: 5-15 degrees)
- Core engagement for stability

### 5. Glide phase
- Length of glide phase (longer is more efficient)
- Balance during single-leg support
- Efficiency of leg recovery

## ATHLETE PROFILE
${athleteDesc}
- Experience level: ${experienceLevel}
- Primary discipline: ${discipline}
- Preferred terrain: ${terrain}

## RESPONSE FORMAT
Return the analysis as JSON with this structure:

\`\`\`json
{
  "overallScore": <number 0-100>,
  "balanceScore": <number 0-100>,
  "timingScore": <number 0-100>,
  "efficiencyScore": <number 0-100>,
  "poleAnalysis": {
    "plantAngle": <number degrees>,
    "releaseAngle": <number degrees>,
    "timing": "EARLY" | "ON_TIME" | "LATE",
    "forceApplication": "GOOD" | "WEAK" | "INCONSISTENT",
    "armSymmetry": <number 0-100>
  },
  "kickAnalysis": {
    "timingScore": <number 0-100>,
    "extension": "FULL" | "PARTIAL" | "INCOMPLETE",
    "waxPocketEngagement": "GOOD" | "PARTIAL" | "POOR"
  },
  "weightTransfer": {
    "score": <number 0-100>,
    "timing": "EARLY" | "ON_TIME" | "LATE",
    "lateralStability": <number 0-100>
  },
  "hipPosition": {
    "score": <number 0-100>,
    "heightConsistency": <number 0-100>,
    "forwardLean": <number degrees>,
    "coreEngagement": "GOOD" | "MODERATE" | "POOR"
  },
  "glidePhase": {
    "duration": <number seconds estimate>,
    "legRecovery": "EFFICIENT" | "MODERATE" | "INEFFICIENT"
  },
  "insights": {
    "strengths": ["<strength 1 in English>", "<strength 2>"],
    "weaknesses": ["<weakness 1 in English>", "<weakness 2>"],
    "drills": [
      { "drill": "<drill name in English>", "focus": "<focus area>", "priority": 1 },
      { "drill": "<drill 2>", "focus": "<focus>", "priority": 2 }
    ],
    "eliteComparison": "<comparison to elite skiers in English>"
  }
}
\`\`\``;
  }

  return `Du ar en expertanalytiker for langdskidakning med specialisering pa klassisk teknik.
Analysera denna video av en ${genderPronoun} akare som utfor diagonalgang.

## VIKTIGT: ANALYSERA HELA VIDEON
Du har tillgang till HELA videon med flera bildrutor over tid. Analysera rorelsen genom HELA videosekvensen, inte bara en enskild bildruta.

## FOKUSOMRADEN

### 1. Stavteknik
- Stavvinkel vid isattning (optimal: 70-80 grader)
- Stavvinkel vid avslut (optimal: 10-20 grader bakom horisontell)
- Timing i forhallande till fraspark
- Kraftutveckling genom hela stavcykeln
- Symmetri mellan vanster och hoger arm

### 2. Fraspark (Kick)
- Sparkens timing relativt tyngdpunktens position
- Full extension av sparkbenet
- Vaxfickans engagemang (trycks skidan ner ordentligt?)
- Hastighet och explosivitet i sparken

### 3. Viktoverforning
- Fullstandig viktoverforning till glidskidan
- Timing av viktoverflytt
- Lateral stabilitet under glidfasen

### 4. Hoft- och Balposition
- Hoftens hojd (hog hoft = effektivare)
- Framatlutning (optimal: 5-15 grader)
- Balarnas engagemang for stabilitet

### 5. Glidfas
- Langd pa glidfasen (langre = effektivare)
- Balans under enbensstod
- Benaterhartningens effektivitet

## ATLETENS PROFIL
${athleteDesc}
- Erfarenhetsniva: ${experienceLevel}
- Primar disciplin: ${discipline}
- Foredragan terrang: ${terrain}

## SVARSFORMAT
Returnera analys som JSON med foljande struktur:

\`\`\`json
{
  "overallScore": <number 0-100>,
  "balanceScore": <number 0-100>,
  "timingScore": <number 0-100>,
  "efficiencyScore": <number 0-100>,
  "poleAnalysis": {
    "plantAngle": <number degrees>,
    "releaseAngle": <number degrees>,
    "timing": "EARLY" | "ON_TIME" | "LATE",
    "forceApplication": "GOOD" | "WEAK" | "INCONSISTENT",
    "armSymmetry": <number 0-100>
  },
  "kickAnalysis": {
    "timingScore": <number 0-100>,
    "extension": "FULL" | "PARTIAL" | "INCOMPLETE",
    "waxPocketEngagement": "GOOD" | "PARTIAL" | "POOR"
  },
  "weightTransfer": {
    "score": <number 0-100>,
    "timing": "EARLY" | "ON_TIME" | "LATE",
    "lateralStability": <number 0-100>
  },
  "hipPosition": {
    "score": <number 0-100>,
    "heightConsistency": <number 0-100>,
    "forwardLean": <number degrees>,
    "coreEngagement": "GOOD" | "MODERATE" | "POOR"
  },
  "glidePhase": {
    "duration": <number seconds estimate>,
    "legRecovery": "EFFICIENT" | "MODERATE" | "INEFFICIENT"
  },
  "insights": {
    "strengths": ["<styrka 1 pa svenska>", "<styrka 2>"],
    "weaknesses": ["<svaghet 1 pa svenska>", "<svaghet 2>"],
    "drills": [
      { "drill": "<ovningsnamn pa svenska>", "focus": "<fokusomrade>", "priority": 1 },
      { "drill": "<ovning 2>", "focus": "<fokus>", "priority": 2 }
    ],
    "eliteComparison": "<jamforelse med elitakare pa svenska>"
  }
}
\`\`\``;
}

function buildSkatingPrompt(
  genderPronoun: string,
  experienceLevel: string,
  discipline: string,
  athleteDesc: string,
  locale: AppLocale
): string {
  if (locale === 'en') {
    return `You are an expert cross-country skiing analyst specializing in skating/free technique.
Analyze this video of a ${genderPronoun} skier.

## IMPORTANT: ANALYZE THE FULL VIDEO
You have access to the full video with multiple frames over time. Analyze the movement across the whole sequence.

## FIRST IDENTIFY WHICH SKATING VARIANT IS USED
- **V1 (offset)**: Asymmetric, one pole push per two skate steps. Used on climbs.
- **V2**: Symmetric, one pole push per skate step. Fastest variant on flat terrain.
- **V2 alternate**: Alternating pole push, one side dominates while the other relaxes. Used for recovery.

## FOCUS AREAS

### 1. Edge angles
- Left ski angle at push-off (optimal: 15-25 degrees)
- Right ski angle at push-off
- Symmetry between sides
- Push-off angle relative to ski direction

### 2. V pattern
- Width of the V pattern (too wide = energy loss)
- Frequency (cycles per second)
- Consistency over time

### 3. Pole technique
- Synchronization with leg action
- Pole angle at plant
- Timing relative to ski push-off

### 4. Hip movement
- Lateral movement (controlled side balance)
- Vertical movement (minimal is more efficient)
- Core engagement

### 5. Recovery
- Leg path during recovery
- Compact vs wide movement
- Consistency between steps

## ATHLETE PROFILE
${athleteDesc}
- Experience level: ${experienceLevel}
- Primary discipline: ${discipline}

## RESPONSE FORMAT
Return the analysis as JSON with this structure:

\`\`\`json
{
  "skatingVariant": "V1" | "V2" | "V2_ALT",
  "overallScore": <number 0-100>,
  "balanceScore": <number 0-100>,
  "timingScore": <number 0-100>,
  "efficiencyScore": <number 0-100>,
  "edgeAnalysis": {
    "leftAngle": <number degrees>,
    "rightAngle": <number degrees>,
    "symmetry": <number 0-100>,
    "pushOffAngle": <number degrees>
  },
  "vPattern": {
    "width": <number cm estimate>,
    "frequency": <number cycles per second>,
    "consistency": <number 0-100>
  },
  "poleAnalysis": {
    "plantAngle": <number degrees>,
    "timing": "EARLY" | "ON_TIME" | "LATE",
    "armSymmetry": <number 0-100>
  },
  "hipPosition": {
    "score": <number 0-100>,
    "coreEngagement": "GOOD" | "MODERATE" | "POOR"
  },
  "recovery": {
    "legPath": "COMPACT" | "WIDE" | "INCONSISTENT"
  },
  "insights": {
    "strengths": ["<strength 1 in English>", "<strength 2>"],
    "weaknesses": ["<weakness 1 in English>", "<weakness 2>"],
    "drills": [
      { "drill": "<drill name in English>", "focus": "<focus area>", "priority": 1 },
      { "drill": "<drill 2>", "focus": "<focus>", "priority": 2 }
    ],
    "eliteComparison": "<comparison to elite skiers in English>"
  }
}
\`\`\``;
  }

  return `Du ar en expertanalytiker for langdskidakning med specialisering pa skating/fristil.
Analysera denna video av en ${genderPronoun} akare.

## VIKTIGT: ANALYSERA HELA VIDEON
Du har tillgang till HELA videon med flera bildrutor over tid. Analysera rorelsen genom HELA videosekvensen.

## IDENTIFIERA FORST VILKEN SKATINGVARIANT SOM ANVANDS
- **V1 (offset)**: Asymmetrisk, ett stavtag per tva skatingsteg. Anvands i uppforsbackar.
- **V2**: Symmetrisk, ett stavtag per skatingsteg. Snabbaste varianten pa plant underlag.
- **V2-alternativ**: Vaxlande stavtag, ena sidan doms, andra relaxar. Anvands for aterhamtning.

## FOKUSOMRADEN

### 1. Kantvinklar
- Vinkel pa vanster skida vid avslag (optimal: 15-25 grader)
- Vinkel pa hoger skida vid avslag
- Symmetri mellan sidorna
- Avslutningsvinkel fran skidriktningen

### 2. V-Monster
- Bredd pa V-monstret (for brett = energiforlust)
- Frekvens (cykler per sekund)
- Konsistens over tid

### 3. Stavteknik
- Synkronisering med benarbetet
- Stavvinkel vid isattning
- Timing relativt skidavslaget

### 4. Hoftrorelse
- Lateral forflyttning (kontrollerad sidobalans)
- Vertikal rorelse (minimal = effektivare)
- Balarnas engagemang

### 5. Aterhamtning
- Benets bana under aterforning
- Kompakt vs vid rorelse
- Konsistens mellan steg

## ATLETENS PROFIL
${athleteDesc}
- Erfarenhetsniva: ${experienceLevel}
- Primar disciplin: ${discipline}

## SVARSFORMAT
Returnera analys som JSON med foljande struktur:

\`\`\`json
{
  "skatingVariant": "V1" | "V2" | "V2_ALT",
  "overallScore": <number 0-100>,
  "balanceScore": <number 0-100>,
  "timingScore": <number 0-100>,
  "efficiencyScore": <number 0-100>,
  "edgeAnalysis": {
    "leftAngle": <number degrees>,
    "rightAngle": <number degrees>,
    "symmetry": <number 0-100>,
    "pushOffAngle": <number degrees>
  },
  "vPattern": {
    "width": <number cm estimate>,
    "frequency": <number cycles per second>,
    "consistency": <number 0-100>
  },
  "poleAnalysis": {
    "plantAngle": <number degrees>,
    "timing": "EARLY" | "ON_TIME" | "LATE",
    "armSymmetry": <number 0-100>
  },
  "hipPosition": {
    "score": <number 0-100>,
    "coreEngagement": "GOOD" | "MODERATE" | "POOR"
  },
  "recovery": {
    "legPath": "COMPACT" | "WIDE" | "INCONSISTENT"
  },
  "insights": {
    "strengths": ["<styrka 1 pa svenska>", "<styrka 2>"],
    "weaknesses": ["<svaghet 1 pa svenska>", "<svaghet 2>"],
    "drills": [
      { "drill": "<ovningsnamn pa svenska>", "focus": "<fokusomrade>", "priority": 1 },
      { "drill": "<ovning 2>", "focus": "<fokus>", "priority": 2 }
    ],
    "eliteComparison": "<jamforelse med elitakare pa svenska>"
  }
}
\`\`\``;
}

function buildDoublePolePrompt(
  genderPronoun: string,
  experienceLevel: string,
  athleteDesc: string,
  locale: AppLocale
): string {
  if (locale === 'en') {
    return `You are an expert cross-country skiing analyst specializing in double poling.
Analyze this video of a ${genderPronoun} skier performing double poling.

## IMPORTANT: ANALYZE THE FULL VIDEO
You have access to the full video with multiple frames over time. Analyze the movement across the whole sequence.

## BACKGROUND
Double poling has become an increasingly important technique in modern cross-country skiing, especially after waxless skis became dominant. Efficient double-poling technique is required to be competitive at all levels.

## FOCUS AREAS

### 1. Trunk movement
- Flexion range (optimal: 45-60 degrees forward lean at maximum compression)
- Compression depth (deeper = more power, but also higher energy cost)
- Speed of the upward phase (fast recovery = higher frequency)

### 2. Pole technique
- Pole angle at plant (optimal: 75-85 degrees)
- Pole angle at release (optimal: behind horizontal)
- Force development through the full movement

### 3. Leg contribution
- Do the legs contribute to propulsion? Modern technique includes leg drive.
- Timing of leg drive relative to pole pressure
- Ankle movement for extra power

### 4. Rhythm and frequency
- Consistency of movement over time
- Frequency (cycles per second)
- Balance between power and frequency

### 5. Hip and trunk position
- Hip position through the movement
- Forward lean at the start position
- Core engagement for stability

## ATHLETE PROFILE
${athleteDesc}
- Experience level: ${experienceLevel}

## RESPONSE FORMAT
Return the analysis as JSON with this structure:

\`\`\`json
{
  "overallScore": <number 0-100>,
  "powerScore": <number 0-100>,
  "rhythmScore": <number 0-100>,
  "efficiencyScore": <number 0-100>,
  "trunkAnalysis": {
    "flexionRange": <number degrees>,
    "compressionDepth": "SHALLOW" | "OPTIMAL" | "EXCESSIVE",
    "returnSpeed": "FAST" | "MODERATE" | "SLOW"
  },
  "poleAnalysis": {
    "plantAngle": <number degrees>,
    "releaseAngle": <number degrees>,
    "forceApplication": "GOOD" | "WEAK" | "INCONSISTENT"
  },
  "legDrive": {
    "contribution": "SIGNIFICANT" | "MODERATE" | "MINIMAL",
    "timing": "SYNCHRONIZED" | "EARLY" | "LATE"
  },
  "rhythm": {
    "consistency": <number 0-100>,
    "frequency": <number cycles per second>
  },
  "hipPosition": {
    "score": <number 0-100>,
    "forwardLean": <number degrees>
  },
  "insights": {
    "strengths": ["<strength 1 in English>", "<strength 2>"],
    "weaknesses": ["<weakness 1 in English>", "<weakness 2>"],
    "drills": [
      { "drill": "<drill name in English>", "focus": "<focus area>", "priority": 1 },
      { "drill": "<drill 2>", "focus": "<focus>", "priority": 2 }
    ],
    "eliteComparison": "<comparison to elite skiers in English>"
  }
}
\`\`\``;
  }

  return `Du ar en expertanalytiker for langdskidakning med specialisering pa dubbelstakning.
Analysera denna video av en ${genderPronoun} akare som utfor dubbelstakning.

## VIKTIGT: ANALYSERA HELA VIDEON
Du har tillgang till HELA videon med flera bildrutor over tid. Analysera rorelsen genom HELA videosekvensen.

## BAKGRUND
Dubbelstakning har blivit en allt viktigare teknik i modern langdskidakning, sarskilt efter att vallningsfria skidor blivit dominerande. En effektiv dubbelstakningsteknik kravs for att vara konkurrenskraftig pa alla nivaer.

## FOKUSOMRADEN

### 1. Balrorelse
- Flexionsomrade (optimal: 45-60 grader framatlutning vid maximal kompression)
- Kompressionsdjup (djupare = mer kraft, men ocksa mer energikravande)
- Hastighet pa uppgaende fas (snabb aterhamtning = hogre frekvens)

### 2. Stavteknik
- Stavvinkel vid isattning (optimal: 75-85 grader)
- Stavvinkel vid avslut (optimal: bakom horisontell)
- Kraftutveckling genom hela rorelsen

### 3. Bentillskott
- Bidrar benen till framdrivningen? (Modern teknik inkluderar bentryck)
- Timing av bentrycket relativt stavtrycket
- Fotledsrorelse for extra kraft

### 4. Rytm och Frekvens
- Konsistens i rorelsen over tid
- Frekvens (cykler per sekund)
- Avvagning mellan kraft och frekvens

### 5. Hoft- och Balposition
- Hoftens position genom rorelsen
- Framatlutning (startposition)
- Balarnas engagemang for stabilitet

## ATLETENS PROFIL
${athleteDesc}
- Erfarenhetsniva: ${experienceLevel}

## SVARSFORMAT
Returnera analys som JSON med foljande struktur:

\`\`\`json
{
  "overallScore": <number 0-100>,
  "powerScore": <number 0-100>,
  "rhythmScore": <number 0-100>,
  "efficiencyScore": <number 0-100>,
  "trunkAnalysis": {
    "flexionRange": <number degrees>,
    "compressionDepth": "SHALLOW" | "OPTIMAL" | "EXCESSIVE",
    "returnSpeed": "FAST" | "MODERATE" | "SLOW"
  },
  "poleAnalysis": {
    "plantAngle": <number degrees>,
    "releaseAngle": <number degrees>,
    "forceApplication": "GOOD" | "WEAK" | "INCONSISTENT"
  },
  "legDrive": {
    "contribution": "SIGNIFICANT" | "MODERATE" | "MINIMAL",
    "timing": "SYNCHRONIZED" | "EARLY" | "LATE"
  },
  "rhythm": {
    "consistency": <number 0-100>,
    "frequency": <number cycles per second>
  },
  "hipPosition": {
    "score": <number 0-100>,
    "forwardLean": <number degrees>
  },
  "insights": {
    "strengths": ["<styrka 1 pa svenska>", "<styrka 2>"],
    "weaknesses": ["<svaghet 1 pa svenska>", "<svaghet 2>"],
    "drills": [
      { "drill": "<ovningsnamn pa svenska>", "focus": "<fokusomrade>", "priority": 1 },
      { "drill": "<ovning 2>", "focus": "<fokus>", "priority": 2 }
    ],
    "eliteComparison": "<jamforelse med elitakare pa svenska>"
  }
}
\`\`\``;
}

/**
 * Get the recommended FPS for skiing video analysis
 */
export function getSkiingFPS(videoType: SkiingTechniqueType): number {
  switch (videoType) {
    case 'SKIING_CLASSIC':
      return 8; // Fast cyclic motion, need detail
    case 'SKIING_SKATING':
      return 8; // Fast lateral movement
    case 'SKIING_DOUBLE_POLE':
      return 6; // Less lateral movement, slightly lower
    default:
      return 6;
  }
}

/**
 * Check if a video type is a skiing type
 */
export function isSkiingVideoType(videoType: string): videoType is SkiingTechniqueType {
  return ['SKIING_CLASSIC', 'SKIING_SKATING', 'SKIING_DOUBLE_POLE'].includes(videoType);
}

/**
 * Map video type to technique type for database
 */
export function getSkiingTechniqueType(videoType: SkiingTechniqueType): string {
  switch (videoType) {
    case 'SKIING_CLASSIC':
      return 'CLASSIC';
    case 'SKIING_SKATING':
      return 'SKATING';
    case 'SKIING_DOUBLE_POLE':
      return 'DOUBLE_POLE';
    default:
      return 'CLASSIC';
  }
}
