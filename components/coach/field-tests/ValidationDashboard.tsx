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
import { enUS, sv } from 'date-fns/locale'
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Trash2 } from 'lucide-react'
import {
  RolePanel as Card,
  RolePanelContent as CardContent,
  RolePanelDescription as CardDescription,
  RolePanelHeader as CardHeader,
  RolePanelTitle as CardTitle,
} from '@/components/layouts/role-shell/RolePage'
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
import { useLocale } from '@/i18n/client'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

type AppLocale = 'en' | 'sv'

interface FieldTestValidationItem {
  id: string
  athleteName: string
  testType: string
  testDate: string | Date
  confidence: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | string
  valid: boolean
  validationErrors?: string[]
}

const copy = {
  en: {
    approveSuccessTitle: 'Test approved',
    approveSuccessDescription: 'The test has been marked as valid.',
    errorTitle: 'Error',
    approveFailed: 'Could not approve test.',
    rejectSuccessTitle: 'Test rejected',
    rejectSuccessDescription: 'The test has been marked as invalid.',
    rejectFailed: 'Could not reject test.',
    deleteConfirm: 'Are you sure you want to delete this test?',
    deleteSuccessTitle: 'Test deleted',
    deleteSuccessDescription: 'The test has been permanently deleted.',
    deleteFailed: 'Could not delete test.',
    loading: 'Loading validation overview...',
    loadFailed: 'Could not load field tests.',
    title: 'Test validation',
    subtitle: 'Review field tests with validation issues',
    allTestTypes: 'All test types',
    allConfidence: 'All confidence levels',
    totalTests: 'Total tests',
    valid: 'Valid',
    invalid: 'Invalid',
    validStatus: 'Valid',
    invalidStatus: 'Invalid',
    validityRate: 'Validity rate',
    commonErrorsTitle: 'Most common validation errors',
    commonErrorsDescription: 'The 5 most frequent issues',
    testsWithIssues: 'Tests with validation issues',
    requiresReview: (count: number) => `${count} tests require review`,
    testsCount: (count: number) => `${count} tests`,
    validationErrors: 'Validation errors:',
    recommendation: 'Recommendation:',
    lowConfidenceRecommendation: 'The test has low confidence. Recommend retesting under better controlled conditions.',
    manyErrorsRecommendation: 'Multiple validation errors detected. Check test technique and consider retesting.',
    defaultRecommendation: 'Review the errors and approve or reject the test.',
    coachNotes: 'Coach notes:',
    coachNotesPlaceholder: 'Add notes...',
    review: 'Review',
    approve: 'Approve',
    reject: 'Reject',
    cancel: 'Cancel',
    delete: 'Delete',
    scheduleRetest: 'Schedule retest',
    empty: 'No tests require review. All tests are valid with good confidence.',
    confidence: {
      VERY_HIGH: 'Very high',
      HIGH: 'High',
      MEDIUM: 'Medium',
      LOW: 'Low',
    },
  },
  sv: {
    approveSuccessTitle: 'Test godkänt',
    approveSuccessDescription: 'Testet har markerats som giltigt.',
    errorTitle: 'Fel',
    approveFailed: 'Kunde inte godkänna test.',
    rejectSuccessTitle: 'Test avvisat',
    rejectSuccessDescription: 'Testet har markerats som ogiltigt.',
    rejectFailed: 'Kunde inte avvisa test.',
    deleteConfirm: 'Är du säker på att du vill ta bort detta test?',
    deleteSuccessTitle: 'Test borttaget',
    deleteSuccessDescription: 'Testet har tagits bort permanent.',
    deleteFailed: 'Kunde inte ta bort test.',
    loading: 'Laddar valideringsöversikt...',
    loadFailed: 'Kunde inte ladda fälttester.',
    title: 'Testvalidering',
    subtitle: 'Granska fälttester med valideringsproblem',
    allTestTypes: 'Alla testtyper',
    allConfidence: 'Alla tillförlitligheter',
    totalTests: 'Totalt tester',
    valid: 'Giltiga',
    invalid: 'Ogiltiga',
    validStatus: 'Giltig',
    invalidStatus: 'Ogiltig',
    validityRate: 'Giltighetsprocent',
    commonErrorsTitle: 'Vanligaste valideringsfelen',
    commonErrorsDescription: 'De 5 mest förekommande problemen',
    testsWithIssues: 'Tester med valideringsproblem',
    requiresReview: (count: number) => `${count} tester kräver granskning`,
    testsCount: (count: number) => `${count} tester`,
    validationErrors: 'Valideringsfel:',
    recommendation: 'Rekommendation:',
    lowConfidenceRecommendation: 'Testet har låg tillförlitlighet. Rekommenderar omtest med bättre kontrollerade förhållanden.',
    manyErrorsRecommendation: 'Flera valideringsfel upptäckta. Kontrollera testteknik och överväg omtest.',
    defaultRecommendation: 'Granska felen och godkänn eller avvisa testet.',
    coachNotes: 'Coachanteckningar:',
    coachNotesPlaceholder: 'Lägg till anteckningar...',
    review: 'Granska',
    approve: 'Godkänn',
    reject: 'Avvisa',
    cancel: 'Avbryt',
    delete: 'Ta bort',
    scheduleRetest: 'Schemalägg omtest',
    empty: 'Inga tester kräver granskning! Alla tester är giltiga med god tillförlitlighet.',
    confidence: {
      VERY_HIGH: 'Mycket hög',
      HIGH: 'Hög',
      MEDIUM: 'Medel',
      LOW: 'Låg',
    },
  },
} satisfies Record<AppLocale, {
  approveSuccessTitle: string
  approveSuccessDescription: string
  errorTitle: string
  approveFailed: string
  rejectSuccessTitle: string
  rejectSuccessDescription: string
  rejectFailed: string
  deleteConfirm: string
  deleteSuccessTitle: string
  deleteSuccessDescription: string
  deleteFailed: string
  loading: string
  loadFailed: string
  title: string
  subtitle: string
  allTestTypes: string
  allConfidence: string
  totalTests: string
  valid: string
  invalid: string
  validStatus: string
  invalidStatus: string
  validityRate: string
  commonErrorsTitle: string
  commonErrorsDescription: string
  testsWithIssues: string
  requiresReview: (count: number) => string
  testsCount: (count: number) => string
  validationErrors: string
  recommendation: string
  lowConfidenceRecommendation: string
  manyErrorsRecommendation: string
  defaultRecommendation: string
  coachNotes: string
  coachNotesPlaceholder: string
  review: string
  approve: string
  reject: string
  cancel: string
  delete: string
  scheduleRetest: string
  empty: string
  confidence: Record<'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW', string>
}>

