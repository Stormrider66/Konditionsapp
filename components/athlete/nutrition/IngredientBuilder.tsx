'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Camera, Plus, Sparkles, Trash2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface IngredientRow {
  // Local row id so React keys stay stable while the user edits.
  rowId: string
  foodId?: string
  name: string
  grams: number
  // Per-100g values cached on the row when a Food was picked. macros below are
  // grams * (per-100g / 100). Free-text rows leave per-100g undefined and
  // contribute zero macros until the user picks a Food.
  caloriesPer100g?: number
  proteinPer100g?: number
  carbsPer100g?: number
  fatPer100g?: number
  fiberPer100g?: number
}

export interface IngredientTotals {
  calories: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
  fiberGrams: number
}

interface FoodOption {
  id: string
  nameSv: string
  category: string | null
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  fiberPer100g: number | null
}

interface IngredientBuilderProps {
  value: IngredientRow[]
  onChange: (next: IngredientRow[]) => void
}

interface RecipeScanIngredient {
  name: string
  grams: number
  food: FoodOption | null
}

export function ingredientMacros(row: IngredientRow): IngredientTotals {
  const factor = row.grams / 100
  return {
    calories: (row.caloriesPer100g ?? 0) * factor,
    proteinGrams: (row.proteinPer100g ?? 0) * factor,
    carbsGrams: (row.carbsPer100g ?? 0) * factor,
    fatGrams: (row.fatPer100g ?? 0) * factor,
    fiberGrams: (row.fiberPer100g ?? 0) * factor,
  }
}

export function sumIngredientMacros(rows: IngredientRow[]): IngredientTotals {
  return rows.reduce<IngredientTotals>(
    (acc, row) => {
      const m = ingredientMacros(row)
      return {
        calories: acc.calories + m.calories,
        proteinGrams: acc.proteinGrams + m.proteinGrams,
        carbsGrams: acc.carbsGrams + m.carbsGrams,
        fatGrams: acc.fatGrams + m.fatGrams,
        fiberGrams: acc.fiberGrams + m.fiberGrams,
      }
    },
    { calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0, fiberGrams: 0 }
  )
}

function makeRow(): IngredientRow {
  return {
    rowId: makeRowId(),
    name: '',
    grams: 100,
  }
}

export function IngredientBuilder({ value, onChange }: IngredientBuilderProps) {
  const ensureRow = () => {
    if (value.length === 0) onChange([makeRow()])
  }
  // First mount: seed with one empty row so the user has something to type into.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(ensureRow, [])

  const totals = sumIngredientMacros(value)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)

  const updateRow = (rowId: string, patch: Partial<IngredientRow>) => {
    onChange(value.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)))
  }
  const removeRow = (rowId: string) => {
    onChange(value.filter((r) => r.rowId !== rowId))
  }

  const handleRecipeFile = async (file: File) => {
    setScanError(null)
    setScanning(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await fetch('/api/ai/food-scan/recipe', { method: 'POST', body: fd })
      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(payload?.error || 'Kunde inte tolka receptet')
      }
      const ingredients = (payload?.ingredients ?? []) as RecipeScanIngredient[]
      if (ingredients.length === 0) {
        setScanError('Inga ingredienser hittades i bilden.')
        return
      }
      // Replace any empty seed rows; append to filled rows.
      const existing = value.filter((r) => r.name.trim().length > 0 || r.grams > 0)
      const newRows: IngredientRow[] = ingredients.map((ing) =>
        ing.food
          ? {
              rowId: makeRowId(),
              foodId: ing.food.id,
              name: ing.food.nameSv,
              grams: ing.grams,
              caloriesPer100g: ing.food.caloriesPer100g,
              proteinPer100g: ing.food.proteinPer100g,
              carbsPer100g: ing.food.carbsPer100g,
              fatPer100g: ing.food.fatPer100g,
              fiberPer100g: ing.food.fiberPer100g ?? undefined,
            }
          : {
              rowId: makeRowId(),
              name: ing.name,
              grams: ing.grams,
            }
      )
      onChange([...existing, ...newRows])
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Kunde inte tolka receptet')
    } finally {
      setScanning(false)
      // Reset the input so picking the same file twice still triggers onChange.
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {value.map((row) => (
          <IngredientRowEditor
            key={row.rowId}
            row={row}
            onChange={(patch) => updateRow(row.rowId, patch)}
            onRemove={() => removeRow(row.rowId)}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700"
          onClick={() => onChange([...value, makeRow()])}
        >
          <Plus className="h-4 w-4" />
          Lägg till
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700"
          onClick={() => fileInputRef.current?.click()}
          disabled={scanning}
        >
          {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          {scanning ? 'Läser receptet…' : 'Skanna recept'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleRecipeFile(file)
          }}
        />
      </div>

      {scanError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-500">
          {scanError}
        </div>
      )}

      <div className="rounded-lg border border-border dark:border-slate-700 p-3 grid grid-cols-4 gap-2 text-center text-xs">
        <Total label="kcal" value={Math.round(totals.calories)} />
        <Total label="P" value={`${totals.proteinGrams.toFixed(1)} g`} />
        <Total label="K" value={`${totals.carbsGrams.toFixed(1)} g`} />
        <Total label="F" value={`${totals.fatGrams.toFixed(1)} g`} />
      </div>
    </div>
  )
}

function makeRowId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `row-${Math.random().toString(36).slice(2)}`
}

