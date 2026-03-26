'use client'

/**
 * Voice Coach Hook
 *
 * Uses the Web Speech API (speechSynthesis) to provide real-time
 * voice coaching during Focus Mode cardio workouts.
 *
 * English voice with configurable rate/pitch.
 * Upgradeable to ElevenLabs for premium voice quality.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

interface UseVoiceCoachOptions {
  enabled?: boolean
  rate?: number   // 0.5–2, default 1
  pitch?: number  // 0–2, default 1
}

export function useVoiceCoach(options: UseVoiceCoachOptions = {}) {
  const { enabled: initialEnabled = false, rate = 1, pitch = 1 } = options
  const [enabled, setEnabled] = useState(initialEnabled)
  const [supported, setSupported] = useState(false)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)

  // Check support and pick a good English voice
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    setSupported(true)

    function pickVoice() {
      const voices = speechSynthesis.getVoices()
      // Prefer high-quality English voices
      const preferred = voices.find(
        (v) => v.lang.startsWith('en') && v.name.includes('Samantha')
      )
        || voices.find((v) => v.lang.startsWith('en') && v.name.includes('Daniel'))
        || voices.find((v) => v.lang.startsWith('en-US') && !v.localService === false)
        || voices.find((v) => v.lang.startsWith('en-US'))
        || voices.find((v) => v.lang.startsWith('en'))
      voiceRef.current = preferred || null
    }

    pickVoice()
    speechSynthesis.addEventListener('voiceschanged', pickVoice)
    return () => speechSynthesis.removeEventListener('voiceschanged', pickVoice)
  }, [])

  const speak = useCallback(
    (text: string, priority: 'high' | 'normal' = 'normal') => {
      if (!enabled || !supported || typeof window === 'undefined') return

      // High priority cancels current speech
      if (priority === 'high') {
        speechSynthesis.cancel()
      }

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      utterance.rate = rate
      utterance.pitch = pitch
      if (voiceRef.current) utterance.voice = voiceRef.current

      speechSynthesis.speak(utterance)
    },
    [enabled, supported, rate, pitch]
  )

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      speechSynthesis.cancel()
    }
  }, [])

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev
      if (!next) speechSynthesis?.cancel()
      return next
    })
  }, [])

  return { enabled, supported, speak, stop, toggle, setEnabled }
}

// ─── Coaching Cue Generators ──────────────────────────────────────────────────

type SegmentType = 'WARMUP' | 'COOLDOWN' | 'INTERVAL' | 'STEADY' | 'RECOVERY' | 'HILL' | 'DRILLS' | 'REST'

const TYPE_NAMES: Record<string, string> = {
  WARMUP: 'Warm up',
  COOLDOWN: 'Cool down',
  INTERVAL: 'Interval',
  STEADY: 'Steady state',
  RECOVERY: 'Recovery',
  REST: 'Rest',
  HILL: 'Hill',
  DRILLS: 'Drills',
}

function formatDurationSpeech(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins > 0 && secs > 0) return `${mins} minute${mins > 1 ? 's' : ''} ${secs} seconds`
  if (mins > 0) return `${mins} minute${mins > 1 ? 's' : ''}`
  return `${secs} seconds`
}

export function buildSegmentStartCue(segment: {
  type: string
  typeName?: string
  plannedDuration?: number
  plannedDistance?: number
  plannedZone?: number
  notes?: string
}, segmentNumber: number, totalSegments: number): string {
  const parts: string[] = []
  const typeName = TYPE_NAMES[segment.type] || segment.typeName || segment.type

  // Position
  parts.push(`Segment ${segmentNumber} of ${totalSegments}.`)

  // Type + equipment from notes
  const notes = segment.notes || ''
  // Check for round info like "Runda 1/4"
  const roundMatch = notes.match(/Runda (\d+)\/(\d+)/)
  if (roundMatch) {
    parts.push(`Round ${roundMatch[1]} of ${roundMatch[2]}.`)
  }

  // Equipment name (after " — " in notes, or before " — ")
  const noteParts = notes.split(' — ').filter(Boolean)
  const equipment = noteParts.find((p) => !p.match(/^\d/) && !p.match(/^Runda/) && !p.match(/cal$/) && !p.match(/^[0-9]+ [Ww]/) && !p.match(/rpm/i))
  if (equipment) {
    parts.push(`${equipment}.`)
  } else {
    parts.push(`${typeName}.`)
  }

  // Duration
  if (segment.plannedDuration) {
    parts.push(formatDurationSpeech(segment.plannedDuration) + '.')
  }

  // Targets from notes
  const calMatch = notes.match(/(\d+)\s*cal/)
  const wattMatch = notes.match(/(\d+)\s*W\b/)
  const rpmMatch = notes.match(/(\d+)\s*rpm/i)
  if (calMatch) parts.push(`${calMatch[1]} calories.`)
  else if (wattMatch) parts.push(`${wattMatch[1]} watts.`)
  else if (rpmMatch) parts.push(`${rpmMatch[1]} RPM.`)

  // Zone
  if (segment.plannedZone) {
    parts.push(`Zone ${segment.plannedZone}.`)
  }

  // Distance
  if (segment.plannedDistance) {
    const dist = segment.plannedDistance
    if (dist < 1) {
      parts.push(`${Math.round(dist * 1000)} meters.`)
    } else {
      parts.push(`${dist.toFixed(1)} K.`)
    }
  }

  return parts.join(' ')
}

export function buildCountdownCue(seconds: number): string | null {
  if (seconds === 30) return 'Thirty seconds.'
  if (seconds === 10) return 'Ten seconds.'
  if (seconds === 3) return 'Three'
  if (seconds === 2) return 'Two'
  if (seconds === 1) return 'One'
  return null
}

export function buildSegmentCompleteCue(nextSegment?: {
  type: string
  notes?: string
  plannedDuration?: number
}): string {
  if (!nextSegment) return 'Workout complete. Great job!'

  const typeName = TYPE_NAMES[nextSegment.type] || nextSegment.type
  const notes = nextSegment.notes || ''
  const equipment = notes.split(' — ').find((p) => !p.match(/^\d/) && !p.match(/^Runda/) && !p.match(/cal$/) && !p.match(/^[0-9]+ [Ww]/) && !p.match(/rpm/i))

  if (nextSegment.type === 'REST' || nextSegment.type === 'RECOVERY') {
    if (nextSegment.plannedDuration) {
      return `Rest. ${formatDurationSpeech(nextSegment.plannedDuration)}.`
    }
    return 'Rest.'
  }

  return `Next up: ${equipment || typeName}.`
}

export function buildSessionStartCue(sessionName: string, totalSegments: number): string {
  return `Starting ${sessionName}. ${totalSegments} segments. Let's go!`
}

export function buildSessionCompleteCue(): string {
  return 'Workout complete. Great job!'
}
