/**
 * Gemini 3 Pro Function Calling / Tool Use
 *
 * Native tool definitions for AI-assisted coaching actions.
 * These tools allow the AI to take structured actions during conversations.
 */

import { tool } from 'ai';
import { z } from 'zod';

/**
 * Tool: Modify Workout
 * Allows AI to suggest/apply workout modifications based on context
 */
export const modifyWorkoutTool = tool({
  description: 'Modify an athlete workout based on readiness, injury, or periodization needs. Use this when the athlete needs their workout adjusted.',
  inputSchema: z.object({
    workoutId: z.string().describe('ID of the workout to modify'),
    modificationType: z.enum([
      'REDUCE_INTENSITY',
      'REDUCE_VOLUME',
      'SWAP_EXERCISE',
      'SKIP',
      'POSTPONE',
    ]).describe('Type of modification to apply'),
    reason: z.string().describe('Reason for the modification in Swedish'),
    newIntensityPercent: z.number().min(0).max(100).optional().describe('New intensity as percentage of original'),
    newVolumePercent: z.number().min(0).max(100).optional().describe('New volume as percentage of original'),
    alternativeExercise: z.string().optional().describe('Alternative exercise name if swapping'),
  }),
  execute: async ({ workoutId, modificationType, reason, newIntensityPercent, newVolumePercent, alternativeExercise }) => {
    // Return modification suggestion - coach approval happens in UI
    // Database integration can be added when the schema is extended with AI suggestion fields
    return {
      success: true,
      suggestion: {
        workoutId,
        modificationType,
        reason,
        newIntensityPercent,
        newVolumePercent,
        alternativeExercise,
        createdAt: new Date().toISOString(),
        status: 'PENDING_APPROVAL',
      },
      message: `Föreslagen ändring: ${modificationType}. ${reason}`,
    };
  },
});

/**
 * Tool: Create Alert
 * Allows AI to flag concerns for coach attention
 */
export const createAlertTool = tool({
  description: 'Create an alert for the coach about an athlete concern. Use this when you detect overtraining risk, injury signs, or other important patterns.',
  inputSchema: z.object({
    athleteId: z.string().describe('ID of the athlete'),
    alertType: z.enum([
      'OVERTRAINING_RISK',
      'INJURY_WARNING',
      'LOW_READINESS',
      'PLATEAU_DETECTED',
      'MILESTONE_ACHIEVED',
      'NUTRITION_CONCERN',
      'RECOVERY_ISSUE',
    ]).describe('Type of alert'),
    urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).describe('Urgency level'),
    title: z.string().describe('Short alert title in Swedish'),
    message: z.string().describe('Detailed alert message in Swedish'),
    recommendedAction: z.string().describe('What the coach should consider doing'),
    dataPoints: z.array(z.object({
      metric: z.string(),
      value: z.string(),
      trend: z.enum(['IMPROVING', 'STABLE', 'DECLINING']).optional(),
    })).optional().describe('Supporting data points'),
  }),
  execute: async ({ athleteId, alertType, urgency, title, message, recommendedAction, dataPoints }) => {
    // Store alert in database (would need Alert model in schema)
    // For now, return the structured alert
    return {
      success: true,
      alert: {
        athleteId,
        alertType,
        urgency,
        title,
        message,
        recommendedAction,
        dataPoints,
        createdAt: new Date().toISOString(),
      },
      message: `Varning skapad: ${title}`,
    };
  },
});

/**
 * Tool: Suggest Pace/Load Progression
 * Allows AI to recommend training progressions
 */
export const suggestProgressionTool = tool({
  description: 'Suggest a training progression update based on athlete performance data. Use this when data indicates the athlete is ready for progression.',
  inputSchema: z.object({
    athleteId: z.string().describe('ID of the athlete'),
    progressionType: z.enum(['PACE', 'LOAD', 'VOLUME', 'FREQUENCY', 'INTENSITY']).describe('Type of progression'),
    currentValue: z.number().describe('Current training value'),
    suggestedValue: z.number().describe('Suggested new value'),
    unit: z.string().describe('Unit of measurement (e.g., "min/km", "kg", "km/week")'),
    rationale: z.string().describe('Explanation for the progression in Swedish'),
    confidence: z.number().min(0).max(1).describe('Confidence in the suggestion (0-1)'),
    basedOn: z.array(z.string()).describe('Data sources used for this suggestion'),
  }),
  execute: async ({ athleteId, progressionType, currentValue, suggestedValue, unit, rationale, confidence, basedOn }) => {
    const percentChange = ((suggestedValue - currentValue) / currentValue * 100).toFixed(1);

    return {
      success: true,
      suggestion: {
        athleteId,
        progressionType,
        currentValue,
        suggestedValue,
        unit,
        percentChange: `${percentChange}%`,
        rationale,
        confidence,
        basedOn,
        createdAt: new Date().toISOString(),
      },
      message: `Progression föreslagen: ${progressionType} ${currentValue}${unit} → ${suggestedValue}${unit} (${percentChange}%)`,
    };
  },
});

