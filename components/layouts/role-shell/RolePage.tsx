import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const maxWidthClasses = {
  default: 'max-w-7xl',
  wide: 'max-w-[1500px]',
  full: 'max-w-none',
}

const statToneClasses = {
  blue: 'border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300',
  emerald: 'border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
  red: 'border-red-100 bg-red-50 text-red-600 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300',
  amber: 'border-amber-100 bg-amber-50 text-amber-600 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300',
  violet: 'border-violet-100 bg-violet-50 text-violet-600 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300',
  zinc: 'border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300',
}

const rowToneClasses = {
  blue: 'hover:border-blue-200 hover:bg-blue-50/30 dark:hover:border-blue-900/60 dark:hover:bg-blue-950/20',
  emerald: 'hover:border-emerald-200 hover:bg-emerald-50/30 dark:hover:border-emerald-900/60 dark:hover:bg-emerald-950/20',
  red: 'hover:border-red-200 hover:bg-red-50/30 dark:hover:border-red-900/60 dark:hover:bg-red-950/20',
  amber: 'hover:border-amber-200 hover:bg-amber-50/30 dark:hover:border-amber-900/60 dark:hover:bg-amber-950/20',
  orange: 'hover:border-orange-200 hover:bg-orange-50/30 dark:hover:border-orange-900/60 dark:hover:bg-orange-950/20',
  violet: 'hover:border-violet-200 hover:bg-violet-50/30 dark:hover:border-violet-900/60 dark:hover:bg-violet-950/20',
  zinc: 'hover:border-zinc-300 hover:bg-zinc-50 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/70',
}

export interface RolePageFrameProps {
  children: ReactNode
  className?: string
  contentClassName?: string
  maxWidth?: keyof typeof maxWidthClasses
}

export function RolePageFrame({
  children,
  className,
  contentClassName,
  maxWidth = 'default',
}: RolePageFrameProps) {
  return (
    <div className={cn('min-h-[calc(100vh-4rem)] bg-zinc-50/80 dark:bg-zinc-950', className)}>
      <div className={cn('mx-auto w-full px-4 py-6 sm:px-6 lg:px-8', maxWidthClasses[maxWidth], contentClassName)}>
        {children}
      </div>
    </div>
  )
}

export interface RolePageHeaderProps {
  title: ReactNode
  description?: ReactNode
  eyebrow?: ReactNode
  actions?: ReactNode
  className?: string
}

export function RolePageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: RolePageHeaderProps) {
  return (
    <header
      className={cn(
        'mb-6 flex flex-col gap-4 border-b border-zinc-200 pb-5 dark:border-white/10 lg:flex-row lg:items-end lg:justify-between',
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">
            {eyebrow}
          </div>
        )}
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50 md:text-3xl">
          {title}
        </h1>
        {description && (
          <div className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            {description}
          </div>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  )
}

export interface RoleStatCardProps {
  label: ReactNode
  value: ReactNode
  icon: LucideIcon
  tone?: keyof typeof statToneClasses
  description?: ReactNode
  className?: string
}

export function RoleStatCard({
  label,
  value,
  icon: Icon,
  tone = 'zinc',
  description,
  className,
}: RoleStatCardProps) {
  return (
    <section
      className={cn(
        'rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-950/60',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
          <div className="mt-2 text-3xl font-semibold leading-none text-zinc-950 dark:text-zinc-50">
            {value}
          </div>
        </div>
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-md border', statToneClasses[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {description && (
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      )}
    </section>
  )
}

export function RolePanel({ className, ...props }: ComponentPropsWithoutRef<'section'>) {
  return (
    <section
      className={cn(
        'rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-950/60',
        className
      )}
      {...props}
    />
  )
}

export function RolePanelHeader({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={cn('border-b border-zinc-200 p-5 dark:border-white/10', className)}
      {...props}
    />
  )
}

export function RolePanelContent({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={cn('p-5', className)}
      {...props}
    />
  )
}

export function RolePanelTitle({ className, ...props }: ComponentPropsWithoutRef<'h3'>) {
  return (
    <h3
      className={cn('text-base font-semibold text-zinc-950 dark:text-zinc-50', className)}
      {...props}
    />
  )
}

export function RolePanelDescription({ className, ...props }: ComponentPropsWithoutRef<'p'>) {
  return (
    <p
      className={cn('mt-1 text-sm text-zinc-500 dark:text-zinc-400', className)}
      {...props}
    />
  )
}

export function RolePanelFooter({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={cn('border-t border-zinc-200 p-5 dark:border-white/10', className)}
      {...props}
    />
  )
}

export function roleMutedBlockClass(className?: string) {
  return cn(
    'rounded-lg border border-zinc-200 bg-zinc-50/70 p-4 dark:border-white/10 dark:bg-zinc-900/40',
    className
  )
}

export function roleSurfaceClass(className?: string) {
  return cn(
    'rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-950/60',
    className
  )
}

export function roleTableHeadClass(className?: string) {
  return cn(
    'border-b bg-zinc-50/90 text-xs uppercase text-zinc-500 dark:border-white/10 dark:bg-zinc-900/80 dark:text-zinc-400',
    className
  )
}

export function roleListItemClass(tone: keyof typeof rowToneClasses = 'zinc', className?: string) {
  return cn(
    'rounded-lg border border-zinc-200 bg-white transition-colors dark:border-white/10 dark:bg-zinc-950/40',
    rowToneClasses[tone],
    className
  )
}

export function roleTabsListClass(className?: string) {
  return cn(
    'rounded-lg border border-zinc-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-zinc-950/60',
    className
  )
}

export function roleSkeletonClass(className?: string) {
  return cn('bg-zinc-200/80 dark:bg-white/10', className)
}

export function roleEmptyStateClass(className?: string) {
  return cn(
    'rounded-lg border border-dashed border-zinc-200 px-4 py-10 text-center text-zinc-500 dark:border-white/10 dark:text-zinc-400',
    className
  )
}
