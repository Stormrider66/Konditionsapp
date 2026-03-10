'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dumbbell,
  Trophy,
  AlertTriangle,
  Filter,
  ArrowUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { GymClientCard, type GymClientStatus } from '@/components/coach/dashboard/GymClientCard'

type FilterType = 'all' | 'plateau' | 'pr' | 'needs_increase'

interface GymClientBoardProps {
  clients: GymClientStatus[]
  basePath: string
}

interface AttentionChip {
  clientId: string
  label: string
  color: string
}

function buildAttentionChips(clients: GymClientStatus[]): AttentionChip[] {
  const chips: AttentionChip[] = []
  for (const c of clients) {
    if (c.hasPRThisWeek) {
      chips.push({
        clientId: c.id,
        label: `${c.name.split(' ')[0]}: PR denna vecka`,
        color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      })
    }
    if (c.plateauExercises > 0) {
      chips.push({
        clientId: c.id,
        label: `${c.name.split(' ')[0]}: Platå ${c.plateauExercises} övn`,
        color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      })
    }
    if (c.worstProgressionStatus === 'REGRESSING') {
      chips.push({
        clientId: c.id,
        label: `${c.name.split(' ')[0]}: Regression`,
        color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      })
    }
  }
  return chips
}

function urgencyScore(c: GymClientStatus): number {
  let score = 0
  if (c.worstProgressionStatus === 'REGRESSING') score += 4
  if (c.worstProgressionStatus === 'DELOAD_NEEDED') score += 3
  if (c.worstProgressionStatus === 'PLATEAU') score += 2
  if (c.plateauExercises > 0) score += c.plateauExercises
  if (c.hasPRThisWeek) score += 1
  if (c.injuryCount > 0) score += 2
  return score
}

export function GymClientBoard({ clients, basePath }: GymClientBoardProps) {
  const [filter, setFilter] = useState<FilterType>('all')

  const filtered = useMemo(() => {
    let result = [...clients]

    switch (filter) {
      case 'plateau':
        result = result.filter(c => c.plateauExercises > 0 || c.worstProgressionStatus === 'PLATEAU' || c.worstProgressionStatus === 'DELOAD_NEEDED')
        break
      case 'pr':
        result = result.filter(c => c.hasPRThisWeek)
        break
      case 'needs_increase':
        result = result.filter(c => c.readyForIncreaseCount > 0)
        break
    }

    result.sort((a, b) => {
      const scoreA = urgencyScore(a)
      const scoreB = urgencyScore(b)
      if (scoreA !== scoreB) return scoreB - scoreA
      return a.name.localeCompare(b.name, 'sv')
    })

    return result
  }, [clients, filter])

  const attentionChips = useMemo(() => buildAttentionChips(clients), [clients])

  const filterCounts = useMemo(() => ({
    plateau: clients.filter(c => c.plateauExercises > 0 || c.worstProgressionStatus === 'PLATEAU' || c.worstProgressionStatus === 'DELOAD_NEEDED').length,
    pr: clients.filter(c => c.hasPRThisWeek).length,
    needs_increase: clients.filter(c => c.readyForIncreaseCount > 0).length,
  }), [clients])

  if (clients.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Dumbbell className="h-10 w-10 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Inga klienter</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 mb-6">
      {/* Attention strip */}
      {attentionChips.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {attentionChips.slice(0, 6).map((chip, i) => (
            <Badge
              key={`${chip.clientId}-${i}`}
              className={cn('text-[11px] whitespace-nowrap cursor-default', chip.color)}
            >
              {chip.label}
            </Badge>
          ))}
          {attentionChips.length > 6 && (
            <Badge variant="secondary" className="text-[11px] whitespace-nowrap">
              +{attentionChips.length - 6} fler
            </Badge>
          )}
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold dark:text-slate-200 flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-purple-500" />
            Klienter
            <Badge variant="secondary" className="text-xs">{clients.length}</Badge>
          </h3>
        </div>
        <div className="flex gap-1 flex-wrap">
          <Button
            variant={filter === 'all' ? 'default' : 'ghost'}
            size="sm"
            className="text-xs h-7"
            onClick={() => setFilter('all')}
          >
            Alla
          </Button>
          <Button
            variant={filter === 'plateau' ? 'default' : 'ghost'}
            size="sm"
            className="text-xs h-7"
            onClick={() => setFilter('plateau')}
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            Platå
            {filterCounts.plateau > 0 && (
              <Badge variant="outline" className="ml-1 text-[10px] h-4 px-1">
                {filterCounts.plateau}
              </Badge>
            )}
          </Button>
          <Button
            variant={filter === 'pr' ? 'default' : 'ghost'}
            size="sm"
            className="text-xs h-7"
            onClick={() => setFilter('pr')}
          >
            <Trophy className="h-3 w-3 mr-1" />
            PR denna vecka
            {filterCounts.pr > 0 && (
              <Badge variant="outline" className="ml-1 text-[10px] h-4 px-1">
                {filterCounts.pr}
              </Badge>
            )}
          </Button>
          <Button
            variant={filter === 'needs_increase' ? 'default' : 'ghost'}
            size="sm"
            className="text-xs h-7"
            onClick={() => setFilter('needs_increase')}
          >
            <ArrowUp className="h-3 w-3 mr-1" />
            Behöver lastökning
            {filterCounts.needs_increase > 0 && (
              <Badge variant="outline" className="ml-1 text-[10px] h-4 px-1">
                {filterCounts.needs_increase}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Client card grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Inga klienter matchar filtret</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(client => (
            <GymClientCard key={client.id} client={client} basePath={basePath} />
          ))}
        </div>
      )}
    </div>
  )
}
