'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import {
  Footprints,
  Activity,
  Dumbbell,
  Zap,
  Target,
  Timer,
  Save,
  ChevronRight
} from 'lucide-react'

interface HYROXWorkoutLoggingFormProps {
  workoutId: string
  workoutName: string
  workoutType: 'running' | 'strength' | 'hyrox_simulation' | 'station_practice' | 'mixed'
  onSubmit: (data: HYROXWorkoutLogData) => Promise<void>
  isSubmitting?: boolean
}

export interface HYROXWorkoutLogData {
  workoutId: string
  completedAt: Date
  duration: number // minutes
  perceivedEffort: number // 1-10

  // Running data
  runningDistance?: number // meters
  runningDuration?: number // seconds
  avgPace?: number // seconds per km

  // Station data (times in seconds)
  skiErgTime?: number
  skiErgDistance?: number
  sledPushTime?: number
  sledPullTime?: number
  burpeeBroadJumpTime?: number
  burpeeBroadJumpDistance?: number
  rowingTime?: number
  rowingDistance?: number
  farmersCarryTime?: number
  farmersCarryDistance?: number
  sandbagLungeTime?: number
  sandbagLungeDistance?: number
  wallBallTime?: number
  wallBallReps?: number

  // Strength data
  exercises?: {
    name: string
    sets: number
    reps: number
    weight?: number
  }[]

  // General
  notes?: string
  heartRateAvg?: number
  heartRateMax?: number
  calories?: number
}

const WORKOUT_TYPES = [
  { value: 'running', label: 'Löpning', icon: Footprints, color: 'text-green-500' },
  { value: 'strength', label: 'Styrka', icon: Dumbbell, color: 'text-purple-500' },
  { value: 'hyrox_simulation', label: 'HYROX Simulation', icon: Target, color: 'text-orange-500' },
  { value: 'station_practice', label: 'Stationsträning', icon: Activity, color: 'text-blue-500' },
  { value: 'mixed', label: 'Kombinerat', icon: Zap, color: 'text-yellow-500' },
]

const STATIONS = [
  { key: 'skiErg', label: 'SkiErg', distance: '1000m', icon: Activity },
  { key: 'sledPush', label: 'Sled Push', distance: '50m', icon: Dumbbell },
  { key: 'sledPull', label: 'Sled Pull', distance: '50m', icon: Dumbbell },
  { key: 'burpeeBroadJump', label: 'Burpee Broad Jump', distance: '80m', icon: Zap },
  { key: 'rowing', label: 'Rodd', distance: '1000m', icon: Activity },
  { key: 'farmersCarry', label: 'Farmers Carry', distance: '200m', icon: Dumbbell },
  { key: 'sandbagLunge', label: 'Sandbag Lunge', distance: '100m', icon: Footprints },
  { key: 'wallBall', label: 'Wall Balls', distance: '75-100 reps', icon: Target },
]

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function parseTimeInput(value: string): number {
  if (!value) return 0
  const parts = value.split(':')
  if (parts.length === 2) {
    const mins = parseInt(parts[0]) || 0
    const secs = parseInt(parts[1]) || 0
    return mins * 60 + secs
  }
  return parseInt(value) || 0
}

