'use client'

/**
 * Full Workout Dialog
 *
 * Shows options for creating a detailed workout using different "studios":
 * - AI Studio: Conversational AI-assisted workout creation
 * - Manual Builder: Step-by-step workout segment editor
 * - Program Wizard: Full program generation
 * - Free Text: Quick note/annotation
 */

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import {
  Sparkles,
  Wrench,
  Wand2,
  FileText,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface StudioOption {
  id: 'ai-studio' | 'manual-builder' | 'program-wizard' | 'free-text'
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
}

const STUDIO_OPTIONS: StudioOption[] = [
  {
    id: 'ai-studio',
    label: 'AI Studio',
    description: 'Skapa pass med AI-assistent',
    icon: Sparkles,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100',
  },
  {
    id: 'manual-builder',
    label: 'Manuell byggare',
    description: 'Bygg pass steg för steg',
    icon: Wrench,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100',
  },
  {
    id: 'program-wizard',
    label: 'Programguide',
    description: 'Skapa helt träningsprogram',
    icon: Wand2,
    color: 'text-green-600',
    bgColor: 'bg-green-50 hover:bg-green-100',
  },
  {
    id: 'free-text',
    label: 'Fritext',
    description: 'Lägg till anteckning',
    icon: FileText,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 hover:bg-gray-100',
  },
]

interface FullWorkoutDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Called when dialog open state changes */
  onOpenChange: (open: boolean) => void
  /** Client ID */
  clientId: string
  /** Client name for display */
  clientName?: string
  /** Selected date */
  date: Date
  /** Called when calendar event should open (for free text) */
  onOpenEventDialog?: () => void
}

export function FullWorkoutDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  date,
  onOpenEventDialog,
}: FullWorkoutDialogProps) {
  const router = useRouter()

  const handleStudioSelect = useCallback(
    (studioId: StudioOption['id']) => {
      const dateString = format(date, 'yyyy-MM-dd')

      switch (studioId) {
        case 'ai-studio':
          // Navigate to AI Studio with context
          router.push(`/coach/ai-studio?clientId=${clientId}&date=${dateString}`)
          break
        case 'manual-builder':
          // Navigate to session builder/editor
          // The manual builder needs a program context, so we go to cardio builder
          router.push(`/coach/cardio?clientId=${clientId}&date=${dateString}`)
          break
        case 'program-wizard':
          // Navigate to program creation wizard
          router.push(`/programs/new?clientId=${clientId}&startDate=${dateString}`)
          break
        case 'free-text':
          // Open the event dialog for a note
          onOpenChange(false)
          if (onOpenEventDialog) {
            onOpenEventDialog()
          }
          return // Don't close dialog yet, let event dialog handle it
      }

      onOpenChange(false)
    },
    [router, clientId, date, onOpenChange, onOpenEventDialog]
  )

  const formattedDate = format(date, 'EEEE d MMMM yyyy', { locale: sv })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Skapa pass</DialogTitle>
          <DialogDescription>
            <span className="capitalize">{formattedDate}</span>
            {clientName && (
              <span className="block text-xs mt-1 text-muted-foreground">
                för {clientName}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          {STUDIO_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => handleStudioSelect(option.id)}
              className={cn(
                'w-full flex items-center gap-3 p-4 rounded-lg transition-colors text-left',
                option.bgColor
              )}
            >
              <div className={cn('p-2.5 rounded-lg bg-white shadow-sm', option.color)}>
                <option.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{option.label}</p>
                <p className="text-sm text-gray-500">{option.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
