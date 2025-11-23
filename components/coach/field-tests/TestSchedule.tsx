'use client'

// components/coach/field-tests/TestSchedule.tsx
/**
 * Field Test Schedule Planner
 *
 * Plan and track scheduled field tests for athletes.
 *
 * Features:
 * - Calendar view of scheduled tests (next 12 weeks)
 * - Athlete readiness check for testing
 * - Recommended test dates (every 8-12 weeks)
 * - Batch scheduling
 * - Completion tracking
 * - Overdue test alerts
 */

import React, { useState } from 'react'
import useSWR from 'swr'
import { format, addWeeks, startOfWeek, differenceInDays } from 'date-fns'
import { sv } from 'date-fns/locale'
import {
  Calendar,
  CheckCircle,
  AlertCircle,
  XCircle,
  Plus,
  Mail,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface TestScheduleProps {}

export default function TestSchedule({}: TestScheduleProps) {
  const { toast } = useToast()

  const [selectedWeeks, setSelectedWeeks] = useState<number>(12)

  // Fetch all clients
  const { data: clients } = useSWR<any[]>('/api/clients', fetcher)

  // Fetch scheduled tests
  const { data: scheduledTests, mutate } = useSWR<any[]>(
    '/api/field-tests/schedule',
    fetcher,
    { refreshInterval: 30000 }
  )

  // Fetch field test history for recommendations
  const { data: testHistory } = useSWR<any[]>('/api/field-tests', fetcher)

  const handleScheduleTest = async (clientId: string, date: Date, testType: string) => {
    try {
      const response = await fetch('/api/field-tests/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          scheduledDate: date.toISOString(),
          testType,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to schedule test')
      }

      toast({
        title: 'Test schemalagt',
        description: `${testType} schemalagt för ${format(date, 'd MMMM yyyy', { locale: sv })}`,
      })

      mutate()
    } catch (error) {
      toast({
        title: 'Fel',
        description: 'Kunde inte schemalägga test.',
        variant: 'destructive',
      })
    }
  }

  const handleSendReminder = async (scheduleId: string) => {
    try {
      const response = await fetch(`/api/field-tests/schedule/${scheduleId}/remind`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to send reminder')
      }

      toast({
        title: 'Påminnelse skickad',
        description: 'E-postpåminnelse har skickats till atleten.',
      })
    } catch (error) {
      toast({
        title: 'Fel',
        description: 'Kunde inte skicka påminnelse.',
        variant: 'destructive',
      })
    }
  }

  // Calculate test recommendations
  const recommendations = clients?.map((client) => {
    const clientTests = testHistory?.filter((t) => t.clientId === client.id) || []
    const lastTest = clientTests.sort(
      (a, b) => new Date(b.testDate).getTime() - new Date(a.testDate).getTime()
    )[0]

    let daysSinceLastTest = null
    let recommendedDate = null
    let status: 'OVERDUE' | 'DUE_SOON' | 'UPCOMING' | 'NO_TEST' = 'NO_TEST'

    if (lastTest) {
      daysSinceLastTest = differenceInDays(new Date(), new Date(lastTest.testDate))

      if (daysSinceLastTest >= 84) {
        // 12 weeks
        status = 'OVERDUE'
        recommendedDate = new Date() // Test now
      } else if (daysSinceLastTest >= 56) {
        // 8 weeks
        status = 'DUE_SOON'
        recommendedDate = new Date() // Test within next week
      } else {
        status = 'UPCOMING'
        // Recommend next test in 8-12 weeks from last test
        recommendedDate = addWeeks(new Date(lastTest.testDate), 10)
      }
    } else {
      status = 'NO_TEST'
      recommendedDate = new Date() // Do first test ASAP
    }

    // Check readiness (would need API call to get latest daily metrics)
    const readinessScore = client.latestReadinessScore || 0
    const isReady =
      readinessScore >= 75 && // Good readiness
      (client.lastHardWorkout ? differenceInDays(new Date(), new Date(client.lastHardWorkout)) >= 2 : true) // 48h since last hard workout

    return {
      client,
      lastTest,
      daysSinceLastTest,
      recommendedDate,
      status,
      readiness: {
        score: readinessScore,
        isReady,
        reason: !isReady
          ? readinessScore < 75
            ? 'Låg beredskap'
            : 'Hårt pass för nyligen'
          : 'Redo för test',
      },
    }
  })

  // Group by status
  const overdueTests = recommendations?.filter((r) => r.status === 'OVERDUE') || []
  const dueSoonTests = recommendations?.filter((r) => r.status === 'DUE_SOON') || []
  const upcomingTests = recommendations?.filter((r) => r.status === 'UPCOMING') || []
  const noTests = recommendations?.filter((r) => r.status === 'NO_TEST') || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Testschemaläggning</h2>
          <p className="text-sm text-muted-foreground">
            Planera och följ upp fälttester för alla atleter
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={selectedWeeks.toString()}
            onValueChange={(v) => setSelectedWeeks(parseInt(v))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="4">4 veckor</SelectItem>
              <SelectItem value="8">8 veckor</SelectItem>
              <SelectItem value="12">12 veckor</SelectItem>
            </SelectContent>
          </Select>

          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Schemalägg batch
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-red-600">{overdueTests.length}</div>
                <div className="text-sm text-muted-foreground">Försenade</div>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-orange-600">{dueSoonTests.length}</div>
                <div className="text-sm text-muted-foreground">Snart dags</div>
              </div>
              <Calendar className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-blue-600">{upcomingTests.length}</div>
                <div className="text-sm text-muted-foreground">Kommande</div>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{noTests.length}</div>
                <div className="text-sm text-muted-foreground">Aldrig testat</div>
              </div>
              <XCircle className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Athlete Test Status Table */}
      <Card>
        <CardHeader>
          <CardTitle>Atletstatus</CardTitle>
          <CardDescription>Testhistorik och beredskap för nästa test</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Atlet</TableHead>
                <TableHead>Senaste test</TableHead>
                <TableHead>Dagar sedan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Beredskap</TableHead>
                <TableHead>Rekommenderat datum</TableHead>
                <TableHead>Åtgärd</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recommendations?.map((rec) => (
                <TableRow key={rec.client.id}>
                  <TableCell className="font-semibold">{rec.client.name}</TableCell>
                  <TableCell>
                    {rec.lastTest
                      ? format(new Date(rec.lastTest.testDate), 'd MMM yyyy', { locale: sv })
                      : '-'}
                  </TableCell>
                  <TableCell>{rec.daysSinceLastTest || '-'} dagar</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        rec.status === 'OVERDUE'
                          ? 'destructive'
                          : rec.status === 'DUE_SOON'
                          ? 'outline'
                          : 'default'
                      }
                    >
                      {rec.status === 'OVERDUE'
                        ? 'FÖRSENAD'
                        : rec.status === 'DUE_SOON'
                        ? 'SNART DAGS'
                        : rec.status === 'UPCOMING'
                        ? 'KOMMANDE'
                        : 'INGET TEST'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {rec.readiness.isReady ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">{rec.readiness.reason}</span>
                      {rec.readiness.score > 0 && (
                        <Badge variant="outline">{rec.readiness.score}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {rec.recommendedDate
                      ? format(rec.recommendedDate, 'd MMM yyyy', { locale: sv })
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select
                        onValueChange={(testType) => {
                          if (rec.recommendedDate) {
                            handleScheduleTest(rec.client.id, rec.recommendedDate, testType)
                          }
                        }}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Schemalägg..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30_MIN_TT">30-Min TT</SelectItem>
                          <SelectItem value="CRITICAL_VELOCITY">Critical Velocity</SelectItem>
                          <SelectItem value="HR_DRIFT">HR Drift</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {!recommendations || recommendations.length === 0 && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Inga atleter ännu. Lägg till atleter för att schemalägga tester.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Scheduled Tests Calendar */}
      {scheduledTests && scheduledTests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Schemalagda tester</CardTitle>
            <CardDescription>Kommande {selectedWeeks} veckor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scheduledTests
                .filter((test) => {
                  const daysUntil = differenceInDays(
                    new Date(test.scheduledDate),
                    new Date()
                  )
                  return daysUntil <= selectedWeeks * 7 && daysUntil >= 0
                })
                .sort(
                  (a, b) =>
                    new Date(a.scheduledDate).getTime() -
                    new Date(b.scheduledDate).getTime()
                )
                .map((test) => {
                  const daysUntil = differenceInDays(
                    new Date(test.scheduledDate),
                    new Date()
                  )
                  const isCritical = daysUntil <= 7

                  return (
                    <div
                      key={test.id}
                      className={`p-4 border rounded-lg ${
                        isCritical
                          ? 'border-orange-300 bg-orange-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{test.athleteName}</div>
                          <div className="text-sm text-muted-foreground">
                            {test.testType} •{' '}
                            {format(new Date(test.scheduledDate), 'd MMMM yyyy', {
                              locale: sv,
                            })}{' '}
                            ({daysUntil} dagar)
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isCritical && (
                            <Badge variant="destructive">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              <7 dagar
                            </Badge>
                          )}

                          {test.completed && (
                            <Badge variant="default">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Genomfört
                            </Badge>
                          )}

                          {!test.completed && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendReminder(test.id)}
                            >
                              <Mail className="h-4 w-4 mr-1" />
                              Påminn
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations Alert */}
      {overdueTests.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{overdueTests.length} atleter</strong> har inte testat på över 12 veckor.
            Schemalägg tester för att hålla zoner uppdaterade.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
