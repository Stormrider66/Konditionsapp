'use client'

import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { Calendar, TrendingUp, AlertTriangle, CheckCircle, Activity, Timer } from 'lucide-react'
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
  ReferenceLine,
  Legend,
} from 'recharts'
import type { AthleteProfileData } from '@/lib/athlete-profile/data-fetcher'

interface TrainingHistoryTabProps {
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

export function TrainingHistoryTab({ data, viewMode, variant = 'default' }: TrainingHistoryTabProps) {
  const isGlass = variant === 'glass'
  const { programs, trainingLoads, workoutLogs } = data.training
  const athleteProfile = data.identity.athleteProfile

  // Calculate workout completion stats
  const completedWorkouts = workoutLogs.length
  const totalDistance = workoutLogs.reduce((sum, log) => sum + (log.distance || 0), 0)
  const totalDuration = workoutLogs.reduce((sum, log) => sum + (log.duration || 0), 0)

  // Prepare ACWR chart data
  const acwrData = [...trainingLoads]
    .reverse()
    .slice(-28) // Last 28 days
    .map((load) => ({
      date: format(new Date(load.date), 'd MMM', { locale: sv }),
      acwr: load.acwr,
      acute: load.acuteLoad,
      chronic: load.chronicLoad,
      dailyLoad: load.dailyLoad,
    }))

  const latestAcwr = trainingLoads[0]?.acwr

  const hasData = programs.length > 0 || trainingLoads.length > 0 || workoutLogs.length > 0

  const CardWrapper = isGlass ? GlassCard : Card;

  if (!hasData) {
    return (
      <CardWrapper>
        <CardContent className="py-20 text-center">
          <Calendar className={cn("h-16 w-16 mx-auto mb-6", isGlass ? "text-white/10" : "text-gray-300")} />
          <h3 className={cn("text-xl font-black uppercase italic tracking-tight mb-2", isGlass ? "text-slate-900 dark:text-white" : "text-gray-900")}>
            Ingen träningshistorik
          </h3>
          <p className={cn("font-medium max-w-sm mx-auto", isGlass ? "text-slate-500" : "text-gray-500")}>
            Logga träningspass för att se historik och belastningsdata här.
          </p>
        </CardContent>
      </CardWrapper>
    )
  }

  return (
    <div className="space-y-8">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={CheckCircle}
          accentColor="emerald"
          label="Slutförda pass"
          value={completedWorkouts.toString()}
          subtext="senaste 90 dagarna"
          isGlass={isGlass}
        />

        <StatCard
          icon={Activity}
          accentColor="blue"
          label="Total distans"
          value={`${(totalDistance / 1000).toFixed(1)}`}
          unit="km"
          isGlass={isGlass}
        />

        <StatCard
          icon={Timer}
          accentColor="purple"
          label="Total tid"
          value={formatDuration(totalDuration)}
          isGlass={isGlass}
        />

        <StatCard
          icon={latestAcwr && latestAcwr > 1.5 ? AlertTriangle : TrendingUp}
          accentColor={latestAcwr && latestAcwr > 1.5 ? 'red' : 'emerald'}
          label="ACWR"
          value={latestAcwr ? latestAcwr.toFixed(2) : '-'}
          subtext={getAcwrLabel(latestAcwr || 0)}
          isGlass={isGlass}
        />
      </div>

      {/* Experience Summary */}
      {athleteProfile && (
        <CardWrapper>
          <CardHeader>
            <CardTitle className={cn("text-xl font-black uppercase italic tracking-tight", isGlass ? "text-white" : "")}>Träningsbakgrund</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {athleteProfile.yearsRunning && (
                <div className={cn("p-4 rounded-2xl", isGlass ? "bg-white/[0.02] border border-white/5" : "bg-gray-50")}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Erfarenhet</p>
                  <p className={cn("text-xl font-black uppercase italic", isGlass ? "text-slate-900 dark:text-white" : "text-gray-900")}>{athleteProfile.yearsRunning} år</p>
                </div>
              )}
              {athleteProfile.typicalWeeklyKm && (
                <div className={cn("p-4 rounded-2xl", isGlass ? "bg-white/[0.02] border border-white/5" : "bg-gray-50")}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Veckovolym</p>
                  <p className={cn("text-xl font-black uppercase italic", isGlass ? "text-slate-900 dark:text-white" : "text-gray-900")}>{athleteProfile.typicalWeeklyKm} km</p>
                </div>
              )}
              {athleteProfile.longestLongRun && (
                <div className={cn("p-4 rounded-2xl", isGlass ? "bg-white/[0.02] border border-white/5" : "bg-gray-50")}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Längsta pass</p>
                  <p className={cn("text-xl font-black uppercase italic", isGlass ? "text-slate-900 dark:text-white" : "text-gray-900")}>{athleteProfile.longestLongRun} km</p>
                </div>
              )}
              <div className={cn("p-4 rounded-2xl", isGlass ? "bg-white/50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5" : "bg-gray-50")}>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Utrustning</p>
                <div className="flex gap-2 flex-wrap">
                  {athleteProfile.hasLactateMeter && (
                    <Badge className={cn("font-black uppercase tracking-widest text-[8px] h-4 rounded-md border-0", isGlass ? "bg-white/10 text-white" : "bg-slate-200 text-slate-700")}>Laktat</Badge>
                  )}
                  {athleteProfile.hasHRVMonitor && (
                    <Badge className={cn("font-black uppercase tracking-widest text-[8px] h-4 rounded-md border-0", isGlass ? "bg-white/10 text-white" : "bg-slate-200 text-slate-700")}>HRV</Badge>
                  )}
                  {athleteProfile.hasPowerMeter && (
                    <Badge className={cn("font-black uppercase tracking-widest text-[8px] h-4 rounded-md border-0", isGlass ? "bg-white/10 text-white" : "bg-slate-200 text-slate-700")}>Power</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </CardWrapper>
      )}

      {/* ACWR Chart */}
      {acwrData.length > 7 && (
        <CardWrapper>
          <CardHeader>
            <CardTitle className={cn("text-xl font-black uppercase italic tracking-tight", isGlass ? "text-white" : "")}>Akut:Kronisk belastning (ACWR)</CardTitle>
            <CardDescription className={cn("font-black uppercase tracking-widest text-[10px]", isGlass ? "text-slate-500" : "")}>
              OPTIMAL ZON: 0.8 - 1.3 • SKADERISK ÖKAR VID {'>'} 1.5
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={acwrData}>
                  <XAxis
                    dataKey="date"
                    fontSize={10}
                    tick={{ fill: isGlass ? '#64748b' : '#6b7280', fontWeight: 700 }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis
                    domain={[0, 2]}
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
                  <ReferenceLine y={0.8} stroke={isGlass ? "rgba(34, 197, 94, 0.2)" : "#22c55e"} strokeDasharray="3 3" />
                  <ReferenceLine y={1.3} stroke={isGlass ? "rgba(34, 197, 94, 0.2)" : "#22c55e"} strokeDasharray="3 3" />
                  <ReferenceLine y={1.5} stroke="#ef4444" strokeDasharray="3 3" />
                  <Line
                    type="monotone"
                    dataKey="acwr"
                    name="ACWR"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: isGlass ? '#0f172a' : '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500/50"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Optimal zon (0.8-1.3)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Varning ({'>'} 1.5)</span>
              </div>
            </div>
          </CardContent>
        </CardWrapper>
      )}

      {/* Active Programs & Load History */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <CardWrapper>
          <CardHeader>
            <CardTitle className={cn("text-xl font-black uppercase italic tracking-tight", isGlass ? "text-white" : "")}>Träningsprogram</CardTitle>
            <CardDescription className={cn("font-black uppercase tracking-widest text-[10px]", isGlass ? "text-slate-500" : "")}>
              {programs.length} program registrerade
            </CardDescription>
          </CardHeader>
          <CardContent>
            {programs.length === 0 ? (
              <p className={cn("text-center py-10 font-bold uppercase tracking-widest text-[10px]", isGlass ? "text-slate-600" : "text-gray-400")}>Inga program tilldelade</p>
            ) : (
              <div className="space-y-3">
                {programs.slice(0, 5).map((program) => {
                  const isActive = program.isActive
                  const progress = calculateProgramProgress(program.startDate, program.endDate)

                  return (
                    <div
                      key={program.id}
                      className={cn(
                        "p-4 rounded-2xl space-y-3",
                        isGlass ? "bg-white/50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5" : "border"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={cn("font-black uppercase italic tracking-tight", isGlass ? "text-slate-900 dark:text-white" : "text-gray-900")}>{program.name}</p>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                            {format(new Date(program.startDate), 'd MMM', { locale: sv })} -{' '}
                            {format(new Date(program.endDate), 'd MMM yyyy', { locale: sv })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {program.goalType && (
                            <Badge className={cn("font-black uppercase tracking-widest text-[8px] h-4 rounded-md border-0", isGlass ? "bg-white/10 text-slate-400" : "bg-slate-100 text-slate-600")}>{getGoalTypeLabel(program.goalType)}</Badge>
                          )}
                          {isActive && <Badge className="font-black uppercase tracking-widest text-[8px] h-4 rounded-md bg-emerald-500 text-white border-0">Aktiv</Badge>}
                        </div>
                      </div>
                      {isActive && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                            <span>Framsteg</span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                          <Progress value={progress} className={cn("h-1.5", isGlass ? "bg-white/5" : "")} indicatorClassName="bg-emerald-500" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </CardWrapper>

        <CardWrapper>
          <CardHeader>
            <CardTitle className={cn("text-xl font-black uppercase italic tracking-tight", isGlass ? "text-white" : "")}>Daglig belastning</CardTitle>
            <CardDescription className={cn("font-black uppercase tracking-widest text-[10px]", isGlass ? "text-slate-500" : "")}>
              SENASTE 14 DAGARNA
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {trainingLoads.slice(0, 10).map((load) => (
                <div
                  key={load.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-2xl transition-all",
                    isGlass ? "bg-white/50 dark:bg-white/[0.01] border border-slate-200 dark:border-white/5 hover:bg-white/80 dark:hover:bg-white/5" : "border hover:bg-gray-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn("text-[10px] font-black uppercase tracking-tighter w-16", isGlass ? "text-slate-400" : "text-gray-600")}>
                      {format(new Date(load.date), 'EEE d MMM', { locale: sv })}
                    </span>
                    {load.workoutType && (
                      <Badge className={cn("font-black uppercase tracking-widest text-[8px] h-4 px-1 rounded-md border-0", isGlass ? "bg-white/5 text-slate-500" : "bg-white border")}>
                        {load.workoutType}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-black uppercase">
                    <span className={isGlass ? "text-slate-900 dark:text-white" : "text-gray-900"}>{Math.round(load.dailyLoad)} <span className="text-slate-500">TSS</span></span>
                    {load.acwrZone && (
                      <Badge
                        className={cn(
                          "font-black tracking-widest text-[8px] h-4 px-1 rounded-md border-0",
                          load.acwrZone === 'SWEET_SPOT'
                            ? (isGlass ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-500 text-white')
                            : load.acwrZone === 'HIGH_RISK'
                              ? 'bg-red-500 text-white'
                              : (isGlass ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-700')
                        )}
                      >
                        {getAcwrZoneLabel(load.acwrZone)}
                      </Badge>
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
function StatCard({
  icon: Icon,
  accentColor = 'blue',
  label,
  value,
  unit,
  subtext,
  isGlass = false,
}: {
  icon: React.ElementType
  accentColor?: 'blue' | 'emerald' | 'red' | 'purple' | 'orange' | 'cyan'
  label: string
  value: string
  unit?: string
  subtext?: string
  isGlass?: boolean
}) {
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
          {subtext && <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2">{subtext}</p>}
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

// Helper functions
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}m`
  return `${hours}h ${mins}m`
}

function getAcwrColor(acwr: number): string {
  if (acwr < 0.8) return 'text-yellow-500'
  if (acwr <= 1.3) return 'text-green-500'
  if (acwr <= 1.5) return 'text-orange-500'
  return 'text-red-500'
}

function getAcwrLabel(acwr: number): string {
  if (acwr === 0) return ''
  if (acwr < 0.8) return 'Underträning'
  if (acwr <= 1.3) return 'Optimal'
  if (acwr <= 1.5) return 'Varning'
  return 'Hög risk'
}

function getAcwrZoneLabel(zone: string): string {
  const labels: Record<string, string> = {
    SWEET_SPOT: 'Optimal',
    LOW: 'Låg',
    HIGH: 'Hög',
    HIGH_RISK: 'Risk',
  }
  return labels[zone] || zone
}

function getGoalTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    marathon: 'Marathon',
    half_marathon: 'Halvmaraton',
    '10k': '10K',
    '5k': '5K',
    fitness: 'Kondition',
    cycling: 'Cykling',
    triathlon: 'Triathlon',
  }
  return labels[type] || type
}

function calculateProgramProgress(startDate: Date, endDate: Date): number {
  const now = new Date()
  const start = new Date(startDate)
  const end = new Date(endDate)

  if (now < start) return 0
  if (now > end) return 100

  const total = end.getTime() - start.getTime()
  const elapsed = now.getTime() - start.getTime()

  return (elapsed / total) * 100
}
