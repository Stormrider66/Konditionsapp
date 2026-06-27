'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Ban,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Loader2,
  MessageSquare,
  Plus,
  Stethoscope,
  TrendingUp,
  User,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RolePageFrame, RolePanel } from '@/components/layouts/role-shell/RolePage'
import { useTranslations } from '@/i18n/client'
import { cn } from '@/lib/utils'

interface UserSummary {
  id: string
  name: string
  role?: string
}

interface InjuryAssessment {
  id: string
  injuryType: string
  bodyPart: string
  painLevel: number
  phase: string
  date: string
  assessedBy?: UserSummary | null
}

interface TrainingRestriction {
  id: string
  type: string
  severity: string
  bodyParts?: unknown
  reason: string | null
  endDate: string | null
  createdBy?: UserSummary | null
}

interface RehabProgram {
  id: string
  name: string
  currentPhase: string
  injury: {
    id: string
    injuryType: string
    bodyPart: string
  } | null
  exercises?: unknown[]
  milestones?: unknown[]
  _count?: {
    progressLogs?: number
  }
}

interface TreatmentSession {
  id: string
  treatmentType: string
  sessionDate: string
  painBefore: number | null
  painAfter: number | null
}

interface DailyMetric {
  date: string
  injuryPain: number | null
  muscleSoreness: number | null
  readinessLevel: number | null
  sleepQuality: number | null
  stress: number | null
}

interface AthleteDetail {
  id: string
  name: string
  email: string
  gender: string | null
  birthDate: string | null
  height: number | null
  weight: number | null
  team: { id: string; name: string } | null
  sportProfile: {
    id: string
    primarySport: string | null
    onboardingCompleted: boolean
  } | null
  injuryAssessments: InjuryAssessment[]
  trainingRestrictions: TrainingRestriction[]
  rehabPrograms: RehabProgram[]
  treatmentSessions: TreatmentSession[]
  dailyMetrics: DailyMetric[]
  movementScreens: unknown[]
  acuteInjuryReports: unknown[]
  summary: {
    activeInjuries: number
    activeRestrictions: number
    activeRehabPrograms: number
    recentTreatments: number
    avgRecentPain: number | null
  }
}

interface PhysioAthleteDetailProps {
  athleteId: string
  basePath: string
}

const severityColors: Record<string, string> = {
  MILD: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
  MODERATE: 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-900/60 dark:bg-yellow-950/30 dark:text-yellow-300',
  SEVERE: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300',
  COMPLETE: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300',
}

const phaseColors: Record<string, string> = {
  ACUTE: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300',
  SUBACUTE: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300',
  REMODELING: 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-900/60 dark:bg-yellow-950/30 dark:text-yellow-300',
  FUNCTIONAL: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300',
  RETURN_TO_SPORT: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
}

const actionButtonClass =
  'w-full justify-start border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 dark:border-white/10 dark:bg-zinc-950/60 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-50'

const listItemClass =
  'rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-900/50'

const painBarColor = (pain: number) => {
  if (pain >= 7) return 'bg-red-500 dark:bg-red-400'
  if (pain >= 4) return 'bg-amber-500 dark:bg-amber-400'
  return 'bg-emerald-500 dark:bg-emerald-400'
}

const formatFallbackLabel = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const calculateAge = (birthDate: string | null) => {
  if (!birthDate) return null

  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }

  return age
}

