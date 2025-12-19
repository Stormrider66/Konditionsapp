// components/athlete/RecentActivity.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, CheckCircle2, Clock, MapPin } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { sv } from 'date-fns/locale'

import { DashboardActivityLog } from '@/types/prisma-types'
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME, type WorkoutTheme } from '@/lib/themes'

interface RecentActivityProps {
  logs: DashboardActivityLog[]
}

export function RecentActivity({ logs }: RecentActivityProps) {
  const themeContext = useWorkoutThemeOptional()
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME

  if (logs.length === 0) {
    return (
      <Card
        style={{
          backgroundColor: theme.colors.backgroundCard,
          borderColor: theme.colors.border,
        }}
      >
        <CardHeader>
          <CardTitle
            className="flex items-center gap-2"
            style={{ color: theme.colors.textPrimary }}
          >
            <Activity className="h-5 w-5" />
            Senaste aktivitet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity
              className="mx-auto h-12 w-12 mb-4"
              style={{ color: theme.colors.textMuted }}
            />
            <p style={{ color: theme.colors.textMuted }}>Ingen aktivitet ännu</p>
            <p className="text-sm mt-2" style={{ color: theme.colors.textMuted }}>
              Logga ditt första träningspass för att komma igång
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      style={{
        backgroundColor: theme.colors.backgroundCard,
        borderColor: theme.colors.border,
      }}
    >
      <CardHeader>
        <CardTitle
          className="flex items-center gap-2"
          style={{ color: theme.colors.textPrimary }}
        >
          <Activity className="h-5 w-5" />
          Senaste aktivitet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {logs.map((log) => (
          <LogCard key={log.id} log={log} theme={theme} />
        ))}
      </CardContent>
    </Card>
  )
}

function LogCard({ log, theme }: { log: DashboardActivityLog; theme: WorkoutTheme }) {
  return (
    <div
      className="border rounded-lg p-3 space-y-2"
      style={{
        backgroundColor: theme.colors.background,
        borderColor: theme.colors.border,
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {log.completed && (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            )}
            <h4
              className="font-medium text-sm"
              style={{ color: theme.colors.textPrimary }}
            >
              {log.workout?.name}
            </h4>
          </div>
          <p className="text-xs" style={{ color: theme.colors.textMuted }}>
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

      <div className="flex items-center gap-4 text-xs" style={{ color: theme.colors.textMuted }}>
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
        <p className="text-xs line-clamp-2" style={{ color: theme.colors.textMuted }}>
          {log.notes}
        </p>
      )}

      {log.coachFeedback && (
        <div
          className="rounded p-2"
          style={{
            backgroundColor: theme.id === 'FITAPP_DARK' ? '#1e3a5f' : '#eff6ff',
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: theme.id === 'FITAPP_DARK' ? '#3b82f6' : '#bfdbfe',
          }}
        >
          <p
            className="text-xs font-medium mb-1"
            style={{ color: theme.id === 'FITAPP_DARK' ? '#93c5fd' : '#1e3a8a' }}
          >
            Feedback från tränare:
          </p>
          <p
            className="text-xs"
            style={{ color: theme.id === 'FITAPP_DARK' ? '#bfdbfe' : '#1e40af' }}
          >
            {log.coachFeedback}
          </p>
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
