'use client'

/**
 * Day Action Menu
 *
 * Shows a context menu when coach clicks on an empty day in the calendar.
 * Provides quick access to create workouts, events, and tests.
 *
 * Desktop: Popover positioned near click
 * Mobile: Bottom sheet
 */

import { useState, useCallback } from 'react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import {
  Zap,
  Dumbbell,
  CalendarPlus,
  Activity,
  FileText,
  X,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useIsMobile } from './hooks/useSwipeNavigation'

export type DayActionType = 'quick-workout' | 'full-workout' | 'calendar-event' | 'field-test' | 'note'

interface DayAction {
  id: DayActionType
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
}

const DAY_ACTIONS: DayAction[] = [
  {
    id: 'quick-workout',
    label: 'Snabbpass',
    description: 'Skapa pass snabbt',
    icon: Zap,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 hover:bg-amber-100',
  },
  {
    id: 'full-workout',
    label: 'Fullt pass',
    description: 'Välj studio för detaljerat pass',
    icon: Dumbbell,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100',
  },
  {
    id: 'calendar-event',
    label: 'Kalenderhändelse',
    description: 'Resa, semester, sjukdom mm.',
    icon: CalendarPlus,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100',
  },
  {
    id: 'field-test',
    label: 'Fälttest',
    description: 'Schemalägg ett test',
    icon: Activity,
    color: 'text-green-600',
    bgColor: 'bg-green-50 hover:bg-green-100',
  },
  {
    id: 'note',
    label: 'Anteckning',
    description: 'Lägg till en notering',
    icon: FileText,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 hover:bg-gray-100',
  },
]

interface DayActionMenuProps {
  /** The date that was clicked */
  date: Date
  /** Client ID */
  clientId: string
  /** Whether the menu is open */
  isOpen: boolean
  /** Called when the menu should close */
  onClose: () => void
  /** Called when an action is selected */
  onAction: (action: DayActionType, date: Date) => void
  /** Position for desktop popover (optional) */
  anchorEl?: HTMLElement | null
}

export function DayActionMenu({
  date,
  clientId,
  isOpen,
  onClose,
  onAction,
  anchorEl,
}: DayActionMenuProps) {
  const isMobile = useIsMobile()

  const handleAction = useCallback(
    (actionId: DayActionType) => {
      onAction(actionId, date)
      onClose()
    },
    [onAction, date, onClose]
  )

  const formattedDate = format(date, 'EEEE d MMMM', { locale: sv })

  const menuContent = (
    <div className="space-y-1">
      {DAY_ACTIONS.map((action) => (
        <button
          key={action.id}
          onClick={() => handleAction(action.id)}
          className={cn(
            'w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left',
            action.bgColor
          )}
        >
          <div className={cn('p-2 rounded-lg bg-white shadow-sm', action.color)}>
            <action.icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900">{action.label}</p>
            <p className="text-sm text-gray-500 truncate">{action.description}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
        </button>
      ))}
    </div>
  )

  // Mobile: Use bottom sheet
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="bottom" className="h-auto max-h-[80vh] rounded-t-2xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-left">
              <span className="text-gray-500 text-sm font-normal block">
                Lägg till för
              </span>
              <span className="capitalize">{formattedDate}</span>
            </SheetTitle>
          </SheetHeader>
          {menuContent}
          <div className="mt-4 pb-2">
            <Button
              variant="ghost"
              className="w-full"
              onClick={onClose}
            >
              Avbryt
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  // Desktop: Use popover
  return (
    <Popover open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <PopoverTrigger asChild>
        <span className="sr-only">Öppna meny</span>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-3"
        align="start"
        side="right"
        sideOffset={8}
      >
        <div className="flex items-center justify-between mb-3 pb-2 border-b">
          <div>
            <p className="text-sm text-gray-500">Lägg till för</p>
            <p className="font-medium capitalize">{formattedDate}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        {menuContent}
      </PopoverContent>
    </Popover>
  )
}

/**
 * Hook to manage day action menu state
 */
export function useDayActionMenu() {
  const [menuState, setMenuState] = useState<{
    isOpen: boolean
    date: Date | null
    anchorEl: HTMLElement | null
  }>({
    isOpen: false,
    date: null,
    anchorEl: null,
  })

  const openMenu = useCallback((date: Date, anchorEl?: HTMLElement) => {
    setMenuState({
      isOpen: true,
      date,
      anchorEl: anchorEl || null,
    })
  }, [])

  const closeMenu = useCallback(() => {
    setMenuState((prev) => ({
      ...prev,
      isOpen: false,
    }))
  }, [])

  return {
    ...menuState,
    openMenu,
    closeMenu,
  }
}
