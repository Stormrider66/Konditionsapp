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
import { useLocale } from '@/i18n/client'

type AppLocale = 'en' | 'sv'

function text(locale: AppLocale, sv: string, en: string): string {
  return locale === 'sv' ? sv : en
}

interface VideoUploaderProps {
  open: boolean
  onClose: () => void
  onUploadComplete: () => void
  athletes: Array<{ id: string; name: string }>
  exercises: Array<{ id: string; name: string; nameSv: string | null; nameEn?: string | null }>
}

const VIDEO_TYPES = [
  {
    value: 'STRENGTH',
    label: 'Styrkeövning',
    labelEn: 'Strength exercise',
    description: 'Analys av teknik för styrkeövningar',
    descriptionEn: 'Technique analysis for strength exercises',
    icon: Dumbbell,
  },
  {
    value: 'RUNNING_GAIT',
    label: 'Löpteknik',
    labelEn: 'Running gait',
    description: 'Gång- och löpstilsanalys',
    descriptionEn: 'Gait and running-form analysis',
    icon: PersonStanding,
  },
  {
    value: 'SKIING_CLASSIC',
    label: 'Klassisk skidåkning',
    labelEn: 'Classic skiing',
    description: 'Diagonalgång, teknik och timing',
    descriptionEn: 'Diagonal stride, technique, and timing',
    icon: Snowflake,
  },
  {
    value: 'SKIING_SKATING',
    label: 'Skate-skidåkning',
    labelEn: 'Skate skiing',
    description: 'V1, V2 eller V2-alternativ teknik',
    descriptionEn: 'V1, V2, or V2 alternate technique',
    icon: Snowflake,
  },
  {
    value: 'SKIING_DOUBLE_POLE',
    label: 'Dubbelstakning',
    labelEn: 'Double poling',
    description: 'Stakningsteknik och rytm',
    descriptionEn: 'Poling technique and rhythm',
    icon: Snowflake,
  },
  {
    value: 'HYROX_STATION',
    label: 'HYROX Station',
    labelEn: 'HYROX Station',
    description: 'Analys av HYROX-stationer',
    descriptionEn: 'Analysis of HYROX stations',
    icon: Zap,
  },
  {
    value: 'SPORT_SPECIFIC',
    label: 'Sportspecifik',
    labelEn: 'Sport-specific',
    description: 'Annan idrottsspecifik rörelse',
    descriptionEn: 'Other sport-specific movement',
    icon: Activity,
  },
] as const

const HYROX_STATIONS = [
  { value: 'SKIERG', label: 'SkiErg', description: '1000m' },
  { value: 'SLED_PUSH', label: 'Sled Push', description: '50m' },
  { value: 'SLED_PULL', label: 'Sled Pull', description: '50m' },
  { value: 'BURPEE_BROAD_JUMP', label: 'Burpee Broad Jump', description: '80 reps' },
  { value: 'ROWING', label: 'Rodd', labelEn: 'Rowing', description: '1000m' },
  { value: 'FARMERS_CARRY', label: 'Farmers Carry', description: '200m' },
  { value: 'SANDBAG_LUNGE', label: 'Sandbag Lunge', description: '100m' },
  { value: 'WALL_BALLS', label: 'Wall Balls', description: '75-100 reps' },
] as const

const CAMERA_ANGLES = [
  {
    value: 'FRONT',
    label: 'Framifrån',
    labelEn: 'Front',
    description: 'Armsving, symmetri, knäspårning',
    descriptionEn: 'Arm swing, symmetry, knee tracking',
    icon: User,
  },
  {
    value: 'SIDE',
    label: 'Från sidan',
    labelEn: 'Side',
    description: 'Fotisättning, lutning, oscillation',
    descriptionEn: 'Foot strike, lean, oscillation',
    icon: ArrowRight,
  },
  {
    value: 'BACK',
    label: 'Bakifrån',
    labelEn: 'Back',
    description: 'Höftfall, hälpiska, gluteal',
    descriptionEn: 'Hip drop, heel whip, gluteal mechanics',
    icon: UserRound,
  },
] as const

const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo']
const MAX_SIZE = 100 * 1024 * 1024 // 100MB
const MAX_GROUP_VIDEOS = 3

// Types whose analyzers support multi-view capture groups.
const MULTI_ANGLE_TYPES = [
  'RUNNING_GAIT',
  'SKIING_CLASSIC',
  'SKIING_SKATING',
  'SKIING_DOUBLE_POLE',
  'HYROX_STATION',
]

interface StagedVideo {
  file: File
  angle: string
  previewUrl: string
}

