/**
 * Import Måns Josbrant off-season hockey program (Block 1 + Block 2, weeks V27–V29)
 * into Star by Thomson, starting Mon 2026-06-29.
 *
 * Source: ~/Downloads/Måns Josbrant.xlsx (sheets "Styrka 1/2 V26-V28", "Tisdag Kond",
 * "Överkropp", "Stab-Ext pl", "Fre högintensiv", and the V29-V31 block).
 *
 * Decisions (confirmed with Henrik 2026-06-29):
 *  - 3 weeks: V27 & V28 use Block-1 templates, V29 uses Block-2 templates.
 *  - Normalised canonical week: Mon Styrka1 / Tis Kondition / Ons Stab(FM)+Överkropp(EM)
 *    / Tor Styrka2 / Fre högintensiv / Lör Lågintensivt. Sön vila.
 *  - On-ice/agility/wrestling sessions SKIPPED (run on-site, not in the app).
 *  - Default variant only (no VAL1/VAL2 / "alt" duplicates).
 *  - Bundled as a TrainingProgram ("program") AND an AthletePlan ("plan").
 *
 * Idempotent: re-running cleans up the prior run's program/assignments/calendar
 * events/templates/plan (matched by MARKER) and rebuilds. New Exercise rows are
 * upserted by name and kept.
 *
 * Run from repo root:
 *   export $(grep -E '^(DATABASE_URL|DIRECT_DATABASE_URL)=' .env.local | xargs) && npx tsx scripts/import-mans-josbrant-2026.ts
 */
import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()

// ---- Fixed identities (verified against live DB) ----
const BIZ = '67245126-13ce-436c-8474-346f96d02d7e' // Star by Thomson
const MANS = 'b52e4c0f-d7d5-409a-9844-37f17666dea8' // Måns Josbrant (Client.id)
const COACH = 'a0991148-5121-4f9b-884d-451a77ea8e66' // Henrik (ADMIN, biz OWNER)
const MARKER = 'Måns sommar 2026'
const TRAINING_YEAR = 2026
const businessTag = `__business:${BIZ}`
const athleteTag = `__athlete:${MANS}`
const TAGS = [MARKER, 'Måns Josbrant', businessTag, athleteTag]

const J = (o: any) => JSON.parse(JSON.stringify(o)) // strip undefined
const D = (s: string) => new Date(`${s}T00:00:00.000Z`)
const norm = (s: string) =>
  s.toLowerCase().replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/é/g, 'e').replace(/[^a-z0-9]/g, '')

// ============================================================
// 1. NEW exercises (created if missing)
// ============================================================
type Cat = 'STRENGTH' | 'PLYOMETRIC' | 'CORE' | 'WARMUP'
type Pillar = 'POSTERIOR_CHAIN' | 'KNEE_DOMINANCE' | 'UNILATERAL' | 'FOOT_ANKLE' | 'ANTI_ROTATION_CORE' | 'UPPER_BODY'
const NEW_EX: { name: string; cat: Cat; pillar: Pillar; desc?: string }[] = [
  { name: 'Sidolyft 1-steg', cat: 'STRENGTH', pillar: 'UNILATERAL', desc: 'Sidoliggande sidolyft i ett steg, kontroll, håll kort i toppläge.' },
  { name: 'Hantelrodd i utfallsstående', cat: 'STRENGTH', pillar: 'UPPER_BODY', desc: 'Enarms hantelrodd stående i utfallssteg, stabil bål, full ROM.' },
  { name: 'Cossack Squat', cat: 'STRENGTH', pillar: 'UNILATERAL', desc: 'Djup sidoknäböj från sida till sida, raka motsatta benet.' },
  { name: 'Jämfotahopp (långt dubbelhopp)', cat: 'PLYOMETRIC', pillar: 'KNEE_DOMINANCE', desc: 'Två långa jämfotahopp i följd, maxdistans, kontrollerad landning.' },
  { name: 'Planka till pik (flowin)', cat: 'CORE', pillar: 'ANTI_ROTATION_CORE', desc: 'Planka till pik på flowin-discs, spänd bål, stor ROM.' },
  { name: 'Hantelflyes i GHD', cat: 'CORE', pillar: 'POSTERIOR_CHAIN', desc: 'Ligg med fötter i GHD-ställning, rak kropp, alternerande flyes med hantel.' },
  { name: 'Triple hopp (jämfota)', cat: 'PLYOMETRIC', pillar: 'KNEE_DOMINANCE', desc: 'Tre hopp i följd från jämfota start, flyt och kontroll prio, sen distans.' },
  { name: 'Serratuspress', cat: 'STRENGTH', pillar: 'UPPER_BODY', desc: 'Gå in mot mitten med armbågarna, pressa in — serratusaktivering.' },
  { name: 'Gorilla rodd', cat: 'STRENGTH', pillar: 'UPPER_BODY', desc: 'Bredbent framåtböjd KB-rodd, alternera sida, stabil bål.' },
  { name: 'RFESS ISO (yielding)', cat: 'STRENGTH', pillar: 'UNILATERAL', desc: 'Isometriskt yieldande håll i Bulgarian split squat, 10–20 kg hantlar, samla 2 min/ben.' },
  { name: 'Glute-Ham Raise (GHR)', cat: 'STRENGTH', pillar: 'POSTERIOR_CHAIN', desc: 'Glute-ham raise, höft neutral, säte som driver.' },
]

