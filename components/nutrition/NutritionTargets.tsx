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
import { Flame, Beef, Wheat, Droplets, CircleDot } from 'lucide-react'
import type { DailyMacroTargets } from '@/lib/nutrition-timing'
import { Skeleton } from '@/components/ui/skeleton'

interface NutritionTargetsProps {
  targets: DailyMacroTargets
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
}

function MacroItem({ label, value, unit, icon, color, bgColor, isGlass }: MacroItemProps) {
  return (
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${isGlass ? 'bg-slate-800/50' : bgColor}`}>
        <div className={color}>{icon}</div>
      </div>
      <div className="flex-1">
        <p className={`text-xs ${isGlass ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
        <p className={`font-semibold ${isGlass ? 'text-white' : 'text-slate-900'}`}>
          {value.toLocaleString('sv-SE')}
          <span className={`text-xs font-normal ml-1 ${isGlass ? 'text-slate-400' : 'text-slate-500'}`}>{unit}</span>
        </p>
      </div>
    </div>
  )
}

export function NutritionTargets({ targets, isRestDay = false, compact = false, variant = 'default' }: NutritionTargetsProps) {
  const isGlass = variant === 'glass'

  // Calculate macro percentages (for visualization)
  const totalMacroCalories = targets.carbsG * 4 + targets.proteinG * 4 + targets.fatG * 9
  const carbPercent = Math.round((targets.carbsG * 4 / totalMacroCalories) * 100)
  const proteinPercent = Math.round((targets.proteinG * 4 / totalMacroCalories) * 100)
  const fatPercent = Math.round((targets.fatG * 9 / totalMacroCalories) * 100)

  if (compact) {
    if (isGlass) {
      return (
        <GlassCard>
          <GlassCardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm text-white">Dagens mål</h4>
              {isRestDay && (
                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
                  Vilodag
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* ... items ... */}
              <MacroItem
                label="Kalorier"
                value={targets.caloriesKcal}
                unit="kcal"
                icon={<Flame className="h-4 w-4" />}
                color="text-orange-500"
                bgColor="bg-orange-950/30"
                isGlass={true}
              />
              <MacroItem
                label="Protein"
                value={targets.proteinG}
                unit="g"
                icon={<Beef className="h-4 w-4" />}
                color="text-red-500"
                bgColor="bg-red-950/30"
                isGlass={true}
              />
              <MacroItem
                label="Kolhydrater"
                value={targets.carbsG}
                unit="g"
                icon={<Wheat className="h-4 w-4" />}
                color="text-amber-500"
                bgColor="bg-amber-950/30"
                isGlass={true}
              />
              <MacroItem
                label="Vätska"
                value={Math.round(targets.hydrationMl / 100) / 10}
                unit="L"
                icon={<Droplets className="h-4 w-4" />}
                color="text-blue-500"
                bgColor="bg-blue-950/30"
                isGlass={true}
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
            <h4 className="font-medium text-sm text-slate-900">Dagens mål</h4>
            {isRestDay && (
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                Vilodag
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MacroItem
              label="Kalorier"
              value={targets.caloriesKcal}
              unit="kcal"
              icon={<Flame className="h-4 w-4" />}
              color="text-orange-600"
              bgColor="bg-orange-50"
            />
            <MacroItem
              label="Protein"
              value={targets.proteinG}
              unit="g"
              icon={<Beef className="h-4 w-4" />}
              color="text-red-600"
              bgColor="bg-red-50"
            />
            <MacroItem
              label="Kolhydrater"
              value={targets.carbsG}
              unit="g"
              icon={<Wheat className="h-4 w-4" />}
              color="text-amber-600"
              bgColor="bg-amber-50"
            />
            <MacroItem
              label="Vätska"
              value={Math.round(targets.hydrationMl / 100) / 10}
              unit="L"
              icon={<Droplets className="h-4 w-4" />}
              color="text-blue-600"
              bgColor="bg-blue-50"
            />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Full view logic
  const content = (
    <>
      {/* Calories - prominent display */}
      <div className={`flex items-center gap-4 p-3 rounded-lg ${isGlass ? 'bg-orange-950/20 border border-orange-500/10' : 'bg-orange-50'}`}>
        <div className={`p-2.5 rounded-full ${isGlass ? 'bg-orange-500/20' : 'bg-orange-100'}`}>
          <Flame className={`h-5 w-5 ${isGlass ? 'text-orange-400' : 'text-orange-600'}`} />
        </div>
        <div>
          <p className={`text-xs ${isGlass ? 'text-orange-300' : 'text-orange-700'}`}>Totalt energibehov</p>
          <p className={`text-2xl font-bold ${isGlass ? 'text-orange-100' : 'text-orange-900'}`}>
            {targets.caloriesKcal.toLocaleString('sv-SE')}
            <span className={`text-sm font-normal ml-1 ${isGlass ? 'text-orange-300' : ''}`}>kcal</span>
          </p>
        </div>
      </div>

      {/* Macro distribution bar */}
      <div className="space-y-2">
        <p className={`text-xs font-medium ${isGlass ? 'text-slate-400' : 'text-slate-500'}`}>Makrofördelning</p>
        <div className="flex h-3 rounded-full overflow-hidden bg-slate-800">
          <div
            className="bg-amber-500 transition-all"
            style={{ width: `${carbPercent}%` }}
            title={`Kolhydrater ${carbPercent}%`}
          />
          <div
            className="bg-red-500 transition-all"
            style={{ width: `${proteinPercent}%` }}
            title={`Protein ${proteinPercent}%`}
          />
          <div
            className="bg-emerald-500 transition-all"
            style={{ width: `${fatPercent}%` }}
            title={`Fett ${fatPercent}%`}
          />
        </div>
        <div className={`flex justify-between text-xs ${isGlass ? 'text-slate-400' : 'text-slate-500'}`}>
          <span className="flex items-center gap-1">
            <CircleDot className="h-2.5 w-2.5 text-amber-500" />
            Kolhydrater {carbPercent}%
          </span>
          <span className="flex items-center gap-1">
            <CircleDot className="h-2.5 w-2.5 text-red-500" />
            Protein {proteinPercent}%
          </span>
          <span className="flex items-center gap-1">
            <CircleDot className="h-2.5 w-2.5 text-emerald-500" />
            Fett {fatPercent}%
          </span>
        </div>
      </div>

      {/* Individual macros */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <div className={`space-y-1.5 p-3 rounded-lg ${isGlass ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
          <div className="flex items-center gap-2">
            <Wheat className="h-4 w-4 text-amber-500" />
            <span className={`text-xs ${isGlass ? 'text-slate-400' : 'text-slate-600'}`}>Kolhydrater</span>
          </div>
          <p className={`text-xl font-semibold ${isGlass ? 'text-white' : 'text-slate-900'}`}>
            {targets.carbsG}
            <span className={`text-sm font-normal ml-1 ${isGlass ? 'text-slate-500' : 'text-slate-500'}`}>g</span>
          </p>
        </div>

        <div className={`space-y-1.5 p-3 rounded-lg ${isGlass ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
          <div className="flex items-center gap-2">
            <Beef className="h-4 w-4 text-red-500" />
            <span className={`text-xs ${isGlass ? 'text-slate-400' : 'text-slate-600'}`}>Protein</span>
          </div>
          <p className={`text-xl font-semibold ${isGlass ? 'text-white' : 'text-slate-900'}`}>
            {targets.proteinG}
            <span className={`text-sm font-normal ml-1 ${isGlass ? 'text-slate-500' : 'text-slate-500'}`}>g</span>
          </p>
        </div>

        <div className={`space-y-1.5 p-3 rounded-lg ${isGlass ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
          <div className="flex items-center gap-2">
            <CircleDot className="h-4 w-4 text-emerald-500" />
            <span className={`text-xs ${isGlass ? 'text-slate-400' : 'text-slate-600'}`}>Fett</span>
          </div>
          <p className={`text-xl font-semibold ${isGlass ? 'text-white' : 'text-slate-900'}`}>
            {targets.fatG}
            <span className={`text-sm font-normal ml-1 ${isGlass ? 'text-slate-500' : 'text-slate-500'}`}>g</span>
          </p>
        </div>
      </div>

      {/* Hydration */}
      <div className={`flex items-center gap-3 p-3 rounded-lg ${isGlass ? 'bg-blue-950/20 border border-blue-500/10' : 'bg-blue-50'}`}>
        <div className={`p-2 rounded-full ${isGlass ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
          <Droplets className={`h-4 w-4 ${isGlass ? 'text-blue-400' : 'text-blue-600'}`} />
        </div>
        <div className="flex-1">
          <p className={`text-xs ${isGlass ? 'text-blue-300' : 'text-blue-700'}`}>Vätskebehov</p>
          <p className={`font-semibold ${isGlass ? 'text-blue-100' : 'text-blue-900'}`}>
            {(targets.hydrationMl / 1000).toFixed(1)} liter
          </p>
        </div>
        <p className={`text-xs ${isGlass ? 'text-blue-300' : 'text-blue-600'}`}>
          {Math.round(targets.hydrationMl / 250)} glas vatten
        </p>
      </div>
    </>
  )

  if (isGlass) {
    return (
      <GlassCard>
        <GlassCardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <GlassCardTitle className="text-base text-cyan-400">Dagens näringsbehov</GlassCardTitle>
            {isRestDay && (
              <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
                Vilodag
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
          <CardTitle className="text-base">Dagens näringsbehov</CardTitle>
          {isRestDay && (
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              Vilodag
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
