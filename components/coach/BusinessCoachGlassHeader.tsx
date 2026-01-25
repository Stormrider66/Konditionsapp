'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
    LayoutDashboard,
    Users,
    Calendar,
    CalendarDays,
    Menu,
    LogOut,
    Settings,
    User as UserIcon,
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
} from 'lucide-react'
import type { BusinessMemberRole } from '@/types'
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
import { AthleteModeToggle } from '@/components/coach/AthleteModeToggle'

interface BusinessCoachGlassHeaderProps {
    user: any
    businessSlug: string
}

export function BusinessCoachGlassHeader({ user, businessSlug }: BusinessCoachGlassHeaderProps) {
    const pathname = usePathname()
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const [businessRole, setBusinessRole] = useState<BusinessMemberRole | null>(null)
    const [businessName, setBusinessName] = useState<string | null>(null)
    const displayName = user?.email || 'Coach'

    // Base path for all business-scoped routes
    const basePath = `/${businessSlug}`

    // Fetch business context to check if user is a business admin
    useEffect(() => {
        const fetchBusinessContext = async () => {
            try {
                const response = await fetch('/api/coach/admin/context')
                if (response.ok) {
                    const result = await response.json()
                    if (result.data?.role) {
                        setBusinessRole(result.data.role as BusinessMemberRole)
                    }
                    if (result.data?.business?.name) {
                        setBusinessName(result.data.business.name)
                    }
                }
            } catch (err) {
                console.error('[BusinessContext] Failed to fetch:', err)
            }
        }
        fetchBusinessContext()
    }, [])

    const handleSignOut = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
    }

    // Top Level Links - using business-scoped URLs
    const mainNavItems = [
        { href: `${basePath}/coach/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
        { href: `${basePath}/coach/calendar`, label: 'Kalender', icon: CalendarDays },
        { href: `${basePath}/coach/clients`, label: 'Atleter', icon: Users },
        { href: `${basePath}/coach/programs`, label: 'Program', icon: FileStack },
    ]

    // Dropdown Groups - using business-scoped URLs
    const navGroups = {
        tools: {
            label: 'Verktyg',
            icon: Wrench,
            items: [
                { href: `${basePath}/coach/test`, label: 'Nytt Test', icon: Activity },
                { href: `${basePath}/coach/ai-studio`, label: 'AI Studio', icon: Sparkles },
                { href: `${basePath}/coach/hybrid-studio`, label: 'Hybrid Studio', icon: Flame },
                { href: `${basePath}/coach/strength`, label: 'Strength Studio', icon: Dumbbell },
                { href: `${basePath}/coach/cardio`, label: 'Cardio Studio', icon: Heart },
                { href: `${basePath}/coach/agility-studio`, label: 'Agility Studio', icon: Zap },
                { href: `${basePath}/coach/ergometer-tests`, label: 'Ergometertester', icon: Gauge },
                { href: `${basePath}/coach/video-analysis`, label: 'Videoanalys', icon: Video },
                { href: `${basePath}/coach/monitoring`, label: 'Monitorering', icon: Activity },
                { href: `${basePath}/coach/live-hr`, label: 'Live HR', icon: Heart },
            ]
        },
        more: {
            label: 'Mer',
            icon: Menu,
            items: [
                { href: `${basePath}/coach/analytics`, label: 'Analys', icon: BarChart3 },
                { href: `${basePath}/coach/teams`, label: 'Lag', icon: Users2 },
                { href: `${basePath}/coach/organizations`, label: 'Organisationer', icon: Building2 },
                { href: `${basePath}/coach/documents`, label: 'Dokument', icon: FileStack },
                { href: `${basePath}/coach/messages`, label: 'Meddelanden', icon: MessageSquare },
                { href: `${basePath}/coach/referrals`, label: 'Värvningar', icon: Gift },
                { href: `${basePath}/coach/settings`, label: 'Inställningar', icon: Settings },
            ]
        }
    }

    // Compute more items with optional Admin link
    const moreItems = [
        ...navGroups.more.items,
        // Add Admin link if user is OWNER or ADMIN
        ...((businessRole === 'OWNER' || businessRole === 'ADMIN')
            ? [{ href: `${basePath}/coach/admin`, label: 'Admin', icon: Shield }]
            : [])
    ]

    // Mobile specific flat list (concatenating all)
    const mobileNavItems = [
        ...mainNavItems,
        ...navGroups.tools.items,
        ...moreItems
    ]

    return (
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-slate-950/50 backdrop-blur-md transition-all duration-300">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">

                {/* Logo Area */}
                <div className="flex items-center gap-4">
                    <Link href={`${basePath}/coach/dashboard`} className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-[0_0_15px_rgba(59,130,246,0.5)] group-hover:shadow-[0_0_20px_rgba(59,130,246,0.8)] transition-all">
                            {businessName ? businessName.charAt(0).toUpperCase() : 'C'}
                        </div>
                        <span className="font-bold text-lg tracking-tight text-white hidden sm:inline">
                            {businessName || 'Coach Portal'}
                        </span>
                    </Link>
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
                                <item.icon className={cn("w-4 h-4", isActive ? "text-blue-500" : "opacity-0")} />
                                {item.label}
                            </Link>
                        )
                    })}

                    {/* Tools Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className={cn(
                                "flex items-center gap-2 text-sm font-medium transition-colors hover:text-white",
                                navGroups.tools.items.some(i => i.href === pathname)
                                    ? "text-white"
                                    : "text-slate-400"
                            )}>
                                <navGroups.tools.icon className="w-4 h-4 opacity-50" />
                                {navGroups.tools.label}
                                <ChevronDown className="w-3 h-3 opacity-50" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56 bg-slate-950 border-white/10 text-slate-200" align="start">
                            {navGroups.tools.items.map((item) => (
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
                                moreItems.some(i => i.href === pathname)
                                    ? "text-white"
                                    : "text-slate-400"
                            )}>
                                <navGroups.more.icon className="w-4 h-4 opacity-50" />
                                {navGroups.more.label}
                                <ChevronDown className="w-3 h-3 opacity-50" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56 bg-slate-900 border-white/10 text-slate-200" align="start">
                            {moreItems.map((item) => (
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
                        <NotificationBell />
                    </div>

                    {/* Desktop User Menu */}
                    <div className="hidden md:block">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-8 w-8 rounded-full ring-2 ring-white/10 hover:ring-blue-500/50 transition-all p-0">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={user?.user_metadata?.avatar_url} alt={displayName} />
                                        <AvatarFallback className="bg-slate-800 text-blue-500 font-bold">
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
                                    <Link href={`${basePath}/coach/settings`}>
                                        <Settings className="mr-2 h-4 w-4" />
                                        <span>Settings</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <AthleteModeToggle variant="dropdown" />
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
                                    <span className="font-bold text-lg">{businessName || 'Menu'}</span>
                                    <div className="flex gap-1">
                                        <LanguageSwitcher showLabel={false} variant="ghost" />
                                        <NotificationBell />
                                    </div>
                                </div>

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
                                                <item.icon className={cn("w-5 h-5", isActive ? "text-blue-500" : "")} />
                                                {item.label}
                                            </Link>
                                        )
                                    })}
                                </div>

                                <div className="h-px bg-white/10 my-2" />

                                {/* Mobile User Actions */}
                                <div className="flex flex-col gap-2 px-4">
                                    <AthleteModeToggle variant="button" className="w-full justify-start" />
                                </div>

                                <div className="h-px bg-white/10 my-2" />

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