// sheet term -> existing canonical exercise name (resolved via normalized match)
const ALIAS_EX: Record<string, string> = {
  'Sidlyft 1-steg': 'Sidolyft 1-steg',
  'Push up till pik': 'Pike Push-Up',
  'Klockan på bosu': 'Klockan på bosuboll',
  'Klockan på BOSU': 'Klockan på bosuboll',
  'Utfallsgång med hängande KB': 'Utfallsgång med hängande KB i g-band',
  'Skatesquat i landmine': 'Landmine Skate Squat',
  'RDL enbens m hantel': 'Enbenig rumänsk marklyft',
  'Utfallsstående hantelrodd': 'Hantelrodd i utfallsstående',
  'Rodd i utfallssteg': 'Hantelrodd i utfallsstående',
  'Deadbug m 10 kgs vikt': 'Deadbug m viktskiva (10-15 kg)',
  'Throwing dumbell': 'Dumbbell throw',
  'Rodd TRX': 'TRX/Ringrodd',
  'Kryssdrag TRX': 'Kryssdrag stående',
  'Pull ups': 'Pull-Up',
  'Pull ups/Chin ups': 'Pull-Up',
  'Rodd chest supported': 'Chest supported rodd',
  'Axelpress i utfallspos': 'Axelpress i utfallsposition',
  'Axelpress utfallspos': 'Axelpress i utfallsposition',
  'Windmill': 'KB Windmill',
  'Crossover stepup på bänk': 'Cross over stepups',
  'Jämfota hopp': 'Jämfotahopp (långt dubbelhopp)',
  'Birddog rodd': 'Hantelrodd bird dog',
  'Planka till pik flowin': 'Planka till pik (flowin)',
  'Hamntel flyes GHD': 'Hantelflyes i GHD',
  'Diagonalhopp': 'Diagonala hopp',
  'Laterala hopp': 'Lateral Hops',
  'Triple hops från jämfota': 'Triple hopp (jämfota)',
  'Pointern på tå': 'Pointer på tå',
  'Deadbug m g-band från sida': 'Deadbug m g-band',
  'Hantellyft med rotation': 'Hantellyft åt sidan + utåtrotation',
  'Hantelpress / Bänkpress': 'Bänkpress / Hantelpress',
  'Clean / Hang clean': 'Hang Clean',
  'RFESS': 'Bulgarisk utfallsböj',
  'RFESS ISO': 'RFESS ISO (yielding)',
  'OH-Squat': 'OH-squat',
  'GHR': 'Glute-Ham Raise (GHR)',
  // hybrid movements
  'Rodd': 'Row (Meters)',
  'GB-Squats': 'Goblet Squat',
  'Assault bike': 'Assault Bike (Calories)',
  'Släde': 'Tung Släde',
}

// ============================================================
// Resolver
// ============================================================
const exMap = new Map<string, { id: string; prio: number }>()
function put(key: string | null | undefined, id: string, prio: number) {
  if (!key) return
  const n = norm(key); if (!n) return
  const cur = exMap.get(n)
  if (!cur || prio > cur.prio) exMap.set(n, { id, prio })
}
async function loadExercises() {
  exMap.clear()
  const rows = await p.exercise.findMany({
    where: { OR: [{ coachId: null }, { coachId: COACH }, { businessId: BIZ }] },
    select: { id: true, name: true, nameSv: true, nameEn: true, coachId: true, businessId: true },
  })
  for (const r of rows) {
    const prio = r.businessId === BIZ || r.coachId === COACH ? 2 : 1
    put(r.name, r.id, prio); put(r.nameSv, r.id, prio); put(r.nameEn, r.id, prio)
  }
}
function ex(name: string): string {
  const canonical = ALIAS_EX[name] ?? name
  const hit = exMap.get(norm(canonical))
  if (!hit) throw new Error(`UNRESOLVED EXERCISE: "${name}" (canonical "${canonical}")`)
  return hit.id
}
async function ensureNew() {
  let created = 0
  for (const e of NEW_EX) {
    const existing = await p.exercise.findFirst({ where: { name: e.name, OR: [{ businessId: BIZ }, { coachId: COACH }] }, select: { id: true } })
    if (existing) continue
    await p.exercise.create({
      data: { name: e.name, nameSv: e.name, category: e.cat as any, biomechanicalPillar: e.pillar as any, description: e.desc, isHybridMovement: false, isPublic: false, coachId: COACH, businessId: BIZ },
    })
    created++
  }
  console.log(`Exercises created: ${created} (of ${NEW_EX.length})`)
}

// ============================================================
// 2. Cleanup prior run (by MARKER) — scoped strictly to Måns
// ============================================================
async function cleanup() {
  const progs = await p.trainingProgram.findMany({ where: { clientId: MANS, name: { contains: MARKER } }, select: { id: true } })
  const progIds = progs.map((x) => x.id)
  if (progIds.length) {
    await p.strengthSessionAssignment.deleteMany({ where: { programId: { in: progIds } } })
    await p.cardioSessionAssignment.deleteMany({ where: { programId: { in: progIds } } })
    await p.hybridWorkoutAssignment.deleteMany({ where: { programId: { in: progIds } } })
  }
  const tmplWhere = { tags: { hasEvery: [MARKER, athleteTag] } }
  const sIds = (await p.strengthSession.findMany({ where: tmplWhere, select: { id: true } })).map((x) => x.id)
  const cIds = (await p.cardioSession.findMany({ where: tmplWhere, select: { id: true } })).map((x) => x.id)
  const hIds = (await p.hybridWorkout.findMany({ where: tmplWhere, select: { id: true } })).map((x) => x.id)
  if (sIds.length) await p.strengthSessionAssignment.deleteMany({ where: { sessionId: { in: sIds } } })
  if (cIds.length) await p.cardioSessionAssignment.deleteMany({ where: { sessionId: { in: cIds } } })
  if (hIds.length) await p.hybridWorkoutAssignment.deleteMany({ where: { workoutId: { in: hIds } } })
  await p.calendarEvent.deleteMany({ where: { clientId: MANS, description: { contains: MARKER } } })
  if (sIds.length) await p.strengthSession.deleteMany({ where: { id: { in: sIds } } })
  if (cIds.length) await p.cardioSession.deleteMany({ where: { id: { in: cIds } } })
  if (hIds.length) await p.hybridWorkout.deleteMany({ where: { id: { in: hIds } } })
  if (progIds.length) {
    await p.trainingWeek.deleteMany({ where: { programId: { in: progIds } } })
    await p.trainingProgram.deleteMany({ where: { id: { in: progIds } } })
  }
  await p.athletePlan.deleteMany({ where: { clientId: MANS, name: { contains: MARKER } } })
  console.log(`Cleanup: removed ${progIds.length} prior program(s) + plan + artifacts`)
}

