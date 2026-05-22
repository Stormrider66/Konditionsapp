'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useBusinessBrandingOptional } from '@/lib/contexts/BusinessBrandingContext'
import {
    LayoutDashboard,
    Users,
    CalendarDays,
    Menu,
    LogOut,
    Settings,
    Wrench,
    Sparkles,
    Flame,
    Dumbbell,
    Heart,
    Gauge,
    Video,
    Activity,
    BarChart3,
    Users2,
    Building2,
    FileStack,
    MessageSquare,
    Gift,
    Shield,
    ChevronDown,
    Zap,
    Timer,
    UserPlus,
    Share2,
    Trophy,
    Megaphone,
    UserCog,
} from 'lucide-react'
import type { BusinessMemberRole } from '@/types'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { NotificationBell } from '@/components/calendar/NotificationsPanel'
import { AthleteModeToggle } from '@/components/coach/AthleteModeToggle'
import { OrgSwitcher } from '@/components/coach/OrgSwitcher'
import { useTranslations } from '@/i18n/client'
import { useWorkoutThemeOptional } from '@/lib/themes/ThemeProvider'

interface BusinessCoachGlassHeaderProps {
    user: {
        email?: string | null
        user_metadata?: {
            avatar_url?: string | null
        }
    } | null
    businessSlug: string
}

