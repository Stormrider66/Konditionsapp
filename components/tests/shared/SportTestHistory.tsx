'use client'

/**
 * Sport Test History Component
 *
 * Displays test history for a specific sport with:
 * - Recent test results
 * - Progress comparison
 * - Benchmark achievement indicators
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Activity, TrendingUp, TrendingDown, Minus, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface SportTest {
  id: string
  testDate: string
  protocol: string
  primaryResult: number | null
  primaryUnit: string | null
  secondaryResult?: number | null
  secondaryUnit?: string | null
  benchmarkTier?: string | null
  rawData?: Record<string, unknown>
}

interface SportTestHistoryProps {
  clientId: string
  sport: string
  title?: string
  limit?: number
  showExpandButton?: boolean
  protocolLabels?: Record<string, string>
  benchmarks?: Record<string, { value: number; lowerIsBetter?: boolean }>
}

const DEFAULT_PROTOCOL_LABELS: Record<string, string> = {
  YOYO_IR1: 'Yo-Yo IR1',
  YOYO_IR2: 'Yo-Yo IR2',
  SPRINT_5M: '5m Sprint',
  SPRINT_10M: '10m Sprint',
  SPRINT_20M: '20m Sprint',
  SPRINT_30M: '30m Sprint',
  SPRINT_40M: '40m Sprint',
  VERTICAL_JUMP_CMJ: 'CMJ',
  VERTICAL_JUMP_SJ: 'SJ',
  VERTICAL_JUMP_DJ: 'DJ',
  STANDING_LONG_JUMP: 'Längdhopp',
  MEDICINE_BALL_THROW: 'Medicinboll',
  T_TEST: 'T-Test',
  ILLINOIS_AGILITY: 'Illinois',
  PRO_AGILITY_5_10_5: '5-10-5',
  LANE_AGILITY: 'Lane Agility',
  SERVE_SPEED: 'Serve hastighet',
  RSA_6X30M: 'RSA 6x30m',
  SPIKE_JUMP: 'Spike Jump',
}

const TIER_COLORS: Record<string, string> = {
  WORLD_CLASS: 'bg-purple-500',
  ELITE: 'bg-blue-500',
  ADVANCED: 'bg-green-500',
  INTERMEDIATE: 'bg-yellow-500',
  BEGINNER: 'bg-gray-500',
}

const TIER_LABELS: Record<string, string> = {
  WORLD_CLASS: 'Världsklass',
  ELITE: 'Elit',
  ADVANCED: 'Avancerad',
  INTERMEDIATE: 'Medel',
  BEGINNER: 'Nybörjare',
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getProgressIndicator(current: number, previous: number, lowerIsBetter = false) {
  const diff = current - previous
  const percentChange = Math.abs((diff / previous) * 100).toFixed(1)

  if (Math.abs(diff) < 0.01) {
    return { icon: Minus, color: 'text-gray-400', label: '0%' }
  }

  const isImprovement = lowerIsBetter ? diff < 0 : diff > 0

  if (isImprovement) {
    return { icon: TrendingUp, color: 'text-green-500', label: `+${percentChange}%` }
  } else {
    return { icon: TrendingDown, color: 'text-red-500', label: `-${percentChange}%` }
  }
}

export function SportTestHistory({
  clientId,
  sport,
  title = 'Testhistorik',
  limit = 5,
  showExpandButton = true,
  protocolLabels = {},
  benchmarks = {},
}: SportTestHistoryProps) {
  const [tests, setTests] = useState<SportTest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const displayLimit = expanded ? 20 : limit
  const mergedLabels = { ...DEFAULT_PROTOCOL_LABELS, ...protocolLabels }

  useEffect(() => {
    async function fetchTests() {
      try {
        setLoading(true)
        const response = await fetch(
          `/api/sport-tests?clientId=${clientId}&sport=${sport}&limit=${displayLimit}`
        )
        if (!response.ok) {
          throw new Error('Failed to fetch tests')
        }
        const data = await response.json()
        setTests(data.data || [])
      } catch (err) {
        console.error('Failed to fetch sport tests:', err)
        setError('Kunde inte hämta testhistorik')
      } finally {
        setLoading(false)
      }
    }

    fetchTests()
  }, [clientId, sport, displayLimit])

  // Group tests by protocol for progress comparison
  const testsByProtocol = tests.reduce(
    (acc, test) => {
      if (!acc[test.protocol]) {
        acc[test.protocol] = []
      }
      acc[test.protocol].push(test)
      return acc
    },
    {} as Record<string, SportTest[]>
  )

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (tests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>Inga tester registrerade än</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Registrera tester under Tester-fliken för att se historik här.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>
          {tests.length} senaste test{tests.length !== 1 ? 'en' : 'et'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Test</TableHead>
                <TableHead className="text-right">Resultat</TableHead>
                <TableHead className="text-center">Förändring</TableHead>
                <TableHead className="text-center">Nivå</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests.map((test) => {
                const protocolTests = testsByProtocol[test.protocol]
                const currentIndex = protocolTests.findIndex((t) => t.id === test.id)
                const previousTest = protocolTests[currentIndex + 1]

                let progress = null
                if (previousTest && test.primaryResult && previousTest.primaryResult) {
                  const benchmark = benchmarks[test.protocol]
                  progress = getProgressIndicator(
                    test.primaryResult,
                    previousTest.primaryResult,
                    benchmark?.lowerIsBetter
                  )
                }

                return (
                  <TableRow key={test.id}>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {formatDate(test.testDate)}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {mergedLabels[test.protocol] || test.protocol}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {test.primaryResult?.toFixed(test.primaryUnit === 's' ? 2 : 1)}
                      {test.primaryUnit && (
                        <span className="text-muted-foreground text-xs ml-1">
                          {test.primaryUnit}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {progress ? (
                        <div className={`flex items-center justify-center gap-1 ${progress.color}`}>
                          <progress.icon className="h-4 w-4" />
                          <span className="text-xs">{progress.label}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {test.benchmarkTier ? (
                        <Badge className={`${TIER_COLORS[test.benchmarkTier]} text-white text-xs`}>
                          {TIER_LABELS[test.benchmarkTier] || test.benchmarkTier}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {showExpandButton && tests.length >= limit && (
          <div className="mt-4 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="gap-1"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Visa mindre
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Visa fler
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
