'use client'

/**
 * Voice Capture Component
 *
 * Records voice input for workout logging.
 * Uses MediaRecorder API for audio capture.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import {
  Mic,
  Square,
  Play,
  Pause,
  RotateCw,
  CalendarIcon,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface VoiceCaptureProps {
  onSubmit: (data: { audioUrl: string; workoutDate: Date }) => Promise<void>
  isProcessing?: boolean
  maxDuration?: number // Max recording duration in seconds
}

export function VoiceCapture({
  onSubmit,
  isProcessing,
  maxDuration = 120, // 2 minutes default
}: VoiceCaptureProps) {
  const [workoutDate, setWorkoutDate] = useState<Date>(new Date())
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string>()
  const [permissionDenied, setPermissionDenied] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [audioUrl])

  // Define stopRecording first (uses refs to avoid dependency issues)
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      setError(undefined)
      setPermissionDenied(false)

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start(1000) // Collect data every second
      setIsRecording(true)
      setDuration(0)

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          if (prev >= maxDuration) {
            stopRecording()
            return prev
          }
          return prev + 1
        })
      }, 1000)
    } catch (err) {
      console.error('Error accessing microphone:', err)
      if ((err as Error).name === 'NotAllowedError') {
        setPermissionDenied(true)
        setError('Mikrofonåtkomst nekades. Vänligen ge tillstånd i din webbläsare.')
      } else {
        setError('Kunde inte starta inspelning. Kontrollera att din mikrofon fungerar.')
      }
    }
  }, [maxDuration, stopRecording])

  const togglePause = useCallback(() => {
    if (!mediaRecorderRef.current) return

    if (isPaused) {
      mediaRecorderRef.current.resume()
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1)
      }, 1000)
    } else {
      mediaRecorderRef.current.pause()
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    setIsPaused(!isPaused)
  }, [isPaused])

  const handleClearRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioBlob(null)
    setAudioUrl(null)
    setDuration(0)
    setError(undefined)
  }

  const togglePlayback = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleAudioEnded = () => {
    setIsPlaying(false)
  }

  const handleSubmit = async () => {
    if (!audioBlob) return

    try {
      setUploading(true)
      setError(undefined)

      // Upload to API
      const formData = new FormData()
      formData.append('file', audioBlob, 'recording.webm')
      formData.append('type', 'VOICE')

      const uploadRes = await fetch('/api/adhoc-workouts/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        const data = await uploadRes.json()
        throw new Error(data.error || 'Failed to upload audio')
      }

      const uploadData = await uploadRes.json()
      const uploadedUrl = uploadData.data.url

      // Call parent submit handler
      await onSubmit({ audioUrl: uploadedUrl, workoutDate })
    } catch (error) {
      console.error('Error uploading audio:', error)
      setError(error instanceof Error ? error.message : 'Det gick inte att ladda upp ljudfilen')
    } finally {
      setUploading(false)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const isSubmitting = uploading || isProcessing

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Spela in röstmeddelande
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Date picker */}
        <div className="space-y-2">
          <label className="text-sm font-medium">När genomfördes passet?</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !workoutDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {workoutDate ? (
                  format(workoutDate, 'PPP', { locale: sv })
                ) : (
                  <span>Välj datum</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={workoutDate}
                onSelect={(date) => date && setWorkoutDate(date)}
                disabled={(date) => date > new Date()}
                initialFocus
                locale={sv}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Recording controls */}
        <div className="space-y-4">
          {!audioUrl ? (
            // Recording mode
            <div className="flex flex-col items-center gap-4 py-8">
              {/* Recording indicator */}
              <div
                className={cn(
                  'w-32 h-32 rounded-full flex items-center justify-center transition-all',
                  isRecording
                    ? 'bg-red-500 animate-pulse'
                    : 'bg-muted hover:bg-muted/80'
                )}
              >
                {isRecording ? (
                  <div className="text-white text-center">
                    <Mic className="h-10 w-10 mx-auto mb-1" />
                    <span className="text-sm font-medium">{formatDuration(duration)}</span>
                  </div>
                ) : (
                  <Mic className="h-10 w-10 text-muted-foreground" />
                )}
              </div>

              {/* Recording buttons */}
              <div className="flex gap-3">
                {!isRecording ? (
                  <Button
                    size="lg"
                    onClick={startRecording}
                    disabled={permissionDenied || isSubmitting}
                  >
                    <Mic className="h-5 w-5 mr-2" />
                    Börja spela in
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={togglePause}
                    >
                      {isPaused ? (
                        <>
                          <Play className="h-5 w-5 mr-2" />
                          Fortsätt
                        </>
                      ) : (
                        <>
                          <Pause className="h-5 w-5 mr-2" />
                          Pausa
                        </>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      size="lg"
                      onClick={stopRecording}
                    >
                      <Square className="h-5 w-5 mr-2" />
                      Stoppa
                    </Button>
                  </>
                )}
              </div>

              {/* Max duration info */}
              <p className="text-sm text-muted-foreground">
                Max {Math.floor(maxDuration / 60)} minuter
              </p>
            </div>
          ) : (
            // Playback mode
            <div className="space-y-4">
              {/* Audio player */}
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={togglePlayback}
                    disabled={isSubmitting}
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </Button>
                  <div className="flex-1">
                    <div className="h-2 bg-background rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-full" />
                    </div>
                  </div>
                  <span className="text-sm font-medium">{formatDuration(duration)}</span>
                </div>
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onEnded={handleAudioEnded}
                  className="hidden"
                />
              </div>

              {/* Re-record button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={handleClearRecording}
                disabled={isSubmitting}
              >
                <RotateCw className="h-4 w-4 mr-2" />
                Spela in igen
              </Button>
            </div>
          )}
        </div>

        {/* Tips */}
        {!audioUrl && !isRecording && (
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium mb-2">Tips:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>Beskriv vilken typ av pass du gjorde</li>
              <li>Nämn duration, distans eller antal set/reps</li>
              <li>Berätta hur tungt eller lätt det kändes</li>
            </ul>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={!audioBlob || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {uploading ? 'Laddar upp...' : 'Analyserar...'}
            </>
          ) : (
            'Fortsätt'
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
