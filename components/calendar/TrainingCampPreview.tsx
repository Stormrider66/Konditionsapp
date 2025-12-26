'use client'

/**
 * Training Camp Preview Component
 *
 * Displays a preview of the training camp plan with sessions and volume progression.
 */

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import {
  Tent,
  ChevronDown,
  ChevronUp,
  Activity,
  Clock,
  Zap,
  Coffee,
  Sun,
  Moon,
  Utensils,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  generateTrainingCampPlan,
  getCampTypeLabel,
  getCampFocusLabel,
  type TrainingCampInfo,
  type CampDay,
  type CampSession,
  type CampType,
  type CampFocus,
} from '@/lib/calendar/training-camp'

interface TrainingCampPreviewProps {
  startDate: Date
  endDate: Date
  campType?: CampType
  campFocus?: CampFocus
  sessionsPerDay?: number
  showDetails?: boolean
}

export function TrainingCampPreview({
  startDate,
  endDate,
  campType = 'MIXED',
  campFocus = 'MIXED',
  sessionsPerDay = 2,
  showDetails = true,
}: TrainingCampPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const plan = useMemo(() => {
    if (!startDate || !endDate) return null

    const info: TrainingCampInfo = {
      startDate,
      endDate,
      campType,
      campFocus,
      sessionsPerDay,
    }

    return generateTrainingCampPlan(info)
  }, [startDate, endDate, campType, campFocus, sessionsPerDay])

  if (!plan) return null

  const avgVolume = Math.round(
    plan.volumeProgression.reduce((a, b) => a + b, 0) / plan.volumeProgression.length
  )
  const peakVolume = Math.max(...plan.volumeProgression)

  return (
    <div className="mt-4 rounded-lg border bg-muted/30 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <Tent className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">Träningsläger</h4>
            <Badge variant="outline">{getCampTypeLabel(campType)}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {plan.totalDays} dagar, {plan.totalSessions} pass
          </p>
        </div>
      </div>

      {/* Key Stats */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        <div className="rounded-md bg-background p-2 text-center">
          <p className="text-xs text-muted-foreground">Dagar</p>
          <p className="font-medium text-sm">{plan.totalDays}</p>
        </div>
        <div className="rounded-md bg-background p-2 text-center">
          <p className="text-xs text-muted-foreground">Pass/dag</p>
          <p className="font-medium text-sm">{sessionsPerDay}</p>
        </div>
        <div className="rounded-md bg-background p-2 text-center">
          <p className="text-xs text-muted-foreground">Snitt volym</p>
          <p className="font-medium text-sm">{avgVolume}%</p>
        </div>
        <div className="rounded-md bg-background p-2 text-center">
          <p className="text-xs text-muted-foreground">Toppvolym</p>
          <p className="font-medium text-sm text-emerald-600">{peakVolume}%</p>
        </div>
      </div>

      {/* Volume Progression Chart */}
      <div className="mt-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Volymsprogression</p>
        <div className="flex items-end gap-1 h-12">
          {plan.volumeProgression.map((vol, i) => (
            <div
              key={i}
              className={`flex-1 rounded-t ${
                plan.restDayPattern.includes(i + 1)
                  ? 'bg-blue-200 dark:bg-blue-900/50'
                  : vol >= 120
                    ? 'bg-emerald-500'
                    : vol >= 100
                      ? 'bg-emerald-400'
                      : 'bg-emerald-300'
              }`}
              style={{ height: `${(vol / 150) * 100}%` }}
              title={`Dag ${i + 1}: ${vol}%`}
            />
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Dag 1</span>
          <span>Dag {plan.totalDays}</span>
        </div>
      </div>

      {/* Rest Days */}
      {plan.restDayPattern.length > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <Coffee className="h-4 w-4 text-blue-500" />
          <span className="text-sm text-muted-foreground">
            Vilodagar: {plan.restDayPattern.map((d) => `Dag ${d}`).join(', ')}
          </span>
        </div>
      )}

      {/* Detailed Schedule */}
      {showDetails && (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className="mt-4">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span>Visa dagligt schema</span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ScrollArea className="mt-3 max-h-[350px]">
              <div className="space-y-3">
                {plan.days.map((day) => (
                  <CampDayCard key={day.day} campDay={day} />
                ))}
              </div>
            </ScrollArea>

            {/* Nutrition Tips */}
            <div className="mt-4 rounded-md border p-3">
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <Utensils className="h-4 w-4 text-emerald-500" />
                <span>Näringstips</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                {plan.nutritionTips.slice(0, 3).map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-500">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            {/* Recovery Recommendations */}
            <div className="mt-3 rounded-md border p-3">
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <Activity className="h-4 w-4 text-blue-500" />
                <span>Efter lägret</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                {plan.recoveryRecommendations.slice(0, 3).map((rec, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-blue-500">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}

function CampDayCard({ campDay }: { campDay: CampDay }) {
  const SessionIcon = ({ type }: { type: CampSession['type'] }) => {
    switch (type) {
      case 'MORNING':
        return <Sun className="h-3 w-3" />
      case 'MIDDAY':
        return <Clock className="h-3 w-3" />
      case 'AFTERNOON':
        return <Zap className="h-3 w-3" />
      case 'EVENING':
        return <Moon className="h-3 w-3" />
    }
  }

  const intensityColor = (intensity: CampSession['intensity']) => {
    switch (intensity) {
      case 'HARD':
        return 'text-red-600 bg-red-50 dark:bg-red-950/30'
      case 'MODERATE':
        return 'text-amber-600 bg-amber-50 dark:bg-amber-950/30'
      case 'EASY':
        return 'text-green-600 bg-green-50 dark:bg-green-950/30'
      case 'RECOVERY':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-950/30'
    }
  }

  return (
    <div className={`rounded-md border bg-background p-3 ${campDay.isRestDay ? 'border-blue-200 dark:border-blue-800' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Dag {campDay.day}</span>
          <span className="text-xs text-muted-foreground">
            {format(campDay.date, 'EEE d MMM', { locale: sv })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {campDay.isRestDay && (
            <Badge variant="outline" className="text-blue-600 bg-blue-50 dark:bg-blue-950/30">
              Vilodag
            </Badge>
          )}
          <Badge variant="secondary">{campDay.volumePercent}%</Badge>
        </div>
      </div>

      {/* Volume Progress */}
      <div className="flex items-center gap-2 mb-3">
        <Progress value={(campDay.volumePercent / 150) * 100} className="h-2 flex-1" />
        <span className="text-xs text-muted-foreground">{campDay.volumePercent}%</span>
      </div>

      {/* Sessions */}
      <div className="space-y-2">
        {campDay.sessions.map((session) => (
          <div
            key={session.sessionNumber}
            className="flex items-center justify-between text-sm rounded-md bg-muted/50 p-2"
          >
            <div className="flex items-center gap-2">
              <SessionIcon type={session.type} />
              <span>{session.focus}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {session.durationMinutes} min
              </span>
              <Badge variant="outline" className={intensityColor(session.intensity)}>
                {session.intensity === 'HARD' && 'Hård'}
                {session.intensity === 'MODERATE' && 'Moderat'}
                {session.intensity === 'EASY' && 'Lätt'}
                {session.intensity === 'RECOVERY' && 'Vila'}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      {campDay.recommendations.length > 0 && (
        <div className="mt-2 text-xs text-muted-foreground">
          💡 {campDay.recommendations[0]}
        </div>
      )}
    </div>
  )
}
