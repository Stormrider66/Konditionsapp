/**
 * Gemini 3 Pro Structured Output Schemas
 *
 * Zod schemas for use with generateObject() in Vercel AI SDK.
 * These schemas define the structured output format for AI responses.
 */

import { z } from 'zod';

// ==================== Running Gait Analysis Schema ====================

/**
 * Structured output schema for running gait video analysis.
 * Used with Gemini 3 Pro's generateObject() for form-fitted analysis.
 */
export const RunningGaitAnalysisSchema = z.object({
  biometrics: z.object({
    estimatedCadence: z
      .number()
      .min(120)
      .max(220)
      .describe('Steps per minute (typical range: 160-190 for trained runners)'),
    groundContactTime: z
      .enum(['SHORT', 'NORMAL', 'LONG'])
      .describe('Ground contact time classification'),
    verticalOscillation: z
      .enum(['MINIMAL', 'MODERATE', 'EXCESSIVE'])
      .describe('Vertical movement of center of mass'),
    strideLength: z
      .enum(['SHORT', 'OPTIMAL', 'OVERSTRIDING'])
      .describe('Stride length assessment relative to height/pace'),
    footStrike: z
      .enum(['HEEL', 'MIDFOOT', 'FOREFOOT'])
      .describe('Initial foot contact pattern'),
  }),

  asymmetry: z.object({
    overallPercent: z
      .number()
      .min(0)
      .max(30)
      .describe('Overall left/right asymmetry percentage (>10% is concerning)'),
    significantDifferences: z
      .array(z.string())
      .describe('List of significant asymmetries observed (e.g., "Right hip drop")'),
  }),

  injuryRiskAnalysis: z.object({
    riskScore: z
      .number()
      .min(0)
      .max(10)
      .describe('Overall injury risk score (0=low, 10=high)'),
    detectedCompensations: z.array(
      z.object({
        issue: z.string().describe('Name of the compensation pattern'),
        severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
        observation: z.string().describe('What was observed in the video'),
        timestamp: z.string().describe('Timestamp in video (e.g., "00:14")'),
      })
    ),
    posteriorChainEngagement: z
      .boolean()
      .describe('Whether posterior chain (glutes, hamstrings) appears well-engaged'),
  }),

  efficiency: z.object({
    rating: z.enum(['EXCELLENT', 'GOOD', 'MODERATE', 'POOR']),
    score: z.number().min(0).max(100).describe('Running efficiency score'),
    energyLeakages: z.array(
      z.object({
        type: z.string().describe('Type of energy leakage'),
        description: z.string().describe('Description of the issue'),
        impactLevel: z.enum(['MINOR', 'MODERATE', 'SIGNIFICANT']),
      })
    ),
  }),

  coachingCues: z.object({
    immediateCorrection: z
      .string()
      .describe('Primary cue to give athlete immediately (in Swedish)'),
    drillRecommendation: z
      .string()
      .describe('Specific drill to address main issue'),
    strengthFocus: z
      .array(z.string())
      .describe('Muscle groups to prioritize in strength training'),
  }),

  overallScore: z
    .number()
    .min(0)
    .max(100)
    .describe('Overall form score (0-100)'),
  summary: z
    .string()
    .describe('Summary of analysis in Swedish'),
});

export type RunningGaitAnalysisResult = z.infer<typeof RunningGaitAnalysisSchema>;

// ==================== Audio Journal Extraction Schema ====================

/**
 * Schema for extracting structured wellness data from voice recordings.
 * Used to parse athlete's spoken daily check-in.
 */
