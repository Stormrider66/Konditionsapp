'use client'

/**
 * Voice Workout Creator
 *
 * Multi-step flow for creating workouts via voice:
 * 1. record - Audio recording
 * 2. processing - AI processing
 * 3. review - Review parsed intent
 * 4. confirm - Confirm and save
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import {
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Send,
  X,
} from 'lucide-react'
import { WorkoutIntentPreview } from './WorkoutIntentPreview'
import { TargetSelector } from './TargetSelector'
import { VoiceWorkoutConfirmation } from './VoiceWorkoutConfirmation'
import type { VoiceWorkoutPreview, VoiceWorkoutIntent } from '@/types/voice-workout'

type Step = 'record' | 'processing' | 'review' | 'confirm'

interface VoiceWorkoutCreatorProps {
  onComplete?: (result: { workoutId: string; workoutType: string }) => void
  onCancel?: () => void
  maxDuration?: number // seconds (default 180 = 3 minutes)
}

export function VoiceWorkoutCreator({
  onComplete,
  onCancel,
  maxDuration = 180,
}: VoiceWorkoutCreatorProps) {
  const [step, setStep] = useState<Step>('record')
  const [duration, setDuration] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [preview, setPreview] = useState<VoiceWorkoutPreview | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationRef = useRef<number | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  // Draw waveform visualization
  const drawWaveform = useCallback(() => {
    if (!analyserRef.current || !canvasRef.current) return

    const analyser = analyserRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      if (!isRecording) return

      animationRef.current = requestAnimationFrame(draw)
      analyser.getByteTimeDomainData(dataArray)

      ctx.fillStyle = 'rgb(30, 41, 59)' // slate-800
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.lineWidth = 2
      ctx.strokeStyle = 'rgb(59, 130, 246)' // blue-500
      ctx.beginPath()

      const sliceWidth = canvas.width / bufferLength
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0
        const y = (v * canvas.height) / 2

        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }

        x += sliceWidth
      }

      ctx.lineTo(canvas.width, canvas.height / 2)
      ctx.stroke()
    }

    draw()
  }, [isRecording])

  // Start recording
  const startRecording = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Setup audio analyser for visualization
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      })

      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType,
        })
        const url = URL.createObjectURL(blob)
        setAudioBlob(blob)
        setAudioUrl(url)
        setIsRecording(false)

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)
      setDuration(0)

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          if (prev >= maxDuration - 1) {
            stopRecording()
            return maxDuration
          }
          return prev + 1
        })
      }, 1000)

      // Start waveform visualization
      setTimeout(drawWaveform, 100)
    } catch (err) {
      console.error('Error accessing microphone:', err)
      setError('Kunde inte komma åt mikrofonen. Kontrollera att du har gett tillstånd.')
    }
  }

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
  }

  // Play/pause recorded audio
  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  // Delete recording and start over
  const deleteRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioUrl(null)
    setAudioBlob(null)
    setDuration(0)
    setSessionId(null)
    setPreview(null)
    setStep('record')
  }

  // Upload and process with AI
  const uploadAndProcess = async () => {
    if (!audioBlob) return

    try {
      setError(null)
      setStep('processing')

      // Create FormData for upload
      const formData = new FormData()
      formData.append('audio', audioBlob, 'voice-workout.webm')
      formData.append('duration', String(duration))

      // Upload and process
      const response = await fetch('/api/coach/voice-workout', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Uppladdning misslyckades')
      }

      const result = await response.json()
      setSessionId(result.sessionId)
      setPreview(result.preview)
      setStep('review')
    } catch (err) {
      console.error('Upload/process error:', err)
      setError(err instanceof Error ? err.message : 'Ett fel uppstod')
      setStep('record')
    }
  }

  // Update intent (after coach corrections)
  const handleIntentUpdate = async (updates: Partial<VoiceWorkoutIntent>) => {
    if (!sessionId) return

    try {
      const response = await fetch(`/api/coach/voice-workout/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error('Kunde inte uppdatera')
      }

      const result = await response.json()
      setPreview(result.preview)
    } catch (err) {
      console.error('Update error:', err)
      setError(err instanceof Error ? err.message : 'Kunde inte uppdatera')
    }
  }

  // Confirm and save workout
  const handleConfirm = async (options: {
    targetType: 'ATHLETE' | 'TEAM'
    targetId: string
    assignedDate: string
    createCalendarEvent?: boolean
    calendarEventTime?: string
  }) => {
    if (!sessionId) return

    try {
      setIsSubmitting(true)

      const response = await fetch(`/api/coach/voice-workout/${sessionId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignment: {
            targetType: options.targetType,
            targetId: options.targetId,
            assignedDate: options.assignedDate,
          },
          createCalendarEvent: options.createCalendarEvent,
          calendarEventTime: options.calendarEventTime,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Kunde inte spara pass')
      }

      const result = await response.json()
      onComplete?.({
        workoutId: result.workoutId,
        workoutType: result.workoutType,
      })
    } catch (err) {
      console.error('Confirm error:', err)
      setError(err instanceof Error ? err.message : 'Kunde inte spara pass')
      setIsSubmitting(false)
    }
  }

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-lg font-semibold">Skapa pass med röst</h2>
          <p className="text-sm text-muted-foreground">
            {step === 'record' && 'Beskriv passet du vill skapa'}
            {step === 'processing' && 'AI analyserar din beskrivning...'}
            {step === 'review' && 'Granska och justera'}
            {step === 'confirm' && 'Bekräfta och spara'}
          </p>
        </div>
        {onCancel && (
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
        {(['record', 'processing', 'review', 'confirm'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={cn(
                'flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium',
                step === s
                  ? 'bg-primary text-primary-foreground'
                  : ['record', 'processing', 'review', 'confirm'].indexOf(step) > i
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
              )}
            >
              {i + 1}
            </div>
            {i < 3 && (
              <div
                className={cn(
                  'w-8 h-0.5 mx-1',
                  ['record', 'processing', 'review', 'confirm'].indexOf(step) > i
                    ? 'bg-primary/50'
                    : 'bg-muted'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Error display */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step: Record */}
        {step === 'record' && (
          <div className="space-y-6">
            {/* Waveform visualization */}
            {isRecording && (
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={100}
                  className="w-full h-24 rounded-lg"
                />
                <Badge className="absolute top-2 right-2 bg-red-500 animate-pulse">
                  Spelar in
                </Badge>
              </div>
            )}

            {/* Recording progress */}
            {(isRecording || audioUrl) && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-mono text-lg">{formatDuration(duration)}</span>
                  <span className="text-muted-foreground">/ {formatDuration(maxDuration)}</span>
                </div>
                <Progress value={(duration / maxDuration) * 100} className="h-2" />
              </div>
            )}

            {/* Audio playback element */}
            {audioUrl && (
              <audio
                ref={audioRef}
                src={audioUrl}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
            )}

            {/* Tips */}
            {!isRecording && !audioUrl && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="font-medium">Exempel:</p>
                <p className="text-sm text-muted-foreground">
                  &ldquo;Skapa ett intervallpass till Johan på torsdag. 4 gånger 4 minuter i zon 4
                  med 3 minuters vila mellan.&rdquo;
                </p>
                <p className="text-sm text-muted-foreground">
                  &ldquo;Styrkepass för Team Alpha på måndag. Fokus på underkropp med knäböj,
                  utfall och marklyft.&rdquo;
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-3">
              {!isRecording && !audioUrl && (
                <Button onClick={startRecording} size="lg" className="gap-2">
                  <Mic className="h-5 w-5" />
                  Starta inspelning
                </Button>
              )}

              {isRecording && (
                <Button onClick={stopRecording} variant="destructive" size="lg" className="gap-2">
                  <Square className="h-5 w-5" />
                  Stoppa inspelning
                </Button>
              )}

              {audioUrl && !isRecording && (
                <>
                  <Button onClick={uploadAndProcess} size="lg" className="gap-2">
                    <ArrowRight className="h-5 w-5" />
                    Analysera med AI
                  </Button>

                  <div className="flex gap-2">
                    <Button onClick={togglePlayback} variant="outline" className="flex-1 gap-2">
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      {isPlaying ? 'Pausa' : 'Lyssna'}
                    </Button>

                    <Button onClick={deleteRecording} variant="ghost" className="flex-1 gap-2">
                      <Trash2 className="h-4 w-4" />
                      Ta bort
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Step: Processing */}
        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <div className="text-center">
              <p className="font-medium">AI analyserar din beskrivning...</p>
              <p className="text-sm text-muted-foreground">
                Transkriberar ljud och extraherar passstruktur
              </p>
            </div>
          </div>
        )}

        {/* Step: Review */}
        {step === 'review' && preview && (
          <div className="space-y-6">
            <WorkoutIntentPreview
              preview={preview}
              onUpdate={handleIntentUpdate}
            />
          </div>
        )}

        {/* Step: Confirm */}
        {step === 'confirm' && preview && (
          <VoiceWorkoutConfirmation
            preview={preview}
            onConfirm={handleConfirm}
            isSubmitting={isSubmitting}
          />
        )}
      </div>

      {/* Footer navigation */}
      {step === 'review' && preview && (
        <div className="p-4 border-t flex gap-2">
          <Button variant="outline" onClick={deleteRecording} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Börja om
          </Button>
          <Button
            onClick={() => setStep('confirm')}
            className="flex-1 gap-2"
            disabled={!preview.canSave}
          >
            Fortsätt till bekräftelse
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {step === 'confirm' && (
        <div className="p-4 border-t">
          <Button variant="outline" onClick={() => setStep('review')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Tillbaka
          </Button>
        </div>
      )}
    </div>
  )
}
