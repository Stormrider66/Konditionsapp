'use client'

import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import { Activity, Gauge, ShieldCheck, Timer, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Client, HockeyTestOption, TeamOption } from './schema'
import type { AppLocale } from './helpers'

const t = (locale: AppLocale, svText: string, enText: string) => (
  locale === 'sv' ? svText : enText
)

const getDateLocale = (locale: AppLocale) => (locale === 'sv' ? sv : enUS)

const focusGroups = [
  {
    id: 'speed',
    icon: Timer,
    keys: ['sprint5m', 'sprint10m', 'sprint20m', 'sprint30m', 'sprint20mFly', 'sprint30mFly', 'agilityBest'],
    title: { sv: 'Speed & agility', en: 'Speed & agility' },
  },
  {
    id: 'rsa',
    icon: Gauge,
    keys: ['endurance7x40Best', 'endurance7x40Average', 'endurance7x40AverageKmh', 'endurance7x40Drop', 'endurance7x40Score'],
    title: { sv: 'Upprepad sprint', en: 'Repeated sprint' },
  },
  {
    id: 'strength',
    icon: Zap,
    keys: ['muscleLabWkg', 'backSquat1RM', 'powerClean1RM', 'benchPress1RM', 'pullUp1RM', 'standingLongJump', 'threeJumpBest', 'wingate30sAveragePower'],
    title: { sv: 'Styrka & power', en: 'Strength & power' },
  },
  {
    id: 'aerobic',
    icon: Activity,
    keys: ['beepScore', 'vo2Max', 'lt1SpeedKmh', 'lt2SpeedKmh', 'lt1HeartRate', 'lt2HeartRate', 'maxHeartRate'],
    title: { sv: 'Aerob profil', en: 'Aerobic profile' },
  },
] as const

interface HockeyTestEvidencePanelProps {
  locale: AppLocale
  assignmentScope: 'INDIVIDUAL' | 'TEAM' | 'SELECTED'
  selectedClient?: Client
  selectedTeam?: TeamOption
  selectedClientIds: string[]
  selectedTest?: HockeyTestOption
}

export function HockeyTestEvidencePanel({
  locale,
  assignmentScope,
  selectedClient,
  selectedTeam,
  selectedClientIds,
  selectedTest,
}: HockeyTestEvidencePanelProps) {
  if (assignmentScope !== 'INDIVIDUAL') {
    const selectedSet = new Set(selectedClientIds)
    const selectedMembers = selectedTeam?.members.filter((member) => selectedSet.has(member.id)) ?? []
    return (
      <div className="rounded-lg border bg-muted/20 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <h3 className="font-medium">{t(locale, 'Hockeytester används per spelare', 'Hockey tests are used per player')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(
                locale,
                'När programmet skapas hämtas senaste hockeytest för varje vald spelare: is-sprint, 5-10-5, 7x40, MuscleLab, styrka, hopp, Wingate och aerob profil när de finns.',
                'When the program is created, the latest hockey test is used for each selected player: ice sprints, 5-10-5, 7x40, MuscleLab, strength, jumps, Wingate, and aerobic profile when available.'
              )}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary">
                {assignmentScope === 'TEAM'
                  ? t(locale, 'Hela laget', 'Whole team')
                  : t(locale, 'Utvalda spelare', 'Selected players')}
              </Badge>
              <Badge variant="secondary">
                {t(locale, `${selectedMembers.length} spelare`, `${selectedMembers.length} players`)}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!selectedClient) return null

  if (!selectedTest) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100">
        <h3 className="font-medium">{t(locale, 'Inget hockeytest valt', 'No hockey test selected')}</h3>
        <p className="mt-1 text-sm">
          {t(locale, 'Programmet kan fortfarande skapas manuellt, men testbaserade justeringar saknas.', 'The program can still be created manually, but test-based adjustments will be missing.')}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-medium">{t(locale, 'Hockeytest som underlag', 'Hockey test evidence')}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {selectedClient.name} · {format(new Date(selectedTest.testDate), 'PPP', { locale: getDateLocale(locale) })}
          </p>
        </div>
        <Badge variant="secondary">
          {t(locale, `${selectedTest.metricCount} mätvärden`, `${selectedTest.metricCount} metrics`)}
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {focusGroups.map((group) => {
          const Icon = group.icon
          const metrics = selectedTest.metrics.filter((metric) => group.keys.includes(metric.key as never)).slice(0, 4)
          if (metrics.length === 0) return null

          return (
            <div key={group.id} className="rounded-md border bg-background/70 p-3 dark:border-white/10 dark:bg-slate-950/40">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Icon className="h-4 w-4 text-primary" />
                {group.title[locale]}
              </div>
              <div className="flex flex-wrap gap-2">
                {metrics.map((metric) => (
                  <Badge key={metric.key} variant="outline">
                    {metric.label}: {metric.value}{metric.unit ? ` ${metric.unit}` : ''}
                  </Badge>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