export const AudioExtractionSchema = z.object({
  transcription: z
    .string()
    .describe('Full transcription of the audio recording'),

  wellness: z.object({
    sleepQuality: z
      .number()
      .min(1)
      .max(10)
      .optional()
      .describe('Sleep quality rating if mentioned (1=terrible, 10=perfect)'),
    sleepHours: z
      .number()
      .min(0)
      .max(14)
      .optional()
      .describe('Hours of sleep if mentioned'),
    fatigue: z
      .number()
      .min(1)
      .max(10)
      .optional()
      .describe('Fatigue level if mentioned (1=none, 10=extreme)'),
    soreness: z
      .number()
      .min(1)
      .max(10)
      .optional()
      .describe('Muscle soreness level if mentioned (1=none, 10=severe)'),
    sorenessLocation: z
      .string()
      .optional()
      .describe('Body part mentioned for soreness'),
    stress: z
      .number()
      .min(1)
      .max(10)
      .optional()
      .describe('Stress level if mentioned (1=none, 10=extreme)'),
    mood: z
      .number()
      .min(1)
      .max(10)
      .optional()
      .describe('Mood rating if mentioned (1=terrible, 10=excellent)'),
    motivation: z
      .number()
      .min(1)
      .max(10)
      .optional()
      .describe('Motivation level if mentioned (1=none, 10=extremely motivated)'),
    rpe: z
      .number()
      .min(1)
      .max(10)
      .optional()
      .describe('RPE from yesterday if mentioned'),
  }),

  physicalSymptoms: z.array(
    z.object({
      symptom: z.string().describe('Name of symptom'),
      severity: z.enum(['MILD', 'MODERATE', 'SEVERE']),
      location: z.string().optional().describe('Body location if applicable'),
    })
  ),

  trainingNotes: z.object({
    yesterdayPerformance: z
      .string()
      .optional()
      .describe('Comments about yesterday training'),
    plannedAdjustments: z
      .string()
      .optional()
      .describe('Any planned changes mentioned'),
    concerns: z.array(z.string()).describe('Any concerns or worries expressed'),
  }),

  aiInterpretation: z.object({
    readinessEstimate: z
      .number()
      .min(1)
      .max(10)
      .describe('AI-estimated readiness score based on audio content'),
    recommendedAction: z
      .enum(['PROCEED', 'REDUCE', 'EASY', 'REST'])
      .describe('Recommended training action'),
    flaggedConcerns: z
      .array(z.string())
      .describe('Any concerns that should be flagged for coach attention'),
    keyInsights: z
      .array(z.string())
      .describe('Key insights extracted from the audio'),
  }),

  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence in extraction accuracy (0-1)'),
});

export type AudioExtractionResult = z.infer<typeof AudioExtractionSchema>;

// ==================== Menstrual Cycle Insights Schema ====================

/**
 * Schema for AI-generated menstrual cycle insights and training recommendations.
 */
export const CycleInsightsSchema = z.object({
  currentPhase: z.object({
    phase: z.enum(['MENSTRUAL', 'FOLLICULAR', 'OVULATORY', 'LUTEAL']),
    dayInPhase: z.number().describe('Day number within current phase'),
    daysRemaining: z.number().describe('Estimated days until next phase'),
    hormonalStatus: z
      .string()
      .describe('Brief description of hormonal status'),
  }),

  trainingRecommendations: z.object({
    intensityModifier: z
      .number()
      .min(0.5)
      .max(1.2)
      .describe('Multiplier for training intensity (1.0 = normal)'),
    volumeModifier: z
      .number()
      .min(0.5)
      .max(1.2)
      .describe('Multiplier for training volume (1.0 = normal)'),
    recoveryEmphasis: z
      .enum(['NORMAL', 'INCREASED', 'HIGH'])
      .describe('How much to emphasize recovery'),
    focusAreas: z
      .array(z.string())
      .describe('Training aspects to focus on this phase'),
    avoidanceAreas: z
      .array(z.string())
      .describe('Training aspects to minimize this phase'),
    nutritionNotes: z
      .array(z.string())
      .describe('Nutrition considerations for this phase'),
  }),

  predictedSymptoms: z.array(
    z.object({
      symptom: z.string(),
      likelihood: z.number().min(0).max(1).describe('Probability 0-1'),
      typicalSeverity: z.enum(['MILD', 'MODERATE', 'SEVERE']),
      managementTips: z.array(z.string()),
    })
  ),

  performanceInsights: z.object({
    expectedEnergyLevel: z.enum(['LOW', 'MODERATE', 'HIGH', 'PEAK']),
    strengthPotential: z.enum(['REDUCED', 'NORMAL', 'ENHANCED']),
    endurancePotential: z.enum(['REDUCED', 'NORMAL', 'ENHANCED']),
    recoveryRate: z.enum(['SLOWER', 'NORMAL', 'FASTER']),
  }),

  patterns: z.array(
    z.object({
      pattern: z.string().describe('Observed pattern from historical data'),
      confidence: z.number().min(0).max(1),
      recommendation: z.string(),
    })
  ),
});

