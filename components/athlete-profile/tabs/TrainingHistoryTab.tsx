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
}

export function TrainingHistoryTab({ data, viewMode }: TrainingHistoryTabProps) {
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

  if (!hasData) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen träningshistorik</h3>
          <p className="text-gray-500">
            Logga träningspass för att se historik och belastningsdata här.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={CheckCircle}
          iconColor="text-green-500"
          label="Genomförda pass"
          value={completedWorkouts.toString()}
          subtext="senaste 90 dagarna"
        />

        <StatCard
          icon={Activity}
          iconColor="text-blue-500"
          label="Total distans"
          value={`${(totalDistance / 1000).toFixed(1)}`}
          unit="km"
        />

        <StatCard
          icon={Timer}
          iconColor="text-purple-500"
          label="Total tid"
          value={formatDuration(totalDuration)}
        />

        <StatCard
          icon={latestAcwr && latestAcwr > 1.5 ? AlertTriangle : TrendingUp}
          iconColor={getAcwrColor(latestAcwr || 0)}
          label="ACWR"
          value={latestAcwr ? latestAcwr.toFixed(2) : '-'}
          subtext={getAcwrLabel(latestAcwr || 0)}
        />
      </div>

      {/* Experience Summary */}
      {athleteProfile && (
        <Card>
          <CardHeader>
            <CardTitle>Träningsbakgrund</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {athleteProfile.yearsRunning && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Års erfarenhet</p>
                  <p className="text-lg font-semibold">{athleteProfile.yearsRunning} år</p>
                </div>
              )}
              {athleteProfile.typicalWeeklyKm && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Normal veckovolym</p>
                  <p className="text-lg font-semibold">{athleteProfile.typicalWeeklyKm} km</p>
                </div>
              )}
              {athleteProfile.longestLongRun && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Längsta långpass</p>
                  <p className="text-lg font-semibold">{athleteProfile.longestLongRun} km</p>
                </div>
              )}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Utrustning</p>
                <div className="flex gap-1 mt-1">
                  {athleteProfile.hasLactateMeter && (
                    <Badge variant="outline" className="text-xs">Laktat</Badge>
                  )}
                  {athleteProfile.hasHRVMonitor && (
                    <Badge variant="outline" className="text-xs">HRV</Badge>
                  )}
                  {athleteProfile.hasPowerMeter && (
                    <Badge variant="outline" className="text-xs">Power</Badge>
                  )}
                  {!athleteProfile.hasLactateMeter && !athleteProfile.hasHRVMonitor && !athleteProfile.hasPowerMeter && (
                    <span className="text-sm text-gray-500">-</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ACWR Chart */}
      {acwrData.length > 7 && (
        <Card>
          <CardHeader>
            <CardTitle>Akut:Kronisk Arbetsbelastning (ACWR)</CardTitle>
            <CardDescription>
              Optimal zon: 0.8 - 1.3 • Skaderisk ökar vid {'>'} 1.5
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={acwrData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis domain={[0, 2]} fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <ReferenceLine y={0.8} stroke="#22c55e" strokeDasharray="3 3" />
                  <ReferenceLine y={1.3} stroke="#22c55e" strokeDasharray="3 3" />
                  <ReferenceLine y={1.5} stroke="#ef4444" strokeDasharray="3 3" />
                  <Line
                    type="monotone"
                    dataKey="acwr"
                    name="ACWR"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-green-500"></div>
                <span className="text-gray-600">Optimal zon (0.8-1.3)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-red-500"></div>
                <span className="text-gray-600">Varning ({'>'} 1.5)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Programs */}
      <Card>
        <CardHeader>
          <CardTitle>Träningsprogram</CardTitle>
          <CardDescription>{programs.length} program registrerade</CardDescription>
        </CardHeader>
        <CardContent>
          {programs.length === 0 ? (
            <p className="text-center text-gray-500 py-6">Inga program tilldelade</p>
          ) : (
            <div className="space-y-3">
              {programs.slice(0, 5).map((program) => {
                const isActive = program.isActive
                const progress = calculateProgramProgress(program.startDate, program.endDate)

                return (
                  <div
                    key={program.id}
                    className="p-4 border rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{program.name}</p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(program.startDate), 'd MMM', { locale: sv })} -{' '}
                          {format(new Date(program.endDate), 'd MMM yyyy', { locale: sv })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {program.goalType && (
                          <Badge variant="outline">{getGoalTypeLabel(program.goalType)}</Badge>
                        )}
                        {isActive && <Badge>Aktiv</Badge>}
                      </div>
                    </div>
                    {isActive && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Framsteg</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-1" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Training Load History */}
      {trainingLoads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daglig belastning</CardTitle>
            <CardDescription>Senaste 14 dagarna</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {trainingLoads.slice(0, 14).map((load) => (
                <div
                  key={load.id}
                  className="flex items-center justify-between p-2 border rounded"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium w-20">
                      {format(new Date(load.date), 'EEE d MMM', { locale: sv })}
                    </span>
                    {load.workoutType && (
                      <Badge variant="outline" className="text-xs">
                        {load.workoutType}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    {load.duration && (
                      <span className="text-gray-500">{formatDuration(load.duration)}</span>
                    )}
                    {load.distance && (
                      <span className="text-gray-500">{(load.distance / 1000).toFixed(1)} km</span>
                    )}
                    <span className="font-medium">{Math.round(load.dailyLoad)} TSS</span>
                    {load.acwrZone && (
                      <Badge
                        variant={
                          load.acwrZone === 'SWEET_SPOT'
                            ? 'default'
                            : load.acwrZone === 'HIGH_RISK'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {getAcwrZoneLabel(load.acwrZone)}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Helper components
function StatCard({
  icon: Icon,
  iconColor,
  label,
  value,
  unit,
  subtext,
}: {
  icon: React.ElementType
  iconColor: string
  label: string
  value: string
  unit?: string
  subtext?: string
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
            {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
          </div>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </CardContent>
    </Card>
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
