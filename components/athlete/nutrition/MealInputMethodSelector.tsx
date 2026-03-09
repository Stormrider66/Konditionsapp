'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Camera, Mic, FileText, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MealInputMethodSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectMethod: (method: 'photo' | 'voice' | 'quick') => void
}

const MEAL_METHODS = [
  {
    id: 'photo' as const,
    label: 'Foto',
    description: 'Ta en bild på din mat',
    icon: <Camera className="h-6 w-6" />,
    color: 'bg-green-500/10 text-green-500 border-green-500/20',
  },
  {
    id: 'voice' as const,
    label: 'Röst',
    description: 'Beskriv vad du ätit',
    icon: <Mic className="h-6 w-6" />,
    color: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  },
  {
    id: 'quick' as const,
    label: 'Skriv',
    description: 'Snabblogga en måltid',
    icon: <FileText className="h-6 w-6" />,
    color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  },
]

export function MealInputMethodSelector({
  open,
  onOpenChange,
  onSelectMethod,
}: MealInputMethodSelectorProps) {
  const handleSelect = (method: 'photo' | 'voice' | 'quick') => {
    onOpenChange(false)
    onSelectMethod(method)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Logga mat</DialogTitle>
          <DialogDescription>
            Välj hur du vill registrera din måltid
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {MEAL_METHODS.map((method) => (
            <Button
              key={method.id}
              variant="outline"
              className="h-auto p-4 justify-start gap-4 border-2 transition-all hover:border-primary/50 hover:bg-accent"
              onClick={() => handleSelect(method.id)}
            >
              <div
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-lg border',
                  method.color
                )}
              >
                {method.icon}
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
