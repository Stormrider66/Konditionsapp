import { z } from 'zod';

// Pole Analysis Schema (common across all techniques)
export const skiingPoleAnalysisSchema = z.object({
  plantAngle: z.number().optional(),
  releaseAngle: z.number().optional(),
  timing: z.enum(['EARLY', 'ON_TIME', 'LATE']).optional(),
  forceApplication: z.enum(['GOOD', 'WEAK', 'INCONSISTENT']).optional(),
  armSymmetry: z.number().min(0).max(100).optional(),
});

// Hip Analysis Schema (common across all techniques)
export const skiingHipAnalysisSchema = z.object({
  score: z.number().min(0).max(100).optional(),
  heightConsistency: z.number().min(0).max(100).optional(),
  forwardLean: z.number().optional(),
  coreEngagement: z.enum(['GOOD', 'MODERATE', 'POOR']).optional(),
});

// Weight Transfer Schema
export const skiingWeightTransferSchema = z.object({
  score: z.number().min(0).max(100).optional(),
  timing: z.enum(['EARLY', 'ON_TIME', 'LATE']).optional(),
  lateralStability: z.number().min(0).max(100).optional(),
});

// Drill Schema
export const skiingDrillSchema = z.object({
  drill: z.string(),
  focus: z.string(),
  priority: z.number().min(1).max(10),
});

// Insights Schema
export const skiingInsightsSchema = z.object({
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  drills: z.array(skiingDrillSchema),
  eliteComparison: z.string().optional(),
});

// Classic-specific schemas
export const classicKickAnalysisSchema = z.object({
  timingScore: z.number().min(0).max(100).optional(),
  extension: z.enum(['FULL', 'PARTIAL', 'INCOMPLETE']).optional(),
  waxPocketEngagement: z.enum(['GOOD', 'PARTIAL', 'POOR']).optional(),
});

export const classicGlidePhaseSchema = z.object({
  duration: z.number().optional(),
  legRecovery: z.enum(['EFFICIENT', 'MODERATE', 'INEFFICIENT']).optional(),
});

// Classic Analysis Response Schema
export const classicAnalysisResponseSchema = z.object({
  overallScore: z.number().min(0).max(100),
  balanceScore: z.number().min(0).max(100),
  timingScore: z.number().min(0).max(100),
  efficiencyScore: z.number().min(0).max(100),
  poleAnalysis: skiingPoleAnalysisSchema,
  kickAnalysis: classicKickAnalysisSchema,
  weightTransfer: skiingWeightTransferSchema,
  hipPosition: skiingHipAnalysisSchema,
  glidePhase: classicGlidePhaseSchema,
  insights: skiingInsightsSchema,
});

// Skating-specific schemas
export const skatingEdgeAnalysisSchema = z.object({
  leftAngle: z.number().optional(),
  rightAngle: z.number().optional(),
  symmetry: z.number().min(0).max(100).optional(),
  pushOffAngle: z.number().optional(),
});

export const skatingVPatternSchema = z.object({
  width: z.number().optional(),
  frequency: z.number().optional(),
  consistency: z.number().min(0).max(100).optional(),
});

export const skatingRecoverySchema = z.object({
  legPath: z.enum(['COMPACT', 'WIDE', 'INCONSISTENT']).optional(),
});

// Skating Analysis Response Schema
export const skatingAnalysisResponseSchema = z.object({
  skatingVariant: z.enum(['V1', 'V2', 'V2_ALT']),
  overallScore: z.number().min(0).max(100),
  balanceScore: z.number().min(0).max(100),
  timingScore: z.number().min(0).max(100),
  efficiencyScore: z.number().min(0).max(100),
  edgeAnalysis: skatingEdgeAnalysisSchema,
  vPattern: skatingVPatternSchema,
  poleAnalysis: skiingPoleAnalysisSchema,
  hipPosition: skiingHipAnalysisSchema,
  recovery: skatingRecoverySchema,
  insights: skiingInsightsSchema,
});

// Double Pole-specific schemas
export const doublePoleTrunkAnalysisSchema = z.object({
  flexionRange: z.number().optional(),
  compressionDepth: z.enum(['SHALLOW', 'OPTIMAL', 'EXCESSIVE']).optional(),
  returnSpeed: z.enum(['FAST', 'MODERATE', 'SLOW']).optional(),
});

export const doublePoleRhythmSchema = z.object({
  consistency: z.number().min(0).max(100).optional(),
  frequency: z.number().optional(),
});

