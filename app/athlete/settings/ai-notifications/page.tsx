'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sun,
  Dumbbell,
  TrendingDown,
  ClipboardCheck,
  Trophy,
  Cloud,
  ArrowLeft,
  Save,
  Loader2,
  Bell,
  Volume2,
  MessageSquare,
} from 'lucide-react'
import Link from 'next/link'
import { useBasePath } from '@/lib/contexts/BasePathContext'
import { useTranslations } from '@/i18n/client'

interface Preferences {
  morningBriefingEnabled: boolean
  preWorkoutNudgeEnabled: boolean
  postWorkoutCheckEnabled: boolean
  patternAlertsEnabled: boolean
  milestoneAlertsEnabled: boolean
  weatherAlertsEnabled: boolean
  morningBriefingTime: string
  preWorkoutLeadTime: number
  timezone: string
  verbosityLevel: string
  motivationStyle: string
}

const defaultPreferences: Preferences = {
  morningBriefingEnabled: true,
  preWorkoutNudgeEnabled: true,
  postWorkoutCheckEnabled: true,
  patternAlertsEnabled: true,
  milestoneAlertsEnabled: true,
  weatherAlertsEnabled: false,
  morningBriefingTime: '07:00',
  preWorkoutLeadTime: 120,
  timezone: 'Europe/Stockholm',
  verbosityLevel: 'NORMAL',
  motivationStyle: 'BALANCED',
}

const verbosityOptions = [
  { value: 'MINIMAL', labelKey: 'verbosity.minimal.label', descriptionKey: 'verbosity.minimal.description' },
  { value: 'NORMAL', labelKey: 'verbosity.normal.label', descriptionKey: 'verbosity.normal.description' },
  { value: 'DETAILED', labelKey: 'verbosity.detailed.label', descriptionKey: 'verbosity.detailed.description' },
]

const motivationOptions = [
  { value: 'SUPPORTIVE', labelKey: 'motivation.supportive.label', descriptionKey: 'motivation.supportive.description' },
  { value: 'BALANCED', labelKey: 'motivation.balanced.label', descriptionKey: 'motivation.balanced.description' },
  { value: 'CHALLENGING', labelKey: 'motivation.challenging.label', descriptionKey: 'motivation.challenging.description' },
]

const leadTimeOptions = [
  { value: 30, labelKey: 'leadTimes.thirtyMinutes' },
  { value: 60, labelKey: 'leadTimes.oneHour' },
  { value: 90, labelKey: 'leadTimes.ninetyMinutes' },
  { value: 120, labelKey: 'leadTimes.twoHours' },
  { value: 180, labelKey: 'leadTimes.threeHours' },
  { value: 240, labelKey: 'leadTimes.fourHours' },
]

