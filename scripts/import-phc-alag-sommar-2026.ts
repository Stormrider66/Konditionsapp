/**
 * Import "PHC A-lag sommar 2026" (Piteå Hockey A-lag summer GRUNDSCHEMA, 6 weeks)
 * and DISTRIBUTE it to the whole team, starting Mon 2026-06-29.
 *
 * Source: ~/Downloads/PHC A-lag sommar 2026.xlsx, "Schema" tab (LEFT "Grundschema",
 * period 29/6–09/8) + the per-session content tabs.
 *
 * Decisions (confirmed with Henrik 2026-06-29):
 *  - Grundschema only (one main session/day). Right high-volume variant NOT built.
 *  - Distribute to team "Piteå Hockey A-lag" — the 18 members with athlete accounts
 *    (Gustav Bäckström has no account, so he is skipped; invite him later).
 *  - One default per slot + progressions in notes. Wed = Stabpass (stab+kond);
 *    Agility + the two extra Hybrid variants are built as LIBRARY templates only.
 *
 * Team distribution mirrors the app's own POST /api/teams/[id]/assign-workout:
 * one TeamWorkoutBroadcast per workout + per-athlete assignments (teamBroadcastId,
 * status PENDING/ASSIGNED, no per-athlete CalendarEvent) + a TeamEvent for the team
 * calendar. Plus a TeamPlan ("Lagets blockplan") with 6 weekly blocks = the "plan".
 *
 * Idempotent: re-running cleans up the prior run by MARKER and rebuilds. New
 * Exercise/AgilityDrill rows are upserted by name and kept.
 *
 * Run from repo root:
 *   export $(grep -E '^(DATABASE_URL|DIRECT_DATABASE_URL)=' .env.local | xargs) && npx tsx scripts/import-phc-alag-sommar-2026.ts
 */
import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()

// ---- Fixed identities (verified against live DB) ----
const BIZ = '67245126-13ce-436c-8474-346f96d02d7e' // Star by Thomson
const TEAM = 'bd62e87e-2ca8-4daf-a29d-a61bc31873b6' // Piteå Hockey A-lag
const COACH = 'a0991148-5121-4f9b-884d-451a77ea8e66' // Henrik (ADMIN, biz OWNER)
const MARKER = 'PHC sommar 2026'
const TRAINING_YEAR = 2026
const businessTag = `__business:${BIZ}`
const TAGS = [MARKER, 'Piteå Hockey A-lag', businessTag]
const NOW = new Date()

const J = (o: any) => JSON.parse(JSON.stringify(o))
const D = (s: string) => new Date(`${s}T00:00:00.000Z`)
const norm = (s: string) =>
  s.toLowerCase().replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/é/g, 'e').replace(/[^a-z0-9]/g, '')

// ============================================================
// 1. NEW exercises & drills
// ============================================================
type Cat = 'STRENGTH' | 'PLYOMETRIC' | 'CORE' | 'WARMUP'
type Pillar = 'POSTERIOR_CHAIN' | 'KNEE_DOMINANCE' | 'UNILATERAL' | 'FOOT_ANKLE' | 'ANTI_ROTATION_CORE' | 'UPPER_BODY'
const NEW_EX: { name: string; cat: Cat; pillar: Pillar; desc?: string }[] = [
  { name: 'Deadbug 2-punktspress', cat: 'CORE', pillar: 'ANTI_ROTATION_CORE', desc: 'Deadbug med 2-punktspress, spänd bål, ingen svank.' },
  { name: 'Häckhopp', cat: 'PLYOMETRIC', pillar: 'KNEE_DOMINANCE', desc: 'Hopp över häck, kort kontakttid. Som kontrast efter tung knäböj.' },
  { name: 'Slädsprint 10m', cat: 'PLYOMETRIC', pillar: 'KNEE_DOMINANCE', desc: 'Maximal slädsprint 10 m, kroppsvikt på släden, 2 min vila mellan.' },
  { name: 'Leg lever med pilatesboll', cat: 'CORE', pillar: 'ANTI_ROTATION_CORE', desc: 'Leg levers med pilatesboll mellan fötterna, kontroll.' },
  { name: 'Skottkärran benindrag', cat: 'CORE', pillar: 'ANTI_ROTATION_CORE', desc: 'Partner håller benen, knäindrag på pilatesboll.' },
  { name: 'Goblet squat flowin', cat: 'STRENGTH', pillar: 'UNILATERAL', desc: 'Enbensböj med goblet, glid ut med andra benet på flowin.' },
  { name: 'Front squat + OH-press', cat: 'STRENGTH', pillar: 'KNEE_DOMINANCE', desc: 'Frontknäböj med axelpress i botten, neutral ländrygg.' },
  { name: 'Situpskast med MB', cat: 'CORE', pillar: 'ANTI_ROTATION_CORE', desc: 'Sit-up-kast med medicinboll 3–5 kg, neutral rygg, ingen svank.' },
  { name: 'Enbensstående komplex', cat: 'STRENGTH', pillar: 'FOOT_ANKLE', desc: 'Enbensstående komplex: Bomben, bensträck, skridskoskär.' },
  { name: 'Skatejump mot box', cat: 'PLYOMETRIC', pillar: 'UNILATERAL', desc: 'Lateralt skridskohopp mot box, kontrollerad landning.' },
  { name: '5-punktsrotation i cable', cat: 'CORE', pillar: 'ANTI_ROTATION_CORE', desc: 'Splitstående, explosiv bålrotation i kabel, 5 positioner.' },
  { name: 'Diagonal fällkniv', cat: 'CORE', pillar: 'ANTI_ROTATION_CORE', desc: 'Diagonal fällkniv med fart, en sida i taget, rakt ben + armbåge mot knä.' },
  { name: 'Bollkast antirotation', cat: 'CORE', pillar: 'ANTI_ROTATION_CORE', desc: 'Antirotationskast med boll, spänd bål.' },
  { name: 'Krabbstående studsa boll', cat: 'CORE', pillar: 'ANTI_ROTATION_CORE', desc: 'Krabbstående, studsa boll med en hand, stabil höft/bål.' },
  { name: 'Axelflex + press', cat: 'STRENGTH', pillar: 'UPPER_BODY', desc: 'Lyft upp på raka armar, 4 pressar bakom nacken, ner på raka armar.' },
  { name: 'Lutande båldrag', cat: 'STRENGTH', pillar: 'UPPER_BODY', desc: 'Stå lutad mot dragmaskin, dra ner stång på raka armar, stabil bål, 1 ben i luften.' },
]

