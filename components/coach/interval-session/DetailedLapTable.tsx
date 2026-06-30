'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  RolePanel as Card,
  RolePanelContent as CardContent,
  RolePanelHeader as CardHeader,
  RolePanelTitle as CardTitle,
} from '@/components/layouts/role-shell/RolePage'
import type { AnalysisData } from '@/lib/interval-session/analysis-service'
import { useLocale } from '@/i18n/client'

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
  const isSv = useLocale() === 'sv'

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isSv ? 'Alla varv' : 'All laps'}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-card z-10">{isSv ? 'Atlet' : 'Athlete'}</TableHead>
              {data.intervals.map((interval) => (
                <TableHead key={interval} className="text-center whitespace-nowrap">
                  Int {interval}
                </TableHead>
              ))}
              <TableHead className="text-center">{isSv ? 'Snitt' : 'Average'}</TableHead>
              <TableHead className="text-center">{isSv ? 'Bästa' : 'Best'}</TableHead>
              <TableHead className="text-center">{isSv ? 'Sämsta' : 'Worst'}</TableHead>
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
                          ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
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
                <TableCell className="text-center font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
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
