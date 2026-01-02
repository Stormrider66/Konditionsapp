// components/athlete/PersonalRecords.tsx
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trophy, TrendingUp, Clock, Heart, Zap } from 'lucide-react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
  GlassCardDescription
} from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'

interface PersonalRecordsProps {
  athleteId: string
  variant?: 'default' | 'glass'
}

export async function PersonalRecords({ athleteId, variant = 'default' }: PersonalRecordsProps) {
  const isGlass = variant === 'glass'

  // Fetch all completed workout logs
  const logs = await prisma.workoutLog.findMany({
    where: {
      athleteId: athleteId,
      completed: true,
    },
    include: {
      workout: {
        select: {
          id: true,
          name: true,
          type: true,
          intensity: true,
        },
      },
    },
  })

  // Calculate personal records
  const records = calculatePersonalRecords(logs)

  if (records.length === 0) {
    return null
  }

  if (isGlass) {
    return (
      <GlassCard className="mb-8 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Trophy className="h-32 w-32 text-orange-500 rotate-12" />
        </div>
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-orange-500" />
            Personliga rekord
          </GlassCardTitle>
          <GlassCardDescription>
            Dina bästa prestationer och milstolpar
          </GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {records.map((record, index) => (
              <RecordCard key={index} record={record} isGlass={true} />
            ))}
          </div>
        </GlassCardContent>
      </GlassCard>
    )
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Personliga rekord
        </CardTitle>
        <CardDescription>
          Dina bästa prestationer
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map((record, index) => (
            <RecordCard key={index} record={record} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function RecordCard({ record, isGlass = false }: { record: any; isGlass?: boolean }) {
  const icons = {
    distance: TrendingUp,
    duration: Clock,
    pace: TrendingUp,
    avgHR: Heart,
    maxHR: Heart,
    minRPE: Zap,
  }

  const Icon = icons[record.type as keyof typeof icons] || Trophy

  return (
    <div className={cn(
      "flex items-start gap-3 p-4 rounded-xl transition-all duration-300",
      isGlass
        ? "bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20"
        : "bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200"
    )}>
      <div className={cn(
        "p-2 rounded-lg shrink-0",
        isGlass ? "bg-orange-500/20" : "bg-yellow-100"
      )}>
        <Icon className={cn(
          "h-5 w-5",
          isGlass ? "text-orange-400" : "text-yellow-700"
        )} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-xs font-bold uppercase tracking-wider",
          isGlass ? "text-slate-500" : "text-muted-foreground"
        )}>{record.title}</p>
        <p className={cn(
          "text-2xl font-black truncate",
          isGlass ? "text-white" : "text-yellow-900"
        )}>{record.value}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant={isGlass ? "secondary" : "outline"} className={cn(
            "text-[10px] py-0 px-1.5 h-4 font-bold border-none",
            isGlass && "bg-white/10 text-slate-300"
          )}>
            {record.workoutName}
          </Badge>
        </div>
        <p className={cn(
          "text-[10px] font-medium mt-1 uppercase tracking-tight",
          isGlass ? "text-slate-500" : "text-muted-foreground"
        )}>
          {format(new Date(record.date), 'PPP', { locale: sv })}
        </p>
      </div>
    </div>
  )
}

// Calculate personal records from logs
function calculatePersonalRecords(logs: any[]) {
  const records: any[] = []

  // Longest distance
  const longestDistance = logs
    .filter(log => log.distance && log.distance > 0)
    .sort((a, b) => (b.distance || 0) - (a.distance || 0))[0]

  if (longestDistance) {
    records.push({
      type: 'distance',
      title: 'Längsta distans',
      value: `${longestDistance.distance} km`,
      workoutName: longestDistance.workout.name,
      date: longestDistance.completedAt,
    })
  }

  // Longest duration
  const longestDuration = logs
    .filter(log => log.duration && log.duration > 0)
    .sort((a, b) => (b.duration || 0) - (a.duration || 0))[0]

  if (longestDuration) {
    const hours = Math.floor(longestDuration.duration / 60)
    const mins = longestDuration.duration % 60
    records.push({
      type: 'duration',
      title: 'Längsta pass',
      value: hours > 0 ? `${hours}h ${mins}min` : `${mins} min`,
      workoutName: longestDuration.workout.name,
      date: longestDuration.completedAt,
    })
  }

  // Fastest pace (running only)
  const fastestPace = logs
    .filter(log => log.workout.type === 'RUNNING' && log.avgPace && log.distance && log.distance > 1)
    .sort((a, b) => {
      const paceA = convertPaceToSeconds(a.avgPace)
      const paceB = convertPaceToSeconds(b.avgPace)
      return paceA - paceB
    })[0]

  if (fastestPace) {
    records.push({
      type: 'pace',
      title: 'Snabbaste tempo',
      value: fastestPace.avgPace,
      workoutName: fastestPace.workout.name,
      date: fastestPace.completedAt,
    })
  }

  // Highest average HR
  const highestAvgHR = logs
    .filter(log => log.avgHR && log.avgHR > 0)
    .sort((a, b) => (b.avgHR || 0) - (a.avgHR || 0))[0]

  if (highestAvgHR) {
    records.push({
      type: 'avgHR',
      title: 'Högsta snitt-puls',
      value: `${highestAvgHR.avgHR} bpm`,
      workoutName: highestAvgHR.workout.name,
      date: highestAvgHR.completedAt,
    })
  }

  // Highest max HR
  const highestMaxHR = logs
    .filter(log => log.maxHR && log.maxHR > 0)
    .sort((a, b) => (b.maxHR || 0) - (a.maxHR || 0))[0]

  if (highestMaxHR) {
    records.push({
      type: 'maxHR',
      title: 'Högsta max-puls',
      value: `${highestMaxHR.maxHR} bpm`,
      workoutName: highestMaxHR.workout.name,
      date: highestMaxHR.completedAt,
    })
  }

  // Lowest RPE (for hard workouts)
  const lowestRPEHard = logs
    .filter(log => log.perceivedEffort && log.perceivedEffort > 0 && (log.workout.intensity === 'THRESHOLD' || log.workout.intensity === 'INTERVAL'))
    .sort((a, b) => (a.perceivedEffort || 10) - (b.perceivedEffort || 10))[0]

  if (lowestRPEHard) {
    records.push({
      type: 'minRPE',
      title: 'Lägsta RPE (hårt pass)',
      value: `${lowestRPEHard.perceivedEffort}/10`,
      workoutName: lowestRPEHard.workout.name,
      date: lowestRPEHard.completedAt,
    })
  }

  return records
}

// Helper to convert pace to seconds for sorting
function convertPaceToSeconds(pace: string): number {
  try {
    const parts = pace.split(':')
    if (parts.length !== 2) return Infinity

    const minutes = parseInt(parts[0])
    const seconds = parseFloat(parts[1])

    return minutes * 60 + seconds
  } catch {
    return Infinity
  }
}
