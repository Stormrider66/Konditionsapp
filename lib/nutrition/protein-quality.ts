export const PROTEIN_SOURCE_VALUES = ['ANIMAL', 'PLANT', 'MIXED', 'UNKNOWN'] as const

export type ProteinSource = (typeof PROTEIN_SOURCE_VALUES)[number]

const ANIMAL_PATTERNS = [
  /\b(kyckling|kalkon|höna|fågel)\b/i,
  /\b(nöt|nötkött|biff|ox|entrecote|ryggbiff|högrev|köttfärs|älg|vilt|ren|lamm|fläsk|gris|skinka|bacon|korv|salami)\b/i,
  /\b(lax|laxfil|torsk|tonfisk|makrill|sill|räka|räkor|kräft|skaldjur|fisk)\w*/i,
  /\b(ägg|omelett)\b/i,
  /\b(mjölk|fil|yoghurt|kvarg|keso|ost|vassle|whey|kasein)\b/i,
]

const PLANT_PATTERNS = [
  /\b(tofu|tempeh|soja|sojabön|edamame|sojaprotein)\b/i,
  /\b(lins|linser|böna|bönor|kikärt|kikär|ärta|ärtprotein|falafel|hummus)\w*/i,
  /\b(havre|ris|pasta|bröd|quinoa|bulgur|couscous|vete|råg|korn|majs)\b/i,
  /\b(nötter|mandel|valnöt|cashew|jordnöt|frö|chia|pumpafrö|solrosfrö|sesam)\b/i,
]

const COMPLETE_PLANT_PATTERNS = [
  /\b(soja|sojabön|edamame|tofu|tempeh|sojaprotein)\b/i,
  /\b(quinoa)\b/i,
]

export function normalizeProteinSource(value: unknown): ProteinSource | null {
  if (typeof value !== 'string') return null
  const upper = value.trim().toUpperCase()
  return PROTEIN_SOURCE_VALUES.includes(upper as ProteinSource) ? (upper as ProteinSource) : null
}

export function inferProteinSource(name: string, category?: string | null): ProteinSource {
  const haystack = `${name} ${category ?? ''}`
  const isAnimal = ANIMAL_PATTERNS.some((pattern) => pattern.test(haystack))
  const isPlant = PLANT_PATTERNS.some((pattern) => pattern.test(haystack))

  if (isAnimal && isPlant) return 'MIXED'
  if (isAnimal) return 'ANIMAL'
  if (isPlant) return 'PLANT'
  return 'UNKNOWN'
}

export function inferCompleteProtein(
  name: string,
  category?: string | null,
  source: ProteinSource = inferProteinSource(name, category)
): boolean | null {
  if (source === 'ANIMAL') return true
  if (source === 'MIXED') return true
  if (source === 'PLANT') {
    return COMPLETE_PLANT_PATTERNS.some((pattern) => pattern.test(name)) ? true : false
  }
  return null
}
