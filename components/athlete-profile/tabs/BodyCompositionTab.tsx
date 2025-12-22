'use client'

import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import Link from 'next/link'
import { Scale, TrendingUp, TrendingDown, Droplets, Flame, Activity, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

interface BodyCompositionTabProps {
  data: AthleteProfileData
  viewMode: 'coach' | 'athlete'
}

export function BodyCompositionTab({ data, viewMode }: BodyCompositionTabProps) {
  const { measurements } = data.bodyComposition
  const client = data.identity.client!

  const latestMeasurement = measurements[0]

  if (measurements.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Scale className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen kroppssammansättningsdata</h3>
          <p className="text-gray-500 mb-4">
            Registrera bioimpedansmätningar för att se data här.
          </p>
          {viewMode === 'athlete' && (
            <Link href="/athlete/body-composition">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Lägg till mätning
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    )
  }

  // Prepare chart data (reverse for chronological order)
  const chartData = [...measurements]
    .reverse()
    .map((m) => ({
      date: format(new Date(m.measurementDate), 'd MMM', { locale: sv }),
      weight: m.weightKg,
      bodyFat: m.bodyFatPercent,
      muscle: m.muscleMassKg,
    }))

  // Calculate trends
  const weightTrend = calculateTrend(measurements.map((m) => m.weightKg).filter(Boolean) as number[])
  const fatTrend = calculateTrend(measurements.map((m) => m.bodyFatPercent).filter(Boolean) as number[])
  const muscleTrend = calculateTrend(measurements.map((m) => m.muscleMassKg).filter(Boolean) as number[])

  // Calculate progress over time periods
  const progressSummary = calculateProgressSummary(measurements)

  return (
    <div className="space-y-6">
      {/* Header with Add Button for Athletes */}
      {viewMode === 'athlete' && (
        <div className="flex justify-end">
          <Link href="/athlete/body-composition">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Ny mätning
            </Button>
          </Link>
        </div>
      )}

      {/* Current Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={Scale}
          iconColor="text-blue-500"
          label="Vikt"
          value={latestMeasurement.weightKg ? `${latestMeasurement.weightKg.toFixed(1)}` : client.weight.toString()}
          unit="kg"
          trend={weightTrend}
        />

        <MetricCard
          icon={Activity}
          iconColor="text-purple-500"
          label="Kroppsfett"
          value={latestMeasurement.bodyFatPercent ? `${latestMeasurement.bodyFatPercent.toFixed(1)}` : '-'}
          unit="%"
          trend={fatTrend}
        />

        <MetricCard
          icon={Flame}
          iconColor="text-orange-500"
          label="Muskelmassa"
          value={latestMeasurement.muscleMassKg ? `${latestMeasurement.muscleMassKg.toFixed(1)}` : '-'}
          unit="kg"
          trend={muscleTrend}
          trendInverted
        />

        <MetricCard
          icon={Droplets}
          iconColor="text-cyan-500"
          label="Vätska"
          value={latestMeasurement.waterPercent ? `${latestMeasurement.waterPercent.toFixed(1)}` : '-'}
          unit="%"
        />
      </div>

      {/* Weight & Body Fat Chart */}
      {measurements.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Vikttrend</CardTitle>
            <CardDescription>
              Vikt och kroppsfett över tid ({measurements.length} mätningar)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis yAxisId="weight" orientation="left" domain={['auto', 'auto']} fontSize={12} />
                  <YAxis yAxisId="fat" orientation="right" domain={['auto', 'auto']} fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="weight"
                    type="monotone"
                    dataKey="weight"
                    name="Vikt (kg)"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    yAxisId="fat"
                    type="monotone"
                    dataKey="bodyFat"
                    name="Fett (%)"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Summary */}
      {progressSummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Förändring över tid</CardTitle>
            <CardDescription>
              Jämförelse mot tidigare mätningar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Period</th>
                    <th className="text-right py-2 font-medium">Vikt</th>
                    <th className="text-right py-2 font-medium">Kroppsfett</th>
                    <th className="text-right py-2 font-medium">Muskelmassa</th>
                  </tr>
                </thead>
                <tbody>
                  {progressSummary.map((period) => (
                    <tr key={period.label} className="border-b last:border-0">
                      <td className="py-3 font-medium">{period.label}</td>
                      <td className="py-3 text-right">
                        {period.weight !== null ? (
                          <span className={period.weight < 0 ? 'text-green-600' : period.weight > 0 ? 'text-red-600' : ''}>
                            {period.weight > 0 ? '+' : ''}{period.weight.toFixed(1)} kg
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-3 text-right">
                        {period.bodyFat !== null ? (
                          <span className={period.bodyFat < 0 ? 'text-green-600' : period.bodyFat > 0 ? 'text-red-600' : ''}>
                            {period.bodyFat > 0 ? '+' : ''}{period.bodyFat.toFixed(1)}%
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-3 text-right">
                        {period.muscle !== null ? (
                          <span className={period.muscle > 0 ? 'text-green-600' : period.muscle < 0 ? 'text-red-600' : ''}>
                            {period.muscle > 0 ? '+' : ''}{period.muscle.toFixed(1)} kg
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Metrics */}
      {latestMeasurement && (
        <Card>
          <CardHeader>
            <CardTitle>Senaste mätning</CardTitle>
            <CardDescription>
              {format(new Date(latestMeasurement.measurementDate), 'd MMMM yyyy', { locale: sv })}
              {latestMeasurement.deviceBrand && ` • ${latestMeasurement.deviceBrand}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <DetailItem label="Vikt" value={latestMeasurement.weightKg} unit="kg" />
              <DetailItem label="Kroppsfett" value={latestMeasurement.bodyFatPercent} unit="%" />
              <DetailItem label="Muskelmassa" value={latestMeasurement.muscleMassKg} unit="kg" />
              <DetailItem label="Vätska" value={latestMeasurement.waterPercent} unit="%" />
              <DetailItem label="Visceralt fett" value={latestMeasurement.visceralFat} />
              <DetailItem label="Benmassa" value={latestMeasurement.boneMassKg} unit="kg" />
              <DetailItem label="BMR" value={latestMeasurement.bmrKcal} unit="kcal" />
              <DetailItem label="Metabolisk ålder" value={latestMeasurement.metabolicAge} unit="år" />
              <DetailItem label="BMI" value={latestMeasurement.bmi} />
              <DetailItem label="FFMI" value={latestMeasurement.ffmi} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Measurement History */}
      <Card>
        <CardHeader>
          <CardTitle>Mäthistorik</CardTitle>
          <CardDescription>{measurements.length} mätningar registrerade</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {measurements.slice(0, 10).map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <p className="font-medium">
                    {format(new Date(m.measurementDate), 'd MMMM yyyy', { locale: sv })}
                  </p>
                  <p className="text-sm text-gray-500">
                    {m.measurementTime ? getMeasurementTimeLabel(m.measurementTime) : ''}
                    {m.deviceBrand && ` • ${m.deviceBrand}`}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  {m.weightKg && (
                    <span>
                      <span className="text-gray-500">Vikt:</span>{' '}
                      <span className="font-medium">{m.weightKg.toFixed(1)} kg</span>
                    </span>
                  )}
                  {m.bodyFatPercent && (
                    <span>
                      <span className="text-gray-500">Fett:</span>{' '}
                      <span className="font-medium">{m.bodyFatPercent.toFixed(1)}%</span>
                    </span>
                  )}
                </div>
              </div>
            ))}

            {measurements.length > 10 && (
              <p className="text-center text-sm text-gray-500 py-2">
                +{measurements.length - 10} äldre mätningar
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Helper components
function MetricCard({
  icon: Icon,
  iconColor,
  label,
  value,
  unit,
  trend,
  trendInverted = false,
}: {
  icon: React.ElementType
  iconColor: string
  label: string
  value: string
  unit?: string
  trend?: { direction: 'up' | 'down' | 'stable'; value: number } | null
  trendInverted?: boolean // If true, up is good (e.g., muscle mass)
}) {
  const isPositive = trendInverted
    ? trend?.direction === 'up'
    : trend?.direction === 'down'

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500">{label}</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold">{value}</span>
              {unit && <span className="text-sm text-gray-500">{unit}</span>}
            </div>
            {trend && trend.direction !== 'stable' && (
              <div
                className={`flex items-center gap-1 text-xs mt-1 ${
                  isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {trend.direction === 'down' ? (
                  <TrendingDown className="h-3 w-3" />
                ) : (
                  <TrendingUp className="h-3 w-3" />
                )}
                <span>{Math.abs(trend.value).toFixed(1)}</span>
              </div>
            )}
          </div>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </CardContent>
    </Card>
  )
}

function DetailItem({
  label,
  value,
  unit,
}: {
  label: string
  value: number | null
  unit?: string
}) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold">
        {value !== null ? (
          <>
            {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}
            {unit && <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>}
          </>
        ) : (
          '-'
        )}
      </p>
    </div>
  )
}

// Helper functions
function calculateTrend(values: number[]): { direction: 'up' | 'down' | 'stable'; value: number } | null {
  if (values.length < 2) return null

  const current = values[0]
  const previous = values[1]
  const diff = current - previous

  if (Math.abs(diff) < 0.1) {
    return { direction: 'stable', value: 0 }
  }

  return {
    direction: diff > 0 ? 'up' : 'down',
    value: diff,
  }
}

function getMeasurementTimeLabel(time: string): string {
  const labels: Record<string, string> = {
    MORNING_FASTED: 'Morgon (fastande)',
    MORNING: 'Morgon',
    AFTERNOON: 'Eftermiddag',
    EVENING: 'Kväll',
    POST_WORKOUT: 'Efter träning',
  }
  return labels[time] || time
}

interface ProgressPeriod {
  label: string
  weight: number | null
  bodyFat: number | null
  muscle: number | null
}

function calculateProgressSummary(measurements: Array<{
  measurementDate: string | Date
  weightKg: number | null
  bodyFatPercent: number | null
  muscleMassKg: number | null
}>): ProgressPeriod[] {
  if (measurements.length < 2) return []

  const now = new Date()
  const latest = measurements[0]

  const periods = [
    { label: '1 vecka', days: 7 },
    { label: '1 månad', days: 30 },
    { label: '3 månader', days: 90 },
  ]

  return periods.map((period) => {
    const targetDate = new Date(now)
    targetDate.setDate(targetDate.getDate() - period.days)

    // Find measurement closest to target date
    const older = measurements.find((m) => {
      const date = new Date(m.measurementDate)
      return date <= targetDate
    })

    if (!older) {
      return { label: period.label, weight: null, bodyFat: null, muscle: null }
    }

    return {
      label: period.label,
      weight: latest.weightKg && older.weightKg ? latest.weightKg - older.weightKg : null,
      bodyFat: latest.bodyFatPercent && older.bodyFatPercent ? latest.bodyFatPercent - older.bodyFatPercent : null,
      muscle: latest.muscleMassKg && older.muscleMassKg ? latest.muscleMassKg - older.muscleMassKg : null,
    }
  }).filter((p) => p.weight !== null || p.bodyFat !== null || p.muscle !== null)
}
