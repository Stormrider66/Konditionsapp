// components/programs/ProgramOverview.tsx
'use client'

import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
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
  Download,
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
import { toast } from 'sonner'
import { useState } from 'react'

interface ProgramOverviewProps {
  program: any
}

export function ProgramOverview({ program }: ProgramOverviewProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const currentWeek = getCurrentWeek(program)
  const totalWeeks = program.weeks?.length || 0
  const progressPercent = Math.round((currentWeek / totalWeeks) * 100)
  const isActive = isActiveProgram(program)

  async function handleDelete() {
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/programs/${program.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Misslyckades med att radera program')
      }

      toast.success('Program raderat')
      router.push('/coach/programs')
    } catch (error: any) {
      toast.error('Något gick fel', {
        description: error.message,
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
            <h1 className="text-3xl font-bold">{program.name}</h1>
            {isActive && (
              <Badge variant="default" className="text-sm">
                Aktivt
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{program.client?.name}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Exportera
          </Button>
          <Button variant="outline" size="sm">
            <Edit className="mr-2 h-4 w-4" />
            Redigera
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={isDeleting}>
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
                <AlertDialogAction onClick={handleDelete}>
                  Radera program
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vecka</p>
                <p className="text-2xl font-bold">
                  {currentWeek} / {totalWeeks}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="mt-3 w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-full rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Mål</p>
                <p className="text-2xl font-bold">
                  {formatGoalType(program.goalType)}
                </p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Startdatum</p>
                <p className="text-lg font-semibold">
                  {format(new Date(program.startDate), 'd MMM yyyy', { locale: sv })}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Slutdatum</p>
                <p className="text-lg font-semibold">
                  {format(new Date(program.endDate), 'd MMM yyyy', { locale: sv })}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Program Notes */}
      {program.notes && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">Anteckningar</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">{program.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Test Info */}
      {program.test && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3">Baserat på test</h3>
            <div className="flex items-center gap-6 text-sm">
              <div>
                <p className="text-muted-foreground">Testdatum</p>
                <p className="font-medium">
                  {format(new Date(program.test.testDate), 'PPP', { locale: sv })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Testtyp</p>
                <p className="font-medium">{program.test.testType}</p>
              </div>
              {program.test.vo2max && (
                <div>
                  <p className="text-muted-foreground">VO2max</p>
                  <p className="font-medium">{program.test.vo2max.toFixed(1)} ml/kg/min</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Helper functions
function getCurrentWeek(program: any): number {
  const now = new Date()
  const start = new Date(program.startDate)
  const diffTime = Math.abs(now.getTime() - start.getTime())
  const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7))
  return Math.min(diffWeeks, program.weeks?.length || 1)
}

function isActiveProgram(program: any): boolean {
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
