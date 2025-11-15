// components/athlete/AthleteProgramOverview.tsx
'use client'

import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Target, TrendingUp, Activity } from 'lucide-react'

interface AthleteProgramOverviewProps {
  program: any
}

export function AthleteProgramOverview({ program }: AthleteProgramOverviewProps) {
  const currentWeek = getCurrentWeek(program)
  const totalWeeks = program.weeks?.length || 0
  const progressPercent = Math.round((currentWeek / totalWeeks) * 100)
  const isActive = isActiveProgram(program)
  const currentPhase = getCurrentPhase(program)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">{program.name}</h1>
          {isActive && (
            <Badge variant="default" className="text-sm">
              Aktivt
            </Badge>
          )}
          <Badge variant="outline" className={getPhaseBadgeClass(currentPhase)}>
            {formatPhase(currentPhase)}
          </Badge>
        </div>
        <p className="text-muted-foreground">Ditt personliga träningsprogram</p>
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
                <p className="text-lg font-semibold">
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
            <h3 className="font-semibold mb-2">Programmets syfte</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">{program.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Test Info */}
      {program.test && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3">Baserat på ditt konditionstest</h3>
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

function getCurrentPhase(program: any): string {
  if (!program.weeks || program.weeks.length === 0) return 'BASE'
  const currentWeekNum = getCurrentWeek(program)
  const currentWeek = program.weeks.find((w: any) => w.weekNumber === currentWeekNum)
  return currentWeek?.phase || 'BASE'
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

function formatPhase(phase: string): string {
  const phases: Record<string, string> = {
    BASE: 'Bas',
    BUILD: 'Uppbyggnad',
    PEAK: 'Peak',
    TAPER: 'Taper',
    RECOVERY: 'Återhämtning',
    TRANSITION: 'Övergång',
  }
  return phases[phase] || phase
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
