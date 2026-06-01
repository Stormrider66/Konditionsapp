'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, CheckCircle2, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useLocale, useTranslations } from '@/i18n/client'
import { getExerciseDisplayName } from '@/lib/exercises/display-name'
import { MultiExercisePicker, type PickedExercise } from './MultiExercisePicker'

type AthleteOption = {
  id: string
  name: string
  currentInjury: { id: string; injuryType: string | null; bodyPart: string | null } | null
}

type RestrictionPayload = {
  clientId: string
  injuryId?: string
  type: string
  severity: string
  bodyParts: string[]
  affectedWorkoutTypes: string[]
  affectedExerciseIds: string[]
  endDate?: string
  volumeReductionPercent?: number
  maxIntensityZone?: number
  reason?: string
  description?: string
  notes?: string
}

const restrictionTypes = [
  'NO_RUNNING',
  'NO_JUMPING',
  'NO_IMPACT',
  'NO_UPPER_BODY',
  'NO_LOWER_BODY',
  'REDUCED_VOLUME',
  'REDUCED_INTENSITY',
  'MODIFIED_ONLY',
  'SPECIFIC_EXERCISES',
  'CUSTOM',
] as const

const workoutTypes = ['STRENGTH', 'CARDIO', 'HYBRID', 'AGILITY', 'ICE', 'MATCH']

function splitList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function dateToInput(value: string | null | undefined) {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 10)
}

function dateInputToIso(value: string) {
  if (!value) return undefined
  return new Date(`${value}T23:59:59`).toISOString()
}