export type CycleInsightsResult = z.infer<typeof CycleInsightsSchema>;

// ==================== Strength Exercise Form Schema ====================

/**
 * Schema for strength exercise form analysis (existing STRENGTH video type).
 * Complements the running gait analysis for strength training videos.
 */
export const StrengthFormAnalysisSchema = z.object({
  exercise: z.object({
    identified: z.string().describe('Identified exercise name'),
    confidence: z.number().min(0).max(1),
  }),

  formAssessment: z.object({
    overallScore: z.number().min(0).max(100),
    phases: z.array(
      z.object({
        phase: z.string().describe('e.g., "eccentric", "concentric", "bottom"'),
        score: z.number().min(0).max(100),
        issues: z.array(z.string()),
      })
    ),
  }),

  jointAngles: z.array(
    z.object({
      joint: z.string().describe('Joint name (e.g., "Vänster knä")'),
      measuredAngle: z.number().describe('Detected angle in degrees'),
      idealRange: z.object({
        min: z.number(),
        max: z.number(),
      }),
      status: z.enum(['WITHIN_RANGE', 'SLIGHTLY_OFF', 'OUT_OF_RANGE']),
      cue: z.string().optional().describe('Coaching cue if needed'),
    })
  ),

  safetyFlags: z.array(
    z.object({
      concern: z.string(),
      severity: z.enum(['WARNING', 'CRITICAL']),
      recommendation: z.string(),
    })
  ),

  improvements: z.array(
    z.object({
      area: z.string(),
      currentStatus: z.string(),
      targetImprovement: z.string(),
      drillSuggestion: z.string().optional(),
    })
  ),
});

export type StrengthFormAnalysisResult = z.infer<typeof StrengthFormAnalysisSchema>;

// ==================== Lactate Meter OCR Schema ====================

/**
 * Schema for extracting lactate readings from meter photos.
 * Supports various lactate analyzer brands (Lactate Pro 2, Lactate Scout, etc.)
 */
export const LactateMeterOCRSchema = z.object({
  success: z.boolean().describe('Whether the reading was successfully extracted'),

  reading: z.object({
    lactateValue: z
      .number()
      .min(0)
      .max(30)
      .describe('Blood lactate concentration in mmol/L'),
    unit: z
      .enum(['mmol/L', 'mg/dL'])
      .default('mmol/L')
      .describe('Unit of measurement'),
    confidence: z
      .number()
      .min(0)
      .max(1)
      .describe('Confidence in the reading accuracy'),
  }),

  deviceInfo: z.object({
    detectedBrand: z
      .enum(['LACTATE_PRO_2', 'LACTATE_SCOUT', 'LACTATE_EDGE', 'NOVA_BIOMEDICAL', 'OTHER', 'UNKNOWN'])
      .describe('Detected lactate meter brand'),
    displayType: z
      .enum(['DIGITAL_LCD', 'DIGITAL_LED', 'ANALOG', 'UNKNOWN'])
      .describe('Type of display'),
    brandConfidence: z.number().min(0).max(1).describe('Confidence in brand detection'),
  }),

  imageQuality: z.object({
    overallScore: z
      .number()
      .min(0)
      .max(100)
      .describe('Overall image quality score'),
    issues: z.array(
      z.object({
        issue: z.enum(['GLARE', 'BLUR', 'LOW_LIGHT', 'ANGLE', 'PARTIAL_OCCLUSION', 'OTHER']),
        severity: z.enum(['MINOR', 'MODERATE', 'SEVERE']),
        suggestion: z.string().describe('How to improve for next time'),
      })
    ),
  }),

  contextExtraction: z.object({
    timestamp: z.string().optional().describe('Timestamp if visible on meter'),
    athleteId: z.string().optional().describe('Athlete ID if visible on display'),
    additionalReadings: z.array(
      z.object({
        label: z.string(),
        value: z.string(),
      })
    ).optional().describe('Other values visible (glucose, hematocrit, etc.)'),
  }),

  validationFlags: z.object({
    physiologicallyPlausible: z
      .boolean()
      .describe('Whether the reading is within normal physiological range'),
    possibleError: z
      .boolean()
      .describe('Whether the reading might be an error (e.g., "LO", "HI", "E-1")'),
    errorCode: z.string().optional().describe('Error code if detected'),
    requiresConfirmation: z
      .boolean()
      .describe('Whether coach should manually verify this reading'),
    notes: z.array(z.string()).describe('Additional notes about the reading'),
  }),
});