export default function ValidationDashboard() {
  const { toast } = useToast()
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const text = copy[locale]
  const dateLocale = locale === 'sv' ? sv : enUS
  const dateFormat = locale === 'sv' ? 'd MMMM yyyy' : 'MMMM d, yyyy'

  const [filterTestType, setFilterTestType] = useState<string>('ALL')
  const [filterConfidence, setFilterConfidence] = useState<string>('ALL')
  const [selectedTest, setSelectedTest] = useState<string | null>(null)
  const [coachNotes, setCoachNotes] = useState('')
  const [isActioning, setIsActioning] = useState(false)

  // Fetch all field tests
  const { data: tests, error, isLoading, mutate } = useSWR<FieldTestValidationItem[]>(
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
        title: text.approveSuccessTitle,
        description: text.approveSuccessDescription,
      })

      setSelectedTest(null)
      setCoachNotes('')
      void mutate()
    } catch (_error) {
      toast({
        title: text.errorTitle,
        description: text.approveFailed,
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
        title: text.rejectSuccessTitle,
        description: text.rejectSuccessDescription,
      })

      setSelectedTest(null)
      setCoachNotes('')
      void mutate()
    } catch (_error) {
      toast({
        title: text.errorTitle,
        description: text.rejectFailed,
        variant: 'destructive',
      })
    } finally {
      setIsActioning(false)
    }
  }

  const handleDelete = async (testId: string) => {
    if (!confirm(text.deleteConfirm)) return

    setIsActioning(true)
    try {
      const response = await fetch(`/api/field-tests/${testId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete test')
      }

      toast({
        title: text.deleteSuccessTitle,
        description: text.deleteSuccessDescription,
      })

      setSelectedTest(null)
      void mutate()
    } catch (_error) {
      toast({
        title: text.errorTitle,
        description: text.deleteFailed,
        variant: 'destructive',
      })
    } finally {
      setIsActioning(false)
    }
  }

  if (isLoading) {
    return <div className="text-muted-foreground">{text.loading}</div>
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{text.loadFailed}</AlertDescription>
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
          <h2 className="text-2xl font-bold">{text.title}</h2>
          <p className="text-sm text-muted-foreground">
            {text.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={filterTestType} onValueChange={setFilterTestType}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{text.allTestTypes}</SelectItem>
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
              <SelectItem value="ALL">{text.allConfidence}</SelectItem>
              <SelectItem value="VERY_HIGH">{text.confidence.VERY_HIGH}</SelectItem>
              <SelectItem value="HIGH">{text.confidence.HIGH}</SelectItem>
              <SelectItem value="MEDIUM">{text.confidence.MEDIUM}</SelectItem>
              <SelectItem value="LOW">{text.confidence.LOW}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">{totalTests}</div>
            <div className="text-sm text-muted-foreground">{text.totalTests}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-green-600">{validTests}</div>
                <div className="text-sm text-muted-foreground">{text.valid}</div>
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
                <div className="text-sm text-muted-foreground">{text.invalid}</div>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">{validPercent}%</div>
            <div className="text-sm text-muted-foreground">{text.validityRate}</div>
          </CardContent>
        </Card>
      </div>

      {/* Most Common Errors */}
      {mostCommonErrors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{text.commonErrorsTitle}</CardTitle>
            <CardDescription>{text.commonErrorsDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mostCommonErrors.map(([error, count]) => (
                <div
                  key={error}
                  className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
                >
                  <span className="text-sm">{error}</span>
                  <Badge variant="destructive">{text.testsCount(count)}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invalid Tests List */}
      <Card>
        <CardHeader>
          <CardTitle>{text.testsWithIssues}</CardTitle>
          <CardDescription>
            {text.requiresReview(filteredTests?.filter((t) => !t.valid || t.confidence === 'LOW').length || 0)}
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
                      {format(new Date(test.testDate), dateFormat, { locale: dateLocale })}
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
                      {text.confidence[test.confidence as keyof typeof text.confidence] || test.confidence}
                    </Badge>
                    <Badge variant={test.valid ? 'default' : 'destructive'}>
                      {test.valid ? text.validStatus : text.invalidStatus}
                    </Badge>
                  </div>
                </div>

                {/* Validation Errors */}
                {test.validationErrors && test.validationErrors.length > 0 && (
                  <div className="mb-3">
                    <div className="text-sm font-semibold mb-1">{text.validationErrors}</div>
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
                    <strong>{text.recommendation}</strong>{' '}
                      {test.confidence === 'LOW'
                      ? text.lowConfidenceRecommendation
                      : (test.validationErrors?.length ?? 0) > 2
                      ? text.manyErrorsRecommendation
                      : text.defaultRecommendation}
                  </AlertDescription>
                </Alert>

                {/* Coach Notes (if expanded) */}
                {selectedTest === test.id && (
                  <div className="mb-3">
                    <label className="text-sm font-semibold mb-1 block">
                      {text.coachNotes}
                    </label>
                    <Textarea
                      value={coachNotes}
                      onChange={(e) => setCoachNotes(e.target.value)}
                      placeholder={text.coachNotesPlaceholder}
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
                      {text.review}
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
                        {text.approve}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReject(test.id)}
                        disabled={isActioning}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        {text.reject}
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
                        {text.cancel}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(test.id)}
                        disabled={isActioning}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        {text.delete}
                      </Button>
                    </>
                  )}

                  <Button variant="ghost" size="sm" disabled>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    {text.scheduleRetest}
                  </Button>
                </div>
              </div>
            ))}

          {filteredTests?.filter((t) => !t.valid || t.confidence === 'LOW').length === 0 && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {text.empty}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
