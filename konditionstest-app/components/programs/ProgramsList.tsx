// components/programs/ProgramsList.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
  Calendar,
  User,
  Target,
  Activity,
  Search,
  Filter,
} from 'lucide-react'

interface ProgramsListProps {
  programs: any[]
}

export function ProgramsList({ programs }: ProgramsListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [goalFilter, setGoalFilter] = useState<string>('all')
  const [phaseFilter, setPhaseFilter] = useState<string>('all')

  // Filter programs
  const filteredPrograms = programs.filter((program) => {
    const matchesSearch =
      program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      program.client?.name.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesGoal =
      goalFilter === 'all' || program.goalType === goalFilter

    const currentPhase = getCurrentPhase(program)
    const matchesPhase =
      phaseFilter === 'all' || currentPhase === phaseFilter

    return matchesSearch && matchesGoal && matchesPhase
  })

  if (programs.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Activity className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Inga program än</h3>
          <p className="text-muted-foreground mb-6">
            Kom igång genom att skapa ditt första träningsprogram
          </p>
          <Link href="/coach/programs/generate">
            <Button>Skapa program</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Sök program eller atlet..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={goalFilter} onValueChange={setGoalFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filtrera mål" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla mål</SelectItem>
            <SelectItem value="marathon">Marathon</SelectItem>
            <SelectItem value="half-marathon">Halvmaraton</SelectItem>
            <SelectItem value="10k">10K</SelectItem>
            <SelectItem value="5k">5K</SelectItem>
            <SelectItem value="fitness">Kondition</SelectItem>
            <SelectItem value="cycling">Cykling</SelectItem>
            <SelectItem value="skiing">Skidåkning</SelectItem>
          </SelectContent>
        </Select>
        <Select value={phaseFilter} onValueChange={setPhaseFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filtrera fas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla faser</SelectItem>
            <SelectItem value="BASE">Bas</SelectItem>
            <SelectItem value="BUILD">Uppbyggnad</SelectItem>
            <SelectItem value="PEAK">Peak</SelectItem>
            <SelectItem value="TAPER">Taper</SelectItem>
            <SelectItem value="RECOVERY">Återhämtning</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground mb-4">
        Visar {filteredPrograms.length} av {programs.length} program
      </p>

      {/* Programs grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredPrograms.map((program) => (
          <ProgramCard key={program.id} program={program} />
        ))}
      </div>

      {filteredPrograms.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Filter className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Inga matchande program</h3>
            <p className="text-muted-foreground">
              Prova att ändra dina filterinställningar
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ProgramCard({ program }: { program: any }) {
  const currentPhase = getCurrentPhase(program)
  const progressPercent = getProgressPercent(program)
  const isActive = isActiveProgram(program)

  return (
    <Link href={`/coach/programs/${program.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        <CardHeader>
          <div className="flex justify-between items-start mb-2">
            <CardTitle className="text-lg">{program.name}</CardTitle>
            {isActive && (
              <Badge variant="default">Aktiv</Badge>
            )}
          </div>
          <CardDescription className="flex items-center gap-2">
            <User className="h-4 w-4" />
            {program.client?.name || 'Okänd klient'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Goal Type */}
            {program.goalType && (
              <div className="flex items-center gap-2 text-sm">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="capitalize">{formatGoalType(program.goalType)}</span>
              </div>
            )}

            {/* Dates */}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(new Date(program.startDate), 'd MMM', { locale: sv })} -{' '}
                {format(new Date(program.endDate), 'd MMM yyyy', { locale: sv })}
              </span>
            </div>

            {/* Current Phase */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getPhaseBadgeClass(currentPhase)}>
                {formatPhase(currentPhase)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Vecka {getCurrentWeek(program)} av {program.weeks?.length || 0}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

// Helper functions
function getCurrentPhase(program: any): string {
  if (!program.weeks || program.weeks.length === 0) return 'BASE'
  const currentWeekNum = getCurrentWeek(program)
  const currentWeek = program.weeks.find(
    (w: any) => w.weekNumber === currentWeekNum
  )
  return currentWeek?.phase || 'BASE'
}

function getCurrentWeek(program: any): number {
  const now = new Date()
  const start = new Date(program.startDate)
  const diffTime = Math.abs(now.getTime() - start.getTime())
  const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7))
  return Math.min(diffWeeks, program.weeks?.length || 1)
}

function getProgressPercent(program: any): number {
  const current = getCurrentWeek(program)
  const total = program.weeks?.length || 1
  return Math.round((current / total) * 100)
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
