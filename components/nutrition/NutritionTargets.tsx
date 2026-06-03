/**
 * Nutrition Targets Component
 *
 * Displays daily macro targets with visual progress indicators.
 * Shows calories, protein, carbs, fat, and hydration goals.
 */

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { Progress } from '@/components/ui/progress'
import { AlertTriangle, Flame, Beef, Wheat, Droplets, CircleDot } from 'lucide-react'
import type { DailyMacroTargets } from '@/lib/nutrition-timing'
import { calculateMacroDistributionPercentages } from '@/lib/nutrition/macro-distribution'
import { useLocale, useTranslations } from '@/i18n/client'

interface ConsumedMacros {
  calories: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
}

interface NutritionTargetsProps {
  targets: DailyMacroTargets
  consumed?: ConsumedMacros
  isRestDay?: boolean
  compact?: boolean
  variant?: 'default' | 'glass'
}

interface MacroItemProps {
  label: string
  value: number
  unit: string
  icon: React.ReactNode
  color: string
  bgColor: string
  isGlass?: boolean
  locale: string
}

function MacroItem({ label, value, unit, icon, color, bgColor, isGlass, locale }: MacroItemProps) {
  return (
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${isGlass ? 'bg-slate-100 dark:bg-slate-800/50' : bgColor}`}>
        <div className={color}>{icon}</div>
      </div>
      <div className="flex-1">
        <p className={`text-xs ${isGlass ? 'text-slate-500 dark:text-slate-400' : 'text-slate-500'}`}>{label}</p>
        <p className={`font-semibold ${isGlass ? 'text-slate-900 dark:text-white' : 'text-slate-900'}`}>
          {value.toLocaleString(locale)}
          <span className={`text-xs font-normal ml-1 ${isGlass ? 'text-slate-500 dark:text-slate-400' : 'text-slate-500'}`}>{unit}</span>
        </p>
      </div>
    </div>
  )
}

function MacroProgressItem({
  label,
  consumed,
  target,
  unit,
  icon,
  color,
  progressColor,
  isGlass,
  locale,
  reachedLabel,
  remainingLabel,
}: {
  label: string
  consumed: number
  target: number
  unit: string
  icon: React.ReactNode
  color: string
  progressColor: string
  isGlass?: boolean
  locale: string
  reachedLabel: string
  remainingLabel: (values: { amount: number; unit: string }) => string
}) {
  const pct = target > 0 ? Math.min(100, Math.round((consumed / target) * 100)) : 0
  const remaining = Math.max(0, target - consumed)
  const reached = consumed >= target

  return (
    <div className={`space-y-2 p-3 rounded-lg ${isGlass ? 'bg-slate-100 dark:bg-slate-800/50' : 'bg-slate-50'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={color}>{icon}</div>
          <span className={`text-xs ${isGlass ? 'text-slate-600 dark:text-slate-400' : 'text-slate-600'}`}>{label}</span>
        </div>
        <span className={`text-xs font-medium ${isGlass ? 'text-slate-500 dark:text-slate-400' : 'text-slate-500'}`}>
          {Math.round(consumed).toLocaleString(locale)} / {target.toLocaleString(locale)} {unit}
        </span>
      </div>
      <Progress value={pct} className={`h-2 ${progressColor}`} />
      <p className={`text-xs ${reached ? 'text-green-600 dark:text-green-400' : isGlass ? 'text-slate-500 dark:text-slate-400' : 'text-slate-500'}`}>
        {reached ? reachedLabel : remainingLabel({ amount: Math.round(remaining), unit })}
      </p>
    </div>
  )
}

export function NutritionTargets({ targets, consumed, isRestDay = false, compact = false, variant = 'default' }: NutritionTargetsProps) {
  const t = useTranslations('components.nutritionTargets')
  const locale = useLocale()
  const isGlass = variant === 'glass'
  const workoutEnergyKcal = targets.workoutEnergyKcal ?? targets.workoutAdjustmentKcal
  const fuelingAdjustmentKcal = targets.fuelingAdjustmentKcal ?? 0
  const macroWarnings = targets.macroWarnings ?? []

  const targetMacroDistribution = calculateMacroDistributionPercentages({
    carbsGrams: targets.carbsG,
    proteinGrams: targets.proteinG,
    fatGrams: targets.fatG,
  })
  const consumedMacroDistribution = consumed
    ? calculateMacroDistributionPercentages({
        carbsGrams: consumed.carbsGrams,
        proteinGrams: consumed.proteinGrams,
        fatGrams: consumed.fatGrams,
      })
    : null
  const activeMacroDistribution = consumedMacroDistribution &&
    consumedMacroDistribution.carbsPercent + consumedMacroDistribution.proteinPercent + consumedMacroDistribution.fatPercent > 0
    ? consumedMacroDistribution
    : targetMacroDistribution
  const { carbsPercent: carbPercent, proteinPercent, fatPercent } = activeMacroDistribution

  if (compact) {
    if (isGlass) {
      return (
        <GlassCard>
          <GlassCardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm text-white">{t('titles.dailyTargets')}</h4>
              {isRestDay && (
                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
                  {t('badges.restDay')}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* ... items ... */}
              <MacroItem
                label={t('macros.calories')}
                value={targets.caloriesKcal}
                unit="kcal"
                icon={<Flame className="h-4 w-4" />}
                color="text-orange-500"
                bgColor="bg-orange-950/30"
                isGlass={true}
                locale={locale}
              />
              <MacroItem
                label={t('macros.protein')}
                value={targets.proteinG}
                unit="g"
                icon={<Beef className="h-4 w-4" />}
                color="text-red-500"
                bgColor="bg-red-950/30"
                isGlass={true}
                locale={locale}
              />
              <MacroItem
                label={t('macros.carbs')}
                value={targets.carbsG}
                unit="g"
                icon={<Wheat className="h-4 w-4" />}
                color="text-amber-500"
                bgColor="bg-amber-950/30"
                isGlass={true}
                locale={locale}
              />
              <MacroItem
                label={t('macros.hydration')}
                value={Math.round(targets.hydrationMl / 100) / 10}
                unit="L"
                icon={<Droplets className="h-4 w-4" />}
                color="text-blue-500"
                bgColor="bg-blue-950/30"
                isGlass={true}
                locale={locale}
              />
            </div>
          </GlassCardContent>
        </GlassCard>
      )
    }

    return (
      <Card className="bg-white shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-sm text-slate-900">{t('titles.dailyTargets')}</h4>
            {isRestDay && (
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {t('badges.restDay')}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MacroItem
              label={t('macros.calories')}
              value={targets.caloriesKcal}
              unit="kcal"
              icon={<Flame className="h-4 w-4" />}
              color="text-orange-600"
              bgColor="bg-orange-50"
              locale={locale}
            />
            <MacroItem
              label={t('macros.protein')}
              value={targets.proteinG}
              unit="g"
              icon={<Beef className="h-4 w-4" />}
              color="text-red-600"
              bgColor="bg-red-50"
              locale={locale}
            />
            <MacroItem
              label={t('macros.carbs')}
              value={targets.carbsG}
              unit="g"
              icon={<Wheat className="h-4 w-4" />}
              color="text-amber-600"
              bgColor="bg-amber-50"
              locale={locale}
            />
            <MacroItem
              label={t('macros.hydration')}
              value={Math.round(targets.hydrationMl / 100) / 10}
              unit="L"
              icon={<Droplets className="h-4 w-4" />}
              color="text-blue-600"
              bgColor="bg-blue-50"
              locale={locale}
            />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Full view logic
  const caloriePct = consumed ? Math.min(100, Math.round((consumed.calories / targets.caloriesKcal) * 100)) : 0

  const content = (
    <>
      {/* Calories - prominent display */}
      <div className={`flex items-center gap-4 p-3 rounded-lg ${isGlass ? 'bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-500/10' : 'bg-orange-50'}`}>
        <div className={`p-2.5 rounded-full ${isGlass ? 'bg-orange-100 dark:bg-orange-500/20' : 'bg-orange-100'}`}>
          <Flame className={`h-5 w-5 ${isGlass ? 'text-orange-600 dark:text-orange-400' : 'text-orange-600'}`} />
        </div>
        <div className="flex-1">
          <p className={`text-xs ${isGlass ? 'text-orange-700 dark:text-orange-300' : 'text-orange-700'}`}>
            {consumed ? t('calorie.consumedToday') : t('calorie.totalEnergyNeed')}
          </p>
          <p className={`text-2xl font-bold ${isGlass ? 'text-orange-900 dark:text-orange-100' : 'text-orange-900'}`}>
            {consumed ? `${consumed.calories.toLocaleString(locale)} / ` : ''}
            {targets.caloriesKcal.toLocaleString(locale)}
            <span className={`text-sm font-normal ml-1 ${isGlass ? 'text-orange-700 dark:text-orange-300' : ''}`}>kcal</span>
          </p>
          {(workoutEnergyKcal > 0 || fuelingAdjustmentKcal !== 0 || targets.lifestyleAdjustmentKcal > 0) && (
            <p className={`text-xs mt-0.5 ${isGlass ? 'text-orange-700 dark:text-orange-300' : 'text-orange-700'}`}>
              {t('calorie.sources.baseline', { kcal: targets.baselineKcal.toLocaleString(locale) })}
              {targets.lifestyleAdjustmentKcal > 0 && (
                <>
                  <span className="mx-1">+</span>
                  <span className="font-medium">{t('calorie.sources.lifestyle', { kcal: targets.lifestyleAdjustmentKcal.toLocaleString(locale) })}</span>
                </>
              )}
              {workoutEnergyKcal > 0 && (
                <>
                  <span className="mx-1">+</span>
                  <span className="font-medium">{t('calorie.sources.training', { kcal: workoutEnergyKcal.toLocaleString(locale) })}</span>
                </>
              )}
              {fuelingAdjustmentKcal > 0 && (
                <>
                  <span className="mx-1">+</span>
                  <span className="font-medium">{t('calorie.sources.carbTarget', { kcal: fuelingAdjustmentKcal.toLocaleString(locale) })}</span>
                </>
              )}
              {fuelingAdjustmentKcal < 0 && (
                <>
                  <span className="mx-1">-</span>
                  <span className="font-medium">{t('calorie.sources.targetAdjustment', { kcal: Math.abs(fuelingAdjustmentKcal).toLocaleString(locale) })}</span>
                </>
              )}
            </p>
          )}
          {consumed && (
            <div className="mt-2">
              <Progress value={caloriePct} className="h-2" />
              <p className={`text-xs mt-1 ${consumed.calories >= targets.caloriesKcal ? 'text-green-600 dark:text-green-400' : isGlass ? 'text-orange-700 dark:text-orange-300' : 'text-orange-700'}`}>
                {consumed.calories >= targets.caloriesKcal
                  ? t('progress.reached')
                  : t('progress.remaining', { amount: Math.round(targets.caloriesKcal - consumed.calories).toLocaleString(locale), unit: 'kcal' })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Macro distribution bar */}
      <div className="space-y-2">
        <p className={`text-xs font-medium ${isGlass ? 'text-slate-600 dark:text-slate-400' : 'text-slate-500'}`}>{t('macroDistribution.title')}</p>
        <div className="flex h-3 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800">
          <div
            className="bg-amber-500 transition-all"
            style={{ width: `${carbPercent}%` }}
            title={t('macroDistribution.percentTitle', { label: t('macros.carbs'), percent: carbPercent })}
          />
          <div
            className="bg-red-500 transition-all"
            style={{ width: `${proteinPercent}%` }}
            title={t('macroDistribution.percentTitle', { label: t('macros.protein'), percent: proteinPercent })}
          />
          <div
            className="bg-emerald-500 transition-all"
            style={{ width: `${fatPercent}%` }}
            title={t('macroDistribution.percentTitle', { label: t('macros.fat'), percent: fatPercent })}
          />
        </div>
        <div className={`flex justify-between text-xs ${isGlass ? 'text-slate-600 dark:text-slate-400' : 'text-slate-500'}`}>
          <span className="flex items-center gap-1">
            <CircleDot className="h-2.5 w-2.5 text-amber-500" />
            {t('macroDistribution.percentTitle', { label: t('macros.carbs'), percent: carbPercent })}
          </span>
          <span className="flex items-center gap-1">
            <CircleDot className="h-2.5 w-2.5 text-red-500" />
            {t('macroDistribution.percentTitle', { label: t('macros.protein'), percent: proteinPercent })}
          </span>
          <span className="flex items-center gap-1">
            <CircleDot className="h-2.5 w-2.5 text-emerald-500" />
            {t('macroDistribution.percentTitle', { label: t('macros.fat'), percent: fatPercent })}
          </span>
        </div>
      </div>

      {/* Individual macros - progress bars when consumed available */}
      {consumed ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <MacroProgressItem
            label={t('macros.carbs')}
            consumed={consumed.carbsGrams}
            target={targets.carbsG}
            unit="g"
            icon={<Wheat className="h-4 w-4" />}
            color="text-amber-500"
            progressColor="[&>div]:bg-amber-500"
            isGlass={isGlass}
            locale={locale}
            reachedLabel={t('progress.reached')}
            remainingLabel={(values) => t('progress.remaining', {
              amount: values.amount.toLocaleString(locale),
              unit: values.unit,
            })}
          />
          <MacroProgressItem
            label={t('macros.protein')}
            consumed={consumed.proteinGrams}
            target={targets.proteinG}
            unit="g"
            icon={<Beef className="h-4 w-4" />}
            color="text-red-500"
            progressColor="[&>div]:bg-red-500"
            isGlass={isGlass}
            locale={locale}
            reachedLabel={t('progress.reached')}
            remainingLabel={(values) => t('progress.remaining', {
              amount: values.amount.toLocaleString(locale),
              unit: values.unit,
            })}
          />
          <MacroProgressItem
            label={t('macros.fat')}
            consumed={consumed.fatGrams}
            target={targets.fatG}
            unit="g"
            icon={<CircleDot className="h-4 w-4" />}
            color="text-emerald-500"
            progressColor="[&>div]:bg-emerald-500"
            isGlass={isGlass}
            locale={locale}
            reachedLabel={t('progress.reached')}
            remainingLabel={(values) => t('progress.remaining', {
              amount: values.amount.toLocaleString(locale),
              unit: values.unit,
            })}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className={`space-y-1.5 p-3 rounded-lg ${isGlass ? 'bg-slate-100 dark:bg-slate-800/50' : 'bg-slate-50'}`}>
            <div className="flex items-center gap-2">
              <Wheat className="h-4 w-4 text-amber-500" />
              <span className={`text-xs ${isGlass ? 'text-slate-600 dark:text-slate-400' : 'text-slate-600'}`}>{t('macros.carbs')}</span>
            </div>
            <p className={`text-xl font-semibold ${isGlass ? 'text-slate-900 dark:text-white' : 'text-slate-900'}`}>
              {targets.carbsG}
              <span className={`text-sm font-normal ml-1 ${isGlass ? 'text-slate-600 dark:text-slate-500' : 'text-slate-500'}`}>g</span>
            </p>
          </div>

          <div className={`space-y-1.5 p-3 rounded-lg ${isGlass ? 'bg-slate-100 dark:bg-slate-800/50' : 'bg-slate-50'}`}>
            <div className="flex items-center gap-2">
              <Beef className="h-4 w-4 text-red-500" />
              <span className={`text-xs ${isGlass ? 'text-slate-600 dark:text-slate-400' : 'text-slate-600'}`}>{t('macros.protein')}</span>
            </div>
            <p className={`text-xl font-semibold ${isGlass ? 'text-slate-900 dark:text-white' : 'text-slate-900'}`}>
              {targets.proteinG}
              <span className={`text-sm font-normal ml-1 ${isGlass ? 'text-slate-600 dark:text-slate-500' : 'text-slate-500'}`}>g</span>
            </p>
          </div>

          <div className={`space-y-1.5 p-3 rounded-lg ${isGlass ? 'bg-slate-100 dark:bg-slate-800/50' : 'bg-slate-50'}`}>
            <div className="flex items-center gap-2">
              <CircleDot className="h-4 w-4 text-emerald-500" />
              <span className={`text-xs ${isGlass ? 'text-slate-600 dark:text-slate-400' : 'text-slate-600'}`}>{t('macros.fat')}</span>
            </div>
            <p className={`text-xl font-semibold ${isGlass ? 'text-slate-900 dark:text-white' : 'text-slate-900'}`}>
              {targets.fatG}
              <span className={`text-sm font-normal ml-1 ${isGlass ? 'text-slate-600 dark:text-slate-500' : 'text-slate-500'}`}>g</span>
            </p>
          </div>
        </div>
      )}

      {(targets.highCarbReason || macroWarnings.length > 0) && (
        <div className={`rounded-lg border p-3 text-xs ${isGlass ? 'border-amber-500/20 bg-amber-950/20 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
          <div className="flex items-start gap-2">
            <AlertTriangle className={`mt-0.5 h-4 w-4 flex-shrink-0 ${isGlass ? 'text-amber-300' : 'text-amber-600'}`} />
            <div className="space-y-1">
              {targets.highCarbReason && <p>{targets.highCarbReason}</p>}
              {macroWarnings.slice(0, 2).map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hydration */}
      <div className={`flex items-center gap-3 p-3 rounded-lg ${isGlass ? 'bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-500/10' : 'bg-blue-50'}`}>
        <div className={`p-2 rounded-full ${isGlass ? 'bg-blue-100 dark:bg-blue-500/20' : 'bg-blue-100'}`}>
          <Droplets className={`h-4 w-4 ${isGlass ? 'text-blue-600 dark:text-blue-400' : 'text-blue-600'}`} />
        </div>
        <div className="flex-1">
          <p className={`text-xs ${isGlass ? 'text-blue-700 dark:text-blue-300' : 'text-blue-700'}`}>{t('hydration.need')}</p>
          <p className={`font-semibold ${isGlass ? 'text-blue-900 dark:text-blue-100' : 'text-blue-900'}`}>
            {t('hydration.liters', { amount: (targets.hydrationMl / 1000).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) })}
          </p>
        </div>
        <p className={`text-xs ${isGlass ? 'text-blue-700 dark:text-blue-300' : 'text-blue-600'}`}>
          {t('hydration.glasses', { count: Math.round(targets.hydrationMl / 250).toLocaleString(locale) })}
        </p>
      </div>
    </>
  )

  if (isGlass) {
    return (
      <GlassCard>
        <GlassCardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <GlassCardTitle className="text-base text-cyan-400">{t('titles.dailyNutritionNeeds')}</GlassCardTitle>
            {isRestDay && (
              <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
                {t('badges.restDay')}
              </span>
            )}
          </div>
        </GlassCardHeader>
        <GlassCardContent className="space-y-4">
          {content}
        </GlassCardContent>
      </GlassCard>
    )
  }

  return (
    <Card className="bg-white shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t('titles.dailyNutritionNeeds')}</CardTitle>
          {isRestDay && (
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              {t('badges.restDay')}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {content}
      </CardContent>
    </Card>
  )
}

/**
 * Loading skeleton for NutritionTargets
 */
export function NutritionTargetsSkeleton({ variant = 'default' }: { variant?: 'default' | 'glass' }) {
  const isGlass = variant === 'glass'

  if (isGlass) {
    return (
      <div className="border border-white/10 rounded-xl p-6 bg-slate-900/50">
        <div className="h-5 w-40 bg-slate-700 mb-6 rounded" />
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-3 bg-slate-800/50 rounded-lg">
            <div className="w-12 h-12 bg-slate-700 rounded-full" />
            <div className="space-y-2">
              <div className="h-3 w-24 bg-slate-700 rounded" />
              <div className="h-6 w-32 bg-slate-700 rounded" />
            </div>
          </div>
          <div className="h-3 w-full bg-slate-800 rounded-full" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 bg-slate-800/50 rounded-lg space-y-2">
                <div className="h-4 w-16 bg-slate-700 rounded" />
                <div className="h-6 w-12 bg-slate-700 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className="bg-white shadow-sm animate-pulse">
      <CardHeader className="pb-2">
        <div className="h-5 w-40 bg-slate-200 rounded" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 p-3 bg-slate-100 rounded-lg">
          <div className="w-12 h-12 bg-slate-200 rounded-full" />
          <div className="space-y-2">
            <div className="h-3 w-24 bg-slate-200 rounded" />
            <div className="h-6 w-32 bg-slate-200 rounded" />
          </div>
        </div>
        <div className="h-3 w-full bg-slate-200 rounded-full" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 bg-slate-100 rounded-lg space-y-2">
              <div className="h-4 w-16 bg-slate-200 rounded" />
              <div className="h-6 w-12 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
