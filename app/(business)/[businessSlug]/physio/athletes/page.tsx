'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Activity,
  AlertTriangle,
  Ban,
  ChevronRight,
  Filter,
  Search,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RolePageFrame, RolePageHeader, RolePanel, roleMutedBlockClass, roleSkeletonClass } from '@/components/layouts/role-shell/RolePage'
import { useTranslations } from '@/i18n/client'

interface Athlete {
  id: string
  name: string
  email: string
  gender: string | null
  birthDate: string | null
  team: { id: string; name: string } | null
  stats: {
    activeInjuries: number
    activeRestrictions: number
    activeRehabPrograms: number
    totalTreatmentSessions: number
  }
  currentInjury: {
    id: string
    injuryType: string
    bodyPart: string
    painLevel: number
    phase: string
  } | null
  activeRestrictions: {
    id: string
    type: string
    severity: string
    endDate: string | null
  }[]
  activeRehabProgram: {
    id: string
    name: string
    currentPhase: string
  } | null
  latestCheckIn: {
    date: string
    injuryPain: number | null
    readinessLevel: number | null
  } | null
}

interface AthletesResponse {
  athletes?: Athlete[]
  total?: number
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

const painBarColor = (pain: number) => {
  if (pain >= 7) return 'bg-red-500 dark:bg-red-400'
  if (pain >= 4) return 'bg-amber-500 dark:bg-amber-400'
  return 'bg-emerald-500 dark:bg-emerald-400'
}

export default function BusinessPhysioAthletesPage() {
  const params = useParams()
  const businessSlug = params.businessSlug as string
  const basePath = `/${businessSlug}/physio`
  const t = useTranslations('components.physioAthleteList')

  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'injured' | 'restricted'>('all')
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const fetchAthletes = async () => {
      setLoading(true)
      try {
        const query = new URLSearchParams()
        if (search) query.set('search', search)
        if (filter === 'injured') query.set('hasActiveInjury', 'true')
        if (filter === 'restricted') query.set('hasActiveRestriction', 'true')

        const res = await fetch(`/api/physio/athletes?${query.toString()}`)
        if (res.ok) {
          const data = (await res.json()) as AthletesResponse
          setAthletes(data.athletes ?? [])
          setTotal(data.total ?? 0)
        }
      } catch (error) {
        console.error('Error fetching athletes:', error)
      } finally {
        setLoading(false)
      }
    }

    const debounce = window.setTimeout(() => {
      void fetchAthletes()
    }, 300)
    return () => window.clearTimeout(debounce)
  }, [search, filter])

  const formatPhase = (phase: string) => t(`phases.${phase}` as Parameters<typeof t>[0])
  const formatRestrictionType = (value: string) => value.replace(/_/g, ' ')

  return (
    <RolePageFrame maxWidth="wide">
      <RolePageHeader
        eyebrow="Care roster"
        title={t('header.title')}
        description={t('header.subtitle')}
      />

      <RolePanel className="mb-5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder={t('filters.searchPlaceholder')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="mr-2 h-4 w-4 text-zinc-500" />
              <SelectValue placeholder={t('filters.filterPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.all')}</SelectItem>
              <SelectItem value="injured">{t('filters.injuries')}</SelectItem>
              <SelectItem value="restricted">{t('filters.restrictions')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </RolePanel>

      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        {t('results.summary', { shown: athletes.length, total })}
      </p>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className={roleSkeletonClass('h-48')} />
          ))}
        </div>
      ) : athletes.length === 0 ? (
        <RolePanel className="p-12 text-center">
          <Users className="mx-auto mb-4 h-14 w-14 text-zinc-300 dark:text-zinc-700" />
          <p className="text-lg font-medium text-zinc-950 dark:text-zinc-50">{t('empty.title')}</p>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {search ? t('empty.searchHint') : t('empty.noAthletes')}
          </p>
        </RolePanel>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {athletes.map((athlete) => (
            <Link key={athlete.id} href={`${basePath}/athletes/${athlete.id}`} className="block">
              <RolePanel className="h-full p-5 transition-colors hover:border-emerald-200 dark:hover:border-emerald-900/60">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-semibold text-zinc-950 dark:text-zinc-50">{athlete.name}</h3>
                    <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">{athlete.email}</p>
                    {athlete.team && (
                      <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-500">{athlete.team.name}</p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-zinc-400" />
                </div>

                <div className="mb-4 flex flex-wrap gap-2">
                  {athlete.stats.activeInjuries > 0 && (
                    <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      {athlete.stats.activeInjuries} {t('status.labels.injury')}
                    </Badge>
                  )}
                  {athlete.stats.activeRestrictions > 0 && (
                    <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300">
                      <Ban className="mr-1 h-3 w-3" />
                      {athlete.stats.activeRestrictions} {t('status.labels.restriction')}
                    </Badge>
                  )}
                  {athlete.stats.activeRehabPrograms > 0 && (
                    <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
                      <Activity className="mr-1 h-3 w-3" />
                      {t('status.inRehab')}
                    </Badge>
                  )}
                </div>

                {athlete.currentInjury && (
                  <div className={roleMutedBlockClass('mb-3 p-3')}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-zinc-700 dark:text-zinc-200">
                        {athlete.currentInjury.injuryType}
                      </span>
                      <Badge variant="outline" className={phaseColors[athlete.currentInjury.phase] ?? phaseColors.FUNCTIONAL}>
                        {formatPhase(athlete.currentInjury.phase)}
                      </Badge>
                    </div>
                    <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-500">{athlete.currentInjury.bodyPart}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500 dark:text-zinc-500">{t('labels.pain')}:</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                        <div
                          className={`h-full rounded-full ${painBarColor(athlete.currentInjury.painLevel)}`}
                          style={{ width: `${athlete.currentInjury.painLevel * 10}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{athlete.currentInjury.painLevel}/10</span>
                    </div>
                  </div>
                )}

                {athlete.activeRestrictions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {athlete.activeRestrictions.slice(0, 2).map((restriction) => (
                      <Badge
                        key={restriction.id}
                        variant="outline"
                        className={severityColors[restriction.severity] ?? severityColors.MODERATE}
                      >
                        {formatRestrictionType(restriction.type)}
                      </Badge>
                    ))}
                    {athlete.activeRestrictions.length > 2 && (
                      <Badge variant="outline" className="text-xs text-zinc-500 dark:text-zinc-400">
                        +{athlete.activeRestrictions.length - 2} {t('status.more')}
                      </Badge>
                    )}
                  </div>
                )}

                {athlete.latestCheckIn && (
                  <div className="mt-3 border-t border-zinc-100 pt-3 text-xs text-zinc-500 dark:border-white/10 dark:text-zinc-500">
                    {t('checkin.last')}: {new Date(athlete.latestCheckIn.date).toLocaleDateString()}
                    {athlete.latestCheckIn.injuryPain !== null && (
                      <span className="ml-2">
                        {t('labels.pain')}: {athlete.latestCheckIn.injuryPain}/10
                      </span>
                    )}
                  </div>
                )}
              </RolePanel>
            </Link>
          ))}
        </div>
      )}
    </RolePageFrame>
  )
}
