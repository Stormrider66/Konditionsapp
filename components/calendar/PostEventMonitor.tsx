'use client'

/**
 * Post-Event Monitoring Component
 *
 * Displays monitoring information after illness or altitude camp events.
 * Shows current phase, recommendations, and progress tracking.
 */

import { useMemo } from 'react'
import { differenceInDays, isWithinInterval, isAfter, isBefore } from 'date-fns'
import {
  AlertCircle,
  Activity,
  Heart,
  Mountain,
  ThermometerSnowflake,
  TrendingUp,
  Check,
  Clock,
  Shield,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  generateReturnProtocol,
  type IllnessInfo,
  type ReturnPhase,
} from '@/lib/calendar/illness-protocol'
import {
  generateAltitudeCampPlan,
  type AltitudeCampInfo,
  type AdaptationPhase,
} from '@/lib/calendar/altitude-calculator'
import { useLocale } from '@/i18n/client'

interface PostEventMonitorProps {
  eventType: 'ILLNESS' | 'ALTITUDE_CAMP'
  eventData: {
    startDate: Date
    endDate: Date
    // Illness-specific
    illnessType?: string
    hadFever?: boolean
    feverDays?: number
    symptomsBelowNeck?: boolean
    medicalClearance?: boolean
    returnToTrainingDate?: Date
    // Altitude-specific
    altitude?: number
  }
  currentDate?: Date
  variant?: 'default' | 'glass'
}

