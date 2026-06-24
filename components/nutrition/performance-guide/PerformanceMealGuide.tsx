'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { parseISO } from 'date-fns'
import { Camera, Keyboard, ListChecks, Mic, RefreshCw, Sparkles, Utensils } from 'lucide-react'
import type { MealType } from '@prisma/client'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { QuickMealLog } from '@/components/athlete/nutrition/QuickMealLog'
import { VoiceMealCapture } from '@/components/athlete/nutrition/VoiceMealCapture'
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

function MacroBar({ label, eaten, planned, color }: { label: string; eaten: number; planned: number; color: string }) {
  return (
    <div className="min-w-0 space-y-1">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="truncate text-slate-500 dark:text-slate-400">{label}</span>
        <span className="shrink-0 font-medium text-slate-700 dark:text-slate-300">
          {metricValue(eaten)} / {metricValue(planned)}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct(eaten, planned)}%` }} />
      </div>
    </div>
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
      <GlassCard>
        <GlassCardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <GlassCardTitle className="flex items-center gap-2 text-base text-emerald-700 dark:text-emerald-300">
                <Sparkles className="h-4 w-4" />
                {text(locale, 'Performance Meal Guide', 'Måltidsguide för prestation')}
              </GlassCardTitle>
              {guide && (
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {dayLabel} · {guide.day.caloriesKcal} kcal · {guide.day.proteinG}P / {guide.day.carbsG}C / {guide.day.fatG}F
                </p>
              )}
            </div>
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
          </div>
        </GlassCardHeader>
        <GlassCardContent className="space-y-5">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </div>
          )}

          {!guide ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center dark:border-white/10">
              <Utensils className="h-8 w-8 text-slate-400" />
              <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
                {text(locale, 'No performance meal guide is ready for this week yet.', 'Ingen Performance Meal Guide är klar för den här veckan ännu.')}
              </p>
              <Button type="button" onClick={generateGuide} disabled={isGenerating} className="gap-2">
                <Sparkles className="h-4 w-4" />
                {isGenerating ? text(locale, 'Generating', 'Skapar') : text(locale, 'Generate guide', 'Skapa guide')}
              </Button>
            </div>
          ) : (
            <>
              {guide.day.adaptationNotes && (
                <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-100">
                  {localizeSavedText(locale, guide.day.adaptationNotes)}
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <ListChecks className="h-4 w-4" />
                  {text(locale, 'Planned vs eaten', 'Planerat vs ätet')}
                </div>
                <div className="space-y-3">
                  {guide.chart.map((row) => (
                    <div key={row.plannedMealId} className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{row.time ? `${row.time} · ` : ''}{localizeSavedText(locale, row.title)}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{row.logCount} {text(locale, 'logged', 'registrerade')}</p>
                        </div>
                        <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">
                          {row.eaten.caloriesKcal} / {row.planned.caloriesKcal} kcal
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                        <MacroBar label="kcal" eaten={row.eaten.caloriesKcal} planned={row.planned.caloriesKcal} color="bg-orange-500" />
                        <MacroBar label={text(locale, 'protein', 'protein')} eaten={row.eaten.proteinG} planned={row.planned.proteinG} color="bg-red-500" />
                        <MacroBar label={text(locale, 'carbs', 'kolh.')} eaten={row.eaten.carbsG} planned={row.planned.carbsG} color="bg-amber-500" />
                        <MacroBar label={text(locale, 'fat', 'fett')} eaten={row.eaten.fatG} planned={row.planned.fatG} color="bg-cyan-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {guide.day.meals.map((meal) => (
                  <div key={meal.id} className="rounded-lg border border-slate-200 p-4 dark:border-white/10">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {meal.time ? `${meal.time} · ` : ''}{localizeSavedText(locale, meal.title)}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {meal.caloriesKcal} kcal · {Math.round(meal.proteinG)}P / {Math.round(meal.carbsG)}C / {Math.round(meal.fatG)}F
                          </p>
                        </div>
                        {meal.explanation && <p className="text-sm text-slate-600 dark:text-slate-400">{localizeSavedText(locale, meal.explanation)}</p>}
                      </div>
                      {isToday && (
                        <div className="flex flex-wrap gap-2">
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
                        </div>
                      )}
                    </div>
                    <div className="mt-3">
                      <PortionList portionSummary={meal.portionSummary} locale={locale} />
                    </div>
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
                ))}
              </div>
            </>
          )}
        </GlassCardContent>
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
