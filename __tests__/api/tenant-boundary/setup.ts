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
  canAccessAthlete: vi.fn(),
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
}))

vi.mock('@/lib/ai/deep-research', () => ({
  createProvider: vi.fn(),
  PROVIDER_COST_ESTIMATES: {},
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