export function HYROXWorkoutLoggingForm({
  workoutId,
  workoutName,
  workoutType,
  onSubmit,
  isSubmitting = false
}: HYROXWorkoutLoggingFormProps) {
  const [activeTab, setActiveTab] = useState(workoutType === 'running' ? 'running' : workoutType === 'strength' ? 'strength' : 'stations')
  const [data, setData] = useState<Partial<HYROXWorkoutLogData>>({
    workoutId,
    completedAt: new Date(),
    duration: 0,
    perceivedEffort: 5,
    exercises: [],
  })

  const updateData = (updates: Partial<HYROXWorkoutLogData>) => {
    setData(prev => ({ ...prev, ...updates }))
  }

  const handleSubmit = async () => {
    await onSubmit(data as HYROXWorkoutLogData)
  }

  const typeConfig = WORKOUT_TYPES.find(t => t.value === workoutType)
  const TypeIcon = typeConfig?.icon || Activity

  // Calculate total time for simulation
  const calculateTotalTime = (): number => {
    let total = 0
    if (data.runningDuration) total += data.runningDuration
    if (data.skiErgTime) total += data.skiErgTime
    if (data.sledPushTime) total += data.sledPushTime
    if (data.sledPullTime) total += data.sledPullTime
    if (data.burpeeBroadJumpTime) total += data.burpeeBroadJumpTime
    if (data.rowingTime) total += data.rowingTime
    if (data.farmersCarryTime) total += data.farmersCarryTime
    if (data.sandbagLungeTime) total += data.sandbagLungeTime
    if (data.wallBallTime) total += data.wallBallTime
    return total
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <TypeIcon className={`h-6 w-6 ${typeConfig?.color}`} />
            <div>
              <CardTitle>{workoutName}</CardTitle>
              <CardDescription>
                {typeConfig?.label} • Logga ditt träningspass
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Träningsdata</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">Allmänt</TabsTrigger>
              <TabsTrigger value="running">Löpning</TabsTrigger>
              <TabsTrigger value="stations">Stationer</TabsTrigger>
              <TabsTrigger value="strength">Styrka</TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Total tid (minuter)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={data.duration || ''}
                    onChange={(e) => updateData({ duration: parseInt(e.target.value) || 0 })}
                    placeholder="60"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Datum</Label>
                  <Input
                    type="datetime-local"
                    value={data.completedAt ? new Date(data.completedAt).toISOString().slice(0, 16) : ''}
                    onChange={(e) => updateData({ completedAt: new Date(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Upplevd ansträngning (RPE): {data.perceivedEffort}/10</Label>
                <Slider
                  value={[data.perceivedEffort || 5]}
                  onValueChange={([value]) => updateData({ perceivedEffort: value })}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Lätt</span>
                  <span>Moderat</span>
                  <span>Maximalt</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Genomsnittspuls</Label>
                  <Input
                    type="number"
                    min={40}
                    max={220}
                    value={data.heartRateAvg || ''}
                    onChange={(e) => updateData({ heartRateAvg: parseInt(e.target.value) || undefined })}
                    placeholder="150"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Max puls</Label>
                  <Input
                    type="number"
                    min={40}
                    max={220}
                    value={data.heartRateMax || ''}
                    onChange={(e) => updateData({ heartRateMax: parseInt(e.target.value) || undefined })}
                    placeholder="180"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Kalorier</Label>
                  <Input
                    type="number"
                    min={0}
                    value={data.calories || ''}
                    onChange={(e) => updateData({ calories: parseInt(e.target.value) || undefined })}
                    placeholder="500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Anteckningar</Label>
                <Textarea
                  value={data.notes || ''}
                  onChange={(e) => updateData({ notes: e.target.value })}
                  placeholder="Hur kändes passet? Något särskilt att notera?"
                  rows={3}
                />
              </div>
            </TabsContent>

            {/* Running Tab */}
            <TabsContent value="running" className="space-y-4 mt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Distans (m)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={data.runningDistance || ''}
                    onChange={(e) => updateData({ runningDistance: parseInt(e.target.value) || undefined })}
                    placeholder="8000"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tid (mm:ss)</Label>
                  <Input
                    placeholder="35:00"
                    value={data.runningDuration ? formatTime(data.runningDuration) : ''}
                    onChange={(e) => updateData({ runningDuration: parseTimeInput(e.target.value) || undefined })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Snitt-tempo (/km)</Label>
                  <Input
                    placeholder="4:30"
                    value={data.avgPace ? formatTime(data.avgPace) : ''}
                    onChange={(e) => updateData({ avgPace: parseTimeInput(e.target.value) || undefined })}
                  />
                </div>
              </div>

              {workoutType === 'hyrox_simulation' && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    HYROX inkluderar 8 x 1km löpning mellan stationerna. Logga den totala löpdistansen och tiden här.
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Stations Tab */}
            <TabsContent value="stations" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {STATIONS.map((station) => {
                  const timeKey = `${station.key}Time` as keyof HYROXWorkoutLogData
                  const distanceKey = station.key === 'wallBall' ? 'wallBallReps' : `${station.key}Distance` as keyof HYROXWorkoutLogData
                  const StationIcon = station.icon

                  return (
                    <Card key={station.key} className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <StationIcon className="h-4 w-4 text-orange-500" />
                        <span className="font-medium">{station.label}</span>
                        <Badge variant="outline" className="ml-auto text-xs">
                          {station.distance}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Tid (mm:ss)</Label>
                          <Input
                            placeholder="3:00"
                            value={(data[timeKey] as number) ? formatTime(data[timeKey] as number) : ''}
                            onChange={(e) => updateData({ [timeKey]: parseTimeInput(e.target.value) || undefined })}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">
                            {station.key === 'wallBall' ? 'Reps' : 'Distans (m)'}
                          </Label>
                          <Input
                            type="number"
                            placeholder={station.key === 'wallBall' ? '100' : station.distance.replace('m', '')}
                            value={(data[distanceKey] as number) || ''}
                            onChange={(e) => updateData({ [distanceKey]: parseInt(e.target.value) || undefined })}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>

              {workoutType === 'hyrox_simulation' && (
                <Card className="p-4 bg-orange-50 dark:bg-orange-950/20">
                  <div className="flex items-center gap-2">
                    <Timer className="h-5 w-5 text-orange-500" />
                    <span className="font-medium">Total stationstid:</span>
                    <span className="text-xl font-bold">
                      {formatTime(calculateTotalTime())}
                    </span>
                  </div>
                </Card>
              )}
            </TabsContent>

            {/* Strength Tab */}
            <TabsContent value="strength" className="space-y-4 mt-4">
              <div className="space-y-4">
                {(data.exercises || []).map((exercise, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-4 gap-2">
                      <div className="col-span-4 space-y-1">
                        <Label className="text-xs">Övning</Label>
                        <Input
                          value={exercise.name}
                          onChange={(e) => {
                            const exercises = [...(data.exercises || [])]
                            exercises[index] = { ...exercise, name: e.target.value }
                            updateData({ exercises })
                          }}
                          placeholder="Övningsnamn"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Set</Label>
                        <Input
                          type="number"
                          min={1}
                          value={exercise.sets}
                          onChange={(e) => {
                            const exercises = [...(data.exercises || [])]
                            exercises[index] = { ...exercise, sets: parseInt(e.target.value) || 1 }
                            updateData({ exercises })
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Reps</Label>
                        <Input
                          type="number"
                          min={1}
                          value={exercise.reps}
                          onChange={(e) => {
                            const exercises = [...(data.exercises || [])]
                            exercises[index] = { ...exercise, reps: parseInt(e.target.value) || 1 }
                            updateData({ exercises })
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Vikt (kg)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={exercise.weight || ''}
                          onChange={(e) => {
                            const exercises = [...(data.exercises || [])]
                            exercises[index] = { ...exercise, weight: parseInt(e.target.value) || undefined }
                            updateData({ exercises })
                          }}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500"
                        onClick={() => {
                          const exercises = [...(data.exercises || [])]
                          exercises.splice(index, 1)
                          updateData({ exercises })
                        }}
                      >
                        Ta bort
                      </Button>
                    </div>
                  </Card>
                ))}

                <Button
                  variant="outline"
                  onClick={() => {
                    const exercises = [...(data.exercises || []), { name: '', sets: 3, reps: 10 }]
                    updateData({ exercises })
                  }}
                >
                  + Lägg till övning
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Summary & Submit */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sammanfattning</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{data.duration || 0}</div>
              <div className="text-xs text-muted-foreground">minuter</div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{data.perceivedEffort || 5}/10</div>
              <div className="text-xs text-muted-foreground">RPE</div>
            </div>
            {data.runningDistance && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{(data.runningDistance / 1000).toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">km löpning</div>
              </div>
            )}
            {workoutType === 'hyrox_simulation' && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{formatTime(calculateTotalTime())}</div>
                <div className="text-xs text-muted-foreground">total tid</div>
              </div>
            )}
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              'Sparar...'
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Spara träningspass
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
