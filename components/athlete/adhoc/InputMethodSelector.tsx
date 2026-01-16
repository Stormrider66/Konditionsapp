'use client'

/**
 * Input Method Selector
 *
 * Modal for selecting how to log an ad-hoc workout.
 * Supports: Photo, Voice, Text, Strava Import, Garmin Import, Manual Form
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Camera,
  Mic,
  FileText,
  Activity,
  Watch,
  ClipboardList,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface InputMethodSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface InputMethod {
  id: 'photo' | 'voice' | 'text' | 'strava' | 'garmin' | 'manual'
  label: string
  description: string
  icon: React.ReactNode
  color: string
  available: boolean
}

const INPUT_METHODS: InputMethod[] = [
  {
    id: 'photo',
    label: 'Foto',
    description: 'Ta en bild av whiteboard eller papper',
    icon: <Camera className="h-6 w-6" />,
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    available: true,
  },
  {
    id: 'voice',
    label: 'Röst',
    description: 'Beskriv passet med ett röstmeddelande',
    icon: <Mic className="h-6 w-6" />,
    color: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    available: true,
  },
  {
    id: 'text',
    label: 'Skriv',
    description: 'Skriv en beskrivning av passet',
    icon: <FileText className="h-6 w-6" />,
    color: 'bg-green-500/10 text-green-500 border-green-500/20',
    available: true,
  },
  {
    id: 'strava',
    label: 'Strava',
    description: 'Importera från din Strava-aktivitet',
    icon: <Activity className="h-6 w-6" />,
    color: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    available: true,
  },
  {
    id: 'garmin',
    label: 'Garmin',
    description: 'Importera från din Garmin-aktivitet',
    icon: <Watch className="h-6 w-6" />,
    color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    available: true,
  },
  {
    id: 'manual',
    label: 'Formulär',
    description: 'Fyll i ett strukturerat formulär',
    icon: <ClipboardList className="h-6 w-6" />,
    color: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    available: true,
  },
]

export function InputMethodSelector({ open, onOpenChange }: InputMethodSelectorProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const handleSelectMethod = async (method: InputMethod) => {
    if (!method.available) return

    setLoading(method.id)

    // Navigate to the appropriate input page
    switch (method.id) {
      case 'photo':
        router.push('/athlete/log-workout/photo')
        break
      case 'voice':
        router.push('/athlete/log-workout/voice')
        break
      case 'text':
        router.push('/athlete/log-workout/text')
        break
      case 'strava':
        router.push('/athlete/log-workout/import/strava')
        break
      case 'garmin':
        router.push('/athlete/log-workout/import/garmin')
        break
      case 'manual':
        router.push('/athlete/log-workout/manual')
        break
    }

    // Close dialog after a short delay to allow navigation
    setTimeout(() => {
      onOpenChange(false)
      setLoading(null)
    }, 300)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Logga ett pass</DialogTitle>
          <DialogDescription>
            Välj hur du vill registrera ditt träningspass
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {INPUT_METHODS.map((method) => (
            <Button
              key={method.id}
              variant="outline"
              className={cn(
                'h-auto p-4 justify-start gap-4 border-2 transition-all',
                method.available
                  ? 'hover:border-primary/50 hover:bg-accent'
                  : 'opacity-50 cursor-not-allowed',
                loading === method.id && 'border-primary'
              )}
              onClick={() => handleSelectMethod(method)}
              disabled={!method.available || loading !== null}
            >
              <div
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-lg border',
                  method.color
                )}
              >
                {loading === method.id ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  method.icon
                )}
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold">{method.label}</div>
                <div className="text-sm text-muted-foreground">{method.description}</div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
