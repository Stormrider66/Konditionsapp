'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
    LayoutDashboard,
    Users,
    Menu,
    LogOut,
    Settings,
    Stethoscope,
    ClipboardList,
    Activity,
    MessageSquare,
    AlertTriangle,
    FileText,
    ChevronDown,
    Clipboard,
    Ban,
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

interface PhysioGlassHeaderProps {
    user: any
    businessSlug?: string
}

export function PhysioGlassHeader({ user, businessSlug }: PhysioGlassHeaderProps) {
    const pathname = usePathname()
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const [businessName, setBusinessName] = useState<string | null>(null)
    const displayName = user?.user_metadata?.name || user?.email || 'Physio'

    // Base path - either business-scoped or legacy
    const basePath = businessSlug ? `/${businessSlug}/physio` : '/physio'

    // Fetch business name if business-scoped
    React.useEffect(() => {
        if (!businessSlug) return

        const fetchBusinessName = async () => {
            try {
                const res = await fetch(`/api/business/${businessSlug}`)
                if (res.ok) {
                    const data = await res.json()
                    setBusinessName(data.name)
                }
            } catch (err) {
                console.error('Failed to fetch business name:', err)
            }
        }
        fetchBusinessName()
    }, [businessSlug])

    const handleSignOut = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
    }

    // Main navigation items
    const mainNavItems = [
        { href: `${basePath}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
        { href: `${basePath}/athletes`, label: 'Athletes', icon: Users },
        { href: `${basePath}/treatments`, label: 'Treatments', icon: Stethoscope },
        { href: `${basePath}/rehab-programs`, label: 'Rehab', icon: Activity },
    ]

    // Dropdown groups
    const navGroups = {
        tools: {
            label: 'Tools',
            icon: ClipboardList,
            items: [
                { href: `${basePath}/screenings`, label: 'Movement Screens', icon: Clipboard },
                { href: `${basePath}/restrictions`, label: 'Restrictions', icon: Ban },
                { href: `${basePath}/acute-reports`, label: 'Acute Reports', icon: AlertTriangle },
            ]
        },
        more: {
            label: 'More',
            icon: Menu,
            items: [
                { href: `${basePath}/messages`, label: 'Care Team', icon: MessageSquare },
                { href: `${basePath}/reports`, label: 'Reports', icon: FileText },
                { href: `${basePath}/settings`, label: 'Settings', icon: Settings },
            ]
        }
    }

    // Mobile flat list
    const mobileNavItems = [
        ...mainNavItems,
        ...navGroups.tools.items,
        ...navGroups.more.items
    ]

    return (
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-slate-950/50 backdrop-blur-md transition-all duration-300">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">

                {/* Logo Area */}
                <div className="flex items-center gap-4">
                    <Link href={`${basePath}/dashboard`} className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold shadow-[0_0_15px_rgba(16,185,129,0.5)] group-hover:shadow-[0_0_20px_rgba(16,185,129,0.8)] transition-all">
                            {businessName ? businessName.charAt(0).toUpperCase() : <Stethoscope className="w-4 h-4" />}
                        </div>
                        <span className="font-bold text-lg tracking-tight text-white hidden sm:inline">
                            {businessName || 'Physio'}<span className="text-emerald-500"> Portal</span>
                        </span>
                    </Link>
                </div>

                {/* Desktop Navigation */}
                <nav className="hidden lg:flex items-center gap-6">
                    {/* Main Items */}
                    {mainNavItems.map((item) => {
                        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "text-sm font-medium transition-colors hover:text-white flex items-center gap-2",
                                    isActive ? "text-white" : "text-slate-400"
                                )}
                            >
                                <item.icon className={cn("w-4 h-4", isActive ? "text-emerald-500" : "opacity-0")} />
                                {item.label}
                            </Link>
                        )
                    })}

                    {/* Tools Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className={cn(
                                "flex items-center gap-2 text-sm font-medium transition-colors hover:text-white",
                                navGroups.tools.items.some(i => pathname?.startsWith(i.href))
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
                                navGroups.more.items.some(i => pathname?.startsWith(i.href))
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
                        <NotificationBell />
                    </div>

                    {/* Desktop User Menu */}
                    <div className="hidden md:block">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-8 w-8 rounded-full ring-2 ring-white/10 hover:ring-emerald-500/50 transition-all p-0">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={user?.user_metadata?.avatar_url} alt={displayName} />
                                        <AvatarFallback className="bg-slate-800 text-emerald-500 font-bold">
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
                                    <Link href={`${basePath}/settings`}>
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
                                    <span className="font-bold text-lg">Menu</span>
                                    <div className="flex gap-1">
                                        <LanguageSwitcher showLabel={false} variant="ghost" />
                                        <NotificationBell />
                                    </div>
                                </div>

                                {/* Mobile Nav Items */}
                                <div className="flex flex-col gap-1">
                                    {mobileNavItems.map((item) => {
                                        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
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
                                                <item.icon className={cn("w-5 h-5", isActive ? "text-emerald-500" : "")} />
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
