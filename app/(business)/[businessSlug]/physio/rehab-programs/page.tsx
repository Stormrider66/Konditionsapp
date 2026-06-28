'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Activity,
  ChevronRight,
  Filter,
  Plus,
  Search,
  Target,
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
import { RolePageFrame, RolePageHeader, RolePanel, roleMutedBlockClass, roleSkeletonClass } from '@/components/layouts/role-shell/RolePage'
import { cn } from '@/lib/utils'

interface RehabMilestone {
  id: string
  achieved: boolean
}

interface RehabProgram {
  id: string
  name: string
  description: string | null
  status: string
  currentPhase: string
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
    phase: string
  } | null
  exercises: unknown[]
  milestones: RehabMilestone[]
  _count: {
    exercises: number
    milestones: number
    progressLogs: number
  }
}

interface RehabProgramsResponse {
  programs?: RehabProgram[]
  total?: number
}

const phaseLabels: Record<string, string> = {
  ACUTE: 'Acute',
  SUBACUTE: 'Subacute',
  REMODELING: 'Remodeling',
  FUNCTIONAL: 'Functional',
  RETURN_TO_SPORT: 'Return to sport',
}

const phaseColors: Record<string, string> = {
  ACUTE: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300',
  SUBACUTE: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300',
  REMODELING: 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-900/60 dark:bg-yellow-950/30 dark:text-yellow-300',
  FUNCTIONAL: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300',
  RETURN_TO_SPORT: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
}

const statusLabels: Record<string, string> = {
  ACTIVE: 'Active',
  DRAFT: 'Draft',
  PAUSED: 'Paused',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

const statusColors: Record<string, string> = {
  ACTIVE: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
  DRAFT: 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300',
  PAUSED: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300',
  COMPLETED: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300',
  CANCELLED: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300',
}

function getMilestoneProgress(milestones: RehabMilestone[]) {
  const achieved = milestones.filter((milestone) => milestone.achieved).length
  const total = milestones.length
  const percentage = total > 0 ? Math.round((achieved / total) * 100) : 0

  return { achieved, total, percentage }
}

export default function BusinessPhysioRehabProgramsPage() {
  const params = useParams()
  const businessSlug = params.businessSlug as string
  const basePath = `/${businessSlug}/physio`

  const [programs, setPrograms] = useState<RehabProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ACTIVE')
  const [phaseFilter, setPhaseFilter] = useState('all')
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const fetchPrograms = async () => {
      setLoading(true)
      try {
        const query = new URLSearchParams()
        if (statusFilter !== 'all') query.set('status', statusFilter)
        if (phaseFilter !== 'all') query.set('phase', phaseFilter)

        const res = await fetch(`/api/physio/rehab-programs?${query.toString()}`)
        if (res.ok) {
          const data = (await res.json()) as RehabProgramsResponse
          const fetchedPrograms = data.programs ?? []
          const searchLower = search.trim().toLowerCase()
          const filteredPrograms = searchLower
            ? fetchedPrograms.filter((program) =>
                program.name.toLowerCase().includes(searchLower) ||
                program.client.name.toLowerCase().includes(searchLower)
              )
            : fetchedPrograms

          setPrograms(filteredPrograms)
          setTotal(data.total ?? fetchedPrograms.length)
        }
      } catch (error) {
        console.error('Error fetching rehab programs:', error)
      } finally {
        setLoading(false)
      }
    }

    const debounce = window.setTimeout(() => {
      void fetchPrograms()
    }, 300)
    return () => window.clearTimeout(debounce)
  }, [search, statusFilter, phaseFilter])

  return (
    <RolePageFrame maxWidth="wide">
      <RolePageHeader
        eyebrow="Rehab plans"
        title="Rehab Programs"
        description="Create, monitor, and adjust active rehabilitation plans for assigned athletes."
        actions={
          <Button asChild>
            <Link href={`${basePath}/rehab-programs/new`}>
              <Plus className="mr-2 h-4 w-4" />
              New Program
            </Link>
          </Button>
        }
      />

      <RolePanel className="mb-5 p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Search by program name or athlete..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full lg:w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="PAUSED">Paused</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={phaseFilter} onValueChange={setPhaseFilter}>
            <SelectTrigger className="w-full lg:w-[190px]">
              <Filter className="mr-2 h-4 w-4 text-zinc-500" />
              <SelectValue placeholder="Phase" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All phases</SelectItem>
              {Object.entries(phaseLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </RolePanel>

      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        Showing {programs.length} of {total} rehab programs
      </p>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className={roleSkeletonClass('h-52')} />
          ))}
        </div>
      ) : programs.length === 0 ? (
        <RolePanel className="p-12 text-center">
          <Activity className="mx-auto mb-4 h-14 w-14 text-zinc-300 dark:text-zinc-700" />
          <p className="text-lg font-medium text-zinc-950 dark:text-zinc-50">No rehab programs found</p>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {search ? 'Try adjusting your search or filters.' : 'Start by creating the first rehab program.'}
          </p>
          <Button asChild className="mt-5">
            <Link href={`${basePath}/rehab-programs/new`}>
              <Plus className="mr-2 h-4 w-4" />
              New Program
            </Link>
          </Button>
        </RolePanel>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {programs.map((program) => {
            const progress = getMilestoneProgress(program.milestones ?? [])

            return (
              <Link
                key={program.id}
                href={`${basePath}/rehab-programs/${program.id}`}
                className="block"
              >
                <RolePanel className="h-full p-5 transition-colors hover:border-blue-200 dark:hover:border-blue-900/60">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                        {program.name}
                      </h3>
                      <div className="mt-1 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                        <User className="h-4 w-4 shrink-0" />
                        <span className="truncate">{program.client.name}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-zinc-400" />
                  </div>

                  <div className="mb-4 flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className={cn(statusColors[program.status] ?? statusColors.DRAFT)}
                    >
                      {statusLabels[program.status] ?? program.status}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(phaseColors[program.currentPhase] ?? phaseColors.FUNCTIONAL)}
                    >
                      {phaseLabels[program.currentPhase] ?? program.currentPhase}
                    </Badge>
                  </div>

                  {program.injury && (
                    <div className={roleMutedBlockClass('mb-4 p-3')}>
                      <p className="truncate text-sm font-medium text-zinc-700 dark:text-zinc-200">
                        {program.injury.injuryType}
                      </p>
                      <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-500">
                        {program.injury.bodyPart}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                    <div className="flex items-center gap-1">
                      <Activity className="h-3.5 w-3.5" />
                      <span>{program._count.exercises} exercises</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Target className="h-3.5 w-3.5" />
                      <span>{program._count.milestones} milestones</span>
                    </div>
                  </div>

                  {progress.total > 0 && (
                    <div className="mt-4">
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="text-zinc-500 dark:text-zinc-500">Milestone progress</span>
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">
                          {progress.achieved}/{progress.total}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${progress.percentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                </RolePanel>
              </Link>
            )
          })}
        </div>
      )}
    </RolePageFrame>
  )
}