export function VideoUploader({
  open,
  onClose,
  onUploadComplete,
  athletes,
  exercises,
}: VideoUploaderProps) {
  const { toast } = useToast()
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const [stagedVideos, setStagedVideos] = useState<StagedVideo[]>([])
  const [videoType, setVideoType] = useState<string>('')
  const [athleteId, setAthleteId] = useState<string>('')
  const [exerciseId, setExerciseId] = useState<string>('')
  const [hyroxStation, setHyroxStation] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)

  const allowMultiple = MULTI_ANGLE_TYPES.includes(videoType)
  const maxFiles = allowMultiple ? MAX_GROUP_VIDEOS : 1

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles: File[] = []
    for (const file of acceptedFiles) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast({
          title: text(locale, 'Filtyp stöds inte', 'File type is not supported'),
          description: text(locale, 'Ladda upp MP4, MOV, WebM eller AVI-filer.', 'Upload MP4, MOV, WebM, or AVI files.'),
          variant: 'destructive',
        })
        continue
      }
      if (file.size > MAX_SIZE) {
        toast({
          title: text(locale, 'Filen är för stor', 'File is too large'),
          description: text(locale, 'Maximal filstorlek är 100MB.', 'Maximum file size is 100 MB.'),
          variant: 'destructive',
        })
        continue
      }
      validFiles.push(file)
    }
    if (validFiles.length === 0) return

    setStagedVideos((prev) => {
      const next = allowMultiple ? [...prev] : []
      if (!allowMultiple && prev.length > 0) {
        prev.forEach((v) => URL.revokeObjectURL(v.previewUrl))
      }
      for (const file of validFiles) {
        if (next.length >= maxFiles) break
        next.push({ file, angle: '', previewUrl: URL.createObjectURL(file) })
      }
      return next
    })
  }, [allowMultiple, maxFiles, locale, toast])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/mp4': ['.mp4'],
      'video/quicktime': ['.mov'],
      'video/webm': ['.webm'],
      'video/x-msvideo': ['.avi'],
    },
    maxFiles,
    multiple: allowMultiple,
    maxSize: MAX_SIZE,
  })

  const handleSelectVideoType = (value: string) => {
    setVideoType(value)
    // Trim extras when switching to a type without multi-angle support.
    if (!MULTI_ANGLE_TYPES.includes(value)) {
      setStagedVideos((prev) => {
        prev.slice(1).forEach((v) => URL.revokeObjectURL(v.previewUrl))
        return prev.slice(0, 1)
      })
    }
  }

  const setStagedAngle = (index: number, angle: string) => {
    setStagedVideos((prev) => prev.map((v, i) => (i === index ? { ...v, angle } : v)))
  }

  const removeStagedVideo = (index: number) => {
    setStagedVideos((prev) => {
      const target = prev[index]
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  // Upload one file to Supabase Storage via presigned URL; returns the storage path.
  const uploadToStorage = async (video: StagedVideo): Promise<string> => {
    const urlRes = await fetch('/api/video-analysis/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'get-upload-url',
        fileName: video.file.name,
        fileType: video.file.type,
        fileSize: video.file.size,
        videoType,
        cameraAngle: video.angle || undefined,
        athleteId: athleteId || undefined,
      }),
    })

    const urlData = await urlRes.json()
    if (!urlRes.ok) {
      throw new Error(urlData.error || text(locale, 'Kunde inte skapa uppladdnings-URL', 'Could not create upload URL'))
    }

    const uploadRes = await fetch(urlData.signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': urlData.contentType },
      body: video.file,
    })

    if (!uploadRes.ok) {
      throw new Error(text(locale, 'Uppladdning till lagring misslyckades', 'Upload to storage failed'))
    }

    return urlData.path as string
  }

  const handleUpload = async () => {
    if (stagedVideos.length === 0 || !videoType) {
      toast({
        title: text(locale, 'Fyll i alla fält', 'Complete all fields'),
        description: text(locale, 'Välj en video och videotyp.', 'Select a video and analysis type.'),
        variant: 'destructive',
      })
      return
    }

    setIsUploading(true)

    try {
      if (allowMultiple && stagedVideos.length > 1) {
        // Multi-angle capture group: upload all videos, then confirm as one group.
        const uploaded: Array<{ uploadPath: string; cameraAngle: string }> = []
        for (const video of stagedVideos) {
          uploaded.push({ uploadPath: await uploadToStorage(video), cameraAngle: video.angle })
        }

        const confirmRes = await fetch('/api/video-analysis/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'confirm-upload-group',
            videoType,
            athleteId: athleteId || undefined,
            exerciseId: exerciseId || undefined,
            hyroxStation: hyroxStation || undefined,
            videos: uploaded,
          }),
        })

        const confirmData = await confirmRes.json()
        if (!confirmRes.ok) {
          throw new Error(confirmData.error || text(locale, 'Kunde inte bekräfta uppladdningen', 'Could not confirm the upload'))
        }

        toast({
          title: text(locale, `${stagedVideos.length} videor uppladdade`, `${stagedVideos.length} videos uploaded`),
          description: text(
            locale,
            'Flervinkelgruppen har laddats upp. Klicka på "Analysera" så analyseras alla vinklar tillsammans.',
            'The multi-angle group has been uploaded. Click "Analyze" and all angles are analyzed together.'
          ),
        })
      } else {
        const video = stagedVideos[0]
        const uploadPath = await uploadToStorage(video)

        const confirmRes = await fetch('/api/video-analysis/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'confirm-upload',
            uploadPath,
            videoType,
            cameraAngle: video.angle || undefined,
            athleteId: athleteId || undefined,
            exerciseId: exerciseId || undefined,
            hyroxStation: hyroxStation || undefined,
          }),
        })

        const confirmData = await confirmRes.json()
        if (!confirmRes.ok) {
          throw new Error(confirmData.error || text(locale, 'Kunde inte bekräfta uppladdningen', 'Could not confirm the upload'))
        }

        toast({
          title: text(locale, 'Video uppladdad', 'Video uploaded'),
          description: text(locale, 'Videon har laddats upp. Klicka på "Analysera" för att starta AI-analysen.', 'The video has been uploaded. Click "Analyze" to start the AI analysis.'),
        })
      }

      onUploadComplete()
      handleClose()
    } catch (error) {
      toast({
        title: text(locale, 'Uppladdning misslyckades', 'Upload failed'),
        description: error instanceof Error ? error.message : text(locale, 'Okänt fel', 'Unknown error'),
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    stagedVideos.forEach((v) => URL.revokeObjectURL(v.previewUrl))
    setStagedVideos([])
    setVideoType('')
    setAthleteId('')
    setExerciseId('')
    setHyroxStation('')
    onClose()
  }

  const selectedVideoType = VIDEO_TYPES.find(t => t.value === videoType)

  // Angle is always required for running gait (view-specific analysis), and
  // for every file in a multi-angle group regardless of type.
  const missingAngle =
    (videoType === 'RUNNING_GAIT' || (allowMultiple && stagedVideos.length > 1)) &&
    stagedVideos.some((v) => !v.angle)
  const filledAngles = stagedVideos.map((v) => v.angle).filter(Boolean)
  const duplicateAngles =
    allowMultiple &&
    stagedVideos.length > 1 &&
    new Set(filledAngles).size !== filledAngles.length

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            {text(locale, 'Ladda upp video för analys', 'Upload video for analysis')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pr-2">
          {/* Video Type Selection */}
          <div className="space-y-2">
            <Label>{text(locale, 'Typ av analys *', 'Analysis type *')}</Label>
            <div className="grid grid-cols-3 gap-2">
              {VIDEO_TYPES.map((type) => {
                const Icon = type.icon
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleSelectVideoType(type.value)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      videoType === type.value
                        ? 'border-blue-550 bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 font-medium'
                        : 'border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    <Icon className={`h-5 w-5 mb-1 ${videoType === type.value ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`} />
                    <div className="font-medium text-sm">{text(locale, type.label, type.labelEn)}</div>
                    <div className="text-xs text-slate-550 dark:text-slate-400 line-clamp-2">{text(locale, type.description, type.descriptionEn)}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Multi-angle hint */}
          {allowMultiple && (
            <div className="p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/40 rounded-lg text-xs text-orange-900 dark:text-orange-100">
              {text(
                locale,
                'Tips: filma samtidigt från flera vinklar (framifrån, från sidan, bakifrån) och ladda upp 2–3 videor. AI:n analyserar alla vinklar tillsammans för en säkrare bedömning. Ange vinkel för varje video nedan.',
                'Tip: film simultaneously from multiple angles (front, side, back) and upload 2–3 videos. The AI analyzes all angles together for a more reliable assessment. Set the angle for each video below.'
              )}
            </div>
          )}

          {/* HYROX Station Selection - Only for HYROX_STATION */}
          {videoType === 'HYROX_STATION' && (
            <div className="space-y-2">
              <Label>{text(locale, 'Välj station *', 'Select station *')}</Label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                {text(locale, 'Vilken HYROX-station vill du analysera?', 'Which HYROX station do you want to analyze?')}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {HYROX_STATIONS.map((station) => (
                  <button
                    key={station.value}
                    type="button"
                    onClick={() => setHyroxStation(station.value)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      hyroxStation === station.value
                        ? 'border-yellow-555 bg-yellow-50 dark:bg-yellow-950/30 text-yellow-900 dark:text-yellow-100 font-medium'
                        : 'border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    <div className="font-medium text-sm">{text(locale, station.label, 'labelEn' in station ? station.labelEn : station.label)}</div>
                    <div className="text-xs text-slate-555 dark:text-slate-400">{station.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Athlete & Exercise selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="athlete">{text(locale, 'Atlet (valfritt)', 'Athlete (optional)')}</Label>
              <Select
                value={athleteId || "none"}
                onValueChange={(val) => setAthleteId(val === "none" ? "" : val)}
              >
                <SelectTrigger id="athlete" className="bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-white/10">
                  <SelectValue placeholder={text(locale, 'Välj atlet', 'Select athlete')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{text(locale, 'Ingen vald', 'None selected')}</SelectItem>
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
                <Label htmlFor="exercise">{text(locale, 'Övning (valfritt)', 'Exercise (optional)')}</Label>
                <Select
                  value={exerciseId || "none"}
                  onValueChange={(val) => setExerciseId(val === "none" ? "" : val)}
                >
                  <SelectTrigger id="exercise" className="bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-white/10">
                    <SelectValue placeholder={text(locale, 'Välj övning', 'Select exercise')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{text(locale, 'Ingen vald', 'None selected')}</SelectItem>
                    {exercises.map((exercise) => (
                      <SelectItem key={exercise.id} value={exercise.id}>
                        {locale === 'sv' ? exercise.nameSv || exercise.name : exercise.nameEn || exercise.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Staged videos */}
          {stagedVideos.length > 0 && (
            <div className="space-y-2">
              {stagedVideos.map((video, index) => (
                <div
                  key={`${video.file.name}-${index}`}
                  className="border border-slate-200 dark:border-white/10 rounded-lg p-3 flex items-center gap-3 bg-slate-100/50 dark:bg-slate-900/30"
                >
                  <video
                    src={video.previewUrl}
                    muted
                    playsInline
                    className="h-16 w-28 rounded bg-black object-cover flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate text-sm text-slate-800 dark:text-slate-200">{video.file.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {(video.file.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                    {allowMultiple && (
                      <div className="flex gap-1 mt-1.5">
                        {CAMERA_ANGLES.map((angle) => (
                          <button
                            key={angle.value}
                            type="button"
                            onClick={() => setStagedAngle(index, angle.value)}
                            className={`px-2 py-0.5 rounded-md border text-xs transition-colors ${
                              video.angle === angle.value
                                ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30 text-orange-900 dark:text-orange-100 font-medium'
                                : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20'
                            }`}
                          >
                            {text(locale, angle.label, angle.labelEn)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeStagedVideo(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {duplicateAngles && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {text(locale, 'Varje video måste ha en egen kameravinkel.', 'Each video needs its own camera angle.')}
                </p>
              )}
            </div>
          )}

          {/* Dropzone */}
          {stagedVideos.length < maxFiles && (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
                stagedVideos.length > 0 ? 'p-4' : 'p-8'
              } ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                  : 'border-slate-300 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/20'
              }`}
            >
              <input {...getInputProps()} />
              {stagedVideos.length > 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {text(
                    locale,
                    `Lägg till fler vinklar (${stagedVideos.length}/${maxFiles})`,
                    `Add more angles (${stagedVideos.length}/${maxFiles})`
                  )}
                </p>
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto text-slate-500 dark:text-slate-400 mb-4" />
                  {isDragActive ? (
                    <p className="text-blue-600 dark:text-blue-400 font-medium">{text(locale, 'Släpp videon här...', 'Drop the video here...')}</p>
                  ) : (
                    <>
                      <p className="font-medium mb-1 text-slate-800 dark:text-slate-200">
                        {allowMultiple
                          ? text(locale, 'Dra och släpp 1–3 videor här, eller klicka för att välja', 'Drag and drop 1–3 videos here, or click to choose')
                          : text(locale, 'Dra och släpp en video här, eller klicka för att välja', 'Drag and drop a video here, or click to choose')}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        MP4, MOV, WebM, AVI (max 100MB)
                      </p>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Info about selected type */}
          {selectedVideoType && (
            <div className="p-3 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-lg text-sm">
              <div className="font-medium flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <selectedVideoType.icon className="h-4 w-4" />
                {text(locale, selectedVideoType.label, selectedVideoType.labelEn)}
              </div>
              <p className="text-slate-550 dark:text-slate-400 mt-1">
                {text(locale, selectedVideoType.description, selectedVideoType.descriptionEn)}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            {text(locale, 'Avbryt', 'Cancel')}
          </Button>
          <Button
            onClick={handleUpload}
            disabled={
              stagedVideos.length === 0 ||
              !videoType ||
              missingAngle ||
              duplicateAngles ||
              (videoType === 'HYROX_STATION' && !hyroxStation) ||
              isUploading
            }
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {text(locale, 'Laddar upp...', 'Uploading...')}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {stagedVideos.length > 1
                  ? text(locale, `Ladda upp ${stagedVideos.length} videor`, `Upload ${stagedVideos.length} videos`)
                  : text(locale, 'Ladda upp', 'Upload')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