type DCat = 'COD' | 'REACTIVE_AGILITY' | 'SPEED_ACCELERATION' | 'PLYOMETRICS' | 'FOOTWORK' | 'BALANCE'
const NEW_DR: { name: string; cat: DCat; desc?: string }[] = [
  { name: 'Snabbhetsstege g-band', cat: 'FOOTWORK', desc: 'In/ut i stege med g-band 4 gånger, sidosteg tillbaka 2/sida.' },
  { name: 'Armhopp + burpee', cat: 'PLYOMETRICS', desc: 'Armhopp direkt till burpee, explosivt.' },
  { name: 'Löpning 5-10-15m', cat: 'SPEED_ACCELERATION', desc: 'Accelerationer 5-10-15 m, vänd och tillbaka.' },
  { name: 'Krokar i utfall', cat: 'COD', desc: 'Krokar i utfallsposition, 4 st innan hopp.' },
  { name: 'Slädpush 25m', cat: 'SPEED_ACCELERATION', desc: 'Slädpush 2×25 m, max insats, vila 60–90 s.' },
]

// sheet term -> existing canonical exercise name
const ALIAS_EX: Record<string, string> = {
  'Stabilitetskomplex med G-band': 'Stabilitetskomplex',
  'Crossover step up på bänk': 'Cross over stepups',
  'OHS med stång': 'OH-squat',
  'Utfall med stepup på bänk': 'Utfall bakåt till step up',
  'Enbensmark m.stång': 'Enbenig rumänsk marklyft',
  'Pushpress med stång': 'Push Press',
  'Gorilla row med KB': 'Gorilla rodd',
  'Slädsprintar': 'Slädsprint 10m',
  'Bålrotation i cable med boll': 'Bålrotationer i kabelmaskin',
  'Bålrotation i cable växlande': 'Bålrotationer i kabelmaskin',
  'Alternerande bålrotation cable/G-band': 'Bålrotationer i kabelmaskin',
  'Throwing dumbell': 'Dumbbell throw',
  'Magliggande höftextension+abd': 'Magliggande hipext+höftabd',
  'Magliggande höftextension': 'Magliggande hipext+höftabd',
  'Pistols på bänk': 'Box Pistol',
  'Krabbstående höftflexion': 'Krabbstående hipext + flex',
  'Frivändningar': 'Clean',
  'Hopp från sittande': 'Sittande boxhopp',
  'Hip thrusters': 'Hip thrust',
  'Viktade Chins': 'Chins',
  'Goblet squat flowin': 'Goblet squat flowin',
  'Skuldercomplex': 'Skulderkomplex',
  'Adduktorplankan': 'Adduktorplanka',
  'Nordic hamstrings curl': 'Nordic Hamstring',
  '5-punktsrot i cable': '5-punktsrotation i cable',
  'Deadbug på bosuboll': 'Deadbug på bosu',
  'Enbensstående': 'Enbensstående komplex',
  'Bollkast antirot': 'Bollkast antirotation',
  // hybrid movements
  'Rodd': 'Row (Meters)',
  'Assault bike': 'Assault Bike (Calories)',
  'KB-sving': 'Kettlebell Swing',
  'KB-svingar': 'Kettlebell Swing',
  'Löpning': 'Run',
  'Boxjump over': 'Box Jump Over',
}
const ALIAS_DR: Record<string, string> = {
  'Stege': 'Snabbhetsstege g-band',
  'Snakerope': 'Snake rope with constant lunge jumps',
  'Snakerope med slam': 'Snake rope with constant lunge jumps',
  'Åttan med MB': 'Figure 8 Around Cones',
  'Åttan med kontouch': 'Cone touch Viper',
  'Repeated sprints 25m': 'Rep sprint 16-18m',
  'Slädpush': 'Slädpush 25m',
}

// ============================================================
// Resolvers
// ============================================================
const exMap = new Map<string, { id: string; prio: number }>()
const drMap = new Map<string, { id: string; prio: number }>()
function put(map: Map<string, { id: string; prio: number }>, key: string | null | undefined, id: string, prio: number) {
  if (!key) return; const n = norm(key); if (!n) return
  const cur = map.get(n); if (!cur || prio > cur.prio) map.set(n, { id, prio })
}
async function loadExercises() {
  exMap.clear()
  const rows = await p.exercise.findMany({ where: { OR: [{ coachId: null }, { coachId: COACH }, { businessId: BIZ }] }, select: { id: true, name: true, nameSv: true, nameEn: true, coachId: true, businessId: true } })
  for (const r of rows) { const prio = r.businessId === BIZ || r.coachId === COACH ? 2 : 1; put(exMap, r.name, r.id, prio); put(exMap, r.nameSv, r.id, prio); put(exMap, r.nameEn, r.id, prio) }
}
async function loadDrills() {
  drMap.clear()
  const rows = await p.agilityDrill.findMany({ where: { OR: [{ coachId: null }, { coachId: COACH }, { isSystemDrill: true }] }, select: { id: true, name: true, nameSv: true, coachId: true } })
  for (const r of rows) { const prio = r.coachId === COACH ? 2 : 1; put(drMap, r.name, r.id, prio); put(drMap, r.nameSv, r.id, prio) }
}
function ex(name: string): string {
  const c = ALIAS_EX[name] ?? name; const hit = exMap.get(norm(c)); if (!hit) throw new Error(`UNRESOLVED EXERCISE: "${name}" (canonical "${c}")`); return hit.id
}
function dr(name: string): string {
  const c = ALIAS_DR[name] ?? name; const hit = drMap.get(norm(c)); if (!hit) throw new Error(`UNRESOLVED DRILL: "${name}" (canonical "${c}")`); return hit.id
}
async function ensureNew() {
  let exC = 0
  for (const e of NEW_EX) {
    if (await p.exercise.findFirst({ where: { name: e.name, OR: [{ businessId: BIZ }, { coachId: COACH }] }, select: { id: true } })) continue
    await p.exercise.create({ data: { name: e.name, nameSv: e.name, category: e.cat as any, biomechanicalPillar: e.pillar as any, description: e.desc, isHybridMovement: false, isPublic: false, coachId: COACH, businessId: BIZ } }); exC++
  }
  let drC = 0
  for (const d of NEW_DR) {
    if (await p.agilityDrill.findFirst({ where: { name: d.name, coachId: COACH }, select: { id: true } })) continue
    await p.agilityDrill.create({ data: { name: d.name, nameSv: d.name, category: d.cat as any, descriptionSv: d.desc, primarySports: ['TEAM_ICE_HOCKEY'] as any, isSystemDrill: false, coachId: COACH } }); drC++
  }
  console.log(`Exercises created: ${exC}/${NEW_EX.length}; Drills created: ${drC}/${NEW_DR.length}`)
}

