'use client'

import type { ReactNode } from 'react'
import {
  Bot,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DollarSign,
  LayoutDashboard,
  Plug,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ThemeSelector } from '@/components/athlete/settings/ThemeSelector'
import { ProfileSettings } from '@/components/settings/ProfileSettings'
import { PasswordChangeForm } from '@/components/settings/PasswordChangeForm'
import { DashboardModeSelector } from '@/components/coach/settings/DashboardModeSelector'
import { CalendarSharingSettings } from '@/components/coach/settings/CalendarSharingSettings'
import { RolePageFrame, RolePageHeader, RolePanel } from '@/components/layouts/role-shell/RolePage'
import { useTranslations } from '@/i18n/client'
import { cn } from '@/lib/utils'

interface CoachSettingsClientProps {
  userEmail: string
  businessSlug?: string
  userName?: string
  businessId?: string
}

// Settings nav tiles are purely a category grid, not a status signal — keep them neutral.
// cyan is reserved for the soft "AI" accent (Bot/Sparkles icons), not decorative variety.
type LinkTone = 'neutral' | 'cyan'

const linkToneClasses: Record<LinkTone, string> = {
  neutral: 'border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100',
  cyan: 'border-cyan-100 bg-cyan-50 text-cyan-600 dark:border-cyan-900/60 dark:bg-cyan-950/30 dark:text-cyan-300',
}

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-500">
        {title}
      </h2>
      {children}
    </section>
  )
}

function SettingsLink({
  href,
  icon: Icon,
  title,
  description,
  tone,
}: {
  href: string
  icon: LucideIcon
  title: string
  description: string
  tone: LinkTone
}) {
  return (
    <Link href={href} className="group block">
      <RolePanel className="p-4 transition-colors group-hover:border-zinc-300 group-hover:bg-zinc-50 dark:group-hover:border-white/20 dark:group-hover:bg-zinc-900/70">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-md border', linkToneClasses[tone])}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{title}</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{description}</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-zinc-400 transition-colors group-hover:text-zinc-700 dark:group-hover:text-zinc-200" />
        </div>
      </RolePanel>
    </Link>
  )
}

export function CoachSettingsClient({
  userEmail,
  businessSlug,
  userName = '',
  businessId,
}: CoachSettingsClientProps) {
  const t = useTranslations('components.settings.coach')
  const displayName = userName || userEmail || 'Coach'
  const coachHref = (path: string) => (
    businessSlug ? `/${businessSlug}/coach${path}` : '/login'
  )

  return (
    <RolePageFrame contentClassName="max-w-5xl">
      <RolePageHeader
        eyebrow={t('header.subtitle')}
        title={t('header.title')}
        description={t('sections.loggedInAs')}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={coachHref('/dashboard')}>
              <ChevronLeft className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <RolePanel className="p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-100 text-lg font-semibold text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-zinc-400" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-500">
                    {t('sections.loggedInAs')}
                  </p>
                </div>
                <p className="mt-2 truncate text-xl font-semibold text-zinc-950 dark:text-zinc-50">{displayName}</p>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Coach</p>
              </div>
            </div>
          </RolePanel>

          {userEmail && (
            <SettingsSection title={t('sections.profile')}>
              <ProfileSettings userName={displayName} userEmail={userEmail} />
            </SettingsSection>
          )}

          {userEmail && (
            <SettingsSection title={t('sections.password')}>
              <PasswordChangeForm userEmail={userEmail} />
            </SettingsSection>
          )}

          <SettingsSection title={t('sections.dashboard')}>
            <DashboardModeSelector />
            <div className="grid gap-3 sm:grid-cols-2">
              <SettingsLink
                href={coachHref('/settings/dashboard')}
                icon={LayoutDashboard}
                title={t('dashboard.title')}
                description={t('dashboard.description')}
                tone="neutral"
              />
              <SettingsLink
                href={coachHref('/settings/athlete-dashboards')}
                icon={Users}
                title={t('athleteDashboards.title')}
                description={t('athleteDashboards.description')}
                tone="neutral"
              />
            </div>
          </SettingsSection>

          <SettingsSection title={t('sections.appearance')}>
            <ThemeSelector />
          </SettingsSection>

          {businessId && (
            <SettingsSection title={t('sections.calendarSharing')}>
              <CalendarSharingSettings businessId={businessId} />
            </SettingsSection>
          )}
        </div>

        <aside className="space-y-6">
          <SettingsSection title={t('sections.subscription')}>
            <SettingsLink
              href={coachHref('/subscription')}
              icon={CreditCard}
              title={t('subscription.title')}
              description={t('subscription.description')}
              tone="neutral"
            />
          </SettingsSection>

          <SettingsSection title={t('sections.ai')}>
            <div className="space-y-3">
              <SettingsLink
                href={coachHref('/settings/ai')}
                icon={Bot}
                title={t('aiConfig.title')}
                description={t('aiConfig.description')}
                tone="cyan"
              />
              <SettingsLink
                href={coachHref('/settings/ai-kostnader')}
                icon={DollarSign}
                title={t('aiCosts.title')}
                description={t('aiCosts.description')}
                tone="neutral"
              />
            </div>
          </SettingsSection>

          <SettingsSection title={t('sections.integrations')}>
            <div className="space-y-3">
              <SettingsLink
                href={coachHref('/settings/calendars')}
                icon={CalendarDays}
                title={t('integrations.calendar.title')}
                description="Google, Outlook, Apple, iCal"
                tone="neutral"
              />
              <SettingsLink
                href={coachHref('/settings/gym-platform')}
                icon={Plug}
                title={t('integrations.platforms.title')}
                description={t('integrations.platforms.description')}
                tone="neutral"
              />
            </div>
          </SettingsSection>
        </aside>
      </div>
    </RolePageFrame>
  )
}
