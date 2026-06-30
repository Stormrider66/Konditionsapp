import Link from 'next/link'
import { AlertTriangle, HeartPulse, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RolePanel } from '@/components/layouts/role-shell/RolePage'
import { AthletePlanStaffNoteCard } from '@/components/coach/player-notes/AthletePlanStaffNoteCard'
import { CreateAthletePlanDialog } from '@/components/coach/clients/CreateAthletePlanDialog'
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
  /** SEVERE/COMPLETE restriction (or whole-category block) → should come off the team plan. */
  severeRestriction?: boolean
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
  PERFORMANCE: { sv: 'Prestation', en: 'Performance', cls: 'border-blue-300 text-blue-700 dark:border-blue-800 dark:text-blue-300' },
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
      {entry.severeRestriction && (
        <Badge variant="outline" className="border-red-400 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-950/40 dark:text-red-200">
          {tt(locale, 'Allvarlig restriktion', 'Severe restriction')}
        </Badge>
      )}
      {entry.injury && <Badge variant="destructive">{tt(locale, 'Skadad', 'Injured')}</Badge>}
      {entry.restriction && (
        <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300">
          {tt(locale, 'Restriktion', 'Restriction')}
        </Badge>
      )}
      {entry.rehab && (
        <Badge variant="outline" className="border-blue-300 text-blue-700 dark:border-blue-800 dark:text-blue-300">
          {tt(locale, 'Rehab', 'Rehab')}{entry.rehab.phase ? `: ${formatEnum(entry.rehab.phase)}` : ''}
        </Badge>
      )}
      {entry.hasPendingReport && (
        <Badge variant="outline" className="border-blue-300 text-blue-700 dark:border-blue-800 dark:text-blue-300">
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
            entry.severeRestriction ? (
              <div className="mt-1 space-y-1.5">
                <CreateAthletePlanDialog
                  clientId={entry.clientId}
                  clientName={entry.name}
                  defaultPlanType="INJURY_RECOVERY"
                  defaultTemplateKey="return-6"
                  trigger={
                    <Button size="sm" className="bg-red-600 text-white hover:bg-red-700">
                      {tt(locale, 'Ta av lagplan & starta skadeplan', 'Take off team plan & start injury plan')}
                    </Button>
                  }
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {tt(
                    locale,
                    'Skapar en skadeplan och hoppar över spelarens lagpass i planperioden.',
                    'Creates an injury plan and skips the player’s team sessions during the plan window.'
                  )}
                </p>
              </div>
            ) : (
              <Button asChild size="sm" variant="outline" className="mt-1">
                <Link href={`/${businessSlug}/coach/clients/${entry.clientId}?tab=planning`}>
                  {tt(locale, 'Skapa individuell plan', 'Create individual plan')}
                </Link>
              </Button>
            )
          )}
        </RolePanel>
      )}
    </div>
  )
}

function Group({
  anchorId, title, hint, icon, accent, entries, businessSlug, locale, mode,
}: {
  anchorId: string
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
    <div id={anchorId} className="mb-6 scroll-mt-24">
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

function SummaryChip({ label, count, cls, href }: { label: string; count: number; cls: string; href: string }) {
  const base = `flex items-center gap-2 rounded-lg border px-3 py-2 ${cls}`
  const content = (
    <>
      <span className="text-lg font-semibold tabular-nums leading-none">{count}</span>
      <span className="text-xs font-medium leading-tight">{label}</span>
    </>
  )
  if (count === 0) {
    return <div className={`${base} opacity-50`}>{content}</div>
  }
  return (
    <a
      href={href}
      className={`${base} cursor-pointer transition hover:opacity-90 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1`}
    >
      {content}
    </a>
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
      <div className="mb-5 flex flex-wrap gap-2">
        <SummaryChip
          href="#individual-special"
          label={tt(locale, 'Specialprogram', 'Special programs')}
          count={special.length}
          cls="border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200"
        />
        <SummaryChip
          href="#individual-recovery"
          label={tt(locale, 'Skadeåterhämtning', 'Injury recovery')}
          count={recovery.length}
          cls="border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200"
        />
        <SummaryChip
          href="#individual-needs"
          label={tt(locale, 'Behöver en plan', 'Needs a program')}
          count={needs.length}
          cls="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
        />
      </div>

      <Group
        anchorId="individual-special"
        title={tt(locale, 'Specialprogram', 'Special programs')}
        hint={tt(locale, 'Spelare med individuellt anpassad träning (ej skada).', 'Players with individualised training (not injury-related).')}
        icon={<Sparkles className="h-4 w-4 text-slate-600 dark:text-slate-300" />}
        accent="border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40"
        entries={special}
        businessSlug={businessSlug}
        locale={locale}
        mode="plan"
      />
      <Group
        anchorId="individual-recovery"
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
        anchorId="individual-needs"
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
