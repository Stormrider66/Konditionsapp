'use client'

/**
 * Headless Voice Coach Launcher
 *
 * Small button placed on workout cards that launches the headless AI voice coach.
 * Renders the HeadlessVoiceCoach overlay when active.
 */

import { useState } from 'react'
import { Radio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AudioCaptureManager } from '@/lib/ai/live-voice-coaching/audio-capture'
import { HeadlessVoiceCoach } from './HeadlessVoiceCoach'

interface HeadlessVoiceCoachLauncherProps {
  assignmentId: string
  workoutType: 'cardio' | 'strength' | 'hybrid'
}

export function HeadlessVoiceCoachLauncher({
  assignmentId,
  workoutType,
}: HeadlessVoiceCoachLauncherProps) {
  const [active, setActive] = useState(false)

  // Only show if browser supports audio capture
  if (typeof window === 'undefined' || !AudioCaptureManager.isSupported()) {
    return null
  }

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setActive(true)}
        disabled={active}
        className="h-9 w-9"
        title="Starta AI-Röstcoach"
      >
        <Radio className="h-4 w-4" />
      </Button>

      {active && (
        <HeadlessVoiceCoach
          assignmentId={assignmentId}
          workoutType={workoutType}
          onClose={() => setActive(false)}
        />
      )}
    </>
  )
}
