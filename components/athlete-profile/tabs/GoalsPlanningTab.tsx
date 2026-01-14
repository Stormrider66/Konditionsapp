'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, differenceInDays } from 'date-fns'
import { sv } from 'date-fns/locale'
import Link from 'next/link'
import { Target, Calendar, Flag, Clock, Star, Award, TrendingUp, Plus, Edit2, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import type { AthleteProfileData } from '@/lib/athlete-profile/data-fetcher'

interface GoalsPlanningTabProps {
  data: AthleteProfileData
  viewMode: 'coach' | 'athlete'
  variant?: 'default' | 'glass'
}

export function GoalsPlanningTab({ data, viewMode, variant = 'default' }: GoalsPlanningTabProps) {
  const router = useRouter()
  const sportProfile = data.identity.sportProfile
  const { programs } = data.training
  const { raceResults } = data.performance
  const clientId = data.identity.client?.id

  // Goal editing state
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [currentGoal, setCurrentGoal] = useState(sportProfile?.currentGoal || '')
  const [targetDate, setTargetDate] = useState(
    sportProfile?.targetDate ? format(new Date(sportProfile.targetDate), 'yyyy-MM-dd') : ''
  )
  const [metricType, setMetricType] = useState<'TIME' | 'DISTANCE' | 'WEIGHT' | 'NONE'>(
    sportProfile?.targetMetric?.type || 'NONE'
  )
  const [metricValue, setMetricValue] = useState(sportProfile?.targetMetric?.value?.toString() || '')
  const [metricUnit, setMetricUnit] = useState(sportProfile?.targetMetric?.unit || '')

  // Get active program
  const activeProgram = programs.find((p) => p.isActive)

  // Calculate days to goal
  const goalDate = sportProfile?.targetDate
  const daysToGoal = goalDate ? differenceInDays(new Date(goalDate), new Date()) : null

  const hasGoals = sportProfile?.currentGoal || sportProfile?.targetDate || activeProgram

  // Handle goal form submission
  const handleSaveGoal = async () => {
    if (!clientId) return

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/sport-profile/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentGoal: currentGoal || null,
          targetDate: targetDate || null,
          targetMetric: metricType !== 'NONE' && metricValue ? {
            type: metricType,
            value: parseFloat(metricValue),
            unit: metricUnit,
          } : null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Kunde inte spara mål')
      }

      setIsGoalDialogOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Open dialog with current values
  const handleOpenGoalDialog = () => {
    setCurrentGoal(sportProfile?.currentGoal || '')
    setTargetDate(
      sportProfile?.targetDate ? format(new Date(sportProfile.targetDate), 'yyyy-MM-dd') : ''
    )
    setMetricType(sportProfile?.targetMetric?.type || 'NONE')
    setMetricValue(sportProfile?.targetMetric?.value?.toString() || '')
    setMetricUnit(sportProfile?.targetMetric?.unit || '')
    setError(null)
    setIsGoalDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Current Goal */}
      {hasGoals ? (
        <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                Aktuellt mål
              </CardTitle>
              {clientId && (
                <Button size="sm" variant="ghost" onClick={handleOpenGoalDialog}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Redigera
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Goal Description */}
              <div className="md:col-span-2">
                <p className="text-2xl font-bold text-gray-900">
                  {sportProfile?.currentGoal || activeProgram?.goalRace || 'Inget specifikt mål angivet'}
                </p>
                {sportProfile?.targetMetric && (
                  <p className="text-lg text-gray-600 mt-1">
                    Mål: {sportProfile.targetMetric.value} {sportProfile.targetMetric.unit}
                  </p>
                )}
                {activeProgram?.name && (
                  <Badge className="mt-3">{activeProgram.name}</Badge>
                )}
              </div>

              {/* Countdown */}
              {daysToGoal !== null && daysToGoal > 0 && (
                <div className="text-center md:text-right">
                  <p className="text-4xl font-bold text-blue-600">{daysToGoal}</p>
                  <p className="text-gray-500">dagar kvar</p>
                  {goalDate && (
                    <p className="text-sm text-gray-400 mt-1">
                      {format(new Date(goalDate), 'd MMMM yyyy', { locale: sv })}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Progress Bar (if active program) */}
            {activeProgram && (
              <div className="mt-6 pt-4 border-t border-blue-200">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">Programframsteg</span>
                  <span className="font-medium">
                    {calculateProgramProgress(activeProgram.startDate, activeProgram.endDate).toFixed(0)}%
                  </span>
                </div>
                <Progress
                  value={calculateProgramProgress(activeProgram.startDate, activeProgram.endDate)}
                  className="h-2"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{format(new Date(activeProgram.startDate), 'd MMM', { locale: sv })}</span>
                  <span>{format(new Date(activeProgram.endDate), 'd MMM', { locale: sv })}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Inga mål satta</h3>
            <p className="text-gray-500 mb-4">
              Sätt upp träningsmål för att spåra framsteg.
            </p>
            {clientId && (
              <Button onClick={handleOpenGoalDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Lägg till mål
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upcoming Races from Results (targets) */}
      {raceResults.some((r) => r.raceType === 'A_RACE' || r.raceType === 'B_RACE') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Planerade tävlingar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {raceResults
                .filter((r) => new Date(r.raceDate) > new Date())
                .slice(0, 5)
                .map((race) => (
                  <RaceCard key={race.id} race={race} />
                ))}

              {raceResults.filter((r) => new Date(r.raceDate) > new Date()).length === 0 && (
                <p className="text-center text-gray-500 py-4">
                  Inga planerade tävlingar registrerade
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Achievements */}
      {raceResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              Senaste prestationer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {raceResults.slice(0, 5).map((race) => (
                <div
                  key={race.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {race.goalAchieved ? (
                      <TrendingUp className="h-5 w-5 text-green-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-gray-400" />
                    )}

                    <div>
                      <p className="font-medium">
                        {race.raceName || getDistanceLabel(race.distance)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(race.raceDate), 'd MMMM yyyy', { locale: sv })}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-mono font-medium">{race.timeFormatted}</p>
                    {race.vdot && (
                      <p className="text-sm text-gray-500">VDOT {race.vdot.toFixed(1)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Training Programs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Träningsprogram
              </CardTitle>
              <CardDescription>{programs.length} program</CardDescription>
            </div>
            {viewMode === 'coach' && (
              <Link href="/programs/new">
                <Button size="sm">+ Nytt program</Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {programs.length === 0 ? (
            <p className="text-center text-gray-500 py-6">
              Inga träningsprogram skapade
            </p>
          ) : (
            <div className="space-y-3">
              {programs.map((program) => (
                <Link key={program.id} href={`/coach/programs/${program.id}`}>
                  <div className="p-4 border rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{program.name}</p>
                          {program.isActive && <Badge>Aktiv</Badge>}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {format(new Date(program.startDate), 'd MMM', { locale: sv })} -{' '}
                          {format(new Date(program.endDate), 'd MMM yyyy', { locale: sv })}
                        </p>
                      </div>
                      <div className="text-right">
                        {program.goalType && (
                          <Badge variant="outline">{getGoalTypeLabel(program.goalType)}</Badge>
                        )}
                        {program._count?.weeks && (
                          <p className="text-sm text-gray-400 mt-1">
                            {program._count.weeks} veckor
                          </p>
                        )}
                      </div>
                    </div>

                    {program.isActive && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>Framsteg</span>
                          <span>
                            {calculateProgramProgress(program.startDate, program.endDate).toFixed(0)}%
                          </span>
                        </div>
                        <Progress
                          value={calculateProgramProgress(program.startDate, program.endDate)}
                          className="h-1"
                        />
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coach Notes (if coach view) */}
      {viewMode === 'coach' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5" />
              Tränarens anteckningar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.identity.client?.notes ? (
              <p className="text-gray-700 whitespace-pre-wrap">{data.identity.client.notes}</p>
            ) : (
              <p className="text-gray-500 text-center py-4">
                Inga anteckningar tillagda ännu
              </p>
            )}
            <div className="mt-4 pt-4 border-t">
              <Link href={`/clients/${data.identity.client?.id}/edit`}>
                <Button variant="outline" size="sm">
                  Redigera anteckningar
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goal Editing Dialog */}
      <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Redigera träningsmål</DialogTitle>
            <DialogDescription>
              Sätt upp ditt huvudmål och måldatum för att spåra framsteg.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Goal Description */}
            <div className="space-y-2">
              <Label htmlFor="currentGoal">Mål</Label>
              <Input
                id="currentGoal"
                placeholder="t.ex. Spring Stockholm Marathon under 3:30"
                value={currentGoal}
                onChange={(e) => setCurrentGoal(e.target.value)}
              />
            </div>

            {/* Target Date */}
            <div className="space-y-2">
              <Label htmlFor="targetDate">Måldatum</Label>
              <Input
                id="targetDate"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>

            {/* Target Metric Type */}
            <div className="space-y-2">
              <Label htmlFor="metricType">Mätbart mål (valfritt)</Label>
              <Select value={metricType} onValueChange={(v: 'TIME' | 'DISTANCE' | 'WEIGHT' | 'NONE') => setMetricType(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Välj typ..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Inget mätbart mål</SelectItem>
                  <SelectItem value="TIME">Tid</SelectItem>
                  <SelectItem value="DISTANCE">Distans</SelectItem>
                  <SelectItem value="WEIGHT">Vikt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Metric Value and Unit */}
            {metricType !== 'NONE' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="metricValue">Värde</Label>
                  <Input
                    id="metricValue"
                    type="text"
                    placeholder={metricType === 'TIME' ? '3:30:00' : '42.2'}
                    value={metricValue}
                    onChange={(e) => setMetricValue(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="metricUnit">Enhet</Label>
                  <Select value={metricUnit} onValueChange={setMetricUnit}>
                    <SelectTrigger>
                      <SelectValue placeholder="Enhet..." />
                    </SelectTrigger>
                    <SelectContent>
                      {metricType === 'TIME' && (
                        <>
                          <SelectItem value="HH:MM:SS">HH:MM:SS</SelectItem>
                          <SelectItem value="minuter">Minuter</SelectItem>
                        </>
                      )}
                      {metricType === 'DISTANCE' && (
                        <>
                          <SelectItem value="km">Kilometer</SelectItem>
                          <SelectItem value="mil">Mil</SelectItem>
                          <SelectItem value="m">Meter</SelectItem>
                        </>
                      )}
                      {metricType === 'WEIGHT' && (
                        <>
                          <SelectItem value="kg">Kilogram</SelectItem>
                          <SelectItem value="lb">Pounds</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsGoalDialogOpen(false)}
              disabled={isSubmitting}
            >
              Avbryt
            </Button>
            <Button onClick={handleSaveGoal} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sparar...
                </>
              ) : (
                'Spara mål'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Helper components
function RaceCard({ race }: { race: AthleteProfileData['performance']['raceResults'][0] }) {
  const daysUntil = differenceInDays(new Date(race.raceDate), new Date())

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-white">
      <div className="flex items-center gap-4">
        <div
          className={`p-2 rounded-lg ${
            race.raceType === 'A_RACE'
              ? 'bg-yellow-100'
              : race.raceType === 'B_RACE'
              ? 'bg-blue-100'
              : 'bg-gray-100'
          }`}
        >
          {race.raceType === 'A_RACE' ? (
            <Star className="h-5 w-5 text-yellow-600" />
          ) : (
            <Flag className="h-5 w-5 text-blue-600" />
          )}
        </div>
        <div>
          <p className="font-medium">{race.raceName || getDistanceLabel(race.distance)}</p>
          <p className="text-sm text-gray-500">
            {format(new Date(race.raceDate), 'd MMMM yyyy', { locale: sv })}
          </p>
          {race.goalTime && (
            <p className="text-sm text-blue-600">Mål: {race.goalTime}</p>
          )}
        </div>
      </div>

      <div className="text-right">
        {daysUntil > 0 && (
          <>
            <p className="text-2xl font-bold text-blue-600">{daysUntil}</p>
            <p className="text-xs text-gray-500">dagar</p>
          </>
        )}
        <Badge
          variant="outline"
          className={
            race.raceType === 'A_RACE'
              ? 'border-yellow-300 text-yellow-700'
              : 'border-blue-300 text-blue-700'
          }
        >
          {race.raceType === 'A_RACE' ? 'A-lopp' : 'B-lopp'}
        </Badge>
      </div>
    </div>
  )
}

// Helper functions
function calculateProgramProgress(startDate: Date, endDate: Date): number {
  const now = new Date()
  const start = new Date(startDate)
  const end = new Date(endDate)

  if (now < start) return 0
  if (now > end) return 100

  const total = end.getTime() - start.getTime()
  const elapsed = now.getTime() - start.getTime()

  return (elapsed / total) * 100
}

function getDistanceLabel(distance: string): string {
  const labels: Record<string, string> = {
    '5K': '5 km',
    '10K': '10 km',
    HALF_MARATHON: 'Halvmaraton',
    MARATHON: 'Maraton',
    CUSTOM: 'Annan distans',
  }
  return labels[distance] || distance
}

function getGoalTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    marathon: 'Marathon',
    half_marathon: 'Halvmaraton',
    '10k': '10K',
    '5k': '5K',
    fitness: 'Kondition',
    cycling: 'Cykling',
    triathlon: 'Triathlon',
    skiing: 'Skidåkning',
    custom: 'Anpassad',
  }
  return labels[type] || type
}
