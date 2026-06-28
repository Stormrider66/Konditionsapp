// components/programs/ProgramsList.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useLocale } from 'next-intl'
import { getBusinessSlugFromPathname } from '@/lib/business-scope-client'
import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import { RolePanel } from '@/components/layouts/role-shell/RolePage'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import {
  Calendar,
  User,
  Target,
  Activity,
  Search,
  Filter,
  Trash2,
} from 'lucide-react'

interface ProgramsListProps {
  programs: TrainingProgramListItem[]
}

interface TrainingProgramListItem {
  id: string
  name: string
  startDate: string | Date
  endDate: string | Date
  goalType?: string | null
  client?: {
    name?: string | null
  } | null
  weeks?: Array<{
    weekNumber: number
    phase?: string | null
  }>
}

type AppLocale = 'en' | 'sv'

const getAppLocale = (locale: string): AppLocale => (locale === 'sv' ? 'sv' : 'en')

const label = (locale: AppLocale, svText: string, enText: string) =>
  locale === 'sv' ? svText : enText

const dateFnsLocale = (locale: AppLocale) => (locale === 'sv' ? sv : enUS)

export function ProgramsList({ programs }: ProgramsListProps) {
  const appLocale = getAppLocale(useLocale())
  const pathname = usePathname()
  const pathBusinessSlug = getBusinessSlugFromPathname(pathname)
  const basePath = pathBusinessSlug ? `/${pathBusinessSlug}` : ''
  const [searchQuery, setSearchQuery] = useState('')
  const [goalFilter, setGoalFilter] = useState<string>('all')
  const [phaseFilter, setPhaseFilter] = useState<string>('all')

  // Filter programs
  const filteredPrograms = programs.filter((program) => {
    const matchesSearch =
      program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (program.client?.name ?? '').toLowerCase().includes(searchQuery.toLowerCase())

    const matchesGoal =
      goalFilter === 'all' || program.goalType === goalFilter

    const currentPhase = getCurrentPhase(program)
    const matchesPhase =
      phaseFilter === 'all' || currentPhase === phaseFilter

    return matchesSearch && matchesGoal && matchesPhase
  })

  if (programs.length === 0) {
    return (
      <RolePanel className="p-8 text-center sm:p-12">
        <Activity className="mx-auto mb-4 h-12 w-12 text-zinc-400 dark:text-zinc-600" />
          <h3 className="mb-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            {label(appLocale, 'Inga program än', 'No programs yet')}
          </h3>
          <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
            {label(
              appLocale,
              'Kom igång genom att skapa ditt första träningsprogram',
              'Get started by creating your first training program'
            )}
          </p>
          <Link href={`${basePath}/coach/programs/new`}>
            <Button>{label(appLocale, 'Skapa program', 'Create program')}</Button>
          </Link>
      </RolePanel>
    )
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={label(appLocale, 'Sök program eller atlet...', 'Search program or athlete...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-white/10"
          />
        </div>
        <Select value={goalFilter} onValueChange={setGoalFilter}>
          <SelectTrigger className="w-full sm:w-[200px] bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-white/10">
            <SelectValue placeholder={label(appLocale, 'Filtrera mål', 'Filter goal')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{label(appLocale, 'Alla mål', 'All goals')}</SelectItem>
            <SelectItem value="marathon">Marathon</SelectItem>
            <SelectItem value="half-marathon">{label(appLocale, 'Halvmaraton', 'Half marathon')}</SelectItem>
            <SelectItem value="10k">10K</SelectItem>
            <SelectItem value="5k">5K</SelectItem>
            <SelectItem value="fitness">{label(appLocale, 'Kondition', 'Fitness')}</SelectItem>
            <SelectItem value="cycling">{label(appLocale, 'Cykling', 'Cycling')}</SelectItem>
            <SelectItem value="skiing">{label(appLocale, 'Skidåkning', 'Skiing')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={phaseFilter} onValueChange={setPhaseFilter}>
          <SelectTrigger className="w-full sm:w-[200px] bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-white/10">
            <SelectValue placeholder={label(appLocale, 'Filtrera fas', 'Filter phase')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{label(appLocale, 'Alla faser', 'All phases')}</SelectItem>
            <SelectItem value="BASE">{label(appLocale, 'Bas', 'Base')}</SelectItem>
            <SelectItem value="BUILD">{label(appLocale, 'Uppbyggnad', 'Build')}</SelectItem>
            <SelectItem value="PEAK">Peak</SelectItem>
            <SelectItem value="TAPER">Taper</SelectItem>
            <SelectItem value="RECOVERY">{label(appLocale, 'Återhämtning', 'Recovery')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        {label(appLocale, 'Visar', 'Showing')} {filteredPrograms.length} {label(appLocale, 'av', 'of')} {programs.length} {label(appLocale, 'program', 'programs')}
      </p>

      {/* Programs grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredPrograms.map((program) => (
          <ProgramCard key={program.id} program={program} basePath={basePath} businessSlug={pathBusinessSlug} locale={appLocale} />
        ))}
      </div>

      {filteredPrograms.length === 0 && (
        <RolePanel className="p-8 text-center sm:p-12">
            <Filter className="mx-auto mb-4 h-12 w-12 text-zinc-400 dark:text-zinc-600" />
            <h3 className="mb-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
              {label(appLocale, 'Inga matchande program', 'No matching programs')}
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {label(appLocale, 'Prova att ändra dina filterinställningar', 'Try changing your filters')}
            </p>
        </RolePanel>
      )}
    </div>
  )
}

function ProgramCard({
  program,
  basePath,
  businessSlug,
  locale,
}: {
  program: TrainingProgramListItem
  basePath: string
  businessSlug: string | null
  locale: AppLocale
}) {
  const currentPhase = getCurrentPhase(program)
  const progressPercent = getProgressPercent(program)
  const isActive = isActiveProgram(program)
  const router = useRouter()
  const { toast } = useToast()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/programs/${program.id}`, {
        method: 'DELETE',
        headers: businessSlug ? { 'x-business-slug': businessSlug } : {},
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: label(locale, 'Program raderat', 'Program deleted'),
          description: label(locale, 'Träningsprogrammet har raderats', 'The training program has been deleted'),
        })
        router.refresh()
      } else {
        throw new Error(data.error || label(locale, 'Misslyckades med att radera program', 'Failed to delete program'))
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast({
        title: label(locale, 'Fel', 'Error'),
        description: error instanceof Error
          ? error.message
          : label(locale, 'Kunde inte radera programmet', 'Could not delete the program'),
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <RolePanel className="group relative h-full transition hover:border-blue-200 hover:shadow-md dark:hover:border-blue-900/60">
      {/* Delete button - positioned at top-right, left of the active badge */}
      <div className="absolute top-3 right-20 z-20">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-slate-900/80 hover:bg-destructive hover:text-destructive-foreground shadow-sm border border-slate-200 dark:border-white/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{label(locale, 'Radera träningsprogram?', 'Delete training program?')}</AlertDialogTitle>
              <AlertDialogDescription>
                {label(
                  locale,
                  `Är du säker på att du vill radera programmet "${program.name}"? Detta kommer permanent ta bort alla veckor, dagar och pass. Denna åtgärd kan inte ångras.`,
                  `Are you sure you want to delete the program "${program.name}"? This will permanently remove all weeks, days, and sessions. This action cannot be undone.`
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{label(locale, 'Avbryt', 'Cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDeleting ? label(locale, 'Raderar...', 'Deleting...') : label(locale, 'Radera', 'Delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Link href={`${basePath}/coach/programs/${program.id}`} className="block">
        <div className="border-b border-zinc-200 p-5 dark:border-white/10">
          <div className="flex justify-between items-start mb-2">
            <h3 className="pr-12 text-lg font-semibold text-zinc-950 dark:text-zinc-50">{program.name}</h3>
            {isActive && (
              <Badge variant="default" className="bg-green-600 hover:bg-green-700">{label(locale, 'Aktiv', 'Active')}</Badge>
            )}
          </div>
          <p className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            <User className="h-4 w-4" />
            {program.client?.name || label(locale, 'Okänd klient', 'Unknown client')}
          </p>
        </div>
        <div className="p-5">
          <div className="space-y-3">
            {/* Goal Type */}
            {program.goalType && (
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="capitalize">{formatGoalType(program.goalType, locale)}</span>
              </div>
            )}

            {/* Dates */}
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(new Date(program.startDate), 'd MMM', { locale: dateFnsLocale(locale) })} -{' '}
                {format(new Date(program.endDate), 'd MMM yyyy', { locale: dateFnsLocale(locale) })}
              </span>
            </div>

            {/* Current Phase */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getPhaseBadgeClass(currentPhase)}>
                {formatPhase(currentPhase, locale)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {label(locale, 'Vecka', 'Week')} {getCurrentWeek(program)} {label(locale, 'av', 'of')} {program.weeks?.length || 0}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-secondary dark:bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </Link>
    </RolePanel>
  )
}

// Helper functions
function getCurrentPhase(program: TrainingProgramListItem): string {
  if (!program.weeks || program.weeks.length === 0) return 'BASE'
  const currentWeekNum = getCurrentWeek(program)
  const currentWeek = program.weeks.find(
    (w) => w.weekNumber === currentWeekNum
  )
  return currentWeek?.phase || 'BASE'
}

function getCurrentWeek(program: TrainingProgramListItem): number {
  const now = new Date()
  const start = new Date(program.startDate)
  const diffTime = Math.abs(now.getTime() - start.getTime())
  const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7))
  return Math.min(diffWeeks, program.weeks?.length || 1)
}

function getProgressPercent(program: TrainingProgramListItem): number {
  const current = getCurrentWeek(program)
  const total = program.weeks?.length || 1
  return Math.round((current / total) * 100)
}

function isActiveProgram(program: TrainingProgramListItem): boolean {
  const now = new Date()
  const start = new Date(program.startDate)
  const end = new Date(program.endDate)
  return now >= start && now <= end
}

function formatGoalType(goalType: string, locale: AppLocale): string {
  const types: Record<string, Record<AppLocale, string>> = {
    marathon: { en: 'Marathon', sv: 'Marathon' },
    'half-marathon': { en: 'Half marathon', sv: 'Halvmaraton' },
    '10k': { en: '10K', sv: '10K' },
    '5k': { en: '5K', sv: '5K' },
    fitness: { en: 'Fitness', sv: 'Kondition' },
    cycling: { en: 'Cycling', sv: 'Cykling' },
    skiing: { en: 'Skiing', sv: 'Skidåkning' },
    custom: { en: 'Custom', sv: 'Anpassad' },
  }
  return types[goalType]?.[locale] || goalType
}

function formatPhase(phase: string, locale: AppLocale): string {
  const phases: Record<string, Record<AppLocale, string>> = {
    BASE: { en: 'Base', sv: 'Bas' },
    BUILD: { en: 'Build', sv: 'Uppbyggnad' },
    PEAK: { en: 'Peak', sv: 'Peak' },
    TAPER: { en: 'Taper', sv: 'Taper' },
    RECOVERY: { en: 'Recovery', sv: 'Återhämtning' },
    TRANSITION: { en: 'Transition', sv: 'Övergång' },
  }
  return phases[phase]?.[locale] || phase
}

function getPhaseBadgeClass(phase: string): string {
  const classes: Record<string, string> = {
    BASE: 'border-blue-500 text-blue-700',
    BUILD: 'border-orange-500 text-orange-700',
    PEAK: 'border-red-500 text-red-700',
    TAPER: 'border-green-500 text-green-700',
    RECOVERY: 'border-purple-500 text-purple-700',
    TRANSITION: 'border-gray-500 text-gray-700',
  }
  return classes[phase] || ''
}