export default function AINotificationSettingsPage() {
  const t = useTranslations('pages.aiNotifications')
  const basePath = useBasePath()
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [saveMessage, setSaveMessage] = useState<'saved' | 'saveFailed' | 'error' | null>(null)

  useEffect(() => {
    async function fetchPreferences() {
      try {
        const response = await fetch('/api/athlete/notification-preferences')
        if (response.ok) {
          const data = await response.json()
          if (data.preferences) {
            setPreferences({ ...defaultPreferences, ...data.preferences })
          }
        }
      } catch (error) {
        console.error('Error fetching preferences:', error)
      } finally {
        setIsLoading(false)
      }
    }

    void fetchPreferences()
  }, [])

  function updatePreference<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setPreferences((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
    setSaveMessage(null)
  }

  async function handleSave() {
    setIsSaving(true)
    setSaveMessage(null)

    try {
      const response = await fetch('/api/athlete/notification-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      })

      if (response.ok) {
        setHasChanges(false)
        setSaveMessage('saved')
        setTimeout(() => setSaveMessage(null), 3000)
      } else {
        setSaveMessage('saveFailed')
      }
    } catch (error) {
      console.error('Error saving preferences:', error)
      setSaveMessage('error')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container max-w-2xl py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`${basePath}/athlete/dashboard`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('description')}
          </p>
        </div>
      </div>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('notificationTypes.title')}
          </CardTitle>
          <CardDescription>
            {t('notificationTypes.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Morning Briefing */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Sun className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <Label className="text-base font-medium">{t('notificationTypes.morningBriefing.label')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('notificationTypes.morningBriefing.description')}
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.morningBriefingEnabled}
              onCheckedChange={(v) => updatePreference('morningBriefingEnabled', v)}
            />
          </div>

          {/* Pre-Workout Nudges */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Dumbbell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <Label className="text-base font-medium">{t('notificationTypes.preWorkout.label')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('notificationTypes.preWorkout.description')}
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.preWorkoutNudgeEnabled}
              onCheckedChange={(v) => updatePreference('preWorkoutNudgeEnabled', v)}
            />
          </div>

          {/* Post-Workout Check-ins */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <ClipboardCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <Label className="text-base font-medium">{t('notificationTypes.postWorkout.label')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('notificationTypes.postWorkout.description')}
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.postWorkoutCheckEnabled}
              onCheckedChange={(v) => updatePreference('postWorkoutCheckEnabled', v)}
            />
          </div>

          {/* Pattern Alerts */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <TrendingDown className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <Label className="text-base font-medium">{t('notificationTypes.patternAlerts.label')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('notificationTypes.patternAlerts.description')}
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.patternAlertsEnabled}
              onCheckedChange={(v) => updatePreference('patternAlertsEnabled', v)}
            />
          </div>

          {/* Milestone Celebrations */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <Label className="text-base font-medium">{t('notificationTypes.milestones.label')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('notificationTypes.milestones.description')}
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.milestoneAlertsEnabled}
              onCheckedChange={(v) => updatePreference('milestoneAlertsEnabled', v)}
            />
          </div>

          {/* Weather Alerts (Coming Soon) */}
          <div className="flex items-center justify-between opacity-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
                <Cloud className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <Label className="text-base font-medium">{t('notificationTypes.weather.label')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('notificationTypes.weather.description')}
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.weatherAlertsEnabled}
              onCheckedChange={(v) => updatePreference('weatherAlertsEnabled', v)}
              disabled
            />
          </div>
        </CardContent>
      </Card>

      {/* Timing Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t('timing.title')}</CardTitle>
          <CardDescription>
            {t('timing.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Morning Briefing Time */}
          <div className="grid gap-2">
            <Label htmlFor="briefing-time">{t('timing.morningBriefingTime')}</Label>
            <Input
              id="briefing-time"
              type="time"
              value={preferences.morningBriefingTime}
              onChange={(e) => updatePreference('morningBriefingTime', e.target.value)}
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              {t('timing.morningBriefingHelp')}
            </p>
          </div>

          {/* Pre-Workout Lead Time */}
          <div className="grid gap-2">
            <Label>{t('timing.preWorkoutLeadTime')}</Label>
            <Select
              value={preferences.preWorkoutLeadTime.toString()}
              onValueChange={(v) => updatePreference('preWorkoutLeadTime', parseInt(v))}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {leadTimeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {t(option.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t('timing.preWorkoutLeadHelp')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Communication Style */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t('communication.title')}
          </CardTitle>
          <CardDescription>
            {t('communication.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Verbosity Level */}
          <div className="grid gap-3">
            <Label className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              {t('communication.verbosityLabel')}
            </Label>
            <div className="grid gap-2">
              {verbosityOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    preferences.verbosityLevel === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="verbosity"
                    value={option.value}
                    checked={preferences.verbosityLevel === option.value}
                    onChange={(e) => updatePreference('verbosityLevel', e.target.value)}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded-full border-2 ${
                      preferences.verbosityLevel === option.value
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground'
                    }`}
                  />
                  <div>
                    <p className="font-medium">{t(option.labelKey)}</p>
                    <p className="text-sm text-muted-foreground">{t(option.descriptionKey)}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Motivation Style */}
          <div className="grid gap-3">
            <Label>{t('communication.motivationLabel')}</Label>
            <div className="grid gap-2">
              {motivationOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    preferences.motivationStyle === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="motivation"
                    value={option.value}
                    checked={preferences.motivationStyle === option.value}
                    onChange={(e) => updatePreference('motivationStyle', e.target.value)}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded-full border-2 ${
                      preferences.motivationStyle === option.value
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground'
                    }`}
                  />
                  <div>
                    <p className="font-medium">{t(option.labelKey)}</p>
                    <p className="text-sm text-muted-foreground">{t(option.descriptionKey)}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center justify-between sticky bottom-4 bg-background/80 backdrop-blur-sm p-4 rounded-lg border">
        <div>
          {saveMessage && (
            <p
              className={`text-sm ${
                saveMessage === 'saved' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {t(`saveMessages.${saveMessage}`)}
            </p>
          )}
          {hasChanges && !saveMessage && (
            <p className="text-sm text-muted-foreground">{t('unsavedChanges')}</p>
          )}
        </div>
        <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('actions.saving')}
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {t('actions.save')}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
