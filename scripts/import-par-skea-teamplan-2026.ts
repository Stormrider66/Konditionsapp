/**
 * Create the TEAM block plan ("Lagets blockplan" / TeamPlan) for Skellefteå AIK A-lag,
 * 4 weeks (V27–V30), as the periodization overlay on the team calendar. Each block (phase)
 * documents what TYPE of session is meant on each day; the actual workouts (TeamEvents +
 * broadcasts already created for Pär) overlay on top.
 *
 * Idempotent: re-run deletes the prior plan (name contains MARKER; blocks cascade) and rebuilds.
 *
 * Run from repo root:
 *   export $(grep -E '^(DATABASE_URL|DIRECT_DATABASE_URL)=' .env.local | xargs) && npx tsx scripts/import-par-skea-teamplan-2026.ts
 */
import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()
const TEAM = 'c2832b4a-3631-4621-be3a-3ab1dae700c2'
const COACH = 'a0991148-5121-4f9b-884d-451a77ea8e66'
const MARKER = 'Skeå sommar 2026'
const D = (s: string) => new Date(`${s}T00:00:00.000Z`)

const blocks = [
  {
    title: 'V27 · Bas – Maxstyrka', focus: 'Grundstyrka + kondition (mängd)',
    startDate: D('2026-06-29'), endDate: D('2026-07-05'),
    description: 'Mån: Maxstyrka 1 (fm) + skott (em) · Tis: Kondition 1 + 2 · Ons: Stab + Prevens + Kondition mängd · Tor: Maxstyrka 2 (fm) + skott (em) · Fre: Högintensiv · Lör: Vila · Sön: Hopp/power (utrymme).',
  },
  {
    title: 'V28 · Bas – Snabbstyrka', focus: 'Snabbstyrka + kondition (mängd)',
    startDate: D('2026-07-06'), endDate: D('2026-07-12'),
    description: 'Mån: Snabbstyrka 1 (fm) + skott (em) · Tis: Kondition 1 + 2 · Ons: Stab + Prevens + Kondition mängd · Tor: Snabbstyrka 2 (fm) + skott (em) · Fre: Högintensiv · Lör: Vila · Sön: Hopp/power (utrymme).',
  },
  {
    title: 'V29 · Bygg – Maxstyrka + Agility', focus: 'Kraft + agility (i Skellefteå)',
    startDate: D('2026-07-13'), endDate: D('2026-07-19'),
    description: 'Mån: Maxstyrka 1 (fm) + skott (em) · Tis: Kondition + Stab (em) · Ons: Agility · Tor: Maxstyrka 2 (fm) + skott (em) · Fre: Högintensiv (backe) · Lör: Vila · Sön: Hopp/power (utrymme).',
  },
  {
    title: 'V30 · Bygg – Snabbstyrka + Agility', focus: 'Snabbstyrka + agility',
    startDate: D('2026-07-20'), endDate: D('2026-07-26'),
    description: 'Mån: Snabbstyrka 1 (fm) + skott (em) · Tis: Kondition + Styrka Överkropp (em) · Ons: Agility + Stab (em) · Tor: Snabbstyrka 2 (fm) + skott (em) · Fre: Högintensiv · Lör/Sön: Vila.',
  },
]

async function main() {
  const del = await p.teamPlan.deleteMany({ where: { teamId: TEAM, name: { contains: MARKER } } })
  console.log(`Cleanup: removed ${del.count} prior team plan(s)`)

  const plan = await p.teamPlan.create({
    data: {
      teamId: TEAM, coachId: COACH,
      name: `Skeå sommar 2026 (V27–V30)`,
      description: 'Lagets blockplan för sommaren — fyra veckors fys (V27–V30), Bas → Bygg. Blocken visar vilken typ av pass som ska köras varje dag; fyll kalendern med pass (is/fys/match) per dag. Pär Lindholm kör som beta-testare innan resten av A-laget läggs till.',
      status: 'ACTIVE',
      startDate: D('2026-06-27'), // a touch before V27 so it's active "today" in any server timezone
      endDate: D('2026-07-26'),
      blocks: { create: blocks.map((b, i) => ({ ...b, order: i + 1 })) },
    },
    select: { id: true, name: true, status: true, startDate: true, endDate: true, blocks: { orderBy: { order: 'asc' }, select: { order: true, title: true, focus: true, startDate: true, endDate: true } } },
  })
  console.log('Created TeamPlan:', plan.name, '| status', plan.status, '|', plan.startDate.toISOString().slice(0, 10), '→', plan.endDate.toISOString().slice(0, 10))
  for (const b of plan.blocks) console.log(`  Block ${b.order}: ${b.title} [${b.focus}] ${b.startDate.toISOString().slice(0, 10)}..${b.endDate.toISOString().slice(0, 10)}`)
  console.log('DONE.')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => p.$disconnect())
