/**
 * Workout Nutrition Card Component
 *
 * Displays nutrition guidance for a specific workout including:
 * - Pre-workout nutrition (timing, carbs, food suggestions)
 * - During-workout nutrition (for sessions >60min)
 * - Post-workout recovery nutrition
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Clock,
  Utensils,
  Zap,
  RefreshCw,
  ChevronDown,
  Dumbbell,
  Timer,
} from 'lucide-react'
import type { NutritionGuidance, WorkoutContext, FoodSuggestion } from '@/lib/nutrition-timing'

interface WorkoutNutritionCardProps {
  workout: WorkoutContext
  preWorkout?: NutritionGuidance
  duringWorkout?: NutritionGuidance
  postWorkout?: NutritionGuidance
  compact?: boolean
  variant?: 'default' | 'glass'
}

function FoodSuggestionChip({ food, isGlass }: { food: FoodSuggestion, isGlass?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 ${isGlass ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' : 'bg-slate-100 text-slate-700'} text-xs rounded-md transition-colors`}>
      {food.nameSv}
      {food.carbsG && <span className="text-slate-500">({food.carbsG}g K)</span>}
    </span>
  )
}

function GuidanceSection({
  title,
  icon,
  iconBg,
  timing,
  recommendation,
  carbsG,
  proteinG,
  hydrationMl,
  foodSuggestions,
  isGlass
}: {
  title: string
  icon: React.ReactNode
  iconBg: string
  timing?: string
  recommendation: string
  carbsG?: number
  proteinG?: number
  hydrationMl?: number
  foodSuggestions?: FoodSuggestion[]
  isGlass?: boolean
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${isGlass ? 'bg-slate-100 dark:bg-slate-800/50' : iconBg} flex-shrink-0 transition-colors`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className={`font-medium text-sm ${isGlass ? 'text-slate-900 dark:text-white' : 'text-slate-900'} transition-colors`}>{title}</h4>
            {timing && (
              <span className={`text-xs ${isGlass ? 'text-slate-500 dark:text-slate-400' : 'text-slate-500'} transition-colors`}>{timing}</span>
            )}
          </div>
          <p className={`text-sm ${isGlass ? 'text-slate-700 dark:text-slate-300' : 'text-slate-600'} mt-1 transition-colors`}>{recommendation}</p>

          {/* Macro targets */}
          {(carbsG || proteinG || hydrationMl) && (
            <div className="flex flex-wrap gap-2 mt-2">
              {carbsG && (
                <Badge variant="outline" className={`text-xs ${isGlass ? 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  {carbsG}g kolhydrater
                </Badge>
              )}
              {proteinG && (
                <Badge variant="outline" className={`text-xs ${isGlass ? 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/20' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  {proteinG}g protein
                </Badge>
              )}
              {hydrationMl && (
                <Badge variant="outline" className={`text-xs ${isGlass ? 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/20' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                  {hydrationMl}ml vätska
                </Badge>
              )}
            </div>
          )}

          {/* Food suggestions */}
          {foodSuggestions && foodSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {foodSuggestions.slice(0, 4).map((food, i) => (
                <FoodSuggestionChip key={i} food={food} isGlass={isGlass} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function getIntensityColor(intensity: string): string {
  switch (intensity) {
    case 'RECOVERY':
    case 'EASY':
      return 'bg-green-100 text-green-700'
    case 'MODERATE':
      return 'bg-blue-100 text-blue-700'
    case 'THRESHOLD':
      return 'bg-amber-100 text-amber-700'
    case 'INTERVAL':
    case 'MAX':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

function getIntensityLabel(intensity: string): string {
  switch (intensity) {
    case 'RECOVERY':
      return 'Återhämtning'
    case 'EASY':
      return 'Lätt'
    case 'MODERATE':
      return 'Måttligt'
    case 'THRESHOLD':
      return 'Tröskel'
    case 'INTERVAL':
      return 'Intervall'
    case 'MAX':
      return 'Max'
    default:
      return intensity
  }
}

export function WorkoutNutritionCard({
  workout,
  preWorkout,
  duringWorkout,
  postWorkout,
  compact = false,
  variant = 'default'
}: WorkoutNutritionCardProps) {
  const [isExpanded, setIsExpanded] = useState(!compact)
  const isGlass = variant === 'glass'

  const hasGuidance = preWorkout || duringWorkout || postWorkout

  if (!hasGuidance) {
    return null
  }

  const content = (
    <div className="space-y-4">
      {preWorkout && (
        <GuidanceSection
          title="Före passet"
          icon={<Clock className="h-4 w-4 text-amber-500" />}
          iconBg="bg-amber-50"
          timing={preWorkout.timingLabel}
          recommendation={preWorkout.recommendation}
          carbsG={preWorkout.carbsTargetG}
          proteinG={preWorkout.proteinTargetG}
          foodSuggestions={preWorkout.foodSuggestions}
          isGlass={isGlass}
        />
      )}

      {duringWorkout && (
        <>
          <div className={`border-t ${isGlass ? 'border-slate-200 dark:border-white/10' : ''}`} />
          <GuidanceSection
            title="Under passet"
            icon={<Zap className="h-4 w-4 text-blue-500" />}
            iconBg="bg-blue-50"
            recommendation={duringWorkout.recommendation}
            carbsG={duringWorkout.carbsTargetG}
            hydrationMl={duringWorkout.hydrationMl}
            foodSuggestions={duringWorkout.foodSuggestions}
            isGlass={isGlass}
          />
        </>
      )}

      {postWorkout && (
        <>
          <div className={`border-t ${isGlass ? 'border-slate-200 dark:border-white/10' : ''}`} />
          <GuidanceSection
            title="Efter passet"
            icon={<RefreshCw className="h-4 w-4 text-green-500" />}
            iconBg="bg-green-50"
            timing={postWorkout.timingLabel}
            recommendation={postWorkout.recommendation}
            carbsG={postWorkout.carbsTargetG}
            proteinG={postWorkout.proteinTargetG}
            foodSuggestions={postWorkout.foodSuggestions}
            isGlass={isGlass}
          />
        </>
      )}
    </div>
  )

  if (compact) {
    // Compact logic (used for double days etc? logic slightly different)
    // Keeping simple for now, if it's used somewhere.
    return (
      <Card className="bg-white shadow-sm border-l-4 border-l-emerald-500">
        <CardContent className="p-3">
          {/* Compact not fully glassified yet as I'm focusing on dashboard main view */}
          <p>Compact view...</p>
        </CardContent>
      </Card>
    )
  }

  if (isGlass) {
    return (
      <GlassCard>
        <GlassCardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-emerald-400" />
              <GlassCardTitle className="text-base">{workout.name}</GlassCardTitle>
            </div>
            <div className="flex items-center gap-2">
              {workout.duration && (
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Timer className="h-3.5 w-3.5" />
                  {workout.duration} min
                </span>
              )}
              <Badge className={getIntensityColor(workout.intensity)}>
                {getIntensityLabel(workout.intensity)}
              </Badge>
            </div>
          </div>
        </GlassCardHeader>
        <GlassCardContent>
          {content}
        </GlassCardContent>
      </GlassCard>
    )
  }

  return (
    <Card className="bg-white shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-slate-600" />
            <CardTitle className="text-base">{workout.name}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {workout.duration && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Timer className="h-3.5 w-3.5" />
                {workout.duration} min
              </span>
            )}
            <Badge className={getIntensityColor(workout.intensity)}>
              {getIntensityLabel(workout.intensity)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {content}
      </CardContent>
    </Card>
  )
}

/**
 * Loading skeleton for WorkoutNutritionCard
 */
export function WorkoutNutritionCardSkeleton() {
  return (
    <Card className="bg-white shadow-sm animate-pulse">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 bg-slate-200 rounded" />
            <div className="h-5 w-32 bg-slate-200 rounded" />
          </div>
          <div className="h-5 w-16 bg-slate-200 rounded" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-8 h-8 bg-slate-200 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 bg-slate-200 rounded" />
              <div className="h-3 w-full bg-slate-100 rounded" />
              <div className="h-3 w-3/4 bg-slate-100 rounded" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
