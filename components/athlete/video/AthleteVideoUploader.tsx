'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { Upload, Video, Loader2, CheckCircle2, Info } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useLocale } from '@/i18n/client'

interface AthleteVideoUploaderProps {
  clientId: string
}

type AppLocale = 'en' | 'sv'

const VIDEO_TYPES = [
  { value: 'RUNNING_GAIT', label: { en: 'Running gait', sv: 'Löpteknik' } },
  { value: 'STRENGTH', label: { en: 'Strength lift', sv: 'Styrkelyft' } },
  { value: 'SKIING_CLASSIC', label: { en: 'Classic skiing', sv: 'Klassisk skidåkning' } },
  { value: 'SKIING_SKATING', label: { en: 'Skate skiing', sv: 'Skate-skidåkning' } },
  { value: 'SKIING_DOUBLE_POLE', label: { en: 'Double poling', sv: 'Dubbelstakning' } },
  { value: 'HYROX_STATION', label: { en: 'HYROX station', sv: 'HYROX Station' } },
  { value: 'SPORT_SPECIFIC', label: { en: 'Sport-specific technique', sv: 'Sportspecifik teknik' } },
]

const HYROX_STATIONS = [
  { value: 'SKIERG', label: { en: 'SkiErg (1000m)', sv: 'SkiErg (1000m)' } },
  { value: 'SLED_PUSH', label: { en: 'Sled Push (50m)', sv: 'Sled Push (50m)' } },
  { value: 'SLED_PULL', label: { en: 'Sled Pull (50m)', sv: 'Sled Pull (50m)' } },
  { value: 'BURPEE_BROAD_JUMP', label: { en: 'Burpee Broad Jump (80 reps)', sv: 'Burpee Broad Jump (80 reps)' } },
  { value: 'ROWING', label: { en: 'Rowing (1000m)', sv: 'Rodd (1000m)' } },
  { value: 'FARMERS_CARRY', label: { en: 'Farmers Carry (200m)', sv: 'Farmers Carry (200m)' } },
  { value: 'SANDBAG_LUNGE', label: { en: 'Sandbag Lunge (100m)', sv: 'Sandbag Lunge (100m)' } },
  { value: 'WALL_BALLS', label: { en: 'Wall Balls (75-100 reps)', sv: 'Wall Balls (75-100 reps)' } },
]

const COPY: Record<AppLocale, {
  errors: {
    uploadUrl: string
    storageUpload: string
    confirmUpload: string
    uploadTitle: string
    uploadFallback: string
  }
  success: {
    title: string
    toastDescription: string
    alertDescription: string
  }
  tips: {
    title: string
    sideView: string
    lighting: string
    fullBody: string
    length: string
  }
  fields: {
    videoType: string
    selectType: string
    hyroxStation: string
    selectStation: string
    notes: string
  }
  dropzone: {
    replace: string
    active: string
    idle: string
    formats: string
  }
  upload: {
    progress: string
    button: string
    notesPlaceholder: string
  }
}> = {
  en: {
    errors: {
      uploadUrl: 'Could not create upload URL',
      storageUpload: 'Upload to storage failed',
      confirmUpload: 'Could not confirm the upload',
      uploadTitle: 'Upload error',
      uploadFallback: 'Could not upload video',
    },
    success: {
      title: 'Video uploaded!',
      toastDescription: 'Your video has been uploaded and is waiting for analysis from your coach.',
      alertDescription: 'Your video has been uploaded and is waiting for analysis. You will get a notification when the analysis is ready.',
    },
    tips: {
      title: 'Tips for good video analysis',
      sideView: 'Film from the side for running technique (90-degree angle)',
      lighting: 'Use good lighting and a stable camera',
      fullBody: 'Include the whole body in the frame',
      length: '5-30 seconds of video is optimal',
    },
    fields: {
      videoType: 'Video type',
      selectType: 'Select type',
      hyroxStation: 'Select HYROX station',
      selectStation: 'Select station',
      notes: 'Notes (optional)',
    },
    dropzone: {
      replace: 'Click or drag to replace video',
      active: 'Drop the video here...',
      idle: 'Drag and drop a video, or click to choose',
      formats: 'MP4, MOV, AVI, WebM - Max 100MB',
    },
    upload: {
      progress: 'Uploading...',
      button: 'Upload video',
      notesPlaceholder: "e.g. 'Discomfort in left knee', 'Focusing on cadence'",
    },
  },
  sv: {
    errors: {
      uploadUrl: 'Kunde inte skapa uppladdnings-URL',
      storageUpload: 'Uppladdning till lagring misslyckades',
      confirmUpload: 'Kunde inte bekräfta uppladdningen',
      uploadTitle: 'Fel vid uppladdning',
      uploadFallback: 'Kunde inte ladda upp video',
    },
    success: {
      title: 'Video uppladdad!',
      toastDescription: 'Din video har laddats upp och väntar på analys från din coach.',
      alertDescription: 'Din video har laddats upp och väntar på analys. Du får en notifikation när analysen är klar.',
    },
    tips: {
      title: 'Tips för bra videoanalys',
      sideView: 'Filma från sidan för löpteknik (90 graders vinkel)',
      lighting: 'God belysning och stabil kamera',
      fullBody: 'Inkludera hela kroppen i bilden',
      length: '5-30 sekunder video är optimalt',
    },
    fields: {
      videoType: 'Typ av video',
      selectType: 'Välj typ',
      hyroxStation: 'Välj HYROX-station',
      selectStation: 'Välj station',
      notes: 'Anteckningar (valfritt)',
    },
    dropzone: {
      replace: 'Klicka eller dra för att byta video',
      active: 'Släpp videon här...',
      idle: 'Dra och släpp en video, eller klicka för att välja',
      formats: 'MP4, MOV, AVI, WebM - Max 100MB',
    },
    upload: {
      progress: 'Laddar upp...',
      button: 'Ladda upp video',
      notesPlaceholder: "T.ex. 'Känner obehag i vänster knä', 'Fokuserar på kadensen'",
    },
  },
}

