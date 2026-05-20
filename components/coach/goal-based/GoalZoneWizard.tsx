'use client'

/**
 * Goal-Based Zone Wizard Component
 *
 * Allows coaches to estimate training zones from race results, time trials, or goals.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
} from '@/components/ui/GlassCard'
import { toast } from 'sonner'
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
        toast.success('Zonberäkning slutförd!')
        if (onComplete) {
          onComplete(data.zones)
        }
      } else {
        toast.error(data.error || 'Kunde inte beräkna zoner')
      }
    } catch (error) {
      toast.error('Kunde inte beräkna zoner')
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
      <h3 className="font-semibold text-center text-slate-900 dark:text-white mb-6">Välj typ av indata</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        {goalTypes.map((type) => {
          const Icon = type.icon
          return (
            <div
              key={type.id}
              className={`cursor-pointer transition-all rounded-lg p-4 bg-white/50 dark:bg-slate-950/50 border hover:border-blue-500/50 ${
                goalType === type.id 
                  ? 'border-blue-500 bg-blue-500/5 dark:bg-blue-500/10 ring-1 ring-blue-500' 
                  : 'border-slate-200 dark:border-white/5'
              }`}
              onClick={() => setGoalType(type.id)}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white">{type.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-450 mt-1">{type.description}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <Button
        className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md"
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
      <Button variant="ghost" size="sm" onClick={() => setStep(0)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
        <ChevronLeft className="h-4 w-4 mr-2" />
        Tillbaka
      </Button>

      {goalType === 'RACE_RESULT' || goalType === 'TIME_TRIAL' ? (
        <>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-350">Distans</label>
            <select
              className="w-full h-10 rounded-md border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-950/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={formData.distance}
              onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
            >
              {DISTANCES.map((d) => (
                <option key={d.value} value={d.value} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-350">Tid</label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-450 font-medium">Timmar</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  className="w-full h-10 rounded-md border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-950/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 mt-1"
                  value={formData.hours}
                  onChange={(e) =>
                    setFormData({ ...formData, hours: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-455 font-medium">Minuter</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  className="w-full h-10 rounded-md border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-950/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 mt-1"
                  value={formData.minutes}
                  onChange={(e) =>
                    setFormData({ ...formData, minutes: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-455 font-medium">Sekunder</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  className="w-full h-10 rounded-md border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-950/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 mt-1"
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
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-350">HR Drift (%)</label>
              <input
                type="number"
                min="0"
                max="50"
                step="0.5"
                className="w-full h-10 rounded-md border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-950/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={formData.hrDriftPercent}
                onChange={(e) =>
                  setFormData({ ...formData, hrDriftPercent: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-350">Snittpuls (bpm)</label>
              <input
                type="number"
                min="60"
                max="220"
                className="w-full h-10 rounded-md border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-950/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={formData.avgHR}
                onChange={(e) =>
                  setFormData({ ...formData, avgHR: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-350">Varaktighet (min)</label>
              <input
                type="number"
                min="10"
                max="180"
                className="w-full h-10 rounded-md border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-950/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={formData.duration}
                onChange={(e) =>
                  setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-350">Snittpace (min/km)</label>
              <input
                type="number"
                min="2"
                max="15"
                step="0.1"
                className="w-full h-10 rounded-md border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-950/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
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
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-350">Beskriv ditt mål</label>
          <textarea
            className="w-full rounded-md border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-950/50 px-3 py-2 text-sm text-slate-900 dark:text-white min-h-[100px] focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="T.ex. 'sub-4 maraton', 'under 25 minuter på 5K', 'klara halvmaraton'"
            value={formData.goalDescription}
            onChange={(e) => setFormData({ ...formData, goalDescription: e.target.value })}
          />
        </div>
      ) : null}

      {/* Optional HR data */}
      <div className="border-t border-slate-200 dark:border-white/5 pt-4 mt-4">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Valfritt: Pulsdata för HR-zoner</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-slate-500 dark:text-slate-450 font-medium">Max-puls</label>
            <input
              type="number"
              min="100"
              max="220"
              className="w-full h-10 rounded-md border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-950/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="185"
              value={formData.maxHR || ''}
              onChange={(e) =>
                setFormData({ ...formData, maxHR: parseInt(e.target.value) || undefined })
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-500 dark:text-slate-450 font-medium">Vilopuls</label>
            <input
              type="number"
              min="30"
              max="100"
              className="w-full h-10 rounded-md border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-950/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="50"
              value={formData.restingHR || ''}
              onChange={(e) =>
                setFormData({ ...formData, restingHR: parseInt(e.target.value) || undefined })
              }
            />
          </div>
        </div>
      </div>

      <Button className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md" onClick={calculateZones} disabled={isLoading}>
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
          <div className="w-16 h-16 bg-emerald-500/10 dark:bg-emerald-500/25 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="font-semibold text-lg text-slate-900 dark:text-white">Träningszoner beräknade</h3>
          <p className="text-sm text-slate-500 dark:text-slate-450 mt-1 font-medium">
            VDOT: {result.vdot.toFixed(1)} • Konfidens: {result.confidenceLevel}
          </p>
        </div>

        <div className="p-4 bg-slate-100/50 dark:bg-slate-950/50 border border-slate-200/50 dark:border-white/5 rounded-lg">
          <h4 className="font-semibold text-sm text-slate-900 dark:text-white mb-4">Nyckeltempo (min/km)</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between items-center p-2 bg-white/40 dark:bg-slate-900/40 rounded border border-slate-200/30 dark:border-white/5">
              <span className="text-slate-500 dark:text-slate-450 font-medium">Lugnt</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{formatPace(result.keyPaces.easy)}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-white/40 dark:bg-slate-900/40 rounded border border-slate-200/30 dark:border-white/5">
              <span className="text-slate-500 dark:text-slate-450 font-medium">Maraton</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{formatPace(result.keyPaces.marathon)}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-white/40 dark:bg-slate-900/40 rounded border border-slate-200/30 dark:border-white/5">
              <span className="text-slate-500 dark:text-slate-450 font-medium">Tröskel</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{formatPace(result.keyPaces.threshold)}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-white/40 dark:bg-slate-900/40 rounded border border-slate-200/30 dark:border-white/5">
              <span className="text-slate-500 dark:text-slate-450 font-medium">Intervall</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{formatPace(result.keyPaces.interval)}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-white/40 dark:bg-slate-900/40 rounded border border-slate-200/30 dark:border-white/5 col-span-2">
              <span className="text-slate-500 dark:text-slate-450 font-medium">Repetition</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{formatPace(result.keyPaces.repetition)}</span>
            </div>
          </div>
        </div>

        <Button variant="outline" className="w-full border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-900" onClick={() => setStep(0)}>
          Beräkna nya zoner
        </Button>
      </div>
    )
  }

  return (
    <GlassCard glow="blue" className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 shadow-md">
      <GlassCardHeader>
        <GlassCardTitle className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
          <Target className="h-5 w-5 text-blue-500" />
          Målbaserad zonberäkning
        </GlassCardTitle>
        <GlassCardDescription className="text-slate-650 dark:text-slate-400">
          Beräkna träningszoner utan utrustning baserat på lopp, tidstest eller mål
        </GlassCardDescription>
      </GlassCardHeader>
      <GlassCardContent>
        {step === 0 && renderStep0()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
      </GlassCardContent>
    </GlassCard>
  )
}
