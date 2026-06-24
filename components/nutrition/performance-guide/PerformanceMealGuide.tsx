'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { parseISO } from 'date-fns'
import {
  Apple,
  Beef,
  Camera,
  ChefHat,
  ChevronDown,
  Droplet,
  Dumbbell,
  Flame,
  Keyboard,
  ListChecks,
  Mic,
  Moon,
  RefreshCw,
  Send,
  Shuffle,
  SkipForward,
  Sparkles,
  Sunrise,
  TrendingDown,
  Undo2,
  Utensils,
  UtensilsCrossed,
  Wheat,
} from 'lucide-react'
import type { MealType } from '@prisma/client'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { Input } from '@/components/ui/input'
import { QuickMealLog } from '@/components/athlete/nutrition/QuickMealLog'
import { VoiceMealCapture } from '@/components/athlete/nutrition/VoiceMealCapture'
import { MealPortionFit } from './MealPortionFit'
import { useBasePath } from '@/lib/contexts/BasePathContext'
import { cn } from '@/lib/utils'
import { useLocale } from '@/i18n/client'

type MealPortionSummary = {
  items?: Array<{ name: string; amount: string; note?: string }>
  note?: string
}

type PlannedMeal = {
  id: string
  mealType: MealType
  time: string | null
  title: string
  description: string | null
  timingRole: string
  explanation: string | null
  portionSummary: MealPortionSummary
  caloriesKcal: number
  proteinG: number
  carbsG: number
  fatG: number
  recipeTitle: string | null
  recipeSummary: string | null
  recipeServings: number
  recipePrepMinutes: number | null
  recipeCookMinutes: number | null
  recipeIngredients: Array<{ name: string; amount: string; note?: string }> | null
  recipeSteps: string[] | null
  recipeTips: string[] | null
  recipeSource: string
  recipePrompt: string | null
  skipped: boolean
  redistributed?: boolean
  options: Array<{
    id: string
    title: string
    description: string | null
    portionSummary: MealPortionSummary
    caloriesKcal: number
    proteinG: number
    carbsG: number
    fatG: number
  }>
}

type ChartRow = {
  plannedMealId: string
  mealType: MealType
  time: string | null
  title: string
  planned: { caloriesKcal: number; proteinG: number; carbsG: number; fatG: number }
  eaten: { caloriesKcal: number; proteinG: number; carbsG: number; fatG: number }
  logCount: number
}

type GuideResponse = {
  plan: {
    id: string
    title: string
    startDate: string
    endDate: string
    contextSnapshot?: Record<string, unknown> | null
  }
  day: {
    id: string
    date: string
    dayType: string
    caloriesKcal: number
    proteinG: number
    carbsG: number
    fatG: number
    hydrationMl: number
    adaptationNotes: string | null
    meals: PlannedMeal[]
  }
  chart: ChartRow[]
}

interface PerformanceMealGuideProps {
  selectedDate: string
  isToday: boolean
}

const DAY_TYPE_LABELS: Record<string, { en: string; sv: string }> = {
  GAME: { en: 'Game day', sv: 'Matchdag' },
  PRACTICE: { en: 'Practice day', sv: 'Träningsdag' },
  HARD_PRACTICE: { en: 'Hard practice', sv: 'Hård träning' },
  DOUBLE: { en: 'Double day', sv: 'Dubbeldag' },
  REST: { en: 'Rest day', sv: 'Vilodag' },
  RECOVERY: { en: 'Recovery day', sv: 'Återhämtningsdag' },
  TRAVEL: { en: 'Travel day', sv: 'Resdag' },
}

// Colored pill treatment per day type so the guide reads its intent at a glance.
const DAY_TYPE_ACCENT: Record<string, string> = {
  GAME: 'border-red-400/40 bg-red-500/10 text-red-600 dark:text-red-300',
  PRACTICE: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  HARD_PRACTICE: 'border-orange-400/40 bg-orange-500/10 text-orange-600 dark:text-orange-300',
  DOUBLE: 'border-purple-400/40 bg-purple-500/10 text-purple-600 dark:text-purple-300',
  REST: 'border-sky-400/40 bg-sky-500/10 text-sky-600 dark:text-sky-300',
  RECOVERY: 'border-teal-400/40 bg-teal-500/10 text-teal-600 dark:text-teal-300',
  TRAVEL: 'border-slate-400/40 bg-slate-500/10 text-slate-600 dark:text-slate-300',
}

