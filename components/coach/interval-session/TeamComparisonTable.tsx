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
  // Sort by avg split time (fastest first)
  const sorted = [...data.participants].sort((a, b) => {
    if (a.avgSplitMs === null) return 1
    if (b.avgSplitMs === null) return -1
    return a.avgSplitMs - b.avgSplitMs
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lagjamforelse</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Namn</TableHead>
              <TableHead className="text-right">Varv</TableHead>
              <TableHead className="text-right">Snitt</TableHead>
              <TableHead className="text-right">Basta</TableHead>
              <TableHead className="text-right">Samsta</TableHead>
              <TableHead className="text-right">Max laktat</TableHead>
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
                <TableCell className="font-medium">{p.clientName}</TableCell>
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
