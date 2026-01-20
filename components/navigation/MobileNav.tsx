'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { SportType } from '@prisma/client'
import {
  Menu, X, Users, Plus, User as UserIcon, Users2, MessageSquare, Calendar, CalendarDays, Dumbbell,
  ClipboardList, TrendingUp, FlaskConical, CheckCircle, Droplet, FileText, LayoutDashboard, Video, Settings,
  Sparkles, FileStack, Activity, ChevronDown, TestTube, Brain, Wrench, Flame, Heart, Gauge, Ship, Bell, Gift, BarChart3, Shield, Building2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NotificationBell } from '@/components/calendar/NotificationsPanel'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserNav } from './UserNav'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { useTranslations } from '@/i18n/client'

// Sport icons and labels
const SPORT_DISPLAY: Record<SportType, { icon: string; label: string; labelSv: string }> = {
  RUNNING: { icon: '🏃', label: 'Running', labelSv: 'Löpning' },
  CYCLING: { icon: '🚴', label: 'Cycling', labelSv: 'Cykling' },
  SKIING: { icon: '⛷️', label: 'Cross-Country Skiing', labelSv: 'Längdskidåkning' },
  TRIATHLON: { icon: '🏊', label: 'Triathlon', labelSv: 'Triathlon' },
  HYROX: { icon: '💪', label: 'HYROX', labelSv: 'HYROX' },
  GENERAL_FITNESS: { icon: '🏋️', label: 'General Fitness', labelSv: 'Allmän Fitness' },
  FUNCTIONAL_FITNESS: { icon: '🔥', label: 'Functional Fitness', labelSv: 'Funktionell Fitness' },
  SWIMMING: { icon: '🏊‍♂️', label: 'Swimming', labelSv: 'Simning' },
  STRENGTH: { icon: '🏋️', label: 'Strength Training', labelSv: 'Styrketräning' },
  TEAM_FOOTBALL: { icon: '⚽', label: 'Football', labelSv: 'Fotboll' },
  TEAM_ICE_HOCKEY: { icon: '🏒', label: 'Ice Hockey', labelSv: 'Ishockey' },
  TEAM_HANDBALL: { icon: '🤾', label: 'Handball', labelSv: 'Handboll' },
  TEAM_FLOORBALL: { icon: '🏑', label: 'Floorball', labelSv: 'Innebandy' },
  TEAM_BASKETBALL: { icon: '🏀', label: 'Basketball', labelSv: 'Basket' },
  TEAM_VOLLEYBALL: { icon: '🏐', label: 'Volleyball', labelSv: 'Volleyboll' },
  TENNIS: { icon: '🎾', label: 'Tennis', labelSv: 'Tennis' },
  PADEL: { icon: '🎾', label: 'Padel', labelSv: 'Padel' },
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
  userRole?: 'COACH' | 'ATHLETE' | 'ADMIN' | null
  sportProfile?: SportProfile | null
  clientId?: string
}

