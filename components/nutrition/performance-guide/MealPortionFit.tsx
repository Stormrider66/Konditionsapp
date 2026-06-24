'use client'

import { useState } from 'react'
import { Calculator, Check, Loader2, Plus } from 'lucide-react'
import type { MealType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLocale } from '@/i18n/client'

interface FitFood {
  name: string
  grams: number
  caloriesKcal: number
  proteinG: number
  carbsG: number
  fatG: number
  source: 'DATABASE' | 'ESTIMATE'
  foodId?: string
}

interface FitResult {
  foods: FitFood[]
  totals: { caloriesKcal: number; proteinG: number; carbsG: number; fatG: number }
  target: { caloriesKcal: number; proteinG: number; carbsG: number; fatG: number }
}

interface MealPortionFitProps {
  plannedMealId: string
  mealType: MealType
  time: string | null
  date: string
  isToday: boolean
}

function t(locale: string, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export function MealPortionFit({ plannedMealId, mealType, time, date, isToday }: MealPortionFitProps) {
  const locale = useLocale()
  const [foods, setFoods] = useState('')
  const [loading, setLoading] = useState(false)
  const [logging, setLogging] = useState(false)
  const [logged, setLogged] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fit, setFit] = useState<FitResult | null>(null)

  const calculate = async () => {
    if (!foods.trim() || loading) return
    setLoading(true)
    setError(null)
    setLogged(false)
    try {
      const res = await fetch('/api/nutrition/performance-plan/portion-fit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plannedMealId, foods }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || t(locale, 'Could not calculate amounts', 'Kunde inte beräkna mängder'))
      setFit(json.fit as FitResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, 'Could not calculate amounts', 'Kunde inte beräkna mängder'))
    } finally {
      setLoading(false)
    }
  }

  const logMeal = async () => {
    if (!fit || logging) return
    setLogging(true)
    setError(null)
    try {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          mealType,
          time: time ?? undefined,
          description: fit.foods.map((f) => `${f.name} ${f.grams} g`).join(', '),
          calories: fit.totals.caloriesKcal,
          proteinGrams: fit.totals.proteinG,
          carbsGrams: fit.totals.carbsG,
          fatGrams: fit.totals.fatG,
          items: fit.foods.map((f) => ({
            foodId: f.foodId,
            name: f.name,
            estimatedGrams: f.grams,
            calories: f.caloriesKcal,
            proteinGrams: f.proteinG,
            carbsGrams: f.carbsG,
            fatGrams: f.fatG,
          })),
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || t(locale, 'Could not log the meal', 'Kunde inte logga måltiden'))
      }
      setLogged(true)
      window.dispatchEvent(new CustomEvent('meal-logged'))
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, 'Could not log the meal', 'Kunde inte logga måltiden'))
    } finally {
      setLogging(false)
    }
  }

  const kcalDiff = fit ? fit.totals.caloriesKcal - fit.target.caloriesKcal : 0

  return (
    <div className="mt-4 space-y-3 rounded-md border border-dashed border-slate-300/70 bg-slate-50/60 p-3 dark:border-white/10 dark:bg-white/[0.02]">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
        <Calculator className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
        {t(locale, 'How much should I eat?', 'Hur mycket ska jag äta?')}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {t(
          locale,
          'List the foods you want for this meal and get amounts that hit the target.',
          'Skriv vad du vill äta till måltiden så får du mängder som träffar målet.'
        )}
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={foods}
          onChange={(e) => setFoods(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void calculate()
            }
          }}
          placeholder={t(locale, 'e.g. yoghurt, banana', 't.ex. yoghurt, banan')}
          className="h-9"
        />
        <Button
          type="button"
          size="sm"
          className="gap-1.5"
          disabled={loading || !foods.trim()}
          onClick={() => void calculate()}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calculator className="h-3.5 w-3.5" />}
          {t(locale, 'Calculate', 'Räkna ut')}
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      )}

      {fit && (
        <div className="space-y-2.5">
          <div className="space-y-1.5">
            {fit.foods.map((food, index) => (
              <div
                key={`${food.name}-${index}`}
                className="flex items-center justify-between gap-3 rounded-md bg-white/70 px-3 py-2 text-sm dark:bg-white/5"
              >
                <span className="min-w-0 truncate font-medium text-slate-800 dark:text-slate-100">
                  {food.name}
                  {food.source === 'ESTIMATE' && (
                    <span className="ml-1.5 text-[10px] uppercase tracking-wide text-slate-400" title={t(locale, 'AI estimate', 'AI-uppskattning')}>
                      ~
                    </span>
                  )}
                </span>
                <span className="shrink-0 tabular-nums text-slate-600 dark:text-slate-300">
                  <span className="font-semibold text-slate-900 dark:text-white">{food.grams} g</span>
                  <span className="ml-2 text-xs text-slate-400">{food.caloriesKcal} kcal</span>
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-md bg-emerald-50 px-3 py-2 text-xs dark:bg-emerald-500/10">
            <span className="font-medium text-emerald-800 dark:text-emerald-200">
              {t(locale, 'Total', 'Totalt')}: {fit.totals.caloriesKcal} / {fit.target.caloriesKcal} kcal
            </span>
            <span className="tabular-nums text-emerald-700 dark:text-emerald-300">
              {Math.round(fit.totals.proteinG)}P / {Math.round(fit.totals.carbsG)}C / {Math.round(fit.totals.fatG)}F
              <span className="ml-2 text-emerald-500/80">
                {kcalDiff === 0 ? '±0' : kcalDiff > 0 ? `+${kcalDiff}` : kcalDiff} kcal
              </span>
            </span>
          </div>

          {isToday && (
            <Button
              type="button"
              size="sm"
              variant={logged ? 'outline' : 'default'}
              className="gap-1.5"
              disabled={logging || logged}
              onClick={() => void logMeal()}
            >
              {logged ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : logging ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              {logged ? t(locale, 'Logged', 'Loggad') : t(locale, 'Log as eaten', 'Logga som ätet')}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