// ============================================================
// 3. Template builders
// ============================================================
type Item = { exerciseName: string; exerciseId: string; sets: number; reps: string; weight?: number; weightUnit?: string; restSeconds?: number; notes?: string; setRows?: any[] }
function mk(name: string, sets: number, reps: string, opts: Partial<Item> = {}): Item {
  return { exerciseName: name, exerciseId: ex(name), sets, reps, ...opts }
}
function cardioWU(min: number, notes?: string) {
  const n = 'Uppvärmning valfritt redskap'
  return { kind: 'cardio', sets: 1, reps: '', intensity: 'MODERATE', exerciseId: ex(n), exerciseName: n, durationSeconds: min * 60, notes }
}
async function strength(name: string, phase: string, est: number, warmup: any, exercises: Item[], core?: Item[], desc?: string) {
  const r = await p.strengthSession.create({
    data: {
      name, description: desc, phase: phase as any, estimatedDuration: est,
      exercises: J(exercises), warmupData: warmup ? J(warmup) : undefined, coreData: core ? J({ exercises: core }) : undefined,
      coachId: COACH, isPublic: false, trainingYear: TRAINING_YEAR, tags: TAGS,
      totalExercises: exercises.length, totalSets: exercises.reduce((s, e) => s + (e.sets || 0), 0),
    },
    select: { id: true },
  })
  return r.id
}
async function cardio(name: string, sport: string, segments: any[], desc?: string) {
  let totalDuration = 0
  for (const s of segments) {
    if (s.type === 'REPEAT_GROUP') {
      const per = (s.steps || []).reduce((a: number, st: any) => a + (st.duration || 0), 0)
      totalDuration += per * (s.repeats || 1) + (s.restBetweenRounds || 0) * Math.max((s.repeats || 1) - 1, 0)
    } else totalDuration += s.duration || 0
  }
  const r = await p.cardioSession.create({
    data: { name, description: desc, sport: sport as any, segments: J(segments), totalDuration, coachId: COACH, isPublic: false, trainingYear: TRAINING_YEAR, tags: TAGS },
    select: { id: true },
  })
  return r.id
}
type Mv = { name: string; reps?: number; calories?: number; distance?: number; duration?: number; weightMale?: number; notes?: string }
type Block = { id: string; title: string; notes?: string; format: string; rounds?: number; intervalSeconds?: number; restAfterSeconds?: number; movements: Mv[] }
async function hybrid(name: string, fields: { format: string; totalRounds?: number; timeCap?: number; repScheme?: string; workTime?: number; totalMinutes?: number; warmupNotes?: string; warmupDuration?: number }, blocks: Block[], desc?: string) {
  const flat: any[] = []
  let order = 1
  for (const b of blocks)
    for (const m of b.movements)
      flat.push({ order: order++, exerciseId: ex(m.name), reps: m.reps ?? null, calories: m.calories ?? null, distance: m.distance ?? null, duration: m.duration ?? null, weightMale: m.weightMale ?? null, weightUnit: 'kg', notes: m.notes ?? null })
  const metconData = {
    blocks: blocks.map((b) => ({
      id: b.id, title: b.title, notes: b.notes, format: b.format, rounds: b.rounds, intervalSeconds: b.intervalSeconds, restAfterSeconds: b.restAfterSeconds,
      movements: b.movements.map((m, i) => ({ order: i + 1, exerciseId: ex(m.name), exerciseName: m.name, reps: m.reps, calories: m.calories, distance: m.distance, duration: m.duration, weightMale: m.weightMale, notes: m.notes })),
    })),
  }
  const r = await p.hybridWorkout.create({
    data: {
      name, description: desc, format: fields.format as any, totalRounds: fields.totalRounds, timeCap: fields.timeCap, repScheme: fields.repScheme,
      workTime: fields.workTime, totalMinutes: fields.totalMinutes, scalingLevel: 'RX' as any,
      warmupData: fields.warmupNotes ? J({ notes: fields.warmupNotes, duration: fields.warmupDuration }) : undefined,
      metconData: J(metconData), coachId: COACH, isPublic: false, trainingYear: TRAINING_YEAR, tags: TAGS,
      movements: { create: J(flat) },
    },
    select: { id: true },
  })
  return r.id
}

