// components/programs/ProgramOverview.tsx
'use client'

import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  User,
  Calendar,
  Target,
  Activity,
  TrendingUp,
  Edit,
  Trash2,
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
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { useState, useMemo } from 'react'

import { ProgramWithWeeks } from '@/types/prisma-types'
import { AIContextButton } from '@/components/ai-studio/AIContextButton'
import { ProgramExportButton } from '@/components/coach/programs/ProgramExportButton'
import { convertDatabaseProgramToParsed } from '@/lib/exports/program-converter'

interface ProgramOverviewProps {
  program: ProgramWithWeeks
  basePath?: string
}

export function ProgramOverview({ program, basePath = '/coach' }: ProgramOverviewProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isDeleting, setIsDeleting] = useState(false)

  const currentWeek = getCurrentWeek(program)
  const totalWeeks = program.weeks?.length || 0
  const progressPercent = totalWeeks > 0 ? Math.round((currentWeek / totalWeeks) * 100) : 0
  const isActive = isActiveProgram(program)

  // Memoize parsed program for export
  const parsedProgram = useMemo(
    () => convertDatabaseProgramToParsed(program),
    [program]
  )

  async function handleDelete() {
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/programs/${program.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Misslyckades med att radera program')
      }

      toast({
        title: 'Program raderat',
        description: 'Träningsprogrammet har tagits bort',
      })
      router.push(`${basePath}/programs`)
    } catch (error: any) {
      toast({
        title: 'Något gick fel',
        description: error.message,
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
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{program.name}</h1>
            {isActive && (
              <Badge variant="default" className="text-sm bg-green-600 hover:bg-green-700">
                Aktivt
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <User className="h-4 w-4" />
            <span>{program.client?.name || 'Okänd klient'}</span>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <AIContextButton
            athleteId={program.client?.id}
            athleteName={program.client?.name}
            buttonText="AI-analys"
            quickActions={[
              {
                label: 'Analysera programmet',
                prompt: `Analysera träningsprogrammet "${program.name}" för ${program.client?.name || 'atleten'}. Det är ett ${totalWeeks}-veckors program som för närvarande är på vecka ${currentWeek}. Ge mig en översiktlig bedömning av programmets struktur och ge förslag på eventuella justeringar.`,
              },
              {
                label: 'Justera belastning',
                prompt: `Baserat på var vi är i programmet (vecka ${currentWeek} av ${totalWeeks}), behöver jag hjälp med att justera träningsbelastningen för ${program.client?.name || 'atleten'}. Vilka tecken ska jag leta efter och hur bör jag anpassa?`,
              },
              {
                label: 'Förbered nästa fas',
                prompt: `Vi är på vecka ${currentWeek} av ${totalWeeks} i programmet "${program.name}". Hjälp mig förbereda för nästa träningsfas. Vad bör jag fokusera på och vilka anpassningar kan behövas?`,
              },
              {
                label: 'Hantera avvikelser',
                prompt: `${program.client?.name || 'Atleten'} har missat några träningspass i programmet. Hur bör jag hantera detta och anpassa den återstående träningen för att fortfarande nå målet?`,
              },
            ]}
          />
          <ProgramExportButton
            program={parsedProgram}
            athleteName={program.client?.name}
            startDate={new Date(program.startDate)}
            size="sm"
          />
          <Button variant="outline" size="sm" className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <Edit className="mr-2 h-4 w-4" />
            Redigera
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={isDeleting} className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Radera
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Är du säker?</AlertDialogTitle>
                <AlertDialogDescription>
                  Detta kommer att permanent radera träningsprogrammet och alla
                  tillhörande veckor och träningspass. Denna åtgärd kan inte ångras.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                  Radera program
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
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Vecka</p>
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
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Mål</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {formatGoalType(program.goalType || '')}
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
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Startdatum</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {format(new Date(program.startDate), 'd MMM yyyy', { locale: sv })}
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
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Slutdatum</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {format(new Date(program.endDate), 'd MMM yyyy', { locale: sv })}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-slate-400 dark:text-slate-500" />
            </div>
          </GlassCardContent>
        </GlassCard>
      </div>

      {/* Program Notes */}
      {program.description && (
        <GlassCard>
          <GlassCardContent className="pt-6">
            <h3 className="font-semibold mb-2 text-slate-900 dark:text-white">Anteckningar</h3>
            <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{program.description}</p>
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Test Info */}
      {program.test && (
        <GlassCard>
          <GlassCardContent className="pt-6">
            <h3 className="font-semibold mb-3 text-slate-900 dark:text-white">Baserat på test</h3>
            <div className="flex items-center gap-6 text-sm">
              <div>
                <p className="text-slate-500 dark:text-slate-400">Testdatum</p>
                <p className="font-medium text-slate-900 dark:text-white">
                  {format(new Date(program.test.testDate), 'PPP', { locale: sv })}
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Testtyp</p>
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

function formatGoalType(goalType: string): string {
  const types: Record<string, string> = {
    marathon: 'Marathon',
    'half-marathon': 'Halvmaraton',
    '10k': '10K',
    '5k': '5K',
    fitness: 'Kondition',
    cycling: 'Cykling',
    skiing: 'Skidåkning',
    custom: 'Anpassad',
  }
  return types[goalType] || goalType
}
