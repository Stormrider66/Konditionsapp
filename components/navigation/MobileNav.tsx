'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { SportType } from '@prisma/client'
import {
  Menu, X, Users, User as UserIcon, Users2, MessageSquare, Calendar, CalendarDays, Dumbbell,
  ClipboardList, TrendingUp, FlaskConical, CheckCircle, Droplet, LayoutDashboard, Video, Settings,
  Sparkles, FileStack, Activity, ChevronDown, TestTube, Brain, Wrench, Flame, Heart, Gauge, Ship, Gift, BarChart3, Shield, Building2
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { NotificationBell } from '@/components/calendar/NotificationsPanel'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserNav } from './UserNav'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { useTranslations } from '@/i18n/client'
import { getBusinessSlugFromPathname } from '@/lib/business-scope-client'
import { getAthleteTestsHref, getAthleteTestsNavMeta } from '@/lib/athlete-tests/navigation'

const SPORT_DISPLAY: Record<SportType, { icon: string; labelKey: string }> = {
  RUNNING: { icon: '🏃', labelKey: 'running' },
  CYCLING: { icon: '🚴', labelKey: 'cycling' },
  SKIING: { icon: '⛷️', labelKey: 'skiing' },
  TRIATHLON: { icon: '🏊', labelKey: 'triathlon' },
  HYROX: { icon: '💪', labelKey: 'hyrox' },
  GENERAL_FITNESS: { icon: '🏋️', labelKey: 'generalFitness' },
  FUNCTIONAL_FITNESS: { icon: '🔥', labelKey: 'functionalFitness' },
  SWIMMING: { icon: '🏊‍♂️', labelKey: 'swimming' },
  STRENGTH: { icon: '🏋️', labelKey: 'strength' },
  TEAM_FOOTBALL: { icon: '⚽', labelKey: 'football' },
  TEAM_ICE_HOCKEY: { icon: '🏒', labelKey: 'iceHockey' },
  TEAM_HANDBALL: { icon: '🤾', labelKey: 'handball' },
  TEAM_FLOORBALL: { icon: '🏑', labelKey: 'floorball' },
  TEAM_BASKETBALL: { icon: '🏀', labelKey: 'basketball' },
  TEAM_VOLLEYBALL: { icon: '🏐', labelKey: 'volleyball' },
  TENNIS: { icon: '🎾', labelKey: 'tennis' },
  PADEL: { icon: '🎾', labelKey: 'padel' },
  NUTRITION: { icon: '🥗', labelKey: 'nutrition' },
}

interface SportProfile {
  id: string
  clientId: string
  primarySport: SportType
  secondarySports: SportType[]
  onboardingCompleted: boolean
}

interface MobileNavProps {
  user: User | null
  userRole?: 'COACH' | 'ATHLETE' | 'ADMIN' | 'PHYSIO' | null
  sportProfile?: SportProfile | null
  clientId?: string
}

