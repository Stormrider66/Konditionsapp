'use client'

/**
 * Athlete HR Card
 *
 * Displays a single athlete's live heart rate with zone coloring.
 */

import { LiveHRParticipantData, ZONE_COLORS, ZONE_NAMES_SV } from '@/lib/live-hr/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Heart, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AthleteHRCardProps {
  participant: LiveHRParticipantData
  onRemove?: (clientId: string) => void
}

export function AthleteHRCard({ participant, onRemove }: AthleteHRCardProps) {
  const { clientName, heartRate, zone, isStale } = participant

  const zoneColor = zone ? ZONE_COLORS[zone as keyof typeof ZONE_COLORS] : '#6B7280'
  const zoneName = zone ? ZONE_NAMES_SV[zone as keyof typeof ZONE_NAMES_SV] : 'Okänd'

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-300',
        isStale && 'opacity-60',
        !isStale && heartRate && 'ring-2'
      )}
      style={{
        borderColor: !isStale && heartRate ? zoneColor : undefined,
        boxShadow: !isStale && heartRate ? `0 0 20px ${zoneColor}40` : undefined,
      }}
    >
      {/* Zone color bar at top */}
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: zoneColor }}
      />

      <CardContent className="p-4">
        {/* Athlete name */}
        <div className="flex items-center justify-between mb-3">
          <span className="font-medium text-sm truncate">{clientName}</span>
          {onRemove && (
            <button
              onClick={() => onRemove(participant.clientId)}
              className="text-muted-foreground hover:text-destructive text-xs"
            >
              Ta bort
            </button>
          )}
        </div>

        {/* Heart rate display */}
        <div className="flex items-center justify-center gap-2 mb-3">
          {heartRate ? (
            <>
              <Heart
                className={cn(
                  'h-6 w-6',
                  !isStale && 'animate-pulse'
                )}
                style={{ color: zoneColor }}
                fill={!isStale ? zoneColor : 'none'}
              />
              <span
                className="text-4xl font-bold tabular-nums"
                style={{ color: zoneColor }}
              >
                {heartRate}
              </span>
              <span className="text-muted-foreground text-sm">bpm</span>
            </>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">Väntar på data...</span>
            </div>
          )}
        </div>

        {/* Zone badge */}
        <div className="flex justify-center">
          {zone && heartRate ? (
            <Badge
              variant="secondary"
              className="text-white text-xs"
              style={{ backgroundColor: zoneColor }}
            >
              Zon {zone} - {zoneName}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              {isStale ? 'Ingen signal' : 'Väntar...'}
            </Badge>
          )}
        </div>

        {/* Stale indicator */}
        {isStale && heartRate && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background/80 p-2 rounded-md">
            <span className="text-xs text-muted-foreground">Ingen signal</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
