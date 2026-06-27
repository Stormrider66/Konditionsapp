'use client'

import type { CSSProperties, ReactNode } from 'react'
import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  ChevronRight,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

export interface RoleShellUser {
  email?: string | null
  user_metadata?: {
    avatar_url?: string | null
    name?: string | null
  } | null
}

export interface RoleShellNavItem {
  href: string
  label: string
  icon: LucideIcon
  badge?: string
  exact?: boolean
  muted?: boolean
}

export interface RoleShellNavSection {
  id: string
  label: string
  items: RoleShellNavItem[]
}

interface RoleAppShellProps {
  children: ReactNode
  navSections: RoleShellNavSection[]
  user: RoleShellUser | null
  roleLabel: string
  brandName: string
  brandInitial: string
  brandLogoUrl?: string | null
  brandAccent: string
  homeHref: string
  settingsHref: string
  tone?: 'light' | 'dark'
  topbarLeading?: ReactNode
  topbarActions?: ReactNode
  userMenuExtras?: ReactNode
  mobilePanelExtras?: ReactNode
  onSignOut: () => void
  labels: {
    navigation: string
    collapse: string
    expand: string
    openMenu: string
    closeMenu: string
    signedInAs: string
    settings: string
    logOut: string
  }
}

function isItemActive(pathname: string, item: RoleShellNavItem) {
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || 'T'
}

export function RoleAppShell({
  children,
  navSections,
  user,
  roleLabel,
  brandName,
  brandInitial,
  brandLogoUrl,
  brandAccent,
  homeHref,
  settingsHref,
  tone = 'light',
  topbarLeading,
  topbarActions,
  userMenuExtras,
  mobilePanelExtras,
  onSignOut,
  labels,
}: RoleAppShellProps) {
  const pathname = usePathname()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const isDark = tone === 'dark'

  const active = useMemo(() => {
    for (const section of navSections) {
      const item = section.items.find((entry) => isItemActive(pathname, entry))
      if (item) return { item, section }
    }

    return null
  }, [navSections, pathname])

  const displayName = user?.user_metadata?.name || user?.email || roleLabel
  const avatarUrl = user?.user_metadata?.avatar_url || undefined
  const contentOffsetClass = sidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-64'
  const sidebarWidthClass = sidebarCollapsed ? 'lg:w-[76px]' : 'lg:w-64'
  const accentStyle = { '--role-accent': brandAccent } as CSSProperties

  const navContent = (
    <SidebarNav
      navSections={navSections}
      pathname={pathname}
      collapsed={sidebarCollapsed}
      isDark={isDark}
      brandAccent={brandAccent}
    />
  )

  return (
    <div className="min-h-screen" style={accentStyle}>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden flex-col border-r transition-[width] duration-200 lg:flex',
          sidebarWidthClass,
          isDark
            ? 'border-white/10 bg-zinc-950 text-zinc-100'
            : 'border-zinc-200 bg-white text-zinc-950 shadow-sm'
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b px-3" style={{ borderColor: isDark ? 'rgb(255 255 255 / 0.1)' : 'rgb(228 228 231)' }}>
          <BrandMark
            href={homeHref}
            name={brandName}
            initial={brandInitial}
            logoUrl={brandLogoUrl}
            accent={brandAccent}
            collapsed={sidebarCollapsed}
            isDark={isDark}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              'ml-auto h-9 w-9 shrink-0',
              isDark ? 'text-zinc-400 hover:bg-white/10 hover:text-white' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950'
            )}
            onClick={() => setSidebarCollapsed((current) => !current)}
            title={sidebarCollapsed ? labels.expand : labels.collapse}
            aria-label={sidebarCollapsed ? labels.expand : labels.collapse}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
          {navContent}
        </div>
      </aside>

      <div className={cn('min-h-screen transition-[padding] duration-200', contentOffsetClass)}>
        <header
          className={cn(
            'sticky top-0 z-30 border-b backdrop-blur-xl',
            isDark
              ? 'border-white/10 bg-zinc-950/85 text-zinc-100'
              : 'border-zinc-200 bg-white/90 text-zinc-950'
          )}
        >
          <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-10 w-10 lg:hidden',
                    isDark ? 'text-zinc-300 hover:bg-white/10 hover:text-white' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
                  )}
                  aria-label={labels.openMenu}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className={cn(
                  'w-[320px] overflow-y-auto p-0 sm:max-w-none',
                  isDark ? 'border-white/10 bg-zinc-950 text-zinc-100' : 'border-zinc-200 bg-white text-zinc-950'
                )}
                aria-describedby={undefined}
              >
                <SheetTitle className="sr-only">{labels.navigation}</SheetTitle>
                <div className="flex h-16 items-center border-b px-4" style={{ borderColor: isDark ? 'rgb(255 255 255 / 0.1)' : 'rgb(228 228 231)' }}>
                  <BrandMark
                    href={homeHref}
                    name={brandName}
                    initial={brandInitial}
                    logoUrl={brandLogoUrl}
                    accent={brandAccent}
                    collapsed={false}
                    isDark={isDark}
                    onNavigate={() => setMobileOpen(false)}
                  />
                </div>
                {mobilePanelExtras && (
                  <div className={cn('border-b px-4 py-3', isDark ? 'border-white/10' : 'border-zinc-200')}>
                    {mobilePanelExtras}
                  </div>
                )}
                <div className="px-3 py-4">
                  <SidebarNav
                    navSections={navSections}
                    pathname={pathname}
                    collapsed={false}
                    isDark={isDark}
                    brandAccent={brandAccent}
                    onNavigate={() => setMobileOpen(false)}
                  />
                </div>
              </SheetContent>
            </Sheet>

            <div className="hidden min-w-0 shrink-0 lg:block">
              {topbarLeading}
            </div>

            <div className="min-w-0 flex-1">
              <div className={cn('text-[11px] font-medium uppercase tracking-[0.18em]', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                {active?.section.label || roleLabel}
              </div>
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="truncate text-base font-semibold tracking-normal md:text-lg">
                  {active?.item.label || roleLabel}
                </h1>
                {active && (
                  <ChevronRight className={cn('hidden h-4 w-4 md:block', isDark ? 'text-zinc-600' : 'text-zinc-300')} />
                )}
              </div>
            </div>

            <div className="hidden shrink-0 items-center gap-1 md:flex">
              {topbarActions}
            </div>

            <UserMenu
              user={user}
              displayName={displayName}
              avatarUrl={avatarUrl}
              isDark={isDark}
              brandAccent={brandAccent}
              settingsHref={settingsHref}
              extras={userMenuExtras}
              onSignOut={onSignOut}
              labels={labels}
            />
          </div>
        </header>

        <main className="min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}

function BrandMark({
  href,
  name,
  initial,
  logoUrl,
  accent,
  collapsed,
  isDark,
  onNavigate,
}: {
  href: string
  name: string
  initial: string
  logoUrl?: string | null
  accent: string
  collapsed: boolean
  isDark: boolean
  onNavigate?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn('flex min-w-0 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--role-accent)]', collapsed && 'justify-center')}
      title={name}
    >
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border font-bold text-white',
          isDark ? 'border-white/10' : 'border-zinc-200'
        )}
        style={{ backgroundColor: logoUrl ? undefined : accent }}
      >
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={name}
            width={40}
            height={40}
            className="h-9 w-9 object-contain"
            unoptimized
          />
        ) : (
          getInitial(initial || name)
        )}
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold leading-5">{name}</div>
        </div>
      )}
    </Link>
  )
}

