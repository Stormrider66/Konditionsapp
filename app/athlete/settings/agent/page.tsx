'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Bot,
  ShieldCheck,
  Settings,
  ArrowLeft,
  Save,
  Loader2,
  Download,
  Trash2,
  AlertTriangle,
  Lock,
  Zap,
  Eye,
  Power,
} from 'lucide-react'
import Link from 'next/link'
import { useBasePath } from '@/lib/contexts/BasePathContext'

interface Preferences {
  autonomyLevel: string
  allowWorkoutModification: boolean
  allowRestDayInjection: boolean
  maxIntensityReduction: number
  dailyBriefingEnabled: boolean
  proactiveNudgesEnabled: boolean
  preferredContactMethod: string
  minRestDaysPerWeek: number
  maxConsecutiveHardDays: number
}

interface ConsentStatus {
  hasRequiredConsent: boolean
  dataProcessingConsent: boolean
  automatedDecisionConsent: boolean
  healthDataProcessingConsent: boolean
  learningContributionConsent: boolean
  anonymizedResearchConsent: boolean
  consentVersion: string
  consentGivenAt: string | null
  isWithdrawn: boolean
}

const defaultPreferences: Preferences = {
  autonomyLevel: 'ADVISORY',
  allowWorkoutModification: false,
  allowRestDayInjection: false,
  maxIntensityReduction: 20,
  dailyBriefingEnabled: true,
  proactiveNudgesEnabled: true,
  preferredContactMethod: 'IN_APP',
  minRestDaysPerWeek: 1,
  maxConsecutiveHardDays: 3,
}

const autonomyLevels = [
  {
    value: 'ADVISORY',
    label: 'Advisory',
    description: 'Agent recommends, you decide. No automatic changes.',
    icon: Eye,
  },
  {
    value: 'LIMITED',
    label: 'Limited',
    description: 'Agent can make minor intensity adjustments within your limits.',
    icon: Settings,
  },
  {
    value: 'SUPERVISED',
    label: 'Supervised',
    description: 'Agent adjusts workouts, coach is notified of significant changes.',
    icon: ShieldCheck,
  },
  {
    value: 'AUTONOMOUS',
    label: 'Autonomous',
    description: 'Full autonomy. Only critical safety issues are escalated.',
    icon: Power,
  },
]

