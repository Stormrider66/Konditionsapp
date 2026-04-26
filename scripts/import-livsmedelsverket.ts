/**
 * Imports the Livsmedelsverket food database into the Food table.
 *
 * Run:
 *   export $(grep -E '^(DATABASE_URL|DIRECT_DATABASE_URL)=' .env.local | xargs) \
 *     && npx tsx scripts/import-livsmedelsverket.ts
 *
 * Idempotent: upserts on (source, externalId), so re-running picks up new
 * foods or updated nutrient values without duplicating rows.
 *
 * Data source: the public Livsmedelsverket dataportal REST API (Swagger:
 * https://dataportal.livsmedelsverket.se/livsmedel/swagger/index.html).
 * If the API is unreachable or you want to import from a downloaded file,
 * set LIVSMEDELSVERKET_LOCAL_JSON=path.json (FoodRecord[] shape).
 */

import { PrismaClient } from '@prisma/client'
import { readFile } from 'node:fs/promises'

const prisma = new PrismaClient()

const API_BASE = 'https://dataportal.livsmedelsverket.se/livsmedel/api/v1'
const LIST_LIMIT = 3000   // ~2400 foods total — one page is enough
const CONCURRENCY = 8

interface FoodRecord {
  externalId: string
  nameSv: string
  nameEn?: string
  category?: string
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  fiberPer100g?: number
  saturatedFatPer100g?: number
  monounsaturatedFatPer100g?: number
  polyunsaturatedFatPer100g?: number
  sugarPer100g?: number
}

// Match nutrients by EuroFIR code (stable across API versions). For energy,
// disambiguate kJ vs kcal via the `enhet` field — both rows share `ENERC`.
const NUTRIENT_CODES = {
  protein: 'PROT',
  fat: 'FAT',
  carbs: 'CHO',
  fiber: 'FIBT',
  saturatedFat: 'FASAT',
  monounsaturatedFat: 'FAMS',
  polyunsaturatedFat: 'FAPU',
  sugar: 'SUGAR',
} as const

interface ApiFoodListItem {
  nummer: number
  namn: string
  livsmedelsTyp?: string
}

interface ApiFoodList {
  livsmedel: ApiFoodListItem[]
  _meta?: { totalCount?: number }
}

