'use client'

/**
 * Athlete Rehab Overview Component
 *
 * Shows all active and completed rehab programs for the athlete.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
  GlassCardDescription,
} from '@/components/ui/GlassCard'
import {
  Stethoscope,
  Dumbbell,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Clock,
  Target,
  Calendar,
  MessageCircle,
  Activity,
} from 'lucide-react'
import { ActiveRestrictionsCard } from '@/components/athlete/ActiveRestrictionsCard'
import { RehabDayView } from '@/components/athlete/RehabDayView'

interface RehabProgram {
  id: string
  name: string
  description?: string
  currentPhase: string
  status: string
  createdAt: string
  estimatedEndDate?: string
  shortTermGoals: string[]
  longTermGoals: string[]
  acceptablePainDuring: number
  acceptablePainAfter: number
  exercises: Array<{
    id: string
    exercise: {
      id: string
      name: string
      nameSv?: string
    }
  }>
  milestones: Array<{
    id: string
    name: string
    achieved: boolean
    achievedAt?: string
  }>
  _count: {
    exercises: number
    milestones: number
    progressLogs: number
  }
}

interface AthleteRehabOverviewProps {
  clientId: string
}

const PHASE_LABELS: Record<string, string> = {
  ACUTE: 'Akut',
  SUBACUTE: 'Subakut',
  REMODELING: 'Remodellering',
  FUNCTIONAL: 'Funktionell',
  RETURN_TO_SPORT: 'Återgång till idrott',
}

const PHASE_COLORS: Record<string, string> = {
  ACUTE: 'bg-red-500/20 text-red-400 border-red-500/30',
  SUBACUTE: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  REMODELING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  FUNCTIONAL: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  RETURN_TO_SPORT: 'bg-green-500/20 text-green-400 border-green-500/30',
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Aktivt',
  PAUSED: 'Pausat',
  COMPLETED: 'Slutfört',
  CANCELLED: 'Avbrutet',
}

export function AthleteRehabOverview({ clientId }: AthleteRehabOverviewProps) {
  const router = useRouter()
  const [programs, setPrograms] = useState<RehabProgram[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active')

  useEffect(() => {
    async function fetchPrograms() {
      setIsLoading(true)

      try {
        const response = await fetch(`/api/physio/rehab-programs?clientId=${clientId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch programs')
        }

        const data = await response.json()
        setPrograms(data.programs || [])
      } catch (err) {
        console.error('Error fetching programs:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPrograms()
  }, [clientId])

  const activePrograms = programs.filter((p) => p.status === 'ACTIVE' || p.status === 'PAUSED')
  const completedPrograms = programs.filter((p) => p.status === 'COMPLETED' || p.status === 'CANCELLED')

  const handleContactPhysio = () => {
    router.push('/athlete/messages')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sv-SE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const calculateMilestoneProgress = (milestones: RehabProgram['milestones']) => {
    if (milestones.length === 0) return 0
    const achieved = milestones.filter((m) => m.achieved).length
    return (achieved / milestones.length) * 100
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Rehabilitering</h1>
          <p className="text-slate-400 mt-1">Dina rehabiliteringsprogram och övningar</p>
        </div>
        <Button
          onClick={handleContactPhysio}
          variant="outline"
          className="border-teal-500/30 text-teal-400 hover:bg-teal-500/10"
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          Kontakta fysio
        </Button>
      </div>

      {/* Active Restrictions */}
      <ActiveRestrictionsCard
        clientId={clientId}
        onContactPhysio={handleContactPhysio}
      />

      {/* Today's Exercises */}
      <RehabDayView
        clientId={clientId}
        onProgramClick={(id) => router.push(`/athlete/rehab/${id}`)}
      />

      {/* Programs Tabs */}
      <div className="flex gap-2">
        <Button
          variant="ghost"
          onClick={() => setActiveTab('active')}
          className={cn(
            'font-bold rounded-xl',
            activeTab === 'active'
              ? 'bg-teal-500/20 text-teal-400'
              : 'text-slate-400 hover:text-white'
          )}
        >
          <Activity className="h-4 w-4 mr-2" />
          Aktiva ({activePrograms.length})
        </Button>
        <Button
          variant="ghost"
          onClick={() => setActiveTab('completed')}
          className={cn(
            'font-bold rounded-xl',
            activeTab === 'completed'
              ? 'bg-teal-500/20 text-teal-400'
              : 'text-slate-400 hover:text-white'
          )}
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Avslutade ({completedPrograms.length})
        </Button>
      </div>

      {/* Programs List */}
      {isLoading ? (
        <GlassCard>
          <GlassCardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
          </GlassCardContent>
        </GlassCard>
      ) : (activeTab === 'active' ? activePrograms : completedPrograms).length === 0 ? (
        <GlassCard>
          <GlassCardContent className="flex flex-col items-center justify-center py-12 text-slate-500">
            <Stethoscope className="h-12 w-12 mb-3 opacity-50" />
            <p className="font-medium">
              {activeTab === 'active' ? 'Inga aktiva program' : 'Inga avslutade program'}
            </p>
          </GlassCardContent>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {(activeTab === 'active' ? activePrograms : completedPrograms).map((program) => (
            <GlassCard
              key={program.id}
              className={cn(
                'cursor-pointer transition-all hover:bg-white/5',
                program.status === 'ACTIVE' && 'border-teal-500/20'
              )}
              onClick={() => router.push(`/athlete/rehab/${program.id}`)}
            >
              <GlassCardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Name and status */}
                    <div className="flex items-center gap-3 mb-2">
                      <Stethoscope className="h-5 w-5 text-teal-500" />
                      <h3 className="text-lg font-black text-white">{program.name}</h3>
                      <Badge
                        variant="outline"
                        className={cn('text-[10px] font-bold', PHASE_COLORS[program.currentPhase])}
                      >
                        {PHASE_LABELS[program.currentPhase]}
                      </Badge>
                    </div>

                    {/* Description */}
                    {program.description && (
                      <p className="text-sm text-slate-400 mb-3">{program.description}</p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Dumbbell className="h-4 w-4" />
                        <span>{program._count.exercises} övningar</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Target className="h-4 w-4" />
                        <span>{program._count.milestones} milstolpar</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        <span>{program._count.progressLogs} loggar</span>
                      </div>
                    </div>

                    {/* Milestone progress */}
                    {program.milestones.length > 0 && (
                      <div className="mt-4">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>Milstolpsprogress</span>
                          <span>
                            {program.milestones.filter((m) => m.achieved).length}/
                            {program.milestones.length}
                          </span>
                        </div>
                        <Progress
                          value={calculateMilestoneProgress(program.milestones)}
                          className="h-2 bg-white/5"
                        />
                      </div>
                    )}

                    {/* Goals preview */}
                    {program.shortTermGoals.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {program.shortTermGoals.slice(0, 3).map((goal, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="text-[10px] border-white/10 text-slate-400"
                          >
                            {goal}
                          </Badge>
                        ))}
                        {program.shortTermGoals.length > 3 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-white/10 text-slate-400"
                          >
                            +{program.shortTermGoals.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  <ChevronRight className="h-5 w-5 text-slate-500 flex-shrink-0 mt-1" />
                </div>

                {/* End date */}
                {program.estimatedEndDate && (
                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2 text-xs text-slate-500">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Beräknat slutdatum: {formatDate(program.estimatedEndDate)}</span>
                  </div>
                )}
              </GlassCardContent>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
