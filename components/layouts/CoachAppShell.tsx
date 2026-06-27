'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity,
  BarChart3,
  Building2,
  CalendarDays,
  Dumbbell,
  FileStack,
  Flame,
  Gauge,
  Gift,
  Heart,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Settings,
  Share2,
  Shield,
  Sparkles,
  Timer,
  Trophy,
  UserCog,
  UserPlus,
  Users,
  Users2,
  Video,
  Zap,
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import type { BusinessMemberRole } from '@/types'
import { AthleteModeToggle } from '@/components/coach/AthleteModeToggle'
import { OrgSwitcher } from '@/components/coach/OrgSwitcher'
import { NotificationBell } from '@/components/calendar/NotificationsPanel'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { createClient } from '@/lib/supabase/client'
import { useBusinessBrandingOptional } from '@/lib/contexts/BusinessBrandingContext'
import { useWorkoutThemeOptional } from '@/lib/themes/ThemeProvider'
import { useTranslations } from '@/i18n/client'
import { cn } from '@/lib/utils'
import { RoleAppShell, type RoleShellNavItem, type RoleShellNavSection } from './role-shell/RoleAppShell'
import type { BusinessBranding } from '@/lib/branding/types'

interface CoachAppShellProps {
  children: ReactNode
  user: User | null
  businessSlug: string
  branding?: BusinessBranding | null
}

type DashboardMode = 'PT' | 'TEAM' | 'GYM'

