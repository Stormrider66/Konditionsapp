// components/athlete/RecentActivity.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, CheckCircle2, Clock, MapPin } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { sv } from 'date-fns/locale'

interface RecentActivityProps {
  logs: any[]
}

export function RecentActivity({ logs }: RecentActivityProps) {
  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Senaste aktivitet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Ingen aktivitet ännu</p>
            <p className="text-sm text-muted-foreground mt-2">
              Logga ditt första träningspass för att komma igång
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Senaste aktivitet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {logs.map((log) => (
          <LogCard key={log.id} log={log} />
        ))}
      </CardContent>
    </Card>
  )
}

function LogCard({ log }: { log: any }) {
  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {log.completed && (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            )}
            <h4 className="font-medium text-sm">{log.workout?.name}</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            {log.completedAt &&
              formatDistanceToNow(new Date(log.completedAt), {
                addSuffix: true,
                locale: sv,
              })}
          </p>
        </div>
        {log.perceivedEffort && (
          <Badge variant="outline" className={getEffortBadgeClass(log.perceivedEffort)}>
            RPE {log.perceivedEffort}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {log.duration && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {log.duration} min
          </span>
        )}
        {log.distance && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {log.distance.toFixed(1)} km
          </span>
        )}
        {log.avgHR && (
          <span className="flex items-center gap-1">
            ❤️ {log.avgHR} bpm
          </span>
        )}
      </div>

      {log.notes && (
        <p className="text-xs text-muted-foreground line-clamp-2">{log.notes}</p>
      )}

      {log.coachFeedback && (
        <div className="bg-blue-50 border border-blue-200 rounded p-2">
          <p className="text-xs font-medium text-blue-900 mb-1">
            Feedback från tränare:
          </p>
          <p className="text-xs text-blue-800">{log.coachFeedback}</p>
        </div>
      )}
    </div>
  )
}

function getEffortBadgeClass(effort: number): string {
  if (effort <= 3) return 'border-green-300 text-green-700'
  if (effort <= 5) return 'border-yellow-300 text-yellow-700'
  if (effort <= 7) return 'border-orange-300 text-orange-700'
  return 'border-red-300 text-red-700'
}
