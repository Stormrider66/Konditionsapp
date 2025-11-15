// components/athlete/PersonalRecords.tsx
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trophy, TrendingUp, Clock, Heart, Zap } from 'lucide-react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'

interface PersonalRecordsProps {
  athleteId: string
}

export async function PersonalRecords({ athleteId }: PersonalRecordsProps) {
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
        },
      },
    },
  })

  // Calculate personal records
  const records = calculatePersonalRecords(logs)

  if (records.length === 0) {
    return null
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

function RecordCard({ record }: { record: any }) {
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
    <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
      <div className="p-2 bg-yellow-100 rounded-lg">
        <Icon className="h-5 w-5 text-yellow-700" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-muted-foreground">{record.title}</p>
        <p className="text-2xl font-bold text-yellow-900">{record.value}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-xs">
            {record.workoutName}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
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