function SidebarNav({
  navSections,
  pathname,
  collapsed,
  isDark,
  brandAccent,
  onNavigate,
}: {
  navSections: RoleShellNavSection[]
  pathname: string
  collapsed: boolean
  isDark: boolean
  brandAccent: string
  onNavigate?: () => void
}) {
  return (
    <nav className="space-y-4">
      {navSections.map((section) => {
        if (section.items.length === 0) return null

        return (
          <div key={section.id}>
            {!collapsed && (
              <div className={cn('mb-1 px-3 text-[11px] font-medium uppercase tracking-[0.16em]', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                {section.label}
              </div>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = isItemActive(pathname, item)
                const Icon = item.icon

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    onClick={onNavigate}
                    className={cn(
                      'group flex h-10 items-center rounded-md text-sm font-medium transition-colors',
                      collapsed ? 'justify-center px-0' : 'gap-3 px-3',
                      isActive
                        ? isDark
                          ? 'bg-white/10 text-white'
                          : 'bg-zinc-100 text-zinc-950'
                        : isDark
                          ? 'text-zinc-400 hover:bg-white/5 hover:text-white'
                          : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950',
                      item.muted && !isActive && 'opacity-70'
                    )}
                  >
                    <Icon
                      className="h-4 w-4 shrink-0"
                      style={isActive ? { color: brandAccent } : undefined}
                    />
                    {!collapsed && (
                      <>
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[10px]',
                              isDark ? 'bg-white/10 text-zinc-300' : 'bg-zinc-200 text-zinc-600'
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}
    </nav>
  )
}

function UserMenu({
  user,
  displayName,
  avatarUrl,
  isDark,
  brandAccent,
  settingsHref,
  extras,
  onSignOut,
  labels,
}: {
  user: RoleShellUser | null
  displayName: string
  avatarUrl?: string
  isDark: boolean
  brandAccent: string
  settingsHref: string
  extras?: ReactNode
  onSignOut: () => void
  labels: RoleAppShellProps['labels']
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            'h-9 w-9 rounded-full p-0 ring-1 transition-colors',
            isDark ? 'ring-white/10 hover:bg-white/10' : 'ring-zinc-200 hover:bg-zinc-100'
          )}
          style={{ '--tw-ring-color': `${brandAccent}66` } as CSSProperties}
        >
          <Avatar className="h-9 w-9">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback
              className={cn('font-semibold', isDark ? 'bg-zinc-900' : 'bg-zinc-100')}
              style={{ color: brandAccent }}
            >
              {getInitial(displayName)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className={cn('w-60', isDark ? 'border-white/10 bg-zinc-950 text-zinc-100' : 'border-zinc-200 bg-white text-zinc-950')}
        align="end"
        forceMount
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            {user?.email && (
              <p className={cn('text-xs leading-none', isDark ? 'text-zinc-500' : 'text-zinc-500')}>
                {user.email}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className={isDark ? 'bg-white/10' : 'bg-zinc-200'} />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href={settingsHref}>
            <Settings className="mr-2 h-4 w-4" />
            <span>{labels.settings}</span>
          </Link>
        </DropdownMenuItem>
        {extras && (
          <>
            <DropdownMenuSeparator className={isDark ? 'bg-white/10' : 'bg-zinc-200'} />
            {extras}
          </>
        )}
        <DropdownMenuSeparator className={isDark ? 'bg-white/10' : 'bg-zinc-200'} />
        <DropdownMenuItem onClick={onSignOut} className="cursor-pointer text-red-500 focus:bg-red-500/10 focus:text-red-500">
          <LogOut className="mr-2 h-4 w-4" />
          <span>{labels.logOut}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
