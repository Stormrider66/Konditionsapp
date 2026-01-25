'use client'

/**
 * Photo Capture Component
 *
 * Handles camera capture or file upload for workout images.
 * Supports photos of whiteboards, gym screens, or handwritten notes.
 */

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import {
  Camera,
  Upload,
  X,
  RotateCw,
  CalendarIcon,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PhotoCaptureProps {
  onSubmit: (data: { imageUrl: string; workoutDate: Date }) => Promise<void>
  isProcessing?: boolean
}

export function PhotoCapture({ onSubmit, isProcessing }: PhotoCaptureProps) {
  const [workoutDate, setWorkoutDate] = useState<Date>(new Date())
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string>()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Vänligen välj en bildfil')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Bilden får inte vara större än 10MB')
      return
    }

    setError(undefined)
    setImageFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleClearImage = () => {
    setImagePreview(null)
    setImageFile(null)
    setError(undefined)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  const handleSubmit = async () => {
    if (!imageFile) return

    try {
      setUploading(true)
      setError(undefined)

      // Upload to API
      const formData = new FormData()
      formData.append('file', imageFile)
      formData.append('type', 'PHOTO')

      const uploadRes = await fetch('/api/adhoc-workouts/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        const data = await uploadRes.json()
        throw new Error(data.error || 'Failed to upload image')
      }

      const uploadData = await uploadRes.json()
      const imageUrl = uploadData.data.url

      // Call parent submit handler
      await onSubmit({ imageUrl, workoutDate })
    } catch (error) {
      console.error('Error uploading image:', error)
      setError(error instanceof Error ? error.message : 'Det gick inte att ladda upp bilden')
    } finally {
      setUploading(false)
    }
  }

  const isSubmitting = uploading || isProcessing

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Ta en bild
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

        {/* Image capture area */}
        {!imagePreview ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {/* Camera button (mobile) */}
              <Button
                variant="outline"
                className="h-32 flex-col gap-2"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isSubmitting}
              >
                <Camera className="h-8 w-8" />
                <span>Kamera</span>
              </Button>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelect}
              />

              {/* File upload button */}
              <Button
                variant="outline"
                className="h-32 flex-col gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
              >
                <Upload className="h-8 w-8" />
                <span>Välj fil</span>
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>Tips: Ta en bild av whiteboard, träningsprogram eller anteckningar</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Image preview */}
            <div className="relative rounded-lg overflow-hidden border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt="Förhandsgranskning"
                className="w-full h-auto max-h-80 object-contain bg-muted"
              />
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-2 right-2"
                onClick={handleClearImage}
                disabled={isSubmitting}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Re-take buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isSubmitting}
              >
                <RotateCw className="h-4 w-4 mr-2" />
                Ta ny bild
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Välj annan fil
              </Button>
            </div>
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
          disabled={!imageFile || isSubmitting}
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
