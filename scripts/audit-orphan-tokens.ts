/**
 * READ-ONLY audit of integration-token data hygiene.
 *
 * Reports:
 *  - IntegrationToken totals by type
 *  - Orphaned IntegrationToken rows (clientId with no matching Client) — should
 *    be 0 because the FK is onDelete: Cascade, but we verify empirically.
 *  - Garmin tokens whose Client is missing OR belongs to another business
 *    (explains "Client not found" when a given coach opens the profile).
 *  - Expired OAuthRequestToken rows (10-min PKCE state that may be lingering).
 *
 * Does NOT delete anything.
 *
 * Usage:
 *   export $(grep -E '^(DATABASE_URL|DIRECT_DATABASE_URL)=' .env.local | xargs) && \
 *     npx tsx scripts/audit-orphan-tokens.ts
 */

import { prisma } from '@/lib/prisma'

async function main() {
  console.log('=== IntegrationToken audit (READ-ONLY) ===\n')

  const total = await prisma.integrationToken.count()
  const byType = await prisma.integrationToken.groupBy({
    by: ['type'],
    _count: { _all: true },
  })
  console.log(`Total IntegrationToken rows: ${total}`)
  for (const row of byType) {
    console.log(`  ${row.type}: ${row._count._all}`)
  }

  // Orphan check across ALL integration tokens via raw LEFT JOIN.
  const orphans = await prisma.$queryRawUnsafe<Array<{ id: string; clientId: string; type: string }>>(
    `SELECT t.id, t."clientId", t.type::text AS type
       FROM "IntegrationToken" t
       LEFT JOIN "Client" c ON t."clientId" = c.id
      WHERE c.id IS NULL`,
  )
  console.log(`\nOrphaned tokens (clientId → no Client): ${orphans.length}`)
  for (const o of orphans) {
    console.log(`  orphan token ${o.id} type=${o.type} clientId=${o.clientId}`)
  }

  // Garmin tokens with client existence + business, to explain "Client not found".
  const garmin = await prisma.integrationToken.findMany({
    where: { type: 'GARMIN' },
    select: { id: true, clientId: true, lastSyncAt: true, lastSyncError: true, syncEnabled: true },
  })
  const clientIds = garmin.map((g) => g.clientId)
  const clients = await prisma.client.findMany({
    where: { id: { in: clientIds } },
    select: { id: true, name: true, businessId: true },
  })
  const clientMap = new Map(clients.map((c) => [c.id, c]))
  console.log(`\nGarmin tokens: ${garmin.length}`)
  for (const g of garmin) {
    const c = clientMap.get(g.clientId)
    const status = !c
      ? 'CLIENT MISSING (true orphan)'
      : `client="${c.name}" business=${c.businessId ?? 'none'}`
    console.log(`  token ${g.id} clientId=${g.clientId} → ${status} | lastSync=${g.lastSyncAt?.toISOString() ?? 'never'} err=${g.lastSyncError ?? 'none'}`)
  }

  // Expired OAuth PKCE state.
  const oauthTotal = await prisma.oAuthRequestToken.count()
  const oauthExpired = await prisma.oAuthRequestToken.count({ where: { expiresAt: { lt: new Date() } } })
  console.log(`\nOAuthRequestToken: total=${oauthTotal}, expired=${oauthExpired}`)

  console.log('\n=== end (nothing was deleted) ===')
}

main()
  .catch((err) => {
    console.error('Audit failed:', err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
