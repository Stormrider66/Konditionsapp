'use client'

/**
 * Full Workout Dialog
 *
 * Shows options for creating a detailed workout using different studios:
 * - Strength Studio
 * - Cardio Studio
 * - Hybrid Studio
 * - Agility Studio
 * - Free Text (notes)
 */

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import {
  Dumbbell,
  HeartPulse,
  Layers,
  Zap,
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
  id: 'strength' | 'cardio' | 'hybrid' | 'agility' | 'free-text'
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  path: string
}

const STUDIO_OPTIONS: StudioOption[] = [
  {
    id: 'strength',
    label: 'Styrka',
    description: 'Skapa styrkepass med övningar och set',
    icon: Dumbbell,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 hover:bg-orange-100',
    path: '/coach/strength',
  },
  {
    id: 'cardio',
    label: 'Kondition',
    description: 'Bygg konditionspass med intervaller och zoner',
    icon: HeartPulse,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100',
    path: '/coach/cardio',
  },
  {
    id: 'hybrid',
    label: 'Hybrid',
    description: 'Kombinera styrka och kondition',
    icon: Layers,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100',
    path: '/coach/hybrid-studio',
  },
  {
    id: 'agility',
    label: 'Agility',
    description: 'Snabbhet, smidighet och koordination',
    icon: Zap,
    color: 'text-green-600',
    bgColor: 'bg-green-50 hover:bg-green-100',
    path: '/coach/agility-studio',
  },
  {
    id: 'free-text',
    label: 'Fritext',
    description: 'Lägg till anteckning',
    icon: FileText,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 hover:bg-gray-100',
    path: '',
  },
]

interface FullWorkoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  clientName?: string
  date: Date
  onOpenEventDialog?: () => void
  businessSlug?: string
}

export function FullWorkoutDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  date,
  onOpenEventDialog,
  businessSlug,
}: FullWorkoutDialogProps) {
  const router = useRouter()

  const handleStudioSelect = useCallback(
    (option: StudioOption) => {
      const dateString = format(date, 'yyyy-MM-dd')

      if (option.id === 'free-text') {
        onOpenChange(false)
        if (onOpenEventDialog) {
          onOpenEventDialog()
        }
        return
      }

      const prefix = businessSlug ? `/${businessSlug}` : ''
      router.push(`${prefix}${option.path}?clientId=${clientId}&date=${dateString}&fromCalendar=true`)
      onOpenChange(false)
    },
    [router, clientId, date, onOpenChange, onOpenEventDialog, businessSlug]
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
              onClick={() => handleStudioSelect(option)}
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