// Icon + accent per meal slot to give each row a recognizable identity.
const MEAL_TYPE_META: Record<MealType, { icon: typeof Flame; accent: string; bg: string }> = {
  BREAKFAST: { icon: Sunrise, accent: 'text-amber-500', bg: 'bg-amber-500/10' },
  MORNING_SNACK: { icon: Apple, accent: 'text-lime-500', bg: 'bg-lime-500/10' },
  LUNCH: { icon: UtensilsCrossed, accent: 'text-orange-500', bg: 'bg-orange-500/10' },
  AFTERNOON_SNACK: { icon: Apple, accent: 'text-lime-500', bg: 'bg-lime-500/10' },
  PRE_WORKOUT: { icon: Dumbbell, accent: 'text-sky-500', bg: 'bg-sky-500/10' },
  POST_WORKOUT: { icon: Dumbbell, accent: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  DINNER: { icon: UtensilsCrossed, accent: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  EVENING_SNACK: { icon: Moon, accent: 'text-violet-400', bg: 'bg-violet-500/10' },
}

const MACRO_GRADIENTS = {
  kcal: 'from-orange-400 to-orange-600',
  protein: 'from-red-400 to-rose-600',
  carbs: 'from-amber-300 to-amber-500',
  fat: 'from-cyan-400 to-cyan-600',
} as const

const SAVED_TEXT_SV: Record<string, string> = {
  'Performance Meal Guide': 'Måltidsguide för prestation',
  'Performance breakfast': 'Prestationsfrukost',
  'Morning protein snack': 'Proteinsnack på förmiddagen',
  'Balanced lunch': 'Balanserad lunch',
  'Training snack': 'Träningsmellanmål',
  'Recovery dinner': 'Återhämtningsmiddag',
  'Evening recovery snack': 'Kvällsmål för återhämtning',
  'Game-day breakfast': 'Matchdagsfrukost',
  'Light top-up': 'Lätt påfyllning',
  'Pre-game main meal': 'Huvudmål före match',
  'Pre-game snack': 'Mellanmål före match',
  'Post-game recovery': 'Återhämtning efter match',
  'Late recovery meal': 'Sent återhämtningsmål',
  'Protein breakfast': 'Proteinfrukost',
  'Light snack': 'Lätt mellanmål',
  'Lean lunch': 'Lättare lunch',
  'Recovery snack': 'Återhämtningsmellanmål',
  'Rest-day dinner': 'Vilodagsmiddag',
  'Evening protein': 'Kvällsprotein',
  'Oats, banana, yoghurt, whey': 'Havregryn, banan, yoghurt, vassle',
  'Eggs, bread, fruit, yoghurt': 'Ägg, bröd, frukt, yoghurt',
  'Banana, toast with honey, sports drink': 'Banan, toast med honung, sportdryck',
  'Rice cakes, jam, diluted sports drink': 'Riskakor, sylt, utspädd sportdryck',
  'Recovery shake, yoghurt, cereal, fruit': 'Återhämtningsshake, yoghurt, flingor, frukt',
  'Chocolate milk, quark, banana': 'Chokladmjölk, kvarg, banan',
  'Chicken, rice, vegetables': 'Kyckling, ris, grönsaker',
  'Salmon, potatoes, vegetables': 'Lax, potatis, grönsaker',
  'Lean beef, pasta, tomato sauce': 'Magert nötkött, pasta, tomatsås',
  'Rest-day breakfast keeps protein high while carbohydrates are calmer.': 'Vilodagsfrukosten håller proteinet högt medan kolhydraterna är lugnare.',
  'Small protein dose for satiety.': 'En liten proteindos för mättnad.',
  'A lean, nutrient-dense lunch is where the gentle deficit can live.': 'En lättare och näringstät lunch är där det milda underskottet kan ligga.',
  'Keep hunger stable without over-fueling a low-demand afternoon.': 'Håll hungern stabil utan att överfylla en lågintensiv eftermiddag.',
  'Dinner still includes carbohydrate so tomorrow starts well fueled.': 'Middagen innehåller fortfarande kolhydrater så att morgondagen börjar välfylld.',
  'Optional if the day is short on protein or hunger is high.': 'Valfritt om dagen saknar protein eller hungern är hög.',
  'vegetables / fruit': 'grönsaker / frukt',
  'quark / Greek yoghurt': 'kvarg / grekisk yoghurt',
  'kvarg / Greek yoghurt': 'kvarg / grekisk yoghurt',
  'whey or recovery yoghurt': 'vassle eller återhämtningsyoghurt',
  'chicken, fish, eggs, or lean beef': 'kyckling, fisk, ägg eller magert nötkött',
  'rice, pasta, potatoes, bread, banana, or sports drink': 'ris, pasta, potatis, bröd, banan eller sportdryck',
  'potatoes, oats, fruit, berries, or whole-grain bread': 'potatis, havregryn, frukt, bär eller fullkornsbröd',
  'rice, pasta, potatoes, oats, or bread': 'ris, pasta, potatis, havregryn eller bröd',
  'small amount of olive oil or avocado': 'liten mängd olivolja eller avokado',
  'olive oil, avocado, nuts, eggs, or salmon': 'olivolja, avokado, nötter, ägg eller lax',
}

function text(locale: string, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function localizeSavedText(locale: string, value: string): string {
  if (locale !== 'sv') return value
  const exact = SAVED_TEXT_SV[value]
  if (exact) return exact

  const weightTrend = /^Weight is trending down ([\d.]+) kg\/week, so the deficit is softened\.$/.exec(value)
  if (weightTrend) return `Vikten går ned ${weightTrend[1]} kg/vecka, så underskottet mildras.`

  return value
    .replace(/\bg carbohydrates\b/g, 'g kolhydrater')
    .replace(/\bg fat\b/g, 'g fett')
    .replace('small, low-fiber portion', 'liten portion med låg fiberhalt')
    .replace('1-2 fists', '1-2 nävar')
    .replace('kcal target', 'kcal mål')
    .replace('macro target', 'makromål')
}

function pct(current: number, target: number): number {
  if (target <= 0) return 0
  return Math.min(100, Math.round((current / target) * 100))
}

function metricValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function MacroBar({ label, eaten, planned, gradient }: { label: string; eaten: number; planned: number; gradient: string }) {
  const filled = pct(eaten, planned)
  return (
    <div className="min-w-0 space-y-1">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="truncate text-slate-500 dark:text-slate-400">{label}</span>
        <span className="shrink-0 font-medium tabular-nums text-slate-700 dark:text-slate-300">
          {metricValue(eaten)} / {metricValue(planned)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/10">
        <div
          className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-500 ease-out', gradient)}
          style={{ width: `${filled}%` }}
        />
      </div>
    </div>
  )
}

function MacroChip({
  icon: Icon,
  value,
  label,
  accent,
}: {
  icon: typeof Flame
  value: string
  label: string
  accent: string
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-xs font-medium shadow-sm ring-1 ring-slate-200/70 dark:bg-white/5 dark:ring-white/10">
      <Icon className={cn('h-3.5 w-3.5', accent)} />
      <span className="tabular-nums text-slate-800 dark:text-slate-100">{value}</span>
      <span className="text-slate-400 dark:text-slate-500">{label}</span>
    </span>
  )
}

function PortionList({ portionSummary, locale }: { portionSummary: MealPortionSummary; locale: string }) {
  const items = portionSummary?.items ?? []
  if (items.length === 0) return null

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {items.map((item, index) => (
        <div key={`${item.name}-${index}`} className="rounded-md bg-slate-100 px-3 py-2 text-xs dark:bg-white/5">
          <span className="font-medium text-slate-800 dark:text-slate-200">{localizeSavedText(locale, item.name)}</span>
          <span className="ml-1 text-slate-500 dark:text-slate-400">{localizeSavedText(locale, item.amount)}</span>
        </div>
      ))}
    </div>
  )
}

export function PerformanceMealGuide({ selectedDate, isToday }: PerformanceMealGuideProps) {
  const locale = useLocale()
  const basePath = useBasePath()
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [quickLog, setQuickLog] = useState<{ mealType: MealType; tab: 'text' | 'ingredients' } | null>(null)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [recipePrompts, setRecipePrompts] = useState<Record<string, string>>({})
  const [generatingRecipeId, setGeneratingRecipeId] = useState<string | null>(null)
  const [skipToggleId, setSkipToggleId] = useState<string | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const guideUrl = selectedDate
    ? `/api/nutrition/performance-plan/current?date=${selectedDate}&uiLocale=${locale}`
    : null
  const {
    data: guideData,
    error: guideError,
    isLoading,
    mutate,
  } = useSWR<GuideResponse | null>(guideUrl, async (url: string) => {
    const res = await fetch(url)
    if (res.status === 404) return null
    if (!res.ok) throw new Error(text(locale, 'Could not load meal guide', 'Kunde inte hämta meal guide'))
    const json = await res.json()
    return json.guide
  })
  const guide = guideData ?? null
  const error = generationError ?? (guideError instanceof Error ? guideError.message : null)

  const generateGuide = useCallback(async () => {
    if (!selectedDate) return
    setIsGenerating(true)
    setGenerationError(null)
    try {
      const res = await fetch('/api/nutrition/performance-plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: selectedDate }),
      })
      if (!res.ok) throw new Error(text(locale, 'Could not generate meal guide', 'Kunde inte skapa meal guide'))
      const json = await res.json()
      await mutate(json.guide, { revalidate: false })
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : text(locale, 'Could not generate meal guide', 'Kunde inte skapa meal guide'))
    } finally {
      setIsGenerating(false)
    }
  }, [locale, mutate, selectedDate])

  useEffect(() => {
    const handler = () => void mutate()
    window.addEventListener('meal-logged', handler)
    window.addEventListener('body-composition-saved', handler)
    return () => {
      window.removeEventListener('meal-logged', handler)
      window.removeEventListener('body-composition-saved', handler)
    }
  }, [mutate])

  const selectedDateObj = useMemo(() => parseISO(selectedDate), [selectedDate])
  const dayLabel = guide ? DAY_TYPE_LABELS[guide.day.dayType]?.[locale === 'sv' ? 'sv' : 'en'] ?? guide.day.dayType : ''

  const handleMealSaved = () => {
    window.dispatchEvent(new CustomEvent('meal-logged'))
    void mutate()
  }

  const generateRecipe = useCallback(async (mealId: string, mode: 'SURPRISE' | 'PREFERENCE') => {
    const preference = recipePrompts[mealId]?.trim()
    setGeneratingRecipeId(mealId)
    setGenerationError(null)
    try {
      const res = await fetch(`/api/nutrition/planned-meals/${mealId}/recipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          preference: mode === 'PREFERENCE' ? preference : undefined,
        }),
      })
      if (!res.ok) throw new Error(text(locale, 'Could not create recipe', 'Kunde inte skapa recept'))
      await mutate()
      if (mode === 'PREFERENCE') {
        setRecipePrompts((prev) => ({ ...prev, [mealId]: '' }))
      }
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : text(locale, 'Could not create recipe', 'Kunde inte skapa recept'))
    } finally {
      setGeneratingRecipeId(null)
    }
  }, [locale, mutate, recipePrompts])

  const toggleSkip = useCallback(async (mealId: string, skipped: boolean) => {
    setSkipToggleId(mealId)
    setGenerationError(null)
    try {
      const res = await fetch(`/api/nutrition/planned-meals/${mealId}/skip`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skipped }),
      })
      if (!res.ok) throw new Error(text(locale, 'Could not update the meal', 'Kunde inte uppdatera måltiden'))
      await mutate()
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : text(locale, 'Could not update the meal', 'Kunde inte uppdatera måltiden'))
    } finally {
      setSkipToggleId(null)
    }
  }, [locale, mutate])

  if (isLoading) {
    return (
      <GlassCard>
        <GlassCardContent className="p-5">
          <div className="h-28 animate-pulse rounded-lg bg-slate-100 dark:bg-white/5" />
        </GlassCardContent>
      </GlassCard>
    )
  }

  return (
    <>
      <GlassCard gradient glow="emerald" className="group">
        {/* Accent ribbon to lift the header out of the flat dark surface */}
        <div className="h-1 w-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />
        <GlassCardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <GlassCardTitle className="text-base text-slate-900 dark:text-white">
                    {text(locale, 'Performance Meal Guide', 'Måltidsguide för prestation')}
                  </GlassCardTitle>
                  {guide && dayLabel && (
                    <span
                      className={cn(
                        'mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
                        DAY_TYPE_ACCENT[guide.day.dayType] ?? 'border-slate-400/40 bg-slate-500/10 text-slate-600 dark:text-slate-300'
                      )}
                    >
                      {dayLabel}
                    </span>
                  )}
                </div>
              </div>
              {guide && (
                <div className="flex flex-wrap items-center gap-2">
                  <MacroChip icon={Flame} value={`${guide.day.caloriesKcal}`} label="kcal" accent="text-orange-500" />
                  <MacroChip icon={Beef} value={`${guide.day.proteinG}g`} label={text(locale, 'protein', 'protein')} accent="text-red-500" />
                  <MacroChip icon={Wheat} value={`${guide.day.carbsG}g`} label={text(locale, 'carbs', 'kolh.')} accent="text-amber-500" />
                  <MacroChip icon={Droplet} value={`${guide.day.fatG}g`} label={text(locale, 'fat', 'fett')} accent="text-cyan-500" />
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={generateGuide}
                disabled={isGenerating}
                className="gap-2"
              >
                <RefreshCw className={cn('h-4 w-4', isGenerating && 'animate-spin')} />
                {guide ? text(locale, 'Refresh', 'Uppdatera') : text(locale, 'Generate', 'Skapa')}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setIsCollapsed((prev) => !prev)}
                aria-expanded={!isCollapsed}
                aria-label={
                  isCollapsed
                    ? text(locale, 'Expand meal guide', 'Visa måltidsguide')
                    : text(locale, 'Collapse meal guide', 'Minimera måltidsguide')
                }
                className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                <ChevronDown className={cn('h-5 w-5 transition-transform', isCollapsed && '-rotate-90')} />
              </Button>
            </div>
          </div>
        </GlassCardHeader>
        {!isCollapsed && (
        <GlassCardContent className="space-y-5">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </div>
          )}

          {!guide ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-gradient-to-b from-slate-50/50 to-transparent px-4 py-10 text-center dark:border-white/10 dark:from-white/[0.03]">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400/20 to-teal-500/10 text-emerald-500">
                <Utensils className="h-7 w-7" />
              </span>
              <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
                {text(locale, 'No performance meal guide is ready for this week yet.', 'Ingen Performance Meal Guide är klar för den här veckan ännu.')}
              </p>
              <Button type="button" onClick={generateGuide} disabled={isGenerating} className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700">
                <Sparkles className="h-4 w-4" />
                {isGenerating ? text(locale, 'Generating', 'Skapar') : text(locale, 'Generate guide', 'Skapa guide')}
              </Button>
            </div>
          ) : (
            <>
              {guide.day.adaptationNotes && (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-300/50 bg-gradient-to-r from-amber-50 to-orange-50/40 px-3.5 py-2.5 text-sm text-amber-900 dark:border-amber-500/20 dark:from-amber-500/10 dark:to-orange-500/5 dark:text-amber-100">
                  <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <span>{localizeSavedText(locale, guide.day.adaptationNotes)}</span>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <ListChecks className="h-4 w-4 text-emerald-500" />
                  {text(locale, 'Planned vs eaten', 'Planerat vs ätet')}
                </div>
                <div className="space-y-3">
                  {guide.chart.map((row) => {
                    const meta = MEAL_TYPE_META[row.mealType] ?? { icon: Utensils, accent: 'text-slate-400', bg: 'bg-slate-400/10' }
                    const MealIcon = meta.icon
                    return (
                      <div
                        key={row.plannedMealId}
                        className="rounded-xl border border-slate-200/80 bg-white/50 p-3.5 transition-all duration-200 hover:border-emerald-300/60 hover:shadow-md hover:shadow-emerald-500/5 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-emerald-400/30 dark:hover:bg-white/[0.06]"
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', meta.bg)}>
                              <MealIcon className={cn('h-4 w-4', meta.accent)} />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{row.time ? `${row.time} · ` : ''}{localizeSavedText(locale, row.title)}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{row.logCount} {text(locale, 'logged', 'registrerade')}</p>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                              {row.eaten.caloriesKcal}
                              <span className="text-slate-400 dark:text-slate-500"> / {row.planned.caloriesKcal}</span>
                            </span>
                            <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">kcal</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-4">
                          <MacroBar label="kcal" eaten={row.eaten.caloriesKcal} planned={row.planned.caloriesKcal} gradient={MACRO_GRADIENTS.kcal} />
                          <MacroBar label={text(locale, 'protein', 'protein')} eaten={row.eaten.proteinG} planned={row.planned.proteinG} gradient={MACRO_GRADIENTS.protein} />
                          <MacroBar label={text(locale, 'carbs', 'kolh.')} eaten={row.eaten.carbsG} planned={row.planned.carbsG} gradient={MACRO_GRADIENTS.carbs} />
                          <MacroBar label={text(locale, 'fat', 'fett')} eaten={row.eaten.fatG} planned={row.planned.fatG} gradient={MACRO_GRADIENTS.fat} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <ChefHat className="h-4 w-4 text-emerald-500" />
                  {text(locale, 'Meals & recipes', 'Måltider & recept')}
                </div>
                {guide.day.meals.map((meal) => {
                  const meta = MEAL_TYPE_META[meal.mealType] ?? { icon: Utensils, accent: 'text-slate-400', bg: 'bg-slate-400/10' }
                  const MealIcon = meta.icon
                  if (meal.skipped) {
                    return (
                      <div key={meal.id} className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300/70 bg-slate-50/40 p-4 opacity-70 dark:border-white/10 dark:bg-white/[0.02]">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-400/10">
                            <MealIcon className="h-4 w-4 text-slate-400" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-500 line-through dark:text-slate-400">
                              {meal.time ? `${meal.time} · ` : ''}{localizeSavedText(locale, meal.title)}
                            </p>
                            <p className="text-xs text-slate-400">
                              {text(locale, 'Skipped — macros moved to your other meals', 'Överhoppad — makros flyttade till dina andra måltider')}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="shrink-0 gap-1.5"
                          disabled={skipToggleId === meal.id}
                          onClick={() => void toggleSkip(meal.id, false)}
                        >
                          <Undo2 className="h-3.5 w-3.5" />
                          {text(locale, 'Undo', 'Ångra')}
                        </Button>
                      </div>
                    )
                  }
                  return (
                  <div key={meal.id} className="rounded-xl border border-slate-200/80 bg-white/40 p-4 transition-colors hover:border-emerald-300/50 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-emerald-400/20">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex items-start gap-3">
                          <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', meta.bg)}>
                            <MealIcon className={cn('h-4 w-4', meta.accent)} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                              {meal.time ? `${meal.time} · ` : ''}{localizeSavedText(locale, meal.title)}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {meal.caloriesKcal} kcal · {Math.round(meal.proteinG)}P / {Math.round(meal.carbsG)}C / {Math.round(meal.fatG)}F
                            </p>
                            {meal.redistributed && (
                              <span className="mt-0.5 inline-block text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                {text(locale, 'Boosted to cover a skipped meal', 'Utökad för att täcka en överhoppad måltid')}
                              </span>
                            )}
                          </div>
                        </div>
                        {meal.explanation && <p className="text-sm text-slate-600 dark:text-slate-400">{localizeSavedText(locale, meal.explanation)}</p>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {isToday && (
                          <>
                            <Button asChild size="sm" variant="outline" className="gap-1.5">
                              <Link href={`${basePath}/athlete/nutrition/scan?returnTo=nutrition`}>
                                <Camera className="h-3.5 w-3.5" />
                                {text(locale, 'Photo', 'Foto')}
                              </Link>
                            </Button>
                            <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setQuickLog({ mealType: meal.mealType, tab: 'text' })}>
                              <Keyboard className="h-3.5 w-3.5" />
                              {text(locale, 'Text', 'Text')}
                            </Button>
                            <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setQuickLog({ mealType: meal.mealType, tab: 'ingredients' })}>
                              <Utensils className="h-3.5 w-3.5" />
                              {text(locale, 'Food', 'Mat')}
                            </Button>
                            <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setVoiceOpen(true)}>
                              <Mic className="h-3.5 w-3.5" />
                              {text(locale, 'Voice', 'Röst')}
                            </Button>
                          </>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="gap-1.5 text-slate-500 dark:text-slate-400"
                          disabled={skipToggleId === meal.id}
                          onClick={() => void toggleSkip(meal.id, true)}
                        >
                          <SkipForward className="h-3.5 w-3.5" />
                          {text(locale, 'Skip', 'Hoppa över')}
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3">
                      <PortionList portionSummary={meal.portionSummary} locale={locale} />
                    </div>
                    <div className="mt-4 space-y-3 rounded-md bg-slate-50 p-3 dark:bg-white/5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                            <ChefHat className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                            <span className="truncate">
                              {meal.recipeTitle
                                ? localizeSavedText(locale, meal.recipeTitle)
                                : text(locale, 'Recipe suggestion', 'Receptförslag')}
                            </span>
                          </div>
                          {(meal.recipePrepMinutes != null || meal.recipeCookMinutes != null || meal.recipeServings) && (
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {meal.recipeServings ? `${meal.recipeServings} ${text(locale, 'serving', 'portion')}` : ''}
                              {meal.recipePrepMinutes != null ? ` · ${text(locale, 'prep', 'prep')} ${meal.recipePrepMinutes} min` : ''}
                              {meal.recipeCookMinutes != null ? ` · ${text(locale, 'cook', 'tillagning')} ${meal.recipeCookMinutes} min` : ''}
                            </p>
                          )}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          disabled={generatingRecipeId === meal.id}
                          onClick={() => void generateRecipe(meal.id, 'SURPRISE')}
                        >
                          <Shuffle className={cn('h-3.5 w-3.5', generatingRecipeId === meal.id && 'animate-spin')} />
                          {text(locale, 'Surprise me', 'Överraska mig')}
                        </Button>
                      </div>

                      {meal.recipeSummary && (
                        <p className="text-sm text-slate-600 dark:text-slate-300">{localizeSavedText(locale, meal.recipeSummary)}</p>
                      )}

                      {meal.recipeIngredients && meal.recipeIngredients.length > 0 && (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              {text(locale, 'Ingredients', 'Ingredienser')}
                            </p>
                            <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
                              {meal.recipeIngredients.map((ingredient, index) => (
                                <li key={`${ingredient.name}-${index}`} className="flex justify-between gap-3">
                                  <span>{localizeSavedText(locale, ingredient.name)}</span>
                                  <span className="shrink-0 font-medium">{localizeSavedText(locale, ingredient.amount)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          {meal.recipeSteps && meal.recipeSteps.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                {text(locale, 'Steps', 'Gör så här')}
                              </p>
                              <ol className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
                                {meal.recipeSteps.map((step, index) => (
                                  <li key={`${step}-${index}`} className="flex gap-2">
                                    <span className="shrink-0 text-slate-400">{index + 1}.</span>
                                    <span>{localizeSavedText(locale, step)}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}
                        </div>
                      )}

                      {meal.recipeTips && meal.recipeTips.length > 0 && (
                        <div className="text-xs text-emerald-700 dark:text-emerald-200">
                          {meal.recipeTips.map((tip) => localizeSavedText(locale, tip)).join(' ')}
                        </div>
                      )}

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          value={recipePrompts[meal.id] ?? ''}
                          onChange={(event) => setRecipePrompts((prev) => ({ ...prev, [meal.id]: event.target.value }))}
                          placeholder={text(locale, 'I want chicken today', 'Jag vill äta kyckling idag')}
                          className="h-9"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="gap-1.5"
                          disabled={generatingRecipeId === meal.id || !(recipePrompts[meal.id]?.trim())}
                          onClick={() => void generateRecipe(meal.id, 'PREFERENCE')}
                        >
                          <Send className="h-3.5 w-3.5" />
                          {text(locale, 'Create', 'Skapa')}
                        </Button>
                      </div>
                    </div>
                    <MealPortionFit
                      plannedMealId={meal.id}
                      mealType={meal.mealType}
                      time={meal.time}
                      date={selectedDate}
                      isToday={isToday}
                    />
                    {meal.options.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {meal.options.slice(0, 2).map((option) => (
                          <span key={option.id} className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
                            {localizeSavedText(locale, option.title)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  )
                })}
              </div>
            </>
          )}
        </GlassCardContent>
        )}
      </GlassCard>

      {quickLog && (
        <QuickMealLog
          open={!!quickLog}
          onClose={() => setQuickLog(null)}
          onMealSaved={handleMealSaved}
          date={selectedDateObj}
          defaultMealType={quickLog.mealType}
          defaultTab={quickLog.tab}
        />
      )}

      <Dialog open={voiceOpen} onOpenChange={setVoiceOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{text(locale, 'Voice meal capture', 'Röstregistrering')}</DialogTitle>
          </DialogHeader>
          <VoiceMealCapture
            onMealSaved={handleMealSaved}
            onClose={() => setVoiceOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