export function MobileNav({ user, userRole, sportProfile, clientId }: MobileNavProps) {
  const t = useTranslations('nav')
  const tCommon = useTranslations('common')
  const tCoachHeader = useTranslations('components.coachHeader')
  const tSports = useTranslations('sports')
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [businessContext, setBusinessContext] = useState<{
    role: string | null
    business: { slug: string; name: string } | null
  }>({ role: null, business: null })
  const pathname = usePathname()

  // Get sport display info
  const currentSport = sportProfile?.primarySport
  const sportDisplay = currentSport ? SPORT_DISPLAY[currentSport] : null
  const needsOnboarding = userRole === 'ATHLETE' && clientId && !sportProfile?.onboardingCompleted

  const toggleMenu = () => setIsOpen(!isOpen)
  const closeMenu = () => setIsOpen(false)

  useEffect(() => {
    if (user && (userRole === 'COACH' || userRole === 'ATHLETE')) {
      fetchUnreadCount()
      // Poll every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000)
      return () => clearInterval(interval)
    }
  }, [user, userRole])

  // Fetch business context for coaches
  useEffect(() => {
    if (user && (userRole === 'COACH' || userRole === 'ADMIN')) {
      fetchBusinessContext()
    }
  }, [user, userRole])

  async function fetchBusinessContext() {
    try {
      const response = await fetch('/api/coach/admin/context')
      const result = await response.json()
      if (response.ok && result.success && result.data) {
        setBusinessContext({
          role: result.data.role,
          business: result.data.business,
        })
      }
    } catch (error) {
      console.error('Error fetching business context:', error)
    }
  }

  // Check if user is a business admin (OWNER or ADMIN)
  const isBusinessAdmin = businessContext.role === 'OWNER' || businessContext.role === 'ADMIN'
  const businessSlug = businessContext.business?.slug
  const pathBusinessSlug = getBusinessSlugFromPathname(pathname)
  const basePath = pathBusinessSlug ? `/${pathBusinessSlug}` : businessSlug ? `/${businessSlug}` : ''
  const athleteTestsHref = getAthleteTestsHref(basePath, sportProfile)
  const athleteTestsMeta = getAthleteTestsNavMeta(sportProfile)
  const coachHref = (path: string) => basePath ? `${basePath}/coach${path}` : '/login'

  async function fetchUnreadCount() {
    try {
      const response = await fetch('/api/messages?filter=unread')
      const result = await response.json()
      if (response.ok && result.success) {
        setUnreadCount(result.data.length)
      }
    } catch (error) {
      console.error('Error fetching unread count:', error)
    }
  }

  // Simplified main navigation for coaches (desktop header)
  const mainNavLinks = [
    { href: coachHref('/dashboard'), label: t('mobile.dashboard'), icon: LayoutDashboard },
    { href: coachHref('/calendar'), label: t('mobile.calendar'), icon: CalendarDays },
    { href: coachHref('/clients'), label: t('mobile.athletes'), icon: Users },
    { href: coachHref('/programs'), label: t('mobile.programs'), icon: FileStack },
  ]

  // Grouped navigation for dropdown menus
  const navGroups = {
    tools: {
      label: t('mobile.tools'),
      icon: Wrench,
      items: [
        { href: coachHref('/test'), label: t('mobile.newTest'), icon: TestTube },
        { href: coachHref('/ai-studio'), label: t('mobile.aiStudio'), icon: Sparkles },
        { href: coachHref('/ai-canvas'), label: t('mobile.aiCanvas'), icon: Brain },
        { href: coachHref('/hybrid-studio'), label: t('mobile.hybridStudio'), icon: Flame },
        { href: coachHref('/strength'), label: t('mobile.strengthStudio'), icon: Dumbbell },
        { href: coachHref('/cardio'), label: t('mobile.cardioStudio'), icon: Heart },
        { href: coachHref('/ergometer-tests'), label: t('mobile.ergometerTests'), icon: Gauge },
        { href: coachHref('/video-analysis'), label: t('mobile.videoAnalysis'), icon: Video },
        { href: coachHref('/monitoring'), label: t('mobile.monitoring'), icon: Activity },
        { href: coachHref('/live-hr'), label: t('mobile.liveHr'), icon: Heart },
      ],
    },
    more: {
      label: t('mobile.more'),
      icon: Menu,
      items: [
        { href: coachHref('/analytics'), label: t('mobile.analytics'), icon: BarChart3 },
        { href: coachHref('/teams'), label: t('mobile.teams'), icon: Users2 },
        { href: coachHref('/organizations'), label: t('mobile.organizations'), icon: Building2 },
        { href: coachHref('/documents'), label: t('mobile.documents'), icon: FileStack },
        { href: coachHref('/messages'), label: t('mobile.messages'), icon: MessageSquare, badge: unreadCount },
        { href: coachHref('/referrals'), label: t('mobile.referrals'), icon: Gift },
        { href: coachHref('/settings/ai'), label: t('mobile.settings'), icon: Settings },
        // Business admin for OWNER/ADMIN members
        ...(isBusinessAdmin
          ? [{ href: coachHref('/admin'), label: tCoachHeader('nav.admin'), icon: Shield }]
          : []),
        // Platform admin only for ADMIN role users
        ...(userRole === 'ADMIN'
          ? [{ href: '/admin', label: tCoachHeader('nav.platformAdmin'), icon: Shield }]
          : []),
      ],
    },
  }

  // Mobile navigation - flat list with all items
  const mobileNavLinks = [
    { href: coachHref('/dashboard'), label: t('mobile.dashboard'), icon: LayoutDashboard },
    { href: coachHref('/calendar'), label: t('mobile.calendar'), icon: CalendarDays },
    { href: coachHref('/clients'), label: t('mobile.athletes'), icon: Users },
    { href: coachHref('/programs'), label: t('mobile.programs'), icon: FileStack },
    { href: coachHref('/test'), label: t('mobile.newTest'), icon: TestTube },
    { href: coachHref('/ai-studio'), label: t('mobile.aiStudio'), icon: Sparkles },
    { href: coachHref('/ai-canvas'), label: t('mobile.aiCanvas'), icon: Brain },
    { href: coachHref('/hybrid-studio'), label: t('mobile.hybridStudio'), icon: Flame },
    { href: coachHref('/strength'), label: t('mobile.strengthStudio'), icon: Dumbbell },
    { href: coachHref('/cardio'), label: t('mobile.cardioStudio'), icon: Heart },
    { href: coachHref('/ergometer-tests'), label: t('mobile.ergometerTests'), icon: Gauge },
    { href: coachHref('/video-analysis'), label: t('mobile.videoAnalysis'), icon: Video },
    { href: coachHref('/monitoring'), label: t('mobile.monitoring'), icon: Activity },
    { href: coachHref('/live-hr'), label: t('mobile.liveHr'), icon: Heart },
    { href: coachHref('/analytics'), label: t('mobile.analytics'), icon: BarChart3 },
    { href: coachHref('/teams'), label: t('mobile.teams'), icon: Users2 },
    { href: coachHref('/organizations'), label: t('mobile.organizations'), icon: Building2 },
    { href: coachHref('/documents'), label: t('mobile.documents'), icon: FileStack },
    { href: coachHref('/messages'), label: t('mobile.messages'), icon: MessageSquare, badge: unreadCount },
    { href: coachHref('/referrals'), label: t('mobile.referrals'), icon: Gift },
    { href: coachHref('/settings/ai'), label: t('mobile.settings'), icon: Settings },
    // Business admin for OWNER/ADMIN members
    ...(isBusinessAdmin ? [{ href: coachHref('/admin'), label: tCoachHeader('nav.admin'), icon: Shield }] : []),
    // Platform admin only for ADMIN role users
    ...(userRole === 'ADMIN' ? [{ href: '/admin', label: tCoachHeader('nav.platformAdmin'), icon: Shield }] : []),
  ]

  // Existing rendering code still expects these groups separately.
  const baseNavLinks = mainNavLinks

  // Athlete main navigation (desktop header - always visible)
  const athleteMainNavLinks = [
    { href: `${basePath}/athlete/dashboard`, label: t('mobile.dashboard'), icon: LayoutDashboard },
    { href: `${basePath}/athlete/check-in`, label: t('mobile.checkIn'), icon: CheckCircle },
    { href: `${basePath}/athlete/calendar`, label: t('mobile.calendar'), icon: Calendar },
  ]

  // Athlete grouped navigation for dropdowns
  const athleteNavGroups = {
    training: {
      label: t('mobile.training'),
      icon: Activity,
      items: [
        { href: `${basePath}/athlete/history`, label: t('mobile.history'), icon: TrendingUp },
        { href: `${basePath}/athlete/programs`, label: t('mobile.programs'), icon: Calendar },
        { href: `${basePath}/athlete/strength`, label: t('mobile.strengthTraining'), icon: Dumbbell },
        { href: `${basePath}/athlete/cardio`, label: t('mobile.cardioWorkout'), icon: Heart },
        { href: `${basePath}/athlete/hybrid`, label: t('mobile.hybridWorkout'), icon: Flame },
        { href: `${basePath}/athlete/vbt`, label: t('mobile.vbtData'), icon: Gauge },
        { href: `${basePath}/athlete/ergometer`, label: t('mobile.ergometer'), icon: Activity },
        { href: `${basePath}/athlete/concept2`, label: t('mobile.concept2'), icon: Ship },
        { href: `${basePath}/athlete/video-analysis`, label: t('mobile.videoAnalysis'), icon: Video },
      ],
    },
    more: {
      label: t('mobile.more'),
      icon: Menu,
      items: [
        { href: `${basePath}/athlete/profile`, label: t('mobile.myProfile'), icon: UserIcon },
        { href: athleteTestsHref, label: t('mobile.testsAndReports'), icon: FlaskConical },
        { href: `${basePath}/athlete/lactate/new`, label: t('mobile.lactateTest'), icon: Droplet },
        { href: `${basePath}/athlete/messages`, label: t('mobile.messages'), icon: MessageSquare, badge: unreadCount },
        { href: `${basePath}/athlete/settings`, label: t('mobile.settings'), icon: Settings },
        ...(needsOnboarding
          ? [{ href: `${basePath}/athlete/onboarding`, label: t('mobile.sportProfile'), icon: UserIcon }]
          : []),
      ],
    },
  }

  // Athlete mobile navigation - flat list with all items
  const athleteNavLinks = [
    // Dashboard & Overview
    { href: `${basePath}/athlete/dashboard`, label: t('mobile.dashboard'), icon: LayoutDashboard, description: t('mobile.descriptions.dashboard') },
    { href: `${basePath}/athlete/check-in`, label: t('mobile.checkIn'), icon: CheckCircle, description: t('mobile.descriptions.checkIn'), highlight: true },
    { href: `${basePath}/athlete/calendar`, label: t('mobile.calendar'), icon: Calendar, description: t('mobile.descriptions.calendar') },

    // Training & History
    { href: `${basePath}/athlete/history`, label: t('mobile.history'), icon: TrendingUp, description: t('mobile.descriptions.history') },
    { href: `${basePath}/athlete/programs`, label: t('mobile.programs'), icon: ClipboardList, description: t('mobile.descriptions.programs') },
    { href: `${basePath}/athlete/strength`, label: t('mobile.strengthTraining'), icon: Dumbbell, description: t('mobile.descriptions.strengthTraining') },
    { href: `${basePath}/athlete/cardio`, label: t('mobile.cardioWorkout'), icon: Heart, description: t('mobile.descriptions.cardioWorkout') },
    { href: `${basePath}/athlete/hybrid`, label: t('mobile.hybridWorkout'), icon: Flame, description: t('mobile.descriptions.hybridWorkout') },
    { href: `${basePath}/athlete/vbt`, label: t('mobile.vbtData'), icon: Gauge, description: t('mobile.descriptions.vbtData') },
    { href: `${basePath}/athlete/ergometer`, label: t('mobile.ergometer'), icon: Activity, description: t('mobile.descriptions.ergometer') },
    { href: `${basePath}/athlete/concept2`, label: t('mobile.concept2'), icon: Ship, description: t('mobile.descriptions.concept2') },
    { href: `${basePath}/athlete/video-analysis`, label: t('mobile.videoAnalysis'), icon: Video, description: t('mobile.descriptions.videoAnalysis') },

    // Tests & Data
    { href: athleteTestsHref, label: athleteTestsMeta.label, icon: FlaskConical, description: athleteTestsMeta.description },
    { href: `${basePath}/athlete/lactate/new`, label: t('mobile.lactateTest'), icon: Droplet, description: t('mobile.descriptions.lactateTest') },

    // Communication
    { href: `${basePath}/athlete/messages`, label: t('mobile.messages'), icon: MessageSquare, badge: unreadCount, description: t('mobile.descriptions.messages') },

    // Settings & Profile
    { href: `${basePath}/athlete/settings`, label: t('mobile.settings'), icon: Settings, description: t('mobile.descriptions.settings') },
    { href: `${basePath}/athlete/profile`, label: t('mobile.myProfile'), icon: UserIcon, description: t('mobile.descriptions.myProfile') },

    // Sport Profile (only show if needs onboarding)
    ...(needsOnboarding
      ? [{ href: `${basePath}/athlete/onboarding`, label: t('mobile.sportProfile'), icon: UserIcon, description: t('mobile.descriptions.sportProfile'), highlight: true }]
      : []),
  ]

  // Determine which links to show for mobile
  let navLinks = baseNavLinks
  if (userRole === 'COACH' || userRole === 'ADMIN') {
    navLinks = mobileNavLinks
  } else if (userRole === 'ATHLETE') {
    navLinks = athleteNavLinks
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden gradient-primary text-white shadow-lg sticky top-0 z-50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMenu}
                className="p-2 hover:bg-white/10 rounded-lg transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label={tCoachHeader('menu.toggleMenu')}
              >
                {isOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
              <div>
                <h1 className="text-lg sm:text-xl font-bold">{tCommon('appName')}</h1>
                {userRole === 'ATHLETE' && sportDisplay && (
                  <p className="text-xs text-white/80 flex items-center gap-1">
                    <span>{sportDisplay.icon}</span>
                    <span>{tSports(sportDisplay.labelKey)}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <LanguageSwitcher showLabel={false} variant="ghost" />
              {(userRole === 'COACH' || userRole === 'ATHLETE') && (
                <NotificationBell clientId={clientId} />
              )}
              <UserNav user={user} />
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isOpen && (
          <div className="bg-white border-t border-gray-200 shadow-lg">
            <nav className="py-2">
              {navLinks.map((link) => {
                const Icon = link.icon
                const active = isActive(link.href)
                const badge = (link as any).badge
                const highlight = (link as any).highlight
                const description = (link as any).description
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMenu}
                    className={`flex items-center gap-4 px-6 py-4 transition min-h-[60px] ${
                      active
                        ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                        : highlight
                        ? 'text-gray-700 hover:bg-green-50 active:bg-green-100 border-l-4 border-green-500'
                        : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <Icon className={`w-6 h-6 ${highlight && !active ? 'text-green-600' : ''}`} />
                      {badge > 0 && (
                        <Badge
                          variant="destructive"
                          className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-[10px] min-w-[20px]"
                        >
                          {badge > 9 ? '9+' : badge}
                        </Badge>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-base leading-snug">{link.label}</div>
                      {description && userRole === 'ATHLETE' && (
                        <div className="text-xs text-muted-foreground mt-1 leading-snug">{description}</div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Desktop Header */}
      <header className="hidden lg:block gradient-primary text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">{tCommon('appName')}</h1>
              <p className="text-white/80 text-sm">{tCommon('appTagline')}</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Main nav links */}
              {(userRole === 'COACH' || userRole === 'ADMIN') ? (
                <>
                  {mainNavLinks.map((link) => {
                    const Icon = link.icon
                    const active = isActive(link.href)
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition text-sm ${
                          active ? 'bg-white/20' : 'hover:bg-white/10'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="font-medium">{link.label}</span>
                      </Link>
                    )
                  })}

                  {/* Tools Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 px-3 py-2 rounded-lg transition text-sm hover:bg-white/10">
                        <navGroups.tools.icon className="w-4 h-4" />
                        <span className="font-medium">{navGroups.tools.label}</span>
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {navGroups.tools.items.map((item) => {
                        const Icon = item.icon
                        return (
                          <DropdownMenuItem key={item.href} asChild>
                            <Link href={item.href} className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              {item.label}
                            </Link>
                          </DropdownMenuItem>
                        )
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* More Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 px-3 py-2 rounded-lg transition text-sm hover:bg-white/10 relative">
                        <Menu className="w-4 h-4" />
                        <span className="font-medium">{t('mobile.more')}</span>
                        <ChevronDown className="w-3 h-3" />
                        {unreadCount > 0 && (
                          <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-[10px]"
                          >
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </Badge>
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {navGroups.more.items.map((item) => {
                        const Icon = item.icon
                        const badge = (item as any).badge
                        return (
                          <DropdownMenuItem key={item.href} asChild>
                            <Link href={item.href} className="flex items-center gap-2 justify-between">
                              <span className="flex items-center gap-2">
                                <Icon className="w-4 h-4" />
                                {item.label}
                              </span>
                              {badge > 0 && (
                                <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                                  {badge > 9 ? '9+' : badge}
                                </Badge>
                              )}
                            </Link>
                          </DropdownMenuItem>
                        )
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : userRole === 'ATHLETE' ? (
                /* Athlete navigation with dropdowns */
                <>
                  {athleteMainNavLinks.map((link) => {
                    const Icon = link.icon
                    const active = isActive(link.href)
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition text-sm ${
                          active ? 'bg-white/20' : 'hover:bg-white/10'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="font-medium">{link.label}</span>
                      </Link>
                    )
                  })}

                  {/* Training Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 px-3 py-2 rounded-lg transition text-sm hover:bg-white/10">
                        <athleteNavGroups.training.icon className="w-4 h-4" />
                        <span className="font-medium">{athleteNavGroups.training.label}</span>
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {athleteNavGroups.training.items.map((item) => {
                        const Icon = item.icon
                        return (
                          <DropdownMenuItem key={item.href} asChild>
                            <Link href={item.href} className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              {item.label}
                            </Link>
                          </DropdownMenuItem>
                        )
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* More Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 px-3 py-2 rounded-lg transition text-sm hover:bg-white/10 relative">
                        <Menu className="w-4 h-4" />
                        <span className="font-medium">{t('mobile.more')}</span>
                        <ChevronDown className="w-3 h-3" />
                        {unreadCount > 0 && (
                          <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-[10px]"
                          >
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </Badge>
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {athleteNavGroups.more.items.map((item) => {
                        const Icon = item.icon
                        const badge = (item as any).badge
                        return (
                          <DropdownMenuItem key={item.href} asChild>
                            <Link href={item.href} className="flex items-center gap-2 justify-between">
                              <span className="flex items-center gap-2">
                                <Icon className="w-4 h-4" />
                                {item.label}
                              </span>
                              {badge > 0 && (
                                <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                                  {badge > 9 ? '9+' : badge}
                                </Badge>
                              )}
                            </Link>
                          </DropdownMenuItem>
                        )
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                /* Other users - simple nav */
                navLinks.map((link) => {
                  const Icon = link.icon
                  const active = isActive(link.href)
                  const badge = (link as any).badge
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition text-sm relative ${
                        active ? 'bg-white/20' : 'hover:bg-white/10'
                      }`}
                    >
                      <div className="relative">
                        <Icon className="w-4 h-4" />
                        {badge > 0 && (
                          <Badge
                            variant="destructive"
                            className="absolute -top-2 -right-2 h-4 w-4 flex items-center justify-center p-0 text-[10px]"
                          >
                            {badge > 9 ? '9+' : badge}
                          </Badge>
                        )}
                      </div>
                      <span className="font-medium">{link.label}</span>
                    </Link>
                  )
                })
              )}
              <div className="border-l border-white/20 pl-3 ml-2 flex items-center gap-2">
                <LanguageSwitcher showLabel={false} variant="ghost" />
                {(userRole === 'COACH' || userRole === 'ATHLETE') && (
                  <NotificationBell clientId={clientId} />
                )}
                <UserNav user={user} />
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  )
}
