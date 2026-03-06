'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, ShieldAlert, Wrench } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type AthleteIntegrityIssueCode =
  | 'ATHLETE_MISSING_ACCOUNT'
  | 'ATHLETE_MISSING_SUBSCRIPTION'
  | 'ATHLETE_MISSING_AGENT_PREFERENCES'
  | 'ATHLETE_MISSING_SPORT_PROFILE'
  | 'ATHLETE_REDUNDANT_COACH_SUBSCRIPTION'
  | 'ATHLETE_CONFLICTING_COACH_SUBSCRIPTION'
  | 'SELF_ATHLETE_MISSING_CLIENT'
  | 'SELF_ATHLETE_MISSING_SUBSCRIPTION'
  | 'SELF_ATHLETE_MISSING_AGENT_PREFERENCES'
  | 'SELF_ATHLETE_MISSING_SPORT_PROFILE'

interface AthleteIntegrityIssue {
  id: string
  code: AthleteIntegrityIssueCode
  severity: 'warning' | 'error'
  fixable: boolean
  userId: string
  clientId: string | null
  role: string
  email: string
  message: string
}

interface AthleteIntegrityReport {
  generatedAt: string
  summary: {
    scannedUsers: number
    athleteUsers: number
    selfAthleteUsers: number
    totalIssues: number
    fixableIssues: number
    byCode: Record<string, number>
  }
  issues: AthleteIntegrityIssue[]
}

interface AthleteIntegrityRepairResult {
  generatedAt: string
  targetedIssueCount: number
  repairedCount: number
  failedCount: number
  repairs: Array<{
    key: string
    userId: string
    clientId: string
    issueCodes: AthleteIntegrityIssueCode[]
    status: 'applied' | 'failed'
    message: string
  }>
  reportAfter: AthleteIntegrityReport
}

const LIMIT = 250

function getSeverityBadgeVariant(severity: AthleteIntegrityIssue['severity']) {
  return severity === 'error' ? 'destructive' : 'secondary'
}

export function AthleteIntegrityHealthPanel() {
  const [report, setReport] = useState<AthleteIntegrityReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [repairing, setRepairing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRepairResult, setLastRepairResult] = useState<AthleteIntegrityRepairResult | null>(null)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/data-health/athlete-integrity?limit=${LIMIT}`)
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to load athlete integrity report')
      }

      setReport(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load athlete integrity report')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const handleRepair = async () => {
    setRepairing(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/data-health/athlete-integrity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: LIMIT }),
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to repair athlete integrity issues')
      }

      setLastRepairResult(result.data)
      setReport(result.data.reportAfter)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to repair athlete integrity issues')
    } finally {
      setRepairing(false)
    }
  }

  const topIssueCodes = useMemo(() => {
    if (!report) return []

    return Object.entries(report.summary.byCode)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
  }, [report])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              Athlete Integrity
            </CardTitle>
            <CardDescription>
              Audit legacy athlete provisioning gaps, missing defaults, and redundant coach subscriptions.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchReport} disabled={loading || repairing}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh audit
            </Button>
            <Button onClick={handleRepair} disabled={loading || repairing || !report || report.summary.fixableIssues === 0}>
              {repairing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wrench className="mr-2 h-4 w-4" />}
              Repair fixable issues
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {lastRepairResult && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Repaired {lastRepairResult.repairedCount} grouped records. Failed repairs: {lastRepairResult.failedCount}.
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && report && (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-2xl font-bold">{report.summary.scannedUsers}</p>
                    <p className="text-xs text-muted-foreground">Tracked users</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-2xl font-bold">{report.summary.athleteUsers}</p>
                    <p className="text-xs text-muted-foreground">Athlete users</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-2xl font-bold">{report.summary.selfAthleteUsers}</p>
                    <p className="text-xs text-muted-foreground">Self-athletes</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-2xl font-bold">{report.summary.totalIssues}</p>
                    <p className="text-xs text-muted-foreground">Open issues</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-2xl font-bold">{report.summary.fixableIssues}</p>
                    <p className="text-xs text-muted-foreground">Auto-fixable</p>
                  </CardContent>
                </Card>
              </div>

              {topIssueCodes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Most common findings</p>
                  <div className="flex flex-wrap gap-2">
                    {topIssueCodes.map(([code, count]) => (
                      <Badge key={code} variant="outline">
                        {code}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {report.summary.totalIssues === 0 ? (
                <div className="flex items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                  No athlete integrity issues detected in the current scan.
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Severity</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Auto-fix</TableHead>
                        <TableHead>Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.issues.map((issue) => (
                        <TableRow key={issue.id}>
                          <TableCell>
                            <Badge variant={getSeverityBadgeVariant(issue.severity)}>
                              {issue.severity}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{issue.code}</TableCell>
                          <TableCell className="max-w-[220px] truncate">{issue.email}</TableCell>
                          <TableCell>{issue.role}</TableCell>
                          <TableCell className="font-mono text-xs">{issue.clientId || '-'}</TableCell>
                          <TableCell>
                            {issue.fixable ? (
                              <Badge variant="outline" className="border-emerald-200 text-emerald-700">
                                Fixable
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-amber-200 text-amber-700">
                                Review
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[420px] text-sm text-muted-foreground">
                            {issue.message}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {lastRepairResult && lastRepairResult.failedCount > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-amber-700">
                    <AlertCircle className="h-4 w-4" />
                    Repair failures
                  </div>
                  <div className="space-y-2">
                    {lastRepairResult.repairs
                      .filter((repair) => repair.status === 'failed')
                      .map((repair) => (
                        <div
                          key={repair.key}
                          className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
                        >
                          <div className="font-mono text-xs">{repair.key}</div>
                          <div>{repair.message}</div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
