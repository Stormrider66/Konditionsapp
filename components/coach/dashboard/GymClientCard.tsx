'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Trophy,
  AlertTriangle,
  User,
  Dumbbell,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface GymClientStatus {
  id: string
  name: string
  primarySport: string | null
  currentPhase: string | null
  worstProgressionStatus: string | null
  plateauExercises: number
  readyForIncreaseCount: number
  topExerciseName: string | null
  topEstimated1RM: number | null
  previous1RM: number | null
  completedSessionsThisWeek: number
  totalSessionsThisWeek: number
  latestWeight: number | null
  weightDelta: number | null
  latestBodyFat: number | null
  bodyFatDelta: number | null
  injuryCount: number
  daysSinceLastActivity: number | null
  hasPRThisWeek: boolean
}

interface GymClientCardProps {
  client: GymClientStatus
  basePath: string
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getBorderColor(client: GymClientStatus): string {
  if (client.hasPRThisWeek) return 'border-l-4 border-l-yellow-500'
  if (client.worstProgressionStatus === 'REGRESSING') return 'border-l-4 border-l-red-500'
  if (client.worstProgressionStatus === 'PLATEAU' || client.worstProgressionStatus === 'DELOAD_NEEDED') {
    return 'border-l-4 border-l-amber-500'
  }
  return 'border-l-4 border-l-transparent'
}

const phaseLabels: Record<string, string> = {
  ANATOMICAL_ADAPTATION: 'Anpassning',
  MAXIMUM_STRENGTH: 'Max Styrka',
  POWER: 'Power',
  MAINTENANCE: 'Underhåll',
  TAPER: 'Taper',
}

const phaseColors: Record<string, string> = {
  ANATOMICAL_ADAPTATION: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  MAXIMUM_STRENGTH: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  POWER: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  MAINTENANCE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  TAPER: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

const statusLabels: Record<string, string> = {
  ON_TRACK: 'På spåret',
  PLATEAU: 'Platå',
  REGRESSING: 'Regression',
  DELOAD_NEEDED: 'Deload',
}

const statusColors: Record<string, string> = {
  ON_TRACK: 'text-green-600 dark:text-green-400',
  PLATEAU: 'text-amber-600 dark:text-amber-400',
  REGRESSING: 'text-red-600 dark:text-red-400',
  DELOAD_NEEDED: 'text-orange-600 dark:text-orange-400',
}

function DeltaDisplay({ value, unit, invert }: { value: number | null; unit?: string; invert?: boolean }) {
  if (value === null || value === 0) return <span className="text-[10px] text-muted-foreground">-</span>
  const isPositive = invert ? value < 0 : value > 0
  const color = isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
  const Icon = value > 0 ? ArrowUp : ArrowDown
  return (
    <span className={cn('text-[10px] font-medium flex items-center gap-0.5', color)}>
      <Icon className="h-2.5 w-2.5" />
      {value > 0 ? '+' : ''}{value}{unit}
    </span>
  )
}

export function GymClientCard({ client, basePath }: GymClientCardProps) {
  const borderColor = getBorderColor(client)
  const e1rmDelta = client.topEstimated1RM && client.previous1RM
    ? Math.round((client.topEstimated1RM - client.previous1RM) * 10) / 10
    : null

  return (
    <div className={cn(
      'rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow',
      borderColor,
    )}>
      <div className="p-4 space-y-3">
        {/* Header: Avatar + Name + Sport/Phase */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-600 dark:text-slate-300 flex-shrink-0">
            {getInitials(client.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate dark:text-slate-200">{client.name}</p>
          </div>
          <Badge variant="secondary" className="text-[10px] h-5 flex-shrink-0 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
            Styrka
          </Badge>
        </div>

        {/* Phase + Status */}
        <div className="flex items-center gap-2 text-xs">
          {client.currentPhase && (
            <>
              <span className="text-muted-foreground">Fas:</span>
              <Badge className={cn('text-[10px] h-5', phaseColors[client.currentPhase] ?? 'bg-slate-100 text-slate-600')}>
                {phaseLabels[client.currentPhase] ?? client.currentPhase}
              </Badge>
            </>
          )}
          {client.worstProgressionStatus && (
            <>
              <span className="text-muted-foreground ml-1">Status:</span>
              <span className={cn('font-medium', statusColors[client.worstProgressionStatus] ?? '')}>
                {statusLabels[client.worstProgressionStatus] ?? client.worstProgressionStatus}
              </span>
            </>
          )}
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-4 gap-2 text-center">
          {/* e1RM */}
          <div>
            <p className="text-[10px] text-muted-foreground mb-0.5">e1RM</p>
            <p className="text-xs font-semibold dark:text-slate-200">
              {client.topEstimated1RM !== null ? `${Math.round(client.topEstimated1RM)} kg` : '-'}
            </p>
            <DeltaDisplay value={e1rmDelta} unit=" kg" />
          </div>
          {/* Sessions */}
          <div>
            <p className="text-[10px] text-muted-foreground mb-0.5">Pass</p>
            <p className="text-xs font-semibold dark:text-slate-200">
              {client.completedSessionsThisWeek}/{client.totalSessionsThisWeek}
            </p>
            <span className="text-[10px] text-muted-foreground">denna v</span>
          </div>
          {/* Weight */}
          <div>
            <p className="text-[10px] text-muted-foreground mb-0.5">Vikt</p>
            <p className="text-xs font-semibold dark:text-slate-200">
              {client.latestWeight !== null ? `${client.latestWeight} kg` : '-'}
            </p>
            <DeltaDisplay value={client.weightDelta} unit="" />
          </div>
          {/* Body fat */}
          <div>
            <p className="text-[10px] text-muted-foreground mb-0.5">BF%</p>
            <p className="text-xs font-semibold dark:text-slate-200">
              {client.latestBodyFat !== null ? `${client.latestBodyFat}%` : '-'}
            </p>
            <DeltaDisplay value={client.bodyFatDelta} unit="" invert />
          </div>
        </div>

        {/* PR / Plateau badges */}
        <div className="flex flex-wrap gap-1.5">
          {client.hasPRThisWeek && (
            <Badge className="text-[10px] h-5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-0">
              <Trophy className="h-3 w-3 mr-0.5" />
              PR denna vecka
            </Badge>
          )}
          {client.plateauExercises > 0 && (
            <Badge variant="outline" className="text-[10px] h-5 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
              <AlertTriangle className="h-3 w-3 mr-0.5" />
              Platå: {client.plateauExercises} {client.plateauExercises === 1 ? 'övning' : 'övningar'}
            </Badge>
          )}
          {client.readyForIncreaseCount > 0 && (
            <Badge variant="outline" className="text-[10px] h-5 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
              <ArrowUp className="h-3 w-3 mr-0.5" />
              {client.readyForIncreaseCount} redo för ökning
            </Badge>
          )}
          {client.injuryCount > 0 && (
            <Badge variant="outline" className="text-[10px] h-5 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
              {client.injuryCount} {client.injuryCount === 1 ? 'skada' : 'skador'}
            </Badge>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 pt-1">
          <Link href={`${basePath}/coach/athletes/${client.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full text-xs h-7">
              <User className="h-3 w-3 mr-1" />
              Visa profil
            </Button>
          </Link>
          <Link href={`${basePath}/coach/strength`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full text-xs h-7 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20">
              <Dumbbell className="h-3 w-3 mr-1" />
              Tilldela pass
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
