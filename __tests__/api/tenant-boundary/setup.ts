import { expect, vi } from 'vitest'

const hoistedMocks = vi.hoisted(() => ({
  mockApiKeyContext: {
    apiKeyId: 'key-1',
    businessId: 'business-a',
    scopes: ['read:tests'],
    business: {
      id: 'business-a',
      name: 'Business A',
      slug: 'business-a',
    },
  },
}))

export const mockApiKeyContext = hoistedMocks.mockApiKeyContext

vi.mock('@/lib/api-key-auth', () => ({
  withApiKey:
    (handler: any) =>
    async (request: Request, routeContext: { params: Promise<Record<string, string>> }) =>
      handler(request, { apiKey: mockApiKeyContext, params: await routeContext.params }),
}))

vi.mock('@/lib/auth-utils', () => ({
  requireCoach: vi.fn(),
  requireAthlete: vi.fn(),
  getCurrentUser: vi.fn(),
  resolveAthleteClientId: vi.fn(),
  canAccessClient: vi.fn(),
  canAccessAthleteAsPhysio: vi.fn(),
}))

vi.mock('@/lib/api/rate-limit', () => ({
  rateLimitJsonResponse: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/rate-limit-redis', () => ({
  rateLimitJsonResponse: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/logger-console', () => ({
  logError: vi.fn(),
}))

vi.mock('@/lib/storage/supabase-storage-server', () => ({
  createSignedUrl: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'coach-a' } },
      }),
    },
  }),
}))

vi.mock('@/lib/data-moat/pattern-detection', () => ({
  detectPatterns: vi.fn(),
  saveDetectedPatterns: vi.fn(),
  matchAthleteToPatterns: vi.fn(),
}))

vi.mock('@/lib/auth/athlete-access', () => ({
  canAccessAthlete: vi.fn(),
}))

vi.mock('@/lib/agent/execution', () => ({
  executePendingActions: vi.fn(),
  executeActionsForAthlete: vi.fn(),
  expireOldActions: vi.fn(),
  executeAction: vi.fn(),
}))

vi.mock('@/lib/agent/gdpr/consent-manager', () => ({
  getConsentStatus: vi.fn(),
}))

vi.mock('@/lib/user-api-keys', () => ({
  getDecryptedUserApiKeys: vi.fn(),
  getResolvedAiKeys: vi.fn(),
}))

vi.mock('@/lib/subscription/feature-access', () => ({
  checkAthleteFeatureAccess: vi.fn().mockResolvedValue({ allowed: true }),
  checkCoachSubscriptionStatus: vi.fn().mockResolvedValue({
    allowed: true,
    trialActive: false,
    tier: 'PRO',
    status: 'ACTIVE',
  }),
  ATHLETE_TIER_FEATURES: {
    FREE: {
      ai_chat: { enabled: false, limit: 0 },
      video_analysis: { enabled: false },
      strava: { enabled: false },
      garmin: { enabled: false },
      advanced_intelligence: { enabled: false },
      program_generation: { enabled: false },
      nutrition_planning: { enabled: false },
      concept2: { enabled: false },
      lactate_ocr: { enabled: false },
    },
    STANDARD: {
      ai_chat: { enabled: true, limit: 50 },
      video_analysis: { enabled: false },
      strava: { enabled: true },
      garmin: { enabled: true },
      advanced_intelligence: { enabled: false },
      program_generation: { enabled: true },
      nutrition_planning: { enabled: true },
      concept2: { enabled: true },
      lactate_ocr: { enabled: true },
    },
    PRO: {
      ai_chat: { enabled: true, limit: -1 },
      video_analysis: { enabled: true },
      strava: { enabled: true },
      garmin: { enabled: true },
      advanced_intelligence: { enabled: true },
      program_generation: { enabled: true },
      nutrition_planning: { enabled: true },
      concept2: { enabled: true },
      lactate_ocr: { enabled: true },
    },
    ELITE: {
      ai_chat: { enabled: true, limit: -1 },
      video_analysis: { enabled: true },
      strava: { enabled: true },
      garmin: { enabled: true },
      advanced_intelligence: { enabled: true },
      program_generation: { enabled: true },
      nutrition_planning: { enabled: true },
      concept2: { enabled: true },
      lactate_ocr: { enabled: true },
    },
  },
  COACH_TIER_FEATURES: {
    FREE: { athlete_mode: true, max_athletes: 1 },
    BASIC: { athlete_mode: true, max_athletes: 5 },
    PRO: { athlete_mode: true, max_athletes: 50 },
    ENTERPRISE: { athlete_mode: true, max_athletes: -1 },
  },
}))

vi.mock('@/lib/subscription/require-feature-access', () => ({
  requireFeatureAccess: vi.fn().mockResolvedValue(null),
  requireCoachFeatureAccess: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/ai/deep-research', () => ({
  createProvider: vi.fn(),
  PROVIDER_COST_ESTIMATES: {},
}))

vi.mock('@/lib/ai/advanced-intelligence', () => ({
  generatePredictiveGoals: vi.fn(),
  predictRaceTimes: vi.fn(),
  calculateTrainingReadiness: vi.fn(),
  analyzeTrainingPatterns: vi.fn(),
  calculateInjuryRisk: vi.fn(),
  extractCoachingStyle: vi.fn(),
  applyStyleToPrompt: vi.fn(),
}))

