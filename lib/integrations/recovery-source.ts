import 'server-only'

import { prisma } from '@/lib/prisma'

export type RecoverySource = 'GARMIN' | 'OURA'

/**
 * Resolves which connected wearable should be the source of truth for
 * recovery metrics (HRV, RHR, sleep, RHR-derived stress) on this client.
 *
 * Reads `Client.preferredRecoverySource`:
 *   - "AUTO" (default) → OURA if connected, else GARMIN if connected, else null
 *   - "OURA" / "GARMIN" → returns the explicit choice if connected, otherwise
 *     falls back to AUTO ordering so a stale preference can't blackhole syncs
 */
export async function resolveRecoverySource(clientId: string): Promise<RecoverySource | null> {
  const [client, tokens] = await Promise.all([
    prisma.client.findUnique({
      where: { id: clientId },
      select: { preferredRecoverySource: true },
    }),
    prisma.integrationToken.findMany({
      where: { clientId, type: { in: ['GARMIN', 'OURA'] } },
      select: { type: true },
    }),
  ])

  const connected = new Set<RecoverySource>(tokens.map(t => t.type as RecoverySource))
  const preferred = (client?.preferredRecoverySource ?? 'AUTO') as 'AUTO' | RecoverySource

  if (preferred !== 'AUTO' && connected.has(preferred)) return preferred
  if (connected.has('OURA')) return 'OURA'
  if (connected.has('GARMIN')) return 'GARMIN'
  return null
}