export function PostEventMonitor({
  eventType,
  eventData,
  currentDate = new Date(),
  variant: _variant = 'default',
}: PostEventMonitorProps) {
  const locale = useLocale()
  const appLocale = locale === 'sv' ? 'sv' : 'en'

  const monitoringData = useMemo(() => {
    if (eventType === 'ILLNESS' && eventData.illnessType) {
      return getIllnessMonitoringData(eventData, currentDate, appLocale)
    }
    if (eventType === 'ALTITUDE_CAMP' && eventData.altitude) {
      return getAltitudeMonitoringData(eventData, currentDate, appLocale)
    }
    return null
  }, [appLocale, eventType, eventData, currentDate])

  if (!monitoringData) return null

  const { phase, progress, recommendations, stats, isComplete, title, icon: Icon, color } = monitoringData

  return (
    <Card className={`border-l-4 ${color}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription className="text-xs">
                {isComplete
                  ? appLocale === 'sv' ? 'Avslutad' : 'Complete'
                  : `${phase.label} - ${appLocale === 'sv' ? 'Dag' : 'Day'} ${phase.day} ${appLocale === 'sv' ? 'av' : 'of'} ${phase.total}`}
              </CardDescription>
            </div>
          </div>
          <Badge variant={isComplete ? 'default' : 'outline'}>
            {isComplete ? (
              <>
                <Check className="h-3 w-3 mr-1" />
                {appLocale === 'sv' ? 'Klar' : 'Done'}
              </>
            ) : (
              `${Math.round(progress)}%`
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {!isComplete && (
          <div className="space-y-1">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{phase.label}</span>
              <span>
                {phase.remaining} {appLocale === 'sv' ? 'dagar kvar' : 'days left'}
              </span>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          {stats.map((stat, i) => (
            <div key={i} className="rounded-md bg-muted/50 p-2 text-center">
              <stat.icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-sm font-medium">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && !isComplete && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              {appLocale === 'sv' ? 'Idag rekommenderas' : 'Recommended today'}
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {recommendations.slice(0, 3).map((rec, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Warning for medical clearance */}
        {eventType === 'ILLNESS' && eventData.medicalClearance === false && !isComplete && (
          <div className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 p-3 text-amber-800 dark:text-amber-200">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="text-xs">
              {appLocale === 'sv'
                ? 'Läkargodkännande saknas - rådgör med läkare innan full träning'
                : 'Medical clearance is missing - consult a doctor before full training'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface MonitoringData {
  phase: {
    label: string
    day: number
    total: number
    remaining: number
  }
  progress: number
  recommendations: string[]
  stats: {
    icon: React.ComponentType<{ className?: string }>
    label: string
    value: string
  }[]
  isComplete: boolean
  title: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

function getIllnessMonitoringData(
  eventData: PostEventMonitorProps['eventData'],
  currentDate: Date,
  locale: 'en' | 'sv'
): MonitoringData | null {
  const info: IllnessInfo = {
    type: (eventData.illnessType as IllnessInfo['type']) || 'GENERAL',
    startDate: eventData.startDate,
    endDate: eventData.endDate,
    hadFever: eventData.hadFever || false,
    feverDays: eventData.feverDays || 0,
    symptomsBelowNeck: eventData.symptomsBelowNeck || false,
  }

  const protocol = generateReturnProtocol(info, locale)

  // Check if we're in the monitoring period
  const isBeforeProtocol = isBefore(currentDate, protocol.startDate)
  const isAfterProtocol = isAfter(currentDate, protocol.endDate)

  if (isBeforeProtocol) return null

  const dayOfProtocol = differenceInDays(currentDate, protocol.startDate) + 1
  const isComplete = isAfterProtocol

  // Find current phase
  const currentPhase = isComplete
    ? protocol.phases[protocol.phases.length - 1]
    : protocol.phases.find((p) => p.day === dayOfProtocol) || protocol.phases[0]

  return {
    phase: {
      label: getReturnIntensityLabel(currentPhase.intensity, locale),
      day: isComplete ? protocol.totalDays : dayOfProtocol,
      total: protocol.totalDays,
      remaining: isComplete ? 0 : protocol.totalDays - dayOfProtocol,
    },
    progress: isComplete ? 100 : (dayOfProtocol / protocol.totalDays) * 100,
    recommendations: isComplete ? [] : currentPhase.activities,
    stats: [
      {
        icon: Activity,
        label: locale === 'sv' ? 'Intensitet' : 'Intensity',
        value: `${currentPhase.intensityPercent}%`,
      },
      {
        icon: Clock,
        label: 'Duration',
        value: currentPhase.durationMinutes > 0 ? `${currentPhase.durationMinutes} min` : locale === 'sv' ? 'Vila' : 'Rest',
      },
      {
        icon: TrendingUp,
        label: locale === 'sv' ? 'Dag' : 'Day',
        value: `${isComplete ? protocol.totalDays : dayOfProtocol}/${protocol.totalDays}`,
      },
    ],
    isComplete,
    title: locale === 'sv' ? 'Återgång efter sjukdom' : 'Return after illness',
    icon: ThermometerSnowflake,
    color: 'border-l-red-500',
  }
}

function getAltitudeMonitoringData(
  eventData: PostEventMonitorProps['eventData'],
  currentDate: Date,
  locale: 'en' | 'sv'
): MonitoringData | null {
  const info: AltitudeCampInfo = {
    startDate: eventData.startDate,
    endDate: eventData.endDate,
    altitude: eventData.altitude || 0,
  }

  const plan = generateAltitudeCampPlan(info, locale)

  // Check if we're in camp or post-camp period
  const isBeforeCamp = isBefore(currentDate, plan.camp.startDate)
  const isDuringCamp = isWithinInterval(currentDate, {
    start: plan.camp.startDate,
    end: plan.camp.endDate,
  })
  const isInPostCamp = isWithinInterval(currentDate, {
    start: plan.postCampMonitoring.startDate,
    end: plan.postCampMonitoring.endDate,
  })
  if (isBeforeCamp) return null

  let phaseLabel: string
  let day: number
  let total: number
  let remaining: number
  let progress: number
  let recommendations: string[]
  let isComplete: boolean

  if (isDuringCamp) {
    const campDay = differenceInDays(currentDate, plan.camp.startDate) + 1
    const adaptation = plan.adaptationTimeline.find((a) => a.day === campDay)
    phaseLabel = adaptation ? getAltitudePhaseLabel(adaptation.phase, locale) : locale === 'sv' ? 'På läger' : 'At camp'
    day = campDay
    total = plan.totalDays
    remaining = plan.totalDays - campDay
    progress = (campDay / plan.totalDays) * 100
    recommendations = adaptation?.recommendations || []
    isComplete = false
  } else if (isInPostCamp) {
    const postDay = differenceInDays(currentDate, plan.postCampMonitoring.startDate) + 1
    phaseLabel = locale === 'sv' ? 'Uppföljning' : 'Follow-up'
    day = postDay
    total = plan.postCampMonitoring.days
    remaining = plan.postCampMonitoring.days - postDay
    progress = (postDay / plan.postCampMonitoring.days) * 100
    recommendations = plan.postCampMonitoring.recommendations.slice(0, 3)
    isComplete = false
  } else {
    phaseLabel = locale === 'sv' ? 'Avslutad' : 'Complete'
    day = plan.totalDays + plan.postCampMonitoring.days
    total = day
    remaining = 0
    progress = 100
    recommendations = []
    isComplete = true
  }

  // Find current adaptation for stats
  const campDay = isDuringCamp
    ? differenceInDays(currentDate, plan.camp.startDate) + 1
    : plan.totalDays
  const adaptation = plan.adaptationTimeline.find((a) => a.day === campDay) || plan.adaptationTimeline[0]

  return {
    phase: {
      label: phaseLabel,
      day,
      total,
      remaining,
    },
    progress,
    recommendations,
    stats: [
      {
        icon: Mountain,
        label: locale === 'sv' ? 'Höjd' : 'Altitude',
        value: `${plan.camp.altitude}m`,
      },
      {
        icon: Activity,
        label: locale === 'sv' ? 'Max intensitet' : 'Max intensity',
        value: `${adaptation.maxIntensity}%`,
      },
      {
        icon: Heart,
        label: 'Puls',
        value: `+${adaptation.hrAdjustment}bpm`,
      },
    ],
    isComplete,
    title: isDuringCamp
      ? locale === 'sv' ? 'Höjdläger' : 'Altitude camp'
      : locale === 'sv' ? 'Efter höjdläger' : 'After altitude camp',
    icon: Mountain,
    color: 'border-l-purple-500',
  }
}

/**
 * Compact monitor for inline display in calendar
 */
export function PostEventMonitorBadge({
  eventType,
  eventData,
  currentDate = new Date(),
}: PostEventMonitorProps) {
  const locale = useLocale()
  const appLocale = locale === 'sv' ? 'sv' : 'en'

  const monitoringData = useMemo(() => {
    if (eventType === 'ILLNESS' && eventData.illnessType) {
      return getIllnessMonitoringData(eventData, currentDate, appLocale)
    }
    if (eventType === 'ALTITUDE_CAMP' && eventData.altitude) {
      return getAltitudeMonitoringData(eventData, currentDate, appLocale)
    }
    return null
  }, [appLocale, eventType, eventData, currentDate])

  if (!monitoringData || monitoringData.isComplete) return null

  const Icon = monitoringData.icon

  return (
    <Badge variant="outline" className="gap-1">
      <Icon className="h-3 w-3" />
      <span>
        {appLocale === 'sv' ? 'Dag' : 'Day'} {monitoringData.phase.day}/{monitoringData.phase.total}
      </span>
      <span className="text-muted-foreground">
        ({Math.round(monitoringData.progress)}%)
      </span>
    </Badge>
  )
}

function getReturnIntensityLabel(intensity: ReturnPhase['intensity'], locale: 'en' | 'sv'): string {
  switch (intensity) {
    case 'NONE':
      return locale === 'sv' ? 'Vila' : 'Rest'
    case 'VERY_LIGHT':
      return locale === 'sv' ? 'Mycket lätt' : 'Very light'
    case 'LIGHT':
      return locale === 'sv' ? 'Lätt' : 'Light'
    case 'MODERATE':
      return locale === 'sv' ? 'Moderat' : 'Moderate'
    case 'NORMAL':
      return locale === 'sv' ? 'Normal' : 'Normal'
  }
}

function getAltitudePhaseLabel(phase: AdaptationPhase, locale: 'en' | 'sv'): string {
  switch (phase) {
    case 'PRE_CAMP':
      return locale === 'sv' ? 'Före läger' : 'Before camp'
    case 'ACUTE':
      return locale === 'sv' ? 'Akutfas' : 'Acute phase'
    case 'ADAPTATION':
      return locale === 'sv' ? 'Anpassningsfas' : 'Adaptation phase'
    case 'OPTIMAL':
      return locale === 'sv' ? 'Optimalfas' : 'Optimal phase'
    case 'POST_CAMP':
      return locale === 'sv' ? 'Efter läger' : 'After camp'
  }
}
