'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  Upload,
  Video,
  X,
  Loader2,
  Dumbbell,
  PersonStanding,
  Activity,
} from 'lucide-react'

interface VideoUploaderProps {
  open: boolean
  onClose: () => void
  onUploadComplete: () => void
  athletes: Array<{ id: string; name: string }>
  exercises: Array<{ id: string; name: string; nameSv: string | null }>
}

const VIDEO_TYPES = [
  {
    value: 'STRENGTH',
    label: 'Styrkeövning',
    description: 'Analys av teknik för styrkeövningar',
    icon: Dumbbell,
  },
  {
    value: 'RUNNING_GAIT',
    label: 'Löpteknik',
    description: 'Gång- och löpstilsanalys',
    icon: PersonStanding,
  },
  {
    value: 'SPORT_SPECIFIC',
    label: 'Sportspecifik',
    description: 'Annan idrottsspecifik rörelse',
    icon: Activity,
  },
] as const

const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo']
const MAX_SIZE = 100 * 1024 * 1024 // 100MB

export function VideoUploader({
  open,
  onClose,
  onUploadComplete,
  athletes,
  exercises,
}: VideoUploaderProps) {
  const { toast } = useToast()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [videoType, setVideoType] = useState<string>('')
  const [athleteId, setAthleteId] = useState<string>('')
  const [exerciseId, setExerciseId] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: 'Filtyp stöds inte',
        description: 'Ladda upp MP4, MOV, WebM eller AVI-filer.',
        variant: 'destructive',
      })
      return
    }

    if (file.size > MAX_SIZE) {
      toast({
        title: 'Filen är för stor',
        description: 'Maximal filstorlek är 100MB.',
        variant: 'destructive',
      })
      return
    }

    setSelectedFile(file)
    // Create preview URL
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }, [toast])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/mp4': ['.mp4'],
      'video/quicktime': ['.mov'],
      'video/webm': ['.webm'],
      'video/x-msvideo': ['.avi'],
    },
    maxFiles: 1,
    maxSize: MAX_SIZE,
  })

  const handleUpload = async () => {
    if (!selectedFile || !videoType) {
      toast({
        title: 'Fyll i alla fält',
        description: 'Välj en video och videotyp.',
        variant: 'destructive',
      })
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('videoType', videoType)
      if (athleteId) formData.append('athleteId', athleteId)
      if (exerciseId) formData.append('exerciseId', exerciseId)

      const response = await fetch('/api/video-analysis/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Uppladdning misslyckades')
      }

      toast({
        title: 'Video uppladdad',
        description: 'Videon har laddats upp. Klicka på "Analysera" för att starta AI-analysen.',
      })

      onUploadComplete()
      handleClose()
    } catch (error) {
      toast({
        title: 'Uppladdning misslyckades',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setSelectedFile(null)
    setPreviewUrl(null)
    setVideoType('')
    setAthleteId('')
    setExerciseId('')
    onClose()
  }

  const clearFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setSelectedFile(null)
    setPreviewUrl(null)
  }

  const selectedVideoType = VIDEO_TYPES.find(t => t.value === videoType)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Ladda upp video för analys
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Video Type Selection */}
          <div className="space-y-2">
            <Label>Typ av analys *</Label>
            <div className="grid grid-cols-3 gap-2">
              {VIDEO_TYPES.map((type) => {
                const Icon = type.icon
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setVideoType(type.value)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      videoType === type.value
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-muted hover:border-muted-foreground/50'
                    }`}
                  >
                    <Icon className={`h-5 w-5 mb-1 ${videoType === type.value ? 'text-blue-600' : 'text-muted-foreground'}`} />
                    <div className="font-medium text-sm">{type.label}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">{type.description}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Dropzone */}
          {!selectedFile ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              {isDragActive ? (
                <p className="text-blue-600 font-medium">Släpp videon här...</p>
              ) : (
                <>
                  <p className="font-medium mb-1">
                    Dra och släpp en video här, eller klicka för att välja
                  </p>
                  <p className="text-sm text-muted-foreground">
                    MP4, MOV, WebM, AVI (max 100MB)
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              {/* Video preview */}
              {previewUrl && (
                <div className="bg-black aspect-video relative">
                  <video
                    src={previewUrl}
                    controls
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <div className="p-3 flex items-center justify-between bg-muted/50">
                <div className="flex items-center gap-2 min-w-0">
                  <Video className="h-5 w-5 text-purple-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={clearFile}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Optional fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="athlete">Atlet (valfritt)</Label>
              <Select value={athleteId} onValueChange={setAthleteId}>
                <SelectTrigger id="athlete">
                  <SelectValue placeholder="Välj atlet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Ingen vald</SelectItem>
                  {athletes.map((athlete) => (
                    <SelectItem key={athlete.id} value={athlete.id}>
                      {athlete.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {videoType === 'STRENGTH' && (
              <div className="space-y-2">
                <Label htmlFor="exercise">Övning (valfritt)</Label>
                <Select value={exerciseId} onValueChange={setExerciseId}>
                  <SelectTrigger id="exercise">
                    <SelectValue placeholder="Välj övning" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Ingen vald</SelectItem>
                    {exercises.map((exercise) => (
                      <SelectItem key={exercise.id} value={exercise.id}>
                        {exercise.nameSv || exercise.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Info about selected type */}
          {selectedVideoType && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <div className="font-medium flex items-center gap-2">
                <selectedVideoType.icon className="h-4 w-4" />
                {selectedVideoType.label}
              </div>
              <p className="text-muted-foreground mt-1">
                {selectedVideoType.description}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Avbryt
          </Button>
          <Button onClick={handleUpload} disabled={!selectedFile || !videoType || isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Laddar upp...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Ladda upp
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
