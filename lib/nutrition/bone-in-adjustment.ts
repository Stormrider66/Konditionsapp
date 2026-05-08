type BoneAdjustableItem = {
  name: string
  category?: string
  estimatedGrams: number
  portionDescription?: string | null
  calories: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
  fiberGrams: number
  saturatedFatGrams?: number
  monounsaturatedFatGrams?: number
  polyunsaturatedFatGrams?: number
  sugarGrams?: number
  complexCarbsGrams?: number
}

export type BoneInAdjustment = {
  edibleFraction: number
  edibleGrams: number
  reason: string
}

const BONELESS_RE = /\b(benfri|benfritt|utan ben|fil[eé]|file|färs|malen|strimlad)\b/i
const BONE_HINT_RE = /\b(med ben|benet|ben|bone-in|with bone|on the bone)\b/i

const BONE_IN_RULES: Array<{ pattern: RegExp; edibleFraction: number; reason: string }> = [
  {
    pattern: /\b(kycklingklubba|kycklingklubbor|kycklingben|chicken drumstick|drumstick)\b/i,
    edibleFraction: 0.65,
    reason: 'kycklingklubba med ben',
  },
  {
    pattern: /\b(kycklingvinge|kycklingvingar|chicken wing|chicken wings|vingar)\b/i,
    edibleFraction: 0.55,
    reason: 'kycklingvinge med ben',
  },
  {
    pattern: /\b(kycklinglår|chicken thigh)\b/i,
    edibleFraction: 0.7,
    reason: 'kycklinglår med ben',
  },
  {
    pattern: /\b(revben|spjäll|spareribs|spare ribs|ribs)\b/i,
    edibleFraction: 0.55,
    reason: 'revben med ben',
  },
  {
    pattern: /\b(kotlett|lammkotlett|fläskkotlett|pork chop|lamb chop)\b/i,
    edibleFraction: 0.75,
    reason: 'kotlett med ben',
  },
  {
    pattern: /\b(hel fisk|fisk med ben|whole fish|fish on the bone)\b/i,
    edibleFraction: 0.6,
    reason: 'hel fisk med ben',
  },
]

const round1 = (value: number) => Math.round(value * 10) / 10

const isProteinAnimalFood = (text: string, category?: string) =>
  category === 'PROTEIN' || /\b(kyckling|fågel|kalkon|kött|fläsk|nöt|lamm|fisk|lax|torsk|ribs|chicken|meat|pork|beef|lamb|fish)\b/i.test(text)

export function detectBoneInAdjustment(item: BoneAdjustableItem): BoneInAdjustment | null {
  const grams = item.estimatedGrams
  if (!Number.isFinite(grams) || grams <= 0) return null

  const text = `${item.name} ${item.portionDescription ?? ''}`
  if (BONELESS_RE.test(text) || text.toLowerCase().includes('ätbart')) return null

  for (const rule of BONE_IN_RULES) {
    if (rule.pattern.test(text)) {
      return {
        edibleFraction: rule.edibleFraction,
        edibleGrams: round1(grams * rule.edibleFraction),
        reason: rule.reason,
      }
    }
  }

  if (BONE_HINT_RE.test(text) && isProteinAnimalFood(text, item.category)) {
    return {
      edibleFraction: 0.7,
      edibleGrams: round1(grams * 0.7),
      reason: 'kött/fisk/fågel med ben',
    }
  }

  return null
}

export function applyBoneInAdjustment<T extends BoneAdjustableItem>(item: T): T {
  const adjustment = detectBoneInAdjustment(item)
  if (!adjustment) return item

  const scale = adjustment.edibleFraction
  const portionDescription = item.portionDescription?.trim() || `${round1(item.estimatedGrams)} g med ben`
  const edibleNote = `ca ${adjustment.edibleGrams} g ätbart efter ben`

  return {
    ...item,
    portionDescription: portionDescription.toLowerCase().includes('ätbart')
      ? portionDescription
      : `${portionDescription} (${edibleNote})`,
    calories: round1(item.calories * scale),
    proteinGrams: round1(item.proteinGrams * scale),
    carbsGrams: round1(item.carbsGrams * scale),
    fatGrams: round1(item.fatGrams * scale),
    fiberGrams: round1(item.fiberGrams * scale),
    saturatedFatGrams:
      item.saturatedFatGrams != null ? round1(item.saturatedFatGrams * scale) : item.saturatedFatGrams,
    monounsaturatedFatGrams:
      item.monounsaturatedFatGrams != null ? round1(item.monounsaturatedFatGrams * scale) : item.monounsaturatedFatGrams,
    polyunsaturatedFatGrams:
      item.polyunsaturatedFatGrams != null ? round1(item.polyunsaturatedFatGrams * scale) : item.polyunsaturatedFatGrams,
    sugarGrams: item.sugarGrams != null ? round1(item.sugarGrams * scale) : item.sugarGrams,
    complexCarbsGrams:
      item.complexCarbsGrams != null ? round1(item.complexCarbsGrams * scale) : item.complexCarbsGrams,
  }
}
