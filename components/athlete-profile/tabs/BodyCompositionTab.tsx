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
  variant?: 'default' | 'glass'
}

import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
  GlassCardDescription
} from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'

export function BodyCompositionTab({ data, viewMode, variant = 'default' }: BodyCompositionTabProps) {
  const isGlass = variant === 'glass'
  const { measurements } = data.bodyComposition
  const client = data.identity.client!

  const latestMeasurement = measurements[0]

  const CardWrapper = isGlass ? GlassCard : Card;

  if (measurements.length === 0) {
    return (
      <CardWrapper>
        <CardContent className="py-20 text-center">
          <Scale className={cn("h-16 w-16 mx-auto mb-6", isGlass ? "text-white/10" : "text-gray-300")} />
          <h3 className={cn("text-xl font-black uppercase italic tracking-tight mb-2", isGlass ? "text-slate-900 dark:text-white" : "text-gray-900")}>
            Ingen kroppssammansättningsdata
          </h3>
          <p className={cn("font-medium mb-8 max-w-sm mx-auto", isGlass ? "text-slate-500" : "text-gray-500")}>
            Registrera bioimpedansmätningar för att se data här.
          </p>
          {viewMode === 'athlete' && (
            <Link href="/athlete/body-composition">
              <Button className={isGlass ? "bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs h-12 px-8 rounded-xl" : ""}>
                <Plus className="h-4 w-4 mr-2" />
                Lägg till mätning
              </Button>
            </Link>
          )}
        </CardContent>
      </CardWrapper>
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
    <div className="space-y-8">
      {/* Header with Add Button for Athletes */}
      {viewMode === 'athlete' && (
        <div className="flex justify-end">
          <Link href="/athlete/body-composition">
            <Button className={cn(
              "h-11 px-6 rounded-xl font-black uppercase tracking-widest text-[10px]",
              isGlass ? "bg-blue-600 hover:bg-blue-700 text-white" : ""
            )}>
              <Plus className="h-4 w-4 mr-2" />
              Ny mätning
            </Button>
          </Link>
        </div>
      )}

      {/* Current Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Scale}
          accentColor="blue"
          label="Vikt"
          value={latestMeasurement.weightKg ? `${latestMeasurement.weightKg.toFixed(1)}` : client.weight.toString()}
          unit="kg"
          trend={weightTrend}
          isGlass={isGlass}
        />

        <MetricCard
          icon={Activity}
          accentColor="purple"
          label="Kroppsfett"
          value={latestMeasurement.bodyFatPercent ? `${latestMeasurement.bodyFatPercent.toFixed(1)}` : '-'}
          unit="%"
          trend={fatTrend}
          isGlass={isGlass}
        />

        <MetricCard
          icon={Flame}
          accentColor="orange"
          label="Muskelmassa"
          value={latestMeasurement.muscleMassKg ? `${latestMeasurement.muscleMassKg.toFixed(1)}` : '-'}
          unit="kg"
          trend={muscleTrend}
          trendInverted
          isGlass={isGlass}
        />

        <MetricCard
          icon={Droplets}
          accentColor="cyan"
          label="Vätska"
          value={latestMeasurement.waterPercent ? `${latestMeasurement.waterPercent.toFixed(1)}` : '-'}
          unit="%"
          isGlass={isGlass}
        />
      </div>

      {/* Weight & Body Fat Chart */}
      {measurements.length >= 2 && (
        <CardWrapper>
          <CardHeader>
            <CardTitle className={cn("text-xl font-black uppercase italic tracking-tight", isGlass ? "text-white" : "")}>Vikttrend</CardTitle>
            <CardDescription className={cn("font-black uppercase tracking-widest text-[10px]", isGlass ? "text-slate-500" : "")}>
              Vikt och kroppsfett över tid ({measurements.length} mätningar)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis
                    dataKey="date"
                    fontSize={10}
                    tick={{ fill: isGlass ? '#64748b' : '#6b7280', fontWeight: 700 }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis
                    yAxisId="weight"
                    orientation="left"
                    domain={['auto', 'auto']}
                    fontSize={10}
                    tick={{ fill: isGlass ? '#64748b' : '#6b7280', fontWeight: 700 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="fat"
                    orientation="right"
                    domain={['auto', 'auto']}
                    fontSize={10}
                    tick={{ fill: isGlass ? '#64748b' : '#6b7280', fontWeight: 700 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isGlass ? '#0f172a' : '#fff',
                      borderColor: isGlass ? '#1e293b' : '#e2e8f0',
                      borderRadius: '12px',
                      color: isGlass ? '#fff' : '#000',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase'
                    }}
                  />
                  <Line
                    yAxisId="weight"
                    type="monotone"
                    dataKey="weight"
                    name="Vikt (kg)"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: isGlass ? '#0f172a' : '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                  <Line
                    yAxisId="fat"
                    type="monotone"
                    dataKey="bodyFat"
                    name="Fett (%)"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: isGlass ? '#0f172a' : '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </CardWrapper>
      )}

      {/* Progress Summary */}
      {progressSummary.length > 0 && (
        <CardWrapper>
          <CardHeader>
            <CardTitle className={cn("text-xl font-black uppercase italic tracking-tight", isGlass ? "text-white" : "")}>Förändring över tid</CardTitle>
            <CardDescription className={cn("font-black uppercase tracking-widest text-[10px]", isGlass ? "text-slate-500" : "")}>
              Jämförelse mot tidigare mätningar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className={cn("border-b", isGlass ? "border-white/5" : "border-gray-100")}>
                    <th className={cn("text-left py-3 font-black uppercase tracking-widest text-[10px]", isGlass ? "text-slate-500" : "text-gray-500")}>Period</th>
                    <th className={cn("text-right py-3 font-black uppercase tracking-widest text-[10px]", isGlass ? "text-slate-500" : "text-gray-500")}>Vikt</th>
                    <th className={cn("text-right py-3 font-black uppercase tracking-widest text-[10px]", isGlass ? "text-slate-500" : "text-gray-500")}>Kroppsfett</th>
                    <th className={cn("text-right py-3 font-black uppercase tracking-widest text-[10px]", isGlass ? "text-slate-500" : "text-gray-500")}>Muskelmassa</th>
                  </tr>
                </thead>
                <tbody>
                  {progressSummary.map((period) => (
                    <tr key={period.label} className={cn("border-b last:border-0", isGlass ? "border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.02]" : "border-gray-50")}>
                      <td className={cn("py-4 font-black uppercase italic", isGlass ? "text-slate-900 dark:text-white" : "text-gray-900")}>{period.label}</td>
                      <td className="py-4 text-right font-black">
                        {period.weight !== null ? (
                          <span className={period.weight < 0 ? 'text-emerald-500' : period.weight > 0 ? 'text-red-500' : ''}>
                            {period.weight > 0 ? '+' : ''}{period.weight.toFixed(1)} kg
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-4 text-right font-black">
                        {period.bodyFat !== null ? (
                          <span className={period.bodyFat < 0 ? 'text-emerald-500' : period.bodyFat > 0 ? 'text-red-500' : ''}>
                            {period.bodyFat > 0 ? '+' : ''}{period.bodyFat.toFixed(1)}%
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-4 text-right font-black">
                        {period.muscle !== null ? (
                          <span className={period.muscle > 0 ? 'text-emerald-500' : period.muscle < 0 ? 'text-red-500' : ''}>
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
        </CardWrapper>
      )}

      {/* Detailed Metrics & History - simplified/glassed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {latestMeasurement && (
          <CardWrapper>
            <CardHeader>
              <CardTitle className={cn("text-xl font-black uppercase italic tracking-tight", isGlass ? "text-white" : "")}>Senaste mätning</CardTitle>
              <CardDescription className={cn("font-black uppercase tracking-widest text-[10px]", isGlass ? "text-slate-500" : "")}>
                {format(new Date(latestMeasurement.measurementDate), 'd MMMM yyyy', { locale: sv })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <DetailItem label="Visceralt fett" value={latestMeasurement.visceralFat} isGlass={isGlass} />
                <DetailItem label="Benmassa" value={latestMeasurement.boneMassKg} unit="kg" isGlass={isGlass} />
                <DetailItem label="BMR" value={latestMeasurement.bmrKcal} unit="kcal" isGlass={isGlass} />
                <DetailItem label="BMI" value={latestMeasurement.bmi} isGlass={isGlass} />
                <DetailItem label="FFMI" value={latestMeasurement.ffmi} isGlass={isGlass} />
                <DetailItem label="Ålder (metab)" value={latestMeasurement.metabolicAge} unit="år" isGlass={isGlass} />
              </div>
            </CardContent>
          </CardWrapper>
        )}

        {/* History */}
        <CardWrapper>
          <CardHeader>
            <CardTitle className={cn("text-xl font-black uppercase italic tracking-tight", isGlass ? "text-white" : "")}>Historik</CardTitle>
            <CardDescription className={cn("font-black uppercase tracking-widest text-[10px]", isGlass ? "text-slate-500" : "")}>
              {measurements.length} mätningar registrerade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {measurements.slice(0, 5).map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-2xl transition-all",
                    isGlass ? "bg-white/50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 hover:bg-white/80 dark:hover:bg-white/5" : "border hover:bg-gray-50"
                  )}
                >
                  <div>
                    <p className={cn("font-black uppercase italic text-xs tracking-tight", isGlass ? "text-slate-900 dark:text-white" : "text-gray-900")}>
                      {format(new Date(m.measurementDate), 'd MMM yyyy', { locale: sv })}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      {m.deviceBrand || 'BIOIMPEDANS'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-black">
                    {m.weightKg && (
                      <span className={isGlass ? "text-slate-400" : "text-gray-600"}>
                        {m.weightKg.toFixed(1)} <span className="text-[10px] text-slate-500">kg</span>
                      </span>
                    )}
                    {m.bodyFatPercent && (
                      <span className={cn(isGlass ? "text-purple-400" : "text-purple-600")}>
                        {m.bodyFatPercent.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </CardWrapper>
      </div>
    </div>
  )
}

// Helper components
function MetricCard({
  icon: Icon,
  accentColor = 'blue',
  label,
  value,
  unit,
  trend,
  trendInverted = false,
  isGlass = false,
}: {
  icon: React.ElementType
  accentColor?: 'blue' | 'emerald' | 'red' | 'purple' | 'orange' | 'cyan'
  label: string
  value: string
  unit?: string
  trend?: { direction: 'up' | 'down' | 'stable'; value: number } | null
  trendInverted?: boolean // If true, up is good (e.g., muscle mass)
  isGlass?: boolean
}) {
  const isPositive = trendInverted
    ? trend?.direction === 'up'
    : trend?.direction === 'down'

  const accentClasses = {
    blue: 'text-blue-500 bg-blue-500/10',
    emerald: 'text-emerald-500 bg-emerald-500/10',
    red: 'text-red-500 bg-red-500/10',
    purple: 'text-purple-500 bg-purple-500/10',
    orange: 'text-orange-500 bg-orange-500/10',
    cyan: 'text-cyan-500 bg-cyan-500/10',
  }

  return (
    <div className={cn(
      "p-6 rounded-3xl group transition-all duration-300",
      isGlass ? "bg-white/50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 hover:bg-white/80 dark:hover:bg-white/5 shadow-sm" : "bg-white border hover:shadow-md"
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
          <div className="flex items-baseline gap-1">
            <span className={cn(
              "text-3xl font-black uppercase italic tracking-tighter",
              isGlass ? "text-slate-900 dark:text-white" : "text-gray-900"
            )}>{value}</span>
            {unit && <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{unit}</span>}
          </div>
          {trend && trend.direction !== 'stable' && (
            <div
              className={cn(
                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest mt-2",
                isPositive ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-500 bg-red-500/10'
              )}
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
        <div className={cn(
          "w-10 h-10 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
          accentClasses[accentColor as keyof typeof accentClasses]
        )}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function DetailItem({
  label,
  value,
  unit,
  isGlass = false,
}: {
  label: string
  value: number | null
  unit?: string
  isGlass?: boolean
}) {
  return (
    <div className={cn(
      "p-4 rounded-2xl transition-all",
      isGlass ? "bg-white/50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5" : "bg-gray-50 border border-transparent"
    )}>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{label}</p>
      <p className={cn("text-xl font-black uppercase italic", isGlass ? "text-slate-900 dark:text-white" : "text-gray-900")}>
        {value !== null ? (
          <>
            {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}
            {unit && <span className="text-[10px] font-black text-slate-500 ml-1 uppercase">{unit}</span>}
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
