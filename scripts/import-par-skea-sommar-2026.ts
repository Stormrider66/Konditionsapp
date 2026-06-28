/**
 * Import "Skeå sommar 2026" (Skellefteå AIK A-lag summer program, weeks V27–V30)
 * for Pär Lindholm, starting Mon 2026-06-29.
 *
 * Idempotent: re-running cleans up the prior run's program/assignments/calendar
 * events/templates (matched by the MARKER tag) and rebuilds. New Exercise/AgilityDrill
 * rows are upserted by name and kept across runs.
 *
 * Run from repo root:
 *   export $(grep -E '^(DATABASE_URL|DIRECT_DATABASE_URL)=' .env.local | xargs) && npx tsx scripts/import-par-skea-sommar-2026.ts
 */
import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()

// ---- Fixed identities (verified against live DB) ----
const BIZ = '671eef51-725f-43a7-a763-d97d129ae19c' // Skellefteå AIK
const PAR = '936fd4c3-1c99-4876-a6db-b76a2157cce1' // Pär Lindholm (Client.id)
const COACH = 'a0991148-5121-4f9b-884d-451a77ea8e66' // Henrik (ADMIN, biz OWNER)
const MARKER = 'Skeå sommar 2026'
const TRAINING_YEAR = 2026
const businessTag = `__business:${BIZ}`
const athleteTag = `__athlete:${PAR}`
const TAGS = [MARKER, 'Pär Lindholm', businessTag, athleteTag]

const J = (o: any) => JSON.parse(JSON.stringify(o)) // strip undefined
const D = (s: string) => new Date(`${s}T00:00:00.000Z`)
const norm = (s: string) =>
  s.toLowerCase().replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/é/g, 'e').replace(/[^a-z0-9]/g, '')

// ============================================================
// 1. NEW exercises & drills (created if missing)
// ============================================================
type Cat = 'STRENGTH' | 'PLYOMETRIC' | 'CORE' | 'WARMUP'
type Pillar = 'POSTERIOR_CHAIN' | 'KNEE_DOMINANCE' | 'UNILATERAL' | 'FOOT_ANKLE' | 'ANTI_ROTATION_CORE' | 'UPPER_BODY'
const NEW_EX: { name: string; cat: Cat; pillar: Pillar; desc?: string; hyb?: boolean }[] = [
  { name: 'Bear Complex', cat: 'STRENGTH', pillar: 'POSTERIOR_CHAIN', desc: 'Frivändning, thruster, back squat, thruster.' },
  { name: 'Bänkdrag', cat: 'STRENGTH', pillar: 'UPPER_BODY', desc: 'Stående framåtböjd skivstångsrodd.' },
  { name: 'L-chins', cat: 'STRENGTH', pillar: 'UPPER_BODY', desc: 'Chins med benen i L-sit, ev. viktade.' },
  { name: 'TpV-squat', cat: 'STRENGTH', pillar: 'KNEE_DOMINANCE', desc: 'Knäböj med fokus på fart/effekt (transition power velocity).' },
  { name: 'Smal bänkpress', cat: 'STRENGTH', pillar: 'UPPER_BODY', desc: 'Bänkpress med smalt grepp.' },
  { name: 'Utfall bakåt till step up', cat: 'STRENGTH', pillar: 'UNILATERAL', desc: 'Utfall bakåt direkt till step up på bänk.' },
  { name: 'Dropjump till box enbens', cat: 'PLYOMETRIC', pillar: 'KNEE_DOMINANCE', desc: 'Enbens dropjump upp på låda.' },
  { name: 'Armhävning upp till stepbräda', cat: 'PLYOMETRIC', pillar: 'UPPER_BODY', desc: 'Explosiv armhävning från backen upp till stepbräda.' },
  { name: 'Armhävningar lift-off', cat: 'STRENGTH', pillar: 'UPPER_BODY', desc: 'Armhävning med skulderbladens lift-off, full ROM.' },
  { name: 'Stående stångrodd', cat: 'STRENGTH', pillar: 'UPPER_BODY', desc: 'Rak hållning, full ROM upp till bröstet, släpp stången strax under knä.' },
  { name: 'Deficit pushups', cat: 'STRENGTH', pillar: 'UPPER_BODY', desc: 'Fötter på bänk, händer på liggande kettlebells, full ROM.' },
  { name: 'YTW', cat: 'STRENGTH', pillar: 'UPPER_BODY', desc: 'Bröst mot bänk, lätta hantlar, Y- → T- → W-position.' },
  { name: 'Body saw flowin', cat: 'CORE', pillar: 'ANTI_ROTATION_CORE', desc: 'Body saw på flowin-discs, ingen svank.' },
  { name: 'Knästående på boll', cat: 'CORE', pillar: 'ANTI_ROTATION_CORE', desc: 'Balanshåll knästående på pilatesboll.' },
  { name: 'Benböj stående på boll', cat: 'STRENGTH', pillar: 'KNEE_DOMINANCE', desc: 'Knäböj balanserande stående på boll.' },
  { name: 'Skottkärran armhävningar', cat: 'CORE', pillar: 'ANTI_ROTATION_CORE', desc: 'Partner håller benen, armhävningar.' },
  { name: 'Skottkärran hunden', cat: 'CORE', pillar: 'ANTI_ROTATION_CORE', desc: 'Partner håller benen, bird-dog-rörelse.' },
  { name: 'Skottkärran rotation', cat: 'CORE', pillar: 'ANTI_ROTATION_CORE', desc: 'Partner håller benen, bålrotation.' },
  { name: 'Drag till hakan', cat: 'STRENGTH', pillar: 'UPPER_BODY', desc: 'Upright row till hakan.' },
  { name: 'Enbensböj + hopp', cat: 'PLYOMETRIC', pillar: 'UNILATERAL', desc: 'Bakre foten på bänk (som powertester), böj + hopp.' },
  { name: 'Kålmasken flowin', cat: 'CORE', pillar: 'ANTI_ROTATION_CORE', desc: 'Inchworm/kålmask på flowin-discs.' },
  { name: 'Kvartsböj', cat: 'STRENGTH', pillar: 'KNEE_DOMINANCE', desc: 'Tung kvartsknäböj 120–130% av 1RM.' },
  { name: 'Enbens TpV-squat', cat: 'STRENGTH', pillar: 'UNILATERAL', desc: 'Enbens TpV-squat med fart/effekt.' },
  { name: 'Sidohopp med tuck', cat: 'PLYOMETRIC', pillar: 'KNEE_DOMINANCE', desc: 'Sida till sida, lyft foten lätt vid landning, kontinuerligt.' },
  { name: 'Jämfotahopp med drag bakifrån', cat: 'PLYOMETRIC', pillar: 'KNEE_DOMINANCE', desc: 'Tjockt gummiband runt midjan, hoppa så långt du kan.' },
  { name: 'Diagonala hopp', cat: 'PLYOMETRIC', pillar: 'KNEE_DOMINANCE', desc: 'Extensiva diagonala hopp ~45°, kontroll på landning.' },
  { name: 'Drach hopp', cat: 'PLYOMETRIC', pillar: 'KNEE_DOMINANCE', desc: 'Maxhöjd, kontrollerad landning.' },
  { name: 'Jämfotahopp enbens med MB', cat: 'PLYOMETRIC', pillar: 'UNILATERAL', desc: 'Enbens jämfotahopp för maxdistans med MB 4–6 kg.' },
  { name: 'Enarmsrotation med hantel', cat: 'CORE', pillar: 'ANTI_ROTATION_CORE', desc: 'Rak linje, bål spänd, kontrollerad rörelse med stor ROM.' },
  { name: 'Nacke extension/flexion', cat: 'STRENGTH', pillar: 'UPPER_BODY', desc: 'Nackflexion + extension, öka 2,5 kg vid 2×15 med kvalitet.' },
  { name: 'Bulgarian split squat explosiv', cat: 'PLYOMETRIC', pillar: 'UNILATERAL', desc: 'Bakre ben på stepbräda, hantlar 30–50 kg, maxfart upp.' },
]

