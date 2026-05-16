'use client'

import {
  Headphones,
  HelpCircle,
  Mic,
  Radio,
  Volume2,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface VoiceModesGuideProps {
  variant?: 'icon' | 'card'
  onDismiss?: () => void
  onStartVoiceOperator?: () => void
  className?: string
}

const VOICE_MODES = [
  {
    title: 'Mic',
    description: 'Prata en gång. Jag skriver in det i meddelandefältet.',
    icon: Mic,
  },
  {
    title: 'Auto-send',
    description: 'Skickar rösttexten automatiskt efter en kort paus.',
    icon: Zap,
  },
  {
    title: 'Röstsvar',
    description: 'Läser upp mina textsvar högt.',
    icon: Volume2,
  },
  {
    title: 'Voice operator',
    description: 'Mic, auto-send och röstsvar tillsammans. Rekommenderas för de flesta.',
    icon: Headphones,
    recommended: true,
  },
  {
    title: 'Live voice',
    description: 'Prata i realtid som ett samtal. Åtgärder bekräftas fortfarande i chatten.',
    icon: Radio,
  },
] as const

function VoiceModesList() {
  return (
    <div className="space-y-2">
      {VOICE_MODES.map((mode) => {
        const Icon = mode.icon
        return (
          <div key={mode.title} className="flex gap-2 rounded-md bg-muted/50 p-2">
            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-300" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold leading-none">{mode.title}</p>
                {'recommended' in mode && mode.recommended && (
                  <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 dark:text-emerald-300">
                    Rek.
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs leading-snug text-muted-foreground">
                {mode.description}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function VoiceModesGuide({
  variant = 'icon',
  onDismiss,
  onStartVoiceOperator,
  className,
}: VoiceModesGuideProps) {
  if (variant === 'card') {
    return (
      <div className={cn('rounded-lg border bg-muted/35 p-3 text-left', className)}>
        <div className="mb-2 flex items-start gap-2">
          <div className="rounded-md bg-emerald-500/15 p-1.5 text-emerald-700 dark:text-emerald-300">
            <Headphones className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Vill du prata med AI-assistenten?</p>
            <p className="text-xs text-muted-foreground">
              Börja med Voice operator om du vill prata naturligt men ändå se vad som skickas.
            </p>
          </div>
        </div>
        <VoiceModesList />
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          {onDismiss && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-8 px-2 text-xs"
            >
              Hoppa över
            </Button>
          )}
          {onStartVoiceOperator && (
            <Button
              type="button"
              size="sm"
              onClick={onStartVoiceOperator}
              className="h-8 bg-emerald-600 px-2 text-xs hover:bg-emerald-700"
            >
              Starta voice operator
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8 text-white hover:bg-white/20', className)}
          title="Röstlägen"
          aria-label="Visa röstlägen"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="end" side="bottom">
        <div className="mb-3">
          <p className="text-sm font-semibold">Röstlägen</p>
          <p className="text-xs text-muted-foreground">
            Välj hur mycket av samtalet som ska ske med röst.
          </p>
        </div>
        <VoiceModesList />
      </PopoverContent>
    </Popover>
  )
}
