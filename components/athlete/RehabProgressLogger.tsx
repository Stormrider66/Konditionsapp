'use client'

/**
 * Rehab Progress Logger Component
 *
 * Allows athletes to log their progress for a rehab program session.
 * Records completion status, pain levels, and notes.
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
  GlassCardDescription,
} from '@/components/ui/GlassCard'
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  ThumbsUp,
  ThumbsDown,
  Meh,
} from 'lucide-react'

interface RehabProgressLoggerProps {
  programId: string
  programName: string
  exerciseCount: number
  acceptablePainDuring?: number
  acceptablePainAfter?: number
  onSuccess?: () => void
  variant?: 'default' | 'glass'
}

export function RehabProgressLogger({
  programId,
  programName,
  exerciseCount,
  acceptablePainDuring = 3,
  acceptablePainAfter = 5,
  onSuccess,
  variant = 'glass',
}: RehabProgressLoggerProps) {
  const isGlass = variant === 'glass'
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  // Form state
  const [allExercisesCompleted, setAllExercisesCompleted] = useState(true)
  const [exercisesSkipped, setExercisesSkipped] = useState(0)
  const [painDuring, setPainDuring] = useState(0)
  const [painAfter, setPainAfter] = useState(0)
  const [overallFeeling, setOverallFeeling] = useState<'GOOD' | 'NEUTRAL' | 'BAD' | null>(null)
  const [notes, setNotes] = useState('')
  const [wantsPhysioContact, setWantsPhysioContact] = useState(false)

  const getPainColor = (value: number, acceptable: number) => {
    if (value <= acceptable) return 'text-green-400'
    if (value <= acceptable + 2) return 'text-yellow-400'
    return 'text-red-400'
  }

  const handleSubmit = async () => {
    if (overallFeeling === null) {
      toast({
        title: 'Välj känsla',
        description: 'Ange hur du kände dig efter passet.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/physio/rehab-programs/${programId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date().toISOString(),
          exercisesCompleted: allExercisesCompleted ? exerciseCount : exerciseCount - exercisesSkipped,
          exercisesSkipped: allExercisesCompleted ? 0 : exercisesSkipped,
          painDuring,
          painAfter,
          overallFeeling,
          notes: notes || undefined,
          wantsPhysioContact,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to log progress')
      }

      setIsSubmitted(true)
      toast({
        title: 'Progress loggad',
        description: 'Din framsteg har sparats.',
      })

      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error('Error logging progress:', error)
      toast({
        title: 'Fel',
        description: 'Kunde inte spara progress. Försök igen.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <GlassCard className={cn(!isGlass && 'bg-card', 'border-teal-500/20')}>
        <GlassCardContent className="py-12 text-center">
          <CheckCircle2 className="h-16 w-16 text-teal-500 mx-auto mb-4" />
          <h3 className="text-xl font-black text-white mb-2">Bra jobbat!</h3>
          <p className="text-slate-400">Din progress har sparats.</p>
        </GlassCardContent>
      </GlassCard>
    )
  }

  return (
    <GlassCard className={cn(!isGlass && 'bg-card', 'border-teal-500/20')}>
      <GlassCardHeader>
        <GlassCardTitle className="text-xl font-black tracking-tight">
          Logga träningspass
        </GlassCardTitle>
        <GlassCardDescription className="text-slate-400">
          {programName} - {exerciseCount} övningar
        </GlassCardDescription>
      </GlassCardHeader>

      <GlassCardContent className="space-y-6">
        {/* Completion status */}
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
            <Checkbox
              checked={allExercisesCompleted}
              onCheckedChange={(checked) => {
                setAllExercisesCompleted(checked as boolean)
                if (checked) setExercisesSkipped(0)
              }}
              className="h-6 w-6 border-2 border-teal-500/50 data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500"
            />
            <div>
              <p className="font-bold text-white">Jag slutförde alla övningar</p>
              <p className="text-sm text-slate-500">Alla {exerciseCount} övningar genomfördes</p>
            </div>
          </div>

          {!allExercisesCompleted && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                Antal överhoppade övningar
              </label>
              <div className="flex items-center gap-4">
                <Slider
                  min={1}
                  max={exerciseCount}
                  step={1}
                  value={[exercisesSkipped || 1]}
                  onValueChange={([val]) => setExercisesSkipped(val)}
                  className="flex-1"
                />
                <span className="text-2xl font-black text-white tabular-nums w-12 text-right">
                  {exercisesSkipped || 1}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Pain during */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
              Smärta under övningarna
            </span>
            <span className={cn('text-2xl font-black tabular-nums', getPainColor(painDuring, acceptablePainDuring))}>
              {painDuring}
            </span>
          </div>
          <Slider
            min={0}
            max={10}
            step={1}
            value={[painDuring]}
            onValueChange={([val]) => setPainDuring(val)}
            className="[&_[role=slider]]:h-6 [&_[role=slider]]:w-6 [&_[role=slider]]:border-4 [&_[role=slider]]:border-teal-600 [&_[role=slider]]:bg-white"
          />
          <div className="flex justify-between text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
            <span>Ingen smärta</span>
            <span>Extrem smärta</span>
          </div>
          {painDuring > acceptablePainDuring && (
            <div className="flex items-center gap-2 text-xs text-yellow-400 p-2 rounded-lg bg-yellow-500/10">
              <AlertCircle className="h-4 w-4" />
              <span>Smärtan översteg acceptabel nivå ({acceptablePainDuring}/10).</span>
            </div>
          )}
        </div>

        {/* Pain after */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
              Smärta efter övningarna
            </span>
            <span className={cn('text-2xl font-black tabular-nums', getPainColor(painAfter, acceptablePainAfter))}>
              {painAfter}
            </span>
          </div>
          <Slider
            min={0}
            max={10}
            step={1}
            value={[painAfter]}
            onValueChange={([val]) => setPainAfter(val)}
            className="[&_[role=slider]]:h-6 [&_[role=slider]]:w-6 [&_[role=slider]]:border-4 [&_[role=slider]]:border-teal-600 [&_[role=slider]]:bg-white"
          />
          <div className="flex justify-between text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
            <span>Ingen smärta</span>
            <span>Extrem smärta</span>
          </div>
        </div>

        {/* Overall feeling */}
        <div className="space-y-3">
          <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
            Hur kändes passet överlag?
          </label>
          <div className="grid grid-cols-3 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOverallFeeling('GOOD')}
              className={cn(
                'h-20 flex-col gap-2 rounded-2xl border-2 transition-all',
                overallFeeling === 'GOOD'
                  ? 'border-green-500 bg-green-500/10 text-green-400'
                  : 'border-white/10 text-slate-400 hover:border-white/20'
              )}
            >
              <ThumbsUp className="h-6 w-6" />
              <span className="text-xs font-bold">Bra</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOverallFeeling('NEUTRAL')}
              className={cn(
                'h-20 flex-col gap-2 rounded-2xl border-2 transition-all',
                overallFeeling === 'NEUTRAL'
                  ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400'
                  : 'border-white/10 text-slate-400 hover:border-white/20'
              )}
            >
              <Meh className="h-6 w-6" />
              <span className="text-xs font-bold">Okej</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOverallFeeling('BAD')}
              className={cn(
                'h-20 flex-col gap-2 rounded-2xl border-2 transition-all',
                overallFeeling === 'BAD'
                  ? 'border-red-500 bg-red-500/10 text-red-400'
                  : 'border-white/10 text-slate-400 hover:border-white/20'
              )}
            >
              <ThumbsDown className="h-6 w-6" />
              <span className="text-xs font-bold">Dåligt</span>
            </Button>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
            Anteckningar (valfritt)
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Hur gick passet? Några problem eller framsteg att notera..."
            className="bg-white/5 border-white/10 min-h-[100px] rounded-xl text-white"
          />
        </div>

        {/* Physio contact request */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
          <Checkbox
            checked={wantsPhysioContact}
            onCheckedChange={(checked) => setWantsPhysioContact(checked as boolean)}
            className="h-6 w-6 border-2 border-blue-500/50 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
          />
          <div>
            <p className="font-bold text-white">Jag vill kontakta min fysioterapeut</p>
            <p className="text-sm text-slate-500">Din fysio får en notifikation</p>
          </div>
        </div>

        {/* Submit button */}
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || overallFeeling === null}
          className="w-full h-14 rounded-2xl bg-teal-500 hover:bg-teal-600 text-white font-black uppercase tracking-widest text-sm disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Sparar...
            </>
          ) : (
            <>
              <Send className="h-5 w-5 mr-2" />
              Spara progress
            </>
          )}
        </Button>
      </GlassCardContent>
    </GlassCard>
  )
}
