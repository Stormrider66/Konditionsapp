/**
 * Nutrition Tip Card Component
 *
 * Displays a quick nutrition tip after daily check-in.
 * Shows workout context and actionable recommendations in Swedish.
 *
 * Used in:
 * - DailyCheckInForm result section
 * - Athlete dashboard
 */

'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Utensils,
  Droplets,
  Battery,
  Dumbbell,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react'
import type { NutritionTip, NutritionTipType, TipPriority } from '@/lib/nutrition-timing'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface NutritionTipCardProps {
  tip: NutritionTip
  onDismiss?: () => void
  showDismiss?: boolean
  compact?: boolean
  variant?: 'default' | 'glass'
  className?: string
}

/**
 * Get icon for tip type
 */
function getTipIcon(type: NutritionTipType) {
  switch (type) {
    case 'PRE_WORKOUT':
    case 'POST_WORKOUT':
      return Utensils
    case 'HYDRATION':
      return Droplets
    case 'RECOVERY_DAY':
      return Battery
    case 'RACE_PREP':
      return Dumbbell
    default:
      return Utensils
  }
}

/**
 * Get priority badge color
 */
function getPriorityStyles(priority: TipPriority, isGlass: boolean = false): {
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  className: string
} {
  if (isGlass) {
    switch (priority) {
      case 'HIGH':
        return { variant: 'outline', className: 'bg-red-950/30 text-red-300 border-red-500/30' }
      case 'MEDIUM':
        return { variant: 'outline', className: 'bg-amber-950/30 text-amber-300 border-amber-500/30' }
      case 'LOW':
        return { variant: 'outline', className: 'bg-slate-800/50 text-slate-300 border-slate-700' }
      default:
        return { variant: 'outline', className: 'text-slate-400 border-slate-700' }
    }
  }

  switch (priority) {
    case 'HIGH':
      return { variant: 'destructive', className: 'bg-red-100 text-red-800 border-red-200' }
    case 'MEDIUM':
      return { variant: 'default', className: 'bg-amber-100 text-amber-800 border-amber-200' }
    case 'LOW':
      return { variant: 'secondary', className: 'bg-slate-100 text-slate-600 border-slate-200' }
    default:
      return { variant: 'outline', className: '' }
  }
}

/**
 * Get Swedish label for priority
 */
function getPriorityLabel(priority: TipPriority): string {
  switch (priority) {
    case 'HIGH':
      return 'Viktigt'
    case 'MEDIUM':
      return 'Tips'
    case 'LOW':
      return 'Info'
    default:
      return 'Tips'
  }
}

/**
 * Get card border color based on priority
 */
function getCardBorderClass(priority: TipPriority, isGlass: boolean = false): string {
  if (isGlass) {
    switch (priority) {
      case 'HIGH':
        return 'border-l-4 border-l-red-500/70 bg-red-950/10'
      case 'MEDIUM':
        return 'border-l-4 border-l-amber-500/70 bg-amber-950/10'
      case 'LOW':
        return 'border-l-4 border-l-slate-500/70 bg-slate-900/40'
      default:
        return 'bg-slate-900/40'
    }
  }

  switch (priority) {
    case 'HIGH':
      return 'border-l-4 border-l-red-500'
    case 'MEDIUM':
      return 'border-l-4 border-l-amber-500'
    case 'LOW':
      return 'border-l-4 border-l-slate-300'
    default:
      return ''
  }
}