export function PhysioAthleteDetail({ athleteId, basePath }: PhysioAthleteDetailProps) {
  const router = useRouter()
  const t = useTranslations('components.physioAthleteDetail')
  const [athlete, setAthlete] = useState<AthleteDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [clearingInjuryId, setClearingInjuryId] = useState<string | null>(null)

  const fetchAthlete = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/physio/athletes/${athleteId}`)
      if (res.ok) {
        const data = (await res.json()) as AthleteDetail
        setAthlete(data)
      } else if (res.status === 403 || res.status === 404) {
        router.push(`${basePath}/athletes`)
      }
    } catch (error) {
      console.error('Error fetching athlete:', error)
    } finally {
      setLoading(false)
    }
  }, [athleteId, basePath, router])

  useEffect(() => {
    void fetchAthlete()
  }, [fetchAthlete])

  const clearInjury = async (injuryId: string) => {
    setClearingInjuryId(injuryId)
    try {
      const res = await fetch(`/api/physio/injuries/${injuryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'RESOLVED',
          resolved: true,
          clearRestrictions: true,
        }),
      })

      if (res.ok) {
        await fetchAthlete()
      }
    } catch (error) {
      console.error('Error clearing injury:', error)
    } finally {
      setClearingInjuryId(null)
    }
  }

  const phaseLabels: Record<string, string> = {
    ACUTE: t('phases.ACUTE'),
    SUBACUTE: t('phases.SUBACUTE'),
    REMODELING: t('phases.REMODELING'),
    FUNCTIONAL: t('phases.FUNCTIONAL'),
    RETURN_TO_SPORT: t('phases.RETURN_TO_SPORT'),
  }

  const severityLabels: Record<string, string> = {
    MILD: t('severity.MILD'),
    MODERATE: t('severity.MODERATE'),
    SEVERE: t('severity.SEVERE'),
    COMPLETE: t('severity.COMPLETE'),
  }

  const formatPhase = (phase: string) => phaseLabels[phase] ?? formatFallbackLabel(phase)
  const formatSeverity = (severity: string) => severityLabels[severity] ?? formatFallbackLabel(severity)
  const formatRestrictionType = (value: string) => formatFallbackLabel(value)

  const formatTreatmentType = (value: string) => {
    switch (value) {
      case 'INITIAL_ASSESSMENT':
        return t('treatmentTypes.initialAssessment')
      case 'FOLLOW_UP':
        return t('treatmentTypes.followUp')
      case 'MANUAL_THERAPY':
        return t('treatmentTypes.manualTherapy')
      case 'DRY_NEEDLING':
        return t('treatmentTypes.dryNeedling')
      case 'EXERCISE_THERAPY':
        return t('treatmentTypes.exerciseTherapy')
      case 'ELECTROTHERAPY':
        return t('treatmentTypes.electrotherapy')
      case 'ULTRASOUND':
        return t('treatmentTypes.ultrasound')
      case 'TAPING':
        return t('treatmentTypes.taping')
      case 'MASSAGE':
        return t('treatmentTypes.massage')
      case 'STRETCHING':
        return t('treatmentTypes.stretching')
      case 'MOBILIZATION':
        return t('treatmentTypes.mobilization')
      case 'DISCHARGE':
        return t('treatmentTypes.discharge')
      case 'OTHER':
        return t('treatmentTypes.other')
      default:
        return formatFallbackLabel(value)
    }
  }

  if (loading) {
    return (
      <RolePageFrame maxWidth="wide">
        <Skeleton className="mb-6 h-9 w-40 bg-zinc-200/80 dark:bg-white/10" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 bg-zinc-200/80 dark:bg-white/10" />
          <Skeleton className="h-64 bg-zinc-200/80 dark:bg-white/10 lg:col-span-2" />
        </div>
      </RolePageFrame>
    )
  }

  if (!athlete) {
    return (
      <RolePageFrame maxWidth="wide">
        <RolePanel className="p-12 text-center">
          <p className="text-zinc-500 dark:text-zinc-400">{t('errors.notFound')}</p>
        </RolePanel>
      </RolePageFrame>
    )
  }

  const profileRows = [
    athlete.birthDate
      ? {
          label: t('profile.age.label'),
          value: `${calculateAge(athlete.birthDate)} ${t('profile.age.unit')}`,
        }
      : null,
    athlete.gender
      ? {
          label: t('profile.gender'),
          value: formatFallbackLabel(athlete.gender),
        }
      : null,
    athlete.height
      ? {
          label: t('profile.height.label'),
          value: `${athlete.height} ${t('profile.height.unit')}`,
        }
      : null,
    athlete.weight
      ? {
          label: t('profile.weight.label'),
          value: `${athlete.weight} ${t('profile.weight.unit')}`,
        }
      : null,
    athlete.team
      ? {
          label: t('profile.team'),
          value: athlete.team.name,
        }
      : null,
    athlete.sportProfile?.primarySport
      ? {
          label: t('profile.sport'),
          value: formatFallbackLabel(athlete.sportProfile.primarySport),
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>

  const summaryTiles = [
    {
      label: t('stats.activeInjuries'),
      value: athlete.summary.activeInjuries,
      className: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300',
    },
    {
      label: t('stats.activeRestrictions'),
      value: athlete.summary.activeRestrictions,
      className: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300',
    },
    {
      label: t('stats.activeRehabPrograms'),
      value: athlete.summary.activeRehabPrograms,
      className: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300',
    },
    {
      label: t('stats.recentTreatments'),
      value: athlete.summary.recentTreatments,
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
    },
  ]

  return (
    <RolePageFrame maxWidth="wide">
      <Button
        variant="ghost"
        className="mb-6 text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
        onClick={() => router.back()}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('actions.backToAthletes')}
      </Button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <RolePanel className="p-6">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                <User className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
                  {athlete.name}
                </h1>
                <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">{athlete.email}</p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              {profileRows.map((row) => (
                <div key={row.label} className="flex justify-between gap-4">
                  <span className="text-zinc-500 dark:text-zinc-400">{row.label}</span>
                  <span className="min-w-0 truncate text-right font-medium text-zinc-800 dark:text-zinc-100">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </RolePanel>

          <RolePanel className="p-5">
            <h2 className="mb-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">{t('stats.title')}</h2>
            <div className="grid grid-cols-2 gap-3">
              {summaryTiles.map((tile) => (
                <div key={tile.label} className={cn('rounded-lg border p-3 text-center', tile.className)}>
                  <p className="text-2xl font-semibold">{tile.value}</p>
                  <p className="mt-1 text-xs">{tile.label}</p>
                </div>
              ))}
            </div>
          </RolePanel>

          <RolePanel className="p-5">
            <h2 className="mb-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
              {t('quickActions.title')}
            </h2>
            <div className="space-y-2">
              <Button asChild variant="outline" className={actionButtonClass}>
                <Link href={`${basePath}/treatments/new?clientId=${athlete.id}`}>
                  <Stethoscope className="mr-2 h-4 w-4" />
                  {t('quickActions.newTreatmentSession')}
                </Link>
              </Button>
              <Button asChild variant="outline" className={actionButtonClass}>
                <Link href={`${basePath}/rehab-programs/new?clientId=${athlete.id}`}>
                  <Activity className="mr-2 h-4 w-4" />
                  {t('quickActions.createRehabProgram')}
                </Link>
              </Button>
              <Button asChild variant="outline" className={actionButtonClass}>
                <Link href={`${basePath}/restrictions/new?clientId=${athlete.id}`}>
                  <Ban className="mr-2 h-4 w-4" />
                  {t('quickActions.addRestriction')}
                </Link>
              </Button>
              <Button asChild variant="outline" className={actionButtonClass}>
                <Link href={`${basePath}/screenings/new?clientId=${athlete.id}`}>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  {t('quickActions.movementScreen')}
                </Link>
              </Button>
              <Button asChild variant="outline" className={actionButtonClass}>
                <Link href={`${basePath}/messages?clientId=${athlete.id}`}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {t('quickActions.careTeamChat')}
                </Link>
              </Button>
            </div>
          </RolePanel>
        </div>

        <div className="lg:col-span-2">
          <Tabs defaultValue="injuries" className="w-full">
            <TabsList className="mb-4 grid h-auto w-full grid-cols-2 gap-1 rounded-lg border border-zinc-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-zinc-950/60 sm:grid-cols-3 xl:flex xl:justify-start">
              {[
                ['injuries', t('tabs.injuries')],
                ['restrictions', t('tabs.restrictions')],
                ['rehab', t('tabs.rehab')],
                ['treatments', t('tabs.treatments')],
                ['metrics', t('tabs.checkIns')],
              ].map(([value, label]) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 dark:data-[state=active]:bg-emerald-950/30 dark:data-[state=active]:text-emerald-300"
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="injuries">
              <RolePanel className="p-5">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  {t('sections.activeInjuries')}
                </h2>
                {athlete.injuryAssessments.length === 0 ? (
                  <p className="py-8 text-center text-zinc-500 dark:text-zinc-400">{t('empty.noActiveInjuries')}</p>
                ) : (
                  <div className="space-y-3">
                    {athlete.injuryAssessments.map((injury) => (
                      <div key={injury.id} className={listItemClass}>
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-zinc-950 dark:text-zinc-50">{injury.injuryType}</p>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">{injury.bodyPart}</p>
                          </div>
                          <Badge variant="outline" className={phaseColors[injury.phase] ?? phaseColors.FUNCTIONAL}>
                            {formatPhase(injury.phase)}
                          </Badge>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-xs text-zinc-500 dark:text-zinc-500">{t('labels.pain')}:</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                            <div
                              className={cn('h-full rounded-full', painBarColor(injury.painLevel))}
                              style={{ width: `${injury.painLevel * 10}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{injury.painLevel}/10</span>
                        </div>
                        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-xs text-zinc-500 dark:text-zinc-500">
                            {t('labels.assessed')}: {new Date(injury.date).toLocaleDateString()}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-emerald-200 text-emerald-700 hover:text-emerald-800 dark:border-emerald-900/60 dark:text-emerald-300 dark:hover:text-emerald-200"
                            disabled={clearingInjuryId === injury.id}
                            onClick={() => void clearInjury(injury.id)}
                          >
                            {clearingInjuryId === injury.id ? (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                            )}
                            {t('actions.clearInjury')}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </RolePanel>
            </TabsContent>

            <TabsContent value="restrictions">
              <RolePanel className="p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                    <Ban className="h-5 w-5 text-orange-500" />
                    {t('sections.activeRestrictions')}
                  </h2>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`${basePath}/restrictions/new?clientId=${athlete.id}`}>
                      <Plus className="mr-1 h-4 w-4" />
                      {t('actions.add')}
                    </Link>
                  </Button>
                </div>
                {athlete.trainingRestrictions.length === 0 ? (
                  <p className="py-8 text-center text-zinc-500 dark:text-zinc-400">{t('empty.noActiveRestrictions')}</p>
                ) : (
                  <div className="space-y-3">
                    {athlete.trainingRestrictions.map((restriction) => {
                      const bodyParts = Array.isArray(restriction.bodyParts)
                        ? restriction.bodyParts.filter((part): part is string => typeof part === 'string')
                        : []

                      return (
                        <Link
                          key={restriction.id}
                          href={`${basePath}/restrictions/${restriction.id}`}
                          className={cn('block transition-colors hover:border-orange-200 dark:hover:border-orange-900/60', listItemClass)}
                        >
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium text-zinc-950 dark:text-zinc-50">
                                {formatRestrictionType(restriction.type)}
                              </p>
                              {bodyParts.length > 0 && (
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                  {bodyParts.join(', ')}
                                </p>
                              )}
                            </div>
                            <Badge
                              variant="outline"
                              className={severityColors[restriction.severity] ?? severityColors.MODERATE}
                            >
                              {formatSeverity(restriction.severity)}
                            </Badge>
                          </div>
                          {restriction.reason && (
                            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{restriction.reason}</p>
                          )}
                          <div className="mt-3 flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
                            <span>{t('labels.createdBy')}: {restriction.createdBy?.name ?? t('labels.unknown')}</span>
                            {restriction.endDate && (
                              <span>{t('labels.until')}: {new Date(restriction.endDate).toLocaleDateString()}</span>
                            )}
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </RolePanel>
            </TabsContent>

            <TabsContent value="rehab">
              <RolePanel className="p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                    <Activity className="h-5 w-5 text-blue-500" />
                    {t('sections.rehabPrograms')}
                  </h2>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`${basePath}/rehab-programs/new?clientId=${athlete.id}`}>
                      <Plus className="mr-1 h-4 w-4" />
                      {t('actions.create')}
                    </Link>
                  </Button>
                </div>
                {athlete.rehabPrograms.length === 0 ? (
                  <p className="py-8 text-center text-zinc-500 dark:text-zinc-400">{t('empty.noActiveRehabPrograms')}</p>
                ) : (
                  <div className="space-y-3">
                    {athlete.rehabPrograms.map((program) => (
                      <Link
                        key={program.id}
                        href={`${basePath}/rehab-programs/${program.id}`}
                        className={cn('block transition-colors hover:border-blue-200 dark:hover:border-blue-900/60', listItemClass)}
                      >
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-zinc-950 dark:text-zinc-50">{program.name}</p>
                            {program.injury && (
                              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                {program.injury.injuryType} - {program.injury.bodyPart}
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <Badge
                              variant="outline"
                              className={phaseColors[program.currentPhase] ?? phaseColors.FUNCTIONAL}
                            >
                              {formatPhase(program.currentPhase)}
                            </Badge>
                            <ChevronRight className="h-4 w-4 text-zinc-400" />
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-zinc-500 dark:text-zinc-500">
                          <span>{program.exercises?.length ?? 0} {t('labels.exercises')}</span>
                          <span>{program.milestones?.length ?? 0} {t('labels.milestones')}</span>
                          <span>{program._count?.progressLogs ?? 0} {t('labels.logs')}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </RolePanel>
            </TabsContent>

            <TabsContent value="treatments">
              <RolePanel className="p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                    <Stethoscope className="h-5 w-5 text-emerald-500" />
                    {t('sections.recentTreatments')}
                  </h2>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`${basePath}/treatments/new?clientId=${athlete.id}`}>
                      <Plus className="mr-1 h-4 w-4" />
                      {t('actions.new')}
                    </Link>
                  </Button>
                </div>
                {athlete.treatmentSessions.length === 0 ? (
                  <p className="py-8 text-center text-zinc-500 dark:text-zinc-400">{t('empty.noTreatmentSessions')}</p>
                ) : (
                  <div className="space-y-3">
                    {athlete.treatmentSessions.map((session) => (
                      <Link
                        key={session.id}
                        href={`${basePath}/treatments/${session.id}`}
                        className={cn('block transition-colors hover:border-emerald-200 dark:hover:border-emerald-900/60', listItemClass)}
                      >
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-zinc-950 dark:text-zinc-50">
                              {formatTreatmentType(session.treatmentType)}
                            </p>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                              {new Date(session.sessionDate).toLocaleDateString()}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-zinc-400" />
                        </div>
                        {(session.painBefore !== null || session.painAfter !== null) && (
                          <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
                            {session.painBefore !== null && (
                              <span>
                                {t('labels.painBefore')}: <span className="font-medium text-zinc-800 dark:text-zinc-100">{session.painBefore}/10</span>
                              </span>
                            )}
                            {session.painAfter !== null && (
                              <span>
                                {t('labels.after')}: <span className="font-medium text-zinc-800 dark:text-zinc-100">{session.painAfter}/10</span>
                              </span>
                            )}
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
                <Button asChild variant="ghost" className="mt-4 w-full text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50">
                  <Link href={`${basePath}/athletes/${athlete.id}/history`}>
                    {t('actions.viewFullHistory')}
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </RolePanel>
            </TabsContent>

            <TabsContent value="metrics">
              <RolePanel className="p-5">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                  <Calendar className="h-5 w-5 text-violet-500" />
                  {t('sections.recentCheckIns')}
                </h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {t('descriptions.recentCheckIns')}
                </p>
                {athlete.dailyMetrics.length === 0 ? (
                  <p className="py-8 text-center text-zinc-500 dark:text-zinc-400">{t('empty.noRecentCheckIns')}</p>
                ) : (
                  <div className="mt-4 space-y-2">
                    {athlete.dailyMetrics.map((metric, index) => (
                      <div
                        key={`${metric.date}-${index}`}
                        className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-white/10 dark:bg-zinc-900/50 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span className="font-medium text-zinc-700 dark:text-zinc-200">
                          {new Date(metric.date).toLocaleDateString()}
                        </span>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
                          {metric.injuryPain !== null && (
                            <span>
                              {t('labels.pain')}: <span className="font-medium text-zinc-800 dark:text-zinc-100">{metric.injuryPain}/10</span>
                            </span>
                          )}
                          {metric.muscleSoreness !== null && (
                            <span>
                              {t('labels.soreness')}: <span className="font-medium text-zinc-800 dark:text-zinc-100">{metric.muscleSoreness}/10</span>
                            </span>
                          )}
                          {metric.readinessLevel !== null && (
                            <span>
                              {t('labels.readiness')}: <span className="font-medium text-zinc-800 dark:text-zinc-100">{metric.readinessLevel}/10</span>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </RolePanel>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </RolePageFrame>
  )
}
