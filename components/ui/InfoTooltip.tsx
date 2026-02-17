'use client'

import { useState, useEffect } from 'react'
import { Info } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { getInfoEntry } from '@/lib/info-content'
import { cn } from '@/lib/utils'

interface InfoTooltipProps {
  conceptKey: string
  size?: 'sm' | 'md'
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  className?: string
}

export function InfoTooltip({
  conceptKey,
  size = 'sm',
  side = 'top',
  align = 'center',
  className,
}: InfoTooltipProps) {
  const [showDetailed, setShowDetailed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const entry = getInfoEntry(conceptKey)

  useEffect(() => { setMounted(true) }, [])

  if (!entry) return null

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'

  // Render plain span during SSR/hydration to avoid Radix ID mismatch
  // Using span instead of button to avoid nested <button> when placed inside interactive elements
  if (!mounted) {
    return (
      <span
        role="button"
        tabIndex={0}
        className={cn(
          'inline-flex items-center justify-center rounded-full text-muted-foreground/60 hover:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer',
          className
        )}
        aria-label={`Information om ${entry.title}`}
      >
        <Info className={iconSize} />
      </span>
    )
  }

  return (
    <Popover onOpenChange={(open) => { if (!open) setShowDetailed(false) }}>
      <PopoverTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          className={cn(
            'inline-flex items-center justify-center rounded-full text-muted-foreground/60 hover:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer',
            className
          )}
          aria-label={`Information om ${entry.title}`}
        >
          <Info className={iconSize} />
        </span>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className="w-72 p-3"
      >
        <div className="space-y-1.5">
          <h4 className="text-sm font-semibold leading-tight">{entry.title}</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">{entry.short}</p>
          {showDetailed ? (
            <p className="text-xs text-muted-foreground leading-relaxed border-t pt-1.5 mt-1.5">
              {entry.detailed}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setShowDetailed(true)}
              className="text-xs text-primary hover:underline font-medium"
            >
              Läs mer
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
