import type { ComponentPropsWithoutRef, HTMLAttributes, ReactNode } from 'react'
import {
  RolePanel,
  RolePanelContent,
  RolePanelDescription,
  RolePanelHeader,
  RolePanelTitle,
} from '@/components/layouts/role-shell/RolePage'
import { cn } from '@/lib/utils'

type DashboardCardTone = 'blue' | 'emerald' | 'purple' | 'amber' | 'red' | 'teal' | 'slate' | 'none'

const toneHoverClasses: Record<DashboardCardTone, string> = {
  none: '',
  blue: 'hover:border-blue-200 hover:shadow-blue-500/10 dark:hover:border-blue-900/60',
  emerald: 'hover:border-emerald-200 hover:shadow-emerald-500/10 dark:hover:border-emerald-900/60',
  purple: 'hover:border-violet-200 hover:shadow-violet-500/10 dark:hover:border-violet-900/60',
  amber: 'hover:border-amber-200 hover:shadow-amber-500/10 dark:hover:border-amber-900/60',
  red: 'hover:border-red-200 hover:shadow-red-500/10 dark:hover:border-red-900/60',
  teal: 'hover:border-teal-200 hover:shadow-teal-500/10 dark:hover:border-teal-900/60',
  slate: 'hover:border-zinc-300 hover:shadow-zinc-500/10 dark:hover:border-zinc-700',
}

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
