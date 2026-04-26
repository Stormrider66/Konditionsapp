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
 * Data source: the public Livsmedelsverket dataportal REST API. If the API
 * is unreachable or the schema changes, set LIVSMEDELSVERKET_LOCAL_JSON to a
 * path containing the same shape as `FoodRecord[]` and the script will read
 * that instead — useful for offline runs or when working from the official
 * Excel/CSV download.
 */

import { PrismaClient } from '@prisma/client'
import { readFile } from 'node:fs/promises'

const prisma = new PrismaClient()

const API_BASE = 'https://dataportal.livsmedelsverket.se/livsmedel/api/v1'
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

// Livsmedelsverket nutrient codes — confirmed against their public API docs.
// If the API changes the codes, update this map; the rest of the script is generic.
const NUTRIENT_CODES = {
  energiKcal: 'Ener',         // kcal per 100 g
  protein: 'Prot',
  fat: 'Fett',
  carbs: 'Kolh',
  fiber: 'Fibe',
  saturatedFat: 'MFAS',
  monounsaturatedFat: 'MFAM',
  polyunsaturatedFat: 'MFAP',
  sugar: 'Mono',              // mono- + disaccharider as a sugar proxy
} as const

interface ApiFoodListItem {
  nummer: number
  namn: string
  livsmedelsTyp?: string
}

interface ApiNutrientValue {
  forkortning: string
  varde: number
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

async function fetchFromApi(): Promise<FoodRecord[]> {
  console.log('Fetching food list from Livsmedelsverket dataportal…')
  const list = await fetchJson<ApiFoodListItem[]>(`${API_BASE}/livsmedel/sprak/sv`)
  console.log(`  → ${list.length} foods. Fetching nutrient values…`)

  const records: FoodRecord[] = []
  let done = 0
  for await (const record of mapWithConcurrency(list, CONCURRENCY, async (food) => {
    const nutrients = await fetchJson<ApiNutrientValue[]>(
      `${API_BASE}/livsmedel/${food.nummer}/naringsvarden/sprak/sv`
    ).catch(() => [] as ApiNutrientValue[])
    const get = (code: string) =>
      nutrients.find((n) => n.forkortning === code)?.varde
    const energy = get(NUTRIENT_CODES.energiKcal)
    const protein = get(NUTRIENT_CODES.protein)
    const carbs = get(NUTRIENT_CODES.carbs)
    const fat = get(NUTRIENT_CODES.fat)
    if (energy == null || protein == null || carbs == null || fat == null) {
      return null
    }
    return {
      externalId: String(food.nummer),
      nameSv: food.namn,
      category: food.livsmedelsTyp,
      caloriesPer100g: energy,
      proteinPer100g: protein,
      carbsPer100g: carbs,
      fatPer100g: fat,
      fiberPer100g: get(NUTRIENT_CODES.fiber),
      saturatedFatPer100g: get(NUTRIENT_CODES.saturatedFat),
      monounsaturatedFatPer100g: get(NUTRIENT_CODES.monounsaturatedFat),
      polyunsaturatedFatPer100g: get(NUTRIENT_CODES.polyunsaturatedFat),
      sugarPer100g: get(NUTRIENT_CODES.sugar),
    } satisfies FoodRecord
  })) {
    done++
    if (record) records.push(record)
    if (done % 200 === 0) {
      process.stdout.write(`  fetched ${done}/${list.length}\r`)
    }
  }
  console.log(`  fetched ${done}/${list.length} (kept ${records.length} with full macros)`)
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
