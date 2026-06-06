'use client'

import type { Dispatch, SetStateAction } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import { Edit2, CalendarDays, Target, ClipboardList, ExternalLink, Loader2, UserPlus } from 'lucide-react'
import { useLocale, useTranslations } from '@/i18n/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UnifiedCalendar } from '@/components/calendar'
import { CreateAthletePlanDialog } from '@/components/coach/clients/CreateAthletePlanDialog'
import { RaceFuelingCard } from '@/components/athlete/fueling/RaceFuelingCard'
import { AthletePlanSummaryCard, AthletePlanSummary } from '@/components/athlete-plans/AthletePlanSummaryCard'
import { CreateAthleteAccountDialog } from '@/components/client/CreateAthleteAccountDialog'
import type { ClientWithTests, ProgramSummary } from './types'

interface PlanningTabProps {
  id: string
  basePath: string
  client: ClientWithTests
  programs: ProgramSummary[]
  programsLoading: boolean
  now: Date
  newProgramHref: string
  planningProgramLabel: string
  planningProgramMeta: string
  planningLogStatus: string
  planningWeekLabel: string
  activeProgram: ProgramSummary | null
  activeAthletePlan: AthletePlanSummary | null
  currentAthletePlanBlock: AthletePlanSummary['blocks'][number] | null
  referenceProgram: ProgramSummary | null
  programsInNextSevenDays: ProgramSummary[]
  hasRecentTest: boolean
  hasHockeyLogs: boolean
  setAthletePlans: Dispatch<SetStateAction<AthletePlanSummary[]>>
  onRefetchClient: () => void
}

