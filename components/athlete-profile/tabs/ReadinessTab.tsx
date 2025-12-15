'use client'

import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { Gauge, Heart, Moon, Brain, Activity, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { AthleteProfileData } from '@/lib/athlete-profile/data-fetcher'

interface ReadinessTabProps {
  data: AthleteProfileData
  viewMode: 'coach' | 'athlete'
}

export function ReadinessTab({ data, viewMode }: ReadinessTabProps) {
  const { dailyCheckIns, dailyMetrics } = data.health
  const { cycles } = data.menstrual
  const athleteProfile = data.identity.athleteProfile
  const client = data.identity.client!

  const latestCheckIn = dailyCheckIns[0]
  const latestMetrics = dailyMetrics[0]
  const latestCycle = cycles[0]

  // Show menstrual data only for females
  const showMenstrual = client.gender === 'FEMALE' && cycles.length > 0

  // Prepare chart data
  const chartData = [...dailyCheckIns]
    .reverse()
    .slice(-14) // Last 14 days
    .map((checkIn) => ({
      date: format(new Date(checkIn.date), 'EEE', { locale: sv }),
      readiness: checkIn.readinessScore,
      sleep: checkIn.sleepQuality,
      fatigue: checkIn.fatigue ? 10 - checkIn.fatigue : null, // Invert for chart
    }))

  const hasData = dailyCheckIns.length > 0 || dailyMetrics.length > 0

  if (!hasData) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Gauge className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen beredskapsdata</h3>
          <p className="text-gray-500">
            Aktivera daglig incheckning för att spåra träningsberedskap.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current Readiness Score */}
      {latestCheckIn && (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Large Score */}
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">Dagens beredskap</p>
                <div
                  className={`text-6xl font-bold ${getReadinessColor(
                    latestCheckIn.readinessScore || 0
                  )}`}
                >
                  {latestCheckIn.readinessScore?.toFixed(0) || '-'}
                </div>
                <p className="text-sm text-gray-500 mt-1">av 10</p>
                {latestCheckIn.readinessDecision && (
                  <Badge
                    className="mt-2"
                    variant={getDecisionVariant(latestCheckIn.readinessDecision)}
                  >
                    {getDecisionLabel(latestCheckIn.readinessDecision)}
                  </Badge>
                )}
              </div>

              {/* Factor Breakdown */}
              <div className="flex-1 w-full">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FactorCard
                    icon={Moon}
                    label="Sömn"
                    value={latestCheckIn.sleepQuality}
                    subValue={latestCheckIn.sleepHours ? `${latestCheckIn.sleepHours}h` : undefined}
                  />
                  <FactorCard
                    icon={Activity}
                    label="Trötthet"
                    value={latestCheckIn.fatigue}
                    inverted
                  />
                  <FactorCard
                    icon={Heart}
                    label="Ömhet"
                    value={latestCheckIn.soreness}
                    inverted
                  />
                  <FactorCard
                    icon={Brain}
                    label="Stress"
                    value={latestCheckIn.stress}
                    inverted
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* HRV & RHR (if available) */}
      {(latestMetrics?.hrvRMSSD || latestMetrics?.restingHR || athleteProfile?.hrvBaseline) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* HRV Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-500" />
                HRV
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">
                  {latestMetrics?.hrvRMSSD?.toFixed(0) || '-'}
                </span>
                <span className="text-gray-500">ms</span>
                {latestMetrics?.hrvStatus && (
                  <Badge variant={getHrvStatusVariant(latestMetrics.hrvStatus)}>
                    {getHrvStatusLabel(latestMetrics.hrvStatus)}
                  </Badge>
                )}
              </div>
              {athleteProfile?.hrvBaseline && (
                <p className="text-sm text-gray-500 mt-2">
                  Baseline: {athleteProfile.hrvBaseline.toFixed(0)} ms
                </p>
              )}
              {latestMetrics?.hrvTrend && (
                <div className="flex items-center gap-1 mt-2 text-sm">
                  {latestMetrics.hrvTrend === 'UP' ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : latestMetrics.hrvTrend === 'DOWN' ? (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  ) : (
                    <span className="text-gray-400">→</span>
                  )}
                  <span className="text-gray-600">
                    {latestMetrics.hrvPercent
                      ? `${latestMetrics.hrvPercent > 0 ? '+' : ''}${latestMetrics.hrvPercent.toFixed(0)}% från baseline`
                      : ''}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* RHR Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500" />
                Vilopuls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">
                  {latestCheckIn?.restingHR || latestMetrics?.restingHR || '-'}
                </span>
                <span className="text-gray-500">bpm</span>
                {latestMetrics?.restingHRStatus && (
                  <Badge variant={getRhrStatusVariant(latestMetrics.restingHRStatus)}>
                    {getRhrStatusLabel(latestMetrics.restingHRStatus)}
                  </Badge>
                )}
              </div>
              {athleteProfile?.rhrBaseline && (
                <p className="text-sm text-gray-500 mt-2">
                  Baseline: {athleteProfile.rhrBaseline} bpm
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Readiness Trend Chart */}
      {chartData.length >= 7 && (
        <Card>
          <CardHeader>
            <CardTitle>Beredskapstrend</CardTitle>
            <CardDescription>Senaste 14 dagarna</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis domain={[0, 10]} fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="readiness"
                    name="Beredskap"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="sleep"
                    name="Sömn"
                    stroke="#8b5cf6"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Menstrual Cycle (if applicable) */}
      {showMenstrual && latestCycle && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-pink-500" />
              Menscykel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-pink-50 rounded-lg">
                <p className="text-xs text-gray-500">Nuvarande fas</p>
                <p className="font-medium text-pink-800">
                  {getCyclePhaseLabel(latestCycle.currentPhase || '')}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Cykeldag</p>
                <p className="font-medium">
                  Dag {calculateCycleDay(latestCycle.startDate)}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Cykellängd</p>
                <p className="font-medium">
                  {latestCycle.cycleLength || '~28'} dagar
                </p>
              </div>
              {latestCycle.ovulationDate && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Ägglossning</p>
                  <p className="font-medium">
                    {format(new Date(latestCycle.ovulationDate), 'd MMM', { locale: sv })}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Red/Yellow Flags */}
      {latestMetrics?.redFlags && latestMetrics.redFlags.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Varningar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {latestMetrics.redFlags.map((flag, idx) => (
                <li key={idx} className="flex items-center gap-2 text-red-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  {flag}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Check-in History */}
      <Card>
        <CardHeader>
          <CardTitle>Incheckningshistorik</CardTitle>
          <CardDescription>Senaste 7 dagarna</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {dailyCheckIns.slice(0, 7).map((checkIn) => (
              <div
                key={checkIn.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${getReadinessBgColor(
                      checkIn.readinessScore || 0
                    )}`}
                  >
                    {checkIn.readinessScore?.toFixed(0) || '-'}
                  </div>
                  <div>
                    <p className="font-medium">
                      {format(new Date(checkIn.date), 'EEEE d MMMM', { locale: sv })}
                    </p>
                    {checkIn.readinessDecision && (
                      <Badge variant="outline" className="text-xs">
                        {getDecisionLabel(checkIn.readinessDecision)}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  {checkIn.sleepHours && <span>😴 {checkIn.sleepHours}h</span>}
                  {checkIn.fatigue && <span>💪 {10 - checkIn.fatigue}/10</span>}
                  {checkIn.restingHR && <span>❤️ {checkIn.restingHR}</span>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Helper components
function FactorCard({
  icon: Icon,
  label,
  value,
  subValue,
  inverted = false,
}: {
  icon: React.ElementType
  label: string
  value: number | null
  subValue?: string
  inverted?: boolean
}) {
  const displayValue = value !== null ? value : '-'
  const color = value !== null ? getFactorColor(inverted ? 10 - value : value) : 'text-gray-400'

  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2 text-gray-500 mb-1">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-bold ${color}`}>{displayValue}</span>
        <span className="text-xs text-gray-400">/10</span>
      </div>
      {subValue && <p className="text-xs text-gray-500 mt-1">{subValue}</p>}
    </div>
  )
}

// Helper functions
function getReadinessColor(score: number): string {
  if (score >= 7) return 'text-green-600'
  if (score >= 5) return 'text-yellow-600'
  return 'text-red-600'
}

function getReadinessBgColor(score: number): string {
  if (score >= 7) return 'bg-green-100 text-green-700'
  if (score >= 5) return 'bg-yellow-100 text-yellow-700'
  return 'bg-red-100 text-red-700'
}

function getFactorColor(value: number): string {
  if (value >= 7) return 'text-green-600'
  if (value >= 5) return 'text-yellow-600'
  return 'text-red-600'
}

function getDecisionVariant(decision: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (decision) {
    case 'PROCEED':
      return 'default'
    case 'REDUCE':
    case 'EASY':
      return 'secondary'
    case 'REST':
      return 'destructive'
    default:
      return 'outline'
  }
}

function getDecisionLabel(decision: string): string {
  const labels: Record<string, string> = {
    PROCEED: 'Normal träning',
    REDUCE: 'Reducera',
    EASY: 'Lätt träning',
    REST: 'Vila',
  }
  return labels[decision] || decision
}

function getHrvStatusVariant(status: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'OPTIMAL':
      return 'default'
    case 'ELEVATED':
      return 'secondary'
    case 'SUPPRESSED':
      return 'destructive'
    default:
      return 'outline'
  }
}

function getHrvStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    OPTIMAL: 'Optimal',
    ELEVATED: 'Förhöjd',
    SUPPRESSED: 'Sänkt',
    NORMAL: 'Normal',
  }
  return labels[status] || status
}

function getRhrStatusVariant(status: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'NORMAL':
      return 'default'
    case 'ELEVATED':
      return 'secondary'
    case 'HIGH':
      return 'destructive'
    default:
      return 'outline'
  }
}

function getRhrStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    NORMAL: 'Normal',
    ELEVATED: 'Förhöjd',
    HIGH: 'Hög',
    LOW: 'Låg',
  }
  return labels[status] || status
}

function getCyclePhaseLabel(phase: string): string {
  const labels: Record<string, string> = {
    MENSTRUAL: 'Menstruation',
    FOLLICULAR: 'Follikelfas',
    OVULATORY: 'Ägglossning',
    LUTEAL: 'Lutealfas',
  }
  return labels[phase] || phase
}

function calculateCycleDay(startDate: Date): number {
  const start = new Date(startDate)
  const now = new Date()
  const diffMs = now.getTime() - start.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1
}
