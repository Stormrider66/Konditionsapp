'use client'

import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { Scale, TrendingUp, TrendingDown, Droplets, Flame, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
          <p className="text-gray-500">
            Registrera bioimpedansmätningar för att se data här.
          </p>
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

  return (
    <div className="space-y-6">
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
}: {
  icon: React.ElementType
  iconColor: string
  label: string
  value: string
  unit?: string
  trend?: { direction: 'up' | 'down' | 'stable'; value: number } | null
}) {
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
                  trend.direction === 'down' ? 'text-green-600' : 'text-red-600'
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