type DCat = 'COD' | 'REACTIVE_AGILITY' | 'SPEED_ACCELERATION' | 'PLYOMETRICS' | 'FOOTWORK' | 'BALANCE'
const NEW_DR: { name: string; cat: DCat; desc?: string }[] = [
  { name: 'Häckar', cat: 'FOOTWORK', desc: 'Häckar 2× rakt fram/ben + 2× sidled/ben (alt 90-90 höftrörlighet).' },
  { name: 'Sidoshuffles ViPR', cat: 'FOOTWORK', desc: 'Sidoshuffles med ViPR 8–12 kg, 3 m mellan koner.' },
  { name: 'Oregelbundna shuffles', cat: 'REACTIVE_AGILITY', desc: 'Shufflesteg mellan två koner, oregelbundna vändningar (spegla/lura).' },
  { name: 'Rep sprint 16-18m', cat: 'SPEED_ACCELERATION', desc: 'Repeterade sprintar 16–18 m, rullande klocka start var 10:e sek.' },
  { name: 'MB rotationskast', cat: 'PLYOMETRICS', desc: 'Spjutstående MB-rotationskast mot vägg, max insats, snabb retur.' },
  { name: 'Drach hopp', cat: 'PLYOMETRICS', desc: 'Drach-hopp, alternera sida, tryck på max.' },
]

// sheet term -> existing/canonical exercise name (resolved via normalized match over name/nameSv/nameEn)
const ALIAS_EX: Record<string, string> = {
  'Kang squats': 'Kang squat',
  'Kang Squats': 'Kang squat',
  'Push up till pik': 'Pike Push-Up',
  'Sidolyft': 'Sidolyft 2-steg',
  'Hantellyft åt sidan +rotation': 'Hantellyft åt sidan + utåtrotation',
  'Enarmsrotation m hantel': 'Enarmsrotation med hantel',
  'Nackflexion + extension': 'Nacke extension/flexion',
  'Hang clean': 'Hang Clean',
  'Hang cleans': 'Hang Clean',
  'Frivändningar': 'Clean',
  'Enbensmark': 'Enbensmarklyft',
  'Markdrag': 'Marklyft',
  'Crossover step up': 'Cross over stepups',
  'Bulgarian SS': 'Bulgarisk utfallsböj',
  'Bänkpress / Hantelpress benen i luften': 'Bänkpress / Hantelpress',
  'Knee to elbox': 'Knees-to-Elbow',
  'Body saw till pik': 'Välj en: Bear crawl body saw / Body saw till pik flowin',
  'tPV-Squat': 'TpV-squat',
  'Bänkpress smalt grepp': 'Smal bänkpress',
  'Utfall bakåt + step up på bänk': 'Utfall bakåt till step up',
  'Build ups/stegringslopp': 'Build ups',
  'Slädsprint': 'Släde tung accels 10m',
  'Axelpress i L-sit': 'Axelpress L-sit',
  'TRX-rodd': 'TRX/Ringrodd',
  'Omvänd rodd med stång': 'Inverterad rodd',
  'Pointern på tå': 'Pointer på tå',
  'Axelpress': 'Stående axelpress',
  'Axlepress': 'Stående axelpress',
  'Stångrodd': 'Bent Over Row',
  'Omvänd bicepscurl': 'Omvänd curl',
  'Utfallsgång hängande KB': 'Utfallsgång med hängande KB i g-band',
  'Draken 3-punkt med boll': 'Draken MB 3-punkt',
  'OHS balansbräda': 'Overhead squat',
  'OHS med g-band': 'Overhead squat',
  'Benindrag ett ben, växelvis': 'Benindrag på boll 1-ben',
  'Krabbgång': 'Crab walk',
  'Windmilll': 'KB Windmill',
  'Adduktorplankan del 2': 'Adduktorplanka',
  'Chest to bar': 'Chest-to-Bar',
  'Throwing dumbell': 'Dumbbell throw',
  'Toes to bar i ribbstol': 'Toes-to-Bar',
  'MB Overhead toss': 'MB-kast över huvud',
  'MB Rotationskast': 'Rotational Medicine Ball Throw',
  'Rotationskast MB': 'Rotational Medicine Ball Throw',
  'Jämfotahopp': 'Jämfotahopp sekvens',
  'Boxhopp från sittande med hantlar': 'Box jump från sittande',
  'Laterala sidohopp': 'Lateral Hops',
  // hybrid movements
  'Rodd (m)': 'Row (Meters)',
  'Rodd (kcal)': 'Row (Calories)',
  'marklyft': 'Marklyft',
  'burpees': 'Burpee',
  'Assault bike': 'Assault Bike (Calories)',
  'KB-svingar': 'Kettlebell Swing',
  'Wall balls': 'Wall Ball',
  'Sumo deadlift high pull': 'Sumo Deadlift High Pull',
  'Box jump': 'Box Jump',
  'Push press (hybrid)': 'Push Press',
  'Vila': 'Rest',
}

const ALIAS_DR: Record<string, string> = {
  'Skridskohopp 3-takt': 'Skater jumps (3-step)',
  'Sidohopp': 'Lateral Hops',
  'Enbenshopp jämfota': 'Single-Leg Bounds',
  'Snakerope': 'Snake rope with constant lunge jumps',
  'Åttan med motstånd': 'Figure 8 Around Cones',
  'Alternerande splithopp Bandade KB': 'Split Squat Jumps',
  'L-löp': 'L-Drill (3 Cone Drill)',
  'Utfallshopp med ViPR': 'Lunge jump with Vipr',
  'Idioten 5-10-5-10': 'Idioten 5-10-15-20 m',
  'Kontouch': 'Cone touch Viper',
  'T-löp': 'T-Test',
  'Mothopp xplodelåda skatehopp': 'Rotational Box Jump',
  'Laterala hopp': 'Lateral Hops',
  '5-10-5': '5-10-5 Pro Agility',
  'MB-slam': 'Slamball',
  'Warm-up': 'Warm-up (incl. jog)',
}

// ============================================================
// Resolver caches
// ============================================================
const exMap = new Map<string, { id: string; prio: number }>()
const drMap = new Map<string, { id: string; prio: number }>()

function put(map: Map<string, { id: string; prio: number }>, key: string | null | undefined, id: string, prio: number) {
  if (!key) return
  const n = norm(key)
  if (!n) return
  const cur = map.get(n)
  if (!cur || prio > cur.prio) map.set(n, { id, prio })
}

async function loadExercises() {
  exMap.clear()
  const rows = await p.exercise.findMany({
    where: { OR: [{ coachId: null }, { coachId: COACH }, { businessId: BIZ }] },
    select: { id: true, name: true, nameSv: true, nameEn: true, coachId: true, businessId: true },
  })
  for (const r of rows) {
    const prio = r.businessId === BIZ || r.coachId === COACH ? 2 : 1
    put(exMap, r.name, r.id, prio)
    put(exMap, r.nameSv, r.id, prio)
    put(exMap, r.nameEn, r.id, prio)
  }
}
async function loadDrills() {
  drMap.clear()
  const rows = await p.agilityDrill.findMany({
    where: { OR: [{ coachId: null }, { coachId: COACH }, { isSystemDrill: true }] },
    select: { id: true, name: true, nameSv: true, coachId: true },
  })
  for (const r of rows) {
    const prio = r.coachId === COACH ? 2 : 1
    put(drMap, r.name, r.id, prio)
    put(drMap, r.nameSv, r.id, prio)
  }
}

