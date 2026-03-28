'use client'

/**
 * Voice Preference Selector
 *
 * Lets athletes choose their preferred AI coach voice for live voice coaching.
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { VoiceOption } from '@/lib/ai/live-voice-coaching/voices'

export function VoicePreferenceSelector() {
  const [voices, setVoices] = useState<VoiceOption[]>([])
  const [selected, setSelected] = useState<string>('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/athlete/settings/voice-preference')
      .then((r) => r.json())
      .then((data) => {
        setVoices(data.available || [])
        setSelected(data.voice || 'Kore')
      })
      .catch(() => {})
  }, [])

  const handleSelect = async (voiceName: string) => {
    setSelected(voiceName)
    setSaving(true)
    try {
      await fetch('/api/athlete/settings/voice-preference', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice: voiceName }),
      })
    } finally {
      setSaving(false)
    }
  }

  if (voices.length === 0) return null

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
        AI-Röstcoach
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {voices.map((voice) => (
          <Button
            key={voice.name}
            variant="outline"
            onClick={() => handleSelect(voice.name)}
            disabled={saving}
            className={cn(
              'h-auto py-3 px-4 justify-start text-left',
              selected === voice.name && 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
            )}
          >
            <div>
              <div className="font-semibold text-sm">
                {voice.displayName}
                <span className="ml-2 text-xs font-normal text-slate-400">{voice.style}</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {voice.description}
              </div>
            </div>
          </Button>
        ))}
      </div>
    </div>
  )
}
