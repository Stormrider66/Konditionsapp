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
import {
  GlassCard,
  GlassCardContent,
} from '@/components/ui/GlassCard'
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <Video className="h-6 w-6 text-blue-500" />
            {copy(locale, 'Video analysis', 'Videoanalys')}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {copy(locale, 'Upload videos for AI-driven technique analysis', 'Ladda upp videos för AI-driven teknikanalys')}
          </p>
        </div>
        <Button onClick={() => setShowUploader(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Upload className="h-4 w-4 mr-2" />
          {copy(locale, 'Upload video', 'Ladda upp video')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-white/5 p-3 rounded-xl backdrop-blur-sm shadow-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <Input
            placeholder={copy(locale, 'Search by athlete or exercise...', 'Sök på atlet eller övning...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
              <Filter className="h-4 w-4 mr-2 text-slate-400" />
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
            <SelectTrigger className="w-[160px] bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
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
            <SelectTrigger className="w-[160px] bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
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
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredAnalyses.length === 0 && (
        <GlassCard glow="blue" className="text-center py-12 border border-slate-200 dark:border-white/5">
          <GlassCardContent>
            <VideoOff className="h-12 w-12 mx-auto text-slate-450 mb-4" />
            <h3 className="font-semibold text-lg mb-2 text-slate-900 dark:text-white">{copy(locale, 'No video analyses', 'Inga videoanalyser')}</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || athleteFilter !== 'all'
                ? copy(locale, 'No analyses match your filters', 'Inga analyser matchar dina filter')
                : copy(locale, 'Upload your first video for AI analysis', 'Ladda upp din första video för AI-analys')}
            </p>
            {!searchQuery && statusFilter === 'all' && typeFilter === 'all' && athleteFilter === 'all' && (
              <Button onClick={() => setShowUploader(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Upload className="h-4 w-4 mr-2" />
                {copy(locale, 'Upload video', 'Ladda upp video')}
              </Button>
            )}
          </GlassCardContent>
        </GlassCard>
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