export function AthleteVideoUploader({ clientId }: AthleteVideoUploaderProps) {
  const { toast } = useToast()
  const router = useRouter()
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = COPY[locale]
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [videoType, setVideoType] = useState<string>('RUNNING_GAIT')
  const [hyroxStation, setHyroxStation] = useState<string>('')
  const [notes, setNotes] = useState('')

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0])
      setUploadSuccess(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.webm'],
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    multiple: false,
  })

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Step 1: Get presigned upload URL
      setUploadProgress(10)
      const urlRes = await fetch('/api/video-analysis/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-upload-url',
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileSize: selectedFile.size,
          videoType,
        }),
      })

      const urlData = await urlRes.json()
      if (!urlRes.ok) {
        throw new Error(urlData.error || copy.errors.uploadUrl)
      }

      // Step 2: Upload directly to Supabase Storage
      setUploadProgress(30)
      const uploadRes = await fetch(urlData.signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': urlData.contentType },
        body: selectedFile,
      })

      if (!uploadRes.ok) {
        throw new Error(copy.errors.storageUpload)
      }

      setUploadProgress(80)

      // Step 3: Confirm upload and create DB record
      const confirmRes = await fetch('/api/video-analysis/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm-upload',
          uploadPath: urlData.path,
          videoType,
          athleteId: clientId,
          hyroxStation: hyroxStation || undefined,
        }),
      })

      const confirmData = await confirmRes.json()
      setUploadProgress(100)

      if (!confirmRes.ok) {
        throw new Error(confirmData.error || copy.errors.confirmUpload)
      }

      setUploadSuccess(true)
      toast({
        title: copy.success.title,
        description: copy.success.toastDescription,
      })

      // Reset form after a delay
      setTimeout(() => {
        setSelectedFile(null)
        setNotes('')
        setUploadProgress(0)
        router.refresh()
      }, 2000)
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: copy.errors.uploadTitle,
        description: error instanceof Error ? error.message : copy.errors.uploadFallback,
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
    }
  }

  if (uploadSuccess) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle2 className="h-5 w-5 text-green-600" />
        <AlertTitle className="text-green-900">{copy.success.title}</AlertTitle>
        <AlertDescription className="text-green-800">
          {copy.success.alertDescription}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tips */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">{copy.tips.title}</AlertTitle>
        <AlertDescription className="text-blue-800 text-sm">
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>{copy.tips.sideView}</li>
            <li>{copy.tips.lighting}</li>
            <li>{copy.tips.fullBody}</li>
            <li>{copy.tips.length}</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Video Type Selection */}
      <div className="space-y-2">
        <Label>{copy.fields.videoType}</Label>
        <Select value={videoType} onValueChange={(value) => {
          setVideoType(value)
          if (value !== 'HYROX_STATION') {
            setHyroxStation('')
          }
        }}>
          <SelectTrigger>
            <SelectValue placeholder={copy.fields.selectType} />
          </SelectTrigger>
          <SelectContent>
            {VIDEO_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label[locale]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* HYROX Station Selection - Only for HYROX_STATION */}
      {videoType === 'HYROX_STATION' && (
        <div className="space-y-2">
          <Label>{copy.fields.hyroxStation}</Label>
          <Select value={hyroxStation} onValueChange={setHyroxStation}>
            <SelectTrigger>
              <SelectValue placeholder={copy.fields.selectStation} />
            </SelectTrigger>
            <SelectContent>
              {HYROX_STATIONS.map((station) => (
                <SelectItem key={station.value} value={station.value}>
                  {station.label[locale]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${selectedFile ? 'border-green-500 bg-green-50' : ''}
        `}
      >
        <input {...getInputProps()} />

        {selectedFile ? (
          <div className="space-y-2">
            <Video className="h-12 w-12 mx-auto text-green-600" />
            <p className="font-medium text-green-900">{selectedFile.name}</p>
            <p className="text-sm text-green-700">
              {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
            </p>
            <p className="text-xs text-gray-500">{copy.dropzone.replace}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="h-12 w-12 mx-auto text-gray-400" />
            <p className="text-gray-600">
              {isDragActive ? copy.dropzone.active : copy.dropzone.idle}
            </p>
            <p className="text-sm text-gray-500">{copy.dropzone.formats}</p>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>{copy.upload.progress}</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">{copy.fields.notes}</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={copy.upload.notesPlaceholder}
          rows={3}
        />
      </div>

      {/* Upload Button */}
      <Button
        onClick={handleUpload}
        disabled={!selectedFile || isUploading || (videoType === 'HYROX_STATION' && !hyroxStation)}
        className="w-full"
        size="lg"
      >
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {copy.upload.progress}
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            {copy.upload.button}
          </>
        )}
      </Button>
    </div>
  )
}