vi.mock('@/lib/data-moat/prediction-logger', () => ({
  logPrediction: vi.fn().mockResolvedValue(undefined),
  logPredictionBatch: vi.fn().mockResolvedValue(undefined),
  createRaceTimeInputSnapshot: vi.fn().mockReturnValue({}),
  createInjuryRiskInputSnapshot: vi.fn().mockReturnValue({}),
}))

vi.mock('@/lib/integrations/strava/client', () => ({
  getStravaAuthUrl: vi.fn(),
  hasStravaConnection: vi.fn(),
  disconnectStrava: vi.fn(),
}))

vi.mock('@/lib/integrations/garmin/client', () => ({
  isGarminConfigured: vi.fn().mockReturnValue(true),
  getGarminAuthUrl: vi.fn(),
  hasGarminConnection: vi.fn(),
  disconnectGarmin: vi.fn(),
}))

vi.mock('@/lib/integrations/concept2', () => ({
  getConcept2AuthUrl: vi.fn(),
  hasConcept2Connection: vi.fn(),
  disconnectConcept2: vi.fn(),
  syncConcept2Results: vi.fn(),
  getSyncedConcept2Results: vi.fn(),
  getTrainingLoadFromConcept2: vi.fn(),
}))

vi.mock('@/lib/ai/program-generator', () => ({
  calculatePhases: vi.fn().mockReturnValue([{ start: 1, end: 8 }]),
  estimateGenerationMinutes: vi.fn().mockReturnValue(2),
  generateMultiPartProgram: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/lib/crypto/secretbox', () => ({
  decryptSecret: vi.fn().mockReturnValue('mock-api-key'),
}))

vi.mock('@/lib/ai/gemini-config', () => ({
  GEMINI_MODELS: { VIDEO_ANALYSIS: 'gemini-2.0-flash' },
  getGeminiThinkingOptions: vi.fn().mockReturnValue({}),
}))

vi.mock('@/lib/validations/gemini-schemas', () => ({
  LactateMeterOCRSchema: {},
}))

vi.mock('@/lib/ai/nutrition-calculator', () => ({
  buildNutritionContext: vi.fn().mockReturnValue('mock context'),
  generateNutritionPlan: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
    user: { findUnique: vi.fn() },
    businessMember: { findFirst: vi.fn(), findMany: vi.fn() },
    client: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
    test: { findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn() },
    business: { findUnique: vi.fn(), update: vi.fn() },
    performancePattern: { findMany: vi.fn(), count: vi.fn() },
    coachDecision: { findMany: vi.fn(), count: vi.fn(), create: vi.fn() },
    trainingPeriodOutcome: { findMany: vi.fn(), count: vi.fn(), create: vi.fn() },
    trainingRestriction: { findMany: vi.fn(), findUnique: vi.fn() },
    aIPrediction: { findMany: vi.fn(), count: vi.fn(), create: vi.fn() },
    hybridWorkoutResult: { findMany: vi.fn(), count: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    hybridWorkout: { findUnique: vi.fn(), findFirst: vi.fn() },
    agilityWorkout: { findUnique: vi.fn() },
    location: { findUnique: vi.fn() },
    calendarEvent: { create: vi.fn() },
    agilityWorkoutAssignment: { upsert: vi.fn() },
    cardioSessionAssignment: { findMany: vi.fn() },
    hybridWorkoutAssignment: { findMany: vi.fn(), upsert: vi.fn(), update: vi.fn() },
    videoAnalysis: { create: vi.fn() },
    deepResearchSession: { findFirst: vi.fn(), update: vi.fn() },
    sharedResearchAccess: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    aIConversation: { findMany: vi.fn(), create: vi.fn() },
    coachDocument: { findMany: vi.fn() },
    conversationMemory: { delete: vi.fn() },
    careTeamThread: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn() },
    athleteAccount: { findFirst: vi.fn() },
    rehabProgram: { findUnique: vi.fn() },
    rehabProgressLog: { findMany: vi.fn(), count: vi.fn() },
    agentAction: { findUnique: vi.fn() },
    raceResult: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      updateMany: vi.fn(),
    },
    athleteProfile: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    athleteSubscription: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    subscription: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    programGenerationSession: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
    bodyComposition: { findFirst: vi.fn() },
    dailyMetrics: { findMany: vi.fn(), count: vi.fn() },
    userApiKey: { findUnique: vi.fn() },
    integrationToken: { findUnique: vi.fn() },
    stravaActivity: { count: vi.fn(), findFirst: vi.fn(), deleteMany: vi.fn() },
    concept2Result: { count: vi.fn(), groupBy: vi.fn(), findFirst: vi.fn() },
  },
}))

export function resetTenantBoundaryMocks() {
  vi.clearAllMocks()
  mockApiKeyContext.businessId = 'business-a'
}

export async function expectDeniedResponse(
  response: Response,
  status: number,
  absentFields: string[] = []
) {
  const body = await response.json()
  expect(response.status).toBe(status)
  for (const field of absentFields) {
    expect((body as Record<string, unknown>)[field]).toBeUndefined()
  }
  return body
}
