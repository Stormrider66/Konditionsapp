'use client'

/**
 * Illness Protocol Preview Component
 *
 * Displays a preview of the return-to-training protocol based on illness details.
 * Used in EventFormDialog when illness type is selected.
 */

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Heart,
  Activity,
  Shield,
  AlertTriangle,
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
  generateReturnProtocol,
  getIntensityColor,
  getIntensityLabel,
  type IllnessInfo,
  type ReturnProtocol,
  type ReturnPhase,
} from '@/lib/calendar/illness-protocol'

interface IllnessProtocolPreviewProps {
  illnessType: string
  startDate: Date
  endDate: Date
  hadFever?: boolean
  feverDays?: number
  symptomsBelowNeck?: boolean
  showDetails?: boolean
}

export function IllnessProtocolPreview({
  illnessType,
  startDate,
  endDate,
  hadFever = false,
  feverDays = 0,
  symptomsBelowNeck = false,
  showDetails = true,
}: IllnessProtocolPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const protocol = useMemo(() => {
    if (!illnessType || !startDate || !endDate) return null

    const info: IllnessInfo = {
      type: illnessType as IllnessInfo['type'],
      startDate,
      endDate,
      hadFever,
      feverDays: hadFever ? feverDays : 0,
      symptomsBelowNeck,
    }

    return generateReturnProtocol(info)
  }, [illnessType, startDate, endDate, hadFever, feverDays, symptomsBelowNeck])

  if (!protocol) return null

  return (
    <div className="mt-4 rounded-lg border bg-muted/30 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
          <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium">Återgångsprotokoll</h4>
          <p className="text-sm text-muted-foreground">
            {protocol.totalDays} dagars gradvis återgång till träning
          </p>
        </div>
      </div>

      {/* Medical Clearance Warning */}
      {protocol.requiresMedicalClearance && (
        <div className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 p-3 text-amber-800 dark:text-amber-200">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">Läkargodkännande krävs</p>
            <p className="text-xs mt-0.5">{protocol.medicalClearanceReason}</p>
          </div>
        </div>
      )}

      {/* Quick Summary */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md bg-background p-2">
          <p className="text-xs text-muted-foreground">Start</p>
          <p className="font-medium text-sm">
            {format(protocol.startDate, 'd MMM', { locale: sv })}
          </p>
        </div>
        <div className="rounded-md bg-background p-2">
          <p className="text-xs text-muted-foreground">Dagar</p>
          <p className="font-medium text-sm">{protocol.totalDays}</p>
        </div>
        <div className="rounded-md bg-background p-2">
          <p className="text-xs text-muted-foreground">Normal träning</p>
          <p className="font-medium text-sm">
            {format(protocol.endDate, 'd MMM', { locale: sv })}
          </p>
        </div>
      </div>

      {/* Phase Timeline */}
      {showDetails && (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className="mt-4">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span>Visa detaljerat schema</span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ScrollArea className="mt-3 max-h-[300px]">
              <div className="space-y-3">
                {protocol.phases.map((phase) => (
                  <PhaseCard key={phase.day} phase={phase} />
                ))}
              </div>
            </ScrollArea>

            {/* Warning Signs */}
            <div className="mt-4 rounded-md border p-3">
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>Varningssignaler att bevaka</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                {protocol.warningSignsToWatch.slice(0, 4).map((sign, i) => (
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
                <Shield className="h-4 w-4 text-blue-500" />
                <span>Allmänna riktlinjer</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                {protocol.generalGuidelines.slice(0, 4).map((guideline, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-blue-500">•</span>
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

function PhaseCard({ phase }: { phase: ReturnPhase }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Dag {phase.day}</span>
          <span className="text-xs text-muted-foreground">
            {format(phase.date, 'EEE d MMM', { locale: sv })}
          </span>
        </div>
        <Badge className={getIntensityColor(phase.intensity)}>
          {getIntensityLabel(phase.intensity)}
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground mb-2">{phase.description}</p>

      {/* Intensity Progress */}
      <div className="flex items-center gap-2 mb-2">
        <Progress value={phase.intensityPercent} className="h-2 flex-1" />
        <span className="text-xs text-muted-foreground w-10">
          {phase.intensityPercent}%
        </span>
      </div>

      {/* Duration and Readiness */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {phase.durationMinutes > 0 && (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{phase.durationMinutes} min</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Heart className="h-3 w-3" />
          <span>Kontroll: {phase.readinessCheck.split('?')[0]}...</span>
        </div>
      </div>

      {/* Activities */}
      {phase.activities.length > 0 && phase.intensity !== 'NONE' && (
        <div className="mt-2 flex flex-wrap gap-1">
          {phase.activities.slice(0, 3).map((activity, i) => (
            <Badge key={i} variant="outline" className="text-xs font-normal">
              {activity}
            </Badge>
          ))}
        </div>
      )}

      {/* Warnings */}
      {phase.warnings.length > 0 && (
        <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          ⚠️ {phase.warnings[0]}
        </div>
      )}
    </div>
  )
}
