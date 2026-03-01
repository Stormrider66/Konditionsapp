'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { HeroWorkoutCard } from './HeroWorkoutCard'
import { AssignmentHeroCard } from './AssignmentHeroCard'
import { WODHeroCard } from './WODHeroCard'
import { RemoveWorkoutDialog } from './RemoveWorkoutDialog'
import { removeDashboardItem } from '@/app/actions/remove-dashboard-item'
import type { DashboardItem } from '@/types/dashboard-items'
import { isItemCompleted } from '@/types/dashboard-items'

interface HeroCardSliderProps {
  items: DashboardItem[]
  athleteName?: string
  basePath?: string
}

function buildPayload(item: DashboardItem) {
  switch (item.kind) {
    case 'wod':
      return { kind: 'wod' as const, id: item.id }
    case 'program':
      return { kind: 'program' as const, workoutId: item.workout.id, isCustom: item.workout.isCustom }
    case 'assignment':
      return { kind: 'assignment' as const, assignmentType: item.assignmentType, id: item.id }
  }
}

export function HeroCardSlider({ items, athleteName, basePath }: HeroCardSliderProps) {
  // Auto-focus on first incomplete item
  const initialIndex = items.findIndex(item => !isItemCompleted(item))
  const [activeIndex, setActiveIndex] = useState(Math.max(0, initialIndex))
  const touchStartX = useRef<number | null>(null)

  // Remove dialog state
  const [removeTarget, setRemoveTarget] = useState<DashboardItem | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

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

  const handleRemoveConfirm = useCallback(async () => {
    if (!removeTarget) return
    setIsRemoving(true)
    try {
      const result = await removeDashboardItem(buildPayload(removeTarget))
      if (!result.success) {
        toast.error(result.error || 'Kunde inte ta bort passet')
      }
    } catch {
      toast.error('Något gick fel')
    } finally {
      setIsRemoving(false)
      setRemoveTarget(null)
    }
  }, [removeTarget])

  const handleRemoveRequest = useCallback((item: DashboardItem) => {
    setRemoveTarget(item)
  }, [])

  // Single item - no slider needed
  if (items.length === 1) {
    return (
      <>
        {renderItem(items[0], athleteName, basePath, () => handleRemoveRequest(items[0]))}
        <RemoveWorkoutDialog
          item={removeTarget}
          open={!!removeTarget}
          onOpenChange={(open) => { if (!open) setRemoveTarget(null) }}
          onConfirm={handleRemoveConfirm}
          isRemoving={isRemoving}
        />
      </>
    )
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
      {renderItem(current, athleteName, basePath, () => handleRemoveRequest(current))}

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

      {/* Shared remove dialog */}
      <RemoveWorkoutDialog
        item={removeTarget}
        open={!!removeTarget}
        onOpenChange={(open) => { if (!open) setRemoveTarget(null) }}
        onConfirm={handleRemoveConfirm}
        isRemoving={isRemoving}
      />
    </div>
  )
}

function renderItem(item: DashboardItem, athleteName?: string, basePath?: string, onRemove?: () => void) {
  switch (item.kind) {
    case 'program':
      return (
        <HeroWorkoutCard
          workout={item.workout}
          athleteName={athleteName}
          basePath={basePath}
          onRemove={onRemove}
        />
      )
    case 'assignment':
      return (
        <AssignmentHeroCard
          assignment={item}
          athleteName={athleteName}
          basePath={basePath}
          onRemove={onRemove}
        />
      )
    case 'wod':
      return (
        <WODHeroCard
          wod={item}
          athleteName={athleteName}
          basePath={basePath}
          onRemove={onRemove}
        />
      )
  }
}
