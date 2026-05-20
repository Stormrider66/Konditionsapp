// components/programs/ProgramOverview.tsx
'use client'

import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import { useLocale } from 'next-intl'
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  User,
  Calendar,
  Target,
  TrendingUp,
  Edit,
  Trash2,
  Activity,
  Gauge,
  ShieldCheck,
} from 'lucide-react'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { useState, useMemo } from 'react'

import { ProgramWithWeeks } from '@/types/prisma-types'
import { AIContextButton } from '@/components/ai-studio/AIContextButton'
import { ProgramExportButton } from '@/components/coach/programs/ProgramExportButton'
import { convertDatabaseProgramToParsed } from '@/lib/exports/program-converter'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { ProgramInfographic } from '@/components/programs/ProgramInfographic'
import { buildTeamSportPlanningSummaryFromMetadata } from '@/lib/program-generator/team-sports/planning-metadata-summary'

interface ProgramOverviewProps {
  program: ProgramWithWeeks & { infographicUrl?: string | null; infographicModel?: string | null }
  basePath: string
}

type AppLocale = 'en' | 'sv'

const getAppLocale = (locale: string): AppLocale => (locale === 'sv' ? 'sv' : 'en')

const t = (locale: AppLocale, svText: string, enText: string) => (
  locale === 'sv' ? svText : enText
)

const dateLocale = (locale: AppLocale) => (locale === 'sv' ? sv : enUS)

