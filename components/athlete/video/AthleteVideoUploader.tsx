'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

interface AthleteVideoUploaderProps {
  clientId: string
}

const VIDEO_TYPES = [
  { value: 'RUNNING_GAIT', label: 'Löpteknik' },
  { value: 'STRENGTH', label: 'Styrkelyft' },
  { value: 'SKIING_CLASSIC', label: 'Klassisk skidåkning' },
  { value: 'SKIING_SKATING', label: 'Skate-skidåkning' },
  { value: 'SKIING_DOUBLE_POLE', label: 'Dubbelstakning' },
  { value: 'HYROX_STATION', label: 'HYROX Station' },
  { value: 'SPORT_SPECIFIC', label: 'Sportspecifik teknik' },
]

const HYROX_STATIONS = [
  { value: 'SKIERG', label: 'SkiErg (1000m)' },
  { value: 'SLED_PUSH', label: 'Sled Push (50m)' },
  { value: 'SLED_PULL', label: 'Sled Pull (50m)' },
  { value: 'BURPEE_BROAD_JUMP', label: 'Burpee Broad Jump (80 reps)' },
  { value: 'ROWING', label: 'Rodd (1000m)' },
  { value: 'FARMERS_CARRY', label: 'Farmers Carry (200m)' },
  { value: 'SANDBAG_LUNGE', label: 'Sandbag Lunge (100m)' },
  { value: 'WALL_BALLS', label: 'Wall Balls (75-100 reps)' },
]

export function AthleteVideoUploader({ clientId }: AthleteVideoUploaderProps) {
  const { toast } = useToast()
  const router = useRouter()
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
      // Create form data
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('clientId', clientId)
      formData.append('videoType', videoType)
      if (hyroxStation) {
        formData.append('hyroxStation', hyroxStation)
      }
      if (notes) {
        formData.append('notes', notes)
      }

      // Simulate progress (real implementation would use XMLHttpRequest for progress)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch('/api/video-analysis/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Kunde inte ladda upp video')
      }

      setUploadSuccess(true)
      toast({
        title: 'Video uppladdad!',
        description: 'Din video har laddats upp och vantar pa analys fran din coach.',
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
        title: 'Fel vid uppladdning',
        description: error instanceof Error ? error.message : 'Kunde inte ladda upp video',
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
        <AlertTitle className="text-green-900">Video uppladdad!</AlertTitle>
        <AlertDescription className="text-green-800">
          Din video har laddats upp och vantar pa analys. Du far en notifikation nar
          analysen ar klar.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tips */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">Tips for bra videoanalys</AlertTitle>
        <AlertDescription className="text-blue-800 text-sm">
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Filma fran sidan for lopteknik (90 graders vinkel)</li>
            <li>God belysning och stabil kamera</li>
            <li>Inkludera hela kroppen i bilden</li>
            <li>5-30 sekunder video ar optimalt</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Video Type Selection */}
      <div className="space-y-2">
        <Label>Typ av video</Label>
        <Select value={videoType} onValueChange={(value) => {
          setVideoType(value)
          if (value !== 'HYROX_STATION') {
            setHyroxStation('')
          }
        }}>
          <SelectTrigger>
            <SelectValue placeholder="Valj typ" />
          </SelectTrigger>
          <SelectContent>
            {VIDEO_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* HYROX Station Selection - Only for HYROX_STATION */}
      {videoType === 'HYROX_STATION' && (
        <div className="space-y-2">
          <Label>Välj HYROX-station</Label>
          <Select value={hyroxStation} onValueChange={setHyroxStation}>
            <SelectTrigger>
              <SelectValue placeholder="Välj station" />
            </SelectTrigger>
            <SelectContent>
              {HYROX_STATIONS.map((station) => (
                <SelectItem key={station.value} value={station.value}>
                  {station.label}
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
            <p className="text-xs text-gray-500">Klicka eller dra for att byta video</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="h-12 w-12 mx-auto text-gray-400" />
            <p className="text-gray-600">
              {isDragActive ? 'Slapp videon har...' : 'Dra och slapp en video, eller klicka for att valja'}
            </p>
            <p className="text-sm text-gray-500">MP4, MOV, AVI, WebM - Max 100MB</p>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Laddar upp...</span>
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
        <Label htmlFor="notes">Anteckningar (valfritt)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="T.ex. 'Kanner obehag i vanster kna', 'Fokuserar pa kadensen'"
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
            Laddar upp...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Ladda upp video
          </>
        )}
      </Button>
    </div>
  )
}
