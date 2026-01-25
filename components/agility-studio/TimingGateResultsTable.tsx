'use client'

// components/agility-studio/TimingGateResultsTable.tsx
// Table displaying timing gate results with sorting and athlete matching

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  MoreVertical,
  Download,
  UserPlus,
  Trash2
} from 'lucide-react'
import { format } from 'date-fns'
import type { TimingGateResult } from '@/types'

interface Athlete {
  id: string
  name: string
  email?: string | null
}

interface TimingGateResultsTableProps {
  results: (TimingGateResult & {
    athlete?: { id: string; name: string } | null
  })[]
  athletes: Athlete[]
  sessionId: string
  onMatchAthlete?: (resultId: string, athleteId: string) => Promise<void>
  onToggleValidity?: (resultId: string, valid: boolean) => Promise<void>
  onDeleteResult?: (resultId: string) => Promise<void>
  onExport?: (results: TimingGateResult[]) => void
}

type SortField = 'athleteName' | 'totalTime' | 'attemptNumber' | 'valid'
type SortDirection = 'asc' | 'desc'

export function TimingGateResultsTable({
  results,
  athletes,
  sessionId,
  onMatchAthlete,
  onToggleValidity,
  onDeleteResult,
  onExport
}: TimingGateResultsTableProps) {
  const [sortField, setSortField] = useState<SortField>('totalTime')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set())
  const [isUpdating, setIsUpdating] = useState<string | null>(null)

  // Sort results
  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'athleteName':
          const aName = a.athlete?.name || 'Unassigned'
          const bName = b.athlete?.name || 'Unassigned'
          comparison = aName.localeCompare(bName)
          break
        case 'totalTime':
          comparison = a.totalTime - b.totalTime
          break
        case 'attemptNumber':
          comparison = a.attemptNumber - b.attemptNumber
          break
        case 'valid':
          comparison = (a.valid ? 1 : 0) - (b.valid ? 1 : 0)
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [results, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleMatchAthlete = async (resultId: string, athleteId: string) => {
    if (!onMatchAthlete) return
    setIsUpdating(resultId)
    try {
      await onMatchAthlete(resultId, athleteId)
    } finally {
      setIsUpdating(null)
    }
  }

  const handleToggleValidity = async (resultId: string, currentValid: boolean) => {
    if (!onToggleValidity) return
    setIsUpdating(resultId)
    try {
      await onToggleValidity(resultId, !currentValid)
    } finally {
      setIsUpdating(null)
    }
  }

  const handleDelete = async (resultId: string) => {
    if (!onDeleteResult) return
    setIsUpdating(resultId)
    try {
      await onDeleteResult(resultId)
    } finally {
      setIsUpdating(null)
    }
  }

  const toggleSelectAll = () => {
    if (selectedResults.size === results.length) {
      setSelectedResults(new Set())
    } else {
      setSelectedResults(new Set(results.map(r => r.id)))
    }
  }

  const toggleSelect = (resultId: string) => {
    const newSelected = new Set(selectedResults)
    if (newSelected.has(resultId)) {
      newSelected.delete(resultId)
    } else {
      newSelected.add(resultId)
    }
    setSelectedResults(newSelected)
  }

  const handleExportSelected = () => {
    if (!onExport) return
    const selectedResultsList = results.filter(r => selectedResults.has(r.id))
    onExport(selectedResultsList.length > 0 ? selectedResultsList : results)
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />
  }

  // Calculate split time visualization max
  const maxSplitTime = useMemo(() => {
    let max = 0
    results.forEach(r => {
      r.splitTimes.forEach(t => {
        if (t > max) max = t
      })
    })
    return max
  }, [results])

  // Get unmatched athletes (not yet assigned to any result in this session)
  const unmatchedAthletes = useMemo(() => {
    const matchedIds = new Set(results.map(r => r.athleteId).filter(Boolean))
    return athletes.filter(a => !matchedIds.has(a.id))
  }, [results, athletes])

  return (
    <div className="space-y-4">
      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {results.length} results
            {selectedResults.size > 0 && ` (${selectedResults.size} selected)`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onExport && (
            <Button variant="outline" size="sm" onClick={handleExportSelected}>
              <Download className="h-4 w-4 mr-2" />
              Export {selectedResults.size > 0 ? 'Selected' : 'All'}
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedResults.size === results.length && results.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>
                <button
                  className="flex items-center font-medium hover:text-foreground"
                  onClick={() => handleSort('athleteName')}
                >
                  Athlete
                  <SortIcon field="athleteName" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  className="flex items-center font-medium hover:text-foreground"
                  onClick={() => handleSort('attemptNumber')}
                >
                  Attempt
                  <SortIcon field="attemptNumber" />
                </button>
              </TableHead>
              <TableHead>Splits</TableHead>
              <TableHead>
                <button
                  className="flex items-center font-medium hover:text-foreground"
                  onClick={() => handleSort('totalTime')}
                >
                  Total Time
                  <SortIcon field="totalTime" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  className="flex items-center font-medium hover:text-foreground"
                  onClick={() => handleSort('valid')}
                >
                  Valid
                  <SortIcon field="valid" />
                </button>
              </TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedResults.map(result => (
              <TableRow
                key={result.id}
                className={isUpdating === result.id ? 'opacity-50' : ''}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedResults.has(result.id)}
                    onCheckedChange={() => toggleSelect(result.id)}
                  />
                </TableCell>
                <TableCell>
                  {result.athlete ? (
                    <span className="font-medium">{result.athlete.name}</span>
                  ) : (
                    <Select
                      value=""
                      onValueChange={(value) => handleMatchAthlete(result.id, value)}
                      disabled={isUpdating === result.id}
                    >
                      <SelectTrigger className="w-40">
                        <UserPlus className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-muted-foreground">Match Athlete</span>
                      </SelectTrigger>
                      <SelectContent>
                        {unmatchedAthletes.length > 0 ? (
                          unmatchedAthletes.map(athlete => (
                            <SelectItem key={athlete.id} value={athlete.id}>
                              {athlete.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="" disabled>
                            All athletes matched
                          </SelectItem>
                        )}
                        <SelectItem value="divider" disabled>
                          ─────────────
                        </SelectItem>
                        {athletes.filter(a => !unmatchedAthletes.includes(a)).map(athlete => (
                          <SelectItem key={athlete.id} value={athlete.id}>
                            {athlete.name} (reassign)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">#{result.attemptNumber}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 items-center">
                    {result.splitTimes.map((split, i) => (
                      <div key={i} className="flex flex-col items-center">
                        <div
                          className="w-8 bg-primary/20 rounded-sm"
                          style={{
                            height: `${(split / maxSplitTime) * 24}px`,
                            minHeight: '4px'
                          }}
                        />
                        <span className="text-xs text-muted-foreground mt-1">
                          {split.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-mono font-bold text-lg">
                    {result.totalTime.toFixed(2)}s
                  </span>
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => handleToggleValidity(result.id, result.valid)}
                    disabled={isUpdating === result.id || !onToggleValidity}
                    className="p-1 rounded hover:bg-muted transition-colors"
                  >
                    {result.valid ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : (
                      <X className="h-5 w-5 text-destructive" />
                    )}
                  </button>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {result.athlete && onMatchAthlete && (
                        <DropdownMenuItem
                          onClick={() => {
                            // Clear athlete assignment
                            // This would need a separate API call
                          }}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Change Athlete
                        </DropdownMenuItem>
                      )}
                      {onDeleteResult && (
                        <DropdownMenuItem
                          onClick={() => handleDelete(result.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Result
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Summary Stats */}
      {results.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Best Time</p>
            <p className="text-lg font-bold font-mono">
              {Math.min(...results.filter(r => r.valid).map(r => r.totalTime)).toFixed(2)}s
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Average Time</p>
            <p className="text-lg font-bold font-mono">
              {(
                results.filter(r => r.valid).reduce((acc, r) => acc + r.totalTime, 0) /
                results.filter(r => r.valid).length
              ).toFixed(2)}s
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Valid Results</p>
            <p className="text-lg font-bold">
              {results.filter(r => r.valid).length}/{results.length}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Matched Athletes</p>
            <p className="text-lg font-bold">
              {results.filter(r => r.athleteId).length}/{results.length}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
