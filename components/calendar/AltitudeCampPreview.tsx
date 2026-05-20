'use client'

/**
 * Altitude Camp Preview Component
 *
 * Displays a preview of the altitude training plan based on camp details.
 * Shows adaptation phases, pace adjustments, and recommendations.
 */

import { useMemo, useState } from 'react'
import { format, type Locale } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import {
  Mountain,
  ChevronDown,
  ChevronUp,
  Activity,
  Clock,
  Heart,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Info,
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  generateAltitudeCampPlan,
  getPhaseLabel,
  getPhaseColor,
  calculateVO2maxReduction,
  type AltitudeCampInfo,
  type DailyAdaptation,
  type AdaptationPhase,
} from '@/lib/calendar/altitude-calculator'
import { useLocale } from '@/i18n/client'

interface AltitudeCampPreviewProps {
  altitude: number
  startDate: Date
  endDate: Date
  showDetails?: boolean
}

export function AltitudeCampPreview({
  altitude,
  startDate,
  endDate,
  showDetails = true,
}: AltitudeCampPreviewProps) {
  const locale = useLocale()
  const appLocale = locale === 'sv' ? 'sv' : 'en'
  const dateLocale = appLocale === 'sv' ? sv : enUS
  const [isExpanded, setIsExpanded] = useState(false)

  const plan = useMemo(() => {
    if (!altitude || !startDate || !endDate) return null

    const info: AltitudeCampInfo = {
      startDate,
      endDate,
      altitude,
    }

    return generateAltitudeCampPlan(info, appLocale)
  }, [altitude, startDate, endDate, appLocale])

  if (!plan) return null

  const vo2Reduction = calculateVO2maxReduction(altitude)
  const initialPaceAdjustment = plan.adaptationTimeline[0]?.paceAdjustment || 0

  // Get altitude category
  const altitudeCategory = getAltitudeCategory(altitude, appLocale)

  return (
    <div className="mt-4 rounded-lg border bg-muted/30 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
          <Mountain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{appLocale === 'sv' ? 'Höjdlägerplan' : 'Altitude camp plan'}</h4>
            <Badge variant="outline" className={altitudeCategory.color}>
              {altitudeCategory.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {plan.totalDays} {appLocale === 'sv' ? 'dagar på' : 'days at'} {altitude}m
          </p>
        </div>
      </div>

      {/* Key Stats */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="rounded-md bg-background p-2 cursor-help">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingDown className="h-3 w-3" />
                  VO2max
                </div>
                <p className="font-medium text-sm text-red-600">-{Math.round(vo2Reduction)}%</p>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{appLocale === 'sv' ? 'Förväntad initial VO2max-reduktion' : 'Expected initial VO2max reduction'}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="rounded-md bg-background p-2 cursor-help">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {appLocale === 'sv' ? 'Tempo' : 'Pace'}
                </div>
                <p className="font-medium text-sm text-amber-600">+{initialPaceAdjustment}s/km</p>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{appLocale === 'sv' ? 'Initial tempojustering dag 1' : 'Initial pace adjustment on day 1'}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="rounded-md bg-background p-2 cursor-help">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Heart className="h-3 w-3" />
                  {appLocale === 'sv' ? 'Puls' : 'Heart rate'}
                </div>
                <p className="font-medium text-sm text-orange-600">
                  +{plan.adaptationTimeline[0]?.hrAdjustment || 0}bpm
                </p>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {appLocale === 'sv'
                  ? 'Förväntad pulsökning för samma ansträngning'
                  : 'Expected heart-rate increase at the same effort'}
              </p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="rounded-md bg-background p-2 cursor-help">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  {appLocale === 'sv' ? 'Optimal' : 'Optimal'}
                </div>
                <p className="font-medium text-sm text-green-600">
                  {plan.phaseBreakdown.optimal.start > 0
                    ? `${appLocale === 'sv' ? 'Dag' : 'Day'} ${plan.phaseBreakdown.optimal.start}+`
                    : 'N/A'}
                </p>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{appLocale === 'sv' ? 'När full träningseffekt kan förväntas' : 'When full training effect can be expected'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Phase Timeline Overview */}
      <div className="mt-4">
        <div className="flex h-3 rounded-full overflow-hidden bg-muted">
          {plan.phaseBreakdown.acute.end > 0 && (
            <div
              className="bg-red-400"
              style={{
                width: `${((plan.phaseBreakdown.acute.end - plan.phaseBreakdown.acute.start + 1) / plan.totalDays) * 100}%`,
              }}
            />
          )}
          {plan.phaseBreakdown.adaptation.start > 0 && (
            <div
              className="bg-yellow-400"
              style={{
                width: `${((plan.phaseBreakdown.adaptation.end - plan.phaseBreakdown.adaptation.start + 1) / plan.totalDays) * 100}%`,
              }}
            />
          )}
          {plan.phaseBreakdown.optimal.start > 0 && (
            <div
              className="bg-green-400"
              style={{
                width: `${((plan.phaseBreakdown.optimal.end - plan.phaseBreakdown.optimal.start + 1) / plan.totalDays) * 100}%`,
              }}
            />
          )}
        </div>
        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
          <span>🔴 {appLocale === 'sv' ? 'Akut' : 'Acute'} (1-5)</span>
          <span>🟡 {appLocale === 'sv' ? 'Anpassning' : 'Adaptation'} (6-14)</span>
          <span>🟢 {appLocale === 'sv' ? 'Optimal' : 'Optimal'} (15+)</span>
        </div>
      </div>

      {/* Post-Camp Alert */}
      <div className="mt-3 flex items-start gap-2 rounded-md bg-blue-50 dark:bg-blue-950/30 p-3 text-blue-800 dark:text-blue-200">
        <Info className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium">{appLocale === 'sv' ? 'Uppföljningsperiod efter lägret' : 'Post-camp follow-up period'}</p>
          <p className="text-xs mt-0.5">
            {appLocale === 'sv'
              ? '14 dagar efter hemkomst för optimal tävlingsperiod och återhämtning'
              : '14 days after returning for the optimal competition window and recovery'}
          </p>
        </div>
      </div>

      {/* Detailed Timeline */}
      {showDetails && (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className="mt-4">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span>{appLocale === 'sv' ? 'Visa daglig plan' : 'Show daily plan'}</span>
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
                {/* Show first few days, middle summary, and last few days */}
                {plan.totalDays <= 10 ? (
                  plan.adaptationTimeline.map((day) => (
                    <AdaptationDayCard key={day.day} adaptation={day} locale={appLocale} dateLocale={dateLocale} />
                  ))
                ) : (
                  <>
                    {/* First 5 days */}
                    {plan.adaptationTimeline.slice(0, 5).map((day) => (
                      <AdaptationDayCard key={day.day} adaptation={day} locale={appLocale} dateLocale={dateLocale} />
                    ))}

                    {/* Middle summary */}
                    {plan.totalDays > 10 && (
                      <div className="rounded-md border bg-muted/50 p-3 text-center text-sm text-muted-foreground">
                        ... {plan.totalDays - 7}{' '}
                        {appLocale === 'sv' ? 'dagar av gradvis anpassning' : 'days of gradual adaptation'} ...
                      </div>
                    )}

                    {/* Last 2 days */}
                    {plan.adaptationTimeline.slice(-2).map((day) => (
                      <AdaptationDayCard key={day.day} adaptation={day} locale={appLocale} dateLocale={dateLocale} />
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>

            {/* Warning Signs */}
            <div className="mt-4 rounded-md border p-3">
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>{appLocale === 'sv' ? 'Varningssignaler för höjdsjuka' : 'Altitude sickness warning signs'}</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                {plan.warningSignsToWatch.slice(0, 4).map((sign, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-500">•</span>
                    {sign}
                  </li>
                ))}
              </ul>
            </div>

            {/* General Guidelines */}
            <div className="mt-3 rounded-md border p-3">
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <Mountain className="h-4 w-4 text-purple-500" />
                <span>{appLocale === 'sv' ? 'Allmänna riktlinjer' : 'General guidelines'}</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                {plan.generalGuidelines.slice(0, 4).map((guideline, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-purple-500">•</span>
                    {guideline}
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

function AdaptationDayCard({
  adaptation,
  locale,
  dateLocale,
}: {
  adaptation: DailyAdaptation
  locale: 'en' | 'sv'
  dateLocale: Locale
}) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{locale === 'sv' ? 'Dag' : 'Day'} {adaptation.day}</span>
          <span className="text-xs text-muted-foreground">
            {format(adaptation.date, 'EEE d MMM', { locale: dateLocale })}
          </span>
        </div>
        <Badge className={getPhaseColor(adaptation.phase)}>
          {getAltitudePhaseLabel(adaptation.phase, locale)}
        </Badge>
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
        <div className="flex items-center gap-1">
          <Activity className="h-3 w-3" />
          <span>Max {adaptation.maxIntensity}%</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>+{adaptation.paceAdjustment}s/km</span>
        </div>
        <div className="flex items-center gap-1">
          <Heart className="h-3 w-3" />
          <span>+{adaptation.hrAdjustment}bpm</span>
        </div>
      </div>

      {/* Intensity Progress */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-muted-foreground w-20">{locale === 'sv' ? 'Intensitet' : 'Intensity'}</span>
        <Progress value={adaptation.maxIntensity} className="h-2 flex-1" />
        <span className="text-xs text-muted-foreground w-10">
          {adaptation.maxIntensity}%
        </span>
      </div>

      {/* Recommendations */}
      {adaptation.recommendations.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {adaptation.recommendations.slice(0, 2).map((rec, i) => (
            <Badge key={i} variant="outline" className="text-xs font-normal">
              {rec}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

function getAltitudeCategory(altitude: number, locale: 'en' | 'sv' = 'en'): { label: string; color: string } {
  if (altitude >= 3000) {
    return { label: locale === 'sv' ? 'Hög höjd' : 'High altitude', color: 'text-red-600 bg-red-50 dark:bg-red-950/30' }
  }
  if (altitude >= 2000) {
    return { label: locale === 'sv' ? 'Moderat höjd' : 'Moderate altitude', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30' }
  }
  if (altitude >= 1500) {
    return { label: locale === 'sv' ? 'Låg höjd' : 'Low altitude', color: 'text-green-600 bg-green-50 dark:bg-green-950/30' }
  }
  return { label: 'Under 1500m', color: 'text-gray-600 bg-gray-50 dark:bg-gray-950/30' }
}

function getAltitudePhaseLabel(phase: AdaptationPhase, locale: 'en' | 'sv'): string {
  if (locale === 'sv') {
    return getPhaseLabel(phase, locale)
  }

  switch (phase) {
    case 'PRE_CAMP':
      return 'Before camp'
    case 'ACUTE':
      return 'Acute phase'
    case 'ADAPTATION':
      return 'Adaptation phase'
    case 'OPTIMAL':
      return 'Optimal phase'
    case 'POST_CAMP':
      return 'After camp'
  }
}