export function MobileNav({ user, userRole, sportProfile, clientId }: MobileNavProps) {
  const t = useTranslations('nav')
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
    { href: '/coach/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/coach/calendar', label: 'Kalender', icon: CalendarDays },
    { href: '/clients', label: 'Atleter', icon: Users },
    { href: '/coach/programs', label: 'Program', icon: FileStack },
  ]

  // Grouped navigation for dropdown menus
  const navGroups = {
    tools: {
      label: 'Verktyg',
      icon: Wrench,
      items: [
        { href: '/test', label: 'Nytt Test', icon: TestTube },
        { href: '/coach/ai-studio', label: 'AI Studio', icon: Sparkles },
        { href: '/coach/hybrid-studio', label: 'Hybrid Studio', icon: Flame },
        { href: '/coach/strength', label: 'Strength Studio', icon: Dumbbell },
        { href: '/coach/cardio', label: 'Cardio Studio', icon: Heart },
        { href: '/coach/ergometer-tests', label: 'Ergometertester', icon: Gauge },
        { href: '/coach/video-analysis', label: 'Videoanalys', icon: Video },
        { href: '/coach/monitoring', label: 'Monitorering', icon: Activity },
        { href: '/coach/live-hr', label: 'Live HR', icon: Heart },
      ],
    },
    more: {
      label: 'Mer',
      icon: Menu,
      items: [
        { href: '/coach/analytics', label: 'Analys', icon: BarChart3 },
        { href: '/teams', label: 'Lag', icon: Users2 },
        { href: '/coach/organizations', label: 'Organisationer', icon: Building2 },
        { href: '/coach/documents', label: 'Dokument', icon: FileStack },
        { href: '/coach/messages', label: 'Meddelanden', icon: MessageSquare, badge: unreadCount },
        { href: '/coach/referrals', label: 'Värvningar', icon: Gift },
        { href: '/coach/settings/ai', label: 'Inställningar', icon: Settings },
        // Business admin for OWNER/ADMIN members
        ...(isBusinessAdmin && businessSlug ? [{ href: `/${businessSlug}/coach/admin`, label: 'Admin', icon: Shield }] : []),
        // Platform admin only for ADMIN role users
        ...(userRole === 'ADMIN' ? [{ href: '/admin', label: 'Platform Admin', icon: Shield }] : []),
      ],
    },
  }

  // Mobile navigation - flat list with all items
  const mobileNavLinks = [
    { href: '/coach/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/coach/calendar', label: 'Kalender', icon: CalendarDays },
    { href: '/clients', label: 'Atleter', icon: Users },
    { href: '/coach/programs', label: 'Program', icon: FileStack },
    { href: '/test', label: 'Nytt Test', icon: TestTube },
    { href: '/coach/ai-studio', label: 'AI Studio', icon: Sparkles },
    { href: '/coach/hybrid-studio', label: 'Hybrid Studio', icon: Flame },
    { href: '/coach/strength', label: 'Strength Studio', icon: Dumbbell },
    { href: '/coach/cardio', label: 'Cardio Studio', icon: Heart },
    { href: '/coach/ergometer-tests', label: 'Ergometertester', icon: Gauge },
    { href: '/coach/video-analysis', label: 'Videoanalys', icon: Video },
    { href: '/coach/monitoring', label: 'Monitorering', icon: Activity },
    { href: '/coach/live-hr', label: 'Live HR', icon: Heart },
    { href: '/coach/analytics', label: 'Analys', icon: BarChart3 },
    { href: '/teams', label: 'Lag', icon: Users2 },
    { href: '/coach/organizations', label: 'Organisationer', icon: Building2 },
    { href: '/coach/documents', label: 'Dokument', icon: FileStack },
    { href: '/coach/messages', label: 'Meddelanden', icon: MessageSquare, badge: unreadCount },
    { href: '/coach/referrals', label: 'Värvningar', icon: Gift },
    { href: '/coach/settings/ai', label: 'Inställningar', icon: Settings },
    // Business admin for OWNER/ADMIN members
    ...(isBusinessAdmin && businessSlug ? [{ href: `/${businessSlug}/coach/admin`, label: 'Admin', icon: Shield }] : []),
    // Platform admin only for ADMIN role users
    ...(userRole === 'ADMIN' ? [{ href: '/admin', label: 'Platform Admin', icon: Shield }] : []),
  ]

  // Legacy base + coach links for backwards compatibility
  const baseNavLinks = mainNavLinks
  const coachNavLinks = [] as typeof mainNavLinks

  // Athlete main navigation (desktop header - always visible)
  const athleteMainNavLinks = [
    { href: '/athlete/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/athlete/check-in', label: 'Check-in', icon: CheckCircle },
    { href: '/athlete/calendar', label: 'Kalender', icon: Calendar },
  ]

  // Athlete grouped navigation for dropdowns
  const athleteNavGroups = {
    training: {
      label: 'Träning',
      icon: Activity,
      items: [
        { href: '/athlete/history', label: 'Historik', icon: TrendingUp },
        { href: '/athlete/programs', label: 'Program', icon: Calendar },
        { href: '/athlete/strength', label: 'Styrketräning', icon: Dumbbell },
        { href: '/athlete/cardio', label: 'Cardio Pass', icon: Heart },
        { href: '/athlete/hybrid', label: 'Hybrid Pass', icon: Flame },
        { href: '/athlete/vbt', label: 'VBT Data', icon: Gauge },
        { href: '/athlete/ergometer', label: 'Ergometer', icon: Activity },
        { href: '/athlete/concept2', label: 'Concept2', icon: Ship },
        { href: '/athlete/video-analysis', label: 'Videoanalys', icon: Video },
      ],
    },
    more: {
      label: 'Mer',
      icon: Menu,
      items: [
        { href: '/athlete/profile', label: 'Min Profil', icon: UserIcon },
        { href: '/athlete/tests', label: 'Tester & Rapporter', icon: FlaskConical },
        { href: '/athlete/lactate/new', label: 'Laktattest', icon: Droplet },
        { href: '/athlete/messages', label: 'Meddelanden', icon: MessageSquare, badge: unreadCount },
        { href: '/athlete/settings', label: 'Inställningar', icon: Settings },
        ...(needsOnboarding
          ? [{ href: '/athlete/onboarding', label: 'Sportprofil', icon: UserIcon }]
          : []),
      ],
    },
  }

  // Athlete mobile navigation - flat list with all items
  const athleteNavLinks = [
    // Dashboard & Overview
    { href: '/athlete/dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Översikt & idag' },
    { href: '/athlete/check-in', label: 'Check-in', icon: CheckCircle, description: 'Daglig readiness', highlight: true },
    { href: '/athlete/calendar', label: 'Kalender', icon: Calendar, description: 'Träning, tävlingar & händelser' },

    // Training & History
    { href: '/athlete/history', label: 'Historik', icon: TrendingUp, description: 'Träningshistorik' },
    { href: '/athlete/programs', label: 'Program', icon: ClipboardList, description: 'Dina träningsprogram' },
    { href: '/athlete/strength', label: 'Styrketräning', icon: Dumbbell, description: 'Styrkepass & mallar' },
    { href: '/athlete/cardio', label: 'Cardio Pass', icon: Heart, description: 'Löpning, cykling & kondition' },
    { href: '/athlete/hybrid', label: 'Hybrid Pass', icon: Flame, description: 'AMRAP, EMOM & CrossFit' },
    { href: '/athlete/vbt', label: 'VBT Data', icon: Gauge, description: 'Hastighetsbaserad styrketräning' },
    { href: '/athlete/ergometer', label: 'Ergometer', icon: Activity, description: 'Rodd, SkiErg, Wattbike & Air Bike' },
    { href: '/athlete/concept2', label: 'Concept2', icon: Ship, description: 'RowErg, SkiErg & BikeErg' },
    { href: '/athlete/video-analysis', label: 'Videoanalys', icon: Video, description: 'Teknikanalys & feedback' },

    // Tests & Data
    { href: '/athlete/tests', label: 'Tester & Rapporter', icon: FlaskConical, description: 'Testresultat och rapporter' },
    { href: '/athlete/lactate/new', label: 'Laktattest', icon: Droplet, description: 'Rapportera laktat' },

    // Communication
    { href: '/athlete/messages', label: 'Meddelanden', icon: MessageSquare, badge: unreadCount, description: 'Chatta med coach' },

    // Settings & Profile
    { href: '/athlete/settings', label: 'Inställningar', icon: Settings, description: 'Tema & inställningar' },
    { href: '/athlete/profile', label: 'Min Profil', icon: UserIcon, description: 'Fysiologi, prestanda & mål' },

    // Sport Profile (only show if needs onboarding)
    ...(needsOnboarding
      ? [{ href: `/athlete/onboarding`, label: 'Sportprofil', icon: UserIcon, description: 'Slutför din profil', highlight: true }]
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
                aria-label="Toggle menu"
              >
                {isOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
              <div>
                <h1 className="text-lg sm:text-xl font-bold">Star by Thomson</h1>
                {userRole === 'ATHLETE' && sportDisplay && (
                  <p className="text-xs text-white/80 flex items-center gap-1">
                    <span>{sportDisplay.icon}</span>
                    <span>{sportDisplay.labelSv}</span>
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
              <h1 className="text-2xl font-bold">Star by Thomson</h1>
              <p className="text-white/80 text-sm">Konditionstest & Träningsplanering</p>
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
                        <span className="font-medium">Mer</span>
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
                        <span className="font-medium">Mer</span>
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