export function NutritionTipCard({
  tip,
  onDismiss,
  showDismiss = true,
  compact = false,
  variant = 'default',
  className = '',
}: NutritionTipCardProps) {
  const [isExpanded, setIsExpanded] = useState(!compact)
  const [isDismissed, setIsDismissed] = useState(false)
  const isGlass = variant === 'glass'

  if (isDismissed) return null

  const Icon = getTipIcon(tip.type)
  const priorityStyles = getPriorityStyles(tip.priority, isGlass)
  const borderClass = getCardBorderClass(tip.priority, isGlass)

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  if (isGlass) {
    return (
      <GlassCard className={cn(`relative overflow-hidden ${borderClass}`, className)}>
        <GlassCardContent className={compact ? 'p-3' : 'p-4'}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              <div className="flex-shrink-0 p-1.5 rounded-full bg-slate-800/50">
                <Icon className="h-4 w-4 text-slate-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-medium text-sm text-white truncate">
                    {tip.title}
                  </h4>
                  <Badge
                    variant="outline"
                    className={`text-xs px-1.5 py-0 ${priorityStyles.className}`}
                  >
                    {getPriorityLabel(tip.priority)}
                  </Badge>
                </div>
                {/* Workout context if available */}
                {tip.workoutContext && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {tip.workoutContext.name}
                    {tip.workoutContext.time && ` kl ${tip.workoutContext.time}`}
                    {tip.workoutContext.intensity && ` (${tip.workoutContext.intensity})`}
                  </p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {compact && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-slate-400 hover:text-white hover:bg-white/10"
                  onClick={() => setIsExpanded(!isExpanded)}
                  aria-label={isExpanded ? 'Minimera' : 'Expandera'}
                >
                  {isExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </Button>
              )}
              {showDismiss && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-slate-400 hover:text-white hover:bg-white/10"
                  onClick={handleDismiss}
                  aria-label="Stäng"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Message */}
          {isExpanded && (
            <div className="mt-2">
              <p className="text-sm text-slate-300 leading-relaxed">
                {tip.message}
              </p>
            </div>
          )}
        </GlassCardContent>
      </GlassCard>
    )
  }

  return (
    <Card className={`relative overflow-hidden ${borderClass} bg-white shadow-sm`}>
      <CardContent className={compact ? 'p-3' : 'p-4'}>
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <div className="flex-shrink-0 p-1.5 rounded-full bg-slate-100">
              <Icon className="h-4 w-4 text-slate-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium text-sm text-slate-900 truncate">
                  {tip.title}
                </h4>
                <Badge
                  variant="outline"
                  className={`text-xs px-1.5 py-0 ${priorityStyles.className}`}
                >
                  {getPriorityLabel(tip.priority)}
                </Badge>
              </div>
              {/* Workout context if available */}
              {tip.workoutContext && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {tip.workoutContext.name}
                  {tip.workoutContext.time && ` kl ${tip.workoutContext.time}`}
                  {tip.workoutContext.intensity && ` (${tip.workoutContext.intensity})`}
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {compact && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsExpanded(!isExpanded)}
                aria-label={isExpanded ? 'Minimera' : 'Expandera'}
              >
                {isExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
            {showDismiss && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-slate-400 hover:text-slate-600"
                onClick={handleDismiss}
                aria-label="Stäng"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Message */}
        {isExpanded && (
          <div className="mt-2">
            <p className="text-sm text-slate-700 leading-relaxed">
              {tip.message}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Loading skeleton for NutritionTipCard
 */
export function NutritionTipCardSkeleton({ variant = 'default' }: { variant?: 'default' | 'glass' }) {
  const isGlass = variant === 'glass'

  if (isGlass) {
    return (
      <div className="border-l-4 border-l-slate-700 bg-slate-900/50 rounded-lg p-4 animate-pulse">
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 p-1.5 rounded-full bg-slate-800">
            <div className="h-4 w-4 bg-slate-700 rounded-full" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-4 w-24 bg-slate-800 rounded" />
              <div className="h-4 w-12 bg-slate-800 rounded" />
            </div>
            <div className="h-3 w-32 bg-slate-800 rounded" />
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          <div className="h-3 w-full bg-slate-800 rounded" />
          <div className="h-3 w-4/5 bg-slate-800 rounded" />
        </div>
      </div>
    )
  }

  return (
    <Card className="border-l-4 border-l-slate-200 bg-white shadow-sm animate-pulse">
      <CardContent className="p-4">
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 p-1.5 rounded-full bg-slate-100">
            <div className="h-4 w-4" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-4 w-24 bg-slate-200 rounded" />
              <div className="h-4 w-12 bg-slate-200 rounded" />
            </div>
            <div className="h-3 w-32 bg-slate-100 rounded" />
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          <div className="h-3 w-full bg-slate-100 rounded" />
          <div className="h-3 w-4/5 bg-slate-100 rounded" />
        </div>
      </CardContent>
    </Card>
  )
}
