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

export type MealInputMethod = 'photo' | 'voice' | 'quick' | 'ingredients'

interface MealInputMethodSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectMethod: (method: MealInputMethod) => void
}

// "Skriv" lands in QuickMealLog which has its own Beskrivning/Ingredienser
// tabs, so we don't show a separate "Ingredienser" entry — that just routes
// to the same dialog and confuses the user.
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
    description: 'Snabblogga eller bygg från ingredienser',
    icon: <FileText className="h-6 w-6" />,
    color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  },
]

export function MealInputMethodSelector({
  open,
  onOpenChange,
  onSelectMethod,
}: MealInputMethodSelectorProps) {
  const handleSelect = (method: MealInputMethod) => {
    onOpenChange(false)
    onSelectMethod(method)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onCloseAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="dark:text-slate-100">Logga mat</DialogTitle>
          <DialogDescription className="dark:text-slate-400">
            Välj hur du vill registrera din måltid
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {MEAL_METHODS.map((method) => (
            <Button
              key={method.id}
              variant="outline"
              className="h-auto p-4 justify-start gap-4 border-2 transition-all hover:border-primary/50 hover:bg-accent dark:border-slate-700"
              onClick={() => handleSelect(method.id)}
            >
              <div
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-lg border shrink-0',
                  method.color
                )}
              >
                {method.icon}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="font-semibold text-foreground dark:text-slate-100">{method.label}</div>
                <div className="text-sm text-muted-foreground dark:text-slate-400 truncate">{method.description}</div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
