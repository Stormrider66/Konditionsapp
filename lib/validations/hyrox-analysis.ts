import { z } from 'zod';

// Common schemas
const breathingPatternSchema = z.enum(['GOOD', 'INCONSISTENT', 'POOR']);

const fatigueIndicatorsSchema = z.object({
  earlyPhase: z.array(z.string()),
  latePhase: z.array(z.string()),
}).optional();

const drillSchema = z.object({
  drill: z.string(),
  focus: z.string(),
  priority: z.number().min(1).max(10),
});

const insightsSchema = z.object({
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  drills: z.array(drillSchema),
  raceStrategyTips: z.array(z.string()),
});

// Base analysis schema (common to all stations)
const baseAnalysisSchema = z.object({
  overallScore: z.number().min(0).max(100),
  efficiencyScore: z.number().min(0).max(100),
  formScore: z.number().min(0).max(100),
  paceConsistency: z.number().min(0).max(100),
  coreStability: z.number().min(0).max(100),
  breathingPattern: breathingPatternSchema,
  movementCadence: z.number(),
  fatigueIndicators: fatigueIndicatorsSchema,
  insights: insightsSchema,
});

// SkiErg specific
export const skiErgAnalysisSchema = baseAnalysisSchema.extend({
  pullLength: z.enum(['SHORT', 'OPTIMAL', 'LONG']),
  hipHingeDepth: z.enum(['SHALLOW', 'OPTIMAL', 'EXCESSIVE']),
  armExtension: z.enum(['INCOMPLETE', 'FULL', 'OVEREXTENDED']),
  legDriveContribution: z.enum(['MINIMAL', 'MODERATE', 'SIGNIFICANT']),
});

// Sled Push specific
export const sledPushAnalysisSchema = baseAnalysisSchema.extend({
  bodyAngle: z.number(),
  armLockout: z.enum(['BENT', 'LOCKED', 'OVEREXTENDED']),
  strideLength: z.enum(['SHORT', 'OPTIMAL', 'OVERSTRIDING']),
  drivePhase: z.enum(['WEAK', 'GOOD', 'POWERFUL']),
});

// Sled Pull specific
export const sledPullAnalysisSchema = baseAnalysisSchema.extend({
  pullTechnique: z.enum(['ARM_DOMINANT', 'HIP_DRIVEN', 'MIXED']),
  ropePath: z.enum(['STRAIGHT', 'DIAGONAL', 'INCONSISTENT']),
  anchorStability: z.enum(['STABLE', 'SHIFTING', 'UNSTABLE']),
});

// Burpee Broad Jump specific
export const burpeeBroadJumpAnalysisSchema = baseAnalysisSchema.extend({
  burpeeDepth: z.enum(['SHALLOW', 'FULL', 'EXCESSIVE']),
  jumpDistance: z.enum(['SHORT', 'GOOD', 'EXCELLENT']),
  transitionSpeed: z.enum(['SLOW', 'MODERATE', 'FAST']),
  landingMechanics: z.enum(['POOR', 'ACCEPTABLE', 'GOOD']),
});

// Rowing specific
export const rowingAnalysisSchema = baseAnalysisSchema.extend({
  driveSequence: z.enum(['CORRECT', 'ARMS_EARLY', 'BACK_EARLY']),
  laybackAngle: z.number(),
  catchPosition: z.enum(['COMPRESSED', 'OPTIMAL', 'OVERREACHING']),
  strokeRate: z.number(),
  powerApplication: z.enum(['FRONT_LOADED', 'EVEN', 'BACK_LOADED']),
});

// Farmers Carry specific
export const farmersCarryAnalysisSchema = baseAnalysisSchema.extend({
  shoulderPack: z.enum(['ELEVATED', 'PACKED', 'DEPRESSED']),
  trunkPosture: z.enum(['UPRIGHT', 'LEANING', 'SWAYING']),
  stridePattern: z.enum(['SHORT_CHOPPY', 'SMOOTH', 'OVERSTRIDING']),
  gripFatigue: z.enum(['NONE', 'MODERATE', 'SIGNIFICANT']),
});

