'use client'

/**
 * AthleteStrengthClient
 *
 * Client component for the athlete strength training page.
 * Shows upcoming sessions and template selector for PRO+ athletes.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  MAINTENANCE: { label: 'Underhåll', color: 'bg-green-500' },
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
}

export function AthleteStrengthClient({
  selfServiceEnabled,
  subscriptionTier,
  upcomingAssignments,
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
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="upcoming" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Kommande ({upcomingAssignments.length})
          </TabsTrigger>
          <TabsTrigger value="browse" className="flex items-center gap-2">
            <Library className="h-4 w-4" />
            Bläddra mallar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          {upcomingAssignments.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Inga kommande pass</h3>
                <p className="text-muted-foreground mb-4">
                  Du har inga schemalagda styrkepass just nu.
                </p>
                {selfServiceEnabled ? (
                  <Button onClick={() => setActiveTab('browse')}>
                    <Library className="h-4 w-4 mr-2" />
                    Bläddra mallar
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Kontakta din coach för att få styrkepass tilldelade.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {upcomingAssignments.map((assignment) => {
                const phaseInfo = PHASE_LABELS[assignment.phase] || {
                  label: assignment.phase,
                  color: 'bg-gray-500',
                }
                const assignedDate = new Date(assignment.assignedDate)
                const isToday =
                  assignedDate.toDateString() === new Date().toDateString()

                return (
                  <Card
                    key={assignment.id}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() =>
                      router.push(`/athlete/workout/${assignment.sessionId}`)
                    }
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className={`p-3 rounded-lg ${
                              isToday ? 'bg-primary/10' : 'bg-muted'
                            }`}
                          >
                            <Dumbbell
                              className={`h-6 w-6 ${
                                isToday ? 'text-primary' : 'text-muted-foreground'
                              }`}
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium">
                                {assignment.sessionName}
                              </h3>
                              {isToday && (
                                <Badge variant="default" className="text-xs">
                                  Idag
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {format(assignedDate, 'EEEE d MMMM', {
                                  locale: sv,
                                })}
                              </span>
                              {assignment.estimatedDuration && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  {assignment.estimatedDuration} min
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={`${phaseInfo.color} text-white`}>
                            {phaseInfo.label}
                          </Badge>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="browse" className="mt-6">
          {selfServiceEnabled ? (
            <StrengthTemplateSelector onAssigned={handleAssigned} />
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <div className="inline-flex items-center justify-center p-4 rounded-full bg-yellow-100 mb-4">
                  <Lock className="h-8 w-8 text-yellow-600" />
                </div>
                <h3 className="text-lg font-medium mb-2">
                  PRO-funktion
                </h3>
                <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                  Uppgradera till PRO för att bläddra och schemalägga
                  styrkepass på egen hand.
                </p>
                <div className="flex items-center justify-center gap-2 mb-6">
                  <Badge variant="outline" className="text-sm">
                    Din plan: {subscriptionTier}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm">
                    <Crown className="h-3 w-3 mr-1" />
                    PRO
                  </Badge>
                </div>
                <Button variant="outline" asChild>
                  <a href="/athlete/subscription">
                    Uppgradera nu
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
