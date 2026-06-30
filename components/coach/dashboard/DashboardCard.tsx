import type { ComponentPropsWithoutRef, HTMLAttributes, ReactNode } from 'react'
import {
  RolePanel,
  RolePanelContent,
  RolePanelDescription,
  RolePanelHeader,
  RolePanelTitle,
} from '@/components/layouts/role-shell/RolePage'
import { cn } from '@/lib/utils'

// Fixed semantic palette: blue=primary/info, emerald=positive, amber=warning, red=critical, slate=neutral default.
// Don't add decorative one-off hues here — route status/category color through one of these five.
type DashboardCardTone = 'blue' | 'emerald' | 'amber' | 'red' | 'slate' | 'none'
type DashboardListItemTone = Exclude<DashboardCardTone, 'none'>

const toneHoverClasses: Record<DashboardCardTone, string> = {
  none: '',
  blue: 'hover:border-blue-200 hover:shadow-blue-500/10 dark:hover:border-blue-900/60',
  emerald: 'hover:border-emerald-200 hover:shadow-emerald-500/10 dark:hover:border-emerald-900/60',
  amber: 'hover:border-amber-200 hover:shadow-amber-500/10 dark:hover:border-amber-900/60',
  red: 'hover:border-red-200 hover:shadow-red-500/10 dark:hover:border-red-900/60',
  slate: 'hover:border-zinc-300 hover:shadow-zinc-500/10 dark:hover:border-zinc-700',
}

const listItemToneClasses: Record<DashboardListItemTone, string> = {
  blue: 'hover:border-blue-200 hover:bg-blue-50/30 dark:hover:border-blue-900/60 dark:hover:bg-blue-950/20',
  emerald: 'hover:border-emerald-200 hover:bg-emerald-50/30 dark:hover:border-emerald-900/60 dark:hover:bg-emerald-950/20',
  amber: 'hover:border-amber-200 hover:bg-amber-50/30 dark:hover:border-amber-900/60 dark:hover:bg-amber-950/20',
  red: 'hover:border-red-200 hover:bg-red-50/30 dark:hover:border-red-900/60 dark:hover:bg-red-950/20',
  slate: 'hover:border-zinc-300 hover:bg-zinc-50 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/70',
}

export function dashboardListItemClass(tone: DashboardListItemTone = 'slate', className?: string) {
  return cn(
    'rounded-lg border border-zinc-200 bg-white transition-colors dark:border-white/10 dark:bg-zinc-950/40',
    listItemToneClasses[tone],
    className
  )
}

export const dashboardEmptyStateClass =
  'rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-muted-foreground dark:border-white/10 dark:bg-zinc-950/40'

interface DashboardCardProps extends ComponentPropsWithoutRef<'section'> {
  children: ReactNode
  gradient?: boolean
  glow?: DashboardCardTone
}

export function DashboardCard({
  children,
  className,
  gradient: _gradient = false,
  glow = 'none',
  ...props
}: DashboardCardProps) {
  return (
    <RolePanel
      className={cn(
        'overflow-hidden text-zinc-950 transition-colors dark:text-zinc-50',
        toneHoverClasses[glow],
        className
      )}
      {...props}
    >
      {children}
    </RolePanel>
  )
}

export function DashboardCardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <RolePanelHeader
      className={cn('flex flex-col space-y-1.5', className)}
      {...props}
    />
  )
}

export function DashboardCardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <RolePanelTitle
      className={cn('leading-none tracking-normal', className)}
      {...props}
    />
  )
}

export function DashboardCardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <RolePanelDescription
      className={cn('mt-0', className)}
      {...props}
    />
  )
}

export function DashboardCardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <RolePanelContent className={className} {...props} />
}

export function DashboardCardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center p-5 pt-0', className)} {...props} />
}