function Total({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="font-semibold text-foreground dark:text-slate-100">{value}</div>
    </div>
  )
}

interface RowEditorProps {
  row: IngredientRow
  onChange: (patch: Partial<IngredientRow>) => void
  onRemove: () => void
}

function IngredientRowEditor({ row, onChange, onRemove }: RowEditorProps) {
  const [query, setQuery] = useState(row.name)
  const [results, setResults] = useState<FoodOption[]>([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [estimating, setEstimating] = useState(false)
  const [estimateError, setEstimateError] = useState<string | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Debounced search against /api/foods. <2 chars returns nothing per the route.
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2 || trimmed === row.name) {
      setResults([])
      return
    }
    setSearching(true)
    const ctrl = new AbortController()
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/foods?q=${encodeURIComponent(trimmed)}`, {
          signal: ctrl.signal,
        })
        if (res.ok) {
          const data = (await res.json()) as { foods: FoodOption[] }
          setResults(data.foods ?? [])
          setOpen(true)
        }
      } catch {
        // aborted or network error — ignore
      } finally {
        setSearching(false)
      }
    }, 220)
    return () => {
      ctrl.abort()
      window.clearTimeout(timer)
    }
  }, [query, row.name])

  // Close popover on outside click.
  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const pick = (food: FoodOption) => {
    setQuery(food.nameSv)
    setOpen(false)
    setResults([])
    onChange({
      foodId: food.id,
      name: food.nameSv,
      caloriesPer100g: food.caloriesPer100g,
      proteinPer100g: food.proteinPer100g,
      carbsPer100g: food.carbsPer100g,
      fatPer100g: food.fatPer100g,
      fiberPer100g: food.fiberPer100g ?? undefined,
    })
  }

  const handleEstimate = async () => {
    const trimmed = row.name.trim()
    if (!trimmed || row.grams <= 0) return
    setEstimateError(null)
    setEstimating(true)
    try {
      const res = await fetch('/api/ai/food-scan/analyze-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: `${row.grams} g ${trimmed}` }),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(payload?.error || 'Kunde inte uppskatta')
      }
      const totals = payload?.result?.totals as
        | { calories?: number; proteinGrams?: number; carbsGrams?: number; fatGrams?: number; fiberGrams?: number }
        | undefined
      if (!totals || totals.calories == null) {
        throw new Error('Inget resultat')
      }
      const factor = 100 / row.grams
      // Cache per-100g so live grams editing keeps recomputing macros.
      onChange({
        caloriesPer100g: (totals.calories ?? 0) * factor,
        proteinPer100g: (totals.proteinGrams ?? 0) * factor,
        carbsPer100g: (totals.carbsGrams ?? 0) * factor,
        fatPer100g: (totals.fatGrams ?? 0) * factor,
        fiberPer100g: totals.fiberGrams != null ? totals.fiberGrams * factor : undefined,
      })
    } catch (err) {
      setEstimateError(err instanceof Error ? err.message : 'AI-uppskattning misslyckades')
    } finally {
      setEstimating(false)
    }
  }

  const macros = ingredientMacros(row)
  const isFreeText = !row.foodId && row.name.trim().length > 0
  const hasMacros = (row.caloriesPer100g ?? 0) > 0

  return (
    <div className="rounded-lg border border-border dark:border-slate-700 p-2 space-y-2">
      <div className="flex gap-2 items-start">
        <div ref={wrapperRef} className="relative flex-1 min-w-0">
          <Input
            value={query}
            placeholder="Sök livsmedel…"
            onChange={(e) => {
              setQuery(e.target.value)
              // Treat free text as a clean break from any picked Food: clear
              // the foodId/per-100g cache so totals reflect the new state.
              onChange({
                foodId: undefined,
                name: e.target.value,
                caloriesPer100g: undefined,
                proteinPer100g: undefined,
                carbsPer100g: undefined,
                fatPer100g: undefined,
                fiberPer100g: undefined,
              })
            }}
            onFocus={() => results.length > 0 && setOpen(true)}
            className="dark:text-white dark:placeholder:text-slate-500"
          />
          {searching && (
            <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {open && results.length > 0 && (
            <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-md border border-border dark:border-slate-700 bg-popover dark:bg-slate-800 shadow-lg">
              {results.map((food) => (
                <button
                  key={food.id}
                  type="button"
                  onClick={() => pick(food)}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-accent dark:hover:bg-slate-700"
                >
                  <div className="truncate dark:text-slate-100">{food.nameSv}</div>
                  <div className="text-xs text-muted-foreground">
                    {Math.round(food.caloriesPer100g)} kcal · P {food.proteinPer100g.toFixed(1)} · K{' '}
                    {food.carbsPer100g.toFixed(1)} · F {food.fatPer100g.toFixed(1)} per 100 g
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-24 shrink-0">
          <div className="relative">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={row.grams || ''}
              onChange={(e) => onChange({ grams: parseFloat(e.target.value) || 0 })}
              className="pr-8 dark:text-white"
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              g
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 h-9 w-9"
          onClick={onRemove}
          aria-label="Ta bort ingrediens"
        >
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      {hasMacros && (
        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 px-1">
          <span>{Math.round(macros.calories)} kcal</span>
          <span>P {macros.proteinGrams.toFixed(1)} g</span>
          <span>K {macros.carbsGrams.toFixed(1)} g</span>
          <span>F {macros.fatGrams.toFixed(1)} g</span>
          {isFreeText && <span className="italic">(AI-uppskattning)</span>}
        </div>
      )}
      {isFreeText && !hasMacros && (
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-xs text-amber-600 dark:text-amber-400">
            Välj från listan eller låt AI uppskatta.
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={handleEstimate}
            disabled={estimating || row.grams <= 0}
          >
            {estimating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            {estimating ? 'Uppskattar…' : 'Uppskatta med AI'}
          </Button>
        </div>
      )}
      {estimateError && (
        <div className="text-xs text-red-500 px-1">{estimateError}</div>
      )}
    </div>
  )
}

export function ingredientRowsToApiItems(rows: IngredientRow[]) {
  return rows
    .filter((r) => r.name.trim().length > 0 && r.grams > 0)
    .map((r) => {
      const m = ingredientMacros(r)
      return {
        foodId: r.foodId,
        name: r.name.trim(),
        estimatedGrams: r.grams,
        calories: m.calories,
        proteinGrams: m.proteinGrams,
        carbsGrams: m.carbsGrams,
        fatGrams: m.fatGrams,
        fiberGrams: m.fiberGrams,
      }
    })
}

export interface ItemFromMeal {
  foodId?: string | null
  name: string
  estimatedGrams: number
  calories: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
  fiberGrams: number
}

// Hydrate ingredient rows from a meal's persisted items. We back-derive the
// per-100g cache so live editing of grams continues to update totals.
export function ingredientRowsFromItems(items: ItemFromMeal[]): IngredientRow[] {
  return items.map((it) => {
    const factor = it.estimatedGrams > 0 ? 100 / it.estimatedGrams : 0
    return {
      rowId: makeRowId(),
      foodId: it.foodId ?? undefined,
      name: it.name,
      grams: it.estimatedGrams,
      caloriesPer100g: it.calories * factor,
      proteinPer100g: it.proteinGrams * factor,
      carbsPer100g: it.carbsGrams * factor,
      fatPer100g: it.fatGrams * factor,
      fiberPer100g: it.fiberGrams * factor,
    }
  })
}
