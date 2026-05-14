'use client'

/**
 * Live Voice Coach Button
 *
 * Toggle button for real-time AI voice coaching during cardio workouts.
 * Shows connection status, transcript, and mute controls.
 */

import { Mic, MicOff, Radio, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { LiveVoiceStatus } from '@/lib/ai/live-voice-coaching/types'
import { AiAllowanceBlockedAction, type AiAllowanceAction } from '@/components/athlete/ai/AiAllowanceBlockedAction'

interface LiveVoiceCoachButtonProps {
  status: LiveVoiceStatus
  isListening: boolean
  isSpeaking: boolean
  isMuted: boolean
  transcript: string | null
  error: string | null
  aiAllowanceAction?: AiAllowanceAction | null
  supported: boolean
  onConnect: () => void
  onDisconnect: () => void
  onToggleMute: () => void
}

export function LiveVoiceCoachButton({
  status,
  isListening,
  isSpeaking,
  isMuted,
  transcript,
  error,
  aiAllowanceAction,
  supported,
  onConnect,
  onDisconnect,
  onToggleMute,
}: LiveVoiceCoachButtonProps) {
  if (!supported) return null

  const isActive = status === 'connected'
  const isConnecting = status === 'connecting'

  return (
    <div className="flex items-center gap-2">
      {/* Transcript overlay */}
      {isActive && transcript && (
        <div className="max-w-[200px] text-xs text-slate-500 dark:text-slate-400 truncate animate-in fade-in duration-300">
          {transcript}
        </div>
      )}

      {/* Mute button (only when connected) */}
      {isActive && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleMute}
          className={cn(
            'h-8 w-8 hover:bg-slate-100 dark:hover:bg-white/10',
            isMuted && 'text-red-500'
          )}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
      )}

      {/* Main toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={isActive ? onDisconnect : onConnect}
        disabled={isConnecting}
        className={cn(
          'relative hover:bg-slate-100 dark:hover:bg-white/10',
          isActive && 'text-emerald-500',
          isConnecting && 'text-amber-500',
          error && 'text-red-500',
        )}
        title={
          isActive
            ? 'Disconnect AI voice coach'
            : isConnecting
              ? 'Connecting...'
              : error
                ? `Error: ${error}`
                : 'Start AI voice coach'
        }
      >
        {isConnecting ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Radio className="h-5 w-5" />
        )}

        {/* Active indicator */}
        {isActive && (
          <span
            className={cn(
              'absolute top-1 right-1 h-2 w-2 rounded-full',
              isSpeaking
                ? 'bg-emerald-400 animate-pulse'
                : isListening
                  ? 'bg-emerald-500'
                  : 'bg-slate-400'
            )}
          />
        )}
      </Button>

      <AiAllowanceBlockedAction
        action={aiAllowanceAction}
        className="h-8 whitespace-nowrap"
      />
    </div>
  )
}
