'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Filter,
  Plus,
  Search,
  Stethoscope,
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
import { RolePageFrame, RolePageHeader, RolePanel } from '@/components/layouts/role-shell/RolePage'
import { cn } from '@/lib/utils'

interface TreatmentSession {
  id: string
  sessionDate: string
  treatmentType: string
  painBefore: number | null
  painAfter: number | null
  modalitiesUsed: string[]
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
}

interface TreatmentsResponse {
  treatments?: TreatmentSession[]
  total?: number
}

const treatmentTypeLabels: Record<string, string> = {
  ASSESSMENT: 'Assessment',
  INITIAL_ASSESSMENT: 'Initial assessment',
  FOLLOW_UP: 'Follow-up',
  MANUAL_THERAPY: 'Manual therapy',
  DRY_NEEDLING: 'Dry needling',
  EXERCISE_THERAPY: 'Exercise therapy',
  ELECTROTHERAPY: 'Electrotherapy',
  ULTRASOUND: 'Ultrasound',
  TAPING: 'Taping',
  EDUCATION: 'Education',
  MASSAGE: 'Massage',
  STRETCHING: 'Stretching',
  MOBILIZATION: 'Mobilization',
  DISCHARGE: 'Discharge',
  OTHER: 'Other',
}

const formatFallbackLabel = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

export default function BusinessPhysioTreatmentsPage() {
  const params = useParams()
  const businessSlug = params.businessSlug as string
  const basePath = `/${businessSlug}/physio`

  const [treatments, setTreatments] = useState<TreatmentSession[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [treatmentType, setTreatmentType] = useState('all')
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const fetchTreatments = async () => {
      setLoading(true)
      try {
        const query = new URLSearchParams()
        if (treatmentType !== 'all') query.set('treatmentType', treatmentType)

        const res = await fetch(`/api/physio/treatments?${query.toString()}`)
        if (res.ok) {
          const data = (await res.json()) as TreatmentsResponse
          const fetchedTreatments = data.treatments ?? []
          const searchLower = search.trim().toLowerCase()
          const filteredTreatments = searchLower
            ? fetchedTreatments.filter((treatment) =>
                treatment.client.name.toLowerCase().includes(searchLower) ||
                treatment.client.email.toLowerCase().includes(searchLower)
              )
            : fetchedTreatments

          setTreatments(filteredTreatments)
          setTotal(data.total ?? fetchedTreatments.length)
        }
      } catch (error) {
        console.error('Error fetching treatments:', error)
      } finally {
        setLoading(false)
      }
    }

    const debounce = window.setTimeout(() => {
      void fetchTreatments()
    }, 300)
    return () => window.clearTimeout(debounce)
  }, [search, treatmentType])

  return (
    <RolePageFrame maxWidth="wide">
      <RolePageHeader
        eyebrow="Clinical log"
        title="Treatment Sessions"
        description="Review recent treatment work and create new sessions for assigned athletes."
        actions={
          <Button asChild>
            <Link href={`${basePath}/treatments/new`}>
              <Plus className="mr-2 h-4 w-4" />
              New Treatment
            </Link>
          </Button>
        }
      />

      <RolePanel className="mb-5 p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Search by athlete name..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={treatmentType} onValueChange={setTreatmentType}>
            <SelectTrigger className="w-full lg:w-[220px]">
              <Filter className="mr-2 h-4 w-4 text-zinc-500" />
              <SelectValue placeholder="Treatment type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {Object.entries(treatmentTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </RolePanel>

      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        Showing {treatments.length} of {total} treatment sessions
      </p>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-28 bg-zinc-200/80 dark:bg-white/10" />
          ))}
        </div>
      ) : treatments.length === 0 ? (
        <RolePanel className="p-12 text-center">
          <Stethoscope className="mx-auto mb-4 h-14 w-14 text-zinc-300 dark:text-zinc-700" />
          <p className="text-lg font-medium text-zinc-950 dark:text-zinc-50">No treatment sessions found</p>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Start by creating your first treatment session.
          </p>
          <Button asChild className="mt-5">
            <Link href={`${basePath}/treatments/new`}>
              <Plus className="mr-2 h-4 w-4" />
              New Treatment
            </Link>
          </Button>
        </RolePanel>
      ) : (
        <div className="space-y-3">
          {treatments.map((treatment) => {
            const label = treatmentTypeLabels[treatment.treatmentType] ?? formatFallbackLabel(treatment.treatmentType)
            const hasPainData = treatment.painBefore !== null || treatment.painAfter !== null
            const improvedPain =
              treatment.painBefore !== null &&
              treatment.painAfter !== null &&
              treatment.painAfter < treatment.painBefore

            return (
              // No treatment detail page exists yet, so this remains a non-clickable row.
              <RolePanel key={treatment.id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                      <Stethoscope className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
                          {label}
                        </h3>
                        <Badge variant="outline" className="border-zinc-200 text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
                          {new Date(treatment.sessionDate).toLocaleDateString()}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                        <User className="h-4 w-4" />
                        <span>{treatment.client.name}</span>
                      </div>
                      {treatment.injury && (
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
                          {treatment.injury.injuryType} - {treatment.injury.bodyPart}
                        </p>
                      )}
                    </div>
                  </div>

                  {hasPainData && (
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900/50 lg:text-right">
                      {treatment.painBefore !== null && (
                        <div className="text-zinc-500 dark:text-zinc-400">
                          Before: <span className="font-medium text-zinc-800 dark:text-zinc-100">{treatment.painBefore}/10</span>
                        </div>
                      )}
                      {treatment.painAfter !== null && (
                        <div className="text-zinc-500 dark:text-zinc-400">
                          After:{' '}
                          <span
                            className={cn(
                              'font-medium',
                              improvedPain
                                ? 'text-emerald-700 dark:text-emerald-300'
                                : 'text-zinc-800 dark:text-zinc-100'
                            )}
                          >
                            {treatment.painAfter}/10
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {treatment.modalitiesUsed.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2 lg:ml-16">
                    {treatment.modalitiesUsed.slice(0, 4).map((modality) => (
                      <Badge key={modality} variant="outline" className="border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                        {formatFallbackLabel(modality)}
                      </Badge>
                    ))}
                    {treatment.modalitiesUsed.length > 4 && (
                      <Badge variant="outline" className="border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                        +{treatment.modalitiesUsed.length - 4} more
                      </Badge>
                    )}
                  </div>
                )}
              </RolePanel>
            )
          })}
        </div>
      )}
    </RolePageFrame>
  )
}
