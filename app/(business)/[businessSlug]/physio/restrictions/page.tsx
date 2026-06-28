'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  AlertTriangle,
  Ban,
  Calendar,
  ChevronRight,
  Filter,
  Plus,
  Search,
  User,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RolePageFrame, RolePageHeader, RolePanel, roleSkeletonClass } from '@/components/layouts/role-shell/RolePage'
import { cn } from '@/lib/utils'

interface TrainingRestriction {
  id: string
  type: string
  severity: string
  source: string
  bodyParts: string[]
  affectedWorkoutTypes: string[]
  description: string | null
  reason: string | null
  endDate: string | null
  isActive: boolean
  createdAt: string
  client: {
    id: string
    name: string
    email: string
  }
  injury: {
    id: string
    injuryType: string
    bodyPart: string
  } | null
  createdBy: {
    id: string
    name: string
    role: string
  }
}

interface RestrictionsResponse {
  restrictions?: TrainingRestriction[]
  total?: number
}

const restrictionTypeLabels: Record<string, string> = {
  NO_RUNNING: 'No running',
  NO_JUMPING: 'No jumping',
  NO_IMPACT: 'No impact',
  NO_UPPER_BODY: 'No upper body',
  NO_LOWER_BODY: 'No lower body',
  REDUCED_VOLUME: 'Reduced volume',
  REDUCED_INTENSITY: 'Reduced intensity',
  MODIFIED_ONLY: 'Modified only',
  SPECIFIC_EXERCISES: 'Specific exercises',
  CUSTOM: 'Custom',
}

const severityColors: Record<string, string> = {
  MILD: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
  MODERATE: 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-900/60 dark:bg-yellow-950/30 dark:text-yellow-300',
  SEVERE: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300',
  COMPLETE: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300',
}

const sourceLabels: Record<string, string> = {
  INJURY_CASCADE: 'Injury cascade',
  PHYSIO_MANUAL: 'Physio',
  COACH_MANUAL: 'Coach',
  AI_RECOMMENDED: 'AI recommended',
}

const formatFallbackLabel = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

export default function BusinessPhysioRestrictionsPage() {
  const params = useParams()
  const businessSlug = params.businessSlug as string
  const basePath = `/${businessSlug}/physio`

  const [restrictions, setRestrictions] = useState<TrainingRestriction[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<'active' | 'all'>('active')
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const fetchRestrictions = async () => {
      setLoading(true)
      try {
        const query = new URLSearchParams()
        query.set('activeOnly', activeFilter === 'active' ? 'true' : 'false')

        const res = await fetch(`/api/physio/restrictions?${query.toString()}`)
        if (res.ok) {
          const data = (await res.json()) as RestrictionsResponse
          const fetchedRestrictions = data.restrictions ?? []
          const searchLower = search.trim().toLowerCase()
          const filteredRestrictions = searchLower
            ? fetchedRestrictions.filter((restriction) =>
                restriction.client.name.toLowerCase().includes(searchLower) ||
                restriction.type.toLowerCase().includes(searchLower)
              )
            : fetchedRestrictions

          setRestrictions(filteredRestrictions)
          setTotal(data.total ?? fetchedRestrictions.length)
        }
      } catch (error) {
        console.error('Error fetching restrictions:', error)
      } finally {
        setLoading(false)
      }
    }

    const debounce = window.setTimeout(() => {
      void fetchRestrictions()
    }, 300)
    return () => window.clearTimeout(debounce)
  }, [search, activeFilter])

  return (
    <RolePageFrame maxWidth="wide">
      <RolePageHeader
        eyebrow="Training guardrails"
        title="Training Restrictions"
        description="Review active limits and create clear training modifications for assigned athletes."
        actions={
          <Button asChild>
            <Link href={`${basePath}/restrictions/new`}>
              <Plus className="mr-2 h-4 w-4" />
              New Restriction
            </Link>
          </Button>
        }
      />

      <RolePanel className="mb-5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Search by athlete name..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={activeFilter} onValueChange={(value) => setActiveFilter(value as typeof activeFilter)}>
            <SelectTrigger className="w-full sm:w-[190px]">
              <Filter className="mr-2 h-4 w-4 text-zinc-500" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active only</SelectItem>
              <SelectItem value="all">All restrictions</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </RolePanel>

      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        Showing {restrictions.length} of {total} restrictions
      </p>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className={roleSkeletonClass('h-28')} />
          ))}
        </div>
      ) : restrictions.length === 0 ? (
        <RolePanel className="p-12 text-center">
          <Ban className="mx-auto mb-4 h-14 w-14 text-zinc-300 dark:text-zinc-700" />
          <p className="text-lg font-medium text-zinc-950 dark:text-zinc-50">No restrictions found</p>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {activeFilter === 'active' ? 'No active restrictions at this time.' : 'Create a restriction for an athlete.'}
          </p>
          <Button asChild className="mt-5">
            <Link href={`${basePath}/restrictions/new`}>
              <Plus className="mr-2 h-4 w-4" />
              New Restriction
            </Link>
          </Button>
        </RolePanel>
      ) : (
        <div className="space-y-3">
          {restrictions.map((restriction) => {
            const label = restrictionTypeLabels[restriction.type] ?? formatFallbackLabel(restriction.type)
            const source = sourceLabels[restriction.source] ?? formatFallbackLabel(restriction.source)

            return (
              <Link
                key={restriction.id}
                href={`${basePath}/restrictions/${restriction.id}`}
                className="block"
              >
                <RolePanel
                  className={cn(
                    'p-5 transition-colors hover:border-orange-200 dark:hover:border-orange-900/60',
                    !restriction.isActive && 'opacity-70'
                  )}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 flex-1 items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-orange-100 bg-orange-50 text-orange-600 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300">
                        <Ban className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
                            {label}
                          </h3>
                          <Badge variant="outline" className={severityColors[restriction.severity] ?? severityColors.MODERATE}>
                            {formatFallbackLabel(restriction.severity)}
                          </Badge>
                          {!restriction.isActive && (
                            <Badge variant="outline" className="border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                          <User className="h-4 w-4" />
                          <span>{restriction.client.name}</span>
                          <span className="text-zinc-300 dark:text-zinc-700">/</span>
                          <span>{source}</span>
                        </div>
                        {restriction.injury && (
                          <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-500">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>{restriction.injury.injuryType} - {restriction.injury.bodyPart}</span>
                          </div>
                        )}
                        {restriction.bodyParts.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {restriction.bodyParts.map((part) => (
                              <Badge key={part} variant="outline" className="border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                                {part}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-between gap-4 lg:justify-end">
                      {restriction.endDate && (
                        <div className="text-xs text-zinc-500 dark:text-zinc-500">
                          <Calendar className="mr-1 inline h-3.5 w-3.5" />
                          Until {new Date(restriction.endDate).toLocaleDateString()}
                        </div>
                      )}
                      <ChevronRight className="h-5 w-5 text-zinc-400" />
                    </div>
                  </div>
                </RolePanel>
              </Link>
            )
          })}
        </div>
      )}
    </RolePageFrame>
  )
}
