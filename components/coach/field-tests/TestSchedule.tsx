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
import { format, addWeeks, differenceInDays } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
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
import { useLocale } from '@/i18n/client'

const fetcher = (url: string) => fetch(url).then((res) => res.json())
type AppLocale = 'en' | 'sv'

function text(locale: AppLocale, svText: string, enText: string): string {
  return locale === 'sv' ? svText : enText
}

function dateFnsLocale(locale: AppLocale) {
  return locale === 'sv' ? sv : enUS
}

function formatDays(locale: AppLocale, days: number): string {
  return text(locale, `${days} dagar`, `${days} days`)
}

function statusLabel(locale: AppLocale, status: 'OVERDUE' | 'DUE_SOON' | 'UPCOMING' | 'NO_TEST') {
  const labels = {
    OVERDUE: { sv: 'FÖRSENAD', en: 'OVERDUE' },
    DUE_SOON: { sv: 'SNART DAGS', en: 'DUE SOON' },
    UPCOMING: { sv: 'KOMMANDE', en: 'UPCOMING' },
    NO_TEST: { sv: 'INGET TEST', en: 'NO TEST' },
  }
  return labels[status][locale]
}

interface TestScheduleProps {
  highlightedClientId?: string
  sourceLabel?: string
}

interface ScheduleClient {
  id: string
  name: string
  latestReadinessScore?: number
  lastHardWorkout?: string | Date | null
}

interface ScheduledFieldTest {
  id: string
  scheduledDate: string
  testType: string
  athleteName: string
  completed?: boolean
}

interface FieldTestHistoryItem {
  clientId: string
  testDate: string
}

