'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
    LayoutDashboard,
    Menu,
    User as UserIcon,
    LogOut,
    Settings,
    CheckCircle,
    Calendar,
    Activity,
    TrendingUp,
    Gauge,
    Ship,
    Video,
    ChevronDown,
    FlaskConical,
    Droplet,
    MessageSquare,
    ClipboardList,
    Sparkles,
    Library,
    HeartHandshake,
    Trophy,
    Radar
} from 'lucide-react'
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
import { BroadcastNotificationBell } from '@/components/athlete/BroadcastNotificationBell'
import { SportSwitcher } from './SportSwitcher'
import { SportType } from '@prisma/client'
import { AthleteModeToggle } from '@/components/coach/AthleteModeToggle'
import { getAthleteTestsHref } from '@/lib/athlete-tests/navigation'
import { useBusinessBrandingOptional } from '@/lib/contexts/BusinessBrandingContext'
import { useWorkoutThemeOptional } from '@/lib/themes/ThemeProvider'
import { useTranslations } from '@/i18n/client'
import type { User } from '@supabase/supabase-js'

interface SportProfile {
    primarySport: SportType
    secondarySports: SportType[]
}

interface BusinessAthleteHeaderProps {
    user: User | null
    athleteName: string | undefined
    clientName?: string
    clientId?: string
    sportProfile?: SportProfile | null
    businessSlug: string
    businessName: string
    businessLogo: string | null
}