export type LactateMeterOCRResult = z.infer<typeof LactateMeterOCRSchema>;

// ==================== Coach Tool Definitions ====================

/**
 * Tool definitions for Gemini function calling.
 * These allow the AI to take actions during conversations.
 */
export const CoachToolDefinitions = {
  modifyWorkout: {
    name: 'modify_workout',
    description: 'Modify an athlete workout based on readiness, injury, or periodization needs',
    parameters: z.object({
      workoutId: z.string().describe('ID of the workout to modify'),
      modificationType: z.enum(['REDUCE_INTENSITY', 'REDUCE_VOLUME', 'SWAP_EXERCISE', 'SKIP', 'POSTPONE']),
      reason: z.string().describe('Reason for the modification'),
      newIntensity: z.number().min(0).max(100).optional().describe('New intensity percentage'),
      newVolume: z.number().min(0).max(100).optional().describe('New volume percentage'),
      alternativeExercise: z.string().optional().describe('Alternative exercise if swapping'),
    }),
  },

  createAlert: {
    name: 'create_alert',
    description: 'Create an alert for the coach about an athlete concern',
    parameters: z.object({
      athleteId: z.string().describe('ID of the athlete'),
      alertType: z.enum(['OVERTRAINING', 'INJURY_RISK', 'LOW_READINESS', 'PLATEAU', 'MILESTONE']),
      urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
      message: z.string().describe('Alert message in Swedish'),
      recommendedAction: z.string().describe('What the coach should consider doing'),
    }),
  },

  suggestProgression: {
    name: 'suggest_progression',
    description: 'Suggest a training progression update based on athlete performance',
    parameters: z.object({
      athleteId: z.string().describe('ID of the athlete'),
      exerciseId: z.string().optional().describe('Specific exercise ID if applicable'),
      currentValue: z.number().describe('Current training value (load, pace, etc.)'),
      suggestedValue: z.number().describe('Suggested new value'),
      progressionType: z.enum(['LOAD', 'PACE', 'VOLUME', 'FREQUENCY']),
      rationale: z.string().describe('Why this progression is recommended'),
      confidence: z.number().min(0).max(1).describe('Confidence in the suggestion'),
    }),
  },

  scheduleCommunication: {
    name: 'schedule_communication',
    description: 'Schedule a check-in or message to the athlete',
    parameters: z.object({
      athleteId: z.string().describe('ID of the athlete'),
      messageType: z.enum(['CHECK_IN', 'MOTIVATION', 'REMINDER', 'FEEDBACK']),
      message: z.string().describe('Message content in Swedish'),
      scheduledFor: z.string().optional().describe('When to send (ISO date string)'),
      priority: z.enum(['LOW', 'NORMAL', 'HIGH']),
    }),
  },
};

export type ModifyWorkoutParams = z.infer<typeof CoachToolDefinitions.modifyWorkout.parameters>;
export type CreateAlertParams = z.infer<typeof CoachToolDefinitions.createAlert.parameters>;
export type SuggestProgressionParams = z.infer<typeof CoachToolDefinitions.suggestProgression.parameters>;
export type ScheduleCommunicationParams = z.infer<typeof CoachToolDefinitions.scheduleCommunication.parameters>;