export function BusinessCoachGlassHeader({ user, businessSlug }: BusinessCoachGlassHeaderProps) {
    const pathname = usePathname()
    const router = useRouter()
    const branding = useBusinessBrandingOptional()
    const themeContext = useWorkoutThemeOptional()
    const appIsDark = themeContext?.appTheme?.id === 'FITAPP_DARK'
    const usesModernHeader = branding?.headerVariant === 'modern'
    const headerIsDark = appIsDark || !usesModernHeader
    const tBusinessCoachHeader = useTranslations('components.businessCoachHeader')
    const [isOpen, setIsOpen] = useState(false)
    const [businessRole, setBusinessRole] = useState<BusinessMemberRole | null>(null)
    const [businessName, setBusinessName] = useState<string | null>(branding?.businessName ?? null)
    const [platformAdminRole, setPlatformAdminRole] = useState<string | null>(null)
    const [rolePreview, setRolePreview] = useState<string | null>(null)
    const [rolePreviewSaving, setRolePreviewSaving] = useState(false)
    const [dashboardMode, setDashboardMode] = useState<'PT' | 'TEAM' | 'GYM'>('PT')
    const [staffRole, setStaffRole] = useState<string>('COACH')
    const displayName = user?.email || tBusinessCoachHeader('fallbackName')

    // Prefer the branding context (populated server-side at layout level) — falls back to fetched name.
    const resolvedName = branding?.businessName || businessName
    const logoUrl = branding?.logoUrl ?? null
    const primaryColor = branding?.primaryColor ?? null
    const secondaryColor = branding?.secondaryColor ?? null
    const brandAccent = primaryColor || '#3b82f6'
    const logoAlt = tBusinessCoachHeader('brand.logoAlt')
    const portalName = tBusinessCoachHeader('brand.portalName')
    const brandInitial = tBusinessCoachHeader('brand.initial')
    const headerClassName = cn(
        'fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md transition-all duration-300',
        headerIsDark
            ? 'border-white/5 bg-slate-950/50'
            : 'border-black/10 bg-white/90 text-slate-950 shadow-sm'
    )
    const navLinkClassName = (isActive: boolean) => cn(
        'text-sm font-medium transition-colors flex items-center gap-2',
        isActive
            ? headerIsDark ? 'text-white' : 'text-slate-950'
            : headerIsDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-950'
    )
    const dropdownContentClassName = cn(
        'w-56',
        headerIsDark
            ? 'bg-slate-900 border-white/10 text-slate-200'
            : 'bg-white border-slate-200 text-slate-900 shadow-lg'
    )
    const dropdownItemClassName = cn(
        'cursor-pointer',
        headerIsDark ? 'focus:bg-white/10 focus:text-white' : 'focus:bg-slate-100 focus:text-slate-950'
    )
    const separatorClassName = headerIsDark ? 'bg-white/10' : 'bg-slate-200'
    const desktopControlsClassName = headerIsDark ? 'text-slate-200' : 'text-slate-700'

    // Base path for all business-scoped routes
    const basePath = `/${businessSlug}`
    const rolePreviewOptions = [
        { value: 'OWNER', label: tBusinessCoachHeader('roles.owner') },
        { value: 'ADMIN', label: tBusinessCoachHeader('roles.admin') },
        { value: 'COACH', label: tBusinessCoachHeader('roles.coach') },
        { value: 'PHYSICAL_TRAINER', label: tBusinessCoachHeader('roles.physicalTrainer') },
        { value: 'ASSISTANT_COACH', label: tBusinessCoachHeader('roles.assistantCoach') },
        { value: 'PHYSIO', label: tBusinessCoachHeader('roles.physio') },
        { value: 'MEMBER', label: tBusinessCoachHeader('roles.member') },
    ]

    // Fetch business context and dashboard mode
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
                console.error('[BusinessContext] Failed to fetch:', err)
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

    // Top Level Links - using business-scoped URLs
    const mainNavItems = [
        { href: `${basePath}/coach/dashboard`, label: tBusinessCoachHeader('nav.dashboard'), icon: LayoutDashboard },
        { href: `${basePath}/coach/calendar`, label: tBusinessCoachHeader('nav.calendar'), icon: CalendarDays },
        { href: `${basePath}/coach/clients`, label: tBusinessCoachHeader('nav.athletes'), icon: Users },
        { href: `${basePath}/coach/programs`, label: tBusinessCoachHeader('nav.programs'), icon: FileStack },
    ]

    // All tool items
    const allToolItems = {
        test: { href: `${basePath}/coach/test`, label: tBusinessCoachHeader('nav.test'), icon: Activity },
        testOverview: { href: `${basePath}/coach/test-overview`, label: tBusinessCoachHeader('nav.testOverview'), icon: BarChart3 },
        aiStudio: { href: `${basePath}/coach/ai-studio`, label: tBusinessCoachHeader('nav.aiStudio'), icon: Sparkles },
        aiCanvas: { href: `${basePath}/coach/ai-canvas`, label: tBusinessCoachHeader('nav.aiCanvas'), icon: FileStack },
        hybrid: { href: `${basePath}/coach/hybrid-studio`, label: tBusinessCoachHeader('nav.hybridStudio'), icon: Flame },
        strength: { href: `${basePath}/coach/strength`, label: tBusinessCoachHeader('nav.strengthStudio'), icon: Dumbbell },
        cardio: { href: `${basePath}/coach/cardio`, label: tBusinessCoachHeader('nav.cardioStudio'), icon: Heart },
        agility: { href: `${basePath}/coach/agility-studio`, label: tBusinessCoachHeader('nav.agilityStudio'), icon: Zap },
        ergometer: { href: `${basePath}/coach/ergometer-tests`, label: tBusinessCoachHeader('nav.ergometerTests'), icon: Gauge },
        video: { href: `${basePath}/coach/video-analysis`, label: tBusinessCoachHeader('nav.videoAnalysis'), icon: Video },
        monitoring: { href: `${basePath}/coach/monitoring`, label: tBusinessCoachHeader('nav.monitoring'), icon: Activity },
        liveHR: { href: `${basePath}/coach/live-hr`, label: tBusinessCoachHeader('nav.liveHr'), icon: Heart },
        intervals: { href: `${basePath}/coach/interval-sessions`, label: tBusinessCoachHeader('nav.intervals'), icon: Timer },
        drills: { href: `${basePath}/coach/drills`, label: tBusinessCoachHeader('nav.drills'), icon: FileStack },
        hockeyTests: { href: `${basePath}/coach/hockey-tests`, label: tBusinessCoachHeader('nav.hockeyTests'), icon: Shield },
        testProtocols: { href: `${basePath}/coach/test-protocols`, label: tBusinessCoachHeader('nav.testProtocols'), icon: FileStack },
    }

    // All "more" items
    const allMoreItems = {
        staff: { href: `${basePath}/coach/staff`, label: tBusinessCoachHeader('nav.staff'), icon: Shield },
        social: { href: `${basePath}/coach/social`, label: tBusinessCoachHeader('nav.socialMedia'), icon: Share2 },
        competitions: { href: `${basePath}/coach/competitions`, label: tBusinessCoachHeader('nav.challenges'), icon: Trophy },
        community: { href: `${basePath}/coach/community`, label: tBusinessCoachHeader('nav.community'), icon: Megaphone },
        analytics: { href: `${basePath}/coach/analytics`, label: tBusinessCoachHeader('nav.analytics'), icon: BarChart3 },
        teams: { href: `${basePath}/coach/teams`, label: tBusinessCoachHeader('nav.teams'), icon: Users2 },
        browse: { href: `${basePath}/coach/browse-athletes`, label: tBusinessCoachHeader('nav.browseAthletes'), icon: UserPlus },
        orgs: { href: `${basePath}/coach/organizations`, label: tBusinessCoachHeader('nav.organizations'), icon: Building2 },
        docs: { href: `${basePath}/coach/documents`, label: tBusinessCoachHeader('nav.documents'), icon: FileStack },
        messages: { href: `${basePath}/coach/messages`, label: tBusinessCoachHeader('nav.messages'), icon: MessageSquare },
        referrals: { href: `${basePath}/coach/referrals`, label: tBusinessCoachHeader('nav.referrals'), icon: Gift },
        settings: { href: `${basePath}/coach/settings`, label: tBusinessCoachHeader('nav.settings'), icon: Settings },
    }

    // Mode-specific tool items
    const toolsByMode: Record<string, typeof allToolItems[keyof typeof allToolItems][]> = {
        PT: [
            allToolItems.test, allToolItems.testOverview, allToolItems.strength, allToolItems.cardio,
            allToolItems.hybrid, allToolItems.agility,
            allToolItems.intervals, allToolItems.aiStudio, allToolItems.aiCanvas,
        ],
        TEAM: [
            allToolItems.test, allToolItems.testOverview, allToolItems.strength, allToolItems.cardio,
            allToolItems.hybrid, allToolItems.agility, allToolItems.intervals,
            allToolItems.drills, allToolItems.hockeyTests, allToolItems.testProtocols,
            allToolItems.monitoring, allToolItems.liveHR, allToolItems.aiCanvas,
        ],
        GYM: [
            allToolItems.test, allToolItems.testOverview, allToolItems.strength, allToolItems.cardio,
            allToolItems.hybrid, allToolItems.ergometer, allToolItems.aiStudio, allToolItems.aiCanvas,
        ],
    }

    // Mode-specific "more" items (prioritized) + remaining items
    const moreByMode: Record<string, typeof allMoreItems[keyof typeof allMoreItems][]> = {
        PT: [
            allMoreItems.community, allMoreItems.competitions, allMoreItems.messages, allMoreItems.settings,
        ],
        TEAM: [
            allMoreItems.staff, allMoreItems.teams, allMoreItems.messages, allMoreItems.settings,
        ],
        GYM: [
            allMoreItems.community, allMoreItems.competitions, allMoreItems.messages, allMoreItems.settings,
        ],
    }

    // Items restricted for non-admin/owner roles
    const isAdmin = businessRole === 'OWNER' || businessRole === 'ADMIN'

    // Role-based menu filtering
    const hiddenToolHrefs = new Set<string>()
    const hiddenMoreHrefs = new Set<string>()

    if (staffRole === 'ASSISTANT_COACH') {
        // Assistants: no AI, no video, no ergometer
        hiddenToolHrefs.add(allToolItems.aiStudio.href)
        hiddenToolHrefs.add(allToolItems.aiCanvas.href)
        hiddenToolHrefs.add(allToolItems.ergometer.href)
        hiddenToolHrefs.add(allToolItems.video.href)
        hiddenMoreHrefs.add(allMoreItems.settings.href)
        hiddenMoreHrefs.add(allMoreItems.referrals.href)
        hiddenMoreHrefs.add(allMoreItems.orgs.href)
        hiddenMoreHrefs.add(allMoreItems.browse.href)
    } else if (staffRole === 'PHYSICAL_TRAINER') {
        // Fystränare: has studios and AI, no settings/billing
        hiddenMoreHrefs.add(allMoreItems.settings.href)
        hiddenMoreHrefs.add(allMoreItems.referrals.href)
        hiddenMoreHrefs.add(allMoreItems.orgs.href)
    } else if (staffRole === 'PHYSIO') {
        // Physio: limited to medical tools
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

    // Staff management only visible to ADMIN/OWNER
    if (!isAdmin) {
        hiddenMoreHrefs.add(allMoreItems.staff.href)
    }

    // Get prioritized items, then add remaining ones not already included
    const prioritizedTools = (toolsByMode[dashboardMode] || toolsByMode.PT).filter((t) => !hiddenToolHrefs.has(t.href))
    const allToolValues = Object.values(allToolItems).filter((t) => !hiddenToolHrefs.has(t.href))
    const remainingTools = allToolValues.filter((t) => !prioritizedTools.some((p) => p.href === t.href))

    const prioritizedMore = (moreByMode[dashboardMode] || moreByMode.PT).filter((m) => !hiddenMoreHrefs.has(m.href))
    const allMoreValues = Object.values(allMoreItems).filter((m) => !hiddenMoreHrefs.has(m.href))
    const remainingMore = allMoreValues.filter((m) => !prioritizedMore.some((p) => p.href === m.href))

    // Dropdown Groups
    const navGroups = {
        tools: {
            label: tBusinessCoachHeader('groups.tools'),
            icon: Wrench,
            items: [...prioritizedTools, ...remainingTools],
        },
        more: {
            label: tBusinessCoachHeader('groups.more'),
            icon: Menu,
            items: [...prioritizedMore, ...remainingMore],
        }
    }

    // Compute more items with optional Admin link
    // Admin links
    const adminLinks = [
        ...((businessRole === 'OWNER' || businessRole === 'ADMIN')
            ? [{ href: `${basePath}/coach/admin`, label: tBusinessCoachHeader('nav.admin'), icon: Shield }]
            : []),
        ...(platformAdminRole
            ? [{ href: '/admin', label: tBusinessCoachHeader('nav.platformAdmin'), icon: Shield }]
            : [])
    ]

    const moreItems = [
        ...prioritizedMore,
        ...remainingMore,
        ...adminLinks,
    ]

    // Build sets of prioritized hrefs for mobile rendering
    // Mobile: prioritized items first, then separator, then remaining
    const mobilePrioritized = [
        ...mainNavItems,
        ...prioritizedTools,
        ...prioritizedMore,
        ...adminLinks,
    ]
    const mobileRemaining = [
        ...remainingTools,
        ...remainingMore,
    ]

    return (
        <header className={headerClassName}>
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">

                {/* Logo Area */}
                <div className="flex items-center gap-4">
                    <Link href={`${basePath}/coach/dashboard`} className="flex items-center gap-2 group">
                        {logoUrl ? (
                            <div
                                className={cn(
                                    'w-10 h-10 rounded-lg overflow-hidden ring-1 flex items-center justify-center transition-all',
                                    headerIsDark
                                        ? 'bg-white/5 ring-white/10 group-hover:ring-white/30'
                                        : 'bg-slate-50 ring-black/10 group-hover:ring-black/20'
                                )}
                            >
                                <Image
                                    src={logoUrl}
                                    alt={resolvedName || logoAlt}
                                    width={40}
                                    height={40}
                                    className="h-9 w-9 object-contain"
                                    unoptimized
                                />
                            </div>
                        ) : primaryColor ? (
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold transition-all"
                                style={{
                                    background: secondaryColor
                                        ? `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`
                                        : primaryColor,
                                    boxShadow: `0 0 15px ${primaryColor}80`,
                                }}
                            >
                                {resolvedName ? resolvedName.charAt(0).toUpperCase() : brandInitial}
                            </div>
                        ) : (
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-[0_0_15px_rgba(59,130,246,0.5)] group-hover:shadow-[0_0_20px_rgba(59,130,246,0.8)] transition-all">
                                {resolvedName ? resolvedName.charAt(0).toUpperCase() : brandInitial}
                            </div>
                        )}
                        <span className={cn('font-bold text-lg tracking-tight hidden sm:inline', headerIsDark ? 'text-white' : 'text-slate-950')}>
                            {resolvedName || portalName}
                        </span>
                    </Link>
                </div>

                {/* Desktop Navigation */}
                <nav className="hidden xl:flex items-center gap-6">
                    {/* Org Switcher */}
                    <OrgSwitcher currentSlug={businessSlug} />

                    {/* Main Items */}
                    {mainNavItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={navLinkClassName(isActive)}
                            >
                                <item.icon className={cn("w-4 h-4", !isActive && "opacity-0")} style={isActive ? { color: brandAccent } : undefined} />
                                {item.label}
                            </Link>
                        )
                    })}

                    {/* Tools Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className={cn(
                                "flex items-center gap-2 text-sm font-medium transition-colors",
                                navGroups.tools.items.some(i => i.href === pathname)
                                    ? headerIsDark ? "text-white" : "text-slate-950"
                                    : headerIsDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-950"
                            )}>
                                <navGroups.tools.icon className="w-4 h-4 opacity-50" />
                                {navGroups.tools.label}
                                <ChevronDown className="w-3 h-3 opacity-50" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className={dropdownContentClassName} align="start">
                            {prioritizedTools.map((item) => (
                                <DropdownMenuItem key={item.href} asChild className={dropdownItemClassName}>
                                    <Link href={item.href} className="flex items-center gap-2">
                                        <item.icon className="w-4 h-4" />
                                        {item.label}
                                    </Link>
                                </DropdownMenuItem>
                            ))}
                            {remainingTools.length > 0 && (
                                <>
                                    <div className={cn("my-1 h-px", separatorClassName)} />
                                    {remainingTools.map((item) => (
                                        <DropdownMenuItem key={item.href} asChild className={cn(dropdownItemClassName, "opacity-60")}>
                                            <Link href={item.href} className="flex items-center gap-2">
                                                <item.icon className="w-4 h-4" />
                                                {item.label}
                                            </Link>
                                        </DropdownMenuItem>
                                    ))}
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* More Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className={cn(
                                "flex items-center gap-2 text-sm font-medium transition-colors",
                                moreItems.some(i => i.href === pathname)
                                    ? headerIsDark ? "text-white" : "text-slate-950"
                                    : headerIsDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-950"
                            )}>
                                <navGroups.more.icon className="w-4 h-4 opacity-50" />
                                {navGroups.more.label}
                                <ChevronDown className="w-3 h-3 opacity-50" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className={dropdownContentClassName} align="start">
                            {prioritizedMore.map((item) => (
                                <DropdownMenuItem key={item.href} asChild className={dropdownItemClassName}>
                                    <Link href={item.href} className="flex items-center gap-2">
                                        <item.icon className="w-4 h-4" />
                                        {item.label}
                                    </Link>
                                </DropdownMenuItem>
                            ))}
                            {remainingMore.length > 0 && (
                                <>
                                    <div className={cn("my-1 h-px", separatorClassName)} />
                                    {remainingMore.map((item) => (
                                        <DropdownMenuItem key={item.href} asChild className={cn(dropdownItemClassName, "opacity-60")}>
                                            <Link href={item.href} className="flex items-center gap-2">
                                                <item.icon className="w-4 h-4" />
                                                {item.label}
                                            </Link>
                                        </DropdownMenuItem>
                                    ))}
                                </>
                            )}
                            {adminLinks.map((item) => (
                                <DropdownMenuItem key={item.href} asChild className={dropdownItemClassName}>
                                    <Link href={item.href} className="flex items-center gap-2">
                                        <item.icon className="w-4 h-4" />
                                        {item.label}
                                    </Link>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                </nav>

                {/* User Profile / Mobile Menu */}
                <div className="flex items-center gap-4">

                    {/* Language & Notifications (Desktop) */}
                    <div className={cn("hidden md:flex items-center gap-1", desktopControlsClassName)}>
                        {platformAdminRole && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={cn(
                                            'h-8 gap-1.5 px-2 text-xs',
                                            headerIsDark
                                                ? 'text-slate-300 hover:bg-white/10 hover:text-white'
                                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
                                            rolePreview && 'text-amber-200 ring-1 ring-amber-300/30'
                                        )}
                                    >
                                        <UserCog className="h-3.5 w-3.5" />
                                        {rolePreview
                                            ? rolePreviewOptions.find((role) => role.value === rolePreview)?.label ?? rolePreview
                                            : tBusinessCoachHeader('menu.viewAs')}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className={dropdownContentClassName} align="end">
                                    <DropdownMenuLabel>
                                        {tBusinessCoachHeader('menu.rolePreview')}
                                        <p className={cn("mt-1 text-[10px] font-normal", headerIsDark ? "text-slate-400" : "text-slate-500")}>
                                            {tBusinessCoachHeader('menu.note')}
                                        </p>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator className={separatorClassName} />
                                    {rolePreviewOptions.map((option) => (
                                        <DropdownMenuItem
                                            key={option.value}
                                            disabled={rolePreviewSaving}
                                            onClick={() => { void applyRolePreview(option.value) }}
                                            className={dropdownItemClassName}
                                        >
                                            <UserCog className="mr-2 h-4 w-4" />
                                            <span>{option.label}</span>
                                            {rolePreview === option.value && (
                                                <span className="ml-auto text-[10px] text-amber-200">
                                                    {tBusinessCoachHeader('menu.active')}
                                                </span>
                                            )}
                                        </DropdownMenuItem>
                                    ))}
                                    {rolePreview && (
                                        <>
                                            <DropdownMenuSeparator className={separatorClassName} />
                                            <DropdownMenuItem
                                                disabled={rolePreviewSaving}
                                                onClick={() => { void applyRolePreview(null) }}
                                                className={dropdownItemClassName}
                                            >
                                                {tBusinessCoachHeader('menu.clear')}
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        <LanguageSwitcher showLabel={false} variant="ghost" />
                        <NotificationBell />
                    </div>

                    {/* Desktop User Menu */}
                    <div className="hidden md:block">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className={cn(
                                        "relative h-8 w-8 rounded-full ring-2 transition-all p-0",
                                        headerIsDark ? "ring-white/10" : "ring-black/10"
                                    )}
                                    style={{ '--tw-ring-color': `${brandAccent}80` } as React.CSSProperties}
                                >
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={user?.user_metadata?.avatar_url ?? undefined} alt={displayName} />
                                        <AvatarFallback className={cn("font-bold", headerIsDark ? "bg-slate-800" : "bg-slate-100")} style={{ color: brandAccent }}>
                                            {displayName.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className={dropdownContentClassName} align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className={cn("text-sm font-medium leading-none", headerIsDark ? "text-white" : "text-slate-950")}>{displayName}</p>
                                        <p className={cn("text-xs leading-none", headerIsDark ? "text-slate-400" : "text-slate-500")}>
                                            {user?.email}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator className={separatorClassName} />
                                <DropdownMenuItem asChild className={dropdownItemClassName}>
                                    <Link href={`${basePath}/coach/settings`}>
                                        <Settings className="mr-2 h-4 w-4" />
                                        <span>{tBusinessCoachHeader('menu.settings')}</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className={separatorClassName} />
                                <AthleteModeToggle variant="dropdown" />
                                <DropdownMenuSeparator className={separatorClassName} />
                                <DropdownMenuItem onClick={handleSignOut} className="text-red-400 focus:bg-red-500/10 focus:text-red-400 cursor-pointer">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>{tBusinessCoachHeader('menu.logOut')}</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Mobile Menu Trigger */}
                    <Sheet open={isOpen} onOpenChange={setIsOpen}>
                        <SheetTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "xl:hidden",
                                    headerIsDark ? "text-slate-300 hover:text-white hover:bg-white/10" : "text-slate-700 hover:text-slate-950 hover:bg-slate-100"
                                )}
                            >
                                <Menu className="h-6 w-6" />
                                <span className="sr-only">{tBusinessCoachHeader('menu.toggleMenu')}</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent
                            side="right"
                            className={cn(
                                "w-[300px] overflow-y-auto",
                                headerIsDark ? "bg-slate-950 border-l border-white/10 text-slate-200" : "bg-white border-l border-slate-200 text-slate-950"
                            )}
                            aria-describedby={undefined}
                        >
                            <SheetTitle className="sr-only">{tBusinessCoachHeader('menu.navigationMenu')}</SheetTitle>
                            <div className="flex flex-col gap-6 mt-8">
                                <div className="flex items-center justify-between px-4">
                                    <span className="font-bold text-lg">{resolvedName || tBusinessCoachHeader('nav.menu')}</span>
                                    <div className="flex gap-1">
                                        <LanguageSwitcher showLabel={false} variant="ghost" />
                                        <NotificationBell />
                                    </div>
                                </div>

                                {/* Mobile Org Switcher */}
                                <div className="px-4">
                                    <OrgSwitcher currentSlug={businessSlug} />
                                </div>

                                {/* Mobile Nav Items */}
                                <div className="flex flex-col gap-1">
                                    {mobilePrioritized.map((item) => {
                                        const isActive = pathname === item.href
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={() => setIsOpen(false)}
                                                className={cn(
                                                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                                                            isActive
                                                                ? headerIsDark ? "bg-white/10 text-white" : "bg-slate-100 text-slate-950"
                                                                : headerIsDark ? "text-slate-400 hover:text-white hover:bg-white/5" : "text-slate-600 hover:text-slate-950 hover:bg-slate-100"
                                                )}
                                            >
                                                <item.icon className="w-5 h-5" style={isActive ? { color: brandAccent } : undefined} />
                                                {item.label}
                                            </Link>
                                        )
                                    })}
                                    {mobileRemaining.length > 0 && (
                                        <>
                                            <div className={cn("my-2 mx-4 h-px", separatorClassName)} />
                                            <p className={cn("px-4 py-1 text-[10px] uppercase tracking-widest", headerIsDark ? "text-slate-500" : "text-slate-400")}>
                                                {tBusinessCoachHeader('nav.moreTools')}
                                            </p>
                                            {mobileRemaining.map((item) => {
                                                const isActive = pathname === item.href
                                                return (
                                                    <Link
                                                        key={item.href}
                                                        href={item.href}
                                                        onClick={() => setIsOpen(false)}
                                                        className={cn(
                                                            "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors",
                                                            isActive
                                                                ? headerIsDark ? "bg-white/10 text-white" : "bg-slate-100 text-slate-950"
                                                                : headerIsDark ? "text-slate-500 hover:text-slate-300 hover:bg-white/5" : "text-slate-500 hover:text-slate-950 hover:bg-slate-100"
                                                        )}
                                                    >
                                                        <item.icon className="w-4 h-4" style={isActive ? { color: brandAccent } : undefined} />
                                                        <span className="text-sm">{item.label}</span>
                                                    </Link>
                                                )
                                            })}
                                        </>
                                    )}
                                </div>

                                <div className={cn("h-px my-2", separatorClassName)} />

                                {/* Mobile User Actions */}
                                <div className="flex flex-col gap-2 px-4">
                                    <AthleteModeToggle variant="button" className="w-full justify-start" />
                                </div>

                                <div className={cn("h-px my-2", separatorClassName)} />

                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={() => {
                                            setIsOpen(false)
                                            void handleSignOut()
                                        }}
                                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 w-full text-left"
                                    >
                                        <LogOut className="w-5 h-5" />
                                        {tBusinessCoachHeader('menu.logOut')}
                                    </button>
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    )
}