function ex(name: string): string {
  const canonical = ALIAS_EX[name] ?? name
  const hit = exMap.get(norm(canonical))
  if (!hit) throw new Error(`UNRESOLVED EXERCISE: "${name}" (canonical "${canonical}")`)
  return hit.id
}
function dr(name: string): string {
  const canonical = ALIAS_DR[name] ?? name
  const hit = drMap.get(norm(canonical))
  if (!hit) throw new Error(`UNRESOLVED DRILL: "${name}" (canonical "${canonical}")`)
  return hit.id
}

async function ensureNew() {
  let exCreated = 0
  for (const e of NEW_EX) {
    const existing = await p.exercise.findFirst({ where: { name: e.name, OR: [{ businessId: BIZ }, { coachId: COACH }] }, select: { id: true } })
    if (existing) continue
    await p.exercise.create({
      data: {
        name: e.name, nameSv: e.name, category: e.cat as any, biomechanicalPillar: e.pillar as any,
        description: e.desc, isHybridMovement: !!e.hyb, isPublic: false, coachId: COACH, businessId: BIZ,
      },
    })
    exCreated++
  }
  let drCreated = 0
  for (const d of NEW_DR) {
    const existing = await p.agilityDrill.findFirst({ where: { name: d.name, coachId: COACH }, select: { id: true } })
    if (existing) continue
    await p.agilityDrill.create({
      data: {
        name: d.name, nameSv: d.name, category: d.cat as any, descriptionSv: d.desc,
        primarySports: ['TEAM_ICE_HOCKEY'] as any, isSystemDrill: false, coachId: COACH,
      },
    })
    drCreated++
  }
  console.log(`Exercises created: ${exCreated} (of ${NEW_EX.length}); Drills created: ${drCreated} (of ${NEW_DR.length})`)
}

// ============================================================
// 2. Cleanup prior run (by MARKER) — scoped strictly to Pär
// ============================================================
async function cleanup() {
  const progs = await p.trainingProgram.findMany({ where: { clientId: PAR, name: { contains: MARKER } }, select: { id: true } })
  const progIds = progs.map((x) => x.id)
  if (progIds.length) {
    await p.strengthSessionAssignment.deleteMany({ where: { programId: { in: progIds } } })
    await p.cardioSessionAssignment.deleteMany({ where: { programId: { in: progIds } } })
    await p.hybridWorkoutAssignment.deleteMany({ where: { programId: { in: progIds } } })
    await p.agilityWorkoutAssignment.deleteMany({ where: { programId: { in: progIds } } })
  }
  // also any stray assignments for Pär that point at our templates (belt & suspenders)
  const tmplWhere = { tags: { hasEvery: [MARKER, athleteTag] } }
  const sIds = (await p.strengthSession.findMany({ where: tmplWhere, select: { id: true } })).map((x) => x.id)
  const cIds = (await p.cardioSession.findMany({ where: tmplWhere, select: { id: true } })).map((x) => x.id)
  const hIds = (await p.hybridWorkout.findMany({ where: tmplWhere, select: { id: true } })).map((x) => x.id)
  const aIds = (await p.agilityWorkout.findMany({ where: tmplWhere, select: { id: true } })).map((x) => x.id)
  if (sIds.length) await p.strengthSessionAssignment.deleteMany({ where: { sessionId: { in: sIds } } })
  if (cIds.length) await p.cardioSessionAssignment.deleteMany({ where: { sessionId: { in: cIds } } })
  if (hIds.length) await p.hybridWorkoutAssignment.deleteMany({ where: { workoutId: { in: hIds } } })
  if (aIds.length) await p.agilityWorkoutAssignment.deleteMany({ where: { workoutId: { in: aIds } } })
  // calendar events (workouts + skott notes) for Pär carrying our marker
  await p.calendarEvent.deleteMany({ where: { clientId: PAR, description: { contains: MARKER } } })
  // templates (cascade removes movements/drills)
  if (sIds.length) await p.strengthSession.deleteMany({ where: { id: { in: sIds } } })
  if (cIds.length) await p.cardioSession.deleteMany({ where: { id: { in: cIds } } })
  if (hIds.length) await p.hybridWorkout.deleteMany({ where: { id: { in: hIds } } })
  if (aIds.length) await p.agilityWorkout.deleteMany({ where: { id: { in: aIds } } })
  if (progIds.length) {
    await p.trainingWeek.deleteMany({ where: { programId: { in: progIds } } })
    await p.trainingProgram.deleteMany({ where: { id: { in: progIds } } })
  }
  console.log(`Cleanup: removed ${progIds.length} prior program(s) and their artifacts`)
}

