'use client'

/**
 * Goal-Based Zone Wizard Component
 *
 * Allows coaches to estimate training zones from race results, time trials, or goals.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import {
  Target,
  Timer,
  Heart,
  TrendingUp,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Check,
} from 'lucide-react'

type GoalType = 'RACE_RESULT' | 'TIME_TRIAL' | 'HR_DRIFT' | 'LOOSE_GOAL'

interface TrainingZones {
  vdot: number
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW'
  keyPaces: {
    easy: number
    marathon: number
    threshold: number
    interval: number
    repetition: number
  }
  zones?: {
    zone1: { min: number; max: number }
    zone2: { min: number; max: number }
    zone3: { min: number; max: number }
    zone4: { min: number; max: number }
    zone5: { min: number; max: number }
  }
}

interface GoalZoneWizardProps {
  onComplete?: (zones: TrainingZones) => void
  clientId?: string
}

const DISTANCES = [
  { value: '5K', label: '5 km' },
  { value: '10K', label: '10 km' },
  { value: '15K', label: '15 km' },
  { value: '20K', label: '20 km' },
  { value: 'HALF_MARATHON', label: 'Halvmaraton (21.1 km)' },
  { value: '30K', label: '30 km' },
  { value: 'MARATHON', label: 'Maraton (42.2 km)' },
]

export function GoalZoneWizard({ onComplete, clientId }: GoalZoneWizardProps) {
  const { toast } = useToast()
  const [step, setStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<TrainingZones | null>(null)

  // Form state
  const [goalType, setGoalType] = useState<GoalType | null>(null)
  const [formData, setFormData] = useState({
    distance: '5K',
    hours: 0,
    minutes: 0,
    seconds: 0,
    hrDriftPercent: 5,
    avgHR: 150,
    duration: 60,
    avgPace: 5,
    goalDescription: '',
    maxHR: undefined as number | undefined,
    restingHR: undefined as number | undefined,
  })

  const goalTypes = [
    {
      id: 'RACE_RESULT' as GoalType,
      icon: Target,
      title: 'Loppsresultat',
      description: 'Använd ett tidigare loppsresultat för att beräkna VDOT',
    },
    {
      id: 'TIME_TRIAL' as GoalType,
      icon: Timer,
      title: 'Tidstest',
      description: 'Använd ett solo-tidstest (5K, 10K, halvmaraton)',
    },
    {
      id: 'HR_DRIFT' as GoalType,
      icon: Heart,
      title: 'HR Drift Test',
      description: 'Använd ett pulsdrifttest för att uppskatta tröskel',
    },
    {
      id: 'LOOSE_GOAL' as GoalType,
      icon: TrendingUp,
      title: 'Målbeskrivning',
      description: 'Beskriv ditt mål (t.ex. "sub-4 maraton")',
    },
  ]

  const calculateZones = async () => {
    if (!goalType) return

    setIsLoading(true)
    try {
      const timeSeconds =
        formData.hours * 3600 + formData.minutes * 60 + formData.seconds

      const payload: Record<string, unknown> = {
        type: goalType,
      }

      if (goalType === 'RACE_RESULT' || goalType === 'TIME_TRIAL') {
        payload.distance = formData.distance
        payload.time = timeSeconds
      } else if (goalType === 'HR_DRIFT') {
        payload.hrDriftPercent = formData.hrDriftPercent
        payload.avgHR = formData.avgHR
        payload.duration = formData.duration
        payload.avgPace = formData.avgPace
      } else if (goalType === 'LOOSE_GOAL') {
        payload.goalDescription = formData.goalDescription
      }

      if (formData.maxHR) {
        payload.maxHR = formData.maxHR
      }
      if (formData.restingHR) {
        payload.restingHR = formData.restingHR
      }

      const response = await fetch('/api/calculations/goal-zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data.zones)
        setStep(2)
        if (onComplete) {
          onComplete(data.zones)
        }
      } else {
        toast({
          title: 'Fel',
          description: data.error || 'Kunde inte beräkna zoner',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Fel',
        description: 'Kunde inte beräkna zoner',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatPace = (pace: number) => {
    const minutes = Math.floor(pace)
    const seconds = Math.round((pace - minutes) * 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const renderStep0 = () => (
    <div className="space-y-4">
      <h3 className="font-medium text-center mb-6">Välj typ av indata</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        {goalTypes.map((type) => {
          const Icon = type.icon
          return (
            <Card
              key={type.id}
              className={`cursor-pointer transition-all hover:border-blue-300 ${
                goalType === type.id ? 'border-blue-500 ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setGoalType(type.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">{type.title}</h4>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Button
        className="w-full mt-6"
        disabled={!goalType}
        onClick={() => setStep(1)}
      >
        Fortsätt
        <ChevronRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  )

  const renderStep1 = () => (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => setStep(0)}>
        <ChevronLeft className="h-4 w-4 mr-2" />
        Tillbaka
      </Button>

      {goalType === 'RACE_RESULT' || goalType === 'TIME_TRIAL' ? (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium">Distans</label>
            <select
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.distance}
              onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
            >
              {DISTANCES.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tid</label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Timmar</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.hours}
                  onChange={(e) =>
                    setFormData({ ...formData, hours: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Minuter</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.minutes}
                  onChange={(e) =>
                    setFormData({ ...formData, minutes: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Sekunder</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.seconds}
                  onChange={(e) =>
                    setFormData({ ...formData, seconds: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
          </div>
        </>
      ) : goalType === 'HR_DRIFT' ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">HR Drift (%)</label>
              <input
                type="number"
                min="0"
                max="50"
                step="0.5"
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.hrDriftPercent}
                onChange={(e) =>
                  setFormData({ ...formData, hrDriftPercent: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Snittpuls (bpm)</label>
              <input
                type="number"
                min="60"
                max="220"
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.avgHR}
                onChange={(e) =>
                  setFormData({ ...formData, avgHR: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Varaktighet (min)</label>
              <input
                type="number"
                min="10"
                max="180"
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.duration}
                onChange={(e) =>
                  setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Snittpace (min/km)</label>
              <input
                type="number"
                min="2"
                max="15"
                step="0.1"
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.avgPace}
                onChange={(e) =>
                  setFormData({ ...formData, avgPace: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
          </div>
        </>
      ) : goalType === 'LOOSE_GOAL' ? (
        <div className="space-y-2">
          <label className="text-sm font-medium">Beskriv ditt mål</label>
          <textarea
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]"
            placeholder="T.ex. 'sub-4 maraton', 'under 25 minuter på 5K', 'klara halvmaraton'"
            value={formData.goalDescription}
            onChange={(e) => setFormData({ ...formData, goalDescription: e.target.value })}
          />
        </div>
      ) : null}

      {/* Optional HR data */}
      <div className="border-t pt-4 mt-4">
        <h4 className="text-sm font-medium mb-3">Valfritt: Pulsdata för HR-zoner</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Max-puls</label>
            <input
              type="number"
              min="100"
              max="220"
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="185"
              value={formData.maxHR || ''}
              onChange={(e) =>
                setFormData({ ...formData, maxHR: parseInt(e.target.value) || undefined })
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Vilopuls</label>
            <input
              type="number"
              min="30"
              max="100"
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="50"
              value={formData.restingHR || ''}
              onChange={(e) =>
                setFormData({ ...formData, restingHR: parseInt(e.target.value) || undefined })
              }
            />
          </div>
        </div>
      </div>

      <Button className="w-full mt-6" onClick={calculateZones} disabled={isLoading}>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Check className="h-4 w-4 mr-2" />
        )}
        Beräkna zoner
      </Button>
    </div>
  )

  const renderStep2 = () => {
    if (!result) return null

    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="font-medium text-lg">Träningszoner beräknade</h3>
          <p className="text-sm text-muted-foreground">
            VDOT: {result.vdot.toFixed(1)} • Konfidens: {result.confidenceLevel}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nyckeltempo (min/km)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lugnt</span>
                <span className="font-mono">{formatPace(result.keyPaces.easy)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Maraton</span>
                <span className="font-mono">{formatPace(result.keyPaces.marathon)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tröskel</span>
                <span className="font-mono">{formatPace(result.keyPaces.threshold)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Intervall</span>
                <span className="font-mono">{formatPace(result.keyPaces.interval)}</span>
              </div>
              <div className="flex justify-between col-span-2">
                <span className="text-muted-foreground">Repetition</span>
                <span className="font-mono">{formatPace(result.keyPaces.repetition)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button variant="outline" className="w-full" onClick={() => setStep(0)}>
          Beräkna nya zoner
        </Button>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Målbaserad zonberäkning
        </CardTitle>
        <CardDescription>
          Beräkna träningszoner utan utrustning baserat på lopp, tidstest eller mål
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 0 && renderStep0()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
      </CardContent>
    </Card>
  )
}