export function CoachAppShell({
  children,
  user,
  businessSlug,
  branding: brandingProp,
}: CoachAppShellProps) {
  const router = useRouter()
  const brandingContext = useBusinessBrandingOptional()
  const branding = brandingContext || brandingProp || null
  const themeContext = useWorkoutThemeOptional()
  const isDark = themeContext?.appTheme?.id === 'FITAPP_DARK'
  const t = useTranslations('components.businessCoachHeader')
  const [businessRole, setBusinessRole] = useState<BusinessMemberRole | null>(null)
  const [businessName, setBusinessName] = useState<string | null>(branding?.businessName ?? null)
  const [platformAdminRole, setPlatformAdminRole] = useState<string | null>(null)
  const [rolePreview, setRolePreview] = useState<string | null>(null)
  const [rolePreviewSaving, setRolePreviewSaving] = useState(false)
  const [dashboardMode, setDashboardMode] = useState<DashboardMode>('PT')
  const [staffRole, setStaffRole] = useState<string>('COACH')

  useEffect(() => {
    const fetchBusinessContext = async () => {
      try {
        const [contextRes, modeRes, permRes, previewRes] = await Promise.all([
          fetch('/api/coach/admin/context', {
            headers: { 'x-business-slug': businessSlug },
          }),
          fetch('/api/coach/dashboard-mode'),
          fetch('/api/coach/permissions', {
            headers: { 'x-business-slug': businessSlug },
          }),
          fetch('/api/coach/role-preview'),
        ])

        if (contextRes.ok) {
          const result = await contextRes.json()
          if (result.data?.role) {
            setBusinessRole(result.data.role as BusinessMemberRole)
          }
          if (result.data?.business?.name) {
            setBusinessName(result.data.business.name)
          }
          if (result.data?.adminRole) {
            setPlatformAdminRole(result.data.adminRole)
          }
        }

        if (modeRes.ok) {
          const modeData = await modeRes.json()
          if (modeData.dashboardMode) {
            setDashboardMode(modeData.dashboardMode)
          }
        }

        if (permRes.ok) {
          const permData = await permRes.json()
          setStaffRole(permData.role || 'COACH')
        }

        if (previewRes.ok) {
          const previewData = await previewRes.json()
          setRolePreview(previewData.role || null)
        }
      } catch (err) {
        console.error('[CoachAppShell] Failed to fetch business context:', err)
      }
    }

    void fetchBusinessContext()
  }, [businessSlug])

  const applyRolePreview = async (role: string | null) => {
    setRolePreviewSaving(true)
    try {
      const res = await fetch('/api/coach/role-preview', {
        method: role ? 'POST' : 'DELETE',
        headers: role ? { 'Content-Type': 'application/json' } : undefined,
        body: role ? JSON.stringify({ role }) : undefined,
      })
      if (!res.ok) return
      setRolePreview(role)
      router.refresh()
    } finally {
      setRolePreviewSaving(false)
    }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const basePath = `/${businessSlug}`
  const brandName = branding?.businessName || businessName || t('brand.portalName')
  const brandAccent = branding?.primaryColor || '#2563eb'
  const rolePreviewOptions = [
    { value: 'OWNER', label: t('roles.owner') },
    { value: 'ADMIN', label: t('roles.admin') },
    { value: 'COACH', label: t('roles.coach') },
    { value: 'PHYSICAL_TRAINER', label: t('roles.physicalTrainer') },
    { value: 'ASSISTANT_COACH', label: t('roles.assistantCoach') },
    { value: 'PHYSIO', label: t('roles.physio') },
    { value: 'MEMBER', label: t('roles.member') },
  ]

  const mainNavItems: RoleShellNavItem[] = [
    { href: `${basePath}/coach/dashboard`, label: t('nav.today'), icon: LayoutDashboard, exact: true },
    { href: `${basePath}/coach/calendar`, label: t('nav.calendar'), icon: CalendarDays },
    { href: `${basePath}/coach/clients`, label: t('nav.athletes'), icon: Users },
    { href: `${basePath}/coach/programs`, label: t('nav.programs'), icon: FileStack },
  ]

  const allToolItems = {
    test: { href: `${basePath}/coach/test`, label: t('nav.test'), icon: Activity },
    testOverview: { href: `${basePath}/coach/test-overview`, label: t('nav.testOverview'), icon: BarChart3 },
    aiStudio: { href: `${basePath}/coach/ai-studio`, label: t('nav.aiStudio'), icon: Sparkles },
    aiCanvas: { href: `${basePath}/coach/ai-canvas`, label: t('nav.aiCanvas'), icon: FileStack },
    hybrid: { href: `${basePath}/coach/hybrid-studio`, label: t('nav.hybridStudio'), icon: Flame },
    strength: { href: `${basePath}/coach/strength`, label: t('nav.strengthStudio'), icon: Dumbbell },
    cardio: { href: `${basePath}/coach/cardio`, label: t('nav.cardioStudio'), icon: Heart },
    agility: { href: `${basePath}/coach/agility-studio`, label: t('nav.agilityStudio'), icon: Zap },
    ergometer: { href: `${basePath}/coach/ergometer-tests`, label: t('nav.ergometerTests'), icon: Gauge },
    video: { href: `${basePath}/coach/video-analysis`, label: t('nav.videoAnalysis'), icon: Video },
    monitoring: { href: `${basePath}/coach/monitoring`, label: t('nav.monitoring'), icon: Activity },
    liveHR: { href: `${basePath}/coach/live-hr`, label: t('nav.liveHr'), icon: Heart },
    intervals: { href: `${basePath}/coach/interval-sessions`, label: t('nav.intervals'), icon: Timer },
    drills: { href: `${basePath}/coach/drills`, label: t('nav.drills'), icon: FileStack },
    hockeyTests: { href: `${basePath}/coach/hockey-tests`, label: t('nav.hockeyTests'), icon: Shield },
    testProtocols: { href: `${basePath}/coach/test-protocols`, label: t('nav.testProtocols'), icon: FileStack },
  } satisfies Record<string, RoleShellNavItem>

  const allMoreItems = {
    staff: { href: `${basePath}/coach/staff`, label: t('nav.staff'), icon: Shield },
    social: { href: `${basePath}/coach/social`, label: t('nav.socialMedia'), icon: Share2 },
    competitions: { href: `${basePath}/coach/competitions`, label: t('nav.challenges'), icon: Trophy },
    community: { href: `${basePath}/coach/community`, label: t('nav.community'), icon: Megaphone },
    analytics: { href: `${basePath}/coach/analytics`, label: t('nav.analytics'), icon: BarChart3 },
    teams: { href: `${basePath}/coach/teams`, label: t('nav.teams'), icon: Users2 },
    browse: { href: `${basePath}/coach/browse-athletes`, label: t('nav.browseAthletes'), icon: UserPlus },
    orgs: { href: `${basePath}/coach/organizations`, label: t('nav.organizations'), icon: Building2 },
    docs: { href: `${basePath}/coach/documents`, label: t('nav.documents'), icon: FileStack },
    messages: { href: `${basePath}/coach/messages`, label: t('nav.messages'), icon: MessageSquare },
    referrals: { href: `${basePath}/coach/referrals`, label: t('nav.referrals'), icon: Gift },
    settings: { href: `${basePath}/coach/settings`, label: t('nav.settings'), icon: Settings },
  } satisfies Record<string, RoleShellNavItem>

  const toolsByMode: Record<DashboardMode, RoleShellNavItem[]> = {
    PT: [
      allToolItems.test,
      allToolItems.testOverview,
      allToolItems.strength,
      allToolItems.cardio,
      allToolItems.hybrid,
      allToolItems.agility,
      allToolItems.intervals,
      allToolItems.aiStudio,
      allToolItems.aiCanvas,
    ],
    TEAM: [
      allToolItems.test,
      allToolItems.strength,
      allToolItems.cardio,
      allToolItems.hybrid,
      allToolItems.agility,
      allToolItems.video,
      allToolItems.drills,
      allToolItems.liveHR,
      allToolItems.aiCanvas,
    ],
    GYM: [
      allToolItems.test,
      allToolItems.testOverview,
      allToolItems.strength,
      allToolItems.cardio,
      allToolItems.hybrid,
      allToolItems.ergometer,
      allToolItems.aiStudio,
      allToolItems.aiCanvas,
    ],
  }

  const moreByMode: Record<DashboardMode, RoleShellNavItem[]> = {
    PT: [
      allMoreItems.community,
      allMoreItems.competitions,
      allMoreItems.messages,
      allMoreItems.settings,
    ],
    TEAM: [
      allMoreItems.staff,
      allMoreItems.teams,
      allMoreItems.messages,
      allMoreItems.docs,
      allMoreItems.orgs,
      allMoreItems.settings,
    ],
    GYM: [
      allMoreItems.community,
      allMoreItems.competitions,
      allMoreItems.messages,
      allMoreItems.settings,
    ],
  }

  const isAdmin = businessRole === 'OWNER' || businessRole === 'ADMIN'
  const hiddenToolHrefs = new Set<string>()
  const hiddenMoreHrefs = new Set<string>()

  if (staffRole === 'ASSISTANT_COACH') {
    hiddenToolHrefs.add(allToolItems.aiStudio.href)
    hiddenToolHrefs.add(allToolItems.aiCanvas.href)
    hiddenToolHrefs.add(allToolItems.ergometer.href)
    hiddenToolHrefs.add(allToolItems.video.href)
    hiddenMoreHrefs.add(allMoreItems.settings.href)
    hiddenMoreHrefs.add(allMoreItems.referrals.href)
    hiddenMoreHrefs.add(allMoreItems.orgs.href)
    hiddenMoreHrefs.add(allMoreItems.browse.href)
  } else if (staffRole === 'PHYSICAL_TRAINER') {
    hiddenToolHrefs.add(allToolItems.drills.href)
    hiddenMoreHrefs.add(allMoreItems.settings.href)
    hiddenMoreHrefs.add(allMoreItems.referrals.href)
    hiddenMoreHrefs.add(allMoreItems.orgs.href)
  } else if (staffRole === 'PHYSIO') {
    hiddenToolHrefs.add(allToolItems.aiStudio.href)
    hiddenToolHrefs.add(allToolItems.aiCanvas.href)
    hiddenToolHrefs.add(allToolItems.strength.href)
    hiddenToolHrefs.add(allToolItems.cardio.href)
    hiddenToolHrefs.add(allToolItems.hybrid.href)
    hiddenToolHrefs.add(allToolItems.ergometer.href)
    hiddenToolHrefs.add(allToolItems.drills.href)
    hiddenMoreHrefs.add(allMoreItems.settings.href)
    hiddenMoreHrefs.add(allMoreItems.referrals.href)
    hiddenMoreHrefs.add(allMoreItems.orgs.href)
  }

  if (!isAdmin) {
    hiddenMoreHrefs.add(allMoreItems.staff.href)
  }

  if (dashboardMode === 'TEAM') {
    hiddenToolHrefs.add(allToolItems.testOverview.href)
    hiddenToolHrefs.add(allToolItems.aiStudio.href)
    hiddenToolHrefs.add(allToolItems.ergometer.href)
    hiddenToolHrefs.add(allToolItems.monitoring.href)
    hiddenToolHrefs.add(allToolItems.intervals.href)
    hiddenToolHrefs.add(allToolItems.hockeyTests.href)
    hiddenToolHrefs.add(allToolItems.testProtocols.href)

    hiddenMoreHrefs.add(allMoreItems.social.href)
    hiddenMoreHrefs.add(allMoreItems.competitions.href)
    hiddenMoreHrefs.add(allMoreItems.community.href)
    hiddenMoreHrefs.add(allMoreItems.analytics.href)
    hiddenMoreHrefs.add(allMoreItems.browse.href)
    hiddenMoreHrefs.add(allMoreItems.referrals.href)

    if (!isAdmin) {
      hiddenMoreHrefs.add(allMoreItems.orgs.href)
    }
  }

  const prioritizedTools = toolsByMode[dashboardMode].filter((item) => !hiddenToolHrefs.has(item.href))
  const remainingTools = Object.values(allToolItems)
    .filter((item) => !hiddenToolHrefs.has(item.href))
    .filter((item) => !prioritizedTools.some((priority) => priority.href === item.href))
    .map((item) => ({ ...item, muted: true }))

  const prioritizedMore = moreByMode[dashboardMode].filter((item) => !hiddenMoreHrefs.has(item.href))
  const remainingMore = Object.values(allMoreItems)
    .filter((item) => !hiddenMoreHrefs.has(item.href))
    .filter((item) => !prioritizedMore.some((priority) => priority.href === item.href))
    .map((item) => ({ ...item, muted: true }))

  const adminItems: RoleShellNavItem[] = [
    ...((businessRole === 'OWNER' || businessRole === 'ADMIN')
      ? [{ href: `${basePath}/coach/admin`, label: t('nav.admin'), icon: Shield }]
      : []),
    ...(platformAdminRole
      ? [{ href: '/admin', label: t('nav.platformAdmin'), icon: Shield }]
      : []),
  ]

  const navSections: RoleShellNavSection[] = [
    { id: 'main', label: t('groups.workspace'), items: mainNavItems },
    { id: 'tools', label: t('groups.tools'), items: [...prioritizedTools, ...remainingTools] },
    { id: 'manage', label: t('groups.more'), items: [...prioritizedMore, ...remainingMore] },
    { id: 'admin', label: t('nav.admin'), items: adminItems },
  ]

  const renderRolePreviewControl = () => platformAdminRole ? (
    <RolePreviewControl
      options={rolePreviewOptions}
      rolePreview={rolePreview}
      rolePreviewSaving={rolePreviewSaving}
      isDark={isDark}
      onApply={applyRolePreview}
    />
  ) : null

  return (
    <RoleAppShell
      user={user}
      roleLabel={t('fallbackName')}
      navSections={navSections}
      brandName={brandName}
      brandInitial={brandName}
      brandLogoUrl={branding?.logoUrl ?? null}
      brandAccent={brandAccent}
      homeHref={`${basePath}/coach/dashboard`}
      settingsHref={`${basePath}/coach/settings`}
      tone={isDark ? 'dark' : 'light'}
      topbarLeading={<OrgSwitcher currentSlug={businessSlug} tone={isDark ? 'dark' : 'light'} />}
      topbarActions={
        <>
          {renderRolePreviewControl()}
          <LanguageSwitcher showLabel={false} variant="ghost" />
          <NotificationBell />
        </>
      }
      userMenuExtras={<AthleteModeToggle variant="dropdown" />}
      mobilePanelExtras={
        <div className="space-y-3">
          <OrgSwitcher currentSlug={businessSlug} tone={isDark ? 'dark' : 'light'} />
          <div className="flex items-center gap-1">
            {renderRolePreviewControl()}
            <LanguageSwitcher showLabel={false} variant="ghost" />
            <NotificationBell />
          </div>
        </div>
      }
      onSignOut={handleSignOut}
      labels={{
        navigation: t('menu.navigationMenu'),
        collapse: t('shell.collapseSidebar'),
        expand: t('shell.expandSidebar'),
        openMenu: t('menu.toggleMenu'),
        closeMenu: t('shell.closeMenu'),
        signedInAs: t('shell.signedInAs'),
        settings: t('menu.settings'),
        logOut: t('menu.logOut'),
      }}
    >
      {children}
    </RoleAppShell>
  )
}

function RolePreviewControl({
  options,
  rolePreview,
  rolePreviewSaving,
  isDark,
  onApply,
}: {
  options: Array<{ value: string; label: string }>
  rolePreview: string | null
  rolePreviewSaving: boolean
  isDark: boolean
  onApply: (role: string | null) => Promise<void>
}) {
  const t = useTranslations('components.businessCoachHeader')
  const currentLabel = rolePreview
    ? options.find((role) => role.value === rolePreview)?.label ?? rolePreview
    : t('menu.viewAs')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'h-9 gap-1.5 px-2 text-xs',
            isDark
              ? 'text-zinc-300 hover:bg-white/10 hover:text-white'
              : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950',
            rolePreview && (isDark ? 'text-amber-200 ring-1 ring-amber-300/30' : 'text-amber-700 ring-1 ring-amber-300')
          )}
        >
          <UserCog className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{currentLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className={cn('w-64', isDark ? 'border-white/10 bg-zinc-950 text-zinc-100' : 'border-zinc-200 bg-white text-zinc-950')}
        align="end"
      >
        <DropdownMenuLabel>
          {t('menu.rolePreview')}
          <p className={cn('mt-1 text-[10px] font-normal', isDark ? 'text-zinc-500' : 'text-zinc-500')}>
            {t('menu.note')}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className={isDark ? 'bg-white/10' : 'bg-zinc-200'} />
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            disabled={rolePreviewSaving}
            onClick={() => { void onApply(option.value) }}
            className="cursor-pointer"
          >
            <UserCog className="mr-2 h-4 w-4" />
            <span>{option.label}</span>
            {rolePreview === option.value && (
              <span
                className={cn(
                  'ml-auto text-[10px]',
                  isDark ? 'text-amber-200' : 'text-amber-700'
                )}
              >
                {t('menu.active')}
              </span>
            )}
          </DropdownMenuItem>
        ))}
        {rolePreview && (
          <>
            <DropdownMenuSeparator className={isDark ? 'bg-white/10' : 'bg-zinc-200'} />
            <DropdownMenuItem
              disabled={rolePreviewSaving}
              onClick={() => { void onApply(null) }}
              className="cursor-pointer"
            >
              {t('menu.clear')}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
