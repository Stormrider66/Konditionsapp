'use client'

// components/coach/race-results/RaceResultForm.tsx
// Form for entering race results with automatic VDOT calculation
// Integrated with Data Moat system for prediction validation

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Star, Brain, Target } from 'lucide-react'

// Types for Data Moat integration
interface AIPrediction {
  id: string
  predictionType: string
  predictedValue: { seconds?: number; formatted?: string }
  confidenceScore: number
  createdAt: string
}

interface RaceResultFormProps {
  clientId: string
  clientName: string
  onSuccess?: (raceResultId: string) => void
  onCancel?: () => void
}

export function RaceResultForm({ clientId, clientName, onSuccess, onCancel }: RaceResultFormProps) {
  const router = useRouter()
  const pathname = usePathname()
  const slugMatch = pathname.match(/^\/([^/]+)\/coach/)
  const basePath = slugMatch ? `/${slugMatch[1]}` : ''
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [raceName, setRaceName] = useState('')
  const [raceDate, setRaceDate] = useState('')
  const [distance, setDistance] = useState<'5K' | '10K' | 'HALF_MARATHON' | 'MARATHON' | 'CUSTOM'>('10K')
  const [customDistanceKm, setCustomDistanceKm] = useState<number | null>(null)

  // Time input (separate fields for easier input)
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')
  const [seconds, setSeconds] = useState('')

  // Optional fields
  const [goalTime, setGoalTime] = useState('')
  const [goalAchieved, setGoalAchieved] = useState(false)
  const [raceType, setRaceType] = useState<'TRAINING_RACE' | 'B_RACE' | 'A_RACE' | 'TIME_TRIAL'>('B_RACE')
  const [temperature, setTemperature] = useState<number | null>(null)
  const [humidity, setHumidity] = useState<number | null>(null)
  const [terrain, setTerrain] = useState<'FLAT' | 'ROLLING' | 'HILLY' | 'TRAIL'>('FLAT')
  const [conditions, setConditions] = useState('')
  const [athleteNotes, setAthleteNotes] = useState('')
  const [coachNotes, setCoachNotes] = useState('')
  const [usedForZones, setUsedForZones] = useState(false)

  // Data Moat: Prediction linking and satisfaction
  const [availablePredictions, setAvailablePredictions] = useState<AIPrediction[]>([])
  const [linkedPredictionId, setLinkedPredictionId] = useState<string | null>(null)
  const [satisfactionScore, setSatisfactionScore] = useState<number | null>(null)
  const [goalAssessment, setGoalAssessment] = useState<'EXCEEDED' | 'MET' | 'MISSED' | null>(null)

  // Calculated VDOT preview (client-side estimation)
  const [estimatedVDOT, setEstimatedVDOT] = useState<number | null>(null)

  // Fetch available predictions for this athlete
  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        const response = await fetch(
          `/api/data-moat/predictions?athleteId=${clientId}&predictionType=RACE_TIME&validated=false`
        )
        if (response.ok) {
          const data = await response.json()
          setAvailablePredictions(data.predictions || [])
        }
      } catch (error) {
        console.error('Failed to fetch predictions:', error)
      }
    }

    fetchPredictions()
  }, [clientId])

  // Calculate time in minutes
  const calculateTimeMinutes = (): number | null => {
    const h = parseInt(hours) || 0
    const m = parseInt(minutes) || 0
    const s = parseInt(seconds) || 0

    if (m === 0 && h === 0 && s === 0) return null

    return h * 60 + m + s / 60
  }

  // Format time as HH:MM:SS or MM:SS
  const formatTime = (): string => {
    const h = parseInt(hours) || 0
    const m = parseInt(minutes) || 0
    const s = parseInt(seconds) || 0

    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    } else {
      return `${m}:${String(s).padStart(2, '0')}`
    }
  }

  // Simple VDOT estimation (Jack Daniels formula)
  const estimateVDOT = () => {
    const timeMinutes = calculateTimeMinutes()
    if (!timeMinutes) return

    let distanceMeters = 0
    switch (distance) {
      case '5K':
        distanceMeters = 5000
        break
      case '10K':
        distanceMeters = 10000
        break
      case 'HALF_MARATHON':
        distanceMeters = 21097.5
        break
      case 'MARATHON':
        distanceMeters = 42195
        break
      case 'CUSTOM':
        distanceMeters = (customDistanceKm || 10) * 1000
        break
    }

    // Simple VDOT calculation
    const velocityMperMin = distanceMeters / timeMinutes
    const vo2 = -4.60 + 0.182258 * velocityMperMin + 0.000104 * velocityMperMin * velocityMperMin

    // Estimate percent max based on duration
    let percentMax = 0.85
    if (timeMinutes <= 6) percentMax = 0.998
    else if (timeMinutes <= 12) percentMax = 0.99
    else if (timeMinutes <= 30) percentMax = 0.96
    else if (timeMinutes <= 60) percentMax = 0.93
    else if (timeMinutes <= 120) percentMax = 0.89
    else if (timeMinutes <= 180) percentMax = 0.86

    const vdot = vo2 / percentMax
    setEstimatedVDOT(Math.round(vdot * 10) / 10)
  }

  // Recalculate VDOT when time or distance changes
  const handleTimeChange = (field: 'hours' | 'minutes' | 'seconds', value: string) => {
    if (field === 'hours') setHours(value)
    else if (field === 'minutes') setMinutes(value)
    else setSeconds(value)

    // Trigger estimation after state update
    setTimeout(estimateVDOT, 100)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const timeMinutes = calculateTimeMinutes()
    if (!timeMinutes) {
      setError('Please enter a valid race time')
      setIsSubmitting(false)
      return
    }

    if (!raceDate) {
      setError('Please enter race date')
      setIsSubmitting(false)
      return
    }

    if (distance === 'CUSTOM' && !customDistanceKm) {
      setError('Please enter custom distance')
      setIsSubmitting(false)
      return
    }

    try {
      const response = await fetch('/api/race-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId,
          raceName: raceName || undefined,
          raceDate,
          distance,
          customDistanceKm: distance === 'CUSTOM' ? customDistanceKm : undefined,
          timeMinutes,
          timeFormatted: formatTime(),
          temperature: temperature || undefined,
          humidity: humidity || undefined,
          terrain,
          goalTime: goalTime || undefined,
          goalAchieved,
          goalAssessment: goalAssessment || undefined,
          raceType,
          conditions: conditions || undefined,
          athleteNotes: athleteNotes || undefined,
          coachNotes: coachNotes || undefined,
          usedForZones,
          // Data Moat fields
          satisfactionScore: satisfactionScore || undefined,
          linkedPredictionId: linkedPredictionId || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create race result')
      }

      const raceResult = await response.json()

      // Data Moat: Validate linked prediction if present
      if (linkedPredictionId && timeMinutes) {
        try {
          const actualSeconds = timeMinutes * 60
          await fetch(`/api/data-moat/predictions/${linkedPredictionId}/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              actualValue: { seconds: actualSeconds, formatted: formatTime() },
              occurredAt: new Date(raceDate).toISOString(),
              environmentalFactors: {
                temperature,
                humidity,
                terrain,
                conditions,
              },
              validationSource: 'AUTO_RACE_RESULT',
              validationQuality: 0.95, // High quality - direct race result
            }),
          })
        } catch (validationError) {
          console.error('Failed to validate prediction:', validationError)
          // Don't fail the whole submission for prediction validation errors
        }
      }

      if (onSuccess) {
        onSuccess(raceResult.id)
      } else {
        router.push(`${basePath}/coach/clients/${clientId}`)
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Race Result - {clientName}</CardTitle>
          <CardDescription>
            Enter race performance data. VDOT and training paces will be calculated automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="raceName">Race Name (optional)</Label>
              <Input
                id="raceName"
                placeholder="Stockholm Marathon"
                value={raceName}
                onChange={(e) => setRaceName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="raceDate">Race Date *</Label>
              <Input
                id="raceDate"
                type="date"
                value={raceDate}
                onChange={(e) => setRaceDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Distance */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="distance">Distance *</Label>
              <Select value={distance} onValueChange={(value: any) => setDistance(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5K">5K</SelectItem>
                  <SelectItem value="10K">10K</SelectItem>
                  <SelectItem value="HALF_MARATHON">Half Marathon (21.1K)</SelectItem>
                  <SelectItem value="MARATHON">Marathon (42.2K)</SelectItem>
                  <SelectItem value="CUSTOM">Custom Distance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {distance === 'CUSTOM' && (
              <div className="space-y-2">
                <Label htmlFor="customDistance">Custom Distance (km) *</Label>
                <Input
                  id="customDistance"
                  type="number"
                  step="0.1"
                  placeholder="15"
                  value={customDistanceKm || ''}
                  onChange={(e) => setCustomDistanceKm(parseFloat(e.target.value) || null)}
                  required={distance === 'CUSTOM'}
                />
              </div>
            )}
          </div>

          {/* Time */}
          <div className="space-y-2">
            <Label>Race Time *</Label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label htmlFor="hours" className="text-xs text-muted-foreground">
                  Hours
                </Label>
                <Input
                  id="hours"
                  type="number"
                  min="0"
                  max="10"
                  placeholder="1"
                  value={hours}
                  onChange={(e) => handleTimeChange('hours', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="minutes" className="text-xs text-muted-foreground">
                  Minutes *
                </Label>
                <Input
                  id="minutes"
                  type="number"
                  min="0"
                  max="59"
                  placeholder="28"
                  value={minutes}
                  onChange={(e) => handleTimeChange('minutes', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="seconds" className="text-xs text-muted-foreground">
                  Seconds
                </Label>
                <Input
                  id="seconds"
                  type="number"
                  min="0"
                  max="59"
                  placeholder="30"
                  value={seconds}
                  onChange={(e) => handleTimeChange('seconds', e.target.value)}
                />
              </div>
            </div>
            {estimatedVDOT && (
              <p className="text-sm text-muted-foreground mt-2">
                Estimated VDOT: <strong>{estimatedVDOT}</strong> ({formatTime()})
              </p>
            )}
          </div>

          {/* Race Type & Goal */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="raceType">Race Type</Label>
              <Select value={raceType} onValueChange={(value: any) => setRaceType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRAINING_RACE">Training Race</SelectItem>
                  <SelectItem value="B_RACE">B Race</SelectItem>
                  <SelectItem value="A_RACE">A Race (Goal)</SelectItem>
                  <SelectItem value="TIME_TRIAL">Time Trial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="goalTime">Goal Time (optional)</Label>
              <Input
                id="goalTime"
                placeholder="1:25:00"
                value={goalTime}
                onChange={(e) => setGoalTime(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goalAssessment">Goal Assessment</Label>
              <Select
                value={goalAssessment || ''}
                onValueChange={(value) => {
                  setGoalAssessment(value as 'EXCEEDED' | 'MET' | 'MISSED' | null)
                  setGoalAchieved(value === 'EXCEEDED' || value === 'MET')
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXCEEDED">
                    <span className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-green-500" />
                      Exceeded Goal
                    </span>
                  </SelectItem>
                  <SelectItem value="MET">
                    <span className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-500" />
                      Met Goal
                    </span>
                  </SelectItem>
                  <SelectItem value="MISSED">
                    <span className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-red-500" />
                      Missed Goal
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Data Moat: Prediction Linking */}
          {availablePredictions.length > 0 && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="h-4 w-4 text-blue-600" />
                  <Label className="text-blue-800 font-medium">AI Prediction Available</Label>
                </div>
                <div className="space-y-3">
                  <Select
                    value={linkedPredictionId || ''}
                    onValueChange={(value) => setLinkedPredictionId(value || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Link to AI prediction..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No prediction linked</SelectItem>
                      {availablePredictions.map((pred) => (
                        <SelectItem key={pred.id} value={pred.id}>
                          <span className="flex items-center gap-2">
                            Predicted: {pred.predictedValue.formatted || 'N/A'}
                            <Badge variant="outline" className="ml-2">
                              {Math.round(pred.confidenceScore * 100)}% confidence
                            </Badge>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {linkedPredictionId && (
                    <p className="text-xs text-blue-600">
                      Linking helps validate AI predictions and improve future accuracy.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Data Moat: Satisfaction Score */}
          <div className="space-y-2">
            <Label>Overall Satisfaction with Performance</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((score) => (
                <Button
                  key={score}
                  type="button"
                  variant={satisfactionScore === score ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSatisfactionScore(score)}
                  className="flex-1"
                >
                  <Star
                    className={`h-4 w-4 ${
                      satisfactionScore && satisfactionScore >= score
                        ? 'fill-yellow-400 text-yellow-400'
                        : ''
                    }`}
                  />
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {satisfactionScore === 1 && 'Very disappointed'}
              {satisfactionScore === 2 && 'Below expectations'}
              {satisfactionScore === 3 && 'Met expectations'}
              {satisfactionScore === 4 && 'Above expectations'}
              {satisfactionScore === 5 && 'Excellent performance'}
            </p>
          </div>

          {/* Conditions */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature (°C)</Label>
              <Input
                id="temperature"
                type="number"
                placeholder="15"
                value={temperature || ''}
                onChange={(e) => setTemperature(parseFloat(e.target.value) || null)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="humidity">Humidity (%)</Label>
              <Input
                id="humidity"
                type="number"
                min="0"
                max="100"
                placeholder="60"
                value={humidity || ''}
                onChange={(e) => setHumidity(parseFloat(e.target.value) || null)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="terrain">Terrain</Label>
              <Select value={terrain} onValueChange={(value: any) => setTerrain(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FLAT">Flat</SelectItem>
                  <SelectItem value="ROLLING">Rolling</SelectItem>
                  <SelectItem value="HILLY">Hilly</SelectItem>
                  <SelectItem value="TRAIL">Trail</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="conditions">Conditions (Weather, Course, etc.)</Label>
            <Textarea
              id="conditions"
              placeholder="Windy, good pavement, some hills..."
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="athleteNotes">Athlete Notes</Label>
            <Textarea
              id="athleteNotes"
              placeholder="How did the athlete feel during the race?"
              value={athleteNotes}
              onChange={(e) => setAthleteNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="coachNotes">Coach Notes</Label>
            <Textarea
              id="coachNotes"
              placeholder="Your analysis and feedback..."
              value={coachNotes}
              onChange={(e) => setCoachNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Use for zones */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="usedForZones"
              checked={usedForZones}
              onChange={(e) => setUsedForZones(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="usedForZones" className="text-sm font-normal">
              Use this race result to calculate current training zones
            </Label>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end space-x-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Race Result'}
        </Button>
      </div>
    </form>
  )
}
