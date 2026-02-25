'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { HeroWorkoutCard } from './HeroWorkoutCard'
import { AssignmentHeroCard } from './AssignmentHeroCard'
import { WODHeroCard } from './WODHeroCard'
import type { DashboardItem } from '@/types/dashboard-items'
import { isItemCompleted } from '@/types/dashboard-items'

interface HeroCardSliderProps {
  items: DashboardItem[]
  athleteName?: string
  basePath?: string
}

export function HeroCardSlider({ items, athleteName, basePath }: HeroCardSliderProps) {
  // Auto-focus on first incomplete item
  const initialIndex = items.findIndex(item => !isItemCompleted(item))
  const [activeIndex, setActiveIndex] = useState(Math.max(0, initialIndex))
  const touchStartX = useRef<number | null>(null)

  // Update activeIndex if items change (e.g. new WOD created via chat)
  useEffect(() => {
    if (activeIndex >= items.length) {
      setActiveIndex(Math.max(0, items.length - 1))
    }
  }, [items.length, activeIndex])

  const goTo = useCallback((index: number) => {
    setActiveIndex(Math.max(0, Math.min(index, items.length - 1)))
  }, [items.length])

  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo])
  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    touchStartX.current = null
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext()
      else goPrev()
    }
  }, [goNext, goPrev])

  // Single item - no slider needed
  if (items.length === 1) {
    return renderItem(items[0], athleteName, basePath)
  }

  const current = items[activeIndex]

  return (
    <div
      className="lg:col-span-2 relative"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Navigation arrows */}
      {activeIndex > 0 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white/80 dark:bg-slate-800/80 shadow-md hover:bg-white dark:hover:bg-slate-700"
          onClick={goPrev}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}
      {activeIndex < items.length - 1 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white/80 dark:bg-slate-800/80 shadow-md hover:bg-white dark:hover:bg-slate-700"
          onClick={goNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* Hero card content */}
      {renderItem(current, athleteName, basePath)}

      {/* Dot indicators + counter */}
      <div className="flex items-center justify-center gap-2 mt-3">
        <span className="text-xs text-muted-foreground font-medium">
          {activeIndex + 1}/{items.length}
        </span>
        <div className="flex gap-1.5">
          {items.map((item, i) => {
            const completed = isItemCompleted(item)
            return (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={cn(
                  'h-2 w-2 rounded-full transition-all',
                  i === activeIndex
                    ? completed
                      ? 'bg-emerald-500 scale-125'
                      : 'bg-white ring-2 ring-slate-400 dark:ring-slate-500 scale-125'
                    : completed
                      ? 'bg-emerald-400/60'
                      : 'bg-slate-300 dark:bg-slate-600'
                )}
                aria-label={`Pass ${i + 1}`}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

function renderItem(item: DashboardItem, athleteName?: string, basePath?: string) {
  switch (item.kind) {
    case 'program':
      return (
        <HeroWorkoutCard
          workout={item.workout}
          athleteName={athleteName}
          basePath={basePath}
        />
      )
    case 'assignment':
      return (
        <AssignmentHeroCard
          assignment={item}
          athleteName={athleteName}
          basePath={basePath}
        />
      )
    case 'wod':
      return (
        <WODHeroCard
          wod={item}
          athleteName={athleteName}
          basePath={basePath}
        />
      )
  }
}
