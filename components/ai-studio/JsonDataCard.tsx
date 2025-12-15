'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Trophy,
  Calendar,
  Target,
  Clock,
  TrendingUp,
  Activity,
  User,
  MapPin,
} from 'lucide-react'

interface JsonDataCardProps {
  data: Record<string, unknown>
}

// Try to detect the type of data and render appropriately
export function JsonDataCard({ data }: JsonDataCardProps) {
  // Race/Marathon prediction
  if (data.event || data.prediction || data.equivalent_paces) {
    return <RacePredictionCard data={data} />
  }

  // Training program
  if (data.program || data.weeks || data.sessions) {
    return <ProgramCard data={data} />
  }

  // Athlete data
  if (data.athlete || data.vo2max || data.lactate_threshold) {
    return <AthleteCard data={data} />
  }

  // Generic structured data
  return <GenericDataCard data={data} />
}

function RacePredictionCard({ data }: { data: Record<string, unknown> }) {
  const prediction = data.prediction as Record<string, string> | undefined
  const paces = data.equivalent_paces as Record<string, string> | undefined

  return (
    <Card className="mt-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          {String(data.event || 'Tävlingsprognos')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Date & Athlete */}
        <div className="flex flex-wrap gap-2 text-xs">
          {data.date !== undefined && data.date !== null && (
            <Badge variant="outline" className="gap-1">
              <Calendar className="h-3 w-3" />
              {String(data.date)}
            </Badge>
          )}
          {data.athlete !== undefined && data.athlete !== null && (
            <Badge variant="outline" className="gap-1">
              <User className="h-3 w-3" />
              {String(data.athlete)}
            </Badge>
          )}
        </div>

        {/* Predictions */}
        {prediction && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Prognos</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {prediction.most_likely_time && (
                <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">Mest trolig</p>
                  <p className="font-bold text-green-700 dark:text-green-300">
                    {prediction.most_likely_time || prediction.most_likely_range}
                  </p>
                </div>
              )}
              {(prediction.possible_range || prediction.possible_time) && (
                <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">Möjligt</p>
                  <p className="font-bold text-blue-700 dark:text-blue-300">
                    {prediction.possible_range || prediction.possible_time}
                  </p>
                </div>
              )}
              {(prediction.best_case_range || prediction.best_case_time) && (
                <div className="bg-amber-100 dark:bg-amber-900/30 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">Bästa fall</p>
                  <p className="font-bold text-amber-700 dark:text-amber-300">
                    {prediction.best_case_range || prediction.best_case_time}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Equivalent paces */}
        {paces && Object.keys(paces).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Tempo</p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(paces).slice(0, 6).map(([time, pace]) => (
                <Badge key={time} variant="secondary" className="text-xs">
                  {time}: {String(pace)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Factors */}
        {Array.isArray(data.key_factors) && data.key_factors.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Nyckelfaktorer</p>
            <ul className="text-xs space-y-0.5">
              {(data.key_factors as string[]).slice(0, 4).map((factor, i) => (
                <li key={i} className="flex items-start gap-1">
                  <TrendingUp className="h-3 w-3 mt-0.5 text-green-500 flex-shrink-0" />
                  {String(factor)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {Array.isArray(data.recommendations) && data.recommendations.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Rekommendationer</p>
            <ul className="text-xs space-y-0.5">
              {(data.recommendations as string[]).slice(0, 3).map((rec, i) => (
                <li key={i} className="flex items-start gap-1">
                  <Target className="h-3 w-3 mt-0.5 text-blue-500 flex-shrink-0" />
                  {String(rec)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ProgramCard({ data }: { data: Record<string, unknown> }) {
  return (
    <Card className="mt-3 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-purple-200 dark:border-purple-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calendar className="h-4 w-4 text-purple-500" />
          {String(data.name || data.program || 'Träningsprogram')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 text-xs">
          {data.duration !== undefined && data.duration !== null && (
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              {String(data.duration)}
            </Badge>
          )}
          {data.weeks !== undefined && data.weeks !== null && (
            <Badge variant="outline" className="gap-1">
              {String(data.weeks)} veckor
            </Badge>
          )}
          {data.goal !== undefined && data.goal !== null && (
            <Badge variant="outline" className="gap-1">
              <Target className="h-3 w-3" />
              {String(data.goal)}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function AthleteCard({ data }: { data: Record<string, unknown> }) {
  return (
    <Card className="mt-3 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4 text-green-500" />
          {String(data.athlete || data.name || 'Atletdata')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {data.vo2max !== undefined && data.vo2max !== null && (
            <div className="bg-white/50 dark:bg-white/5 rounded p-2">
              <p className="text-muted-foreground">VO2max</p>
              <p className="font-bold">{String(data.vo2max)} ml/kg/min</p>
            </div>
          )}
          {data.vdot !== undefined && data.vdot !== null && (
            <div className="bg-white/50 dark:bg-white/5 rounded p-2">
              <p className="text-muted-foreground">VDOT</p>
              <p className="font-bold">{String(data.vdot)}</p>
            </div>
          )}
          {data.lactate_threshold !== undefined && data.lactate_threshold !== null && (
            <div className="bg-white/50 dark:bg-white/5 rounded p-2">
              <p className="text-muted-foreground">LT</p>
              <p className="font-bold">{String(data.lactate_threshold)}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function GenericDataCard({ data }: { data: Record<string, unknown> }) {
  // For generic data, show key-value pairs in a nice format
  const entries = Object.entries(data).slice(0, 8)

  return (
    <Card className="mt-3 bg-muted/30">
      <CardContent className="pt-4">
        <div className="grid gap-1 text-xs">
          {entries.map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="text-muted-foreground capitalize">
                {key.replace(/_/g, ' ')}
              </span>
              <span className="font-medium">
                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Helper to try parsing JSON from a code block
export function tryParseJson(content: string): Record<string, unknown> | null {
  try {
    // Try to find JSON in the content
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim())
    }

    // Try parsing the whole content as JSON
    const trimmed = content.trim()
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return JSON.parse(trimmed)
    }

    return null
  } catch {
    return null
  }
}