export const doublePoleLegsSchema = z.object({
  contribution: z.enum(['SIGNIFICANT', 'MODERATE', 'MINIMAL']).optional(),
  timing: z.enum(['SYNCHRONIZED', 'EARLY', 'LATE']).optional(),
});

// Double Pole Analysis Response Schema
export const doublePoleAnalysisResponseSchema = z.object({
  overallScore: z.number().min(0).max(100),
  powerScore: z.number().min(0).max(100),
  rhythmScore: z.number().min(0).max(100),
  efficiencyScore: z.number().min(0).max(100),
  trunkAnalysis: doublePoleTrunkAnalysisSchema,
  poleAnalysis: skiingPoleAnalysisSchema,
  legDrive: doublePoleLegsSchema,
  rhythm: doublePoleRhythmSchema,
  hipPosition: skiingHipAnalysisSchema,
  insights: skiingInsightsSchema,
});

// Type exports
export type SkiingPoleAnalysis = z.infer<typeof skiingPoleAnalysisSchema>;
export type SkiingHipAnalysis = z.infer<typeof skiingHipAnalysisSchema>;
export type SkiingWeightTransfer = z.infer<typeof skiingWeightTransferSchema>;
export type SkiingDrill = z.infer<typeof skiingDrillSchema>;
export type SkiingInsights = z.infer<typeof skiingInsightsSchema>;

export type ClassicKickAnalysis = z.infer<typeof classicKickAnalysisSchema>;
export type ClassicGlidePhase = z.infer<typeof classicGlidePhaseSchema>;
export type ClassicAnalysisResponse = z.infer<typeof classicAnalysisResponseSchema>;

export type SkatingEdgeAnalysis = z.infer<typeof skatingEdgeAnalysisSchema>;
export type SkatingVPattern = z.infer<typeof skatingVPatternSchema>;
export type SkatingRecovery = z.infer<typeof skatingRecoverySchema>;
export type SkatingAnalysisResponse = z.infer<typeof skatingAnalysisResponseSchema>;

export type DoublePoleTrunkAnalysis = z.infer<typeof doublePoleTrunkAnalysisSchema>;
export type DoublePoleRhythm = z.infer<typeof doublePoleRhythmSchema>;
export type DoublePoleLegs = z.infer<typeof doublePoleLegsSchema>;
export type DoublePoleAnalysisResponse = z.infer<typeof doublePoleAnalysisResponseSchema>;

/**
 * Parse and validate skiing analysis response
 */
export function parseSkiingAnalysisResponse(
  videoType: string,
  jsonString: string
): ClassicAnalysisResponse | SkatingAnalysisResponse | DoublePoleAnalysisResponse | null {
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

    switch (videoType) {
      case 'SKIING_CLASSIC':
        return classicAnalysisResponseSchema.parse(parsed);
      case 'SKIING_SKATING':
        return skatingAnalysisResponseSchema.parse(parsed);
      case 'SKIING_DOUBLE_POLE':
        return doublePoleAnalysisResponseSchema.parse(parsed);
      default:
        console.warn(`Unknown skiing video type: ${videoType}`);
        return null;
    }
  } catch (error) {
    console.error('Failed to parse skiing analysis response:', error);
    console.error('Raw response:', jsonString.substring(0, 500));
    return null;
  }
}

/**
 * Get default values for skiing analysis (used when parsing fails)
 */
export function getDefaultSkiingAnalysis(videoType: string): Partial<ClassicAnalysisResponse | SkatingAnalysisResponse | DoublePoleAnalysisResponse> {
  const baseDefaults = {
    overallScore: 50,
    balanceScore: 50,
    timingScore: 50,
    efficiencyScore: 50,
    poleAnalysis: {},
    hipPosition: {},
    insights: {
      strengths: [],
      weaknesses: [],
      drills: [],
    },
  };

  switch (videoType) {
    case 'SKIING_CLASSIC':
      return {
        ...baseDefaults,
        kickAnalysis: {},
        weightTransfer: {},
        glidePhase: {},
      } as Partial<ClassicAnalysisResponse>;
    case 'SKIING_SKATING':
      return {
        ...baseDefaults,
        skatingVariant: 'V2' as const,
        edgeAnalysis: {},
        vPattern: {},
        recovery: {},
      } as Partial<SkatingAnalysisResponse>;
    case 'SKIING_DOUBLE_POLE':
      return {
        ...baseDefaults,
        powerScore: 50,
        rhythmScore: 50,
        trunkAnalysis: {},
        legDrive: {},
        rhythm: {},
      } as Partial<DoublePoleAnalysisResponse>;
    default:
      return baseDefaults;
  }
}
