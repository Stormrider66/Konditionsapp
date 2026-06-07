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
import { enUS, sv } from 'date-fns/locale'
import {
  Dumbbell,
  HeartPulse,
  Layers,
  Zap,
  FileText,
  ChevronRight,
  FolderOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useLocale } from '@/i18n/client'

interface StudioOption {
  id: 'strength' | 'cardio' | 'hybrid' | 'agility' | 'free-text'
  label: { en: string; sv: string }
  description: { en: string; sv: string }
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  path: string
}

interface ExistingWorkoutOption {
  id: 'existing-strength' | 'existing-cardio' | 'existing-hybrid' | 'existing-agility'
  label: { en: string; sv: string }
  description: { en: string; sv: string }
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  path: string
  tab: string
}

const STUDIO_OPTIONS: StudioOption[] = [
  {
    id: 'strength',
    label: { en: 'Strength', sv: 'Styrka' },
    description: { en: 'Create strength workouts with exercises and sets', sv: 'Skapa styrkepass med övningar och set' },
    icon: Dumbbell,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 hover:bg-orange-100',
    path: '/strength',
  },
  {
    id: 'cardio',
    label: { en: 'Cardio', sv: 'Kondition' },
    description: { en: 'Build cardio workouts with intervals and zones', sv: 'Bygg konditionspass med intervaller och zoner' },
    icon: HeartPulse,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100',
    path: '/cardio',
  },
  {
    id: 'hybrid',
    label: { en: 'Hybrid', sv: 'Hybrid' },
    description: { en: 'Combine strength and cardio', sv: 'Kombinera styrka och kondition' },
    icon: Layers,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100',
    path: '/hybrid-studio',
  },
  {
    id: 'agility',
    label: { en: 'Agility', sv: 'Agility' },
    description: { en: 'Speed, agility, and coordination', sv: 'Snabbhet, smidighet och koordination' },
    icon: Zap,
    color: 'text-green-600',
    bgColor: 'bg-green-50 hover:bg-green-100',
    path: '/agility-studio',
  },
  {
    id: 'free-text',
    label: { en: 'Free text', sv: 'Fritext' },
    description: { en: 'Add a note', sv: 'Lägg till anteckning' },
    icon: FileText,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 hover:bg-gray-100',
    path: '',
  },
]

const EXISTING_WORKOUT_OPTIONS: ExistingWorkoutOption[] = [
  {
    id: 'existing-strength',
    label: { en: 'Saved strength', sv: 'Mina styrkepass' },
    description: { en: 'Choose from My sessions and assign it to this day', sv: 'Välj från Mina pass och tilldela denna dag' },
    icon: Dumbbell,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 hover:bg-orange-100',
    path: '/strength',
    tab: 'sessions',
  },
  {
    id: 'existing-cardio',
    label: { en: 'Saved cardio', sv: 'Mina konditionspass' },
    description: { en: 'Choose an existing cardio session', sv: 'Välj ett befintligt konditionspass' },
    icon: HeartPulse,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100',
    path: '/cardio',
    tab: 'library',
  },
  {
    id: 'existing-hybrid',
    label: { en: 'Saved hybrid', sv: 'Mina hybridpass' },
    description: { en: 'Choose an existing functional workout', sv: 'Välj ett befintligt hybridpass' },
    icon: Layers,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100',
    path: '/hybrid-studio',
    tab: 'custom',
  },
  {
    id: 'existing-agility',
    label: { en: 'Saved agility', sv: 'Mina agilitypass' },
    description: { en: 'Choose an existing agility workout', sv: 'Välj ett befintligt agilitypass' },
    icon: Zap,
    color: 'text-green-600',
    bgColor: 'bg-green-50 hover:bg-green-100',
    path: '/agility-studio',
    tab: 'workouts',
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
  const locale = useLocale()
  const appLocale = locale === 'sv' ? 'sv' : 'en'
  const dateLocale = locale === 'sv' ? sv : enUS

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

      if (!businessSlug) {
        router.push('/login')
        onOpenChange(false)
        return
      }

      router.push(`/${businessSlug}/coach${option.path}?clientId=${clientId}&date=${dateString}&fromCalendar=true`)
      onOpenChange(false)
    },
    [router, clientId, date, onOpenChange, onOpenEventDialog, businessSlug]
  )

  const handleExistingWorkoutSelect = useCallback(
    (option: ExistingWorkoutOption) => {
      const dateString = format(date, 'yyyy-MM-dd')

      if (!businessSlug) {
        router.push('/login')
        onOpenChange(false)
        return
      }

      const params = new URLSearchParams({
        clientId,
        date: dateString,
        fromCalendar: 'true',
        deployExisting: 'true',
        athleteFilter: clientId,
        tab: option.tab,
      })

      router.push(`/${businessSlug}/coach${option.path}?${params.toString()}`)
      onOpenChange(false)
    },
    [businessSlug, clientId, date, onOpenChange, router]
  )

  const formattedDate = format(date, 'EEEE d MMMM yyyy', { locale: dateLocale })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{appLocale === 'sv' ? 'Skapa pass' : 'Create workout'}</DialogTitle>
          <DialogDescription>
            <span className="capitalize">{formattedDate}</span>
            {clientName && (
              <span className="block text-xs mt-1 text-muted-foreground">
                {appLocale === 'sv' ? 'för' : 'for'} {clientName}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {appLocale === 'sv' ? 'Skapa nytt' : 'Create new'}
            </p>
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
                <p className="font-medium text-gray-900">{option.label[appLocale]}</p>
                <p className="text-sm text-gray-500">{option.description[appLocale]}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
            </button>
          ))}
          </div>

          <div className="space-y-2 border-t pt-4">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <FolderOpen className="h-3.5 w-3.5" />
              {appLocale === 'sv' ? 'Använd befintligt' : 'Use existing'}
            </p>
            {EXISTING_WORKOUT_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => handleExistingWorkoutSelect(option)}
                className={cn(
                  'w-full flex items-center gap-3 p-4 rounded-lg transition-colors text-left',
                  option.bgColor
                )}
              >
                <div className={cn('p-2.5 rounded-lg bg-white shadow-sm', option.color)}>
                  <option.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{option.label[appLocale]}</p>
                  <p className="text-sm text-gray-500">{option.description[appLocale]}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
