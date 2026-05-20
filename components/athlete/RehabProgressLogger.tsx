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
import { useLocale } from '@/i18n/client'

interface RehabProgressLoggerProps {
  programId: string
  programName: string
  exerciseCount: number
  acceptablePainDuring?: number
  acceptablePainAfter?: number
  onSuccess?: () => void
  variant?: 'default' | 'glass'
}

type AppLocale = 'en' | 'sv'

function getAppLocale(locale: string): AppLocale {
  return locale.startsWith('sv') ? 'sv' : 'en'
}

function text(locale: AppLocale, svText: string, enText: string): string {
  return locale === 'sv' ? svText : enText
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
  const locale = getAppLocale(useLocale())
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
        title: text(locale, 'Välj känsla', 'Choose feeling'),
        description: text(locale, 'Ange hur du kände dig efter passet.', 'Enter how you felt after the session.'),
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
        title: text(locale, 'Progress loggad', 'Progress logged'),
        description: text(locale, 'Dina framsteg har sparats.', 'Your progress has been saved.'),
      })

      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error('Error logging progress:', error)
      toast({
        title: text(locale, 'Fel', 'Error'),
        description: text(locale, 'Kunde inte spara progress. Försök igen.', 'Could not save progress. Try again.'),
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
          <h3 className="text-xl font-black text-white mb-2">{text(locale, 'Bra jobbat!', 'Good work!')}</h3>
          <p className="text-slate-400">{text(locale, 'Dina framsteg har sparats.', 'Your progress has been saved.')}</p>
        </GlassCardContent>
      </GlassCard>
    )
  }

  return (
    <GlassCard className={cn(!isGlass && 'bg-card', 'border-teal-500/20')}>
      <GlassCardHeader>
        <GlassCardTitle className="text-xl font-black tracking-tight">
          {text(locale, 'Logga träningspass', 'Log training session')}
        </GlassCardTitle>
        <GlassCardDescription className="text-slate-400">
          {programName} - {exerciseCount} {text(locale, 'övningar', 'exercises')}
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
              <p className="font-bold text-white">{text(locale, 'Jag slutförde alla övningar', 'I completed all exercises')}</p>
              <p className="text-sm text-slate-500">{text(locale, 'Alla', 'All')} {exerciseCount} {text(locale, 'övningar genomfördes', 'exercises were completed')}</p>
            </div>
          </div>

          {!allExercisesCompleted && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                {text(locale, 'Antal överhoppade övningar', 'Number of skipped exercises')}
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
              {text(locale, 'Smärta under övningarna', 'Pain during exercises')}
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
            <span>{text(locale, 'Ingen smärta', 'No pain')}</span>
            <span>{text(locale, 'Extrem smärta', 'Extreme pain')}</span>
          </div>
          {painDuring > acceptablePainDuring && (
            <div className="flex items-center gap-2 text-xs text-yellow-400 p-2 rounded-lg bg-yellow-500/10">
              <AlertCircle className="h-4 w-4" />
              <span>{text(locale, 'Smärtan översteg acceptabel nivå', 'Pain exceeded the acceptable level')} ({acceptablePainDuring}/10).</span>
            </div>
          )}
        </div>

        {/* Pain after */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
              {text(locale, 'Smärta efter övningarna', 'Pain after exercises')}
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
            <span>{text(locale, 'Ingen smärta', 'No pain')}</span>
            <span>{text(locale, 'Extrem smärta', 'Extreme pain')}</span>
          </div>
        </div>

        {/* Overall feeling */}
        <div className="space-y-3">
          <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
            {text(locale, 'Hur kändes passet överlag?', 'How did the session feel overall?')}
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
              <span className="text-xs font-bold">{text(locale, 'Bra', 'Good')}</span>
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
              <span className="text-xs font-bold">{text(locale, 'Okej', 'Okay')}</span>
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
              <span className="text-xs font-bold">{text(locale, 'Dåligt', 'Bad')}</span>
            </Button>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
            {text(locale, 'Anteckningar (valfritt)', 'Notes (optional)')}
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={text(locale, 'Hur gick passet? Några problem eller framsteg att notera...', 'How did the session go? Any problems or progress to note...')}
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
            <p className="font-bold text-white">{text(locale, 'Jag vill kontakta min fysioterapeut', 'I want to contact my physiotherapist')}</p>
            <p className="text-sm text-slate-500">{text(locale, 'Din fysio får en notifikation', 'Your physio will receive a notification')}</p>
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
              {text(locale, 'Sparar...', 'Saving...')}
            </>
          ) : (
            <>
              <Send className="h-5 w-5 mr-2" />
              {text(locale, 'Spara progress', 'Save progress')}
            </>
          )}
        </Button>
      </GlassCardContent>
    </GlassCard>
  )
}
