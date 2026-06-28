/**
 * Surface Pär Lindholm's "Skeå sommar 2026" workouts on the TEAM dashboard/calendar.
 *
 * The team cockpit/calendar + dashboard only show workouts that flow through a
 * TeamWorkoutBroadcast (assignments linked via teamBroadcastId) and a TeamEvent
 * (queried by teamId, linked via assignedBroadcastId). Pär's program created
 * per-athlete assignments with teamBroadcastId = null, so they don't appear.
 *
 * This script, for each of Pär's 30 scheduled workouts, creates a TeamWorkoutBroadcast
 * (attached to Pär only — he is the sole athleteAccount holder on the team, so the
 * team summary renders "1/1 assigned, 0 missing") + a linked TeamEvent, and sets
 * teamBroadcastId on the existing assignment. Idempotent via the MARKER.
 *
 * Run from repo root:
 *   export $(grep -E '^(DATABASE_URL|DIRECT_DATABASE_URL)=' .env.local | xargs) && npx tsx scripts/import-par-skea-team-2026.ts
 */
import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()
const TEAM = 'c2832b4a-3631-4621-be3a-3ab1dae700c2' // Skellefteå AIK A-lag team (Pär's Client.teamId)
const PAR = '936fd4c3-1c99-4876-a6db-b76a2157cce1'
const COACH = 'a0991148-5121-4f9b-884d-451a77ea8e66'
const MARKER = 'Skeå sommar 2026'
const NOW = new Date()

type Kind = 'strength' | 'cardio' | 'hybrid' | 'agility'
const LINKED: Record<Kind, string> = { strength: 'STRENGTH', cardio: 'CARDIO', hybrid: 'HYBRID', agility: 'AGILITY' }
function eventType(kind: Kind, name: string): string {
  if (kind === 'strength') {
    if (/stab/i.test(name)) return 'PREHAB'
    if (/hopp|power/i.test(name)) return 'PLYOMETRICS'
    return 'STRENGTH'
  }
  return LINKED[kind]
}

async function main() {
  const prog = await p.trainingProgram.findFirst({ where: { clientId: PAR, name: { contains: MARKER } }, select: { id: true, name: true } })
  if (!prog) throw new Error('Program not found — run import-par-skea-sommar-2026.ts first')

  // ---- cleanup prior team artifacts (SetNull resets Pär's assignments) ----
  const delEv = await p.teamEvent.deleteMany({ where: { teamId: TEAM, description: { contains: MARKER } } })
  const delBc = await p.teamWorkoutBroadcast.deleteMany({ where: { teamId: TEAM, notes: { contains: MARKER } } })
  console.log(`Cleanup: removed ${delEv.count} TeamEvents, ${delBc.count} broadcasts`)

  // ---- load Pär's scheduled workouts in this program ----
  const S = (await p.strengthSessionAssignment.findMany({ where: { athleteId: PAR, programId: prog.id }, include: { session: { select: { name: true } }, calendarEvent: { select: { title: true } } } }))
    .map((a) => ({ kind: 'strength' as Kind, id: a.id, templateId: a.sessionId, name: a.session.name, title: a.calendarEvent?.title || a.session.name, date: a.assignedDate, notes: a.notes }))
  const C = (await p.cardioSessionAssignment.findMany({ where: { athleteId: PAR, programId: prog.id }, include: { session: { select: { name: true } }, calendarEvent: { select: { title: true } } } }))
    .map((a) => ({ kind: 'cardio' as Kind, id: a.id, templateId: a.sessionId, name: a.session.name, title: a.calendarEvent?.title || a.session.name, date: a.assignedDate, notes: a.notes }))
  const H = (await p.hybridWorkoutAssignment.findMany({ where: { athleteId: PAR, programId: prog.id }, include: { workout: { select: { name: true } }, calendarEvent: { select: { title: true } } } }))
    .map((a) => ({ kind: 'hybrid' as Kind, id: a.id, templateId: a.workoutId, name: a.workout.name, title: a.calendarEvent?.title || a.workout.name, date: a.assignedDate, notes: a.notes }))
  const A = (await p.agilityWorkoutAssignment.findMany({ where: { athleteId: PAR, programId: prog.id }, include: { workout: { select: { name: true } }, calendarEvent: { select: { title: true } } } }))
    .map((a) => ({ kind: 'agility' as Kind, id: a.id, templateId: a.workoutId, name: a.workout.name, title: a.calendarEvent?.title || a.workout.name, date: a.assignedDate, notes: a.notes }))
  const all = [...S, ...C, ...H, ...A].sort((x, y) => x.date.getTime() - y.date.getTime())
  console.log(`Found ${all.length} of Pär's workouts to surface on the team board`)

  let made = 0
  for (const w of all) {
    const bc = await p.teamWorkoutBroadcast.create({
      data: {
        teamId: TEAM, coachId: COACH,
        strengthSessionId: w.kind === 'strength' ? w.templateId : null,
        cardioSessionId: w.kind === 'cardio' ? w.templateId : null,
        hybridWorkoutId: w.kind === 'hybrid' ? w.templateId : null,
        agilityWorkoutId: w.kind === 'agility' ? w.templateId : null,
        assignedDate: w.date, notes: `[${MARKER}] ${w.name}`,
        totalAssigned: 1, totalCompleted: 0,
      },
      select: { id: true },
    })
    await p.teamEvent.create({
      data: {
        teamId: TEAM, title: w.title, type: eventType(w.kind, w.name),
        description: `[${MARKER}] Pär Lindholm — ${w.name}`,
        contentStatus: 'ASSIGNED', contentOwner: 'physical_trainer',
        linkedWorkoutType: LINKED[w.kind], linkedWorkoutId: w.templateId, linkedWorkoutName: w.name,
        assignedBroadcastId: bc.id, assignedAt: NOW, responsibleCoachId: COACH,
        startDate: w.date, allDay: true, createdById: COACH,
      },
    })
    // attach the existing per-athlete assignment to the broadcast
    if (w.kind === 'strength') await p.strengthSessionAssignment.update({ where: { id: w.id }, data: { teamBroadcastId: bc.id } })
    else if (w.kind === 'cardio') await p.cardioSessionAssignment.update({ where: { id: w.id }, data: { teamBroadcastId: bc.id } })
    else if (w.kind === 'hybrid') await p.hybridWorkoutAssignment.update({ where: { id: w.id }, data: { teamBroadcastId: bc.id } })
    else await p.agilityWorkoutAssignment.update({ where: { id: w.id }, data: { teamBroadcastId: bc.id } })
    made++
  }
  console.log(`Created ${made} broadcasts + TeamEvents and attached assignments.`)
  console.log('DONE.')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => p.$disconnect())