// Sandbag Lunge specific
export const sandbagLungeAnalysisSchema = baseAnalysisSchema.extend({
  bagPosition: z.enum(['HIGH_CHEST', 'SHOULDER', 'DROPPING']),
  kneeTracking: z.enum(['GOOD', 'VALGUS', 'VARUS']),
  stepLength: z.enum(['SHORT', 'OPTIMAL', 'OVERSTRIDING']),
  torsoPosition: z.enum(['UPRIGHT', 'FORWARD_LEAN', 'EXCESSIVE_LEAN']),
});

// Wall Balls specific
export const wallBallsAnalysisSchema = baseAnalysisSchema.extend({
  squatDepth: z.enum(['SHALLOW', 'PARALLEL', 'DEEP']),
  throwMechanics: z.enum(['ARM_DOMINANT', 'HIP_DRIVEN', 'COORDINATED']),
  wallBallCatchHeight: z.enum(['HIGH', 'OPTIMAL', 'LOW']),
  rhythmConsistency: z.number().min(0).max(100),
});

// Type exports
export type SkiErgAnalysis = z.infer<typeof skiErgAnalysisSchema>;
export type SledPushAnalysis = z.infer<typeof sledPushAnalysisSchema>;
export type SledPullAnalysis = z.infer<typeof sledPullAnalysisSchema>;
export type BurpeeBroadJumpAnalysis = z.infer<typeof burpeeBroadJumpAnalysisSchema>;
export type RowingAnalysis = z.infer<typeof rowingAnalysisSchema>;
export type FarmersCarryAnalysis = z.infer<typeof farmersCarryAnalysisSchema>;
export type SandbagLungeAnalysis = z.infer<typeof sandbagLungeAnalysisSchema>;
export type WallBallsAnalysis = z.infer<typeof wallBallsAnalysisSchema>;

export type HyroxStationAnalysisResult =
  | SkiErgAnalysis
  | SledPushAnalysis
  | SledPullAnalysis
  | BurpeeBroadJumpAnalysis
  | RowingAnalysis
  | FarmersCarryAnalysis
  | SandbagLungeAnalysis
  | WallBallsAnalysis;

/**
 * Parse and validate HYROX station analysis response
 */
export function parseHyroxAnalysisResponse(
  stationType: string,
  jsonString: string
): HyroxStationAnalysisResult | null {
  try {
    // Extract JSON from markdown code blocks if present
    let cleanJson = jsonString;
    const jsonMatch = jsonString.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      cleanJson = jsonMatch[1];
    } else {
      // Try to find raw JSON object
      const objectMatch = jsonString.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        cleanJson = objectMatch[0];
      }
    }

    const parsed = JSON.parse(cleanJson);

    switch (stationType) {
      case 'SKIERG':
        return skiErgAnalysisSchema.parse(parsed);
      case 'SLED_PUSH':
        return sledPushAnalysisSchema.parse(parsed);
      case 'SLED_PULL':
        return sledPullAnalysisSchema.parse(parsed);
      case 'BURPEE_BROAD_JUMP':
        return burpeeBroadJumpAnalysisSchema.parse(parsed);
      case 'ROWING':
        return rowingAnalysisSchema.parse(parsed);
      case 'FARMERS_CARRY':
        return farmersCarryAnalysisSchema.parse(parsed);
      case 'SANDBAG_LUNGE':
        return sandbagLungeAnalysisSchema.parse(parsed);
      case 'WALL_BALLS':
        return wallBallsAnalysisSchema.parse(parsed);
      default:
        console.warn(`Unknown HYROX station type: ${stationType}`);
        return null;
    }
  } catch (error) {
    console.error('Failed to parse HYROX analysis response:', error);
    console.error('Raw response:', jsonString.substring(0, 500));
    return null;
  }
}

/**
 * Get default values for HYROX analysis (used when parsing fails)
 */
export function getDefaultHyroxAnalysis(): Partial<HyroxStationAnalysisResult> {
  return {
    overallScore: 50,
    efficiencyScore: 50,
    formScore: 50,
    paceConsistency: 50,
    coreStability: 50,
    breathingPattern: 'INCONSISTENT',
    movementCadence: 0,
    insights: {
      strengths: [],
      weaknesses: [],
      drills: [],
      raceStrategyTips: [],
    },
  };
}
