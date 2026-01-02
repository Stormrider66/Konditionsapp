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

export function ReadinessTab({ data, viewMode, variant = 'default' }: ReadinessTabProps) {
  const isGlass = variant === 'glass'
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

  const CardWrapper = isGlass ? GlassCard : Card;

  if (!hasData) {
    return (
      <CardWrapper>
        <CardContent className="py-20 text-center">
          <Gauge className={cn("h-16 w-16 mx-auto mb-6", isGlass ? "text-white/10" : "text-gray-300")} />
          <h3 className={cn("text-xl font-black uppercase italic tracking-tight mb-2", isGlass ? "text-white" : "text-gray-900")}>
            Ingen beredskapsdata
          </h3>
          <p className={cn("font-medium max-w-sm mx-auto", isGlass ? "text-slate-500" : "text-gray-500")}>
            Aktivera daglig incheckning för att spåra träningsberedskap.
          </p>
        </CardContent>
      </CardWrapper>
    )
  }

  return (
    <div className="space-y-8">
      {/* Current Readiness Score */}
      {latestCheckIn && (
        <CardWrapper>
          <CardContent className="p-8">
            <div className="flex flex-col lg:flex-row items-center gap-10">
              {/* Large Score */}
              <div className="text-center lg:pr-10 lg:border-r border-white/5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Dagens beredskap</p>
                <div
                  className={cn(
                    "text-8xl font-black italic tracking-tighter leading-none mb-2",
                    getReadinessColor(latestCheckIn.readinessScore || 0)
                  )}
                >
                  {latestCheckIn.readinessScore?.toFixed(0) || '-'}
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">skala 1-10</p>
                {latestCheckIn.readinessDecision && (
                  <Badge
                    className={cn(
                      "mt-4 font-black uppercase tracking-widest text-[8px] h-5 rounded-md border-0",
                      getDecisionVariant(latestCheckIn.readinessDecision) === 'destructive' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
                    )}
                  >
                    {getDecisionLabel(latestCheckIn.readinessDecision)}
                  </Badge>
                )}
              </div>

              {/* Factor Breakdown */}
              <div className="flex-1 w-full">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <FactorCard
                    icon={Moon}
                    label="Sömn"
                    value={latestCheckIn.sleepQuality}
                    subValue={latestCheckIn.sleepHours ? `${latestCheckIn.sleepHours}h` : undefined}
                    isGlass={isGlass}
                  />
                  <FactorCard
                    icon={Activity}
                    label="Trötthet"
                    value={latestCheckIn.fatigue}
                    inverted
                    isGlass={isGlass}
                  />
                  <FactorCard
                    icon={Heart}
                    label="Ömhet"
                    value={latestCheckIn.soreness}
                    inverted
                    isGlass={isGlass}
                  />
                  <FactorCard
                    icon={Brain}
                    label="Stress"
                    value={latestCheckIn.stress}
                    inverted
                    isGlass={isGlass}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </CardWrapper>
      )}

      {/* HRV & RHR (if available) */}
      {(latestMetrics?.hrvRMSSD || latestMetrics?.restingHR || athleteProfile?.hrvBaseline) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* HRV Card */}
          <CardWrapper>
            <CardHeader className="pb-4">
              <CardTitle className={cn("text-xl font-black uppercase italic tracking-tight flex items-center gap-2", isGlass ? "text-white" : "")}>
                <Activity className="h-5 w-5 text-purple-500" />
                HRV
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2 mb-4">
                <span className={cn("text-5xl font-black italic tracking-tighter", isGlass ? "text-white" : "text-gray-900")}>
                  {latestMetrics?.hrvRMSSD?.toFixed(0) || '-'}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">ms</span>
                {latestMetrics?.hrvStatus && (
                  <Badge className={cn(
                    "font-black uppercase tracking-widest text-[8px] h-4 rounded-md border-0 ml-2",
                    latestMetrics.hrvStatus === 'OPTIMAL' ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-400'
                  )}>
                    {getHrvStatusLabel(latestMetrics.hrvStatus)}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Baseline</p>
                  <p className={cn("text-sm font-black italic", isGlass ? "text-slate-300" : "text-gray-900")}>{athleteProfile?.hrvBaseline?.toFixed(0) || '-'} ms</p>
                </div>
                {latestMetrics?.hrvTrend && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Trend</p>
                    <div className="flex items-center gap-1.5">
                      {latestMetrics.hrvTrend === 'UP' ? (
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className={cn("text-[10px] font-black uppercase", latestMetrics.hrvTrend === 'UP' ? 'text-emerald-500' : 'text-red-500')}>
                        {latestMetrics.hrvPercent?.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </CardWrapper>

          {/* RHR Card */}
          <CardWrapper>
            <CardHeader className="pb-4">
              <CardTitle className={cn("text-xl font-black uppercase italic tracking-tight flex items-center gap-2", isGlass ? "text-white" : "")}>
                <Heart className="h-5 w-5 text-red-500" />
                Vilopuls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2 mb-4">
                <span className={cn("text-5xl font-black italic tracking-tighter", isGlass ? "text-white" : "text-gray-900")}>
                  {latestCheckIn?.restingHR || latestMetrics?.restingHR || '-'}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">bpm</span>
                {latestMetrics?.restingHRStatus && (
                  <Badge className={cn(
                    "font-black uppercase tracking-widest text-[8px] h-4 rounded-md border-0 ml-2",
                    latestMetrics.restingHRStatus === 'NORMAL' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                  )}>
                    {getRhrStatusLabel(latestMetrics.restingHRStatus)}
                  </Badge>
                )}
              </div>
              <div className="pt-4 border-t border-white/5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Baseline</p>
                <p className={cn("text-sm font-black italic", isGlass ? "text-slate-300" : "text-gray-900")}>{athleteProfile?.rhrBaseline || '-'} bpm</p>
              </div>
            </CardContent>
          </CardWrapper>
        </div>
      )}

      {/* Readiness Trend Chart */}
      {chartData.length >= 7 && (
        <CardWrapper>
          <CardHeader>
            <CardTitle className={cn("text-xl font-black uppercase italic tracking-tight", isGlass ? "text-white" : "")}>Beredskapstrend</CardTitle>
            <CardDescription className={cn("font-black uppercase tracking-widest text-[10px]", isGlass ? "text-slate-500" : "")}>SENASTE 14 DAGARNA</CardDescription>
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
                    domain={[0, 10]}
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
                    type="monotone"
                    dataKey="readiness"
                    name="Beredskap"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: isGlass ? '#0f172a' : '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="sleep"
                    name="Sömn"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </CardWrapper>
      )}

      {/* Menstrual Cycle & Flags */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {showMenstrual && latestCycle && (
          <CardWrapper>
            <CardHeader>
              <CardTitle className={cn("text-xl font-black uppercase italic tracking-tight flex items-center gap-2", isGlass ? "text-white" : "")}>
                <Activity className="h-5 w-5 text-pink-500" />
                Menscykel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className={cn("p-4 rounded-2xl", isGlass ? "bg-pink-500/5 border border-pink-500/10" : "bg-pink-50")}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-pink-500/70 mb-1">Nuvarande fas</p>
                  <p className={cn("text-lg font-black uppercase italic", isGlass ? "text-pink-400" : "text-pink-800")}>{getCyclePhaseLabel(latestCycle.currentPhase || '')}</p>
                </div>
                <div className={cn("p-4 rounded-2xl", isGlass ? "bg-white/[0.02] border border-white/5" : "bg-gray-50")}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Cykeldag</p>
                  <p className={cn("text-lg font-black italic", isGlass ? "text-white" : "text-gray-900")}>Dag {calculateCycleDay(latestCycle.startDate)}</p>
                </div>
              </div>
            </CardContent>
          </CardWrapper>
        )}

        {latestMetrics?.redFlags && latestMetrics.redFlags.length > 0 && (
          <CardWrapper className={cn(
            "border-red-500/20",
            isGlass ? "bg-red-500/5" : "bg-red-50"
          )}>
            <CardHeader className="pb-2">
              <CardTitle className={cn("flex items-center gap-2 text-xl font-black uppercase italic tracking-tight", isGlass ? "text-red-500" : "text-red-800")}>
                <AlertCircle className="h-5 w-5" />
                Varningar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {latestMetrics.redFlags.map((flag, idx) => (
                  <li key={idx} className={cn("flex items-center gap-3 text-[11px] font-bold uppercase", isGlass ? "text-red-400" : "text-red-700")}>
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                    {flag}
                  </li>
                ))}
              </ul>
            </CardContent>
          </CardWrapper>
        )}
      </div>

      {/* Check-in History */}
      <CardWrapper>
        <CardHeader>
          <CardTitle className={cn("text-xl font-black uppercase italic tracking-tight", isGlass ? "text-white" : "")}>Historik</CardTitle>
          <CardDescription className={cn("font-black uppercase tracking-widest text-[10px]", isGlass ? "text-slate-500" : "")}>SENASTE 7 DAGARNA</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {dailyCheckIns.slice(0, 7).map((checkIn) => (
              <div
                key={checkIn.id}
                className={cn(
                  "flex items-center justify-between p-4 rounded-2xl transition-all",
                  isGlass ? "bg-white/[0.01] border border-white/5 hover:bg-white/5" : "border hover:bg-gray-50"
                )}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center font-black italic",
                      getReadinessBgColor(checkIn.readinessScore || 0)
                    )}
                  >
                    {checkIn.readinessScore?.toFixed(0) || '-'}
                  </div>
                  <div>
                    <p className={cn("font-black uppercase italic text-xs tracking-tight", isGlass ? "text-white" : "text-gray-900")}>
                      {format(new Date(checkIn.date), 'EEEE d MMMM', { locale: sv })}
                    </p>
                    {checkIn.readinessDecision && (
                      <Badge className={cn("font-black uppercase tracking-widest text-[8px] h-4 rounded-md border-0 mt-1", isGlass ? "bg-white/5 text-slate-500" : "bg-white border")}>
                        {getDecisionLabel(checkIn.readinessDecision)}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-black uppercase text-slate-500">
                  {checkIn.sleepHours && <span>😴 {checkIn.sleepHours}h</span>}
                  {checkIn.restingHR && <span className="text-red-500/70">❤️ {checkIn.restingHR}</span>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </CardWrapper>
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
  isGlass = false,
}: {
  icon: React.ElementType
  label: string
  value: number | null
  subValue?: string
  inverted?: boolean
  isGlass?: boolean
}) {
  const displayValue = value !== null ? value : '-'
  const score = value !== null ? (inverted ? 10 - value : value) : 0
  const colorClass = value !== null ? getFactorColor(score) : 'text-slate-500'

  return (
    <div className={cn(
      "p-4 rounded-2xl group transition-all duration-300",
      isGlass ? "bg-white/[0.02] border border-white/5 hover:bg-white/5" : "bg-gray-50 border border-transparent hover:border-gray-200"
    )}>
      <div className="flex items-center gap-2 text-slate-500 mb-2">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={cn(
          "text-2xl font-black italic",
          colorClass
        )}>{displayValue}</span>
        <span className="text-[10px] font-black text-slate-600">/10</span>
      </div>
      {subValue && (
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-1">{subValue}</p>
      )}
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