// ============================================================
// 4. Scheduling
// ============================================================
type Kind = 'strength' | 'cardio' | 'hybrid'
let PROGRAM_ID = ''
async function schedule(kind: Kind, templateId: string, title: string, dateStr: string, notes?: string, startTime?: string, endTime?: string) {
  const d = D(dateStr)
  const ev = await p.calendarEvent.create({
    data: {
      clientId: MANS, type: 'SCHEDULED_WORKOUT', title, description: `[${MARKER}]${notes ? ' ' + notes : ''}`,
      status: 'SCHEDULED', startDate: d, endDate: d, allDay: !startTime, startTime, endTime, trainingImpact: 'NORMAL', createdById: COACH,
    },
    select: { id: true },
  })
  const common: any = { athleteId: MANS, assignedDate: d, assignedBy: COACH, programId: PROGRAM_ID, calendarEventId: ev.id, responsibleCoachId: COACH, scheduledBy: COACH, notes }
  if (kind === 'strength') await p.strengthSessionAssignment.create({ data: { ...common, sessionId: templateId, status: 'SCHEDULED' } })
  else if (kind === 'cardio') await p.cardioSessionAssignment.create({ data: { ...common, sessionId: templateId, status: 'SCHEDULED' } })
  else await p.hybridWorkoutAssignment.create({ data: { ...common, workoutId: templateId, status: 'SCHEDULED' } })
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  await loadExercises()
  await ensureNew()
  await loadExercises() // reload so newly-created resolve
  await cleanup()

  // ---------- Reusable warmups ----------
  const wuStyrka1B1 = {
    duration: 10,
    exercises: [
      cardioWU(10, 'Valfritt redskap.'),
      mk('Kang Squat', 2, '5'),
      mk('Utfallsrotationer', 2, '6/sida'),
      mk('Sidlyft 1-steg', 2, '8/sida'),
      mk('Push up till pik', 2, '8-10'),
      mk('Golvpress m hantel', 2, '10'),
    ],
  }
  const wuBosu = {
    duration: 10,
    exercises: [
      cardioWU(10, 'Valfritt redskap.'),
      mk('Kang Squat', 2, '5'),
      mk('Klockan på bosu', 2, '1 min'),
      mk('Hunden på bänk', 2, '6-8/sida'),
      mk('Sidlyft 2-steg', 2, '8+8/sida'),
      mk('Golvpress m hantel', 2, '10'),
    ],
  }
  const wuOverkropp = (min: number) => ({
    duration: min,
    exercises: [
      cardioWU(min, 'Valfritt redskap.'),
      mk('Utfallsrotationer', 2, '6/sida'),
      mk('Push up till pik', 2, '8-10', { notes: 'Utan tåtouch.' }),
      mk('Rodd TRX', 2, '8-12'),
      mk('Kryssdrag TRX', 2, '10-12'),
    ],
  })
  const wuStyrka2B1 = {
    duration: 10,
    exercises: [
      cardioWU(10, 'Valfritt redskap.'),
      mk('Windmill', 2, '8/sida', { notes: '8–12 kg kb.' }),
      mk('Cossack Squat', 2, '5/sida'),
      mk('Crossover stepup på bänk', 2, '6/sida', { notes: '10 kg platta i händerna, noggrann vändning.' }),
    ],
  }
  const wuStyrka2B2 = {
    duration: 10,
    exercises: [
      cardioWU(10, 'Valfritt redskap.'),
      mk('Bomben steg 1', 2, '8/sida'),
      mk('Draken m flies', 2, '8/sida'),
      mk('Pointern på tå', 2, '8/sida'),
      mk('Cossack Squat', 2, '5/sida'),
      mk('OH-Squat', 2, '5'),
    ],
  }

  // ===== STRENGTH templates =====
  const PULLUP_NOTE = 'Dubbelprogression: börja m vikt du klarar ~5–6 reps m kontroll, gör 3 reps de två första setsen, AMRAP sista. 8 reps på sista → öka 2,5 kg nästa pass & börja om på 3. 4–6 → öka reps från 3 till 4. 3 → håll allt. Back-off: plocka till kroppsvikt, max reps (ev. 5–10 kg om du kört tungt).'

  // --- Block 1: Styrka 1 ---
  const S1_B1 = await strength('Styrka 1 (Block 1)', 'MAXIMUM_STRENGTH', 75, wuStyrka1B1, [
    mk('Utfallsgång med hängande KB', 3, '10 m', { notes: 'Häng 12 kg kb på stången, utfallsgång med stången på raka armar.' }),
    mk('Benböj', 5, '5/8', { notes: 'Tre top-set (3×5) + två back-off (2×8). Inledande tekniskt fina lyft, försök bygga vikt. 2 uppv.set: 1×8, 1×5.', setRows: [{ reps: 5 }, { reps: 5 }, { reps: 5 }, { reps: 8 }, { reps: 8 }] }),
    mk('Rocker jumps', 3, '3'),
    mk('Skatesquat i landmine', 3, '6/sida', { notes: 'Stolt hållning, spänd bål, inget svankande i höft. Driv upp motsatt knä 90°, spänn bål & säte i toppläget.' }),
    mk('RDL enbens m hantel', 3, '8/ben'),
    mk('Axelpress L-sit', 3, '8-10', { notes: 'Upprätt hållning, spänd bål.' }),
    mk('Utfallsstående hantelrodd', 3, '8/arm'),
    mk('Deadbug m 10 kgs vikt', 3, '10/sida', { notes: 'Kontroll på positioner, bål spänd, så tung kb du klarar m kontroll.' }),
    mk('Bear crawl kb-drag', 2, '8-10/sida', { notes: 'Kontroll på höft, spänd bål, så lite svaj som möjligt.' }),
    mk('Throwing dumbell', 3, '16', { notes: 'Sittandes, kasta hanteln fram och tillbaka.' }),
  ], undefined, 'Styrka 1 (Block 1, V27–V28) — styrka med inslag av fart. Mån.')

  // --- Block 1: Överkropp ---
  const OK_B1 = await strength('Överkropp (Block 1)', 'MAXIMUM_STRENGTH', 60, wuOverkropp(20), [
    mk('Pull ups', 3, '3-8 + 1xAMRAP', { notes: PULLUP_NOTE }),
    mk('Hantelpress', 4, '8', { notes: 'Benen i luften, full ROM.' }),
    mk('Rodd chest supported', 4, '10-12', { notes: 'Stöd mot bröst, full ROM, driv bröstet fram i toppläget, dra med en "J"-rörelse.' }),
    mk('Axelpress i utfallspos', 3, '8+3', { notes: 'Motsatt arm mot främre knät. Upprätt, bål spänd, rest-pause: 8 reps, lägg ner ~10–15 s, gör 3 till.' }),
    mk('Bear crawl kb-drag', 3, '6-8/sida', { notes: 'Kontroll på positioner, bål spänd.' }),
    mk('YTW', 3, '8-10/pos', { notes: 'Använd bänk som stöd, kort paus i toppläge.' }),
    mk('Omvänd curl', 3, '10-15', { notes: 'Pronerat grepp, full ROM, kort paus i topp. Öka vikt när du klarar 15 strikta på sista setet.' }),
  ], undefined, 'Styrka Överkropp (Block 1, V27–V28). Ons EM.')

  // --- Block 1: Styrka 2 ---
  const S2_B1 = await strength('Styrka 2 (Block 1)', 'MAXIMUM_STRENGTH', 70, wuStyrka2B1, [
    mk('Utfallssteg bakåt', 4, '5'),
    mk('Hexabar', 4, '6', { notes: 'Progression: V28 5×5, V29 6×4.' }),
    mk('Jämfota hopp', 2, '2', { notes: 'Långt dubbelhopp, kontrast efter Hexabar.' }),
    mk('Hip Thrust', 4, '6', { notes: 'Progression: V28 5×5, V29 6×4.' }),
    mk('Hamstring curl flowin', 3, '6-8'),
    mk('Hantelpress alternerande', 4, '8/sida'),
    mk('Birddog rodd', 4, '8/sida'),
    mk('Planka till pik flowin', 3, '10'),
    mk('Hamntel flyes GHD', 3, '10/sida', { notes: 'Ligg med fötter i GHD-ställning, rak kropp, alternerande flyes med hantel.' }),
  ], undefined, 'Styrka 2 (Block 1, V27–V28). Tor.')

  // --- Block 1/2: Stab + prevens (shared, Ons FM) ---
  const STAB_B1 = await strength('Stabilitet & prevens (Block 1)', 'ANATOMICAL_ADAPTATION', 50, {
    duration: 10,
    exercises: [cardioWU(10, '10 min kontinuerligt, jogg om möjligt annars valfritt redskap, 160–200 W.')],
  }, [
    mk('Klockan på BOSU', 2, '1 min/ben', { notes: 'Utmana distans från stödjeben med dopp.' }),
    mk('Hunden över bänk', 2, '10/ben', { notes: 'Kontroll på höft, översträck inte, ev. viktmanschett.' }),
    mk('Magliggande hipext+höftabd', 2, '8-10/ben', { notes: 'Utmana uppåt och utåt, nyp i topp & ytterläge, + viktmanschett.' }),
    mk('Bomben', 3, '8-10/ben', { notes: 'Steg 1, 6–8 kg.' }),
    mk('knästräck', 3, '8-10/ben', { notes: 'Ev. viktmanschett, nyp kort i toppläge.' }),
    mk('Draken med flies', 3, '8-10/ben', { notes: '2–3 kg, motverka rotation på höften, långsamma reps.' }),
    mk('Diagonalhopp', 3, '3/ben', { notes: 'Rytm & teknik prio.' }),
    mk('Laterala hopp', 3, '3/ben', { notes: 'Rytm & teknik prio.' }),
    mk('Hops', 3, '10 m', { notes: 'Hitta flyt, skit i output, koordinerat och fint.' }),
    mk('Triple hops från jämfota', 3, '/sida', { notes: 'Flyt och kontroll prio, därefter distans, ta det lugnt med att attackera marken.' }),
    mk('Sidolyft 2-steg', 2, '10+8/ben', { notes: 'Utför m kontroll, håll kort i toppläge, ev. viktmanschett.' }),
    mk('Pointern på tå', 2, '8-10/ben'),
    mk('Golvpress med hantel', 3, '10'),
  ], undefined, 'Stabilitet & prevens (Block 1, V27–V28). Ons FM. Valfri extensiv eftermiddag: 3-2-1 min ×5 (11–12–13 km/h) alt 3×15 min (11,5 km/h / rodd 200–220 W / cykel 200–250 W).')

  // --- Block 2: Styrka 1 ---
  const S1_B2 = await strength('Styrka 1 (Block 2)', 'MAXIMUM_STRENGTH', 75, wuBosu, [
    mk('Tung Släde', 4, '10 m', { notes: '3–5×10 m, något lättare för mer fart.' }),
    mk('Benböj', 5, '3', { notes: '2 uppv.set 1×8, 1×5. Ser & känns allt bra → cykliskt utförande med fart, annars åtminstone fart ur botten.' }),
    mk('Kickstand RDL', 4, '5/sida', { notes: 'Stolt hållning, spänd bål, inget svankande. Bakre ben som stöd för balans.' }),
    mk('Rodd i utfallssteg', 4, '6-8'),
    mk('Stående axelpress', 4, '6-8', { notes: 'Alt sittande.' }),
    mk('Deadbug m g-band från sida', 3, '10/sida', { notes: 'Kontroll på positioner, bål spänd.' }),
    mk('Bear crawl body saw', 3, '8-10', { notes: 'Kontroll på höft, spänd bål, så lite svaj som möjligt.' }),
  ], undefined, 'Styrka 1 (Block 2, V29) — styrka med fart. Mån.')

  // --- Block 2: Stab + axelstabilitet (Ons FM) ---
  const STAB_B2 = await strength('Stabilitet & axelstabilitet (Block 2)', 'ANATOMICAL_ADAPTATION', 45, {
    duration: 10,
    exercises: [cardioWU(10, 'Valfritt redskap.')],
  }, [
    mk('Golvpress m hantel', 2, '10'),
    mk('Hunden över bänk', 2, '10/ben', { notes: 'Kontroll på höft, översträck inte, ev. viktmanschett.' }),
    mk('Sidolyft 2-steg', 2, '10+8/ben', { notes: 'Utför m kontroll, håll kort i toppläge.' }),
    mk('Bomben steg 1', 2, '10/sida', { notes: 'Börja m 6 kg hantel.' }),
    mk('Draken m flies', 2, '10'),
  ], [
    mk('Hantellyft med rotation', 2, '10', { notes: 'Sidolyft m hantel, därefter extern rotation, fixerade armbågar.' }),
    mk('Serratuspress', 2, '10', { notes: 'Gå in mot mitten med armbågarna, pressa in.' }),
    mk('Axelpress utfallspos', 2, '8-10/sida', { notes: 'Bottom press, rehab-alternativ.' }),
    mk('Gorilla rodd', 2, '8-10/sida', { notes: 'Stabil i bålen, alternera sida.' }),
  ], 'Stabilitet & axelstabilitet (Block 2, V29). Ons FM. Stab 2 varv + axelstabilitet 2 varv.')

  // --- Block 2: Överkropp (Ons EM) ---
  const OK_B2 = await strength('Överkropp (Block 2)', 'MAXIMUM_STRENGTH', 60, wuOverkropp(20), [
    mk('Pull ups', 3, '3-8 + 1xAMRAP', { notes: PULLUP_NOTE }),
    mk('Hantelpress / Bänkpress', 5, '5/8-10', { notes: '3×5 tyngre + 2×8–10.', setRows: [{ reps: 5 }, { reps: 5 }, { reps: 5 }, { reps: 8 }, { reps: 8 }] }),
    mk('Rodd chest supported', 4, '10-12', { notes: 'Stöd mot bröst, full ROM, J-rörelse. Alt bänkdrag.' }),
    mk('Axelpress i utfallspos', 3, '8+3', { notes: 'Rest-pause. Alt Axelpress L-sit / stående axelpress (3×6–8).' }),
    mk('Bear crawl kb-drag', 3, '6-8/sida'),
    mk('YTW', 3, '8-10/pos', { notes: 'Bänk som stöd, kort paus i topp.' }),
    mk('Omvänd curl', 3, '10-15', { notes: 'Pronerat grepp, full ROM, öka vikt vid 15 strikta.' }),
  ], undefined, 'Styrka Överkropp (Block 2, V29). Ons EM.')

  // --- Block 2: Styrka 2 ---
  const S2_B2 = await strength('Styrka 2 (Block 2)', 'MAXIMUM_STRENGTH', 70, wuStyrka2B2, [
    mk('Clean / Hang clean', 5, '3', { notes: 'Gå tungt.' }),
    mk('RFESS', 4, '5/sida'),
    mk('RFESS ISO', 2, '2 min/ben', { notes: 'Yieldning, så få sets du kan för att samla 2 min, 10–20 kg hantlar.' }),
    mk('GHR', 3, '10-12', { notes: 'Höft neutral, säte som driver.' }),
    mk('Pull ups/Chin ups', 3, '3-5 + 1xmax'),
    mk('Hantelpress / Bänkpress', 4, '4-6'),
    mk('Bålrotationer i kabelmaskin', 3, '10/sida'),
  ], undefined, 'Styrka 2 (Block 2, V29). Tor.')

  // ===== CARDIO templates =====
  const repBike = (repeats: number, work: number, rest: number, watt: number, label: string) => ({
    id: norm(label), type: 'REPEAT_GROUP', repeats, restBetweenRounds: rest,
    steps: [{ id: norm(label) + 's', type: 'INTERVAL', zone: watt >= 360 ? 5 : 4, duration: work, equipment: 'WATTBIKE', targetType: 'power', targetValue: String(watt), power: String(watt), notes: `${label} @ ~${watt} W` }],
  })
  const C_VO2_B1 = await cardio('Kondition VO2 (Block 1)', 'CYCLING', [
    { id: 'wu', type: 'WARMUP', zone: 1, duration: 900, equipment: 'WATTBIKE', notes: 'Första halvan uppvärmningstempo, andra något hårdare. Inledande minut: check av cykel.' },
    repBike(5, 90, 30, 300, '90/30 s'),
    { id: 'r1', type: 'RECOVERY', zone: 1, duration: 120, notes: 'Vila 2 min.' },
    repBike(7, 70, 20, 320, '70/20 s'),
    { id: 'r2', type: 'RECOVERY', zone: 1, duration: 120, notes: 'Vila 2 min.' },
    repBike(7, 60, 30, 340, '60/30 s'),
    { id: 'r3', type: 'RECOVERY', zone: 1, duration: 120, notes: 'Vila 2 min.' },
    repBike(10, 40, 20, 370, '40/20 s'),
    { id: 'cd', type: 'COOLDOWN', zone: 1, duration: 600, notes: '10 min lätt.' },
  ], 'VO2max-intervaller. Wattbike, rodd eller assault bike. Hitta lämplig watt: ~300 → 320 → 340 → 370 W över blocken.')

  const C_LOP_B2 = await cardio('Kondition löpintervaller (Block 2)', 'RUNNING', [
    { id: 'wu', type: 'WARMUP', zone: 1, duration: 900, equipment: 'RUN', notes: 'Första halvan uppvärmningstempo, andra något hårdare. 2–3 stegringslopp 5–10 s sista minutrarna.' },
    {
      id: 'main', type: 'REPEAT_GROUP', repeats: 6, restBetweenRounds: 120,
      steps: [
        { id: 's3', type: 'INTERVAL', zone: 4, duration: 180, equipment: 'RUN', notes: '3 min @ 11 km/h.' },
        { id: 'r3a', type: 'RECOVERY', zone: 1, duration: 30, equipment: 'RUN', notes: '30 s aktiv vila, långsam jogg.' },
        { id: 's2', type: 'INTERVAL', zone: 4, duration: 120, equipment: 'RUN', notes: '2 min @ 12 km/h.' },
        { id: 'r2b', type: 'RECOVERY', zone: 1, duration: 30, equipment: 'RUN', notes: '30 s aktiv vila, långsam jogg.' },
        { id: 's1', type: 'INTERVAL', zone: 5, duration: 60, equipment: 'RUN', notes: '1 min @ 13 km/h.' },
      ],
    },
    { id: 'cd', type: 'COOLDOWN', zone: 1, duration: 600, equipment: 'RUN', notes: 'Nedvarv 10 min.' },
  ], '3-2-1 min × 6 (11 – 12 – 13 km/h). 30 s aktiv vila (jogg) mellan intervaller, 2 min mellan varv á 9–10 km/h.')

  const C_FRI_B2 = await cardio('Kondition E3MOM (Block 2)', 'FUNCTIONAL_FITNESS', [
    { id: 'wu', type: 'WARMUP', zone: 1, duration: 900, notes: 'Första halvan uppvärmningstempo, andra något hårdare. 2–3 stegringslopp 5–10 s.' },
    {
      id: 'main', type: 'REPEAT_GROUP', repeats: 6, restBetweenRounds: 0,
      steps: [
        { id: 'bike', type: 'INTERVAL', zone: 4, distance: 600, equipment: 'WATTBIKE', notes: '600 m cykel, under 2 min. Check cykel: fläkt 10, magnet 1, 70 rpm — notera W & # per intervall.' },
        { id: 'run', type: 'INTERVAL', zone: 4, distance: 200, equipment: 'RUN', notes: '200 m curveband (kurvad löpmatta), under 2 min.' },
      ],
    },
    { id: 'cd', type: 'COOLDOWN', zone: 1, duration: 900, notes: 'Nedvarv / extra volym 15 min.' },
  ], 'E3MOM (start var 3:e min), 12 intervaller växelvis 600 m cykel / 200 m curveband, alla under 2 min. Vila 2 min efter 6 intervaller. Alternativ: hybrid eller 18×200 m löpning (3 block: 6 raka, 6 idiotform, 6 idiotform).')

  // --- Shared low-intensity (Lör) ---
  const C_LOW = await cardio('Lågintensivt Z2/A1', 'FUNCTIONAL_FITNESS', [
    { id: 'main', type: 'STEADY', zone: 2, duration: 3000, notes: 'Lågintensivt, kontinuerligt. Valfritt redskap (jogg / cykel / rodd / ski-erg). Håll Z2/A1 — ska kännas lätt, prat-tempo.' },
  ], 'Lågintensivt aerobt pass (Z2/A1), ~50 min. Få in volym under helgen. Valfritt redskap, lugnt tempo.')

  // ===== HYBRID template (Block 1, Fre) =====
  const H_B1 = await hybrid('Högintensiv hybrid (Block 1)', { format: 'EMOM', totalRounds: 6, repScheme: 'E2MOM, 6 varv per block', warmupNotes: '15 min uppvärmning, 5 min per redskap, 3×3 s sprinter sista minuten.', warmupDuration: 900 }, [
    { id: 'main', title: 'E2MOM — 6 varv per block', notes: 'Varannan minut (E2MOM), 6 varv. Försök hålla output över varven.', format: 'EMOM', rounds: 6, intervalSeconds: 120, movements: [
      { name: 'Rodd', distance: 270, notes: '270 m rodd, <1:40.' },
      { name: 'GB-Squats', reps: 10, weightMale: 28, notes: 'Goblet squat 28 kg.' },
      { name: 'Wattbike', distance: 550, notes: '550 m wattbike.' },
      { name: 'Burpees', reps: 8 },
      { name: 'Assault bike', calories: 16, notes: '15–17 kcal (~45 s jobb).' },
      { name: 'Släde', distance: 15, weightMale: 100, notes: '15 m släde, 100 kg.' },
    ] },
  ], 'Högintensivt hybridpass. E2MOM, 6 varv per block: Rodd 270 m / GB-squat 10×28 kg / Wattbike 550 m / Burpees 8 / Assault 15–17 kcal / Släde 15 m 100 kg. Fre.')

  // ===== TRAINING PROGRAM + WEEKS =====
  const prog = await p.trainingProgram.create({
    data: {
      clientId: MANS, coachId: COACH, name: `Måns Josbrant – ${MARKER} (V27–V29)`,
      description: `Off-season hockeyprogram (V27–V29), importerat från "Måns Josbrant.xlsx". Block 1 (V27–V28) + Block 2 (V29). Mån Styrka 1, Tis Kondition, Ons Stab (FM) + Överkropp (EM), Tor Styrka 2, Fre högintensiv, Lör lågintensivt. On-is/agility körs på plats (ej i appen). [${MARKER}]`,
      goalType: 'fitness', startDate: D('2026-06-29'), endDate: D('2026-07-19'), isActive: true,
    },
    select: { id: true },
  })
  PROGRAM_ID = prog.id
  const weeks: [number, string, string, string, string][] = [
    [27, '2026-06-29', '2026-07-05', 'BASE', 'Block 1 vecka 1 — styrka + fart, VO2'],
    [28, '2026-07-06', '2026-07-12', 'BASE', 'Block 1 vecka 2 — styrka + fart, VO2'],
    [29, '2026-07-13', '2026-07-19', 'BUILD', 'Block 2 vecka 1 — styrka + löpintervaller'],
  ]
  let wn = 1
  for (const [v, start, end, phase, focus] of weeks) {
    await p.trainingWeek.create({ data: { programId: PROGRAM_ID, weekNumber: wn++, startDate: D(start), endDate: D(end), phase: phase as any, focus: `V${v}: ${focus}` } })
  }

  // ===== ATHLETE PLAN (block-plan overlay) =====
  await p.athletePlan.create({
    data: {
      clientId: MANS, coachId: COACH, name: `Måns Josbrant – ${MARKER}`,
      description: `Off-season hockey, 3 veckor (V27–V29). Block 1 (V27–V28) + Block 2 (V29). [${MARKER}]`,
      status: 'ACTIVE', planType: 'SPECIAL_PROGRAM', startDate: D('2026-06-29'), endDate: D('2026-07-19'),
      blocks: {
        create: [
          { order: 1, title: 'V27 – Block 1, vecka 1', focus: 'Grundblock styrka + fart', startDate: D('2026-06-29'), endDate: D('2026-07-05'), description: 'Mån Styrka 1 · Tis Kondition VO2 · Ons Stab (FM) + Överkropp (EM) · Tor Styrka 2 · Fre Högintensiv hybrid · Lör Lågintensivt Z2/A1.' },
          { order: 2, title: 'V28 – Block 1, vecka 2', focus: 'Grundblock styrka + fart', startDate: D('2026-07-06'), endDate: D('2026-07-12'), description: 'Samma upplägg som V27. Hexabar & Hip thrust progression mot 5×5. Mån Styrka 1 · Tis VO2 · Ons Stab + Överkropp · Tor Styrka 2 · Fre Högintensiv · Lör Lågint.' },
          { order: 3, title: 'V29 – Block 2, vecka 1', focus: 'Bygg styrka + löpintervaller', startDate: D('2026-07-13'), endDate: D('2026-07-19'), description: 'Block 2-mallar. Mån Styrka 1 · Tis Löpintervaller 3-2-1 · Ons Stab + Överkropp · Tor Styrka 2 (clean/RFESS/GHR) · Fre E3MOM cykel/curveband · Lör Lågint.' },
        ],
      },
    },
  })

  // ===== SCHEDULE (21 assignments) =====
  // V27
  await schedule('strength', S1_B1, 'Styrka 1', '2026-06-29')
  await schedule('cardio', C_VO2_B1, 'Kondition VO2', '2026-06-30')
  await schedule('strength', STAB_B1, 'Stabilitet & prevens (FM)', '2026-07-01', undefined, '10:00', '11:00')
  await schedule('strength', OK_B1, 'Överkropp (EM)', '2026-07-01', undefined, '16:00', '17:30')
  await schedule('strength', S2_B1, 'Styrka 2', '2026-07-02')
  await schedule('hybrid', H_B1, 'Högintensiv hybrid', '2026-07-03')
  await schedule('cardio', C_LOW, 'Lågintensivt Z2/A1', '2026-07-04')
  // V28
  await schedule('strength', S1_B1, 'Styrka 1', '2026-07-06')
  await schedule('cardio', C_VO2_B1, 'Kondition VO2', '2026-07-07')
  await schedule('strength', STAB_B1, 'Stabilitet & prevens (FM)', '2026-07-08', undefined, '10:00', '11:00')
  await schedule('strength', OK_B1, 'Överkropp (EM)', '2026-07-08', undefined, '16:00', '17:30')
  await schedule('strength', S2_B1, 'Styrka 2', '2026-07-09')
  await schedule('hybrid', H_B1, 'Högintensiv hybrid', '2026-07-10')
  await schedule('cardio', C_LOW, 'Lågintensivt Z2/A1', '2026-07-11')
  // V29
  await schedule('strength', S1_B2, 'Styrka 1', '2026-07-13')
  await schedule('cardio', C_LOP_B2, 'Kondition löpintervaller', '2026-07-14')
  await schedule('strength', STAB_B2, 'Stabilitet & axelstabilitet (FM)', '2026-07-15', undefined, '10:00', '11:00')
  await schedule('strength', OK_B2, 'Överkropp (EM)', '2026-07-15', undefined, '16:00', '17:30')
  await schedule('strength', S2_B2, 'Styrka 2', '2026-07-16')
  await schedule('cardio', C_FRI_B2, 'Kondition E3MOM', '2026-07-17')
  await schedule('cardio', C_LOW, 'Lågintensivt Z2/A1', '2026-07-18')

  console.log('PROGRAM_ID:', PROGRAM_ID)
  console.log('Templates:', { S1_B1, OK_B1, S2_B1, STAB_B1, S1_B2, STAB_B2, OK_B2, S2_B2, C_VO2_B1, C_LOP_B2, C_FRI_B2, C_LOW, H_B1 })
  console.log('DONE.')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => p.$disconnect())
