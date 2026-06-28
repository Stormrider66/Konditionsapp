import Link from 'next/link'
import { AlertTriangle, HeartPulse, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RolePanel } from '@/components/layouts/role-shell/RolePage'
import { AthletePlanStaffNoteCard } from '@/components/coach/player-notes/AthletePlanStaffNoteCard'
import type { AthletePlanSummary } from '@/components/athlete-plans/AthletePlanSummaryCard'

export interface IndividualPlanEntry {
  clientId: string
  name: string
  jerseyNumber: number | null
  position: string | null
  plan: AthletePlanSummary | null
  planType: string | null
  rehab: { name: string; phase: string | null } | null
  injury: { label: string; detail: string } | null
  restriction: { label: string } | null
  hasPendingReport: boolean
}

interface TeamIndividualPlansSectionProps {
  businessSlug: string
  locale: 'en' | 'sv'
  special: IndividualPlanEntry[]
  recovery: IndividualPlanEntry[]
  needs: IndividualPlanEntry[]
}

type Locale = 'en' | 'sv'
const tt = (l: Locale, sv: string, en: string) => (l === 'sv' ? sv : en)
const formatEnum = (value?: string | null) =>
  value ? value.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : ''

const PLAN_TYPE_LABEL: Record<string, { sv: string; en: string; cls: string }> = {
  SPECIAL_PROGRAM: { sv: 'Specialprogram', en: 'Special program', cls: 'border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300' },
  INJURY_RECOVERY: { sv: 'Skadeåterhämtning', en: 'Injury recovery', cls: 'border-red-300 text-red-700 dark:border-red-800 dark:text-red-300' },
  RETURN_TO_PLAY: { sv: 'Return to play', en: 'Return to play', cls: 'border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300' },
  PERFORMANCE: { sv: 'Prestation', en: 'Performance', cls: 'border-violet-300 text-violet-700 dark:border-violet-800 dark:text-violet-300' },
}

function PlayerBadges({ entry, locale }: { entry: IndividualPlanEntry; locale: Locale }) {
  const planTypeMeta = entry.plan && entry.planType ? PLAN_TYPE_LABEL[entry.planType] : null
  return (
    <div className="flex flex-wrap gap-1.5">
      {planTypeMeta && (
        <Badge variant="outline" className={planTypeMeta.cls}>
          {locale === 'sv' ? planTypeMeta.sv : planTypeMeta.en}
        </Badge>
      )}
      {entry.injury && <Badge variant="destructive">{tt(locale, 'Skadad', 'Injured')}</Badge>}
      {entry.restriction && (
        <Badge variant="outline" className="border-orange-300 text-orange-700 dark:border-orange-800 dark:text-orange-300">
          {tt(locale, 'Restriktion', 'Restriction')}
        </Badge>
      )}
      {entry.rehab && (
        <Badge variant="outline" className="border-blue-300 text-blue-700 dark:border-blue-800 dark:text-blue-300">
          {tt(locale, 'Rehab', 'Rehab')}{entry.rehab.phase ? `: ${formatEnum(entry.rehab.phase)}` : ''}
        </Badge>
      )}
      {entry.hasPendingReport && (
        <Badge variant="outline" className="border-purple-300 text-purple-700 dark:border-purple-800 dark:text-purple-300">
          {tt(locale, 'Ny rapport', 'New report')}
        </Badge>
      )}
    </div>
  )
}

function PlayerHeader({ entry, subtitle }: { entry: IndividualPlanEntry; subtitle?: string | null }) {
  return (
    <div>
      <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
        {entry.jerseyNumber != null ? `#${entry.jerseyNumber} ` : ''}{entry.name}
      </p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {entry.position ? `${entry.position} · ` : ''}{subtitle ?? entry.plan?.name ?? entry.rehab?.name ?? ''}
      </p>
    </div>
  )
}