export default function AgentSettingsPage() {
  const basePath = useBasePath()
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences)
  const [consent, setConsent] = useState<ConsentStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const [prefsRes, consentRes] = await Promise.all([
          fetch('/api/agent/preferences'),
          fetch('/api/agent/consent'),
        ])

        if (prefsRes.ok) {
          const prefsData = await prefsRes.json()
          if (!prefsData.isDefault) {
            setPreferences(prefsData)
          }
        }

        if (consentRes.ok) {
          const consentData = await consentRes.json()
          setConsent(consentData)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
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
      const response = await fetch('/api/agent/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      })

      if (response.ok) {
        setHasChanges(false)
        setSaveMessage('Settings saved!')
        setTimeout(() => setSaveMessage(null), 3000)
      } else {
        setSaveMessage('Could not save settings')
      }
    } catch (error) {
      console.error('Error saving preferences:', error)
      setSaveMessage('An error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleExportData() {
    setIsExporting(true)
    try {
      const response = await fetch('/api/agent/data/export')
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `agent-data-export-${new Date().toISOString().split('T')[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting data:', error)
    } finally {
      setIsExporting(false)
    }
  }

  async function handleDeleteData() {
    setIsDeleting(true)
    try {
      await fetch('/api/agent/data/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'DELETE_ALL_AGENT_DATA' }),
      })
      // Reload page after deletion
      window.location.reload()
    } catch (error) {
      console.error('Error deleting data:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleWithdrawConsent() {
    try {
      await fetch('/api/agent/consent/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      // Reload page
      window.location.reload()
    } catch (error) {
      console.error('Error withdrawing consent:', error)
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
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6" />
            AI Agent Settings
          </h1>
          <p className="text-muted-foreground">
            Configure how the AI training agent works for you
          </p>
        </div>
      </div>

      {/* Consent Status */}
      {consent && (
        <Card className={consent.hasRequiredConsent ? 'border-green-200 dark:border-green-800' : 'border-yellow-200 dark:border-yellow-800'}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-4 w-4" />
              Consent Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${consent.dataProcessingConsent ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span>Data Processing</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${consent.healthDataProcessingConsent ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span>Health Data</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${consent.automatedDecisionConsent ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span>Automated Decisions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${consent.learningContributionConsent ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span>Model Improvement</span>
              </div>
            </div>
            {consent.consentGivenAt && (
              <p className="text-xs text-muted-foreground">
                Consent granted on {new Date(consent.consentGivenAt).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Autonomy Level */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Autonomy Level
          </CardTitle>
          <CardDescription>
            Choose how much control the AI agent has over your training
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {autonomyLevels.map((level) => {
              const Icon = level.icon
              return (
                <label
                  key={level.value}
                  className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    preferences.autonomyLevel === level.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="autonomy"
                    value={level.value}
                    checked={preferences.autonomyLevel === level.value}
                    onChange={(e) => updatePreference('autonomyLevel', e.target.value)}
                    className="sr-only"
                  />
                  <Icon className={`h-5 w-5 ${
                    preferences.autonomyLevel === level.value
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  }`} />
                  <div className="flex-1">
                    <p className="font-medium">{level.label}</p>
                    <p className="text-sm text-muted-foreground">{level.description}</p>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border-2 ${
                      preferences.autonomyLevel === level.value
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground'
                    }`}
                  />
                </label>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Allowed Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Allowed Actions</CardTitle>
          <CardDescription>
            Configure which actions the agent can take
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Workout Modification</Label>
              <p className="text-sm text-muted-foreground">
                Allow agent to adjust workout intensity and duration
              </p>
            </div>
            <Switch
              checked={preferences.allowWorkoutModification}
              onCheckedChange={(v) => updatePreference('allowWorkoutModification', v)}
            />
          </div>

          {preferences.allowWorkoutModification && (
            <div className="space-y-3 pl-4 border-l-2 border-muted">
              <Label>Maximum Intensity Reduction: {preferences.maxIntensityReduction}%</Label>
              <Slider
                value={[preferences.maxIntensityReduction]}
                onValueChange={([v]) => updatePreference('maxIntensityReduction', v)}
                min={10}
                max={50}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                The maximum percentage the agent can reduce workout intensity
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Rest Day Injection</Label>
              <p className="text-sm text-muted-foreground">
                Allow agent to add rest days when needed
              </p>
            </div>
            <Switch
              checked={preferences.allowRestDayInjection}
              onCheckedChange={(v) => updatePreference('allowRestDayInjection', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Safety Bounds */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Safety Preferences
          </CardTitle>
          <CardDescription>
            Set your training safety limits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Minimum Rest Days Per Week: {preferences.minRestDaysPerWeek}</Label>
            <Slider
              value={[preferences.minRestDaysPerWeek]}
              onValueChange={([v]) => updatePreference('minRestDaysPerWeek', v)}
              min={0}
              max={3}
              step={1}
              className="w-full"
            />
          </div>

          <div className="space-y-3">
            <Label>Maximum Consecutive Hard Days: {preferences.maxConsecutiveHardDays}</Label>
            <Slider
              value={[preferences.maxConsecutiveHardDays]}
              onValueChange={([v]) => updatePreference('maxConsecutiveHardDays', v)}
              min={2}
              max={5}
              step={1}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Communication */}
      <Card>
        <CardHeader>
          <CardTitle>Communication</CardTitle>
          <CardDescription>
            How the agent communicates with you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Daily Briefings</Label>
              <p className="text-sm text-muted-foreground">
                Receive daily training insights
              </p>
            </div>
            <Switch
              checked={preferences.dailyBriefingEnabled}
              onCheckedChange={(v) => updatePreference('dailyBriefingEnabled', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Proactive Nudges</Label>
              <p className="text-sm text-muted-foreground">
                Receive motivational messages and reminders
              </p>
            </div>
            <Switch
              checked={preferences.proactiveNudgesEnabled}
              onCheckedChange={(v) => updatePreference('proactiveNudgesEnabled', v)}
            />
          </div>

          <div className="space-y-2">
            <Label>Preferred Contact Method</Label>
            <Select
              value={preferences.preferredContactMethod}
              onValueChange={(v) => updatePreference('preferredContactMethod', v)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IN_APP">In-App Only</SelectItem>
                <SelectItem value="EMAIL">Email</SelectItem>
                <SelectItem value="SMS" disabled>SMS (Coming Soon)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Data Management (GDPR) */}
      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>
            Export or delete your agent data (GDPR)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleExportData}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export Data
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-red-600 hover:text-red-700">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Delete All Agent Data?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all your agent preferences, perceptions,
                    actions, and learning data. Audit logs are retained for legal compliance.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteData}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    Delete All Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {consent?.hasRequiredConsent && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="text-muted-foreground">
                  Withdraw Consent
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Withdraw Consent?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will stop all agent operations immediately. You can re-enable
                    the agent at any time by granting consent again. Your data will
                    be preserved unless you also choose to delete it.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleWithdrawConsent}>
                    Withdraw Consent
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center justify-between sticky bottom-4 bg-background/80 backdrop-blur-sm p-4 rounded-lg border">
        <div>
          {saveMessage && (
            <p
              className={`text-sm ${
                saveMessage.includes('saved') ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {saveMessage}
            </p>
          )}
          {hasChanges && !saveMessage && (
            <p className="text-sm text-muted-foreground">You have unsaved changes</p>
          )}
        </div>
        <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