// ============================================================
// 2. Cleanup prior run (by MARKER) — scoped to this team
// ============================================================
async function cleanup() {
  const bcs = await p.teamWorkoutBroadcast.findMany({ where: { teamId: TEAM, notes: { contains: MARKER } }, select: { id: true } })
  const bcIds = bcs.map((b) => b.id)
  if (bcIds.length) {
    await p.strengthSessionAssignment.deleteMany({ where: { teamBroadcastId: { in: bcIds } } })
    await p.cardioSessionAssignment.deleteMany({ where: { teamBroadcastId: { in: bcIds } } })
    await p.hybridWorkoutAssignment.deleteMany({ where: { teamBroadcastId: { in: bcIds } } })
    await p.agilityWorkoutAssignment.deleteMany({ where: { teamBroadcastId: { in: bcIds } } })
  }
  await p.teamEvent.deleteMany({ where: { teamId: TEAM, description: { contains: MARKER } } })
  await p.teamWorkoutBroadcast.deleteMany({ where: { id: { in: bcIds } } })
  const tmplWhere = { tags: { hasEvery: [MARKER, businessTag] } }
  const sIds = (await p.strengthSession.findMany({ where: tmplWhere, select: { id: true } })).map((x) => x.id)
  const cIds = (await p.cardioSession.findMany({ where: tmplWhere, select: { id: true } })).map((x) => x.id)
  const hIds = (await p.hybridWorkout.findMany({ where: tmplWhere, select: { id: true } })).map((x) => x.id)
  const aIds = (await p.agilityWorkout.findMany({ where: tmplWhere, select: { id: true } })).map((x) => x.id)
  if (sIds.length) await p.strengthSessionAssignment.deleteMany({ where: { sessionId: { in: sIds } } })
  if (cIds.length) await p.cardioSessionAssignment.deleteMany({ where: { sessionId: { in: cIds } } })
  if (hIds.length) await p.hybridWorkoutAssignment.deleteMany({ where: { workoutId: { in: hIds } } })
  if (aIds.length) await p.agilityWorkoutAssignment.deleteMany({ where: { workoutId: { in: aIds } } })
  if (sIds.length) await p.strengthSession.deleteMany({ where: { id: { in: sIds } } })
  if (cIds.length) await p.cardioSession.deleteMany({ where: { id: { in: cIds } } })
  if (hIds.length) await p.hybridWorkout.deleteMany({ where: { id: { in: hIds } } })
  if (aIds.length) await p.agilityWorkout.deleteMany({ where: { id: { in: aIds } } })
  await p.teamPlan.deleteMany({ where: { teamId: TEAM, name: { contains: MARKER } } })
  console.log(`Cleanup: removed ${bcIds.length} broadcasts + templates + plan`)
}

// ============================================================
// 3. Template builders
// ============================================================
type Item = { exerciseName: string; exerciseId: string; sets: number; reps: string; weight?: number; weightUnit?: string; restSeconds?: number; notes?: string }
function mk(name: string, sets: number, reps: string, opts: Partial<Item> = {}): Item { return { exerciseName: name, exerciseId: ex(name), sets, reps, ...opts } }
function cardioWU(min: number, notes?: string) { const n = 'Uppvärmning valfritt redskap'; return { kind: 'cardio', sets: 1, reps: '', intensity: 'MODERATE', exerciseId: ex(n), exerciseName: n, durationSeconds: min * 60, notes } }
async function strength(name: string, phase: string, est: number, warmup: any, exercises: Item[], core?: Item[], desc?: string) {
  const r = await p.strengthSession.create({ data: { name, description: desc, phase: phase as any, estimatedDuration: est, exercises: J(exercises), warmupData: warmup ? J(warmup) : undefined, coreData: core ? J({ exercises: core }) : undefined, coachId: COACH, isPublic: false, trainingYear: TRAINING_YEAR, tags: TAGS, totalExercises: exercises.length, totalSets: exercises.reduce((s, e) => s + (e.sets || 0), 0) }, select: { id: true } }); return r.id
}
async function cardio(name: string, sport: string, segments: any[], desc?: string) {
  let total = 0
  for (const s of segments) { if (s.type === 'REPEAT_GROUP') { const per = (s.steps || []).reduce((a: number, st: any) => a + (st.duration || 0), 0); total += per * (s.repeats || 1) + (s.restBetweenRounds || 0) * Math.max((s.repeats || 1) - 1, 0) } else total += s.duration || 0 }
  const r = await p.cardioSession.create({ data: { name, description: desc, sport: sport as any, segments: J(segments), totalDuration: total, coachId: COACH, isPublic: false, trainingYear: TRAINING_YEAR, tags: TAGS }, select: { id: true } }); return r.id
}
type Mv = { name: string; reps?: number; calories?: number; distance?: number; duration?: number; weightMale?: number; notes?: string }
type Block = { id: string; title: string; notes?: string; format: string; rounds?: number; intervalSeconds?: number; restAfterSeconds?: number; movements: Mv[] }
async function hybrid(name: string, fields: { format: string; totalRounds?: number; timeCap?: number; repScheme?: string; warmupNotes?: string; warmupDuration?: number }, blocks: Block[], desc?: string) {
  const flat: any[] = []; let order = 1
  for (const b of blocks) for (const m of b.movements) flat.push({ order: order++, exerciseId: ex(m.name), reps: m.reps ?? null, calories: m.calories ?? null, distance: m.distance ?? null, duration: m.duration ?? null, weightMale: m.weightMale ?? null, weightUnit: 'kg', notes: m.notes ?? null })
  const metconData = { blocks: blocks.map((b) => ({ id: b.id, title: b.title, notes: b.notes, format: b.format, rounds: b.rounds, intervalSeconds: b.intervalSeconds, restAfterSeconds: b.restAfterSeconds, movements: b.movements.map((m, i) => ({ order: i + 1, exerciseId: ex(m.name), exerciseName: m.name, reps: m.reps, calories: m.calories, distance: m.distance, duration: m.duration, weightMale: m.weightMale, notes: m.notes })) })) }
  const r = await p.hybridWorkout.create({ data: { name, description: desc, format: fields.format as any, totalRounds: fields.totalRounds, timeCap: fields.timeCap, repScheme: fields.repScheme, scalingLevel: 'RX' as any, warmupData: fields.warmupNotes ? J({ notes: fields.warmupNotes, duration: fields.warmupDuration }) : undefined, metconData: J(metconData), coachId: COACH, isPublic: false, trainingYear: TRAINING_YEAR, tags: TAGS, movements: { create: J(flat) } }, select: { id: true } }); return r.id
}
type Drl = { name: string; sectionType?: string; sets?: number; reps?: number; duration?: number; restSeconds?: number; notes?: string }
async function agility(name: string, fields: { restBetweenDrills?: number; totalDuration?: number; primaryFocus?: string }, drills: Drl[], desc?: string) {
  const rows = drills.map((d, i) => ({ drillId: dr(d.name), order: i + 1, sectionType: (d.sectionType || 'MAIN') as any, sets: d.sets ?? null, reps: d.reps ?? null, duration: d.duration ?? null, restSeconds: d.restSeconds ?? null, notes: d.notes ?? null }))
  const r = await p.agilityWorkout.create({ data: { name, description: desc, format: 'CIRCUIT' as any, restBetweenDrills: fields.restBetweenDrills ?? 60, totalDuration: fields.totalDuration ?? 60, primaryFocus: (fields.primaryFocus || 'COD') as any, developmentStage: 'ELITE' as any, targetSports: ['TEAM_ICE_HOCKEY'] as any, coachId: COACH, isPublic: false, trainingYear: TRAINING_YEAR, tags: TAGS, drills: { create: J(rows) } }, select: { id: true } }); return r.id
}

