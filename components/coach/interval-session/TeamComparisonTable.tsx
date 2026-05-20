'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AnalysisData } from '@/lib/interval-session/analysis-service'
import { useLocale } from '@/i18n/client'

interface TeamComparisonTableProps {
  data: AnalysisData
}

function formatSplit(ms: number | null): string {
  if (ms === null) return '-'
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const tenths = Math.floor((ms % 1000) / 100)
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`
}

export function TeamComparisonTable({ data }: TeamComparisonTableProps) {
  const isSv = useLocale() === 'sv'
  // Sort by avg split time (fastest first)
  const sorted = [...data.participants].sort((a, b) => {
    if (a.avgSplitMs === null) return 1
    if (b.avgSplitMs === null) return -1
    return a.avgSplitMs - b.avgSplitMs
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isSv ? 'Lagjämförelse' : 'Team comparison'}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>{isSv ? 'Namn' : 'Name'}</TableHead>
              <TableHead className="text-right">{isSv ? 'Varv' : 'Laps'}</TableHead>
              <TableHead className="text-right">{isSv ? 'Snitt' : 'Average'}</TableHead>
              <TableHead className="text-right">{isSv ? 'Bästa' : 'Best'}</TableHead>
              <TableHead className="text-right">{isSv ? 'Sämsta' : 'Worst'}</TableHead>
              <TableHead className="text-right">{isSv ? 'Max laktat' : 'Max lactate'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((p, i) => (
              <TableRow key={p.clientId}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    {i + 1}
                  </div>
                </TableCell>
                <TableCell className="font-medium">{p.displayName}</TableCell>
                <TableCell className="text-right">{p.splits.length}</TableCell>
                <TableCell className="text-right font-mono">
                  {formatSplit(p.avgSplitMs)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatSplit(p.bestSplitMs)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatSplit(p.worstSplitMs)}
                </TableCell>
                <TableCell className="text-right">
                  {p.maxLactate !== null ? `${p.maxLactate.toFixed(1)}` : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
