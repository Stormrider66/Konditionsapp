import { prisma } from '@/lib/prisma'
import { isModelIntent } from '@/types/ai-models'
import { logger } from '@/lib/logger'

export type LowerProvider = 'anthropic' | 'google' | 'openai'

/** Best-effort provider inference from a model string ("claude-…", "gpt-…"). */
export function inferProviderFromModelRef(value: string): LowerProvider | null {
  const lower = value.toLowerCase()
  if (lower.includes('gemini')) return 'google'
  if (lower.includes('claude')) return 'anthropic'
  if (lower.includes('gpt-')) return 'openai'
  return null
}

export function intersectProviders(
  a: Set<LowerProvider>,
  b: Set<LowerProvider>
): Set<LowerProvider> {
  return new Set([...a].filter((p) => b.has(p)))
}

/**
 * Resolve the strict provider allowlist for an athlete chat session.
 * Looks at the coach's `allowedAthleteModelIds` plus the business-level
 * one, intersects them, and returns the resulting provider set.
 * Returns `null` when no explicit restriction is configured (i.e. the
 * athlete may use any configured provider).
 */
export async function resolveAthleteProviderAllowlist(
  apiKeyUserId: string,
  effectiveBusinessId: string | null
): Promise<Set<LowerProvider> | null> {
  try {
    const [coachApiSettings, businessSettings] = await Promise.all([
      prisma.userApiKey.findUnique({
        where: { userId: apiKeyUserId },
        select: { allowedAthleteModelIds: true },
      }),
      effectiveBusinessId
        ? prisma.business.findUnique({
            where: { id: effectiveBusinessId },
            select: { aiKeys: { select: { allowedAthleteModelIds: true } } },
          })
        : Promise.resolve(null),
    ])

    const coachRawAllowed = coachApiSettings?.allowedAthleteModelIds || []
    const businessRawAllowed = businessSettings?.aiKeys?.allowedAthleteModelIds || []
    const allRefs = [...new Set([...coachRawAllowed, ...businessRawAllowed])].filter(
      (v) => !isModelIntent(v)
    )

    const providerByRef = new Map<string, LowerProvider>()
    if (allRefs.length > 0) {
      const models = await prisma.aIModel.findMany({
        where: { OR: [{ id: { in: allRefs } }, { modelId: { in: allRefs } }] },
        select: { id: true, modelId: true, provider: true },
      })
      for (const m of models) {
        const mapped: LowerProvider =
          m.provider === 'GOOGLE' ? 'google' : m.provider === 'ANTHROPIC' ? 'anthropic' : 'openai'
        providerByRef.set(m.id, mapped)
        providerByRef.set(m.modelId, mapped)
      }
    }

    const derive = (rawRefs: string[]): Set<LowerProvider> | null => {
      if (rawRefs.length === 0) return null
      const providers = new Set<LowerProvider>()
      for (const ref of rawRefs) {
        if (isModelIntent(ref)) continue
        const fromModel = providerByRef.get(ref)
        if (fromModel) {
          providers.add(fromModel)
          continue
        }
        const fromHeuristic = inferProviderFromModelRef(ref)
        if (fromHeuristic) providers.add(fromHeuristic)
      }
      return providers.size > 0 ? providers : null
    }

    const coachProviders = derive(coachRawAllowed)
    const businessProviders = derive(businessRawAllowed)

    if (coachProviders && businessProviders) {
      const intersection = intersectProviders(coachProviders, businessProviders)
      return intersection.size > 0 ? intersection : businessProviders
    }
    return coachProviders || businessProviders
  } catch (error) {
    logger.warn('Unable to resolve athlete provider restrictions', {}, error)
    return null
  }
}
