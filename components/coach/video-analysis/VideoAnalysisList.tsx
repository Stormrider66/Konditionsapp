'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLocale } from '@/i18n/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RolePageHeader, RolePanel } from '@/components/layouts/role-shell/RolePage'
import { VideoUploader } from './VideoUploader'
import { VideoAnalysisCard } from './VideoAnalysisCard'
import {
  Video,
  Upload,
  Search,
  Filter,
  Loader2,
  VideoOff,
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'

interface Issue {
  issue: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  timestamp?: string
  description: string
}

interface Recommendation {
  priority: number
  recommendation: string
  explanation: string
}

interface VideoAnalysis {
  id: string
  videoUrl: string
  videoType: string
  status: string
  formScore: number | null
  aiAnalysis: string | null
  issuesDetected: Issue[] | null
  recommendations: Recommendation[] | null
  createdAt: string
  athlete: { id: string; name: string; height?: number | null; weight?: number | null } | null
  exercise: { id: string; name: string; nameSv: string | null; nameEn?: string | null } | null
  poseDataSummary?: {
    hasPoseData: boolean
    frameCount: number | null
    analyzedAt: string | null
    hasAiPoseAnalysis: boolean
  } | null
  cameraAngle?: string | null
  captureGroupId?: string | null
  groupVideos?: Array<{
    id: string
    cameraAngle: string | null
    isPrimaryView: boolean
    videoUrl: string
  }> | null
}

interface Athlete {
  id: string
  name: string
}

interface Exercise {
  id: string
  name: string
  nameSv: string | null
  nameEn?: string | null
}

type AppLocale = 'en' | 'sv'

function copy(locale: AppLocale, en: string, sv: string) {
  return locale === 'sv' ? sv : en
}

export function VideoAnalysisList() {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const searchParams = useSearchParams()
  const initialAnalysisId = searchParams.get('analysisId')
  const [analyses, setAnalyses] = useState<VideoAnalysis[]>([])
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showUploader, setShowUploader] = useState(false)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [athleteFilter, setAthleteFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchAnalyses = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
      if (typeFilter && typeFilter !== 'all') params.set('videoType', typeFilter)
      if (athleteFilter && athleteFilter !== 'all') params.set('athleteId', athleteFilter)

      const response = await fetch(`/api/video-analysis?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || copy(locale, 'Could not fetch analyses', 'Kunde inte hämta analyser'))
      }

      setAnalyses(data.analyses || [])
    } catch (error) {
      // Toast is called outside the dependency array to prevent infinite loops
      const errorMessage = error instanceof Error ? error.message : copy(locale, 'Could not fetch analyses', 'Kunde inte hämta analyser')
      console.error('Failed to fetch analyses:', errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [athleteFilter, locale, statusFilter, typeFilter])

  const fetchAthletes = async () => {
    try {
      const response = await fetch('/api/clients?limit=100')
      const data = await response.json()
      // API returns { success: true, data: clients[] }
      const clients = data.data || data.clients || []
      if (clients.length > 0) {
        setAthletes(clients.map((c: { id: string; name: string }) => ({
          id: c.id,
          name: c.name,
        })))
      }
    } catch (error) {
      console.error('Failed to fetch athletes:', error)
    }
  }

  const fetchExercises = async () => {
    try {
      const response = await fetch('/api/exercises?limit=500')
      const data = await response.json()
      if (data.exercises) {
        setExercises(data.exercises.map((e: { id: string; name: string; nameSv: string | null; nameEn?: string | null }) => ({
          id: e.id,
          name: e.name,
          nameSv: e.nameSv,
          nameEn: e.nameEn,
        })))
      }
    } catch (error) {
      console.error('Failed to fetch exercises:', error)
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => {
      void fetchAnalyses()
      void fetchAthletes()
      void fetchExercises()
    })
  }, [fetchAnalyses])

  // Filter analyses by search query
  const filteredAnalyses = analyses.filter((analysis) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      analysis.athlete?.name.toLowerCase().includes(query) ||
      analysis.exercise?.name.toLowerCase().includes(query) ||
      analysis.exercise?.nameEn?.toLowerCase().includes(query) ||
      analysis.exercise?.nameSv?.toLowerCase().includes(query)
    )
  })

  const handleUploadComplete = () => {
    setShowUploader(false)
    void fetchAnalyses()
  }

  const handleDelete = () => {
    void fetchAnalyses()
  }

  const handleAnalysisComplete = () => {
    void fetchAnalyses()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <RolePageHeader
        eyebrow="Coach"
        title={
          <span className="flex items-center gap-2">
            <Video className="h-6 w-6 text-blue-600 dark:text-blue-300" />
            {copy(locale, 'Video analysis', 'Videoanalys')}
          </span>
        }
        description={copy(locale, 'Upload videos for AI-driven technique analysis', 'Ladda upp videos för AI-driven teknikanalys')}
        actions={
          <Button onClick={() => setShowUploader(true)} className="bg-blue-600 text-white hover:bg-blue-700">
            <Upload className="h-4 w-4" />
            {copy(locale, 'Upload video', 'Ladda upp video')}
          </Button>
        }
      />

      {/* Filters */}
      <RolePanel className="flex flex-col gap-4 p-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder={copy(locale, 'Search by athlete or exercise...', 'Sök på atlet eller övning...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-zinc-200 bg-white pl-10 text-zinc-950 dark:border-white/10 dark:bg-zinc-950/60 dark:text-zinc-50"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] border-zinc-200 bg-white text-zinc-950 dark:border-white/10 dark:bg-zinc-950/60 dark:text-zinc-50">
              <Filter className="h-4 w-4 text-zinc-400" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy(locale, 'All statuses', 'Alla status')}</SelectItem>
              <SelectItem value="PENDING">{copy(locale, 'Pending', 'Väntar')}</SelectItem>
              <SelectItem value="PROCESSING">{copy(locale, 'Processing', 'Bearbetar')}</SelectItem>
              <SelectItem value="COMPLETED">{copy(locale, 'Completed', 'Klara')}</SelectItem>
              <SelectItem value="FAILED">{copy(locale, 'Failed', 'Misslyckade')}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px] border-zinc-200 bg-white text-zinc-950 dark:border-white/10 dark:bg-zinc-950/60 dark:text-zinc-50">
              <SelectValue placeholder={copy(locale, 'Type', 'Typ')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy(locale, 'All types', 'Alla typer')}</SelectItem>
              <SelectItem value="STRENGTH">{copy(locale, 'Strength exercise', 'Styrkeövning')}</SelectItem>
              <SelectItem value="RUNNING_GAIT">{copy(locale, 'Running gait', 'Löpteknik')}</SelectItem>
              <SelectItem value="SKIING_CLASSIC">{copy(locale, 'Skiing - Classic', 'Skidåkning - Klassisk')}</SelectItem>
              <SelectItem value="SKIING_SKATING">{copy(locale, 'Skiing - Skating', 'Skidåkning - Skating')}</SelectItem>
              <SelectItem value="SKIING_DOUBLE_POLE">{copy(locale, 'Skiing - Double poling', 'Skidåkning - Dubbelstakning')}</SelectItem>
              <SelectItem value="HYROX_STATION">HYROX Station</SelectItem>
              <SelectItem value="SPORT_SPECIFIC">{copy(locale, 'Sport specific', 'Sportspecifik')}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={athleteFilter} onValueChange={setAthleteFilter}>
            <SelectTrigger className="w-[160px] border-zinc-200 bg-white text-zinc-950 dark:border-white/10 dark:bg-zinc-950/60 dark:text-zinc-50">
              <SelectValue placeholder={copy(locale, 'Athlete', 'Atlet')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy(locale, 'All athletes', 'Alla atleter')}</SelectItem>
              {athletes.map((athlete) => (
                <SelectItem key={athlete.id} value={athlete.id}>
                  {athlete.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </RolePanel>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredAnalyses.length === 0 && (
        <RolePanel className="p-8 text-center sm:p-12">
          <VideoOff className="mx-auto mb-4 h-12 w-12 text-zinc-300 dark:text-zinc-700" />
          <h3 className="mb-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">{copy(locale, 'No video analyses', 'Inga videoanalyser')}</h3>
          <p className="mb-4 text-zinc-600 dark:text-zinc-400">
            {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || athleteFilter !== 'all'
              ? copy(locale, 'No analyses match your filters', 'Inga analyser matchar dina filter')
              : copy(locale, 'Upload your first video for AI analysis', 'Ladda upp din första video för AI-analys')}
          </p>
          {!searchQuery && statusFilter === 'all' && typeFilter === 'all' && athleteFilter === 'all' && (
            <Button onClick={() => setShowUploader(true)} className="bg-blue-600 text-white hover:bg-blue-700">
              <Upload className="h-4 w-4" />
              {copy(locale, 'Upload video', 'Ladda upp video')}
            </Button>
          )}
        </RolePanel>
      )}

      {/* Analysis grid */}
      {!isLoading && filteredAnalyses.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAnalyses.map((analysis) => (
            <VideoAnalysisCard
              key={analysis.id}
              analysis={analysis}
              onDelete={handleDelete}
              onAnalysisComplete={handleAnalysisComplete}
              initiallyOpen={analysis.id === initialAnalysisId}
            />
          ))}
        </div>
      )}

      {/* Upload dialog */}
      <VideoUploader
        open={showUploader}
        onClose={() => setShowUploader(false)}
        onUploadComplete={handleUploadComplete}
        athletes={athletes}
        exercises={exercises}
      />
    </div>
  )
}