/**
 * Tool: Calculate Training Zones
 * Allows AI to recalculate zones based on new test data
 */
export const calculateZonesTool = tool({
  description: 'Calculate or recalculate training zones based on test results or performance data.',
  inputSchema: z.object({
    athleteId: z.string().describe('ID of the athlete'),
    zoneSystem: z.enum(['5_ZONE', 'DANIELS', 'NORWEGIAN', 'POLARIZED']).describe('Zone system to use'),
    baseMetric: z.enum(['LACTATE_THRESHOLD', 'VDOT', 'MAX_HR', 'FTP']).describe('Base metric for calculation'),
    baseValue: z.number().describe('Value of the base metric'),
    baseUnit: z.string().describe('Unit of the base metric'),
  }),
  execute: async ({ athleteId, zoneSystem, baseMetric, baseValue, baseUnit }) => {
    // Calculate zones based on the metric
    // This is a simplified example - real implementation would use proper zone calculations

    let zones: { zone: string; min: number; max: number; description: string }[] = [];

    if (zoneSystem === '5_ZONE' && baseMetric === 'MAX_HR') {
      const maxHR = baseValue;
      zones = [
        { zone: 'Z1', min: Math.round(maxHR * 0.50), max: Math.round(maxHR * 0.60), description: 'Aktiv vila' },
        { zone: 'Z2', min: Math.round(maxHR * 0.60), max: Math.round(maxHR * 0.70), description: 'Aerob bas' },
        { zone: 'Z3', min: Math.round(maxHR * 0.70), max: Math.round(maxHR * 0.80), description: 'Tempo' },
        { zone: 'Z4', min: Math.round(maxHR * 0.80), max: Math.round(maxHR * 0.90), description: 'Tröskel' },
        { zone: 'Z5', min: Math.round(maxHR * 0.90), max: maxHR, description: 'VO2max' },
      ];
    }

    return {
      success: true,
      zones: {
        athleteId,
        zoneSystem,
        baseMetric,
        baseValue,
        baseUnit,
        calculatedZones: zones,
        calculatedAt: new Date().toISOString(),
      },
      message: `${zoneSystem} zoner beräknade baserat på ${baseMetric}: ${baseValue}${baseUnit}`,
    };
  },
});

/**
 * Tool: Search Knowledge Base
 * Allows AI to search uploaded documents for relevant information
 */
export const searchKnowledgeTool = tool({
  description: 'Search the knowledge base for relevant training information, scientific studies, or methodology documentation.',
  inputSchema: z.object({
    query: z.string().describe('Search query'),
    maxResults: z.number().min(1).max(10).default(5).describe('Maximum number of results'),
    documentTypes: z.array(z.enum(['PDF', 'METHODOLOGY', 'STUDY', 'PROTOCOL'])).optional().describe('Filter by document type'),
  }),
  execute: async ({ query, maxResults, documentTypes }) => {
    // This would integrate with the RAG system
    // For now, return a placeholder that indicates the search was performed
    return {
      success: true,
      query,
      results: [],
      message: `Sökte kunskapsdatabasen för: "${query}"`,
      note: 'Knowledge base search integration pending',
    };
  },
});

/**
 * Get all available tools for Gemini function calling
 */
export function getCoachingTools() {
  return {
    modifyWorkout: modifyWorkoutTool,
    createAlert: createAlertTool,
    suggestProgression: suggestProgressionTool,
    calculateZones: calculateZonesTool,
    searchKnowledge: searchKnowledgeTool,
  };
}

/**
 * Tool execution results type
 */
export interface ToolExecutionResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  error?: string;
}
