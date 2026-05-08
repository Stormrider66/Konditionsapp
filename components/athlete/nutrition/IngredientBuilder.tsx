'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { BookOpen, Camera, Plus, Save, Sparkles, Trash2, Loader2 } from 'lucide-react'
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
  scanRequestKey?: number
}

interface RecipeScanIngredient {
  name: string
  grams: number
  food: FoodOption | null
}

type RecipeSource = 'MANUAL' | 'SCAN' | 'MEAL_COPY'
type RecipeAmountUnit = 'g' | 'st' | 'portion' | 'ml' | 'dl'

interface SavedRecipeIngredient {
  id: string
  foodId?: string | null
  name: string
  category?: string | null
  grams: number
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  fiberPer100g: number
}

interface SavedRecipe {
  id: string
  name: string
  description?: string | null
  baseServings: number
  source: RecipeSource | string
  updatedAt: string
  items: SavedRecipeIngredient[]
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

function makeSuggestedRecipeName(rows: IngredientRow[]): string {
  const names = rows
    .map((row) => row.name.trim())
    .filter(Boolean)
    .slice(0, 3)
  if (names.length === 0) return ''
  const name = names.join(', ')
  return name.length > 80 ? `${name.slice(0, 77)}...` : name
}

function parsePositiveNumber(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function ingredientRowsToRecipeItems(rows: IngredientRow[]) {
  return rows
    .filter((row) => row.name.trim().length > 0 && row.grams > 0)
    .map((row) => ({
      foodId: row.foodId,
      name: row.name.trim(),
      grams: row.grams,
      caloriesPer100g: row.caloriesPer100g ?? 0,
      proteinPer100g: row.proteinPer100g ?? 0,
      carbsPer100g: row.carbsPer100g ?? 0,
      fatPer100g: row.fatPer100g ?? 0,
      fiberPer100g: row.fiberPer100g ?? 0,
    }))
}

function savedRecipeTotals(recipe: SavedRecipe): IngredientTotals {
  return recipe.items.reduce<IngredientTotals>(
    (acc, item) => {
      const factor = item.grams / 100
      return {
        calories: acc.calories + item.caloriesPer100g * factor,
        proteinGrams: acc.proteinGrams + item.proteinPer100g * factor,
        carbsGrams: acc.carbsGrams + item.carbsPer100g * factor,
        fatGrams: acc.fatGrams + item.fatPer100g * factor,
        fiberGrams: acc.fiberGrams + item.fiberPer100g * factor,
      }
    },
    { calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0, fiberGrams: 0 }
  )
}

function savedRecipeTotalGrams(recipe: SavedRecipe): number {
  return recipe.items.reduce((sum, item) => sum + item.grams, 0)
}

function recipeAmountToScaleFactor(
  recipe: SavedRecipe,
  amount: number,
  unit: RecipeAmountUnit,
  pieceGrams = 0
): number {
  const baseServings = recipe.baseServings > 0 ? recipe.baseServings : 1
  if (unit === 'portion') return amount / baseServings

  const totalGrams = savedRecipeTotalGrams(recipe)
  if (totalGrams <= 0) return 0

  const grams =
    unit === 'dl'
      ? amount * 100
      : unit === 'st'
        ? amount * pieceGrams
      : amount

  return grams / totalGrams
}

function recipeToIngredientRows(
  recipe: SavedRecipe,
  amount: number,
  unit: RecipeAmountUnit,
  pieceGrams = 0
): IngredientRow[] {
  const factor = recipeAmountToScaleFactor(recipe, amount, unit, pieceGrams)
  return recipe.items.map((item) => ({
    rowId: makeRowId(),
    foodId: item.foodId ?? undefined,
    name: item.name,
    grams: Math.round(item.grams * factor * 10) / 10,
    caloriesPer100g: item.caloriesPer100g,
    proteinPer100g: item.proteinPer100g,
    carbsPer100g: item.carbsPer100g,
    fatPer100g: item.fatPer100g,
    fiberPer100g: item.fiberPer100g,
  }))
}

function inferRecipeAmountUnit(recipe: SavedRecipe): RecipeAmountUnit {
  const name = recipe.name.toLowerCase()
  if (/\b(mjölk|dryck|juice|smoothie|shake|soppa|sås|buljong|kaffe|te)\b/i.test(name)) {
    return 'dl'
  }
  if (/\b(bröd|fralla|frallor|bulle|bullar|muffin|muffins|kaka|kakor|knäcke|bars?)\b/i.test(name)) {
    return 'st'
  }
  return 'g'
}

function defaultRecipeAmount(recipe: SavedRecipe, unit: RecipeAmountUnit): string {
  if (unit === 'dl') return '2'
  if (unit === 'ml') return '200'
  if (unit === 'g') return '100'
  if (unit === 'st') return '1'
  return String(recipe.baseServings || 1)
}

function defaultPieceGrams(recipe: SavedRecipe): string {
  const totalGrams = savedRecipeTotalGrams(recipe)
  const baseServings = recipe.baseServings > 1 ? recipe.baseServings : 0
  if (baseServings > 0 && totalGrams > 0) return String(Math.round(totalGrams / baseServings))
  return ''
}

function formatRecipeAmount(amount: number, unit: RecipeAmountUnit, pieceGrams = 0): string {
  if (unit === 'st') {
    const weight = pieceGrams > 0 ? ` á ${formatGramsForDisplay(pieceGrams)} g` : ''
    return `${formatGramsForDisplay(amount)} st${weight}`
  }
  if (unit === 'portion') return `${amount} portion`
  return `${formatGramsForDisplay(amount)} ${unit}`
}

function formatGramsForDisplay(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

export function IngredientBuilder({ value, onChange, scanRequestKey = 0 }: IngredientBuilderProps) {
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
  const [lastRecipeSource, setLastRecipeSource] = useState<RecipeSource>('MANUAL')
  const [recipes, setRecipes] = useState<SavedRecipe[]>([])
  const [recipesLoaded, setRecipesLoaded] = useState(false)
  const [recipesOpen, setRecipesOpen] = useState(false)
  const [loadingRecipes, setLoadingRecipes] = useState(false)
  const [recipeError, setRecipeError] = useState<string | null>(null)
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)
  const [recipeAmount, setRecipeAmount] = useState('1')
  const [recipeAmountUnit, setRecipeAmountUnit] = useState<RecipeAmountUnit>('g')
  const [recipePieceGrams, setRecipePieceGrams] = useState('')
  const [saveOpen, setSaveOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [savingRecipe, setSavingRecipe] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  useEffect(() => {
    if (scanRequestKey > 0) fileInputRef.current?.click()
  }, [scanRequestKey])

  const updateRow = (rowId: string, patch: Partial<IngredientRow>) => {
    onChange(value.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)))
  }
  const removeRow = (rowId: string) => {
    onChange(value.filter((r) => r.rowId !== rowId))
  }

  const loadRecipes = async () => {
    if (loadingRecipes) return
    setRecipeError(null)
    setLoadingRecipes(true)
    try {
      const res = await fetch('/api/nutrition/recipes')
      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(payload?.error || 'Kunde inte hämta recept')
      }
      setRecipes((payload?.data ?? []) as SavedRecipe[])
      setRecipesLoaded(true)
    } catch (err) {
      setRecipeError(err instanceof Error ? err.message : 'Kunde inte hämta recept')
    } finally {
      setLoadingRecipes(false)
    }
  }