export function RestrictionForm({
  basePath,
  initialClientId,
  initialInjuryId,
  restrictionId,
}: {
  basePath: string
  initialClientId?: string
  initialInjuryId?: string
  restrictionId?: string
}) {
  const router = useRouter()
  const { toast } = useToast()
  const t = useTranslations('components.restrictionForm')
  const locale = useLocale()
  const [loading, setLoading] = useState(Boolean(restrictionId))
  const [saving, setSaving] = useState(false)
  const [athletes, setAthletes] = useState<AthleteOption[]>([])
  const [clientId, setClientId] = useState(initialClientId ?? '')
  const [injuryId, setInjuryId] = useState(initialInjuryId ?? '')
  const [type, setType] = useState('MODIFIED_ONLY')
  const [severity, setSeverity] = useState('MODERATE')
  const [bodyParts, setBodyParts] = useState('')
  const [affectedTypes, setAffectedTypes] = useState<string[]>([])
  const [selectedExercises, setSelectedExercises] = useState<PickedExercise[]>([])
  const [endDate, setEndDate] = useState('')
  const [volumeReductionPercent, setVolumeReductionPercent] = useState('')
  const [maxIntensityZone, setMaxIntensityZone] = useState('')
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    let cancelled = false
    async function loadAthletes() {
      const res = await fetch('/api/physio/athletes?limit=200')
      if (!res.ok) return
      const data = await res.json()
      if (!cancelled) setAthletes(data.athletes ?? [])
    }
    void loadAthletes()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!restrictionId) return
    let cancelled = false
    async function loadRestriction() {
      setLoading(true)
      try {
        const res = await fetch(`/api/physio/restrictions/${restrictionId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || t('errors.loadRestriction'))
        if (cancelled) return
        setClientId(data.clientId)
        setInjuryId(data.injuryId || '')
        setType(data.type)
        setSeverity(data.severity)
        setBodyParts((data.bodyParts || []).join(', '))
        setAffectedTypes(data.affectedWorkoutTypes || [])
        const exerciseIds: string[] = data.affectedExerciseIds || []
        if (exerciseIds.length > 0) {
          try {
            const exRes = await fetch(`/api/exercises?ids=${exerciseIds.join(',')}&limit=${exerciseIds.length}`)
            if (exRes.ok) {
              const exData = await exRes.json()
              const byId = new Map<string, { id: string; name: string; nameSv?: string | null; nameEn?: string | null }>(
                (exData.exercises ?? []).map((e: { id: string; name: string; nameSv?: string | null; nameEn?: string | null }) => [e.id, e])
              )
              if (!cancelled) {
                setSelectedExercises(
                  exerciseIds.map((id) => {
                    const e = byId.get(id)
                    return { id, name: e ? getExerciseDisplayName(e, locale) : id }
                  })
                )
              }
            }
          } catch {
            // names are cosmetic — fall back to ids if the lookup fails
            if (!cancelled) setSelectedExercises(exerciseIds.map((id) => ({ id, name: id })))
          }
        }
        setEndDate(dateToInput(data.endDate))
        setVolumeReductionPercent(data.volumeReductionPercent?.toString() || '')
        setMaxIntensityZone(data.maxIntensityZone?.toString() || '')
        setReason(data.reason || '')
        setDescription(data.description || '')
        setNotes(data.notes || '')
      } catch (error) {
        toast({
          title: t('errors.genericTitle'),
          description: error instanceof Error ? error.message : t('errors.unknown'),
          variant: 'destructive',
        })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadRestriction()
    return () => {
      cancelled = true
    }
  }, [locale, restrictionId, t, toast])

  const selectedAthlete = useMemo(
    () => athletes.find((athlete) => athlete.id === clientId),
    [athletes, clientId]
  )

  const submit = async () => {
    if (!clientId) {
      toast({ title: t('errors.selectAthlete'), variant: 'destructive' })
      return
    }

    const payload: RestrictionPayload = {
      clientId,
      injuryId: injuryId || undefined,
      type,
      severity,
      bodyParts: splitList(bodyParts),
      affectedWorkoutTypes: affectedTypes,
      affectedExerciseIds: selectedExercises.map((e) => e.id),
      endDate: dateInputToIso(endDate),
      volumeReductionPercent: volumeReductionPercent ? Number(volumeReductionPercent) : undefined,
      maxIntensityZone: maxIntensityZone ? Number(maxIntensityZone) : undefined,
      reason,
      description,
      notes,
    }

    setSaving(true)
    try {
      const res = await fetch(
        restrictionId ? `/api/physio/restrictions/${restrictionId}` : '/api/physio/restrictions',
        {
          method: restrictionId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || t('errors.saveRestriction'))
      toast({ title: restrictionId ? t('toasts.updated') : t('toasts.created') })
      router.push(`${basePath}/athletes/${clientId}`)
      router.refresh()
    } catch (error) {
      toast({
        title: t('errors.genericTitle'),
        description: error instanceof Error ? error.message : t('errors.unknown'),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const clearRestriction = async () => {
    if (!restrictionId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/physio/restrictions/${restrictionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || t('errors.clearRestriction'))
      toast({ title: t('toasts.cleared') })
      router.push(`${basePath}/athletes/${clientId}`)
      router.refresh()
    } catch (error) {
      toast({
        title: t('errors.genericTitle'),
        description: error instanceof Error ? error.message : t('errors.unknown'),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="border-white/10 bg-slate-900/50">
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-white/10 bg-slate-900/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Ban className="h-5 w-5 text-orange-400" />
          {restrictionId ? t('title.edit') : t('title.create')}
        </CardTitle>
        <CardDescription className="text-slate-400">
          {t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-slate-200">{t('fields.athlete')}</Label>
            <Select value={clientId} onValueChange={setClientId} disabled={Boolean(restrictionId)}>
              <SelectTrigger className="bg-slate-950/50 text-white">
                <SelectValue placeholder={t('placeholders.selectAthlete')} />
              </SelectTrigger>
              <SelectContent>
                {athletes.map((athlete) => (
                  <SelectItem key={athlete.id} value={athlete.id}>
                    {athlete.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-200">{t('fields.linkedInjury')}</Label>
            <Select value={injuryId || 'none'} onValueChange={(value) => setInjuryId(value === 'none' ? '' : value)}>
              <SelectTrigger className="bg-slate-950/50 text-white">
                <SelectValue placeholder={t('placeholders.optional')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('injuries.none')}</SelectItem>
                {injuryId && selectedAthlete?.currentInjury?.id !== injuryId && (
                  <SelectItem value={injuryId}>{t('injuries.selected')}</SelectItem>
                )}
                {selectedAthlete?.currentInjury && (
                  <SelectItem value={selectedAthlete.currentInjury.id}>
                    {selectedAthlete.currentInjury.injuryType || selectedAthlete.currentInjury.bodyPart || t('injuries.active')}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-slate-200">{t('fields.type')}</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="bg-slate-950/50 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {restrictionTypes.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`restrictionTypes.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-200">{t('fields.severity')}</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="bg-slate-950/50 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MILD">{t('severities.MILD')}</SelectItem>
                <SelectItem value="MODERATE">{t('severities.MODERATE')}</SelectItem>
                <SelectItem value="SEVERE">{t('severities.SEVERE')}</SelectItem>
                <SelectItem value="COMPLETE">{t('severities.COMPLETE')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-200">{t('fields.endDate')}</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="bg-slate-950/50 text-white"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-slate-200">{t('fields.bodyParts')}</Label>
          <Input
            value={bodyParts}
            onChange={(event) => setBodyParts(event.target.value)}
            placeholder={t('placeholders.bodyParts')}
            className="bg-slate-950/50 text-white"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-slate-200">{t('fields.affectedWorkoutTypes')}</Label>
          <div className="flex flex-wrap gap-2">
            {workoutTypes.map((workoutType) => {
              const selected = affectedTypes.includes(workoutType)
              return (
                <Button
                  key={workoutType}
                  type="button"
                  variant={selected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() =>
                    setAffectedTypes((current) =>
                      selected
                        ? current.filter((item) => item !== workoutType)
                        : [...current, workoutType]
                    )
                  }
                >
                  {workoutType}
                </Button>
              )
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-slate-200">{t('fields.blockedExercises')}</Label>
          <p className="text-xs text-slate-400">{t('hints.blockedExercises')}</p>
          <MultiExercisePicker
            value={selectedExercises}
            onChange={setSelectedExercises}
            searchPlaceholder={t('placeholders.searchExercises')}
            emptyText={t('hints.noExerciseMatches')}
            noneSelectedText={t('hints.noExercisesBlocked')}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-slate-200">{t('fields.volumeReduction')}</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={volumeReductionPercent}
              onChange={(event) => setVolumeReductionPercent(event.target.value)}
              className="bg-slate-950/50 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-200">{t('fields.maxIntensityZone')}</Label>
            <Input
              type="number"
              min="1"
              max="5"
              value={maxIntensityZone}
              onChange={(event) => setMaxIntensityZone(event.target.value)}
              className="bg-slate-950/50 text-white"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-slate-200">{t('fields.reason')}</Label>
          <Input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t('placeholders.reason')}
            className="bg-slate-950/50 text-white"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-slate-200">{t('fields.coachInstruction')}</Label>
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t('placeholders.coachInstruction')}
            className="min-h-24 bg-slate-950/50 text-white"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-slate-200">{t('fields.internalNote')}</Label>
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-20 bg-slate-950/50 text-white"
          />
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-between">
          {restrictionId ? (
            <Button
              type="button"
              variant="outline"
              onClick={clearRestriction}
              disabled={saving}
              className="border-emerald-500/30 text-emerald-300"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {t('actions.clear')}
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {t('actions.save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
