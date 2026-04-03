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

interface DetailedLapTableProps {
  data: AnalysisData
}

function formatSplit(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const tenths = Math.floor((ms % 1000) / 100)
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`
}

export function DetailedLapTable({ data }: DetailedLapTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alla varv</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-card z-10">Atlet</TableHead>
              {data.intervals.map((interval) => (
                <TableHead key={interval} className="text-center whitespace-nowrap">
                  Int {interval}
                </TableHead>
              ))}
              <TableHead className="text-center">Snitt</TableHead>
              <TableHead className="text-center">Bästa</TableHead>
              <TableHead className="text-center">Sämsta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.participants.map((p) => (
              <TableRow key={p.clientId}>
                <TableCell className="sticky left-0 bg-card z-10">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="font-medium whitespace-nowrap">{p.displayName}</span>
                  </div>
                </TableCell>
                {data.intervals.map((interval) => {
                  const split = p.splits.find((s) => s.interval === interval)
                  const isBest = split && p.bestSplitMs !== null && split.splitTimeMs === p.bestSplitMs
                  const isWorst = split && p.worstSplitMs !== null && split.splitTimeMs === p.worstSplitMs
                  return (
                    <TableCell
                      key={interval}
                      className={`text-center font-mono whitespace-nowrap ${
                        isBest
                          ? 'text-green-600 dark:text-green-400 font-semibold'
                          : isWorst
                            ? 'text-red-500 dark:text-red-400'
                            : ''
                      }`}
                    >
                      {split ? formatSplit(split.splitTimeMs) : '-'}
                    </TableCell>
                  )
                })}
                <TableCell className="text-center font-mono font-medium whitespace-nowrap">
                  {p.avgSplitMs !== null ? formatSplit(p.avgSplitMs) : '-'}
                </TableCell>
                <TableCell className="text-center font-mono text-green-600 dark:text-green-400 whitespace-nowrap">
                  {p.bestSplitMs !== null ? formatSplit(p.bestSplitMs) : '-'}
                </TableCell>
                <TableCell className="text-center font-mono text-red-500 dark:text-red-400 whitespace-nowrap">
                  {p.worstSplitMs !== null ? formatSplit(p.worstSplitMs) : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