export default function TestSchedule({ highlightedClientId, sourceLabel }: TestScheduleProps) {
  const { toast } = useToast()
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const appDateLocale = dateFnsLocale(locale)

  const [selectedWeeks, setSelectedWeeks] = useState<number>(12)

  // Fetch all clients
  const { data: clientsResponse } = useSWR<{ success: boolean; data: ScheduleClient[] }>('/api/clients', fetcher)
  const clients = clientsResponse?.data || []

  // Fetch scheduled tests
  const { data: scheduledTests, mutate } = useSWR<ScheduledFieldTest[]>(
    '/api/field-tests/schedule',
    fetcher,
    { refreshInterval: 30000 }
  )

  // Fetch field test history for recommendations
  const { data: testHistory } = useSWR<FieldTestHistoryItem[]>('/api/field-tests', fetcher)

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
        title: text(locale, 'Test schemalagt', 'Test scheduled'),
        description: text(
          locale,
          `${testType} schemalagt för ${format(date, 'd MMMM yyyy', { locale: appDateLocale })}`,
          `${testType} scheduled for ${format(date, 'MMMM d, yyyy', { locale: appDateLocale })}`,
        ),
      })

      void mutate()
    } catch (_error) {
      toast({
        title: text(locale, 'Fel', 'Error'),
        description: text(locale, 'Kunde inte schemalägga test.', 'Could not schedule test.'),
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
        title: text(locale, 'Påminnelse skickad', 'Reminder sent'),
        description: text(locale, 'E-postpåminnelse har skickats till atleten.', 'The email reminder has been sent to the athlete.'),
      })
    } catch (_error) {
      toast({
        title: text(locale, 'Fel', 'Error'),
        description: text(locale, 'Kunde inte skicka påminnelse.', 'Could not send reminder.'),
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
              ? text(locale, 'Låg beredskap', 'Low readiness')
              : text(locale, 'Hårt pass för nyligen', 'Hard session too recently')
          : text(locale, 'Redo för test', 'Ready for test'),
      },
    }
  })

  // Group by status
  const overdueTests = recommendations?.filter((r) => r.status === 'OVERDUE') || []
  const dueSoonTests = recommendations?.filter((r) => r.status === 'DUE_SOON') || []
  const upcomingTests = recommendations?.filter((r) => r.status === 'UPCOMING') || []
  const noTests = recommendations?.filter((r) => r.status === 'NO_TEST') || []
  const highlightedRecommendation = highlightedClientId
    ? recommendations?.find((recommendation) => recommendation.client.id === highlightedClientId)
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">{text(locale, 'Testschemaläggning', 'Test scheduling')}</h2>
          <p className="text-sm text-muted-foreground">
            {text(locale, 'Planera och följ upp fälttester för alla atleter', 'Plan and follow up field tests for all athletes')}
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
              <SelectItem value="4">{text(locale, '4 veckor', '4 weeks')}</SelectItem>
              <SelectItem value="8">{text(locale, '8 veckor', '8 weeks')}</SelectItem>
              <SelectItem value="12">{text(locale, '12 veckor', '12 weeks')}</SelectItem>
            </SelectContent>
          </Select>

          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {text(locale, 'Schemalägg batch', 'Schedule batch')}
          </Button>
        </div>
      </div>

      {highlightedClientId && (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-700" />
          <AlertDescription className="text-blue-950">
            {highlightedRecommendation
              ? (
                  <>
                    {text(locale, 'Öppnat från AI Canvas för', 'Opened from AI Canvas for')} <strong>{highlightedRecommendation.client.name}</strong>
                    {sourceLabel ? `: ${sourceLabel}` : ''}. {text(locale, 'Välj testtyp i atletens rad för att schemalägga.', 'Choose a test type in the athlete row to schedule.')}
                  </>
                )
              : text(locale, 'Öppnat från AI Canvas. Atleten kunde inte matchas i listan just nu.', 'Opened from AI Canvas. The athlete could not be matched in the list right now.')}
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-red-600">{overdueTests.length}</div>
                <div className="text-sm text-muted-foreground">{text(locale, 'Försenade', 'Overdue')}</div>
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
                <div className="text-sm text-muted-foreground">{text(locale, 'Snart dags', 'Due soon')}</div>
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
                <div className="text-sm text-muted-foreground">{text(locale, 'Kommande', 'Upcoming')}</div>
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
                <div className="text-sm text-muted-foreground">{text(locale, 'Aldrig testat', 'Never tested')}</div>
              </div>
              <XCircle className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Athlete Test Status Table */}
      <Card>
        <CardHeader>
          <CardTitle>{text(locale, 'Atletstatus', 'Athlete status')}</CardTitle>
          <CardDescription>{text(locale, 'Testhistorik och beredskap för nästa test', 'Test history and readiness for the next test')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{text(locale, 'Atlet', 'Athlete')}</TableHead>
                <TableHead>{text(locale, 'Senaste test', 'Latest test')}</TableHead>
                <TableHead>{text(locale, 'Dagar sedan', 'Days since')}</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>{text(locale, 'Beredskap', 'Readiness')}</TableHead>
                <TableHead>{text(locale, 'Rekommenderat datum', 'Recommended date')}</TableHead>
                <TableHead>{text(locale, 'Åtgärd', 'Action')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recommendations?.map((rec) => (
                <TableRow
                  key={rec.client.id}
                  className={rec.client.id === highlightedClientId ? 'bg-blue-50/70' : undefined}
                >
                  <TableCell className="font-semibold">{rec.client.name}</TableCell>
                  <TableCell>
                    {rec.lastTest
                      ? format(new Date(rec.lastTest.testDate), locale === 'sv' ? 'd MMM yyyy' : 'MMM d, yyyy', { locale: appDateLocale })
                      : '-'}
                  </TableCell>
                  <TableCell>{rec.daysSinceLastTest ? formatDays(locale, rec.daysSinceLastTest) : '-'}</TableCell>
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
                      {statusLabel(locale, rec.status)}
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
                      ? format(rec.recommendedDate, locale === 'sv' ? 'd MMM yyyy' : 'MMM d, yyyy', { locale: appDateLocale })
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select
                        onValueChange={(testType) => {
                          if (rec.recommendedDate) {
                            void handleScheduleTest(rec.client.id, rec.recommendedDate, testType)
                          }
                        }}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder={text(locale, 'Schemalägg...', 'Schedule...')} />
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
              <AlertDescription>{text(locale, 'Inga atleter ännu. Lägg till atleter för att schemalägga tester.', 'No athletes yet. Add athletes to schedule tests.')}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Scheduled Tests Calendar */}
      {scheduledTests && scheduledTests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{text(locale, 'Schemalagda tester', 'Scheduled tests')}</CardTitle>
            <CardDescription>{text(locale, `Kommande ${selectedWeeks} veckor`, `Next ${selectedWeeks} weeks`)}</CardDescription>
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
                            {format(new Date(test.scheduledDate), locale === 'sv' ? 'd MMMM yyyy' : 'MMMM d, yyyy', {
                              locale: appDateLocale,
                            })}{' '}
                            ({formatDays(locale, daysUntil)})
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isCritical && (
                            <Badge variant="destructive">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              {text(locale, '<7 dagar', '<7 days')}
                            </Badge>
                          )}

                          {test.completed && (
                            <Badge variant="default">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {text(locale, 'Genomfört', 'Completed')}
                            </Badge>
                          )}

                          {!test.completed && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendReminder(test.id)}
                            >
                              <Mail className="h-4 w-4 mr-1" />
                              {text(locale, 'Påminn', 'Remind')}
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
            <strong>{text(locale, `${overdueTests.length} atleter`, `${overdueTests.length} ${overdueTests.length === 1 ? 'athlete' : 'athletes'}`)}</strong>
            {text(
              locale,
              ` har inte testat på över 12 veckor. Schemalägg tester för att hålla zoner uppdaterade.`,
              ` ${overdueTests.length === 1 ? 'athlete has' : 'athletes have'} not tested in over 12 weeks. Schedule tests to keep zones up to date.`,
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
