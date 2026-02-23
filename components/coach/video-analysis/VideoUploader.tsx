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
  User,
  ArrowRight,
  UserRound,
  Snowflake,
  Zap,
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
    value: 'SKIING_CLASSIC',
    label: 'Klassisk skidåkning',
    description: 'Diagonalgång, teknik och timing',
    icon: Snowflake,
  },
  {
    value: 'SKIING_SKATING',
    label: 'Skate-skidåkning',
    description: 'V1, V2 eller V2-alternativ teknik',
    icon: Snowflake,
  },
  {
    value: 'SKIING_DOUBLE_POLE',
    label: 'Dubbelstakning',
    description: 'Stakningsteknik och rytm',
    icon: Snowflake,
  },
  {
    value: 'HYROX_STATION',
    label: 'HYROX Station',
    description: 'Analys av HYROX-stationer',
    icon: Zap,
  },
  {
    value: 'SPORT_SPECIFIC',
    label: 'Sportspecifik',
    description: 'Annan idrottsspecifik rörelse',
    icon: Activity,
  },
] as const

const HYROX_STATIONS = [
  { value: 'SKIERG', label: 'SkiErg', description: '1000m' },
  { value: 'SLED_PUSH', label: 'Sled Push', description: '50m' },
  { value: 'SLED_PULL', label: 'Sled Pull', description: '50m' },
  { value: 'BURPEE_BROAD_JUMP', label: 'Burpee Broad Jump', description: '80 reps' },
  { value: 'ROWING', label: 'Rodd', description: '1000m' },
  { value: 'FARMERS_CARRY', label: 'Farmers Carry', description: '200m' },
  { value: 'SANDBAG_LUNGE', label: 'Sandbag Lunge', description: '100m' },
  { value: 'WALL_BALLS', label: 'Wall Balls', description: '75-100 reps' },
] as const

const CAMERA_ANGLES = [
  {
    value: 'FRONT',
    label: 'Framifrån',
    description: 'Armsving, symmetri, knäspårning',
    icon: User,
  },
  {
    value: 'SIDE',
    label: 'Från sidan',
    description: 'Fotisättning, lutning, oscillation',
    icon: ArrowRight,
  },
  {
    value: 'BACK',
    label: 'Bakifrån',
    description: 'Höftfall, hälpiska, gluteal',
    icon: UserRound,
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
  const [cameraAngle, setCameraAngle] = useState<string>('')
  const [athleteId, setAthleteId] = useState<string>('')
  const [exerciseId, setExerciseId] = useState<string>('')
  const [hyroxStation, setHyroxStation] = useState<string>('')
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
      // Step 1: Get presigned upload URL
      const urlRes = await fetch('/api/video-analysis/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-upload-url',
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileSize: selectedFile.size,
          videoType,
          cameraAngle: cameraAngle || undefined,
          athleteId: athleteId || undefined,
        }),
      })

      const urlData = await urlRes.json()
      if (!urlRes.ok) {
        throw new Error(urlData.error || 'Kunde inte skapa uppladdnings-URL')
      }

      // Step 2: Upload directly to Supabase Storage via presigned URL
      const uploadRes = await fetch(urlData.signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': urlData.contentType },
        body: selectedFile,
      })

      if (!uploadRes.ok) {
        throw new Error('Uppladdning till lagring misslyckades')
      }

      // Step 3: Confirm upload and create DB record
      const confirmRes = await fetch('/api/video-analysis/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm-upload',
          uploadPath: urlData.path,
          videoType,
          cameraAngle: cameraAngle || undefined,
          athleteId: athleteId || undefined,
          exerciseId: exerciseId || undefined,
          hyroxStation: hyroxStation || undefined,
        }),
      })

      const confirmData = await confirmRes.json()
      if (!confirmRes.ok) {
        throw new Error(confirmData.error || 'Kunde inte bekräfta uppladdningen')
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
    setCameraAngle('')
    setAthleteId('')
    setExerciseId('')
    setHyroxStation('')
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
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Ladda upp video för analys
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pr-2">
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

          {/* Camera Angle Selection - Only for RUNNING_GAIT */}
          {videoType === 'RUNNING_GAIT' && (
            <div className="space-y-2">
              <Label>Kameravinkel *</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Välj vilken vinkel videon är filmad från för mer precis analys
              </p>
              <div className="grid grid-cols-3 gap-2">
                {CAMERA_ANGLES.map((angle) => {
                  const Icon = angle.icon
                  return (
                    <button
                      key={angle.value}
                      type="button"
                      onClick={() => setCameraAngle(angle.value)}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        cameraAngle === angle.value
                          ? 'border-orange-500 bg-orange-50 text-orange-900'
                          : 'border-muted hover:border-muted-foreground/50'
                      }`}
                    >
                      <Icon className={`h-5 w-5 mb-1 ${cameraAngle === angle.value ? 'text-orange-600' : 'text-muted-foreground'}`} />
                      <div className="font-medium text-sm">{angle.label}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{angle.description}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* HYROX Station Selection - Only for HYROX_STATION */}
          {videoType === 'HYROX_STATION' && (
            <div className="space-y-2">
              <Label>Välj station *</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Vilken HYROX-station vill du analysera?
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {HYROX_STATIONS.map((station) => (
                  <button
                    key={station.value}
                    type="button"
                    onClick={() => setHyroxStation(station.value)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      hyroxStation === station.value
                        ? 'border-yellow-500 bg-yellow-50 text-yellow-900'
                        : 'border-muted hover:border-muted-foreground/50'
                    }`}
                  >
                    <div className="font-medium text-sm">{station.label}</div>
                    <div className="text-xs text-muted-foreground">{station.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Athlete & Exercise selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="athlete">Atlet (valfritt)</Label>
              <Select
                value={athleteId || "none"}
                onValueChange={(val) => setAthleteId(val === "none" ? "" : val)}
              >
                <SelectTrigger id="athlete">
                  <SelectValue placeholder="Välj atlet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ingen vald</SelectItem>
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
                <Select
                  value={exerciseId || "none"}
                  onValueChange={(val) => setExerciseId(val === "none" ? "" : val)}
                >
                  <SelectTrigger id="exercise">
                    <SelectValue placeholder="Välj övning" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ingen vald</SelectItem>
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

        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Avbryt
          </Button>
          <Button onClick={handleUpload} disabled={!selectedFile || !videoType || (videoType === 'RUNNING_GAIT' && !cameraAngle) || (videoType === 'HYROX_STATION' && !hyroxStation) || isUploading}>
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
