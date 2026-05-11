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
    <div className={cn('absolute inset-0 overflow-hidden bg-slate-950', className)} aria-hidden="true">
      <Image
        src={visual.src}
        alt=""
        fill
        priority={priority}
        loading={priority ? 'eager' : 'lazy'}
        sizes="(min-width: 1024px) 66vw, 100vw"
        className="object-cover"
        style={{ objectPosition: visual.objectPosition || 'center' }}
      />
      <div className="absolute inset-0 bg-slate-950/35" />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/82 to-slate-950/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/88 via-slate-950/15 to-slate-950/25" />
      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-80 mix-blend-screen', visual.accentClass)} />
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
        className="object-cover opacity-75"
        style={{ objectPosition: visual.objectPosition || 'center' }}
      />
      <div className="absolute inset-0 bg-gradient-to-l from-slate-950/5 via-slate-950/45 to-slate-950" />
      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-50 mix-blend-screen', visual.accentClass)} />
    </div>
  )
}