export function ProgramOverview({ program, basePath }: ProgramOverviewProps) {
  const locale = getAppLocale(useLocale())
  const router = useRouter()
  const { toast } = useToast()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editName, setEditName] = useState(program.name)
  const [editDescription, setEditDescription] = useState(program.description || '')
  const [editGoalType, setEditGoalType] = useState(program.goalType || '')
  const [editStartDate, setEditStartDate] = useState(format(new Date(program.startDate), 'yyyy-MM-dd'))
  const [editEndDate, setEditEndDate] = useState(format(new Date(program.endDate), 'yyyy-MM-dd'))

  const currentWeek = getCurrentWeek(program)
  const totalWeeks = program.weeks?.length || 0
  const progressPercent = totalWeeks > 0 ? Math.round((currentWeek / totalWeeks) * 100) : 0
  const isActive = isActiveProgram(program)
  const planningSummary = useMemo(
    () => buildTeamSportPlanningSummaryFromMetadata({
      metadata: program.planningMetadata,
      locale,
    }),
    [program.planningMetadata, locale]
  )

  // Memoize parsed program for export
  const parsedProgram = useMemo(
    () => convertDatabaseProgramToParsed(program),
    [program]
  )

  async function handleSaveEdit() {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/programs/${program.id}/edit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
          goalType: editGoalType,
          startDate: editStartDate,
          endDate: editEndDate,
        }),
      })

      if (!response.ok) {
        throw new Error(t(locale, 'Misslyckades med att uppdatera program', 'Failed to update program'))
      }

      toast({
        title: t(locale, 'Program uppdaterat', 'Program updated'),
        description: t(locale, 'Ändringarna har sparats', 'Changes have been saved'),
      })
      setIsEditOpen(false)
      router.refresh()
    } catch (error: unknown) {
      toast({
        title: t(locale, 'Något gick fel', 'Something went wrong'),
        description: error instanceof Error ? error.message : t(locale, 'Försök igen senare', 'Please try again later'),
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/programs/${program.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(t(locale, 'Misslyckades med att radera program', 'Failed to delete program'))
      }

      toast({
        title: t(locale, 'Program raderat', 'Program deleted'),
        description: t(locale, 'Träningsprogrammet har tagits bort', 'The training program has been removed'),
      })
      router.push(`${basePath}/programs`)
    } catch (error: unknown) {
      toast({
        title: t(locale, 'Något gick fel', 'Something went wrong'),
        description: error instanceof Error ? error.message : t(locale, 'Försök igen senare', 'Please try again later'),
        variant: 'destructive',
      })
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{program.name} <InfoTooltip conceptKey="periodization" /></h1>
            {isActive && (
              <Badge variant="default" className="text-sm bg-green-600 hover:bg-green-700">
                {t(locale, 'Aktivt', 'Active')}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <User className="h-4 w-4" />
            <span>{program.client?.name || t(locale, 'Okänd klient', 'Unknown client')}</span>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <AIContextButton
            athleteId={program.client?.id}
            athleteName={program.client?.name}
            buttonText={t(locale, 'AI-analys', 'AI analysis')}
            quickActions={[
              {
                label: t(locale, 'Analysera programmet', 'Analyze program'),
                prompt: t(
                  locale,
                  `Analysera träningsprogrammet "${program.name}" för ${program.client?.name || 'atleten'}. Det är ett ${totalWeeks}-veckors program som för närvarande är på vecka ${currentWeek}. Ge mig en översiktlig bedömning av programmets struktur och ge förslag på eventuella justeringar.`,
                  `Analyze the training program "${program.name}" for ${program.client?.name || 'the athlete'}. It is a ${totalWeeks}-week program currently on week ${currentWeek}. Give me a high-level assessment of the program structure and suggest any adjustments.`
                ),
              },
              {
                label: t(locale, 'Justera belastning', 'Adjust load'),
                prompt: t(
                  locale,
                  `Baserat på var vi är i programmet (vecka ${currentWeek} av ${totalWeeks}), behöver jag hjälp med att justera träningsbelastningen för ${program.client?.name || 'atleten'}. Vilka tecken ska jag leta efter och hur bör jag anpassa?`,
                  `Based on where we are in the program (week ${currentWeek} of ${totalWeeks}), I need help adjusting training load for ${program.client?.name || 'the athlete'}. What signs should I look for and how should I adapt?`
                ),
              },
              {
                label: t(locale, 'Förbered nästa fas', 'Prepare next phase'),
                prompt: t(
                  locale,
                  `Vi är på vecka ${currentWeek} av ${totalWeeks} i programmet "${program.name}". Hjälp mig förbereda för nästa träningsfas. Vad bör jag fokusera på och vilka anpassningar kan behövas?`,
                  `We are on week ${currentWeek} of ${totalWeeks} in the program "${program.name}". Help me prepare for the next training phase. What should I focus on and which adaptations may be needed?`
                ),
              },
              {
                label: t(locale, 'Hantera avvikelser', 'Handle deviations'),
                prompt: t(
                  locale,
                  `${program.client?.name || 'Atleten'} har missat några träningspass i programmet. Hur bör jag hantera detta och anpassa den återstående träningen för att fortfarande nå målet?`,
                  `${program.client?.name || 'The athlete'} has missed some training sessions in the program. How should I handle this and adapt the remaining training to still reach the goal?`
                ),
              },
            ]}
          />
          <ProgramExportButton
            program={parsedProgram}
            athleteName={program.client?.name}
            startDate={new Date(program.startDate)}
            size="sm"
          />
          <Button
            variant="outline"
            size="sm"
            className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setIsEditOpen(true)}
          >
            <Edit className="mr-2 h-4 w-4" />
            {t(locale, 'Redigera', 'Edit')}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={isDeleting} className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                <Trash2 className="mr-2 h-4 w-4" />
                {t(locale, 'Radera', 'Delete')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t(locale, 'Är du säker?', 'Are you sure?')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t(
                    locale,
                    'Detta kommer att permanent radera träningsprogrammet och alla tillhörande veckor och träningspass. Denna åtgärd kan inte ångras.',
                    'This will permanently delete the training program and all associated weeks and workouts. This action cannot be undone.'
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t(locale, 'Avbryt', 'Cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                  {t(locale, 'Radera program', 'Delete program')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <GlassCard>
          <GlassCardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t(locale, 'Vecka', 'Week')}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {currentWeek} / {totalWeeks}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-slate-400 dark:text-slate-500" />
            </div>
            <div className="mt-3 w-full bg-secondary dark:bg-white/10 rounded-full h-2">
              <div
                className="bg-primary h-full rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t(locale, 'Mål', 'Goal')}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {formatGoalType(program.goalType || '', locale)}
                </p>
              </div>
              <Target className="h-8 w-8 text-slate-400 dark:text-slate-500" />
            </div>
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t(locale, 'Startdatum', 'Start date')}</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {format(new Date(program.startDate), 'd MMM yyyy', { locale: dateLocale(locale) })}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-slate-400 dark:text-slate-500" />
            </div>
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t(locale, 'Slutdatum', 'End date')}</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {format(new Date(program.endDate), 'd MMM yyyy', { locale: dateLocale(locale) })}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-slate-400 dark:text-slate-500" />
            </div>
          </GlassCardContent>
        </GlassCard>
      </div>

      {/* Infographic */}
      <ProgramInfographic
        programId={program.id}
        infographicUrl={program.infographicUrl}
        infographicModel={program.infographicModel}
      />

      {planningSummary && (
        <GlassCard>
          <GlassCardContent className="pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                  <Activity className="h-4 w-4 text-primary" />
                  {planningSummary.title}
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {planningSummary.description}
                </p>
              </div>
              <Badge variant={planningSummary.loadGuidance.length > 0 ? 'secondary' : 'outline'} className="w-fit">
                <Gauge className="mr-1 h-3.5 w-3.5" />
                {planningSummary.loadGuidance.length > 0
                  ? t(locale, 'Belastning anpassas', 'Load adjusted')
                  : t(locale, 'Normal belastning', 'Normal load')}
              </Badge>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
              {planningSummary.assumptions.map((item) => (
                <div key={item.label} className="rounded-lg border border-slate-200 bg-white/50 p-2 dark:border-slate-700 dark:bg-slate-900/40">
                  <div className="text-xs text-slate-500 dark:text-slate-400">{item.label}</div>
                  <div className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{item.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white/50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  {t(locale, 'Prioriterad prevention', 'Priority prevention')}
                </div>
                <div className="flex flex-wrap gap-1">
                  {planningSummary.prevention.map((item) => (
                    <Badge key={item} variant="outline" className="text-xs">{item}</Badge>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white/50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                  <Gauge className="h-4 w-4 text-amber-600" />
                  {t(locale, 'Belastningssignal', 'Load signal')}
                </div>
                {planningSummary.loadGuidance.length > 0 ? (
                  <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                    {planningSummary.loadGuidance.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {t(locale, 'Ingen extra reducering behövs utifrån profilen.', 'No extra reduction is needed from the profile.')}
                  </p>
                )}
              </div>
            </div>
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Program Notes */}
      {program.description && (
        <GlassCard>
          <GlassCardContent className="pt-6">
            <h3 className="font-semibold mb-2 text-slate-900 dark:text-white">{t(locale, 'Anteckningar', 'Notes')}</h3>
            <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{program.description}</p>
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t(locale, 'Redigera program', 'Edit program')}</DialogTitle>
            <DialogDescription>{t(locale, 'Ändra programmets namn, mål och beskrivning.', 'Change the program name, goal, and description.')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t(locale, 'Programnamn', 'Program name')}</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-goal">{t(locale, 'Måltyp', 'Goal type')}</Label>
              <Input
                id="edit-goal"
                value={editGoalType}
                onChange={(e) => setEditGoalType(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-start-date">{t(locale, 'Startdatum', 'Start date')}</Label>
                <Input
                  id="edit-start-date"
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end-date">{t(locale, 'Slutdatum', 'End date')}</Label>
                <Input
                  id="edit-end-date"
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">{t(locale, 'Beskrivning', 'Description')}</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>{t(locale, 'Avbryt', 'Cancel')}</Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? t(locale, 'Sparar...', 'Saving...') : t(locale, 'Spara', 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Info */}
      {program.test && (
        <GlassCard>
          <GlassCardContent className="pt-6">
            <h3 className="font-semibold mb-3 text-slate-900 dark:text-white">{t(locale, 'Baserat på test', 'Based on test')}</h3>
            <div className="flex items-center gap-6 text-sm">
              <div>
                <p className="text-slate-500 dark:text-slate-400">{t(locale, 'Testdatum', 'Test date')}</p>
                <p className="font-medium text-slate-900 dark:text-white">
                  {format(new Date(program.test.testDate), 'PPP', { locale: dateLocale(locale) })}
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">{t(locale, 'Testtyp', 'Test type')}</p>
                <p className="font-medium text-slate-900 dark:text-white">{program.test.testType}</p>
              </div>
              {program.test.vo2max && (
                <div>
                  <p className="text-slate-500 dark:text-slate-400">VO2max</p>
                  <p className="font-medium text-slate-900 dark:text-white">{program.test.vo2max.toFixed(1)} ml/kg/min</p>
                </div>
              )}
            </div>
          </GlassCardContent>
        </GlassCard>
      )}
    </div>
  )
}

// Helper functions
function getCurrentWeek(program: ProgramWithWeeks): number {
  const now = new Date()
  const start = new Date(program.startDate)
  const diffTime = Math.abs(now.getTime() - start.getTime())
  const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7))
  return Math.min(diffWeeks, program.weeks.length || 1)
}

function isActiveProgram(program: ProgramWithWeeks): boolean {
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
    swimming: { en: 'Swimming', sv: 'Simning' },
    triathlon: { en: 'Triathlon', sv: 'Triathlon' },
    hyrox: { en: 'HYROX', sv: 'HYROX' },
    custom: { en: 'Custom', sv: 'Anpassad' },
  }
  return types[goalType]?.[locale] || goalType
}