  const toggleRecipes = () => {
    const nextOpen = !recipesOpen
    setRecipesOpen(nextOpen)
    setSaveOpen(false)
    if (nextOpen && !recipesLoaded) void loadRecipes()
  }

  const openSaveRecipe = () => {
    setSaveError(null)
    setSaveMessage(null)
    setSaveName((current) => current || makeSuggestedRecipeName(value))
    setSaveOpen(true)
    setRecipesOpen(false)
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
      const existing = value.filter((r) => r.name.trim().length > 0)
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
      if (typeof payload?.title === 'string' && payload.title.trim()) {
        setSaveName(payload.title.trim().slice(0, 80))
      }
      setLastRecipeSource('SCAN')
      setRecipesOpen(false)
      setSaveOpen(true)
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Kunde inte tolka receptet')
    } finally {
      setScanning(false)
      // Reset the input so picking the same file twice still triggers onChange.
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const saveRecipe = async () => {
    const items = ingredientRowsToRecipeItems(value)
    const name = saveName.trim()
    if (!name || items.length === 0) return
    setSaveError(null)
    setSaveMessage(null)
    setSavingRecipe(true)
    try {
      const res = await fetch('/api/nutrition/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          baseServings: 1,
          source: lastRecipeSource,
          items,
        }),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(payload?.error || 'Kunde inte spara recept')
      }
      const recipe = payload?.data as SavedRecipe
      setRecipes((prev) => [recipe, ...prev.filter((r) => r.id !== recipe.id)])
      setRecipesLoaded(true)
      setSaveOpen(false)
      setSaveName('')
      const unit = inferRecipeAmountUnit(recipe)
      setSelectedRecipeId(recipe.id)
      setRecipeAmountUnit(unit)
      setRecipeAmount(defaultRecipeAmount(recipe, unit))
      setRecipePieceGrams(defaultPieceGrams(recipe))
      setRecipesOpen(true)
      onChange([makeRow()])
      setSaveMessage('Receptet sparades. Välj hur mycket du åt innan du loggar måltiden.')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Kunde inte spara recept')
    } finally {
      setSavingRecipe(false)
    }
  }

  const applySelectedRecipe = () => {
    const recipe = recipes.find((r) => r.id === selectedRecipeId)
    if (!recipe) return
    const amount = parsePositiveNumber(recipeAmount, 1)
    const pieceGrams = recipeAmountUnit === 'st' ? parsePositiveNumber(recipePieceGrams, 0) : 0
    if (recipeAmountUnit === 'st' && pieceGrams <= 0) {
      setRecipeError('Ange gram per styck för att använda receptet.')
      return
    }
    const newRows = recipeToIngredientRows(recipe, amount, recipeAmountUnit, pieceGrams)
    const existing = value.filter((r) => r.name.trim().length > 0)
    onChange([...existing, ...newRows])
    setRecipesOpen(false)
    setSaveMessage(`${recipe.name} (${formatRecipeAmount(amount, recipeAmountUnit, pieceGrams)}) lades till.`)
  }

  const deleteRecipe = async (recipeId: string) => {
    setRecipeError(null)
    try {
      const res = await fetch(`/api/nutrition/recipes/${recipeId}`, { method: 'DELETE' })
      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(payload?.error || 'Kunde inte ta bort recept')
      }
      setRecipes((prev) => prev.filter((recipe) => recipe.id !== recipeId))
      setSelectedRecipeId((current) => (current === recipeId ? null : current))
    } catch (err) {
      setRecipeError(err instanceof Error ? err.message : 'Kunde inte ta bort recept')
    }
  }

  const hasRowsToSave = value.some((row) => row.name.trim().length > 0 && row.grams > 0)
  const selectedRecipe = recipes.find((recipe) => recipe.id === selectedRecipeId)

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

      <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-w-0 gap-2 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700"
          onClick={() => onChange([...value, makeRow()])}
        >
          <Plus className="h-4 w-4" />
          Lägg till
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-w-0 gap-2 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700"
          onClick={toggleRecipes}
        >
          {loadingRecipes ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
          Mina recept
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-w-0 gap-2 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700"
          onClick={() => fileInputRef.current?.click()}
          disabled={scanning}
        >
          {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          {scanning ? 'Läser receptet…' : 'Ladda upp receptbild'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-w-0 gap-2 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700"
          onClick={openSaveRecipe}
          disabled={!hasRowsToSave || savingRecipe}
        >
          {savingRecipe ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Spara recept
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

      {saveOpen && (
        <div className="min-w-0 rounded-lg border border-border dark:border-slate-700 bg-muted/30 dark:bg-slate-900/40 p-3 space-y-2">
          <div className="text-xs font-medium text-foreground dark:text-slate-100">Spara som recept</div>
          <Input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Namn på recept"
            maxLength={80}
            className="dark:text-white dark:placeholder:text-slate-500"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              className="flex-1"
              onClick={saveRecipe}
              disabled={savingRecipe || saveName.trim().length < 2}
            >
              {savingRecipe ? 'Sparar…' : 'Spara'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 dark:text-slate-200 dark:border-slate-600"
              onClick={() => setSaveOpen(false)}
            >
              Avbryt
            </Button>
          </div>
          {saveError && <div className="text-xs text-red-500">{saveError}</div>}
        </div>
      )}

      {recipesOpen && (
        <div className="rounded-lg border border-border dark:border-slate-700 bg-muted/30 dark:bg-slate-900/40 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-medium text-foreground dark:text-slate-100">Sparade recept</div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => void loadRecipes()}
              disabled={loadingRecipes}
            >
              {loadingRecipes ? 'Hämtar…' : 'Uppdatera'}
            </Button>
          </div>

          {recipeError && <div className="text-xs text-red-500">{recipeError}</div>}
          {!recipeError && recipesLoaded && recipes.length === 0 && (
            <div className="text-xs text-muted-foreground">Inga sparade recept ännu.</div>
          )}

          <div className="space-y-1.5 max-h-56 overflow-y-auto overflow-x-hidden overscroll-contain">
            {recipes.map((recipe) => {
              const recipeTotals = savedRecipeTotals(recipe)
              const recipeTotalGrams = savedRecipeTotalGrams(recipe)
              const isSelected = selectedRecipeId === recipe.id
              const selectedAmount = parsePositiveNumber(recipeAmount, 1)
              const selectedPieceGrams = recipeAmountUnit === 'st' ? parsePositiveNumber(recipePieceGrams, 0) : 0
              const selectedFactor = isSelected
                ? recipeAmountToScaleFactor(recipe, selectedAmount, recipeAmountUnit, selectedPieceGrams)
                : 1
              return (
                <div key={recipe.id} className="min-w-0 rounded-md border border-border/70 dark:border-slate-700 bg-background/70 dark:bg-slate-950/40">
                  <div className="flex items-stretch gap-1">
                    <button
                      type="button"
                      className={cn(
                        'min-w-0 flex-1 px-3 py-2 text-left text-sm rounded-l-md transition-colors',
                        isSelected
                          ? 'bg-primary/10 text-foreground dark:text-slate-100'
                          : 'hover:bg-accent dark:hover:bg-slate-800 dark:text-slate-200'
                      )}
                      onClick={() => {
                        const unit = inferRecipeAmountUnit(recipe)
                        setSelectedRecipeId(recipe.id)
                        setRecipeAmountUnit(unit)
                        setRecipeAmount(defaultRecipeAmount(recipe, unit))
                        setRecipePieceGrams(defaultPieceGrams(recipe))
                        setRecipeError(null)
                      }}
                    >
                      <div className="truncate font-medium">{recipe.name}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {Math.round(recipeTotals.calories)} kcal · P {recipeTotals.proteinGrams.toFixed(1)} · K{' '}
                        {recipeTotals.carbsGrams.toFixed(1)} · F {recipeTotals.fatGrams.toFixed(1)}
                        {recipeTotalGrams > 0 ? ` · ${Math.round(recipeTotalGrams)} g totalt` : ''}
                      </div>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-auto w-9 rounded-l-none"
                      onClick={() => void deleteRecipe(recipe.id)}
                      aria-label={`Ta bort ${recipe.name}`}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                  {isSelected && (
                    <div className="border-t border-border/60 dark:border-slate-700 p-2 space-y-2">
                      <div className="grid grid-cols-[minmax(0,1fr)_minmax(5.75rem,auto)] gap-2">
                        <div className="relative min-w-0">
                          <Input
                            type="number"
                            min="0.1"
                            step={recipeAmountUnit === 'portion' ? '0.25' : recipeAmountUnit === 'st' ? '0.5' : '1'}
                            value={recipeAmount}
                            onChange={(e) => setRecipeAmount(e.target.value)}
                            className="h-8 text-sm dark:text-white"
                            aria-label="Mängd att logga"
                          />
                        </div>
                        <select
                          value={recipeAmountUnit}
                          onChange={(e) => {
                            const unit = e.target.value as RecipeAmountUnit
                            setRecipeAmountUnit(unit)
                            setRecipeAmount((current) => current || defaultRecipeAmount(recipe, unit))
                            if (unit === 'st' && !recipePieceGrams) {
                              setRecipePieceGrams(defaultPieceGrams(recipe))
                            }
                            setRecipeError(null)
                          }}
                          className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                          aria-label="Enhet"
                        >
                          <option value="g">g</option>
                          <option value="st">st</option>
                          <option value="portion">portion</option>
                          <option value="ml">ml</option>
                          <option value="dl">dl</option>
                        </select>
                      </div>
                      {recipeAmountUnit === 'st' && (
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            inputMode="numeric"
                            value={recipePieceGrams}
                            onChange={(e) => {
                              setRecipePieceGrams(e.target.value)
                              setRecipeError(null)
                            }}
                            className="h-8 text-sm dark:text-white"
                            placeholder="Gram per styck"
                            aria-label="Gram per styck"
                          />
                          <span className="text-xs text-muted-foreground">g/st</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1 text-xs text-muted-foreground">
                          Loggar ca {Math.round(recipeTotals.calories * selectedFactor)} kcal från sparat recept
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          className="h-8"
                          onClick={applySelectedRecipe}
                          disabled={!selectedRecipe}
                        >
                          Använd
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {saveMessage && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
          {saveMessage}
        </div>
      )}

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
    <div ref={wrapperRef} className="rounded-lg border border-border dark:border-slate-700 p-2 space-y-2">
      <div className="flex gap-2 items-start">
        <div className="relative flex-1 min-w-0">
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

      {/* Results render inline (not as a floating popover) so they scroll
          naturally with the dialog body on mobile — no nested-scroll fight. */}
      {open && results.length > 0 && (
        <div className="rounded-md border border-border dark:border-slate-700 bg-popover dark:bg-slate-800 max-h-72 overflow-y-auto overscroll-contain">
          {results.map((food) => (
            <button
              key={food.id}
              type="button"
              onClick={() => pick(food)}
              className="block w-full text-left px-3 py-2 text-sm hover:bg-accent dark:hover:bg-slate-700 border-b border-border/50 dark:border-slate-700/60 last:border-b-0"
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
