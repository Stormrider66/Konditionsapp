'use client'

/**
 * AthleteStrengthClient
 *
 * Client component for the athlete strength training page.
 * Shows upcoming sessions and template selector for PRO+ athletes.
 */


import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle
} from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StrengthTemplateSelector } from '@/components/athlete/strength/StrengthTemplateSelector'
import {
  Dumbbell,
  Calendar,
  Clock,
  Lock,
  Crown,
  ChevronRight,
  Library,
  CalendarDays,
} from 'lucide-react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'

const PHASE_LABELS: Record<string, { label: string; color: string }> = {
  ANATOMICAL_ADAPTATION: { label: 'Anatom. Anpassning', color: 'bg-blue-500' },
  MAXIMUM_STRENGTH: { label: 'Maxstyrka', color: 'bg-red-500' },
  POWER: { label: 'Power', color: 'bg-orange-500' },
  MAINTENANCE: { label: 'Underhåll', color: 'bg-emerald-500' },
  TAPER: { label: 'Taper', color: 'bg-purple-500' },
}

interface Assignment {
  id: string
  sessionId: string
  sessionName: string
  phase: string
  estimatedDuration: number | null
  assignedDate: string
  status: string
}

interface AthleteStrengthClientProps {
  selfServiceEnabled: boolean
  subscriptionTier: string
  upcomingAssignments: Assignment[]
  basePath?: string
}

export function AthleteStrengthClient({
  selfServiceEnabled,
  subscriptionTier,
  upcomingAssignments,
  basePath = '',
}: AthleteStrengthClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<string>(
    upcomingAssignments.length > 0 ? 'upcoming' : 'browse'
  )

  const handleAssigned = () => {
    // Refresh the page to show updated assignments
    router.refresh()
  }

  return (
    <div className="space-y-8">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
          <TabsTrigger
            value="upcoming"
            className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-blue-600 dark:data-[state=active]:text-white transition-all font-bold"
          >
            <CalendarDays className="h-4 w-4" />
            Kommande ({upcomingAssignments.length})
          </TabsTrigger>
          <TabsTrigger
            value="browse"
            className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-blue-600 dark:data-[state=active]:text-white transition-all font-bold"
          >
            <Library className="h-4 w-4" />
            Bläddra mallar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-8">
          {upcomingAssignments.length === 0 ? (
            <GlassCard className="text-center py-20 border-slate-200 dark:border-white/5 border-dashed bg-slate-50 dark:bg-white/[0.02] shadow-none">
              <GlassCardContent>
                <div className="w-16 h-16 bg-slate-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-8 w-8 text-slate-300 dark:text-slate-500" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Inga kommande pass</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium mb-6">
                  Du har inga schemalagda styrkepass just nu.
                </p>
                {selfServiceEnabled ? (
                  <Button onClick={() => setActiveTab('browse')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                    <Library className="h-4 w-4 mr-2" />
                    Bläddra mallar
                  </Button>
                ) : (
                  <p className="text-sm text-slate-400 font-medium">
                    Kontakta din coach för att få styrkepass tilldelade.
                  </p>
                )}
              </GlassCardContent>
            </GlassCard>
          ) : (
            <div className="space-y-4">
              {upcomingAssignments.map((assignment) => {
                const phaseInfo = PHASE_LABELS[assignment.phase] || {
                  label: assignment.phase,
                  color: 'bg-slate-500',
                }
                const assignedDate = new Date(assignment.assignedDate)
                const isToday =
                  assignedDate.toDateString() === new Date().toDateString()

                return (
                  <GlassCard
                    key={assignment.id}
                    className="cursor-pointer hover:border-blue-300 dark:hover:border-blue-500/50 transition-all duration-300 group hover:shadow-lg dark:border-white/5 border-slate-200"
                    onClick={() =>
                      router.push(`${basePath}/athlete/workout/${assignment.sessionId}`)
                    }
                  >
                    <GlassCardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-5">
                          <div
                            className={`p-4 rounded-2xl transition-colors ${isToday
                                ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30'
                                : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400 border border-slate-200 dark:border-white/5'
                              }`}
                          >
                            <Dumbbell
                              className="h-6 w-6"
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-black text-lg text-slate-900 dark:text-white tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {assignment.sessionName}
                              </h3>
                              {isToday && (
                                <Badge variant="default" className="text-[10px] font-black uppercase tracking-wider bg-blue-600 hover:bg-blue-700">
                                  Idag
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              <span className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                {format(assignedDate, 'EEEE d MMMM', {
                                  locale: sv,
                                })}
                              </span>
                              {assignment.estimatedDuration && (
                                <span className="flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5" />
                                  {assignment.estimatedDuration} min
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge className={`${phaseInfo.color} text-white border-0 font-bold uppercase tracking-wider shadow-sm`}>
                            {phaseInfo.label}
                          </Badge>
                          <div className="h-8 w-8 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 transition-colors">
                            <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                          </div>
                        </div>
                      </div>
                    </GlassCardContent>
                  </GlassCard>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="browse" className="mt-8">
          {selfServiceEnabled ? (
            <StrengthTemplateSelector onAssigned={handleAssigned} />
          ) : (
            <GlassCard className="text-center py-20 border-slate-200 dark:border-white/5 border-dashed bg-slate-50 dark:bg-white/[0.02] shadow-none">
              <GlassCardContent>
                <div className="inline-flex items-center justify-center p-4 rounded-full bg-yellow-100 dark:bg-yellow-500/10 mb-6 border border-yellow-200 dark:border-yellow-500/20">
                  <Lock className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">
                  PRO-funktion
                </h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium mb-8 max-w-md mx-auto">
                  Uppgradera till PRO för att bläddra och schemalägga
                  styrkepass på egen hand.
                </p>
                <div className="flex items-center justify-center gap-3 mb-8">
                  <Badge variant="outline" className="text-xs font-bold uppercase tracking-wider py-1 px-3 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300">
                    Din plan: {subscriptionTier}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                  <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold uppercase tracking-wider py-1 px-3 border-0">
                    <Crown className="h-3 w-3 mr-1" />
                    PRO
                  </Badge>
                </div>
                <Button variant="outline" asChild className="font-bold border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5">
                  <Link href={`${basePath}/athlete/subscription`}>
                    Uppgradera nu
                  </Link>
                </Button>
              </GlassCardContent>
            </GlassCard>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
