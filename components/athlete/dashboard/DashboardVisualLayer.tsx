import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { DashboardVisual } from './dashboard-visuals'

interface DashboardVisualLayerProps {
  visual: DashboardVisual
  priority?: boolean
  className?: string
}

export function DashboardVisualLayer({ visual, priority = false, className }: DashboardVisualLayerProps) {
  return (
    <div className={cn('absolute inset-0 overflow-hidden bg-white dark:bg-slate-950', className)} aria-hidden="true">
      <Image
        src={visual.src}
        alt=""
        fill
        priority={priority}
        loading={priority ? 'eager' : 'lazy'}
        sizes="(min-width: 1024px) 66vw, 100vw"
        className="object-cover opacity-55 dark:opacity-100"
        style={{ objectPosition: visual.objectPosition || 'center' }}
      />
      <div className="absolute inset-0 bg-white/58 dark:bg-slate-950/35" />
      <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-white/55 dark:from-slate-950/95 dark:via-slate-950/82 dark:to-slate-950/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-white/96 via-white/35 to-white/60 dark:from-slate-950/88 dark:via-slate-950/15 dark:to-slate-950/25" />
      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-25 mix-blend-multiply dark:opacity-80 dark:mix-blend-screen', visual.accentClass)} />
    </div>
  )
}

export function DashboardVisualRail({ visual }: { visual: DashboardVisual }) {
  return (
    <div className="absolute inset-y-0 right-0 w-28 overflow-hidden sm:w-36" aria-hidden="true">
      <Image
        src={visual.src}
        alt=""
        fill
        sizes="9rem"
        className="object-cover opacity-45 dark:opacity-75"
        style={{ objectPosition: visual.objectPosition || 'center' }}
      />
      <div className="absolute inset-0 bg-gradient-to-l from-white/10 via-white/50 to-white dark:from-slate-950/5 dark:via-slate-950/45 dark:to-slate-950" />
      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-30 mix-blend-multiply dark:opacity-50 dark:mix-blend-screen', visual.accentClass)} />
    </div>
  )
}
