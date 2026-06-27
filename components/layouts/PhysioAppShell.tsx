'use client'

import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity,
  AlertTriangle,
  Ban,
  HeartPulse,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Stethoscope,
  Users,
} from 'lucide-react'
import { AthleteModeToggle } from '@/components/coach/AthleteModeToggle'
import { NotificationBell } from '@/components/calendar/NotificationsPanel'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from '@/i18n/client'
import { RoleAppShell, type RoleShellNavSection, type RoleShellUser } from './role-shell/RoleAppShell'

interface PhysioAppShellProps {
  children: ReactNode
  user: RoleShellUser | null
  businessSlug: string
  businessName: string
  businessLogo?: string | null
  businessColor?: string | null
}

export function PhysioAppShell({
  children,
  user,
  businessSlug,
  businessName,
  businessLogo,
  businessColor,
}: PhysioAppShellProps) {
  const router = useRouter()
  const t = useTranslations('components.physioHeader')
  const basePath = `/${businessSlug}/physio`
  const brandAccent = businessColor || '#059669'

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navSections: RoleShellNavSection[] = [
    {
      id: 'workspace',
      label: t('groups.workspace'),
      items: [
        { href: `${basePath}/dashboard`, label: t('nav.today'), icon: LayoutDashboard, exact: true },
        { href: `${basePath}/athletes`, label: t('nav.athletes'), icon: Users },
        { href: `${basePath}/treatments`, label: t('nav.treatments'), icon: Stethoscope },
        { href: `${basePath}/rehab-programs`, label: t('nav.rehab'), icon: Activity },
      ],
    },
    {
      id: 'care',
      label: t('groups.care'),
      items: [
        { href: `${basePath}/restrictions`, label: t('nav.restrictions'), icon: Ban },
        { href: `${basePath}/acute-reports`, label: t('nav.acuteReports'), icon: AlertTriangle },
        { href: `${basePath}/messages`, label: t('nav.careTeam'), icon: MessageSquare },
      ],
    },
    {
      id: 'account',
      label: t('groups.more'),
      items: [
        { href: `${basePath}/settings/athlete-profile`, label: t('nav.settings'), icon: Settings },
      ],
    },
  ]

  return (
    <RoleAppShell
      user={user}
      roleLabel={t('fallbackName')}
      navSections={navSections}
      brandName={businessName}
      brandInitial={businessName || t('fallbackName')}
      brandLogoUrl={businessLogo}
      brandAccent={brandAccent}
      homeHref={`${basePath}/dashboard`}
      settingsHref={`${basePath}/settings/athlete-profile`}
      topbarLeading={
        <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
          <HeartPulse className="h-3.5 w-3.5" />
          {t('portal')}
        </div>
      }
      topbarActions={
        <>
          <LanguageSwitcher showLabel={false} variant="ghost" />
          <NotificationBell />
        </>
      }
      userMenuExtras={<AthleteModeToggle variant="dropdown" />}
      mobilePanelExtras={
        <div className="flex items-center gap-1">
          <LanguageSwitcher showLabel={false} variant="ghost" />
          <NotificationBell />
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
