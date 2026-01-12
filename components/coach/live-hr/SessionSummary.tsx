'use client'

/**
 * Session Summary
 *
 * Displays summary stats for a live HR session.
 */

import { Card, CardContent } from '@/components/ui/card'
import { ZONE_COLORS } from '@/lib/live-hr/types'
import { Heart, Users, Activity } from 'lucide-react'

interface SessionSummaryProps {
  totalParticipants: number
  activeParticipants: number
  avgHeartRate: number | null
  zoneDistribution: {
    zone1: number
    zone2: number
    zone3: number
    zone4: number
    zone5: number
  }
}

export function SessionSummary({
  totalParticipants,
  activeParticipants,
  avgHeartRate,
  zoneDistribution,
}: SessionSummaryProps) {
  const total = Object.values(zoneDistribution).reduce((sum, count) => sum + count, 0)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {/* Total participants */}
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <Users className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="text-2xl font-bold">{totalParticipants}</p>
            <p className="text-xs text-muted-foreground">Atleter</p>
          </div>
        </CardContent>
      </Card>

      {/* Active (with signal) */}
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <Activity className="h-8 w-8 text-green-500" />
          <div>
            <p className="text-2xl font-bold">{activeParticipants}</p>
            <p className="text-xs text-muted-foreground">Aktiv signal</p>
          </div>
        </CardContent>
      </Card>

      {/* Average HR */}
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <Heart className="h-8 w-8 text-red-500" />
          <div>
            <p className="text-2xl font-bold">
              {avgHeartRate ?? '-'}
            </p>
            <p className="text-xs text-muted-foreground">Snitt puls</p>
          </div>
        </CardContent>
      </Card>

      {/* Zone distribution */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-2">Zonfördelning</p>
          <div className="flex gap-1 h-6">
            {[1, 2, 3, 4, 5].map((zone) => {
              const count = zoneDistribution[`zone${zone}` as keyof typeof zoneDistribution]
              const width = total > 0 ? (count / total) * 100 : 0
              return (
                <div
                  key={zone}
                  className="h-full rounded-sm transition-all duration-300 flex items-center justify-center text-[10px] text-white font-medium"
                  style={{
                    backgroundColor: ZONE_COLORS[zone as keyof typeof ZONE_COLORS],
                    width: `${Math.max(width, count > 0 ? 15 : 0)}%`,
                    minWidth: count > 0 ? '20px' : '0',
                  }}
                >
                  {count > 0 && count}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