// ============================================================
// 3. Template builders
// ============================================================
type Item = { exerciseName: string; exerciseId: string; sets: number; reps: string; weight?: number; weightUnit?: string; restSeconds?: number; notes?: string; setRows?: any[]; followUps?: any[] }
function mk(name: string, sets: number, reps: string, opts: Partial<Item> = {}): Item {
  return { exerciseName: name, exerciseId: ex(name), sets, reps, ...opts }
}
function fu(name: string, reps: string, notes?: string, restBeforeSeconds = 90) {
  return { exerciseName: name, exerciseId: ex(name), reps, notes, restBeforeSeconds }
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

type Drl = { name: string; sectionType?: string; sets?: number; reps?: number; duration?: number; restSeconds?: number; notes?: string }
async function agility(name: string, fields: { format?: string; restBetweenDrills?: number; totalDuration?: number; primaryFocus?: string }, drills: Drl[], desc?: string) {
  const rows = drills.map((d, i) => ({ drillId: dr(d.name), order: i + 1, sectionType: (d.sectionType || 'MAIN') as any, sets: d.sets ?? null, reps: d.reps ?? null, duration: d.duration ?? null, restSeconds: d.restSeconds ?? null, notes: d.notes ?? null }))
  const r = await p.agilityWorkout.create({
    data: {
      name, description: desc, format: (fields.format || 'CIRCUIT') as any, restBetweenDrills: fields.restBetweenDrills ?? 60, totalDuration: fields.totalDuration ?? 60,
      primaryFocus: (fields.primaryFocus || 'COD') as any, developmentStage: 'ELITE' as any, targetSports: ['TEAM_ICE_HOCKEY'] as any,
      coachId: COACH, isPublic: false, trainingYear: TRAINING_YEAR, tags: TAGS, drills: { create: J(rows) },
    },
    select: { id: true },
  })
  return r.id
}

// ============================================================
// 4. Scheduling
// ============================================================
type Kind = 'strength' | 'cardio' | 'hybrid' | 'agility'
async function schedule(kind: Kind, templateId: string, title: string, dateStr: string, notes?: string, startTime?: string, endTime?: string) {
  const d = D(dateStr)
  const ev = await p.calendarEvent.create({
    data: {
      clientId: PAR, type: 'SCHEDULED_WORKOUT', title, description: `[${MARKER}]${notes ? ' ' + notes : ''}`,
      status: 'SCHEDULED', startDate: d, endDate: d, allDay: !startTime, startTime, endTime, trainingImpact: 'NORMAL',
      createdById: COACH,
    },
    select: { id: true },
  })
  const common: any = { athleteId: PAR, assignedDate: d, assignedBy: COACH, programId: PROGRAM_ID, calendarEventId: ev.id, responsibleCoachId: COACH, scheduledBy: COACH, notes }
  if (kind === 'strength') await p.strengthSessionAssignment.create({ data: { ...common, sessionId: templateId, status: 'SCHEDULED' } })
  else if (kind === 'cardio') await p.cardioSessionAssignment.create({ data: { ...common, sessionId: templateId, status: 'SCHEDULED' } })
  else if (kind === 'hybrid') await p.hybridWorkoutAssignment.create({ data: { ...common, workoutId: templateId, status: 'SCHEDULED' } })
  else await p.agilityWorkoutAssignment.create({ data: { ...common, workoutId: templateId, status: 'ASSIGNED' } })
}

async function skott(dateStr: string, note?: string) {
  const d = D(dateStr)
  await p.calendarEvent.create({
    data: {
      clientId: PAR, type: 'EXTERNAL_EVENT', title: 'Skott-träning', description: `[${MARKER}] Eftermiddagspass — skott-/isträning (ej i appen).${note ? ' ' + note : ''}`,
      status: 'SCHEDULED', startDate: d, endDate: d, allDay: false, startTime: '16:00', endTime: '17:30', trainingImpact: 'NORMAL',
      createdById: COACH,
    },
  })
}

let PROGRAM_ID = ''

// ============================================================
// MAIN
// ============================================================
async function main() {
  await loadExercises()
  await loadDrills()
  await ensureNew()
  await loadExercises() // reload so newly-created resolve
  await loadDrills()
  await cleanup()

  // ----- Reusable warmups -----
  const wuMax1 = {
    duration: 15,
    exercises: [
      cardioWU(15, 'Valfritt redskap, prio jogg'),
      mk('Hunden på bänk', 2, '10/ben', { notes: 'Kontroll på bål/höft, spänn säte.' }),
      mk('Krabbstående hipext + flex', 2, '8-10/ben', { notes: 'Höft hög, spänd bål, press på hälarna.' }),
      mk('Sidolyft 2-steg', 2, '10+8/ben', { notes: 'Sidoliggande, rak linje, spänd bål.' }),
      mk('Enarmsrotation m hantel', 2, '10/arm', { notes: 'Rak linje, kontrollerad rörelse, stor ROM.' }),
      mk('Nacke extension/flexion', 2, '10/övn'),
    ],
  }
  const wuGen = (min: number) => ({
    duration: min,
    exercises: [
      cardioWU(min),
      mk('Kang squats', 2, '6'),
      mk('Utfallsrotationer', 2, '6/sida'),
      mk('Push up till pik', 2, '8-10'),
      mk('Stabilitetskomplex', 2, '6/pos/sida', { notes: 'Musslan, benlyft, knälyft, benpendel.' }),
      mk('Hantellyft åt sidan +rotation', 2, '8-10'),
    ],
  })
  const wuSnabb2 = {
    duration: 20,
    exercises: [
      cardioWU(20),
      mk('Kang squats', 2, '6'),
      mk('Utfallsrotationer', 2, '6/sida'),
      mk('Stabilitetskomplex', 2, '6/pos/sida', { notes: 'Musslan, benlyft, knälyft, benpendel.' }),
      mk('Bomben steg 1', 2, '8-10/sida', { notes: 'Upprätt hållning, fäll i höften.' }),
      mk('Lateral squat på bänk', 2, '8-10/sida'),
    ],
  }

  // ===== STRENGTH templates =====
  const S_MAX1 = await strength('Maxstyrka 1', 'MAXIMUM_STRENGTH', 75, wuMax1, [
    mk('OH-squat', 2, '6', { weight: 45, weightUnit: 'kg', notes: '40–50 kg, försök öka vikt.' }),
    mk('Bear Complex', 2, '5', { notes: 'Frivändning, thruster, back squat, thruster.' }),
    mk('Benböj', 8, '6/4/2', {
      weight: 85, weightUnit: 'percent', restSeconds: 100,
      notes: 'Stege: 1×6 @75%, 1×4 @80%, sedan 6×2 @85–90%. 90–120 s vila, fullt djup. Alt: Kbox, benpress, trap bar.',
      setRows: [{ reps: 6, weight: 75 }, { reps: 4, weight: 80 }, { reps: 2, weight: 87 }, { reps: 2, weight: 87 }, { reps: 2, weight: 87 }, { reps: 2, weight: 87 }, { reps: 2, weight: 87 }, { reps: 2, weight: 87 }],
    }),
    mk('Hang clean', 6, '2', { restSeconds: 120, notes: 'Prioritera vikt över fart, stegra över set. Alt: clean high pull.' }),
    mk('Enbensmark', 3, '5/sida', { notes: 'Sikta över tid att nå 60–70 kg. Alt: hamstring curl flowin.' }),
    mk('Bänkdrag', 6, '3-5'),
    mk('Bänkpress / Hantelpress benen i luften', 4, '5-8', { notes: 'Hantelpress med benen i luften.' }),
  ], [
    mk('Knee to elbox', 3, '8-12', { notes: '90° armbågsflex, smalt, ingen sving, slingor om möjligt.' }),
    mk('Bålrotationer i kabelmaskin', 3, '10-12/sida', { notes: 'Med pilatesboll.' }),
  ], 'Maxstyrka 1 — Skellefteå AIK A-lag. Mån FM.')

  const S_MAX2 = await strength('Maxstyrka 2', 'MAXIMUM_STRENGTH', 75, wuGen(20), [
    mk('Crossover step up', 3, '6-8/sida', { weight: 45, weightUnit: 'kg', notes: '1 rep = fram och tillbaka. 40–50 kg.' }),
    mk('Markdrag', 10, '6/5/4/2', { notes: 'Driv upp på tå från marken. Stegrande vikt: 1×6, 2×5, 3×4, 2×2, 2×2. Avsluta kring 120 kg.', setRows: [{ reps: 6, weight: 80 }, { reps: 5, weight: 90 }, { reps: 5, weight: 95 }, { reps: 4, weight: 100 }, { reps: 4, weight: 105 }, { reps: 4, weight: 110 }, { reps: 2, weight: 115 }, { reps: 2, weight: 118 }, { reps: 2, weight: 120 }, { reps: 2, weight: 120 }] }),
    mk('Bulgarian SS', 5, '3/ben', { notes: 'Spänd bål, ej svank i botten. 2 uppvärmningsset stegrande innan arbetssets.' }),
    mk('Push press', 6, '3', { notes: 'Spänd bål, upprätt hållning, full ROM, tungt.' }),
    mk('L-chins', 5, '5-8', { notes: 'Ev. viktade.' }),
  ], [
    mk('Dragon flag progression', 3, '10-12'),
    mk('Body saw till pik', 3, '10-12', { notes: 'Alternativ till dragon flag.' }),
  ], 'Maxstyrka 2 — Skellefteå AIK A-lag. Tor FM.')

  const S_SNABB1 = await strength('Snabbstyrka 1', 'POWER', 70, {
    duration: 20,
    exercises: [
      cardioWU(20),
      mk('Kang squats', 2, '6'),
      mk('Utfallsrotationer', 2, '6/sida'),
      mk('Push up till pik', 2, '8-10'),
      mk('Stabilitetskomplex', 2, '6/pos/sida', { notes: 'Musslan, benlyft, knälyft, benpendel.' }),
      mk('OH-squat', 2, '5', { weight: 50, weightUnit: 'kg', notes: '50 kg.' }),
    ],
  }, [
    mk('Benböj', 5, '1', { notes: 'Uppvärmningsstege innan klustern: 1×8, 1×5, 1×3, 1×1. Sedan 5×1 kluster.' }),
    mk('tPV-Squat', 5, '5'),
    mk('Bänkpress smalt grepp', 5, '5'),
    mk('Utfall bakåt till step up', 5, '3/ben'),
    mk('Bänkdrag', 5, '5'),
    mk('Frivändningar', 5, '3'),
  ], undefined, 'Snabbstyrka 1 — Skellefteå AIK A-lag. Mån FM. Fokus på fart/effekt.')

  const S_SNABB2 = await strength('Snabbstyrka 2', 'POWER', 70, wuSnabb2, [
    mk('Build ups/stegringslopp', 4, '10 m', { notes: 'Prep för släde, öka fart varje steg för att toucha full sprint. 3–5×10 m.' }),
    mk('Bulgarian SS', 5, '3/ben', { followUps: [fu('Slädsprint', '10 m', '+ Slädsprint 5×10 m, 10–15 kg på släde.')] }),
    mk('Hang cleans', 5, '3', { followUps: [fu('Dropjump till box enbens', '2/sida', '+ Dropjump till box, enbens 5×2/sida.')] }),
    mk('Armhävning upp till stepbräda', 4, '5', { notes: 'Stabil bål/höft, explosivt upp till stepbräda, släpp ner och vänd med fart.' }),
    mk('L-chins', 4, '5'),
  ], undefined, 'Snabbstyrka 2 — Skellefteå AIK A-lag. Tor FM. Explosiv styrka + plyo.')

  const S_OK = await strength('Styrka Överkropp', 'MAXIMUM_STRENGTH', 60, {
    duration: 10,
    exercises: [
      cardioWU(10, '5 min lugnt, 5 min högre, 3×3 s sprinter sista minuten.'),
      mk('Utfallsrotationer', 2, '4/sida'),
      mk('Armhävningar lift-off', 2, '10', { notes: 'Full ROM, även skuldror, spänd bål/säte.' }),
      mk('TRX-rodd', 2, '10', { notes: 'Full ROM, även skuldror.' }),
      mk('Nackflexion + extension', 2, '10-15', { notes: 'Öka 2,5 kg när 2×15 med kvalitet.' }),
    ],
  }, [
    mk('Axelpress i L-sit', 4, '6-8', { notes: 'Stång eller hantlar. Upprätt, bål spänd, full ROM.' }),
    mk('Stående stångrodd', 4, '6-8', { notes: 'Rak hållning, full ROM upp till bröstet, släpp stången strax under knä.' }),
    mk('Deficit pushups', 3, '12-15', { notes: 'Fötter på bänk, händer på liggande kettlebells, full ROM. Alt hantelpress.' }),
    mk('Omvänd rodd med stång', 3, '12-15', { notes: 'Upprätt, spänd bål/säte, ev. viktväst. Alt ringrodd/TRX.' }),
    mk('YTW', 3, '10-12/pos', { notes: 'Bröst mot bänk, lätta hantlar 4–6 kg. Y → T → W.' }),
    mk('Body saw flowin', 3, '10-12', { notes: 'Ingen svank, spänd bål/säte, så stor ROM som möjligt.' }),
  ], undefined, 'Överkroppsstyrka — Skellefteå AIK A-lag. Tis EM (alt helg).')

  const S_STAB = await strength('Stab + Prevens', 'ANATOMICAL_ADAPTATION', 50, {
    duration: 10,
    exercises: [
      mk('Hunden på bänk', 2, '8-10/ben'),
      mk('Knästående på boll', 3, '1 min'),
      mk('Benböj stående på boll', 3, '10'),
    ],
  }, [
    mk('Bomben', 2, '8-15/ben', { notes: 'Med viktmanschett 2–3 kg.' }),
    mk('Knästräck med höftflex 90', 2, '8-15/ben', { notes: 'Med viktmanschett 2–3 kg.' }),
    mk('Draken m flies', 2, '8-15/ben', { notes: '2–4 kg hantel.' }),
    mk('Pointern på tå', 2, '8-10/ben'),
    mk('Skottkärran armhävningar', 2, '12'),
    mk('Skottkärran hunden', 2, '8-12/sida'),
    mk('Skottkärran rotation', 2, '6-10/sida'),
    mk('Flies 3-pos', 2, '8-12/pos'),
    mk('Hantelpress, 1 ben i luften', 2, '8-12/sida'),
    mk('Tricepsdrag, 1 ben i luften', 2, '8-12/sida'),
  ], [
    mk('Bicepscurl', 2, '10-12', { notes: 'Prevens-cirkel: 2 varv, 22,5–27,5 kg stång. Öka 2,5 kg jämfört med tidigare veckor, ta tid och sänk tiden från pass till pass.' }),
    mk('Axelpress', 2, '10-12', { notes: 'Prevens-cirkel.' }),
    mk('Stångrodd', 2, '10-12', { notes: 'Prevens-cirkel.' }),
    mk('Drag till hakan', 2, '10-12', { notes: 'Prevens-cirkel.' }),
    mk('Omvänd bicepscurl', 2, '10-12', { notes: 'Prevens-cirkel.' }),
  ], 'Stab + Prevens — Skellefteå AIK. Ons FM. Kvalitet, varje rep ska räknas.')

  const S_KLUSTER1 = await strength('Klusterstyrka 1', 'POWER', 70, {
    duration: 12,
    exercises: [
      mk('Utfallsgång hängande KB', 2, '10 m', { notes: '12 kg lila band + 10 kg stång.' }),
      mk('Draken 3-punkt med boll', 2, '9/ben', { notes: 'Knälyft och sträckta armar.' }),
      mk('OHS balansbräda', 2, '10', { notes: 'Utan bräda vid stelhet. 20–40 kg, djupt.' }),
    ],
  }, [
    mk('TpV-squat', 5, '5', { notes: '75% av 1RM.' }),
    mk('Hang clean', 5, '5', { notes: '75% av 1RM.' }),
    mk('Bänkpress smalt grepp', 5, '5', { notes: '70–75% av 1RM.' }),
    mk('Enbensböj + hopp', 5, '5/ben', { notes: 'Bakre foten på bänk (som powertester).' }),
    mk('Bänkdrag', 5, '5', { notes: '75%.' }),
  ], [
    mk('Benindrag ett ben, växelvis', 3, '8-10/ben', { notes: 'Händer på upp-och-nervänd bosuboll, tårna på boll.' }),
    mk('Kålmasken flowin', 3, '5-6'),
  ], 'Klusterstyrka 1 (alternativ) — håll farten; sänk vikten hellre än farten. Varje rep ska räknas.')

  const S_KLUSTER2 = await strength('Klusterstyrka 2', 'POWER', 70, {
    duration: 12,
    exercises: [
      mk('Krabbgång', 2, '6-8 rundor'),
      mk('Windmilll', 2, '6/arm', { notes: 'Släpp ut höften, hela vägen ned, 12–16 kg.' }),
      mk('OHS med g-band', 2, '10', { notes: 'Kontrollerat tempo, max djup, röd eller lila band.' }),
      mk('Adduktorplankan del 2', 2, '6-8/sida', { notes: 'Höftlyft på varje rep.' }),
    ],
  }, [
    mk('Kvartsböj', 5, '5', { notes: '120–130% av 1RM.' }),
    mk('Chest to bar', 5, '5', { notes: 'Strikta upp till bröstkorgen.' }),
    mk('Enbens TpV-squat', 5, '4/ben'),
    mk('Bänkpress', 5, '5', { notes: '70–75% av 1RM.' }),
    mk('Utfall bakåt + step up på bänk', 5, '4/ben'),
  ], [
    mk('Throwing dumbell', 3, '20-30', { notes: 'Sträckta ben i luften, stilla.' }),
    mk('Toes to bar i ribbstol', 3, '10', { notes: 'Sätt matta för ryggen.' }),
  ], 'Klusterstyrka 2 (alternativ) — håll farten; sänk vikten hellre än farten. Varje rep ska räknas.')

  const wuHopp = (note?: string) => ({
    duration: 10,
    exercises: [
      cardioWU(10, note || 'Hopprep ok.'),
      mk('Kang squats', 2, '6', { notes: 'Utmana djup, kort paus i botten.' }),
      mk('Utfallsrotationer', 2, '4/sida'),
      mk('Sidolyft', 2, '6-8/sida', { notes: 'Knät som kontaktpunkt, glut-aktivering.' }),
      mk('MB Overhead toss', 2, '3-5', { notes: 'Om takhöjd finns, annars skippa.' }),
      mk('MB Rotationskast', 2, '5/sida'),
    ],
  })
  const S_HOPP1 = await strength('Extra hopp + power 1', 'POWER', 45, wuHopp(), [
    mk('Ankelhopp', 2, '10 m', { notes: 'Först baklänges sen framlänges, bra flyt/koordination, kort markkontakt.' }),
    mk('Sidohopp med tuck', 3, '5/ben', { notes: 'Sida till sida, lyft foten lätt vid landning. Prioritera flyt/rytm/koordination, sedan output.' }),
    mk('Jämfotahopp med drag bakifrån', 3, '3', { notes: 'Tjockt gummiband runt midjan, hoppa så långt du kan.', followUps: [fu('Jämfotahopp', '3', '+ Jämfotahopp direkt efter motståndshoppen, först singlar sedan kontinuerligt.')] }),
    mk('Boxhopp från sittande med hantlar', 3, '4', { notes: 'Sittande på bänk, 5–10 kg/hand. Det du pressar i backen är viktigt — boxen behöver ej vara hög, tryck på max, kliv ner.' }),
  ], undefined, 'Extrapass hopp/power 1 — sön (utrymme).')

  const S_HOPP2 = await strength('Extra hopp + power 2', 'POWER', 45, wuHopp('5 min lugnt, 5 min högre, 3×3 s sprinter.'), [
    mk('Diagonala hopp', 3, '3/ben', { notes: 'Extensiva — rytm & flyt, ej max. Hoppa diagonalt ~45°, kontroll på landning.', followUps: [fu('Laterala sidohopp', '5/ben', '+ Laterala sidohopp, extensiva, fram och tillbaka.')] }),
    mk('Bulgarian split squat - Explosiv', 4, '4/ben', { exerciseId: ex('Bulgarian split squat explosiv'), exerciseName: 'Bulgarian split squat - Explosiv', notes: 'Bakre ben på stepbräda/2 viktplattor, stabil. Hantlar 30–50 kg totalt. Maxfart upp, kontrollerat ner.', followUps: [fu('Jämfotahopp enbens med MB', '3/ben', '+ Markera landning, slå den varje gång, maxdistans. MB 4–6 kg.')] }),
    mk('Drach hopp', 3, '3/ben', { notes: 'Maxhöjd, kontrollerad landning.', followUps: [fu('Rotationskast MB', '5/sida', '+ Spänd bål, rotera med höften, smäll bollen i väggen, bra rytm.')] }),
  ], undefined, 'Extrapass hopp/power 2 — sön (utrymme).')

  // ===== CARDIO templates =====
  const repBike = (repeats: number, work: number, rest: number, watt: number, label: string) => ({
    id: norm(label), type: 'REPEAT_GROUP', repeats, restBetweenRounds: rest,
    steps: [{ id: norm(label) + 's', type: 'INTERVAL', zone: watt >= 400 ? 5 : 4, duration: work, equipment: 'WATTBIKE', targetType: 'power', targetValue: String(watt), power: String(watt), notes: `${label} @ ~${watt} W` }],
  })
  const C_CYKEL = await cardio('Kondition – Cykel intervaller', 'CYCLING', [
    { id: 'wu', type: 'WARMUP', zone: 1, duration: 600, equipment: 'WATTBIKE', notes: 'Check cykel: fläkt 10, magnet 1, 70 rpm. Första halvan uppv, andra hårdare.' },
    repBike(5, 90, 30, 350, '90/30 s'),
    { id: 'r1', type: 'RECOVERY', zone: 1, duration: 120, notes: 'Vila 2 min' },
    repBike(7, 70, 20, 370, '70/20 s'),
    { id: 'r2', type: 'RECOVERY', zone: 1, duration: 120, notes: 'Vila 2 min' },
    repBike(7, 60, 30, 390, '60/30 s'),
    { id: 'r3', type: 'RECOVERY', zone: 1, duration: 120, notes: 'Vila 2 min' },
    repBike(10, 40, 20, 410, '40/20 s'),
    { id: 'cd', type: 'COOLDOWN', zone: 1, duration: 900, notes: 'Nedvarv / extra volym 15 min.' },
  ], 'Cykel-intervaller (Wattbike). Börja på 350 W, öka ~20 W per serie. Notera W & # på cykeln.')

  const C_RODD = await cardio('Kondition – Rodd 15×500m', 'FUNCTIONAL_FITNESS', [
    { id: 'wu', type: 'WARMUP', zone: 1, duration: 600, equipment: 'ROW', notes: 'Första halvan uppv, andra hårdare.' },
    { id: 'main', type: 'REPEAT_GROUP', repeats: 15, restBetweenRounds: 60, steps: [{ id: 'm', type: 'INTERVAL', zone: 4, distance: 500, equipment: 'ROW', notes: '500 m. Längre serievila 2–3 min halvvägs vid behov.' }] },
    { id: 'cd', type: 'COOLDOWN', zone: 1, duration: 900, notes: 'Nedvarv 15 min.' },
  ], '15×500 m rodd, 1 min vila mellan. Serievila 2–3 min halvvägs. Under sommaren kan du blanda 2 pass rodd + 2 pass cykel.')

  const C_LOP = await cardio('Kondition – Löpning 15×200m', 'RUNNING', [
    { id: 'wu', type: 'WARMUP', zone: 1, duration: 600, equipment: 'RUN', notes: 'Första halvan uppv, andra hårdare.' },
    { id: 'main', type: 'REPEAT_GROUP', repeats: 15, restBetweenRounds: 60, steps: [{ id: 'm', type: 'INTERVAL', zone: 4, distance: 200, equipment: 'RUN', notes: '8 raka (32–34 s) + 7 i "idiot"-form 10-15-20-25-30 m (~50–52 s).' }] },
    { id: 'cd', type: 'COOLDOWN', zone: 1, duration: 900, notes: 'Nedvarv 15 min.' },
  ], '15×200 m löpning: 8 raka (32–34 s) + 7 i idiotform (50–52 s). 1 min vila, serievila 3 min halvvägs. Saknas idiotformen → 20×200 m raka.')

  // mängd alt 1: descending kcal ladder across machines
  const ladderSegs: any[] = [{ id: 'wu', type: 'WARMUP', zone: 1, duration: 1200, notes: '20 min, check cykel om den används.' }]
  const machines = [['WATTBIKE', 'Cykel'], ['ROW', 'Rodd'], ['SKI_ERG', 'Ski-erg']]
  for (const kcal of [50, 40, 30, 20, 10])
    for (const [eq, lbl] of machines)
      ladderSegs.push({ id: `${lbl}${kcal}`, type: 'STEADY', zone: 2, calories: kcal, equipment: eq, notes: `${kcal} kcal ${lbl}. Ingen vila mellan varven, kontrollerat tempo (mängd).` })
  ladderSegs.push({ id: 'cd', type: 'COOLDOWN', zone: 1, duration: 600, notes: 'Jogg 10 min eller valfritt redskap.' })
  const C_MANGD1 = await cardio('Kondition mängd – Alt 1 (kcal-stege)', 'FUNCTIONAL_FITNESS', ladderSegs,
    'Mängd-pass: varva Cykel/Rodd/Ski-erg, 50→40→30→20→10 kcal per redskap, ingen vila mellan varven. Gå ej för hårt. Ett redskap kan bytas mot löpning 1000/800/600/400/200 m.')

  const C_MANGD2 = await cardio('Kondition mängd – Alt 2 (3×20/2×30 min)', 'FUNCTIONAL_FITNESS', [
    { id: 'wu', type: 'WARMUP', zone: 1, duration: 600, notes: 'Check cykel om den används.' },
    { id: 'main', type: 'REPEAT_GROUP', repeats: 3, restBetweenRounds: 120, steps: [{ id: 'm', type: 'STEADY', zone: 2, duration: 1200, notes: '20 min, blanda redskap (minst 1 löpning). Löpning 5:50/km, rodd >200 W, assault 56–58 rpm, wattbike 200–250 W.' }] },
    { id: 'cd', type: 'COOLDOWN', zone: 1, duration: 600, notes: 'Nedvarv.' },
  ], '3×20 min (alt 2×30 min), blanda redskap, minst 1 löpning. 2 min vila mellan. Notera W/kcal/hastighet.')

  // Högintensiv löpalternativ (hills) — 3 blocks
  const hillSegs: any[] = [{ id: 'wu', type: 'WARMUP', zone: 1, duration: 600, equipment: 'RUN', notes: 'Jogging 10 min.' }]
  for (let b = 1; b <= 3; b++) {
    hillSegs.push({ id: `b${b}i`, type: 'INTERVAL', zone: 4, distance: 600, equipment: 'RUN', notes: `Block ${b}: 600 m intervall (uppmätt slinga vid backen).` })
    hillSegs.push({ id: `b${b}r`, type: 'RECOVERY', zone: 1, duration: 120, notes: 'Vila 2 min (gång/jogg till backen).' })
    hillSegs.push({ id: `b${b}h`, type: 'REPEAT_GROUP', repeats: 3, restBetweenRounds: 150, steps: [{ id: `b${b}hs`, type: 'INTERVAL', zone: 5, duration: 35, equipment: 'RUN', notes: 'Dubbelbacke: 2 backar, 35 s arbete / 2:30 vila.' }] })
  }
  hillSegs.push({ id: 'cd', type: 'COOLDOWN', zone: 1, duration: 600, equipment: 'RUN', notes: 'Nedvarvning 10 min — JOGGA slingan. Avsluta med prevens-cirkel 22,5–25 kg, strikt utförande!' })
  const C_HILLS = await cardio('Högintensiv – Löpalternativ (backe)', 'RUNNING', hillSegs,
    '3 block: 600 m intervall + 2 min vila + dubbelbacke 3×2 backar (35 s / 2:30). Avsluta med prevens 22,5–25 kg, strikt!')

  // ===== HYBRID templates =====
  const H_HYBRID_RODD = await hybrid('Högintensiv – Hybrid (rodd)', { format: 'FOR_TIME', totalRounds: 3, repScheme: '3 rounds', warmupNotes: '10 min uppvärmning', warmupDuration: 600 }, [
    { id: 'main', title: '3 rundor för tid', notes: 'Riktlinje totaltid mot 8 min, minimum under 9 min. 3 min serievila. Nedvarv 10 min.', format: 'FOR_TIME', rounds: 3, restAfterSeconds: 180, movements: [
      { name: 'Rodd (m)', distance: 500, notes: '500 m rodd' },
      { name: 'marklyft', reps: 10, weightMale: 60, notes: '60 kg' },
      { name: 'burpees', reps: 10 },
    ] },
  ], '3 varv FOR TIME: 500 m rodd / 10 marklyft 60 kg / 10 burpees. Riktlinje totaltid mot 8 min, minimum under 9 min.')

  const H_HYBRID_AB = await hybrid('Högintensiv – Hybrid (Assault bike)', { format: 'FOR_TIME', totalRounds: 3, repScheme: '3 rounds', warmupNotes: '10 min uppvärmning', warmupDuration: 600 }, [
    { id: 'main', title: '3 rundor', notes: 'Högt utmanande tempo, håll farten genom varven. 3 min serievila. Nedvarv 10 min.', format: 'FOR_TIME', rounds: 3, restAfterSeconds: 180, movements: [
      { name: 'Assault bike', calories: 30, notes: '30 kcal (45 kcal Airdyne)' },
      { name: 'KB-svingar', reps: 15, weightMale: 32, notes: '32 kg' },
      { name: 'burpees', reps: 10 },
    ] },
  ], '3 varv: 30 kcal Assault bike (45 Airdyne) / 15 KB-sving 32 kg / 10 burpees.')

  const H_MODERAT = await hybrid('Hybrid moderat', { format: 'CUSTOM', totalRounds: 8, repScheme: '8 varv, ~100 reps/varv', warmupNotes: 'Rodd/cykel 15 min, stegrande sista 4 min', warmupDuration: 900 }, [
    { id: 'main', title: '8 varv', notes: 'Sikta på 100 reps totalt per varv, fördela fritt — men rodd måste vara 20 kcal. Avsluta: 5–7 min vila, sedan kontinuerligt moderat 8 min (Wattbike 250 W eller <2:00/500 m).', format: 'CUSTOM', rounds: 8, movements: [
      { name: 'Wall balls', notes: '9 kg' },
      { name: 'Sumo deadlift high pull', weightMale: 35, notes: '35 kg' },
      { name: 'Box jump' },
      { name: 'Push press (hybrid)', weightMale: 35, notes: '35 kg' },
      { name: 'Rodd (kcal)', calories: 20, notes: '20 kcal' },
      { name: 'Vila' },
    ] },
  ], 'Moderat hybrid: 8 varv, ~100 reps/varv (Wall balls 9 kg / SDHP 35 kg / Box jump / Push press 35 kg / Rodd 20 kcal / Vila).')

  // ===== AGILITY templates =====
  const A_MEDEL = await agility('Agility (medel)', { format: 'CIRCUIT', restBetweenDrills: 45, totalDuration: 60, primaryFocus: 'COD' }, [
    { name: 'Warm-up', sectionType: 'WARMUP', duration: 600, notes: '10 min uppvärmning inkl. jogg.' },
    { name: 'Häckar', sets: 2, notes: 'Del 1: 2× rakt fram/ben + 2× sidled/ben (alt 90-90 höftrörlighet).' },
    { name: 'Skridskohopp 3-takt', sets: 3, notes: '3×20 m, successivt öka insatsen.' },
    { name: 'Sidohopp', sets: 3, reps: 4, notes: '3×4/ben.' },
    { name: 'Enbenshopp jämfota', sets: 3, reps: 3, notes: '3×3/sida.' },
    { name: 'Snakerope', duration: 15, restSeconds: 45, notes: 'Varv 1 & 3 (15/45 s). Konstant sidledslöp, klapp som signal för riktningsändring.' },
    { name: 'Åttan med motstånd', duration: 15, restSeconds: 45, notes: 'Varv 1 & 3. Framifrån.' },
    { name: 'Alternerande splithopp Bandade KB', duration: 15, restSeconds: 45, notes: 'Varv 1 & 3. Bandade KB, kort kontakttid.' },
    { name: 'L-löp', duration: 15, restSeconds: 45, notes: 'Varv 1 & 3. Bana som "L", alternera sidor, reagera på direktiv.' },
    { name: 'Utfallshopp med ViPR', duration: 15, restSeconds: 45, notes: 'Varv 1 & 3. 8–12 kg (alt MB).' },
    { name: 'Idioten 5-10-5-10', sets: 3, notes: 'Varv 1 & 3. 3×, vila 60–75 s, tävla om möjligt. Serievila 3 min.' },
    { name: 'Kontouch', duration: 15, restSeconds: 45, notes: 'Varv 2 & 4. Snabbt in/ut (varv 2: forma "+" och jobba rakt fram/bak, hö/vä).' },
    { name: 'Åttan med motstånd', duration: 15, restSeconds: 45, notes: 'Varv 2 & 4. Bakifrån.' },
    { name: 'Mothopp xplodelåda skatehopp', duration: 15, restSeconds: 45, notes: 'Varv 2 & 4. Skatehopp från explosionslåda.' },
    { name: 'T-löp', duration: 15, restSeconds: 45, notes: 'Varv 2 & 4. Bana som "T", shuffle sidled ut/tillbaka, baklänges till start.' },
    { name: 'Sidoshuffles ViPR', duration: 15, restSeconds: 45, notes: 'Varv 2 & 4. 3 m mellan koner, 8–12 kg.' },
    { name: 'Rep sprint 16-18m', duration: 180, notes: 'Varv 2 & 4. Rep sprint 16–18 m, rullande klocka start var 10:e sek, 3 min. Serievila 2–3 min mellan varven.' },
  ], 'Agility medel — Skellefteå AIK. Ons FM. Del 1 (hopp) + Del 2 stationsvarv: varv 1 & 3 vs varv 2 & 4, arbetstid 15/45 s.')

  const A_ALT = await agility('Agility (mindre utrustning)', { format: 'CIRCUIT', restBetweenDrills: 45, totalDuration: 45, primaryFocus: 'COD' }, [
    { name: 'Warm-up', sectionType: 'WARMUP', duration: 600, notes: '10 min uppvärmning.' },
    { name: 'Kontouch', duration: 15, restSeconds: 45, notes: 'Varv 1 & 3. Snabbt in/ut, så många vändor du hinner.' },
    { name: 'Alternerande splithopp Bandade KB', duration: 15, restSeconds: 45, notes: 'Varv 1 & 3. Kort kontakttid, bra flyt.' },
    { name: 'MB rotationskast', duration: 15, restSeconds: 45, notes: 'Varv 1 & 3. Spjutstående, max insats, nära väggen.' },
    { name: 'Laterala hopp', duration: 15, restSeconds: 45, notes: 'Varv 1 & 3. Sidohopp kontinuerligt fram/tillbaka.' },
    { name: '5-10-5', duration: 15, restSeconds: 45, notes: 'Varv 1 & 3. En åt varje håll, vila 5–10 s emellan. Serievila 3 min; mellan varven rep sprint 16–18 m, 3 min.' },
    { name: 'Kontouch', duration: 15, restSeconds: 45, notes: 'Varv 2 & 4. Forma "+", rakt fram/bak, hö/vä.' },
    { name: 'Oregelbundna shuffles', duration: 15, restSeconds: 45, notes: 'Varv 2 & 4. Shuffle mellan koner 3–4 m, oregelbundna vändningar.' },
    { name: 'Drach hopp', duration: 15, restSeconds: 45, notes: 'Varv 2 & 4. Alternera sida, tryck på max.' },
    { name: 'MB-slam', duration: 15, restSeconds: 45, notes: 'Varv 2 & 4. MB-slam.' },
    { name: 'T-löp', duration: 15, restSeconds: 45, notes: 'Varv 2 & 4. Bana som "T", reagera på direktiv. Avsluta passet med 20–30 min jogg.' },
  ], 'Agility med mindre utrustning (alternativ). Jobba 15/45, 3–4 varv beroende på kvalitet, vila 2–3 min mellan. Avsluta med 20–30 min jogg.')

  // ===== TRAINING PROGRAM + WEEKS =====
  const prog = await p.trainingProgram.create({
    data: {
      clientId: PAR, coachId: COACH, name: `Pär Lindholm – ${MARKER} (V27–V30)`,
      description: `Skellefteå AIK A-lag sommarprogram (V27–V30), importerad från "Skeå sommar 2026 2.xlsx". Mån/Tor styrka + skott, Tis kondition, Ons stab/agility + mängd, Fre högintensiv, sön utrymme för hopp/power. [${MARKER}]`,
      goalType: 'fitness', startDate: D('2026-06-29'), endDate: D('2026-07-26'), isActive: true,
    },
    select: { id: true },
  })
  PROGRAM_ID = prog.id
  const weeks: [number, string, string, string, string][] = [
    [27, '2026-06-29', '2026-07-05', 'BASE', 'Maxstyrka-block'],
    [28, '2026-07-06', '2026-07-12', 'BASE', 'Snabbstyrka-block'],
    [29, '2026-07-13', '2026-07-19', 'BUILD', 'Maxstyrka + agility'],
    [30, '2026-07-20', '2026-07-26', 'BUILD', 'Snabbstyrka + agility'],
  ]
  let wn = 1
  for (const [v, start, end, phase, focus] of weeks) {
    await p.trainingWeek.create({ data: { programId: PROGRAM_ID, weekNumber: wn++, startDate: D(start), endDate: D(end), phase: phase as any, focus: `V${v}: ${focus}` } })
  }

  // ===== SCHEDULE =====
  const monNote = 'Innan eftermiddagspasset: 20 min uppvärmning, prio jogg.'
  // V27
  await schedule('strength', S_MAX1, 'Maxstyrka 1', '2026-06-29'); await skott('2026-06-29', monNote)
  await schedule('cardio', C_CYKEL, 'Kondition 1 – Cykel intervaller', '2026-06-30')
  await schedule('cardio', C_RODD, 'Kondition 2 – Rodd 15×500m', '2026-06-30')
  await schedule('strength', S_STAB, 'Stab + Prevens', '2026-07-01')
  await schedule('cardio', C_MANGD1, 'Kondition mängd – Alt 1', '2026-07-01')
  await schedule('strength', S_MAX2, 'Maxstyrka 2', '2026-07-02'); await skott('2026-07-02')
  await schedule('hybrid', H_HYBRID_RODD, 'Högintensiv – Hybrid (rodd)', '2026-07-03')
  await schedule('strength', S_HOPP1, 'Extra hopp + power 1', '2026-07-05', 'Utrymme för hopp/power eller extra mängd kondition.')
  // V28
  await schedule('strength', S_SNABB1, 'Snabbstyrka 1', '2026-07-06'); await skott('2026-07-06')
  await schedule('cardio', C_LOP, 'Kondition 1 – Löpning 15×200m', '2026-07-07')
  await schedule('cardio', C_CYKEL, 'Kondition 2 – Cykel intervaller', '2026-07-07')
  await schedule('strength', S_STAB, 'Stab + Prevens', '2026-07-08')
  await schedule('cardio', C_MANGD2, 'Kondition mängd – Alt 2', '2026-07-08')
  await schedule('strength', S_SNABB2, 'Snabbstyrka 2', '2026-07-09'); await skott('2026-07-09')
  await schedule('hybrid', H_HYBRID_AB, 'Högintensiv – Hybrid (Assault bike)', '2026-07-10')
  await schedule('strength', S_HOPP2, 'Extra hopp + power 2', '2026-07-12', 'Utrymme för hopp/power eller extra mängd kondition.')
  // V29 (agility on Wed → Stab moved to Tue EM)
  await schedule('strength', S_MAX1, 'Maxstyrka 1', '2026-07-13'); await skott('2026-07-13')
  await schedule('cardio', C_RODD, 'Kondition 1 – Rodd 15×500m', '2026-07-14')
  await schedule('strength', S_STAB, 'Stab + Prevens (EM)', '2026-07-14', 'Stab på tis EM eftersom agility körs ons.')
  await schedule('agility', A_MEDEL, 'Agility (medel)', '2026-07-15')
  await schedule('strength', S_MAX2, 'Maxstyrka 2', '2026-07-16'); await skott('2026-07-16')
  await schedule('cardio', C_HILLS, 'Högintensiv – Löpalternativ (backe)', '2026-07-17')
  await schedule('strength', S_HOPP1, 'Extra hopp + power 1', '2026-07-19', 'Utrymme för hopp/power eller extra mängd kondition.')
  // V30
  await schedule('strength', S_SNABB1, 'Snabbstyrka 1', '2026-07-20'); await skott('2026-07-20')
  await schedule('cardio', C_CYKEL, 'Kondition – Cykel intervaller', '2026-07-21')
  await schedule('strength', S_OK, 'Styrka Överkropp (EM)', '2026-07-21')
  await schedule('agility', A_MEDEL, 'Agility (medel)', '2026-07-22')
  await schedule('strength', S_STAB, 'Stab + Prevens (EM)', '2026-07-22')
  await schedule('strength', S_SNABB2, 'Snabbstyrka 2', '2026-07-23'); await skott('2026-07-23')
  await schedule('hybrid', H_HYBRID_RODD, 'Högintensiv – Hybrid (rodd)', '2026-07-24')

  // spares created but not scheduled: S_KLUSTER1, S_KLUSTER2, H_MODERAT, A_ALT
  console.log('Spare templates (library only):', { S_KLUSTER1, S_KLUSTER2, H_MODERAT, A_ALT })
  console.log('PROGRAM_ID:', PROGRAM_ID)
  console.log('DONE.')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => p.$disconnect())
