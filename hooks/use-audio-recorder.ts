'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

const MAX_DURATION_SECONDS = 60

function getSupportedMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  // Chrome/Firefox prefer webm, Safari prefers mp4
  const types = ['audio/webm', 'audio/mp4', 'audio/ogg']
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return null
}

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const resolveRef = useRef<((blob: Blob) => void) | null>(null)

  const isSupported =
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined' &&
    getSupportedMimeType() !== null

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    mediaRecorderRef.current?.stream
      ?.getTracks()
      .forEach((track) => track.stop())
    mediaRecorderRef.current = null
    chunksRef.current = []
  }, [])

  useEffect(() => cleanup, [cleanup])

  const startRecording = useCallback(async (): Promise<Blob> => {
    setError(null)
    setDuration(0)
    chunksRef.current = []

    const mimeType = getSupportedMimeType()
    if (!mimeType) {
      const msg = 'Ljudinspelning stöds inte i denna webbläsare.'
      setError(msg)
      throw new Error(msg)
    }

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      const msg = 'Kunde inte komma åt mikrofonen. Kontrollera behörigheter.'
      setError(msg)
      throw new Error(msg)
    }

    return new Promise<Blob>((resolve, reject) => {
      resolveRef.current = resolve

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        stream.getTracks().forEach((track) => track.stop())
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
        setIsRecording(false)
        resolveRef.current?.(blob)
        resolveRef.current = null
      }

      recorder.onerror = () => {
        const msg = 'Inspelningsfel uppstod.'
        setError(msg)
        cleanup()
        setIsRecording(false)
        reject(new Error(msg))
      }

      recorder.start(1000) // collect in 1s chunks
      setIsRecording(true)

      timerRef.current = setInterval(() => {
        setDuration((d) => {
          const next = d + 1
          if (next >= MAX_DURATION_SECONDS) {
            recorder.stop()
          }
          return next
        })
      }, 1000)
    })
  }, [cleanup])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  return { isRecording, duration, startRecording, stopRecording, error, isSupported }
}
