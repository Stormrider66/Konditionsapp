'use client'

// components/coach/field-tests/ValidationDashboard.tsx
/**
 * Field Test Validation Dashboard
 *
 * Shows all field tests with validation issues for coach review.
 *
 * Features:
 * - Filter by test type and confidence level
 * - List of invalid tests with validation errors
 * - Approve/reject/retest actions
 * - Statistics on validation rates
 * - Recommendations for each test
 */

import React, { useState } from 'react'
import useSWR from 'swr'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Trash2 } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface ValidationDashboardProps {}

export default function ValidationDashboard({}: ValidationDashboardProps) {
  const { toast } = useToast()

  const [filterTestType, setFilterTestType] = useState<string>('ALL')
  const [filterConfidence, setFilterConfidence] = useState<string>('ALL')
  const [selectedTest, setSelectedTest] = useState<string | null>(null)
  const [coachNotes, setCoachNotes] = useState('')
  const [isActioning, setIsActioning] = useState(false)

  // Fetch all field tests
  const { data: tests, error, isLoading, mutate } = useSWR<any[]>(
    '/api/field-tests',
    fetcher,
    { refreshInterval: 30000 }
  )

  const handleApprove = async (testId: string) => {
    setIsActioning(true)
    try {
      const response = await fetch(`/api/field-tests/${testId}/validate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valid: true,
          coachNotes,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to approve test')
      }

      toast({
        title: 'Test godkänt',
        description: 'Testet har markerats som giltigt.',
      })

      setSelectedTest(null)
      setCoachNotes('')
      mutate()
    } catch (error) {
      toast({
        title: 'Fel',
        description: 'Kunde inte godkänna test.',
        variant: 'destructive',
      })
    } finally {
      setIsActioning(false)
    }
  }

  const handleReject = async (testId: string) => {
    setIsActioning(true)
    try {
      const response = await fetch(`/api/field-tests/${testId}/validate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valid: false,
          coachNotes,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to reject test')
      }

      toast({
        title: 'Test avvisat',
        description: 'Testet har markerats som ogiltigt.',
      })

      setSelectedTest(null)
      setCoachNotes('')
      mutate()
    } catch (error) {
      toast({
        title: 'Fel',
        description: 'Kunde inte avvisa test.',
        variant: 'destructive',
      })
    } finally {
      setIsActioning(false)
    }
  }

  const handleDelete = async (testId: string) => {
    if (!confirm('Är du säker på att du vill ta bort detta test?')) return

    setIsActioning(true)
    try {
      const response = await fetch(`/api/field-tests/${testId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete test')
      }

      toast({
        title: 'Test borttaget',
        description: 'Testet har tagits bort permanent.',
      })

      setSelectedTest(null)
      mutate()
    } catch (error) {
      toast({
        title: 'Fel',
        description: 'Kunde inte ta bort test.',
        variant: 'destructive',
      })
    } finally {
      setIsActioning(false)
    }
  }

  if (isLoading) {
    return <div className="text-muted-foreground">Laddar valideringsöversikt...</div>
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Kunde inte ladda fälttester.</AlertDescription>
      </Alert>
    )
  }

  // Filter tests
  const filteredTests = tests?.filter((test) => {
    if (filterTestType !== 'ALL' && test.testType !== filterTestType) return false
    if (filterConfidence !== 'ALL' && test.confidence !== filterConfidence) return false
    return true
  })

  // Calculate statistics
  const totalTests = tests?.length || 0
  const validTests = tests?.filter((t) => t.valid).length || 0
  const invalidTests = totalTests - validTests
  const validPercent = totalTests > 0 ? Math.round((validTests / totalTests) * 100) : 0

  // Common validation errors
  const errorCounts: Record<string, number> = {}
  tests?.forEach((test) => {
    test.validationErrors?.forEach((error: string) => {
      errorCounts[error] = (errorCounts[error] || 0) + 1
    })
  })
  const mostCommonErrors = Object.entries(errorCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Testvalidering</h2>
          <p className="text-sm text-muted-foreground">
            Granska fälttester med valideringsproblem
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={filterTestType} onValueChange={setFilterTestType}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Alla testtyper</SelectItem>
              <SelectItem value="30_MIN_TT">30-Min TT</SelectItem>
              <SelectItem value="CRITICAL_VELOCITY">Critical Velocity</SelectItem>
              <SelectItem value="HR_DRIFT">HR Drift</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterConfidence} onValueChange={setFilterConfidence}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Alla tillförlitligheter</SelectItem>
              <SelectItem value="VERY_HIGH">Mycket hög</SelectItem>
              <SelectItem value="HIGH">Hög</SelectItem>
              <SelectItem value="MEDIUM">Medel</SelectItem>
              <SelectItem value="LOW">Låg</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">{totalTests}</div>
            <div className="text-sm text-muted-foreground">Totalt tester</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-green-600">{validTests}</div>
                <div className="text-sm text-muted-foreground">Giltiga</div>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-red-600">{invalidTests}</div>
                <div className="text-sm text-muted-foreground">Ogiltiga</div>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">{validPercent}%</div>
            <div className="text-sm text-muted-foreground">Giltighetsprocent</div>
          </CardContent>
        </Card>
      </div>

      {/* Most Common Errors */}
      {mostCommonErrors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vanligaste valideringsfelen</CardTitle>
            <CardDescription>De 5 mest förekommande problemen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mostCommonErrors.map(([error, count]) => (
                <div
                  key={error}
                  className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
                >
                  <span className="text-sm">{error}</span>
                  <Badge variant="destructive">{count} tester</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invalid Tests List */}
      <Card>
        <CardHeader>
          <CardTitle>Tester med valideringsproblem</CardTitle>
          <CardDescription>
            {filteredTests?.filter((t) => !t.valid || t.confidence === 'LOW').length || 0} tester
            kräver granskning
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredTests
            ?.filter((test) => !test.valid || test.confidence === 'LOW')
            .map((test) => (
              <div
                key={test.id}
                className={`p-4 border-2 rounded-lg ${
                  selectedTest === test.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-lg">{test.athleteName}</div>
                    <div className="text-sm text-muted-foreground">
                      {test.testType} •{' '}
                      {format(new Date(test.testDate), 'd MMMM yyyy', { locale: sv })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        test.confidence === 'VERY_HIGH' || test.confidence === 'HIGH'
                          ? 'default'
                          : test.confidence === 'MEDIUM'
                          ? 'outline'
                          : 'destructive'
                      }
                    >
                      {test.confidence}
                    </Badge>
                    <Badge variant={test.valid ? 'default' : 'destructive'}>
                      {test.valid ? 'Giltig' : 'Ogiltig'}
                    </Badge>
                  </div>
                </div>

                {/* Validation Errors */}
                {test.validationErrors && test.validationErrors.length > 0 && (
                  <div className="mb-3">
                    <div className="text-sm font-semibold mb-1">Valideringsfel:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {test.validationErrors.map((error: string, index: number) => (
                        <li key={index} className="text-sm text-red-700">
                          {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                <Alert className="mb-3">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Rekommendation:</strong>{' '}
                    {test.confidence === 'LOW'
                      ? 'Testet har låg tillförlitlighet. Rekommenderar omtest med bättre kontrollerade förhållanden.'
                      : test.validationErrors?.length > 2
                      ? 'Flera valideringsfel upptäckta. Kontrollera testteknik och överväg omtest.'
                      : 'Granska felen och godkänn eller avvisa testet.'}
                  </AlertDescription>
                </Alert>

                {/* Coach Notes (if expanded) */}
                {selectedTest === test.id && (
                  <div className="mb-3">
                    <label className="text-sm font-semibold mb-1 block">
                      Coachanteckningar:
                    </label>
                    <Textarea
                      value={coachNotes}
                      onChange={(e) => setCoachNotes(e.target.value)}
                      placeholder="Lägg till anteckningar..."
                      rows={3}
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {selectedTest !== test.id ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTest(test.id)}
                    >
                      Granska
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleApprove(test.id)}
                        disabled={isActioning}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Godkänn
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReject(test.id)}
                        disabled={isActioning}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Avvisa
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTest(null)
                          setCoachNotes('')
                        }}
                        disabled={isActioning}
                      >
                        Avbryt
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(test.id)}
                        disabled={isActioning}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Ta bort
                      </Button>
                    </>
                  )}

                  <Button variant="ghost" size="sm" disabled>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Schemalägg omtest
                  </Button>
                </div>
              </div>
            ))}

          {filteredTests?.filter((t) => !t.valid || t.confidence === 'LOW').length === 0 && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Inga tester kräver granskning! Alla tester är giltiga med god tillförlitlighet.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
