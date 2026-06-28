'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, CheckCircle2, Loader2, PauseCircle, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { useLocale, useTranslations } from '@/i18n/client'
import { getExerciseDisplayName } from '@/lib/exercises/display-name'
import { RolePanel, roleMutedBlockClass } from '@/components/layouts/role-shell/RolePage'

type AthleteOption = {
  id: string
  name: string
  currentInjury: { id: string; injuryType: string | null; bodyPart: string | null } | null
}

type ProgramExercise = {
  id: string
  exercise?: { name: string; nameSv?: string | null; nameEn?: string | null }
  sets?: number | null
  reps?: string | null
  frequency?: string | null
}

function splitLines(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function joinLines(value: string[] | null | undefined) {
  return (value || []).join('\n')
}

function dateToInput(value: string | null | undefined) {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 10)
}

function dateInputToIso(value: string) {
  if (!value) return undefined
  return new Date(`${value}T12:00:00`).toISOString()
}

const labelClass = 'text-zinc-700 dark:text-zinc-200'
const inputClass = 'bg-white text-zinc-950 dark:bg-zinc-950/60 dark:text-zinc-100'

export function RehabProgramForm({
  basePath,
  initialClientId,
  initialInjuryId,
  programId,
}: {
  basePath: string
  initialClientId?: string
  initialInjuryId?: string
  programId?: string
}) {
  const router = useRouter()
  const { toast } = useToast()
  const t = useTranslations('components.rehabProgramForm')
  const locale = useLocale()
  const [loading, setLoading] = useState(Boolean(programId))
  const [saving, setSaving] = useState(false)
  const [athletes, setAthletes] = useState<AthleteOption[]>([])
  const [clientId, setClientId] = useState(initialClientId ?? '')
  const [injuryId, setInjuryId] = useState(initialInjuryId ?? '')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [currentPhase, setCurrentPhase] = useState('ACUTE')
  const [status, setStatus] = useState('ACTIVE')
  const [estimatedEndDate, setEstimatedEndDate] = useState('')
  const [shortTermGoals, setShortTermGoals] = useState('')
  const [longTermGoals, setLongTermGoals] = useState('')
  const [contraindications, setContraindications] = useState('')
  const [precautions, setPrecautions] = useState('')
  const [acceptablePainDuring, setAcceptablePainDuring] = useState('3')
  const [acceptablePainAfter, setAcceptablePainAfter] = useState('5')
  const [notes, setNotes] = useState('')
  const [exercises, setExercises] = useState<ProgramExercise[]>([])

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
    if (!programId) return
    let cancelled = false
    async function loadProgram() {
      setLoading(true)
      try {
        const res = await fetch(`/api/physio/rehab-programs/${programId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || t('errors.loadProgram'))
        if (cancelled) return
        setClientId(data.clientId)
        setInjuryId(data.injuryId || '')
        setName(data.name || '')
        setDescription(data.description || '')
        setCurrentPhase(data.currentPhase || 'ACUTE')
        setStatus(data.status || 'ACTIVE')
        setEstimatedEndDate(dateToInput(data.estimatedEndDate))
        setShortTermGoals(joinLines(data.shortTermGoals))
        setLongTermGoals(joinLines(data.longTermGoals))
        setContraindications(joinLines(data.contraindications))
        setPrecautions(joinLines(data.precautions))
        setAcceptablePainDuring(String(data.acceptablePainDuring ?? 3))
        setAcceptablePainAfter(String(data.acceptablePainAfter ?? 5))
        setNotes(data.notes || '')
        setExercises(data.exercises || [])
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
    void loadProgram()
    return () => {
      cancelled = true
    }
  }, [programId, t, toast])

  const selectedAthlete = useMemo(
    () => athletes.find((athlete) => athlete.id === clientId),
    [athletes, clientId]
  )

  const submit = async (nextStatus?: string) => {
    if (!clientId || !name.trim()) {
      toast({ title: t('errors.missingRequired'), variant: 'destructive' })
      return
    }

    const payload = {
      clientId,
      injuryId: injuryId || undefined,
      name,
      description,
      currentPhase,
      status: nextStatus || status,
      estimatedEndDate: dateInputToIso(estimatedEndDate),
      shortTermGoals: splitLines(shortTermGoals),
      longTermGoals: splitLines(longTermGoals),
      contraindications: splitLines(contraindications),
      precautions: splitLines(precautions),
      acceptablePainDuring: Number(acceptablePainDuring || 3),
      acceptablePainAfter: Number(acceptablePainAfter || 5),
      notes,
    }

    setSaving(true)
    try {
      const res = await fetch(
        programId ? `/api/physio/rehab-programs/${programId}` : '/api/physio/rehab-programs',
        {
          method: programId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || t('errors.saveProgram'))
      toast({ title: programId ? t('toasts.updated') : t('toasts.created') })
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
      <RolePanel className="p-12">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
        </div>
      </RolePanel>
    )
  }

  return (
    <RolePanel>
      <div className="border-b border-zinc-200 p-5 dark:border-white/10">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          <Activity className="h-5 w-5 text-blue-400" />
          {programId ? t('title.edit') : t('title.create')}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          {t('description')}
        </p>
      </div>
      <div className="space-y-5 p-5">
        <div className={roleMutedBlockClass('')}>
          <div className="space-y-2">
            <Label className={labelClass}>{t('fields.athlete')}</Label>
            <Select value={clientId} onValueChange={setClientId} disabled={Boolean(programId)}>
              <SelectTrigger className={inputClass}>
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
            <Label className={labelClass}>{t('fields.linkedInjury')}</Label>
            <Select value={injuryId || 'none'} onValueChange={(value) => setInjuryId(value === 'none' ? '' : value)}>
              <SelectTrigger className={inputClass}>
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

        <div className="space-y-2">
          <Label className={labelClass}>{t('fields.name')}</Label>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('placeholders.name')}
            className={inputClass}
          />
        </div>

        <div className={roleMutedBlockClass('')}>
          <div className="space-y-2">
            <Label className={labelClass}>{t('fields.phase')}</Label>
            <Select value={currentPhase} onValueChange={setCurrentPhase}>
              <SelectTrigger className={inputClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACUTE">{t('phases.ACUTE')}</SelectItem>
                <SelectItem value="SUBACUTE">{t('phases.SUBACUTE')}</SelectItem>
                <SelectItem value="REMODELING">{t('phases.REMODELING')}</SelectItem>
                <SelectItem value="FUNCTIONAL">{t('phases.FUNCTIONAL')}</SelectItem>
                <SelectItem value="RETURN_TO_SPORT">{t('phases.RETURN_TO_SPORT')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className={labelClass}>{t('fields.status')}</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className={inputClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">{t('statuses.ACTIVE')}</SelectItem>
                <SelectItem value="PAUSED">{t('statuses.PAUSED')}</SelectItem>
                <SelectItem value="COMPLETED">{t('statuses.COMPLETED')}</SelectItem>
                <SelectItem value="CANCELLED">{t('statuses.CANCELLED')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className={labelClass}>{t('fields.estimatedEndDate')}</Label>
            <Input
              type="date"
              value={estimatedEndDate}
              onChange={(event) => setEstimatedEndDate(event.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className={roleMutedBlockClass('')}>
          <div className="space-y-2">
            <Label className={labelClass}>{t('fields.shortTermGoals')}</Label>
            <Textarea
              value={shortTermGoals}
              onChange={(event) => setShortTermGoals(event.target.value)}
              placeholder={t('placeholders.oneGoalPerLine')}
              className={`min-h-28 ${inputClass}`}
            />
          </div>
          <div className="space-y-2">
            <Label className={labelClass}>{t('fields.longTermGoals')}</Label>
            <Textarea
              value={longTermGoals}
              onChange={(event) => setLongTermGoals(event.target.value)}
              placeholder={t('placeholders.oneGoalPerLine')}
              className={`min-h-28 ${inputClass}`}
            />
          </div>
        </div>

        <div className={roleMutedBlockClass('')}>
          <div className="space-y-2">
            <Label className={labelClass}>{t('fields.contraindications')}</Label>
            <Textarea
              value={contraindications}
              onChange={(event) => setContraindications(event.target.value)}
              placeholder={t('placeholders.contraindications')}
              className={`min-h-24 ${inputClass}`}
            />
          </div>
          <div className="space-y-2">
            <Label className={labelClass}>{t('fields.precautions')}</Label>
            <Textarea
              value={precautions}
              onChange={(event) => setPrecautions(event.target.value)}
              placeholder={t('placeholders.precautions')}
              className={`min-h-24 ${inputClass}`}
            />
          </div>
        </div>

        <div className={roleMutedBlockClass('')}>
          <div className="space-y-2">
            <Label className={labelClass}>{t('fields.acceptablePainDuring')}</Label>
            <Input
              type="number"
              min="0"
              max="10"
              value={acceptablePainDuring}
              onChange={(event) => setAcceptablePainDuring(event.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <Label className={labelClass}>{t('fields.acceptablePainAfter')}</Label>
            <Input
              type="number"
              min="0"
              max="10"
              value={acceptablePainAfter}
              onChange={(event) => setAcceptablePainAfter(event.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className={labelClass}>{t('fields.description')}</Label>
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className={`min-h-24 ${inputClass}`}
          />
        </div>

        <div className="space-y-2">
          <Label className={labelClass}>{t('fields.internalNote')}</Label>
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className={`min-h-20 ${inputClass}`}
          />
        </div>

        {programId && (
          <div className={roleMutedBlockClass()}>
            <p className="text-sm font-medium text-zinc-950 dark:text-zinc-100">{t('exercises.title')}</p>
            {exercises.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                {t('exercises.empty')}
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {exercises.map((exercise) => (
                  <Badge
                    key={exercise.id}
                    variant="outline"
                    className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/20 dark:text-blue-300"
                  >
                    {getExerciseDisplayName(exercise.exercise, locale, t('exercises.fallbackName'))}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-zinc-200 pt-5 dark:border-white/10 sm:flex-row sm:justify-between">
          {programId ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => submit('PAUSED')}
                disabled={saving}
                className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800/50 dark:text-amber-300 dark:hover:bg-amber-950/20"
              >
                <PauseCircle className="mr-2 h-4 w-4" />
                {t('actions.pause')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => submit('COMPLETED')}
                disabled={saving}
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800/50 dark:text-emerald-300 dark:hover:bg-emerald-950/20"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {t('actions.markComplete')}
              </Button>
            </div>
          ) : (
            <span />
          )}
          <Button type="button" onClick={() => submit()} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {t('actions.save')}
          </Button>
        </div>
      </div>
    </RolePanel>
  )
}