function PlanCard({ entry, businessSlug, locale, mode }: {
  entry: IndividualPlanEntry
  businessSlug: string
  locale: Locale
  mode: 'plan' | 'needs'
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <PlayerHeader entry={entry} />
        <PlayerBadges entry={entry} locale={locale} />
      </div>

      {entry.plan ? (
        <AthletePlanStaffNoteCard clientId={entry.clientId} businessSlug={businessSlug} plan={entry.plan} compact />
      ) : (
        <RolePanel className="space-y-2 p-4">
          {entry.rehab ? (
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              {tt(locale, 'Rehabprogram', 'Rehab program')}: <span className="font-medium">{entry.rehab.name}</span>
              {entry.rehab.phase ? ` · ${formatEnum(entry.rehab.phase)}` : ''}
            </p>
          ) : null}
          {entry.injury && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {entry.injury.label}{entry.injury.detail ? ` · ${entry.injury.detail}` : ''}
            </p>
          )}
          {mode === 'needs' && (
            <Button asChild size="sm" variant="outline" className="mt-1">
              <Link href={`/${businessSlug}/coach/clients/${entry.clientId}?tab=planning`}>
                {tt(locale, 'Skapa individuell plan', 'Create individual plan')}
              </Link>
            </Button>
          )}
        </RolePanel>
      )}
    </div>
  )
}

function Group({
  title, hint, icon, accent, entries, businessSlug, locale, mode,
}: {
  title: string
  hint: string
  icon: React.ReactNode
  accent: string
  entries: IndividualPlanEntry[]
  businessSlug: string
  locale: Locale
  mode: 'plan' | 'needs'
}) {
  if (entries.length === 0) return null
  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-md ${accent}`}>{icon}</span>
        <h4 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{title}</h4>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
          {entries.length}
        </span>
      </div>
      <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
      <div className="grid gap-4 lg:grid-cols-2">
        {entries.map((entry) => (
          <PlanCard key={`${title}-${entry.clientId}`} entry={entry} businessSlug={businessSlug} locale={locale} mode={mode} />
        ))}
      </div>
    </div>
  )
}

export function TeamIndividualPlansSection({ businessSlug, locale, special, recovery, needs }: TeamIndividualPlansSectionProps) {
  const total = special.length + recovery.length + needs.length

  if (total === 0) {
    return (
      <RolePanel className="p-5 sm:p-6">
        <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
          {tt(locale, 'Inga individuella planer eller skador', 'No individual plans or injuries')}
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {tt(
            locale,
            'Skapa en individuell plan från spelarprofilen för spelare som behöver specialprogram eller rehab.',
            'Create an individual plan from the player profile for players who need a special program or rehab.'
          )}
        </p>
      </RolePanel>
    )
  }

  return (
    <div>
      <Group
        title={tt(locale, 'Specialprogram', 'Special programs')}
        hint={tt(locale, 'Spelare med individuellt anpassad träning (ej skada).', 'Players with individualised training (not injury-related).')}
        icon={<Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-300" />}
        accent="border border-violet-100 bg-violet-50 dark:border-violet-900/60 dark:bg-violet-950/30"
        entries={special}
        businessSlug={businessSlug}
        locale={locale}
        mode="plan"
      />
      <Group
        title={tt(locale, 'Skadeåterhämtning / rehab', 'Injury recovery / rehab')}
        hint={tt(locale, 'Spelare på återhämtnings- eller rehabplan, med skadekontext.', 'Players on recovery or rehab plans, with injury context.')}
        icon={<HeartPulse className="h-4 w-4 text-red-600 dark:text-red-300" />}
        accent="border border-red-100 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30"
        entries={recovery}
        businessSlug={businessSlug}
        locale={locale}
        mode="plan"
      />
      <Group
        title={tt(locale, 'Behöver en plan', 'Needs a program')}
        hint={tt(locale, 'Skadade eller begränsade spelare som saknar en individuell plan.', 'Injured or restricted players without an individual plan yet.')}
        icon={<AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-300" />}
        accent="border border-amber-100 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30"
        entries={needs}
        businessSlug={businessSlug}
        locale={locale}
        mode="needs"
      />
    </div>
  )
}
