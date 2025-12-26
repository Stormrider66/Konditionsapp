'use client'

/**
 * Mobile Calendar FAB (Floating Action Button)
 *
 * Provides quick access to common calendar actions on mobile devices.
 * Expands to show action options when tapped.
 */

import { useState, useCallback, useEffect } from 'react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import {
  Plus,
  X,
  Calendar,
  Activity,
  Plane,
  Heart,
  Mountain,
  Umbrella,
  Briefcase,
  CalendarPlus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CalendarEventType } from '@prisma/client'

interface QuickAction {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  eventType?: CalendarEventType
  color: string
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'event',
    label: 'Ny händelse',
    icon: CalendarPlus,
    color: 'bg-purple-500 text-white',
  },
  {
    id: 'vacation',
    label: 'Semester',
    icon: Umbrella,
    eventType: 'VACATION',
    color: 'bg-yellow-500 text-white',
  },
  {
    id: 'travel',
    label: 'Resa',
    icon: Plane,
    eventType: 'TRAVEL',
    color: 'bg-blue-500 text-white',
  },
  {
    id: 'illness',
    label: 'Sjukdom',
    icon: Heart,
    eventType: 'ILLNESS',
    color: 'bg-red-500 text-white',
  },
  {
    id: 'altitude',
    label: 'Höghöjdsläger',
    icon: Mountain,
    eventType: 'ALTITUDE_CAMP',
    color: 'bg-emerald-500 text-white',
  },
  {
    id: 'work',
    label: 'Arbete',
    icon: Briefcase,
    eventType: 'WORK_BLOCKER',
    color: 'bg-gray-600 text-white',
  },
]

interface MobileCalendarFABProps {
  /** Called when an action is selected */
  onAction: (action: { type: 'new-event'; eventType?: CalendarEventType }) => void
  /** Currently selected date */
  selectedDate: Date | null
  /** Whether the FAB is visible */
  visible?: boolean
}

export function MobileCalendarFAB({
  onAction,
  selectedDate,
  visible = true,
}: MobileCalendarFABProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev)
  }, [])

  const handleAction = useCallback(
    (action: QuickAction) => {
      setIsExpanded(false)
      onAction({
        type: 'new-event',
        eventType: action.eventType,
      })
    },
    [onAction]
  )

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isExpanded])

  // Close when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (isExpanded && !target.closest('[data-fab-container]')) {
        setIsExpanded(false)
      }
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [isExpanded])

  if (!visible) return null

  return (
    <div
      data-fab-container
      className="fixed bottom-6 right-6 z-40 md:hidden"
    >
      {/* Backdrop when expanded */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/30 -z-10 animate-in fade-in duration-200"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Action buttons */}
      <div
        className={cn(
          'flex flex-col-reverse items-end gap-3 mb-3',
          'transition-all duration-300',
          isExpanded
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'
        )}
      >
        {QUICK_ACTIONS.map((action, index) => (
          <button
            key={action.id}
            onClick={(e) => {
              e.stopPropagation()
              handleAction(action)
            }}
            className={cn(
              'flex items-center gap-3 pr-4 pl-3 py-2.5 rounded-full shadow-lg',
              'transform transition-all duration-200',
              action.color,
              'active:scale-95',
              isExpanded
                ? 'translate-x-0 opacity-100'
                : 'translate-x-8 opacity-0'
            )}
            style={{
              transitionDelay: isExpanded ? `${index * 50}ms` : '0ms',
            }}
          >
            <action.icon className="h-5 w-5" />
            <span className="text-sm font-medium whitespace-nowrap">
              {action.label}
            </span>
          </button>
        ))}
      </div>

      {/* Selected date indicator */}
      {selectedDate && isExpanded && (
        <div
          className={cn(
            'absolute bottom-20 right-0 bg-background rounded-lg shadow-lg px-3 py-2 text-sm',
            'transition-all duration-200',
            isExpanded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          )}
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{format(selectedDate, 'd MMMM', { locale: sv })}</span>
          </div>
        </div>
      )}

      {/* Main FAB button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          handleToggle()
        }}
        className={cn(
          'w-14 h-14 rounded-full shadow-lg',
          'flex items-center justify-center',
          'transition-all duration-300',
          'active:scale-95',
          isExpanded
            ? 'bg-muted text-muted-foreground rotate-45'
            : 'bg-primary text-primary-foreground rotate-0'
        )}
        aria-label={isExpanded ? 'Stäng meny' : 'Snabbåtgärder'}
        aria-expanded={isExpanded}
      >
        {isExpanded ? (
          <X className="h-6 w-6 -rotate-45" />
        ) : (
          <Plus className="h-6 w-6" />
        )}
      </button>
    </div>
  )
}

/**
 * Mini FAB - Smaller version for less prominent actions
 */
interface MiniFABProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  className?: string
}

export function MiniFAB({ icon: Icon, label, onClick, className }: MiniFABProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-12 h-12 rounded-full shadow-lg',
        'flex items-center justify-center',
        'bg-primary text-primary-foreground',
        'active:scale-95 transition-transform',
        className
      )}
      aria-label={label}
    >
      <Icon className="h-5 w-5" />
    </button>
  )
}
