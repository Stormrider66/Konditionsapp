'use client'

/**
 * Daily Check-In Form Component
 *
 * Comprehensive daily metrics collection form for athletes:
 * - HRV (Heart Rate Variability)
 * - RHR (Resting Heart Rate)
 * - Wellness Questionnaire (7 questions)
 * - Voice Check-In (via Gemini audio analysis)
 *
 * Automatically calculates readiness score on submission.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Mic, ClipboardList, Watch, CheckCircle2, ChevronRight, Zap, Moon, Activity, Smile, AlertCircle, Loader2, Stethoscope, MessageCircle } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
  GlassCardDescription
} from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'
import { AudioRecorder } from '@/components/athlete/audio-journal/AudioRecorder'
import { NutritionTipCard, NutritionTipCardSkeleton } from '@/components/nutrition/NutritionTipCard'
import type { NutritionTip } from '@/lib/nutrition-timing'
import type { SportType } from '@prisma/client'
import {
  InjurySelector,
  createDefaultInjurySelectorValue,
  validateInjurySelection,
  type InjurySelectorValue,
} from '@/components/athlete/injury/InjurySelector'
import { analyzeNotesForInjury } from '@/lib/injury-detection'

// Garmin prefill data interface
interface GarminPrefillData {
  available: boolean
  source: 'garmin' | 'none'
  lastSyncAt?: string
  data: {
    hrvRMSSD?: number
    hrvStatus?: string
    restingHR?: number
    sleepHours?: number
    sleepQuality?: number
    stress?: number
  }
}

// Form schema
const checkInSchema = z.object({
  // HRV data (optional)
  hrvRMSSD: z.number().min(1).max(300).optional().nullable(),
  hrvQuality: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR']).optional().nullable(),

  // RHR data (optional)
  restingHR: z.number().min(30).max(120).optional().nullable(),

  // Wellness questionnaire (required)
  sleepQuality: z.number().min(1).max(10),
  sleepHours: z.number().min(0).max(14),
  muscleSoreness: z.number().min(1).max(10),
  energyLevel: z.number().min(1).max(10),
  mood: z.number().min(1).max(10),
  stress: z.number().min(1).max(10),
  injuryPain: z.number().min(1).max(10),

  // Rehab compliance (optional)
  rehabExercisesDone: z.boolean().optional(),
  rehabPainDuring: z.number().min(0).max(10).optional().nullable(),
  rehabPainAfter: z.number().min(0).max(10).optional().nullable(),
  rehabNotes: z.string().max(500).optional(),
  requestPhysioContact: z.boolean().optional(),
  physioContactReason: z.string().max(500).optional(),

  // Notes (optional)
  notes: z.string().max(500).optional(),
})

type CheckInFormData = z.infer<typeof checkInSchema>

interface DailyCheckInFormProps {
  clientId: string
  sport?: SportType // Primary sport for injury type filtering
  onSuccess?: () => void
  variant?: 'default' | 'glass'
  basePath?: string
}

// Audio recording result type
interface AudioJournalResult {
  transcription: string;
  wellness: {
    sleepQuality?: number;
    sleepHours?: number;
    fatigue?: number;
    soreness?: number;
    sorenessLocation?: string;
    stress?: number;
    mood?: number;
    motivation?: number;
    rpe?: number;
  };
  aiInterpretation: {
    readinessEstimate: number;
    recommendedAction: 'PROCEED' | 'REDUCE' | 'EASY' | 'REST';
    flaggedConcerns: string[];
  };
}

export function DailyCheckInForm({ clientId, sport = 'RUNNING', onSuccess, variant = 'default', basePath = '' }: DailyCheckInFormProps) {
  const isGlass = variant === 'glass'
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [readinessResult, setReadinessResult] = useState<any>(null)
  const [injuryResponse, setInjuryResponse] = useState<any>(null)
  const [voiceMode, setVoiceMode] = useState(false)
  const [voiceResult, setVoiceResult] = useState<AudioJournalResult | null>(null)
  const [nutritionTip, setNutritionTip] = useState<NutritionTip | null>(null)
  const [isLoadingTip, setIsLoadingTip] = useState(false)
  const [garminPrefill, setGarminPrefill] = useState<GarminPrefillData | null>(null)
  const [garminApplied, setGarminApplied] = useState(false)
  const [injurySelection, setInjurySelection] = useState<InjurySelectorValue>(
    createDefaultInjurySelectorValue()
  )
  const [hasActiveRehabProgram, setHasActiveRehabProgram] = useState(false)
  const [activeRehabExercises, setActiveRehabExercises] = useState<{name: string; nameSv: string}[]>([])

  const form = useForm<CheckInFormData>({
    resolver: zodResolver(checkInSchema),
    defaultValues: {
      hrvRMSSD: undefined,
      hrvQuality: undefined,
      restingHR: undefined,
      sleepQuality: 5,
      sleepHours: 7,
      muscleSoreness: 1, // Default to no soreness
      energyLevel: 5,
      mood: 5,
      stress: 1, // Default to no stress
      injuryPain: 1, // Default to no pain
      notes: '',
      // Rehab compliance defaults
      rehabExercisesDone: false,
      rehabPainDuring: undefined,
      rehabPainAfter: undefined,
      rehabNotes: '',
      requestPhysioContact: false,
      physioContactReason: '',
    },
  })

  // Fetch Garmin prefill data on mount
  useEffect(() => {
    async function fetchGarminPrefill() {
      try {
        const response = await fetch(`/api/athlete/garmin-prefill?clientId=${clientId}`)
        if (response.ok) {
          const data = await response.json()
          setGarminPrefill(data)
        }
      } catch (error) {
        console.error('Failed to fetch Garmin prefill data:', error)
      }
    }
    fetchGarminPrefill()
  }, [clientId])

  // Fetch active rehab programs for this athlete
  useEffect(() => {
    async function fetchActiveRehabPrograms() {
      try {
        const response = await fetch(`/api/physio/rehab-programs?clientId=${clientId}&status=ACTIVE`)
        if (response.ok) {
          const data = await response.json()
          if (data.programs && data.programs.length > 0) {
            setHasActiveRehabProgram(true)
            // Collect exercises from all active programs
            const exercises: {name: string; nameSv: string}[] = []
            for (const program of data.programs) {
              if (program.exercises) {
                for (const ex of program.exercises) {
                  if (ex.exercise) {
                    exercises.push({
                      name: ex.exercise.name,
                      nameSv: ex.exercise.nameSv || ex.exercise.name
                    })
                  }
                }
              }
            }
            setActiveRehabExercises(exercises)
          }
        }
      } catch (error) {
        console.error('Failed to fetch active rehab programs:', error)
      }
    }
    fetchActiveRehabPrograms()
  }, [clientId])

  // Apply Garmin prefill data
  const applyGarminData = () => {
    if (!garminPrefill?.available || !garminPrefill.data) return

    const data = garminPrefill.data

    if (data.hrvRMSSD) {
      form.setValue('hrvRMSSD', data.hrvRMSSD)
    }
    if (data.restingHR) {
      form.setValue('restingHR', data.restingHR)
    }
    if (data.sleepHours) {
      form.setValue('sleepHours', data.sleepHours)
    }
    if (data.sleepQuality) {
      form.setValue('sleepQuality', data.sleepQuality)
    }
    if (data.stress) {
      // Convert Garmin stress to inverted scale (1 = low stress is good)
      // Garmin: higher = more stress, Form: higher = more stress too
      form.setValue('stress', data.stress)
    }

    setGarminApplied(true)
    toast({
      title: 'Garmin-data tillämpat',
      description: 'HRV, puls och sömndata har fyllts i från din Garmin.',
    })
  }

  async function onSubmit(data: CheckInFormData) {
    setIsSubmitting(true)
    setReadinessResult(null)

    try {
      // Validate injury selection if pain >= 5
      if (data.injuryPain >= 5) {
        const validation = validateInjurySelection(injurySelection, data.injuryPain)
        if (!validation.valid) {
          toast({
            title: 'Vänligen specificera skadan',
            description: validation.errors.join('. '),
            variant: 'destructive',
          })
          setIsSubmitting(false)
          return
        }
      }

      // Analyze notes for injury keywords
      const keywordAnalysis = data.notes ? analyzeNotesForInjury(data.notes) : null

      // Send values as-is to backend (1 = no pain/stress, 10 = extreme pain/stress)
      // Backend expects natural scale: higher values = worse condition
      const response = await fetch('/api/daily-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId,
          date: new Date().toISOString(),
          hrvRMSSD: data.hrvRMSSD || null,
          hrvQuality: data.hrvQuality || null,
          restingHR: data.restingHR || null,
          sleepQuality: data.sleepQuality,
          sleepHours: data.sleepHours,
          muscleSoreness: data.muscleSoreness,
          energyLevel: data.energyLevel,
          mood: data.mood,
          stress: data.stress,
          injuryPain: data.injuryPain,
          notes: data.notes || null,
          // Injury details (when pain >= 3)
          injuryDetails: data.injuryPain >= 3 ? {
            bodyPart: injurySelection.bodyPart,
            injuryType: injurySelection.injuryType,
            side: injurySelection.side,
            isIllness: injurySelection.isIllness,
            illnessType: injurySelection.illnessType,
          } : null,
          // Keyword analysis from notes
          keywordAnalysis: keywordAnalysis ? {
            suggestedBodyPart: keywordAnalysis.suggestedBodyPart,
            suggestedSide: keywordAnalysis.suggestedSide,
            severityLevel: keywordAnalysis.severityLevel,
            detectedIllness: keywordAnalysis.detectedIllness,
            hasInjuryKeywords: keywordAnalysis.hasInjuryKeywords,
            hasIllnessKeywords: keywordAnalysis.hasIllnessKeywords,
            summary: keywordAnalysis.summary,
            matches: keywordAnalysis.matches,
          } : null,
          // Rehab compliance (Phase 7 - Physio System)
          rehabExercisesDone: data.rehabExercisesDone,
          rehabPainDuring: data.rehabPainDuring ?? null,
          rehabPainAfter: data.rehabPainAfter ?? null,
          rehabNotes: data.rehabNotes || null,
          requestPhysioContact: data.requestPhysioContact,
          physioContactReason: data.physioContactReason || null,
        }),
      })

      if (!response.ok) {
        const responseText = await response.text()
        console.error('Check-in submission failed:', response.status, responseText)
        let errorData
        try {
          errorData = JSON.parse(responseText)
        } catch {
          errorData = { error: `Server error: ${response.status}` }
        }
        throw new Error(errorData.error || 'Failed to submit check-in')
      }

      const result = await response.json()

      setReadinessResult(result.assessments?.readiness)
      setInjuryResponse(result.injuryResponse)

      // Fetch nutrition tip in the background
      // Note: Nutrition tip API expects 0-100 scale, readiness score is 0-10
      setIsLoadingTip(true)
      const readinessFor100Scale = result.assessments?.readiness?.score
        ? result.assessments.readiness.score * 10
        : undefined
      fetch('/api/nutrition/tip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          readinessScore: readinessFor100Scale,
        }),
      })
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.tip) {
            setNutritionTip(data.tip)
          }
        })
        .catch((err) => {
          console.error('Failed to fetch nutrition tip:', err)
        })
        .finally(() => {
          setIsLoadingTip(false)
        })

      // Show appropriate toast based on injury trigger
      if (result.injuryResponse?.triggered) {
        toast({
          title: '⚠️ Injury/Fatigue Alert',
          description: 'Your workouts have been automatically adjusted. Your coach has been notified.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Check-in submitted',
          description: 'Your daily metrics have been recorded successfully.',
        })
      }

      if (onSuccess) {
        onSuccess()
      } else {
        // Gap 7: Refresh to revalidate dashboard data before redirect
        router.refresh()
        // Redirect to athlete dashboard after a short delay to show success feedback
        setTimeout(() => {
          router.push(`${basePath}/athlete/dashboard`)
        }, 1500)
      }
    } catch (error) {
      console.error('Error submitting check-in:', error)
      toast({
        title: 'Error',
        description: 'Failed to submit check-in. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle voice recording completion
  const handleVoiceComplete = (result: AudioJournalResult) => {
    setVoiceResult(result)

    // Create a pseudo-readiness result from voice analysis
    setReadinessResult({
      score: result.aiInterpretation.readinessEstimate,
      status: result.aiInterpretation.recommendedAction === 'PROCEED' ? 'OPTIMAL'
        : result.aiInterpretation.recommendedAction === 'REDUCE' ? 'MODERATE'
          : result.aiInterpretation.recommendedAction === 'EASY' ? 'LOW'
            : 'CRITICAL',
      recommendation: result.aiInterpretation.recommendedAction === 'PROCEED'
        ? 'Kör enligt plan - du verkar redo för dagens träning!'
        : result.aiInterpretation.recommendedAction === 'REDUCE'
          ? 'Minska intensiteten något idag baserat på din incheckning.'
          : result.aiInterpretation.recommendedAction === 'EASY'
            ? 'Ta det lugnt idag - fokusera på återhämtning.'
            : 'Vila rekommenderas. Lyssna på kroppen och återhämta dig.',
      warnings: result.aiInterpretation.flaggedConcerns,
      criticalFlags: [],
    })

    // Fetch nutrition tip for voice check-in
    // Note: Nutrition tip API expects 0-100 scale, readiness estimate is 0-10
    setIsLoadingTip(true)
    const readinessFor100Scale = result.aiInterpretation.readinessEstimate
      ? result.aiInterpretation.readinessEstimate * 10
      : undefined
    fetch('/api/nutrition/tip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        readinessScore: readinessFor100Scale,
      }),
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.tip) {
          setNutritionTip(data.tip)
        }
      })
      .catch((err) => {
        console.error('Failed to fetch nutrition tip:', err)
      })
      .finally(() => {
        setIsLoadingTip(false)
      })

    toast({
      title: 'Röstincheckning klar',
      description: 'Din incheckning har analyserats och sparats.',
    })

    if (onSuccess) {
      onSuccess()
    } else {
      // Gap 7: Refresh to revalidate dashboard data before redirect
      router.refresh()
      // Redirect to athlete dashboard after a short delay to show success feedback
      setTimeout(() => {
        router.push(`${basePath}/athlete/dashboard`)
      }, 1500)
    }
  }

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <GlassCard className={cn("p-1", !isGlass && "bg-card")}>
        <GlassCardContent className="p-2">
          <div className="flex p-1 bg-white/5 rounded-2xl">
            <Button
              type="button"
              variant="ghost"
              className={cn(
                "flex-1 h-12 gap-2 rounded-xl transition-all font-black uppercase tracking-widest text-[10px]",
                !voiceMode
                  ? "bg-white text-black shadow-lg shadow-white/10"
                  : "text-slate-500 hover:text-slate-300"
              )}
              onClick={() => setVoiceMode(false)}
            >
              <ClipboardList className="h-4 w-4" />
              Formulär
            </Button>
            <Button
              type="button"
              variant="ghost"
              className={cn(
                "flex-1 h-12 gap-2 rounded-xl transition-all font-black uppercase tracking-widest text-[10px]",
                voiceMode
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "text-slate-500 hover:text-slate-300"
              )}
              onClick={() => setVoiceMode(true)}
            >
              <Mic className="h-4 w-4" />
              Röstincheckning
            </Button>
          </div>
          {voiceMode && (
            <p className="text-[11px] font-medium text-slate-400 text-center mt-3 animate-in fade-in duration-500 px-4">
              Berätta hur du mår - fokusera på sömn, energi, ömhet, stress och motivation.
            </p>
          )}
        </GlassCardContent>
      </GlassCard>

      {/* Garmin Prefill Banner */}
      {garminPrefill?.available && !voiceMode && (
        <div className={cn(
          "p-4 rounded-[2rem] transition-all duration-500",
          isGlass
            ? "bg-blue-500/10 border border-blue-500/20 shadow-[0_4px_20px_rgba(59,130,246,0.1)]"
            : "border-blue-200 bg-blue-50/50"
        )}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                <Watch className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className={cn("font-black tracking-tight", isGlass ? "text-white" : "text-blue-900")}>Hämta från Garmin</p>
                <p className={cn("text-xs font-medium", isGlass ? "text-slate-400" : "text-blue-700")}>
                  HRV, puls och sömndata finns tillgängligt.
                </p>
              </div>
            </div>
            {garminApplied ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-in zoom-in-95">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Klart</span>
              </div>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={cn(
                  "font-black text-[10px] uppercase tracking-widest h-10 px-4 rounded-xl",
                  isGlass ? "bg-white/5 border border-white/10 text-blue-400 hover:bg-white/10" : "border-blue-300 text-blue-700"
                )}
                onClick={applyGarminData}
              >
                Tillämpa
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Voice Mode: AudioRecorder */}
      {voiceMode ? (
        <AudioRecorder
          clientId={clientId}
          onRecordingComplete={handleVoiceComplete}
          onCancel={() => setVoiceMode(false)}
          variant={isGlass ? "glass" : "default"}
        />
      ) : (
        /* Form Mode: Manual form */
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* HRV Section */}
            <GlassCard>
              <GlassCardHeader>
                <GlassCardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                  <Activity className="h-5 w-5 text-purple-500" />
                  Heart Rate Variability
                </GlassCardTitle>
                <GlassCardDescription className="text-slate-400">
                  Valfritt - hämta från Garmin eller fyll i manuellt.
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="hrvRMSSD"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px] font-black uppercase tracking-widest text-slate-500">HRV RMSSD (ms)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="t.ex. 65"
                            className="bg-white/5 border-white/10 h-12 text-lg font-black"
                            {...field}
                            onChange={e =>
                              field.onChange(
                                e.target.value ? parseFloat(e.target.value) : undefined
                              )
                            }
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hrvQuality"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px] font-black uppercase tracking-widest text-slate-500">Kvalitet</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value ?? undefined}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-white/5 border-white/10 h-12">
                              <SelectValue placeholder="Välj kvalitet" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-slate-900 border-white/10">
                            <SelectItem value="EXCELLENT">Utmärkt</SelectItem>
                            <SelectItem value="GOOD">Bra</SelectItem>
                            <SelectItem value="FAIR">Godkänd</SelectItem>
                            <SelectItem value="POOR">Dålig</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </GlassCardContent>
            </GlassCard>

            {/* RHR Section */}
            <GlassCard>
              <GlassCardHeader>
                <GlassCardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-500" />
                  Vilopuls
                </GlassCardTitle>
                <GlassCardDescription className="text-slate-400">
                  Mät direkt när du vaknar för bäst resultat.
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                <FormField
                  control={form.control}
                  name="restingHR"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-black uppercase tracking-widest text-slate-500">Vilopuls (bpm)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="t.ex. 55"
                          className="bg-white/5 border-white/10 h-12 text-lg font-black"
                          {...field}
                          onChange={e =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </GlassCardContent>
            </GlassCard>

            {/* Wellness Questionnaire */}
            <GlassCard>
              <GlassCardHeader>
                <GlassCardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                  <Smile className="h-5 w-5 text-yellow-500" />
                  Mående & Återhämtning
                </GlassCardTitle>
                <GlassCardDescription className="text-slate-400 font-medium">
                  Svara ärligt på samtliga frågor (1-10)
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent className="space-y-10 py-6">
                {[
                  { name: 'sleepQuality', label: 'Sömnkvalitet', icon: <Moon className="h-4 w-4" />, low: 'Mycket dålig', high: 'Fantastisk' },
                  { name: 'sleepHours', label: 'Sömntimmar', icon: <Moon className="h-4 w-4" />, isHours: true },
                  { name: 'muscleSoreness', label: 'Muskelömhet', icon: <Activity className="h-4 w-4" />, low: 'Ingen ömhet', high: 'Extrem ömhet' },
                  { name: 'energyLevel', label: 'Energinivå', icon: <Zap className="h-4 w-4" />, low: 'Helt slut', high: 'Maxad energi' },
                  { name: 'mood', label: 'Humör', icon: <Smile className="h-4 w-4" />, low: 'Lågt', high: 'Toppen' },
                  { name: 'stress', label: 'Stressnivå', icon: <AlertCircle className="h-4 w-4" />, low: 'Ingen stress', high: 'Extremt stressad' },
                  { name: 'injuryPain', label: 'Skadekänning/Smärta', icon: <Activity className="h-4 w-4" />, low: 'Ingen smärta', high: 'Problem' },
                ].map((slider) => (
                  <FormField
                    key={slider.name}
                    control={form.control}
                    name={slider.name as any}
                    render={({ field }) => (
                      <FormItem className="space-y-5">
                        <div className="flex justify-between items-end">
                          <FormLabel className="font-black uppercase tracking-widest text-[10px] text-slate-500 flex items-center gap-2">
                            {slider.icon}
                            {slider.label}
                          </FormLabel>
                          <span className="text-2xl font-black text-white leading-none">
                            {field.value}{slider.isHours ? 'h' : ''}
                          </span>
                        </div>
                        <FormControl>
                          <Slider
                            min={slider.name === 'sleepHours' ? 0 : 1}
                            max={slider.name === 'sleepHours' ? 12 : 10}
                            step={slider.name === 'sleepHours' ? 0.5 : 1}
                            value={[field.value]}
                            onValueChange={vals => field.onChange(vals[0])}
                            className="[&_[role=slider]]:h-6 [&_[role=slider]]:w-6 [&_[role=slider]]:border-4 [&_[role=slider]]:border-blue-600 [&_[role=slider]]:bg-white"
                          />
                        </FormControl>
                        {!slider.isHours && (
                          <div className="flex justify-between text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
                            <span>{slider.low}</span>
                            <span>{slider.high}</span>
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </GlassCardContent>
            </GlassCard>

            {/* Conditional Injury Selector */}
            {form.watch('injuryPain') >= 3 && (
              <InjurySelector
                sport={sport}
                painLevel={form.watch('injuryPain')}
                value={injurySelection}
                onChange={setInjurySelection}
                disabled={isSubmitting}
                variant={isGlass ? "glass" : "default"}
              />
            )}

            {/* Notes Section */}
            <GlassCard>
              <GlassCardHeader>
                <GlassCardTitle className="text-xl font-black tracking-tight">Noteringar</GlassCardTitle>
                <GlassCardDescription className="text-slate-400">
                  Övriga observationer som kan vara relevanta för din coach.
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="t.ex. Kände mig pigg efter en sen kväll, lite känning i knät..."
                          className="bg-white/5 border-white/10 min-h-[120px] rounded-2xl p-4 text-white"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </GlassCardContent>
            </GlassCard>

            {/* Rehab Compliance Section - Only shown if athlete has active rehab program */}
            {hasActiveRehabProgram && (
              <GlassCard className="border-teal-500/20">
                <GlassCardHeader>
                  <GlassCardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-teal-500" />
                    Rehabilitering
                  </GlassCardTitle>
                  <GlassCardDescription className="text-slate-400">
                    Logga dina rehabövningar och eventuell smärta.
                  </GlassCardDescription>
                </GlassCardHeader>
                <GlassCardContent className="space-y-6">
                  {/* Active rehab exercises list */}
                  {activeRehabExercises.length > 0 && (
                    <div className="p-4 rounded-2xl bg-teal-500/5 border border-teal-500/10">
                      <p className="text-[10px] font-black uppercase tracking-widest text-teal-500 mb-3">Dagens övningar</p>
                      <div className="flex flex-wrap gap-2">
                        {activeRehabExercises.map((ex, idx) => (
                          <Badge key={idx} variant="outline" className="border-teal-500/30 text-teal-400 bg-teal-500/10">
                            {ex.nameSv}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Did exercises checkbox */}
                  <FormField
                    control={form.control}
                    name="rehabExercisesDone"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="h-6 w-6 border-2 border-teal-500/50 data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500"
                          />
                        </FormControl>
                        <div className="flex-1">
                          <FormLabel className="text-white font-bold cursor-pointer">
                            Jag har gjort mina rehabövningar idag
                          </FormLabel>
                          <FormDescription className="text-slate-500 text-xs">
                            Markera om du har genomfört dina tilldelade övningar.
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  {/* Pain during/after sliders - only show if exercises were done */}
                  {form.watch('rehabExercisesDone') && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                      <FormField
                        control={form.control}
                        name="rehabPainDuring"
                        render={({ field }) => (
                          <FormItem className="space-y-4">
                            <div className="flex justify-between items-end">
                              <FormLabel className="font-black uppercase tracking-widest text-[10px] text-slate-500">
                                Smärta under övningarna
                              </FormLabel>
                              <span className="text-2xl font-black text-white leading-none">
                                {field.value ?? 0}
                              </span>
                            </div>
                            <FormControl>
                              <Slider
                                min={0}
                                max={10}
                                step={1}
                                value={[field.value ?? 0]}
                                onValueChange={vals => field.onChange(vals[0])}
                                className="[&_[role=slider]]:h-6 [&_[role=slider]]:w-6 [&_[role=slider]]:border-4 [&_[role=slider]]:border-teal-600 [&_[role=slider]]:bg-white"
                              />
                            </FormControl>
                            <div className="flex justify-between text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
                              <span>Ingen smärta</span>
                              <span>Extrem smärta</span>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="rehabPainAfter"
                        render={({ field }) => (
                          <FormItem className="space-y-4">
                            <div className="flex justify-between items-end">
                              <FormLabel className="font-black uppercase tracking-widest text-[10px] text-slate-500">
                                Smärta efter övningarna
                              </FormLabel>
                              <span className="text-2xl font-black text-white leading-none">
                                {field.value ?? 0}
                              </span>
                            </div>
                            <FormControl>
                              <Slider
                                min={0}
                                max={10}
                                step={1}
                                value={[field.value ?? 0]}
                                onValueChange={vals => field.onChange(vals[0])}
                                className="[&_[role=slider]]:h-6 [&_[role=slider]]:w-6 [&_[role=slider]]:border-4 [&_[role=slider]]:border-teal-600 [&_[role=slider]]:bg-white"
                              />
                            </FormControl>
                            <div className="flex justify-between text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
                              <span>Ingen smärta</span>
                              <span>Extrem smärta</span>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Rehab notes */}
                  <FormField
                    control={form.control}
                    name="rehabNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                          Rehabanteckningar
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="t.ex. Övningarna kändes bra, lättare att utföra än förra veckan..."
                            className="bg-white/5 border-white/10 min-h-[80px] rounded-2xl p-4 text-white"
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Request physio contact */}
                  <div className="pt-4 border-t border-white/5">
                    <FormField
                      control={form.control}
                      name="requestPhysioContact"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="h-6 w-6 border-2 border-blue-500/50 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                            />
                          </FormControl>
                          <div className="flex-1">
                            <FormLabel className="text-white font-bold cursor-pointer flex items-center gap-2">
                              <MessageCircle className="h-4 w-4 text-blue-500" />
                              Jag vill kontakta min fysioterapeut
                            </FormLabel>
                            <FormDescription className="text-slate-500 text-xs">
                              Din fysio får en notifikation och kan kontakta dig.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    {/* Reason for contact - only show if checkbox is checked */}
                    {form.watch('requestPhysioContact') && (
                      <FormField
                        control={form.control}
                        name="physioContactReason"
                        render={({ field }) => (
                          <FormItem className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <FormLabel className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                              Anledning till kontakt
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="t.ex. Ökad smärta, frågor om progression, behöver justering av övningar..."
                                className="bg-white/5 border-white/10 min-h-[80px] rounded-2xl p-4 text-white"
                                {...field}
                                value={field.value ?? ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </GlassCardContent>
              </GlassCard>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-16 rounded-[2rem] bg-white text-black hover:bg-slate-100 font-black uppercase tracking-widest text-sm shadow-[0_4px_30px_rgba(255,255,255,0.1)] transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Skickar...
                </>
              ) : (
                'Skicka in incheckning'
              )}
            </Button>
          </form>
        </Form>
      )}

      {/* Readiness & Injury Results */}
      {(readinessResult || injuryResponse?.triggered) && (
        <GlassCard className={cn(
          "transition-all duration-700 animate-in zoom-in-95",
          injuryResponse?.triggered ? "border-red-500/30 bg-red-500/5 shadow-[0_0_30px_rgba(239,68,68,0.1)]" : "border-emerald-500/20 bg-emerald-500/5 shadow-[0_0_30px_rgba(16,185,129,0.1)]"
        )}>
          <GlassCardContent className="pt-6">
            {injuryResponse?.triggered ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-red-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                    <AlertCircle className="h-8 w-8 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-white uppercase">Skaderespons aktiverad</h3>
                    <p className="text-slate-400 font-medium text-sm">Dina pass har justerats automatiskt.</p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                  <div>
                    <p className="font-black text-white text-sm uppercase mb-1 tracking-wider">{injuryResponse.summary?.title}</p>
                    <p className="text-sm text-slate-400 leading-relaxed font-medium">{injuryResponse.summary?.message}</p>
                  </div>

                  {injuryResponse.summary?.programAdjustment && (
                    <div className="pt-4 border-t border-white/5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Programjustering:</p>
                      <p className="text-white font-bold bg-white/5 p-3 rounded-xl border border-white/5">
                        {injuryResponse.summary.programAdjustment}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">Coach har notifierats</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      {injuryResponse.injuryResponse?.workoutsModified || 0} pass modifierade
                    </span>
                  </div>
                </div>
              </div>
            ) : readinessResult ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg",
                      readinessResult.score >= 7 ? "bg-emerald-500/20 text-emerald-400 shadow-emerald-500/20" :
                        readinessResult.score >= 5 ? "bg-yellow-500/20 text-yellow-400 shadow-yellow-500/20" :
                          "bg-red-500/20 text-red-400 shadow-red-500/20"
                    )}>
                      <Activity className="h-8 w-8" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Readiness Score</p>
                      <h3 className="text-3xl font-black text-white tracking-tighter tabular-nums">
                        {readinessResult.score.toFixed(1)}<span className="text-lg text-slate-600">/10</span>
                      </h3>
                    </div>
                  </div>
                  <div className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border",
                    readinessResult.score >= 7 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                      readinessResult.score >= 5 ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                        "bg-red-500/10 text-red-400 border-red-500/20"
                  )}>
                    {readinessResult.status}
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Rekommendation</p>
                  <p className="text-white font-bold leading-relaxed">{readinessResult.recommendation}</p>
                </div>
              </div>
            ) : null}
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Nutrition Tip */}
      {(isLoadingTip || nutritionTip) && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
          {isLoadingTip ? (
            <NutritionTipCardSkeleton variant="glass" />
          ) : (
            nutritionTip && (
              <NutritionTipCard
                tip={nutritionTip}
                variant="glass"
                className="shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
              />
            )
          )}
        </div>
      )}
    </div>
  )
}