export function BusinessAthleteHeader({
    user,
    athleteName,
    clientName,
    clientId,
    sportProfile,
    businessSlug,
    businessName,
    businessLogo,
}: BusinessAthleteHeaderProps) {
    const pathname = usePathname()
    const router = useRouter()
    const branding = useBusinessBrandingOptional()
    const themeContext = useWorkoutThemeOptional()
    const appIsDark = themeContext?.appTheme?.id === 'FITAPP_DARK'
    const usesModernHeader = branding?.headerVariant === 'modern'
    const headerIsDark = appIsDark || !usesModernHeader
    const t = useTranslations('components.businessAthleteHeader')
    const [isOpen, setIsOpen] = useState(false)
    const displayName = clientName || athleteName || user?.email || t('fallbackAthlete')
    const resolvedBusinessName = branding?.businessName || businessName
    const resolvedBusinessLogo = branding?.logoUrl ?? businessLogo
    const brandAccent = branding?.primaryColor || '#f97316'

    // Base path for all business-scoped routes
    const basePath = `/${businessSlug}`
    const athleteTestsHref = getAthleteTestsHref(basePath, sportProfile)
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

    const handleSignOut = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
    }

    // Top Level Links - using business-scoped URLs
    const mainNavItems = [
        { href: `${basePath}/athlete/dashboard`, label: t('nav.dashboard'), icon: LayoutDashboard },
        { href: `${basePath}/athlete/check-in`, label: t('nav.checkIn'), icon: CheckCircle },
        { href: `${basePath}/athlete/calendar`, label: t('nav.calendar'), icon: Calendar },
    ]

    // Dropdown Groups - using business-scoped URLs
    const navGroups = {
        training: {
            label: t('groups.training'),
            icon: Activity,
            items: [
                { href: `${basePath}/athlete/history`, label: t('nav.history'), icon: TrendingUp },
                { href: `${basePath}/athlete/prs`, label: t('nav.myPrs'), icon: Trophy },
                { href: `${basePath}/athlete/programs`, label: t('nav.programs'), icon: ClipboardList },
                { href: `${basePath}/athlete/wod/history`, label: t('nav.aiWorkouts'), icon: Sparkles },
                { href: `${basePath}/athlete/training-library`, label: t('nav.trainingLibrary'), icon: Library },
                { href: `${basePath}/athlete/vbt`, label: t('nav.vbtData'), icon: Gauge },
                { href: `${basePath}/athlete/concept2`, label: t('nav.concept2'), icon: Ship },
                { href: `${basePath}/athlete/video-analysis`, label: t('nav.videoAnalysis'), icon: Video },
                { href: `${basePath}/athlete/team-profile`, label: t('nav.teamProfile'), icon: Radar },
            ]
        },
        more: {
            label: t('groups.more'),
            icon: Menu,
            items: [
                { href: `${basePath}/athlete/profile`, label: t('nav.myProfile'), icon: UserIcon },
                { href: `${basePath}/athlete/my-coach`, label: t('nav.myCoach'), icon: HeartHandshake },
                { href: athleteTestsHref, label: t('nav.testsReports'), icon: FlaskConical },
                { href: `${basePath}/athlete/lactate/new`, label: t('nav.lactateTest'), icon: Droplet },
                { href: `${basePath}/athlete/messages`, label: t('nav.messages'), icon: MessageSquare },
                { href: `${basePath}/athlete/settings`, label: t('nav.settings'), icon: Settings },
            ]
        }
    }

    // Mobile specific flat list (concatenating all)
    const mobileNavItems = [
        ...mainNavItems,
        ...navGroups.training.items,
        ...navGroups.more.items
    ]

    return (
        <header className={headerClassName}>
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">

                {/* Logo Area - Business Branding */}
                <div className="flex items-center gap-4">
                    <Link href={`${basePath}/athlete/dashboard`} className="flex items-center gap-2 group">
                        {resolvedBusinessLogo ? (
                            <div
                                className={cn(
                                    'w-10 h-10 rounded-lg overflow-hidden ring-1 flex items-center justify-center transition-all',
                                    headerIsDark
                                        ? 'bg-white/5 ring-white/10 group-hover:ring-white/30'
                                        : 'bg-slate-50 ring-black/10 group-hover:ring-black/20'
                                )}
                            >
                                <Image
                                    src={resolvedBusinessLogo}
                                    alt={resolvedBusinessName}
                                    width={40}
                                    height={40}
                                    className="h-9 w-9 object-contain"
                                    unoptimized
                                />
                            </div>
                        ) : (
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold transition-all"
                                style={{ backgroundColor: brandAccent, boxShadow: `0 0 15px ${brandAccent}80` }}
                            >
                                {resolvedBusinessName.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <span className={cn('font-bold text-lg tracking-tight hidden sm:inline', headerIsDark ? 'text-white' : 'text-slate-950')}>
                            {resolvedBusinessName}
                        </span>
                    </Link>

                    {/* Sport Switcher */}
                    {sportProfile && sportProfile.secondarySports.length > 0 && (
                        <div className={cn("hidden md:block border-l pl-4", headerIsDark ? "border-white/10" : "border-slate-200")}>
                            <SportSwitcher
                                primarySport={sportProfile.primarySport}
                                secondarySports={sportProfile.secondarySports}
                            />
                        </div>
                    )}
                </div>

                {/* Desktop Navigation */}
                <nav className="hidden xl:flex items-center gap-6">
                    {/* Main Items */}
                    {mainNavItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    navLinkClassName(isActive)
                                )}
                            >
                                <item.icon className={cn("w-4 h-4", !isActive && "opacity-0")} style={isActive ? { color: brandAccent } : undefined} />
                                {item.label}
                            </Link>
                        )
                    })}

                    {/* Training Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className={cn(
                                "flex items-center gap-2 text-sm font-medium transition-colors",
                                navGroups.training.items.some(i => pathname === i.href)
                                    ? headerIsDark ? "text-white" : "text-slate-950"
                                    : headerIsDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-950"
                            )}>
                                <navGroups.training.icon className="w-4 h-4 opacity-50" />
                                {navGroups.training.label}
                                <ChevronDown className="w-3 h-3 opacity-50" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className={dropdownContentClassName} align="start">
                            {navGroups.training.items.map((item) => (
                                <DropdownMenuItem key={item.href} asChild className={dropdownItemClassName}>
                                    <Link href={item.href} className="flex items-center gap-2">
                                        <item.icon className="w-4 h-4" />
                                        {item.label}
                                    </Link>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* More Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className={cn(
                                "flex items-center gap-2 text-sm font-medium transition-colors",
                                navGroups.more.items.some(i => pathname === i.href)
                                    ? headerIsDark ? "text-white" : "text-slate-950"
                                    : headerIsDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-950"
                            )}>
                                <navGroups.more.icon className="w-4 h-4 opacity-50" />
                                {navGroups.more.label}
                                <ChevronDown className="w-3 h-3 opacity-50" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className={dropdownContentClassName} align="start">
                            {navGroups.more.items.map((item) => (
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
                        <LanguageSwitcher showLabel={false} variant="ghost" />
                        <BroadcastNotificationBell />
                        <NotificationBell clientId={clientId} />
                    </div>

                    {/* Desktop User Menu */}
                    <div className="hidden md:block">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className={cn("relative h-8 w-8 rounded-full ring-2 transition-all p-0", headerIsDark ? "ring-white/10" : "ring-black/10")}
                                    style={{ '--tw-ring-color': `${brandAccent}80` } as React.CSSProperties}
                                >
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={user?.user_metadata?.avatar_url} alt={displayName} />
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
                                    <Link href={`${basePath}/athlete/profile`}>
                                        <UserIcon className="mr-2 h-4 w-4" />
                                        <span>{t('userMenu.profile')}</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild className={dropdownItemClassName}>
                                    <Link href={`${basePath}/athlete/settings`}>
                                        <Settings className="mr-2 h-4 w-4" />
                                        <span>{t('userMenu.settings')}</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className={separatorClassName} />
                                <AthleteModeToggle variant="dropdown" />
                                <DropdownMenuSeparator className={separatorClassName} />
                                <DropdownMenuItem onClick={handleSignOut} className="text-red-400 focus:bg-red-500/10 focus:text-red-400 cursor-pointer">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>{t('userMenu.logOut')}</span>
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
                                <span className="sr-only">{t('mobile.toggleMenu')}</span>
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
                            <SheetTitle className="sr-only">{t('mobile.navigationMenu')}</SheetTitle>
                            <div className="flex flex-col gap-6 mt-8">
                                <div className="flex items-center justify-between px-4">
                                    <span className="font-bold text-lg">{resolvedBusinessName}</span>
                                    <div className="flex gap-1">
                                        <LanguageSwitcher showLabel={false} variant="ghost" />
                                        <BroadcastNotificationBell />
                                        <NotificationBell clientId={clientId} />
                                    </div>
                                </div>

                                {/* Mobile Sport Switcher */}
                                {sportProfile && sportProfile.secondarySports.length > 0 && (
                                    <div className="px-4">
                                        <SportSwitcher
                                            primarySport={sportProfile.primarySport}
                                            secondarySports={sportProfile.secondarySports}
                                            className={cn("w-full justify-start", headerIsDark ? "bg-white/5 hover:bg-white/10" : "bg-slate-100 hover:bg-slate-200")}
                                        />
                                    </div>
                                )}

                                {/* Mobile Nav Items */}
                                <div className="flex flex-col gap-1">
                                    {mobileNavItems.map((item) => {
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
                                </div>

                                <div className={cn("h-px my-2", separatorClassName)} />

                                {/* Mobile User Actions */}
                                <div className="flex flex-col gap-2 px-4">
                                    <AthleteModeToggle variant="button" className="w-full justify-start" />
                                    <button
                                        onClick={() => {
                                            setIsOpen(false)
                                            void handleSignOut()
                                        }}
                                        className="flex items-center gap-3 py-3 rounded-lg text-red-400 hover:bg-red-500/10 w-full text-left"
                                    >
                                        <LogOut className="w-5 h-5" />
                                        {t('userMenu.logOut')}
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
