'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
    LayoutDashboard,
    Dumbbell,
    Menu,
    User as UserIcon,
    LogOut,
    Settings,
    CheckCircle,
    Calendar,
    Activity,
    TrendingUp,
    Heart,
    Flame,
    Gauge,
    Ship,
    Video,
    ChevronDown,
    FlaskConical,
    Droplet,
    MessageSquare,
    ClipboardList,
    Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
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
import { SportSwitcher } from './SportSwitcher'
import { SportType } from '@prisma/client'

interface SportProfile {
    primarySport: SportType
    secondarySports: SportType[]
}

interface BusinessAthleteHeaderProps {
    user: any
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
    const [isOpen, setIsOpen] = useState(false)
    const displayName = clientName || athleteName || user?.email || 'Athlete'

    // Base path for all business-scoped routes
    const basePath = `/${businessSlug}`

    const handleSignOut = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
    }

    // Top Level Links - using business-scoped URLs
    const mainNavItems = [
        { href: `${basePath}/athlete/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
        { href: `${basePath}/athlete/check-in`, label: 'Check-in', icon: CheckCircle },
        { href: `${basePath}/athlete/calendar`, label: 'Kalender', icon: Calendar },
    ]

    // Dropdown Groups - using business-scoped URLs
    const navGroups = {
        training: {
            label: 'Träning',
            icon: Activity,
            items: [
                { href: `${basePath}/athlete/history`, label: 'Historik', icon: TrendingUp },
                { href: `${basePath}/athlete/programs`, label: 'Program', icon: ClipboardList },
                { href: `${basePath}/athlete/wod/history`, label: 'AI-Pass', icon: Sparkles },
                { href: `${basePath}/athlete/strength`, label: 'Styrketräning', icon: Dumbbell },
                { href: `${basePath}/athlete/cardio`, label: 'Cardio Pass', icon: Heart },
                { href: `${basePath}/athlete/hybrid`, label: 'Hybrid Pass', icon: Flame },
                { href: `${basePath}/athlete/vbt`, label: 'VBT Data', icon: Gauge },
                { href: `${basePath}/athlete/concept2`, label: 'Concept2', icon: Ship },
                { href: `${basePath}/athlete/video-analysis`, label: 'Videoanalys', icon: Video },
            ]
        },
        more: {
            label: 'Mer',
            icon: Menu,
            items: [
                { href: `${basePath}/athlete/profile`, label: 'Min Profil', icon: UserIcon },
                { href: `${basePath}/athlete/tests`, label: 'Tester & Rapporter', icon: FlaskConical },
                { href: `${basePath}/athlete/lactate/new`, label: 'Laktattest', icon: Droplet },
                { href: `${basePath}/athlete/messages`, label: 'Meddelanden', icon: MessageSquare },
                { href: `${basePath}/athlete/settings`, label: 'Inställningar', icon: Settings },
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
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-slate-950/50 backdrop-blur-md transition-all duration-300">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">

                {/* Logo Area - Business Branding */}
                <div className="flex items-center gap-4">
                    <Link href={`${basePath}/athlete/dashboard`} className="flex items-center gap-2 group">
                        {businessLogo ? (
                            <div className="w-8 h-8 rounded-lg overflow-hidden shadow-[0_0_15px_rgba(249,115,22,0.5)] group-hover:shadow-[0_0_20px_rgba(249,115,22,0.8)] transition-all">
                                <Image
                                    src={businessLogo}
                                    alt={businessName}
                                    width={32}
                                    height={32}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ) : (
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-bold shadow-[0_0_15px_rgba(249,115,22,0.5)] group-hover:shadow-[0_0_20px_rgba(249,115,22,0.8)] transition-all">
                                {businessName.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <span className="font-bold text-lg tracking-tight text-white hidden sm:inline">
                            {businessName}
                        </span>
                    </Link>

                    {/* Sport Switcher */}
                    {sportProfile && sportProfile.secondarySports.length > 0 && (
                        <div className="hidden md:block border-l border-white/10 pl-4">
                            <SportSwitcher
                                primarySport={sportProfile.primarySport}
                                secondarySports={sportProfile.secondarySports}
                            />
                        </div>
                    )}
                </div>

                {/* Desktop Navigation */}
                <nav className="hidden lg:flex items-center gap-6">
                    {/* Main Items */}
                    {mainNavItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "text-sm font-medium transition-colors hover:text-white flex items-center gap-2",
                                    isActive ? "text-white" : "text-slate-400"
                                )}
                            >
                                <item.icon className={cn("w-4 h-4", isActive ? "text-orange-500" : "opacity-0")} />
                                {item.label}
                            </Link>
                        )
                    })}

                    {/* Training Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className={cn(
                                "flex items-center gap-2 text-sm font-medium transition-colors hover:text-white",
                                navGroups.training.items.some(i => pathname === i.href)
                                    ? "text-white"
                                    : "text-slate-400"
                            )}>
                                <navGroups.training.icon className="w-4 h-4 opacity-50" />
                                {navGroups.training.label}
                                <ChevronDown className="w-3 h-3 opacity-50" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56 bg-slate-950 border-white/10 text-slate-200" align="start">
                            {navGroups.training.items.map((item) => (
                                <DropdownMenuItem key={item.href} asChild className="focus:bg-white/10 focus:text-white cursor-pointer">
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
                                "flex items-center gap-2 text-sm font-medium transition-colors hover:text-white",
                                navGroups.more.items.some(i => pathname === i.href)
                                    ? "text-white"
                                    : "text-slate-400"
                            )}>
                                <navGroups.more.icon className="w-4 h-4 opacity-50" />
                                {navGroups.more.label}
                                <ChevronDown className="w-3 h-3 opacity-50" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56 bg-slate-900 border-white/10 text-slate-200" align="start">
                            {navGroups.more.items.map((item) => (
                                <DropdownMenuItem key={item.href} asChild className="focus:bg-white/10 focus:text-white cursor-pointer">
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
                    <div className="hidden md:flex items-center gap-1 text-slate-200">
                        <LanguageSwitcher showLabel={false} variant="ghost" />
                        <NotificationBell clientId={clientId} />
                    </div>

                    {/* Desktop User Menu */}
                    <div className="hidden md:block">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-8 w-8 rounded-full ring-2 ring-white/10 hover:ring-orange-500/50 transition-all p-0">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={user?.user_metadata?.avatar_url} alt={displayName} />
                                        <AvatarFallback className="bg-slate-800 text-orange-500 font-bold">
                                            {displayName.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56 bg-slate-900 border-white/10 text-slate-200" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none text-white">{displayName}</p>
                                        <p className="text-xs leading-none text-slate-400">
                                            {user?.email}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem asChild className="focus:bg-white/10 focus:text-white cursor-pointer">
                                    <Link href={`${basePath}/athlete/profile`}>
                                        <UserIcon className="mr-2 h-4 w-4" />
                                        <span>Profile</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild className="focus:bg-white/10 focus:text-white cursor-pointer">
                                    <Link href={`${basePath}/athlete/settings`}>
                                        <Settings className="mr-2 h-4 w-4" />
                                        <span>Settings</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem onClick={handleSignOut} className="text-red-400 focus:bg-red-500/10 focus:text-red-400 cursor-pointer">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Log out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Mobile Menu Trigger */}
                    <Sheet open={isOpen} onOpenChange={setIsOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="lg:hidden text-slate-300 hover:text-white hover:bg-white/10">
                                <Menu className="h-6 w-6" />
                                <span className="sr-only">Toggle menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="bg-slate-950 border-l border-white/10 text-slate-200 w-[300px] overflow-y-auto">
                            <div className="flex flex-col gap-6 mt-8">
                                <div className="flex items-center justify-between px-4">
                                    <span className="font-bold text-lg">{businessName}</span>
                                    <div className="flex gap-1">
                                        <LanguageSwitcher showLabel={false} variant="ghost" />
                                        <NotificationBell clientId={clientId} />
                                    </div>
                                </div>

                                {/* Mobile Sport Switcher */}
                                {sportProfile && sportProfile.secondarySports.length > 0 && (
                                    <div className="px-4">
                                        <SportSwitcher
                                            primarySport={sportProfile.primarySport}
                                            secondarySports={sportProfile.secondarySports}
                                            className="w-full justify-start bg-white/5 hover:bg-white/10"
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
                                                        ? "bg-white/10 text-white"
                                                        : "text-slate-400 hover:text-white hover:bg-white/5"
                                                )}
                                            >
                                                <item.icon className={cn("w-5 h-5", isActive ? "text-orange-500" : "")} />
                                                {item.label}
                                            </Link>
                                        )
                                    })}
                                </div>

                                <div className="h-px bg-white/10 my-2" />

                                {/* Mobile User Actions */}
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={() => {
                                            setIsOpen(false)
                                            handleSignOut()
                                        }}
                                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 w-full text-left"
                                    >
                                        <LogOut className="w-5 h-5" />
                                        Log out
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