// ============================================================
// 4. Team distribution
// ============================================================
type Kind = 'strength' | 'cardio' | 'hybrid'
const LINKED: Record<string, string> = { strength: 'STRENGTH', cardio: 'CARDIO', hybrid: 'HYBRID' }
let ROSTER: string[] = []
async function distribute(kind: Kind, templateId: string, name: string, dateStr: string, evType: string, notes?: string) {
  const d = D(dateStr)
  const bc = await p.teamWorkoutBroadcast.create({
    data: {
      teamId: TEAM, coachId: COACH,
      strengthSessionId: kind === 'strength' ? templateId : null,
      cardioSessionId: kind === 'cardio' ? templateId : null,
      hybridWorkoutId: kind === 'hybrid' ? templateId : null,
      agilityWorkoutId: null,
      assignedDate: d, notes: `[${MARKER}] ${name}`, totalAssigned: ROSTER.length, totalCompleted: 0,
    },
    select: { id: true },
  })
  const base = (athleteId: string) => ({ athleteId, assignedDate: d, assignedBy: COACH, responsibleCoachId: COACH, teamBroadcastId: bc.id, notes: notes ?? null })
  if (kind === 'strength') await p.strengthSessionAssignment.createMany({ data: ROSTER.map((id) => ({ ...base(id), sessionId: templateId, status: 'PENDING' as any })), skipDuplicates: true })
  else if (kind === 'cardio') await p.cardioSessionAssignment.createMany({ data: ROSTER.map((id) => ({ ...base(id), sessionId: templateId, status: 'PENDING' as any })), skipDuplicates: true })
  else await p.hybridWorkoutAssignment.createMany({ data: ROSTER.map((id) => ({ ...base(id), workoutId: templateId, status: 'PENDING' as any })), skipDuplicates: true })
  await p.teamEvent.create({
    data: {
      teamId: TEAM, title: name, type: evType as any, description: `[${MARKER}] ${name}`,
      contentStatus: 'ASSIGNED' as any, contentOwner: 'physical_trainer',
      linkedWorkoutType: LINKED[kind] as any, linkedWorkoutId: templateId, linkedWorkoutName: name,
      assignedBroadcastId: bc.id, assignedAt: NOW, responsibleCoachId: COACH, startDate: d, allDay: true, createdById: COACH,
    },
  })
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  await loadExercises(); await loadDrills(); await ensureNew(); await loadExercises(); await loadDrills()

  // roster = team members with an athlete account, in the Star by Thomson business
  const members = await p.client.findMany({ where: { teamId: TEAM, businessId: BIZ, athleteAccount: { isNot: null } }, select: { id: true, name: true } })
  ROSTER = members.map((m) => m.id)
  console.log(`Roster (athleteAccount holders): ${ROSTER.length}`)
  if (ROSTER.length === 0) throw new Error('No eligible roster members')

  await cleanup()

  // ---------- warmups ----------
  const wuMax1 = { duration: 10, exercises: [cardioWU(10, 'Allmän uppvärmning.'), mk('Stabilitetskomplex med G-band', 2, '8+8+8+8', { notes: 'Musslan, benlyft, bencykel, benpendling. Öka 1/övn/vecka.' }), mk('Crossover step up på bänk', 2, '6-8/sida', { notes: 'Bänk med stång om trångt på kabelmaskinerna.' }), mk('OHS med stång', 2, '6-8', { notes: 'Var noga med neutral rygg.' }), mk('Deadbug 2-punktspress', 2, '8-10/sida')] }
  const wuMax2 = { duration: 10, exercises: [cardioWU(10, 'Allmän uppvärmning.'), mk('Magliggande höftextension+abd', 2, '10-15/sida'), mk('Pistols på bänk', 2, '6/ben', { notes: 'Stöd med pinne om för svårt, alt vikt i handen.' }), mk('Krabbstående höftflexion', 2, '10-15/sida'), mk('Deadbug 2-punktspress', 2, '8-10/sida')] }
  const wuPow1 = { duration: 10, exercises: [cardioWU(10, 'Allmän uppvärmning.'), mk('Stabilitetskomplex', 2, '8+8+8+8', { notes: 'Musslan, benlyft, bencykel, benpendling.' }), mk('Goblet squat flowin', 2, '8/ben', { notes: 'Enbensböj, glid ut med andra till sidan.' }), mk('Front squat+ OH-press', 2, '6', { notes: 'Neutral ländrygg, axelpress i botten.' })] }
  const wuPow2 = { duration: 10, exercises: [cardioWU(10, 'Allmän uppvärmning.'), mk('Enbensstående', 2, '10/övn', { notes: 'Bomben, bensträck, skridskoskär.' }), mk('Magliggande höftextension', 2, '10-12'), mk('Krabbstående höftflexion', 2, '10-12'), mk('Adduktorplankan', 2, '8/sida')] }

  // ===== STRENGTH =====
  const S_MAX1 = await strength('Maxstyrka 1', 'MAXIMUM_STRENGTH', 90, wuMax1, [
    mk('Knäböj', 6, '3', { notes: 'V28–30 (vecka 3–5): 7×2. Häckhopp 4 st som kontrast direkt efter varje set (höjd 0.85, V28–30 0.875).' }),
    mk('Häck hopp', 6, '4', { notes: 'Kontrasthopp direkt efter knäböj. 0.85 (V28–30: 0.875).' }),
    mk('Utfall med stepup på bänk', 4, '4/ben', { notes: 'V28–30: 5×3/ben.' }),
    mk('Enbensmark m.stång', 4, '5/ben'),
    mk('Pushpress med stång', 4, '5'),
    mk('Gorilla row med KB', 3, '8/arm', { notes: 'Ganska tungt. V28–30: 3×6/arm.' }),
    mk('Slädsprintar', 6, '10 m', { notes: 'Maximal insats! Kroppsvikt och 2 min vila mellan.' }),
  ], [
    mk('Bålrotation i cable med boll', 3, '8-12'),
    mk('Toes to bar', 3, '10-15'),
    mk('Throwing dumbell', 3, '8-10'),
  ], 'Maxstyrka 1 — PHC A-lag. Mån. V28–30 progression i noter (Knäböj 7×2, Utfall 5×3, Gorilla 3×6, kontrasthopp 0.875).')

  const S_MAX2 = await strength('Maxstyrka 2', 'MAXIMUM_STRENGTH', 90, wuMax2, [
    mk('Frivändningar', 6, '8/3', { notes: '1×8 uppvärmning + 5×3 stegrande serie. V28–30: 6×2.' }),
    mk('Hexabar', 6, '3', { notes: 'Touch and go! Djupt grepp! V28–30: 6×2. Hopp från sittande 3 st som kontrast efter (0.85→0.875).' }),
    mk('Hopp från sittande', 6, '3', { notes: 'Kontrast direkt efter Hexabar.' }),
    mk('Hip thrusters', 4, '4', { notes: 'V28–30: 5×3. 0.85→0.875.' }),
    mk('Bänkpress', 5, '4'),
    mk('Viktade Chins', 4, '5', { notes: 'På minsta antal set (om 1–2 set, kör med påhäng).' }),
    mk('Bänkdrag', 4, '8', { notes: 'Helst med fatbar.' }),
  ], [
    mk('Leg lever med pilatesboll', 3, '10-15'),
    mk('Skottkärran benindrag', 3, '10-15/sida', { notes: 'På P-boll.' }),
    mk('Bålrotation i cable växlande', 3, '8-10/sida'),
  ], 'Maxstyrka 2 — PHC A-lag. Tor (deload-veckan: ons). V28–30 progression i noter.')

  const S_POW1 = await strength('Powerstyrka 1', 'POWER', 75, wuPow1, [
    mk('Frivändningar', 5, '5', { notes: 'Klusterset, 5 varv ~5 min/varv, 75% av max på stången.' }),
    mk('Chest to bar', 5, '5', { notes: 'Bröstkorg till stången.' }),
    mk('Bulgarian split squat', 5, '5/ben', { notes: 'Våga utmana i djupet.' }),
    mk('Smal bänkpress', 5, '5'),
    mk('Pull/push landmine', 5, '5/arm'),
  ], [
    mk('Situpskast med MB', 4, '6', { notes: 'Start med rygg/axlar/boll i backen. Neutral rygg, ingen svank. 3–5 kg.' }),
    mk('Alternerande bålrotation cable/G-band', 3, '6', { notes: 'Lätt böjda armar, fart på rörelsen.' }),
  ], 'Powerstyrka 1 — PHC A-lag. Mån vecka 5.')

  const S_POW2 = await strength('Powerstyrka 2', 'POWER', 75, wuPow2, [
    mk('Knäböj', 4, '4', { notes: 'Gå relativt tungt med fart. 80–85%.' }),
    mk('Skatejump mot box', 4, '2/sida'),
    mk('Hexabar', 4, '5', { notes: '75–80%. Med fart, upp på tå.' }),
    mk('Push jerk', 4, '5', { notes: 'Använd benen, fart på stången, fånga djupare än på pushpress.' }),
    mk('Nordic hamstrings curl', 3, '6-8'),
    mk('5-punktsrot i cable', 3, '3/pos', { notes: 'Splitstående, explosiv rörelse.' }),
  ], [
    mk('Deadbug på bosuboll', 3, '6-8/ben', { notes: 'Med kontroll, stressa ej.' }),
    mk('Diagonal fällkniv', 3, '8/sida', { notes: 'Med fart, en sida åt gången, rakt ben + armbåge mot knä.' }),
    mk('Bollkast antirot', 3, '6-8/sida'),
  ], 'Powerstyrka 2 — PHC A-lag. Mån vecka 6.')

  const S_STAB = await strength('Stab + kond (funktionell stabstyrka)', 'ANATOMICAL_ADAPTATION', 75, { duration: 5, exercises: [cardioWU(5, 'Lätt uppvärmning.')] }, [
    mk('Skuldercomplex', 3, '12', { notes: '6–7 kg. Tänk på att inte tappa bålen (ej svanka).' }),
    mk('Krabbstående studsa boll', 3, '1 min/sida'),
    mk('Benböj stående på boll', 3, '10-12', { notes: 'Stå bredbent, pressa fötterna mot mitten, långsamma benböj till 90°.' }),
    mk('Bomben', 3, '8-15/ben', { notes: 'Med 10 kg hantel på bröstet.' }),
    mk('Knästräck med höftflex 90', 3, '8-15/ben', { notes: 'Med 10 kg hantel på bröstet.' }),
    mk('Knästräck i skatepos med abd lår', 3, '8-15/ben', { notes: 'Med 10 kg hantel på bröstet.' }),
    mk('Axelflex+press', 4, '1+4', { notes: 'Lyft upp på raka armar, 4 pressar bakom nacken, ner på raka armar.' }),
    mk('Flies 3-pos', 3, '8/pos'),
    mk('Skottkärran rotation', 3, '10/sida'),
    mk('Lutande båldrag', 3, '12-15', { notes: 'Stå lutad mot dragmaskin, dra ner stång på raka armar, stabil bål, 1 ben i luften.' }),
    mk('Tricepsdrag 1 ben i luften', 3, '12/sida'),
    mk('Hantelpress 1 ben i luften', 3, '12/sida'),
  ], undefined, 'Stab + kond — PHC A-lag. Ons. Funktionell stabstyrka (cirkel, 2–3 varv efter kvalitet — lägg reps utifrån korrekt utförande). Avsluta med konditionsblock: assault/cykel/rodd 5 min värmning, 8×60/30 s (helst assaultbike, 65–75 rpm), 5 min nedvarv — 3 varv. Alternativ denna dag: Agility-passet i biblioteket.')

  // ===== CARDIO =====
  const vo2 = (label: string, reps: number, dist: number, rest: number, week: string) => cardio(`VO2 max – ${label}`, 'RUNNING', [
    { id: 'wu', type: 'WARMUP', zone: 1, duration: 600, equipment: 'RUN', notes: 'Jogg 10 min.' },
    { id: 'main', type: 'REPEAT_GROUP', repeats: reps, restBetweenRounds: rest, steps: [{ id: 's', type: 'INTERVAL', zone: dist >= 800 ? 4 : 5, distance: dist, equipment: 'RUN', notes: `${label}. Samma tempo alla intervaller, sista ska du få kriga för.` }] },
    { id: 'cd', type: 'COOLDOWN', zone: 1, duration: 600, equipment: 'RUN', notes: 'Nedvarv 10 min, lågt tempo.' },
  ], `VO2 max (${week}). ${label}, ${rest}s vila. Höj tempo varje vecka när distanserna kortas. Går även på cykel eller rodd.`)
  const C_VO2_1000 = await vo2('6×1000 m', 6, 1000, 120, 'vecka 1')
  const C_VO2_800 = await vo2('8×800 m', 8, 800, 120, 'vecka 2')
  const C_VO2_600 = await vo2('12×600 m', 12, 600, 120, 'vecka 3')
  const C_VO2_400 = await vo2('16×400 m', 16, 400, 90, 'vecka 4 (deload)')
  const C_VO2_200 = await vo2('20×200 m', 20, 200, 60, 'vecka 5–6')

  const C_KOND = await cardio('Kondition – 8×4 min', 'FUNCTIONAL_FITNESS', [
    { id: 'wu', type: 'WARMUP', zone: 1, duration: 600, notes: 'Jogg / cykel / rodd / assault 10 min.' },
    { id: 'main', type: 'REPEAT_GROUP', repeats: 8, restBetweenRounds: 180, steps: [{ id: 's', type: 'INTERVAL', zone: 4, duration: 240, equipment: 'WATTBIKE', notes: 'Högsta möjliga snitt rpm/watt. Ska ej diffa >5% mellan intervaller.' }] },
    { id: 'cd', type: 'COOLDOWN', zone: 1, duration: 600, notes: 'Nedvarv 10 min.' },
  ], 'Kondition: 8×4 min, 3 min serievila. Cykel/rodd/assault — högt jämnt tempo, <5% diff mellan intervaller.')

  const C_JOGG = await cardio('Lätt jogg 5–6 km', 'RUNNING', [
    { id: 'main', type: 'STEADY', zone: 2, duration: 2400, equipment: 'RUN', notes: '5–6 km lätt jogg, ej snabbt. Totaltid ca 40 min.' },
  ], 'Söndagsjogg: 5–6 km lätt (ej snabbt), ~40 min.')

  // ===== HYBRID =====
  const H_RODD = await hybrid('Roddhybrid', { format: 'FOR_TIME', totalRounds: 9, timeCap: 510, repScheme: '3 serier × 3 varv', warmupNotes: 'Rodd 2 km uppvärmning.', warmupDuration: 600 }, [
    { id: 'main', title: '3 serier av 3 varv (9 varv totalt)', notes: 'Timecap: ej över 8:30 per serie. Bör ej skilja >10 s mellan varven. 3 min serievila. Nedvarv: 2 km rodd.', format: 'FOR_TIME', rounds: 9, restAfterSeconds: 180, movements: [
      { name: 'Rodd', distance: 500, notes: '500 m rodd.' },
      { name: 'Marklyft', reps: 10, weightMale: 60, notes: '60 kg.' },
      { name: 'Burpees', reps: 10 },
    ] },
  ], 'Roddhybrid (aerob uthållighet). 2 km rodd uppv. 3 serier × 3 varv: 500 m rodd / 10 marklyft 60 kg / 10 burpees. Timecap 8:30/serie, 3 min serievila. 2 km rodd nedvarv.')

  const H_AB = await hybrid('Hybrid – Assault bike (alt 2)', { format: 'FOR_TIME', totalRounds: 3, repScheme: '3 rundor', warmupNotes: '10 min uppvärmning.', warmupDuration: 600 }, [
    { id: 'main', title: '3 rundor', notes: 'Högt och utmanande tempo, vidhåll farten genom varven. 3 min serievila. Nedvarv 10 min extra volym.', format: 'FOR_TIME', rounds: 3, restAfterSeconds: 180, movements: [
      { name: 'Assault bike', calories: 30, notes: '30 kcal.' },
      { name: 'KB-sving', reps: 15, weightMale: 32, notes: '32 kg.' },
      { name: 'Burpees', reps: 10 },
    ] },
  ], 'Hybrid alternativ 2 (bibliotek). 3 rundor: 30 kcal assault bike / 15 KB-sving 32 kg / 10 burpees. 3 min serievila.')

  const H_BLOCK = await hybrid('Hybrid – Block (alt 3)', { format: 'EMOM', totalRounds: 7, repScheme: '3 block × 7 varv E2MOM', warmupNotes: '10 min valfri konditionsmaskin.', warmupDuration: 600 }, [
    { id: 'b1', title: 'Block 1 — 7 varv, starta varje 2 min', notes: '3 min vila efter blocket.', format: 'EMOM', rounds: 7, intervalSeconds: 120, movements: [{ name: 'Rodd', calories: 19, notes: '18–20 cal.' }, { name: 'Utfallssteg', reps: 12, weightMale: 32, notes: '2×16 kg.' }] },
    { id: 'b2', title: 'Block 2 — 7 varv, starta varje 2 min', notes: '3 min vila efter blocket.', format: 'EMOM', rounds: 7, intervalSeconds: 120, movements: [{ name: 'Assault bike', calories: 19, notes: '18–20 cal.' }, { name: 'Boxjump over', reps: 10 }] },
    { id: 'b3', title: 'Block 3 — 7 varv, starta varje 2 min', notes: 'Nedvarv 10 min valfri maskin.', format: 'EMOM', rounds: 7, intervalSeconds: 120, movements: [{ name: 'Löpning', distance: 200, notes: '200 m runt CF-hallen.' }, { name: 'Marklyft', reps: 10, weightMale: 60, notes: '60 kg.' }] },
  ], 'Hybrid alternativ 3 (bibliotek). 3 block E2MOM (7 varj, starta nytt varv var 2:e min), 3 min vila mellan block.')

  const H_ANAEROB = await hybrid('Anaerob uthållighet', { format: 'EMOM', totalRounds: 6, repScheme: 'Del 1: 5–6 rundor (par) + Del 2: assault-pyramid', warmupNotes: 'Generell uppvärmning 10 min (+ preworkout).', warmupDuration: 600 }, [
    { id: 'd1', title: 'Del 1 — 5–6 rundor, starta varje 2 min (i par)', notes: 'MAX! Kör i par: ena kör allt, nästa startar efter 2 min, första igen efter 4 min etc.', format: 'EMOM', rounds: 6, intervalSeconds: 120, movements: [
      { name: 'Step up', reps: 12, weightMale: 20, notes: '20 kg KB.' },
      { name: 'KB-sving', reps: 9 },
      { name: 'Box jump over', reps: 6 },
      { name: 'Rodd', distance: 250, notes: '250 m.' },
    ] },
    { id: 'd2', title: 'Del 2 — Assault bike, 3 rundor, starta varje 3 min', notes: '45 s (15-15-15 / 45 s vila, 80–90→max rpm), 30 s (15-15 / 45 s vila, 90→max), 15 s (max rpm).', format: 'EMOM', rounds: 3, intervalSeconds: 180, movements: [
      { name: 'Assault bike', duration: 45, notes: 'Pyramid 45/30/15 s, se blocknot.' },
    ] },
  ], 'Anaerob uthållighet — PHC A-lag. Tor (deload-veckan). Del 1: par-EMOM step up/KB-sving/box jump over/rodd. Del 2: assault-bike pyramid 45/30/15 s.')

  // ===== AGILITY (library only) =====
  const A_AGILITY = await agility('Snabbhet / Agility', { restBetweenDrills: 45, totalDuration: 60, primaryFocus: 'COD' }, [
    { name: 'Häckar', sectionType: 'WARMUP', sets: 2, notes: 'Del 1 (efter 10 min uppvärmning inkl. jogg): 2× rakt fram/ben + 2× sidled/ben.' },
    { name: 'Stege', sectionType: 'WARMUP', sets: 4, notes: 'Del 1: in/ut med g-band 4 ggr, sidosteg tillbaka 2/sida.' },
    { name: 'Snakerope', duration: 15, restSeconds: 45, notes: 'Varv 1–3 (3×15/45 s). Konstant sidledslöp.' },
    { name: 'Åttan med MB', duration: 15, restSeconds: 45, notes: 'Varv 1–3. Drag framifrån.' },
    { name: 'Armhopp + burpee', duration: 15, restSeconds: 45, notes: 'Varv 1–3.' },
    { name: 'Slamball', duration: 15, restSeconds: 45, notes: 'Varv 1–3. Serievila 2 min (skifta övningar). Sedan repeated sprints 25 m, 3 min (4/6 s), vila 60–90 s.' },
    { name: 'Snakerope', duration: 15, restSeconds: 45, notes: 'Varv 4–6. Med slam.' },
    { name: 'Åttan med kontouch', duration: 15, restSeconds: 45, notes: 'Varv 4–6. Drag bakifrån, tre koner.' },
    { name: 'Löpning 5-10-15m', duration: 15, restSeconds: 45, notes: 'Varv 4–6.' },
    { name: 'Krokar i utfall', duration: 15, restSeconds: 45, notes: 'Varv 4–6. 4 st innan hopp. Serievila 2 min. Avsluta: slädpush 3× 2×25 m, vila 60–90 s.' },
  ], 'Snabbhet/Agility (bibliotek) — alternativ till Stab+kond på onsdagar. Del 1 uppvärmning + Del 2 stationsvarv 3×15/45 s, två rundor (varv 1–3 / varv 4–6), repeated sprints + slädpush emellan.')

  // ===== TEAM PLAN =====
  await p.teamPlan.create({
    data: {
      teamId: TEAM, coachId: COACH, name: `Piteå Hockey A-lag – ${MARKER}`,
      description: `Grundschema sommar 2026 (6 veckor, 29/6–9/8). Mån styrka 1 · Tis VO2 max · Ons stab+kond · Tor styrka 2 · Fre hybrid · Sön lätt jogg. [${MARKER}]`,
      status: 'ACTIVE', startDate: D('2026-06-28'), endDate: D('2026-08-09'),
      blocks: {
        create: [
          { order: 1, title: 'V1 (29/6) – Maxstyrkeblock', focus: 'Maxstyrka', startDate: D('2026-06-29'), endDate: D('2026-07-05'), description: 'Mån Maxstyrka 1 · Tis VO2 6×1000 m · Ons Stab+kond · Tor Maxstyrka 2 · Fre Roddhybrid · Sön jogg.' },
          { order: 2, title: 'V2 (6/7) – Maxstyrkeblock', focus: 'Maxstyrka', startDate: D('2026-07-06'), endDate: D('2026-07-12'), description: 'Mån Maxstyrka 1 · Tis VO2 8×800 m · Ons Stab+kond · Tor Maxstyrka 2 · Fre Roddhybrid · Sön jogg.' },
          { order: 3, title: 'V3 (13/7) – Maxstyrkeblock', focus: 'Maxstyrka (progression)', startDate: D('2026-07-13'), endDate: D('2026-07-19'), description: 'Mån Maxstyrka 1 (7×2) · Tis VO2 12×600 m · Ons Stab+kond · Tor Maxstyrka 2 · Fre Roddhybrid · Sön jogg.' },
          { order: 4, title: 'V4 (20/7) – Avlastningsvecka', focus: 'Deload', startDate: D('2026-07-20'), endDate: D('2026-07-26'), description: 'Mån Maxstyrka 1 · Tis Kondition 8×4 min · Ons Maxstyrka 2 · Tor Anaerob uthållighet. (Fre–Sön vila/lätt.)' },
          { order: 5, title: 'V5 (27/7) – Powerblock', focus: 'Power', startDate: D('2026-07-27'), endDate: D('2026-08-02'), description: 'Mån Powerstyrka 1 · Tis VO2 20×200 m · Ons Stab+kond · Tor Maxstyrka 2 · Fre Roddhybrid · Sön jogg.' },
          { order: 6, title: 'V6 (3/8) – Powerblock', focus: 'Power', startDate: D('2026-08-03'), endDate: D('2026-08-09'), description: 'Mån Powerstyrka 2 · Tis VO2 20×200 m · Ons Stab+kond · Tor Maxstyrka 2 · Fre Roddhybrid · Sön jogg. (V7 = återsamling + tester, på plats.)' },
        ],
      },
    },
  })

  // ===== DISTRIBUTE (one main session/day) =====
  const STR = 'STRENGTH', PRE = 'PREHAB', CAR = 'CARDIO', HYB = 'HYBRID'
  const sched: { date: string; kind: Kind; tmpl: string; name: string; ev: string }[] = [
    // V1
    { date: '2026-06-29', kind: 'strength', tmpl: S_MAX1, name: 'Maxstyrka 1', ev: STR },
    { date: '2026-06-30', kind: 'cardio', tmpl: C_VO2_1000, name: 'VO2 max – 6×1000 m', ev: CAR },
    { date: '2026-07-01', kind: 'strength', tmpl: S_STAB, name: 'Stab + kond', ev: PRE },
    { date: '2026-07-02', kind: 'strength', tmpl: S_MAX2, name: 'Maxstyrka 2', ev: STR },
    { date: '2026-07-03', kind: 'hybrid', tmpl: H_RODD, name: 'Roddhybrid', ev: HYB },
    { date: '2026-07-05', kind: 'cardio', tmpl: C_JOGG, name: 'Lätt jogg 5–6 km', ev: CAR },
    // V2
    { date: '2026-07-06', kind: 'strength', tmpl: S_MAX1, name: 'Maxstyrka 1', ev: STR },
    { date: '2026-07-07', kind: 'cardio', tmpl: C_VO2_800, name: 'VO2 max – 8×800 m', ev: CAR },
    { date: '2026-07-08', kind: 'strength', tmpl: S_STAB, name: 'Stab + kond', ev: PRE },
    { date: '2026-07-09', kind: 'strength', tmpl: S_MAX2, name: 'Maxstyrka 2', ev: STR },
    { date: '2026-07-10', kind: 'hybrid', tmpl: H_RODD, name: 'Roddhybrid', ev: HYB },
    { date: '2026-07-12', kind: 'cardio', tmpl: C_JOGG, name: 'Lätt jogg 5–6 km', ev: CAR },
    // V3
    { date: '2026-07-13', kind: 'strength', tmpl: S_MAX1, name: 'Maxstyrka 1', ev: STR },
    { date: '2026-07-14', kind: 'cardio', tmpl: C_VO2_600, name: 'VO2 max – 12×600 m', ev: CAR },
    { date: '2026-07-15', kind: 'strength', tmpl: S_STAB, name: 'Stab + kond', ev: PRE },
    { date: '2026-07-16', kind: 'strength', tmpl: S_MAX2, name: 'Maxstyrka 2', ev: STR },
    { date: '2026-07-17', kind: 'hybrid', tmpl: H_RODD, name: 'Roddhybrid', ev: HYB },
    { date: '2026-07-19', kind: 'cardio', tmpl: C_JOGG, name: 'Lätt jogg 5–6 km', ev: CAR },
    // V4 deload
    { date: '2026-07-20', kind: 'strength', tmpl: S_MAX1, name: 'Maxstyrka 1', ev: STR },
    { date: '2026-07-21', kind: 'cardio', tmpl: C_KOND, name: 'Kondition – 8×4 min', ev: CAR },
    { date: '2026-07-22', kind: 'strength', tmpl: S_MAX2, name: 'Maxstyrka (ons)', ev: STR },
    { date: '2026-07-23', kind: 'hybrid', tmpl: H_ANAEROB, name: 'Anaerob uthållighet', ev: HYB },
    // V5
    { date: '2026-07-27', kind: 'strength', tmpl: S_POW1, name: 'Powerstyrka 1', ev: STR },
    { date: '2026-07-28', kind: 'cardio', tmpl: C_VO2_200, name: 'VO2 max – 20×200 m', ev: CAR },
    { date: '2026-07-29', kind: 'strength', tmpl: S_STAB, name: 'Stab + kond', ev: PRE },
    { date: '2026-07-30', kind: 'strength', tmpl: S_MAX2, name: 'Maxstyrka 2', ev: STR },
    { date: '2026-07-31', kind: 'hybrid', tmpl: H_RODD, name: 'Roddhybrid', ev: HYB },
    { date: '2026-08-02', kind: 'cardio', tmpl: C_JOGG, name: 'Lätt jogg 5–6 km', ev: CAR },
    // V6
    { date: '2026-08-03', kind: 'strength', tmpl: S_POW2, name: 'Powerstyrka 2', ev: STR },
    { date: '2026-08-04', kind: 'cardio', tmpl: C_VO2_200, name: 'VO2 max – 20×200 m', ev: CAR },
    { date: '2026-08-05', kind: 'strength', tmpl: S_STAB, name: 'Stab + kond', ev: PRE },
    { date: '2026-08-06', kind: 'strength', tmpl: S_MAX2, name: 'Maxstyrka 2', ev: STR },
    { date: '2026-08-07', kind: 'hybrid', tmpl: H_RODD, name: 'Roddhybrid', ev: HYB },
    { date: '2026-08-09', kind: 'cardio', tmpl: C_JOGG, name: 'Lätt jogg 5–6 km', ev: CAR },
  ]
  for (const s of sched) await distribute(s.kind, s.tmpl, s.name, s.date, s.ev)

  console.log(`Distributed ${sched.length} workouts to ${ROSTER.length} athletes.`)
  console.log('Library-only templates:', { A_AGILITY, H_AB, H_BLOCK })
  console.log('DONE.')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => p.$disconnect())
