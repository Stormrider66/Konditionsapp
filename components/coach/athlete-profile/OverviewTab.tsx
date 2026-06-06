'use client'

import type { Dispatch, SetStateAction } from 'react'
import Link from 'next/link'
import { Edit2, CheckCircle2, CircleAlert, UserPlus } from 'lucide-react'
import { useTranslations } from '@/i18n/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AIContextButton } from '@/components/ai-studio/AIContextButton'
import { ClientLoadSummary } from '@/components/coach/clients/ClientLoadSummary'
import { ClientFuelingSummary } from '@/components/coach/clients/ClientFuelingSummary'
import { RecentTestsCard } from '@/components/coach/clients/RecentTestsCard'
import { CreateAthletePlanDialog } from '@/components/coach/clients/CreateAthletePlanDialog'
import { ReadinessDashboard } from '@/components/athlete/ReadinessDashboard'
import { VisualReportCard } from '@/components/visual-reports/VisualReportCard'
import { VBTProgressionWidget } from '@/components/athlete/VBTProgressionWidget'
import { Concept2SummaryWidget } from '@/components/athlete/Concept2SummaryWidget'
import { CreateAthleteAccountDialog } from '@/components/client/CreateAthleteAccountDialog'
import { AthletePlanSummary } from '@/components/athlete-plans/AthletePlanSummaryCard'
import { GarminFreshnessBadge } from './GarminFreshnessBadge'
import type { ClientWithTests, ProgramSummary, CoachSnapshotTone, CoachSnapshotAction } from './types'

interface OverviewTabProps {
  id: string
  basePath: string
  client: ClientWithTests
  coachSnapshotTone: CoachSnapshotTone
  activeProgram: ProgramSummary | null
  currentAthletePlanBlock: AthletePlanSummary['blocks'][number] | null
  activeAthletePlan: AthletePlanSummary | null
  latestTestLabel: string
  portalMetricLabel: string
  visibleCoachSnapshotActions: CoachSnapshotAction[]
  setAthletePlans: Dispatch<SetStateAction<AthletePlanSummary[]>>
  onRefetchClient: () => void
}

export function OverviewTab({
  id,
  basePath,
  client,
  coachSnapshotTone,
  activeProgram,
  currentAthletePlanBlock,
  activeAthletePlan,
  latestTestLabel,
  portalMetricLabel,
  visibleCoachSnapshotActions,
  setAthletePlans,
  onRefetchClient,
}: OverviewTabProps) {
  const t = useTranslations('coach.pages.clientDetail')

  const noAthleteAccountContent = (
    <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-4 sm:p-6">
      <div className="text-center py-12 text-gray-500 dark:text-slate-400">
        <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="mb-2">{t('analysis.noAthleteAccount.title')}</p>
        <p className="text-sm mb-4">
          {t('analysis.noAthleteAccount.description')}
        </p>
        <CreateAthleteAccountDialog
          clientId={id}
          clientName={client.name}
          clientEmail={client.email}
          clientPhone={client.phone}
          hasExistingAccount={false}
          onAccountCreated={onRefetchClient}
          trigger={
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              {t('actions.createAthleteAccount')}
            </Button>
          }
        />
      </div>
    </div>
  )

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-semibold dark:text-white">{t('overview.coachSnapshot')}</h2>
              <Badge
                variant="outline"
                className={cn(
                  'border font-medium',
                  coachSnapshotTone === 'good' && 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
                  coachSnapshotTone === 'caution' && 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
                  coachSnapshotTone === 'setup' && 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200',
                )}
              >
                {coachSnapshotTone === 'good' ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : <CircleAlert className="mr-1 h-3.5 w-3.5" />}
                {t(`overview.snapshotStatus.${coachSnapshotTone}`)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {t(`overview.snapshotSummary.${coachSnapshotTone}`)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AIContextButton athleteId={id} athleteName={client.name} />
            <Link href={`${basePath}/clients/${id}/edit`}>
              <Button variant="outline" size="sm">
                <Edit2 className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('actions.edit')}</span>
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3 mt-5">
          <div className="rounded-lg border border-gray-200 dark:border-white/10 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('overview.snapshotMetrics.nextFocus')}</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1 truncate">
              {activeProgram?.name ?? currentAthletePlanBlock?.title ?? activeAthletePlan?.name ?? t('overview.snapshotMetrics.noActiveProgram')}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-white/10 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('overview.snapshotMetrics.latestTest')}</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1 truncate">{latestTestLabel}</p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-white/10 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('overview.snapshotMetrics.portal')}</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1 truncate">{portalMetricLabel}</p>
          </div>
        </div>

        <div className="mt-5 border-t border-gray-200 dark:border-white/10 pt-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('overview.nextActions')}</h3>
          <div className="grid gap-3 lg:grid-cols-3">
            {visibleCoachSnapshotActions.map((action) => {
              const actionBody = (
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{action.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
                </div>
              )

              if (action.dialog === 'createPlan') {
                return (
                  <CreateAthletePlanDialog
                    key={action.id}
                    clientId={id}
                    clientName={client.name}
                    onCreated={(plan) => setAthletePlans((current) => [plan, ...current])}
                    trigger={
                      <Button variant="outline" className="h-auto w-full justify-start p-3">
                        {actionBody}
                      </Button>
                    }
                  />
                )
              }

              if (action.dialog) {
                return (
                  <CreateAthleteAccountDialog
                    key={action.id}
                    clientId={id}
                    clientName={client.name}
                    clientEmail={client.email}
                    clientPhone={client.phone}
                    hasExistingAccount={action.dialog === 'sendInvite'}
                    onAccountCreated={onRefetchClient}
                    trigger={
                      <Button variant="outline" className="h-auto w-full justify-start p-3">
                        {actionBody}
                      </Button>
                    }
                  />
                )
              }

              return (
                <Link key={action.id} href={action.href ?? `${basePath}/clients/${id}`}>
                  <Button variant="outline" className="h-auto w-full justify-start p-3">
                    {actionBody}
                  </Button>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {client.athleteAccount ? (
        <>
          <GarminFreshnessBadge clientId={id} />

          <div className="grid gap-4 lg:grid-cols-3">
            <ClientLoadSummary clientId={id} />
            <ReadinessDashboard clientId={id} />
            <ClientFuelingSummary clientId={id} plansHref={`${basePath}/clients/${id}/fueling`} />
          </div>

          <RecentTestsCard
            clientId={id}
            testsHref={`${basePath}/clients/${id}?tab=development`}
          />

          <VisualReportCard
            clientId={id}
            reportType="training-summary"
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <VBTProgressionWidget clientId={id} />
            <Concept2SummaryWidget clientId={id} />
          </div>
        </>
      ) : noAthleteAccountContent}
    </div>
  )
}