export function PlanningTab({
  id,
  basePath,
  client,
  programs,
  programsLoading,
  now,
  newProgramHref,
  planningProgramLabel,
  planningProgramMeta,
  planningLogStatus,
  planningWeekLabel,
  activeProgram,
  activeAthletePlan,
  currentAthletePlanBlock,
  referenceProgram,
  programsInNextSevenDays,
  hasRecentTest,
  hasHockeyLogs,
  setAthletePlans,
  onRefetchClient,
}: PlanningTabProps) {
  const t = useTranslations('coach.pages.clientDetail')
  const locale = useLocale()
  const dateFnsLocale = locale === 'sv' ? sv : enUS

  const programGoalLabels: Record<string, string> = {
    marathon: 'Marathon',
    half_marathon: t('programGoals.halfMarathon'),
    '10k': '10K',
    '5k': '5K',
    fitness: t('programGoals.fitness'),
    cycling: t('programGoals.cycling'),
    skiing: t('programGoals.skiing'),
    triathlon: 'Triathlon',
    custom: t('programGoals.custom'),
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold dark:text-white">{t('planning.title')}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t('planning.description')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`${basePath}/calendar`}>
              <Button variant="outline" size="sm">
                <CalendarDays className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('planning.openCalendar')}</span>
              </Button>
            </Link>
            <CreateAthletePlanDialog
              clientId={id}
              clientName={client.name}
              onCreated={(plan) => setAthletePlans((current) => [plan, ...current])}
            />
            <Link href={newProgramHref}>
              <Button variant="outline" size="sm">{t('programs.newProgram')}</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3 mt-5">
          <div className="rounded-lg border border-gray-200 dark:border-white/10 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('planning.currentBlock')}</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1 truncate">{planningProgramLabel}</p>
            <p className="text-xs text-muted-foreground mt-1">{planningProgramMeta}</p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-white/10 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('planning.workoutLogging')}</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1 truncate">{planningLogStatus}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('planning.workoutLoggingDescription')}</p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-white/10 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('planning.programLibrary')}</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
              {programsLoading ? t('planning.loading') : t('planning.programCount', { count: programs.length })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{t('planning.programLibraryDescription')}</p>
          </div>
        </div>

        {activeAthletePlan && (
          <div className="mt-5">
            <AthletePlanSummaryCard
              plan={activeAthletePlan}
              now={now}
              action={
                <CreateAthletePlanDialog
                  clientId={id}
                  clientName={client.name}
                  initialPlan={activeAthletePlan}
                  onSaved={(plan) => setAthletePlans((current) => current.map((item) => item.id === plan.id ? plan : item))}
                  trigger={
                    <Button variant="outline" size="sm">
                      <Edit2 className="mr-2 h-4 w-4" />
                      {t('planning.editPlan')}
                    </Button>
                  }
                />
              }
            />
          </div>
        )}

        <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('planning.weekDecisionTitle')}</h3>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{t('planning.weekDecisionDescription')}</p>
            </div>
            <Badge
              variant="outline"
              className={cn(
                'w-fit border font-medium',
                programsInNextSevenDays.length > 0
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
                  : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
              )}
            >
              {planningWeekLabel}
            </Badge>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('planning.weekChecklist.plan')}</p>
              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                {referenceProgram?.name ?? currentAthletePlanBlock?.title ?? activeAthletePlan?.name ?? t('planning.weekChecklist.noPlan')}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('planning.weekChecklist.feedback')}</p>
              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{planningLogStatus}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('planning.weekChecklist.test')}</p>
              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{hasRecentTest ? t('planning.weekChecklist.testFresh') : t('planning.weekChecklist.testNeedsUpdate')}</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3 mt-5">
            {referenceProgram ? (
              <Link href={`${basePath}/programs/${referenceProgram.id}`}>
                <Button variant="outline" className="h-auto w-full justify-start p-3">
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{activeProgram ? t('planning.viewActiveProgram') : t('planning.viewUpcomingProgram')}</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{referenceProgram.name}</p>
                  </div>
                </Button>
              </Link>
            ) : activeAthletePlan ? (
              <Link href={newProgramHref}>
                <Button variant="outline" className="h-auto w-full justify-start p-3">
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('planning.fillSessions')}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('planning.fillSessionsDescription')}</p>
                  </div>
                </Button>
              </Link>
            ) : (
              <CreateAthletePlanDialog
                clientId={id}
                clientName={client.name}
                onCreated={(plan) => setAthletePlans((current) => [plan, ...current])}
                trigger={
                  <Button variant="outline" className="h-auto w-full justify-start p-3">
                    <div className="text-left">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('planning.createProgramAction')}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t('planning.createProgramActionDescription')}</p>
                    </div>
                  </Button>
                }
              />
            )}

            {client.athleteAccount ? (
              <Link href={`${basePath}/athletes/${id}/logs`}>
                <Button variant="outline" className="h-auto w-full justify-start p-3">
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('planning.reviewLogs')}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('planning.reviewLogsDescription')}</p>
                  </div>
                </Button>
              </Link>
            ) : (
              <CreateAthleteAccountDialog
                clientId={id}
                clientName={client.name}
                clientEmail={client.email}
                clientPhone={client.phone}
                hasExistingAccount={false}
                onAccountCreated={onRefetchClient}
                trigger={
                  <Button variant="outline" className="h-auto w-full justify-start p-3">
                    <div className="text-left">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('planning.enableLogs')}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t('planning.enableLogsDescription')}</p>
                    </div>
                  </Button>
                }
              />
            )}

            <Link href={`${basePath}/clients/${id}/fueling`}>
              <Button variant="outline" className="h-auto w-full justify-start p-3">
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('planning.reviewFueling')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('planning.reviewFuelingDescription')}</p>
                </div>
              </Button>
            </Link>

            <Link href={`${basePath}/ai-studio?athleteId=${id}&prompt=${encodeURIComponent(t('planning.askAiPrompt'))}`}>
              <Button variant="outline" className="h-auto w-full justify-start p-3">
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('planning.askAi')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('planning.askAiDescription')}</p>
                </div>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-4 lg:p-6">
        <UnifiedCalendar
          clientId={id}
          clientName={client.name}
          isCoachView={true}
        />
      </div>

      <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-sm flex items-center gap-2 dark:text-white">
              <ClipboardList className="h-4 w-4 text-blue-500" />
              {hasHockeyLogs ? t('analysis.hockeyLogs.title') : t('analysis.trainingLogs.title')}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {hasHockeyLogs ? t('analysis.hockeyLogs.description') : t('analysis.trainingLogs.description')}
            </p>
          </div>
          {client.athleteAccount ? (
            <Link href={`${basePath}/athletes/${id}/logs`}>
              <Button size="sm" variant="outline" className="w-full sm:w-auto">
                <ExternalLink className="w-4 h-4 mr-2" />
                {t('analysis.trainingLogs.cta')}
              </Button>
            </Link>
          ) : (
            <CreateAthleteAccountDialog
              clientId={id}
              clientName={client.name}
              clientEmail={client.email}
              clientPhone={client.phone}
              hasExistingAccount={false}
              onAccountCreated={onRefetchClient}
              trigger={
                <Button size="sm" variant="outline" className="w-full sm:w-auto">
                  <UserPlus className="w-4 h-4 mr-2" />
                  {t('actions.createAthleteAccount')}
                </Button>
              }
            />
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <h2 className="text-lg sm:text-xl font-semibold dark:text-white">{t('programs.title')}</h2>
          <Link href={newProgramHref} className="shrink-0">
            <Button size="sm" className="w-full sm:w-auto">{t('programs.newProgram')}</Button>
          </Link>
        </div>

        {programsLoading ? (
          <div className="flex items-center justify-center py-8 text-gray-500 dark:text-slate-400">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            {t('programs.loading')}
          </div>
        ) : programs.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-slate-400">
            <p className="mb-2">{t('programs.emptyTitle')}</p>
            <Link
              href={newProgramHref}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              {t('programs.createFirst')}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {programs.map((program) => (
              <Link key={program.id} href={`${basePath}/programs/${program.id}`}>
                <div className="border dark:border-white/10 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition cursor-pointer">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg mb-1 dark:text-white">{program.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">
                        {programGoalLabels[program.goalType] ?? program.goalType}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-slate-400">
                        <span>
                          {format(new Date(program.startDate), 'PPP', { locale: dateFnsLocale })} -{' '}
                          {format(new Date(program.endDate), 'PPP', { locale: dateFnsLocale })}
                        </span>
                        {program._count?.weeks && (
                          <span className="text-gray-400">
                            {t('programs.weeks', { count: program._count.weeks })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        {t('actions.viewArrow')}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <RaceFuelingCard
        clientId={id}
        detailBasePath={`${basePath}/clients/${id}/fueling`}
        listHref={`${basePath}/clients/${id}/fueling`}
      />
    </div>
  )
}
