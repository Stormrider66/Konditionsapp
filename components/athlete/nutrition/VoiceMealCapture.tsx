'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Mic, MicOff, Loader2, Check, AlertCircle } from 'lucide-react'
import { MealType } from '@prisma/client'
import { cn } from '@/lib/utils'

interface VoiceMealCaptureProps {
  onMealSaved?: () => void
  onClose?: () => void
}

type Step = 'RECORD' | 'TRANSCRIBING' | 'REVIEW' | 'SAVING' | 'DONE'

const MEAL_TYPE_LABELS: Record<string, string> = {
  BREAKFAST: 'Frukost',
  MORNING_SNACK: 'Förmiddagsmellanmål',
  LUNCH: 'Lunch',
  AFTERNOON_SNACK: 'Eftermiddagsmellanmål',
  PRE_WORKOUT: 'Före träning',
  POST_WORKOUT: 'Efter träning',
  DINNER: 'Middag',
  EVENING_SNACK: 'Kvällsmellanmål',
}

function guessDefaultMealType(): MealType {
  const hour = new Date().getHours()
  if (hour < 10) return 'BREAKFAST'
  if (hour < 12) return 'MORNING_SNACK'
  if (hour < 14) return 'LUNCH'
  if (hour < 16) return 'AFTERNOON_SNACK'
  if (hour < 19) return 'DINNER'
  return 'EVENING_SNACK'
}

export function VoiceMealCapture({ onMealSaved, onClose }: VoiceMealCaptureProps) {
  const [step, setStep] = useState<Step>('RECORD')
  const [isRecording, setIsRecording] = useState(false)
  const [transcribedText, setTranscribedText] = useState('')
  const [mealType, setMealType] = useState<MealType>(guessDefaultMealType())
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const preferredTypes = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav']
      const supportedType = preferredTypes.find((t) => MediaRecorder.isTypeSupported(t))
      const mediaRecorder = new MediaRecorder(stream, supportedType ? { mimeType: supportedType } : undefined)

      chunksRef.current = []
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType })
        await transcribeAudio(blob, mediaRecorder.mimeType)
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)
    } catch {
      setError('Kunde inte starta mikrofonen. Kontrollera att du gett tillåtelse.')
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setStep('TRANSCRIBING')
    }
  }, [])

  const transcribeAudio = async (blob: Blob, mimeType: string) => {
    try {
      const formData = new FormData()
      const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('ogg') ? 'ogg' : mimeType.includes('wav') ? 'wav' : 'mp4'
      formData.append('audio', blob, `meal-recording.${ext}`)

      const res = await fetch('/api/ai/food-scan/transcribe-audio', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Transkribering misslyckades')
      }

      const data = await res.json()
      setTranscribedText(data.transcription || data.text || '')
      setStep('REVIEW')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transkribering misslyckades')
      setStep('RECORD')
    }
  }

  const handleSave = async () => {
    if (!transcribedText.trim()) return
    setStep('SAVING')
    setError(null)

    try {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date().toISOString().split('T')[0],
          mealType,
          description: transcribedText.trim(),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Kunde inte spara måltid')
      }

      setStep('DONE')
      onMealSaved?.()
      setTimeout(() => onClose?.(), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte spara måltid')
      setStep('REVIEW')
    }
  }

  if (step === 'DONE') {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
          <Check className="h-8 w-8 text-green-500" />
        </div>
        <p className="text-lg font-semibold">Måltid sparad!</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 py-4">
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 rounded-lg p-3">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {step === 'RECORD' && (
        <div className="flex flex-col items-center gap-6 py-8">
          <p className="text-sm text-muted-foreground text-center">
            Tryck för att spela in och beskriv vad du ätit
          </p>
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={cn(
              'w-24 h-24 rounded-full flex items-center justify-center transition-all',
              isRecording
                ? 'bg-red-500 animate-pulse shadow-lg shadow-red-500/30'
                : 'bg-purple-500/10 hover:bg-purple-500/20 border-2 border-purple-500/30'
            )}
          >
            {isRecording ? (
              <MicOff className="h-10 w-10 text-white" />
            ) : (
              <Mic className="h-10 w-10 text-purple-500" />
            )}
          </button>
          <p className="text-sm text-muted-foreground">
            {isRecording ? 'Tryck för att stoppa' : 'Tryck för att spela in'}
          </p>
        </div>
      )}

      {step === 'TRANSCRIBING' && (
        <div className="flex flex-col items-center gap-4 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          <p className="text-sm text-muted-foreground">Transkriberar...</p>
        </div>
      )}

      {step === 'REVIEW' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Måltidstyp</Label>
            <Select value={mealType} onValueChange={(v) => setMealType(v as MealType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MEAL_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Beskrivning</Label>
            <Textarea
              value={transcribedText}
              onChange={(e) => setTranscribedText(e.target.value)}
              rows={3}
              placeholder="Vad åt du?"
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setTranscribedText('')
                setStep('RECORD')
              }}
            >
              Spela in igen
            </Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={!transcribedText.trim()}
            >
              Spara måltid
            </Button>
          </div>
        </div>
      )}

      {step === 'SAVING' && (
        <div className="flex flex-col items-center gap-4 py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm text-muted-foreground">Sparar måltid...</p>
        </div>
      )}
    </div>
  )
}
