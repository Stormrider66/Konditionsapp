import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, FileText } from 'lucide-react'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getCoachScopedIds } from '@/lib/coach/scoping'
import { getTestReviewQueue } from '@/lib/testing/test-review-queue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface TestReviewQueuePageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function TestReviewQueuePage({ params }: TestReviewQueuePageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()
  const membership = await validateBusinessMembership(user.id, businessSlug)

  if (!membership) {
    notFound()
  }

  const coachIds = await getCoachScopedIds(user.id, membership.businessId, membership.role)
  const queue = await getTestReviewQueue({
    businessId: membership.businessId,
    coachIds,
  })
  const highRiskCount = queue.filter(item => item.hasSevereWarning).length
  const athleteCount = new Set(queue.map(item => item.clientId)).size
  const basePath = `/${businessSlug}`

  return (
    <main className="container mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Link href={`${basePath}/coach/dashboard`}>
            <Button variant="outline" size="sm" className="mb-4 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                Test review queue
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Flagged tests awaiting coach approval.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <QueueMetric label="Pending" value={queue.length} tone="watch" />
          <QueueMetric label="High risk" value={highRiskCount} tone="risk" />
          <QueueMetric label="Athletes" value={athleteCount} tone="neutral" />
        </div>
      </div>

      {queue.length === 0 ? (
        <Card className="rounded-lg border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-100">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <CheckCircle2 className="h-10 w-10" />
            <div>
              <p className="text-base font-semibold">No tests need review.</p>
              <p className="mt-1 text-sm">The current testing queue is clear.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden rounded-lg">
          <CardHeader className="border-b bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
            <CardTitle className="text-sm font-semibold">Pending test reviews</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {queue.map(item => (
                <div
                  key={item.id}
                  className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                        {item.clientName}
                      </h2>
                      <Badge variant="outline">{item.testType}</Badge>
                      <Badge
                        className={cn(
                          'border-0 text-[10px]',
                          item.hasSevereWarning
                            ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-200'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-200',
                        )}
                      >
                        {item.hasSevereWarning ? 'High risk' : 'Review'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {format(item.testDate, 'MMM d, yyyy')} · {item.warningCount}{' '}
                      {item.warningCount === 1 ? 'warning' : 'warnings'}
                    </p>
                    <div className="mt-3 space-y-1.5">
                      {item.warnings.slice(0, 2).map((warning, index) => (
                        <p
                          key={`${item.id}-${warning.type}-${index}`}
                          className="flex gap-2 text-sm text-slate-700 dark:text-slate-300"
                        >
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                          <span>{warning.message}</span>
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-md bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900/60">
                    <p className="text-xs font-medium uppercase text-muted-foreground">Previous cleared test</p>
                    {item.previousTest ? (
                      <div className="mt-1 space-y-1">
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {format(item.previousTest.testDate, 'MMM d, yyyy')} · {item.previousTest.testType}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {[item.previousTest.vo2max ? `VO2 ${item.previousTest.vo2max.toFixed(1)}` : null,
                            item.previousTest.maxHR ? `Max HR ${item.previousTest.maxHR}` : null]
                            .filter(Boolean)
                            .join(' · ') || 'No summary values'}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-1 text-muted-foreground">None found</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Link href={`${basePath}/coach/tests/${item.id}#quality-review`}>
                      <Button size="sm" className="gap-2">
                        Review
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`${basePath}/coach/clients/${item.clientId}`}>
                      <Button size="sm" variant="outline">
                        Athlete
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  )
}

function QueueMetric({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'watch' | 'risk' | 'neutral'
}) {
  const className = {
    risk: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200',
    watch: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200',
    neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200',
  }[tone]

  return (
    <div className={cn('min-w-[82px] rounded-lg px-3 py-2', className)}>
      <div className="text-lg font-bold leading-none">{value}</div>
      <div className="mt-1 text-[11px] font-medium">{label}</div>
    </div>
  )
}
