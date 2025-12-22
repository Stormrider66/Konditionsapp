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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
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
}

function FoodSuggestionChip({ food }: { food: FoodSuggestion }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-md">
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
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${iconBg} flex-shrink-0`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-sm text-slate-900">{title}</h4>
            {timing && (
              <span className="text-xs text-slate-500">{timing}</span>
            )}
          </div>
          <p className="text-sm text-slate-600 mt-1">{recommendation}</p>

          {/* Macro targets */}
          {(carbsG || proteinG || hydrationMl) && (
            <div className="flex flex-wrap gap-2 mt-2">
              {carbsG && (
                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                  {carbsG}g kolhydrater
                </Badge>
              )}
              {proteinG && (
                <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                  {proteinG}g protein
                </Badge>
              )}
              {hydrationMl && (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                  {hydrationMl}ml vätska
                </Badge>
              )}
            </div>
          )}

          {/* Food suggestions */}
          {foodSuggestions && foodSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {foodSuggestions.slice(0, 4).map((food, i) => (
                <FoodSuggestionChip key={i} food={food} />
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
}: WorkoutNutritionCardProps) {
  const [isExpanded, setIsExpanded] = useState(!compact)

  const hasGuidance = preWorkout || duringWorkout || postWorkout

  if (!hasGuidance) {
    return null
  }

  if (compact) {
    return (
      <Card className="bg-white shadow-sm border-l-4 border-l-emerald-500">
        <CardContent className="p-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-emerald-600" />
              <span className="font-medium text-sm">{workout.name}</span>
              <Badge className={`text-xs ${getIntensityColor(workout.intensity)}`}>
                {getIntensityLabel(workout.intensity)}
              </Badge>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-slate-400 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isExpanded && (
            <div className="mt-3 pt-3 border-t space-y-4">
              {preWorkout && (
                <GuidanceSection
                  title="Före"
                  icon={<Clock className="h-4 w-4 text-amber-600" />}
                  iconBg="bg-amber-50"
                  timing={preWorkout.timingLabel}
                  recommendation={preWorkout.recommendation}
                  carbsG={preWorkout.carbsTargetG}
                  proteinG={preWorkout.proteinTargetG}
                  foodSuggestions={preWorkout.foodSuggestions}
                />
              )}
              {duringWorkout && (
                <GuidanceSection
                  title="Under"
                  icon={<Zap className="h-4 w-4 text-blue-600" />}
                  iconBg="bg-blue-50"
                  recommendation={duringWorkout.recommendation}
                  carbsG={duringWorkout.carbsTargetG}
                  hydrationMl={duringWorkout.hydrationMl}
                  foodSuggestions={duringWorkout.foodSuggestions}
                />
              )}
              {postWorkout && (
                <GuidanceSection
                  title="Efter"
                  icon={<RefreshCw className="h-4 w-4 text-green-600" />}
                  iconBg="bg-green-50"
                  timing={postWorkout.timingLabel}
                  recommendation={postWorkout.recommendation}
                  carbsG={postWorkout.carbsTargetG}
                  proteinG={postWorkout.proteinTargetG}
                  foodSuggestions={postWorkout.foodSuggestions}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
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
        {preWorkout && (
          <GuidanceSection
            title="Före passet"
            icon={<Clock className="h-4 w-4 text-amber-600" />}
            iconBg="bg-amber-50"
            timing={preWorkout.timingLabel}
            recommendation={preWorkout.recommendation}
            carbsG={preWorkout.carbsTargetG}
            proteinG={preWorkout.proteinTargetG}
            foodSuggestions={preWorkout.foodSuggestions}
          />
        )}

        {duringWorkout && (
          <>
            <div className="border-t" />
            <GuidanceSection
              title="Under passet"
              icon={<Zap className="h-4 w-4 text-blue-600" />}
              iconBg="bg-blue-50"
              recommendation={duringWorkout.recommendation}
              carbsG={duringWorkout.carbsTargetG}
              hydrationMl={duringWorkout.hydrationMl}
              foodSuggestions={duringWorkout.foodSuggestions}
            />
          </>
        )}

        {postWorkout && (
          <>
            <div className="border-t" />
            <GuidanceSection
              title="Efter passet"
              icon={<RefreshCw className="h-4 w-4 text-green-600" />}
              iconBg="bg-green-50"
              timing={postWorkout.timingLabel}
              recommendation={postWorkout.recommendation}
              carbsG={postWorkout.carbsTargetG}
              proteinG={postWorkout.proteinTargetG}
              foodSuggestions={postWorkout.foodSuggestions}
            />
          </>
        )}
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
