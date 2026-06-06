import 'server-only'

import { FeatureFlag } from '@prisma/client'
import { hasBusinessFeature } from '@/lib/branding/feature-gate'

/**
 * Internal beta gate for the floating-AI operations layer.
 * No business scope means no beta operations.
 */
export async function isAiAssistantOperationsEnabled(
  businessId: string | null | undefined
): Promise<boolean> {
  if (!businessId) return false
  return hasBusinessFeature(businessId, FeatureFlag.AI_ASSISTANT_OPERATIONS)
}
