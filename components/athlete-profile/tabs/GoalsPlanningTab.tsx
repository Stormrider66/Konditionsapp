'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, differenceInDays } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
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
import { useLocale } from '@/i18n/client'

interface GoalsPlanningTabProps {
  data: AthleteProfileData
  viewMode: 'coach' | 'athlete'
  variant?: 'default' | 'glass'
  basePath?: string
}

export function GoalsPlanningTab({ data, viewMode, basePath = '' }: GoalsPlanningTabProps) {
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const dateLocale = locale === 'sv' ? sv : enUS
  const t = (svText: string, enText: string) => locale === 'sv' ? svText : enText
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
    (sportProfile?.targetMetric?.type as 'TIME' | 'DISTANCE' | 'WEIGHT' | 'NONE') || 'NONE'
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
        throw new Error(errorData.error || t('Kunde inte spara mål', 'Could not save goal'))
      }

      setIsGoalDialogOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Ett fel uppstod', 'An error occurred'))
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
    setMetricType((sportProfile?.targetMetric?.type as 'TIME' | 'DISTANCE' | 'WEIGHT' | 'NONE') || 'NONE')
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
                {t('Aktuellt mål', 'Current goal')}
              </CardTitle>
              {clientId && (
                <Button size="sm" variant="ghost" onClick={handleOpenGoalDialog}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  {t('Redigera', 'Edit')}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Goal Description */}
              <div className="md:col-span-2">
                <p className="text-2xl font-bold text-gray-900">
                  {sportProfile?.currentGoal || activeProgram?.goalRace || t('Inget specifikt mål angivet', 'No specific goal set')}
                </p>
                {sportProfile?.targetMetric && (
                  <p className="text-lg text-gray-600 mt-1">
                    {t('Mål', 'Goal')}: {sportProfile.targetMetric.value} {sportProfile.targetMetric.unit}
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
                  <p className="text-gray-500">{t('dagar kvar', 'days left')}</p>
                  {goalDate && (
                    <p className="text-sm text-gray-400 mt-1">
                      {format(new Date(goalDate), 'd MMMM yyyy', { locale: dateLocale })}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Progress Bar (if active program) */}
            {activeProgram && (
              <div className="mt-6 pt-4 border-t border-blue-200">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">{t('Programframsteg', 'Program progress')}</span>
                  <span className="font-medium">
                    {calculateProgramProgress(activeProgram.startDate, activeProgram.endDate).toFixed(0)}%
                  </span>
                </div>
                <Progress
                  value={calculateProgramProgress(activeProgram.startDate, activeProgram.endDate)}
                  className="h-2"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{format(new Date(activeProgram.startDate), 'd MMM', { locale: dateLocale })}</span>
                  <span>{format(new Date(activeProgram.endDate), 'd MMM', { locale: dateLocale })}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('Inga mål satta', 'No goals set')}</h3>
            <p className="text-gray-500 mb-4">
              {t('Sätt upp träningsmål för att spåra framsteg.', 'Set training goals to track progress.')}
            </p>
            {clientId && (
              <Button onClick={handleOpenGoalDialog}>
                <Plus className="h-4 w-4 mr-2" />
                {t('Lägg till mål', 'Add goal')}
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
              {t('Planerade tävlingar', 'Planned races')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {raceResults
                .filter((r) => new Date(r.raceDate) > new Date())
                .slice(0, 5)
                .map((race) => (
                  <RaceCard key={race.id} race={race} locale={locale} />
                ))}

              {raceResults.filter((r) => new Date(r.raceDate) > new Date()).length === 0 && (
                <p className="text-center text-gray-500 py-4">
                  {t('Inga planerade tävlingar registrerade', 'No planned races registered')}
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
              {t('Senaste prestationer', 'Latest performances')}
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
                        {race.raceName || getDistanceLabel(race.distance, locale)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(race.raceDate), 'd MMMM yyyy', { locale: dateLocale })}
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
                {t('Träningsprogram', 'Training programs')}
              </CardTitle>
              <CardDescription>{programs.length} program</CardDescription>
            </div>
            {viewMode === 'coach' && (
              <Link href={`${basePath}/coach/programs/new`}>
                <Button size="sm">+ {t('Nytt program', 'New program')}</Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {programs.length === 0 ? (
            <p className="text-center text-gray-500 py-6">
              {t('Inga träningsprogram skapade', 'No training programs created')}
            </p>
          ) : (
            <div className="space-y-3">
              {programs.map((program) => (
                <Link key={program.id} href={`${basePath}/coach/programs/${program.id}`}>
                  <div className="p-4 border rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{program.name}</p>
                          {program.isActive && <Badge>{t('Aktiv', 'Active')}</Badge>}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {format(new Date(program.startDate), 'd MMM', { locale: dateLocale })} -{' '}
                          {format(new Date(program.endDate), 'd MMM yyyy', { locale: dateLocale })}
                        </p>
                      </div>
                      <div className="text-right">
                        {program.goalType && (
                          <Badge variant="outline">{getGoalTypeLabel(program.goalType, locale)}</Badge>
                        )}
                        {program._count?.weeks && (
                          <p className="text-sm text-gray-400 mt-1">
                            {program._count.weeks} {program._count.weeks === 1 ? t('vecka', 'week') : t('veckor', 'weeks')}
                          </p>
                        )}
                      </div>
                    </div>

                    {program.isActive && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>{t('Framsteg', 'Progress')}</span>
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
              {t('Tränarens anteckningar', "Coach's notes")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.identity.client?.notes ? (
              <p className="text-gray-700 whitespace-pre-wrap">{data.identity.client.notes}</p>
            ) : (
              <p className="text-gray-500 text-center py-4">
                {t('Inga anteckningar tillagda ännu', 'No notes added yet')}
              </p>
            )}
            <div className="mt-4 pt-4 border-t">
              <Link href={`${basePath}/coach/clients/${data.identity.client?.id}/edit`}>
                <Button variant="outline" size="sm">
                  {t('Redigera anteckningar', 'Edit notes')}
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
            <DialogTitle>{t('Redigera träningsmål', 'Edit training goal')}</DialogTitle>
            <DialogDescription>
              {t('Sätt upp ditt huvudmål och måldatum för att spåra framsteg.', 'Set your main goal and target date to track progress.')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Goal Description */}
            <div className="space-y-2">
              <Label htmlFor="currentGoal">{t('Mål', 'Goal')}</Label>
              <Input
                id="currentGoal"
                placeholder={t('t.ex. Spring Stockholm Marathon under 3:30', 'e.g. Run Stockholm Marathon under 3:30')}
                value={currentGoal}
                onChange={(e) => setCurrentGoal(e.target.value)}
              />
            </div>

            {/* Target Date */}
            <div className="space-y-2">
              <Label htmlFor="targetDate">{t('Måldatum', 'Target date')}</Label>
              <Input
                id="targetDate"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>

            {/* Target Metric Type */}
            <div className="space-y-2">
              <Label htmlFor="metricType">{t('Mätbart mål (valfritt)', 'Measurable goal (optional)')}</Label>
              <Select value={metricType} onValueChange={(v: 'TIME' | 'DISTANCE' | 'WEIGHT' | 'NONE') => setMetricType(v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('Välj typ...', 'Select type...')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">{t('Inget mätbart mål', 'No measurable goal')}</SelectItem>
                  <SelectItem value="TIME">{t('Tid', 'Time')}</SelectItem>
                  <SelectItem value="DISTANCE">{t('Distans', 'Distance')}</SelectItem>
                  <SelectItem value="WEIGHT">{t('Vikt', 'Weight')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Metric Value and Unit */}
            {metricType !== 'NONE' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="metricValue">{t('Värde', 'Value')}</Label>
                  <Input
                    id="metricValue"
                    type="text"
                    placeholder={metricType === 'TIME' ? '3:30:00' : '42.2'}
                    value={metricValue}
                    onChange={(e) => setMetricValue(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="metricUnit">{t('Enhet', 'Unit')}</Label>
                  <Select value={metricUnit} onValueChange={setMetricUnit}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('Enhet...', 'Unit...')} />
                    </SelectTrigger>
                    <SelectContent>
                      {metricType === 'TIME' && (
                        <>
                          <SelectItem value="HH:MM:SS">HH:MM:SS</SelectItem>
                          <SelectItem value="minuter">{t('Minuter', 'Minutes')}</SelectItem>
                        </>
                      )}
                      {metricType === 'DISTANCE' && (
                        <>
                          <SelectItem value="km">{t('Kilometer', 'Kilometers')}</SelectItem>
                          <SelectItem value="mil">{t('Mil', 'Swedish miles')}</SelectItem>
                          <SelectItem value="m">{t('Meter', 'Meters')}</SelectItem>
                        </>
                      )}
                      {metricType === 'WEIGHT' && (
                        <>
                          <SelectItem value="kg">{t('Kilogram', 'Kilograms')}</SelectItem>
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
              {t('Avbryt', 'Cancel')}
            </Button>
            <Button onClick={handleSaveGoal} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('Sparar...', 'Saving...')}
                </>
              ) : (
                t('Spara mål', 'Save goal')
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Helper components
function RaceCard({ race, locale }: { race: AthleteProfileData['performance']['raceResults'][0]; locale: 'en' | 'sv' }) {
  const dateLocale = locale === 'sv' ? sv : enUS
  const t = (svText: string, enText: string) => locale === 'sv' ? svText : enText
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
          <p className="font-medium">{race.raceName || getDistanceLabel(race.distance, locale)}</p>
          <p className="text-sm text-gray-500">
            {format(new Date(race.raceDate), 'd MMMM yyyy', { locale: dateLocale })}
          </p>
          {race.goalTime && (
            <p className="text-sm text-blue-600">{t('Mål', 'Goal')}: {race.goalTime}</p>
          )}
        </div>
      </div>

      <div className="text-right">
        {daysUntil > 0 && (
          <>
            <p className="text-2xl font-bold text-blue-600">{daysUntil}</p>
            <p className="text-xs text-gray-500">{t('dagar', 'days')}</p>
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
          {race.raceType === 'A_RACE' ? t('A-lopp', 'A race') : t('B-lopp', 'B race')}
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

function getDistanceLabel(distance: string, locale: 'en' | 'sv'): string {
  const labels: Record<'en' | 'sv', Record<string, string>> = {
    en: {
      '5K': '5 km',
      '10K': '10 km',
      HALF_MARATHON: 'Half marathon',
      MARATHON: 'Marathon',
      CUSTOM: 'Custom distance',
    },
    sv: {
      '5K': '5 km',
      '10K': '10 km',
      HALF_MARATHON: 'Halvmaraton',
      MARATHON: 'Maraton',
      CUSTOM: 'Annan distans',
    },
  }
  return labels[locale][distance] || distance
}

function getGoalTypeLabel(type: string, locale: 'en' | 'sv'): string {
  const labels: Record<'en' | 'sv', Record<string, string>> = {
    en: {
      marathon: 'Marathon',
      half_marathon: 'Half marathon',
      '10k': '10K',
      '5k': '5K',
      fitness: 'Fitness',
      cycling: 'Cycling',
      triathlon: 'Triathlon',
      skiing: 'Skiing',
      custom: 'Custom',
    },
    sv: {
      marathon: 'Marathon',
      half_marathon: 'Halvmaraton',
      '10k': '10K',
      '5k': '5K',
      fitness: 'Kondition',
      cycling: 'Cykling',
      triathlon: 'Triathlon',
      skiing: 'Skidåkning',
      custom: 'Anpassad',
    },
  }
  return labels[locale][type] || type
}