interface ApiNutrient {
  namn: string
  euroFIRkod: string
  forkortning: string
  varde: number
  enhet: string
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    throw new Error(`GET ${url} → ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

async function* mapWithConcurrency<I, O>(
  items: I[],
  limit: number,
  fn: (item: I, index: number) => Promise<O>
): AsyncGenerator<O> {
  let cursor = 0
  const next = async (): Promise<{ index: number; result: O } | null> => {
    const i = cursor++
    if (i >= items.length) return null
    return { index: i, result: await fn(items[i], i) }
  }
  const inflight: Array<Promise<{ index: number; result: O } | null>> = []
  for (let i = 0; i < Math.min(limit, items.length); i++) {
    inflight.push(next())
  }
  while (inflight.length > 0) {
    const settled = await Promise.race(
      inflight.map((p, idx) => p.then((r) => ({ idx, r })))
    )
    inflight.splice(settled.idx, 1)
    if (settled.r) {
      inflight.push(next())
      yield settled.r.result
    }
  }
}

function pickByEuroFIR(nutrients: ApiNutrient[], code: string): number | undefined {
  const hit = nutrients.find((n) => n.euroFIRkod === code)
  return hit?.varde
}

function pickEnergyKcal(nutrients: ApiNutrient[]): number | undefined {
  const hit = nutrients.find(
    (n) => n.euroFIRkod === 'ENERC' && (n.enhet || '').toLowerCase() === 'kcal'
  )
  return hit?.varde
}

async function fetchFromApi(): Promise<FoodRecord[]> {
  console.log('Fetching food list from Livsmedelsverket dataportal…')
  const list = await fetchJson<ApiFoodList>(
    `${API_BASE}/livsmedel?offset=0&limit=${LIST_LIMIT}&sprak=1`
  )
  const foods = list.livsmedel ?? []
  console.log(`  → ${foods.length} foods. Fetching nutrient values (concurrency ${CONCURRENCY})…`)

  const records: FoodRecord[] = []
  let done = 0
  let skipped = 0
  for await (const record of mapWithConcurrency(foods, CONCURRENCY, async (food) => {
    const nutrients = await fetchJson<ApiNutrient[]>(
      `${API_BASE}/livsmedel/${food.nummer}/naringsvarden?sprak=1`
    ).catch((err) => {
      console.warn(`  warn: ${food.nummer} ${food.namn} — ${err.message}`)
      return [] as ApiNutrient[]
    })

    const energy = pickEnergyKcal(nutrients)
    const protein = pickByEuroFIR(nutrients, NUTRIENT_CODES.protein)
    const carbs = pickByEuroFIR(nutrients, NUTRIENT_CODES.carbs)
    const fat = pickByEuroFIR(nutrients, NUTRIENT_CODES.fat)
    if (energy == null || protein == null || carbs == null || fat == null) {
      return null
    }

    return {
      externalId: String(food.nummer),
      nameSv: food.namn,
      caloriesPer100g: energy,
      proteinPer100g: protein,
      carbsPer100g: carbs,
      fatPer100g: fat,
      fiberPer100g: pickByEuroFIR(nutrients, NUTRIENT_CODES.fiber),
      saturatedFatPer100g: pickByEuroFIR(nutrients, NUTRIENT_CODES.saturatedFat),
      monounsaturatedFatPer100g: pickByEuroFIR(nutrients, NUTRIENT_CODES.monounsaturatedFat),
      polyunsaturatedFatPer100g: pickByEuroFIR(nutrients, NUTRIENT_CODES.polyunsaturatedFat),
      sugarPer100g: pickByEuroFIR(nutrients, NUTRIENT_CODES.sugar),
    } satisfies FoodRecord
  })) {
    done++
    if (record) records.push(record)
    else skipped++
    if (done % 200 === 0) {
      process.stdout.write(`  fetched ${done}/${foods.length}\r`)
    }
  }
  console.log(`  fetched ${done}/${foods.length} (kept ${records.length}, skipped ${skipped} without full macros)`)
  return records
}

async function fetchFromLocal(path: string): Promise<FoodRecord[]> {
  console.log(`Reading foods from ${path}…`)
  const raw = await readFile(path, 'utf8')
  const parsed = JSON.parse(raw) as FoodRecord[]
  if (!Array.isArray(parsed)) throw new Error('Local JSON must be an array of FoodRecord')
  return parsed
}

async function upsertAll(records: FoodRecord[]): Promise<void> {
  console.log(`Upserting ${records.length} foods…`)
  let i = 0
  for (const r of records) {
    await prisma.food.upsert({
      where: { source_externalId: { source: 'LIVSMEDELSVERKET', externalId: r.externalId } },
      create: {
        source: 'LIVSMEDELSVERKET',
        externalId: r.externalId,
        nameSv: r.nameSv,
        nameEn: r.nameEn,
        searchName: r.nameSv.toLowerCase(),
        category: r.category,
        caloriesPer100g: r.caloriesPer100g,
        proteinPer100g: r.proteinPer100g,
        carbsPer100g: r.carbsPer100g,
        fatPer100g: r.fatPer100g,
        fiberPer100g: r.fiberPer100g,
        saturatedFatPer100g: r.saturatedFatPer100g,
        monounsaturatedFatPer100g: r.monounsaturatedFatPer100g,
        polyunsaturatedFatPer100g: r.polyunsaturatedFatPer100g,
        sugarPer100g: r.sugarPer100g,
      },
      update: {
        nameSv: r.nameSv,
        nameEn: r.nameEn,
        searchName: r.nameSv.toLowerCase(),
        category: r.category,
        caloriesPer100g: r.caloriesPer100g,
        proteinPer100g: r.proteinPer100g,
        carbsPer100g: r.carbsPer100g,
        fatPer100g: r.fatPer100g,
        fiberPer100g: r.fiberPer100g,
        saturatedFatPer100g: r.saturatedFatPer100g,
        monounsaturatedFatPer100g: r.monounsaturatedFatPer100g,
        polyunsaturatedFatPer100g: r.polyunsaturatedFatPer100g,
        sugarPer100g: r.sugarPer100g,
      },
    })
    if (++i % 200 === 0) process.stdout.write(`  upserted ${i}/${records.length}\r`)
  }
  console.log(`  upserted ${i}/${records.length}`)
}

async function main() {
  const localPath = process.env.LIVSMEDELSVERKET_LOCAL_JSON
  const records = localPath ? await fetchFromLocal(localPath) : await fetchFromApi()
  if (records.length === 0) {
    console.error('No records to import — aborting.')
    process.exit(1)
  }
  await upsertAll(records)
  console.log('Done.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
