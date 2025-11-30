'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Swimming-specific options
const STROKE_TYPES = [
  { id: 'freestyle', label: 'Freestyle / Front Crawl', labelSv: 'Frisim / Crawl', icon: '🏊' },
  { id: 'backstroke', label: 'Backstroke', labelSv: 'Ryggsim', icon: '🏊‍♂️' },
  { id: 'breaststroke', label: 'Breaststroke', labelSv: 'Bröstsim', icon: '🏊‍♀️' },
  { id: 'butterfly', label: 'Butterfly', labelSv: 'Fjärilsim', icon: '🦋' },
  { id: 'im', label: 'Individual Medley', labelSv: 'Medley', icon: '🔄' },
]

const SWIMMING_DISCIPLINES = [
  { id: 'pool_distance', label: 'Pool Distance (400m+)', labelSv: 'Pool Distans (400m+)' },
  { id: 'pool_sprint', label: 'Pool Sprint (50-200m)', labelSv: 'Pool Sprint (50-200m)' },
  { id: 'open_water', label: 'Open Water', labelSv: 'Öppet vatten' },
  { id: 'triathlon', label: 'Triathlon Swim', labelSv: 'Triathlonsim' },
  { id: 'masters', label: 'Masters Swimming', labelSv: 'Mastersim' },
  { id: 'recreational', label: 'Recreational / Fitness', labelSv: 'Motion / Kondition' },
]

const POOL_LENGTHS = [
  { id: '25', label: '25m (Short Course)', labelSv: '25m (Kortbana)' },
  { id: '50', label: '50m (Long Course)', labelSv: '50m (Långbana)' },
]

const TRAINING_ENVIRONMENTS = [
  { id: 'pool_indoor', label: 'Indoor Pool', labelSv: 'Inomhusbassäng' },
  { id: 'pool_outdoor', label: 'Outdoor Pool', labelSv: 'Utomhusbassäng' },
  { id: 'lake', label: 'Lake / Open Water', labelSv: 'Sjö / Öppet vatten' },
  { id: 'ocean', label: 'Ocean', labelSv: 'Hav' },
  { id: 'endless_pool', label: 'Endless Pool / Swim Spa', labelSv: 'Endless Pool / Swimspa' },
]

const EQUIPMENT = [
  { id: 'pull_buoy', label: 'Pull Buoy', labelSv: 'Pull buoy' },
  { id: 'paddles', label: 'Hand Paddles', labelSv: 'Handpaddlar' },
  { id: 'fins', label: 'Swim Fins', labelSv: 'Simfenor' },
  { id: 'snorkel', label: 'Center Snorkel', labelSv: 'Simsnorkel' },
  { id: 'kickboard', label: 'Kickboard', labelSv: 'Simplatta' },
  { id: 'wetsuit', label: 'Wetsuit', labelSv: 'Våtdräkt' },
]

export interface SwimmingSettings {
  strokeTypes: string[]
  primaryStroke: string
  primaryDiscipline: string
  preferredPoolLength: string
  trainingEnvironments: string[]
  currentCss: number | null // Critical Swim Speed in seconds per 100m
  cssTestDate: string | null
  weeklySwimDistance: number // km per week
  weeklySwimSessions: number
  equipment: string[]
  hasHeartRateMonitor: boolean
  openWaterExperience: 'none' | 'beginner' | 'intermediate' | 'advanced'
  swimmingExperience: 'beginner' | 'intermediate' | 'advanced' | 'elite'
}

interface SwimmingOnboardingProps {
  value: SwimmingSettings
  onChange: (settings: SwimmingSettings) => void
  locale?: 'en' | 'sv'
}

// Helper to format CSS time (seconds to mm:ss)
function formatCssTime(seconds: number | null): string {
  if (!seconds) return ''
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Helper to parse CSS time (mm:ss to seconds)
function parseCssTime(timeStr: string): number | null {
  if (!timeStr) return null
  const parts = timeStr.split(':')
  if (parts.length === 2) {
    const mins = parseInt(parts[0]) || 0
    const secs = parseInt(parts[1]) || 0
    return mins * 60 + secs
  }
  return parseInt(timeStr) || null
}

export function SwimmingOnboarding({
  value,
  onChange,
  locale = 'sv',
}: SwimmingOnboardingProps) {
  const t = (en: string, sv: string) => (locale === 'sv' ? sv : en)
  const [cssInput, setCssInput] = useState(formatCssTime(value.currentCss))

  const updateSettings = (updates: Partial<SwimmingSettings>) => {
    onChange({ ...value, ...updates })
  }

  const toggleStroke = (strokeId: string) => {
    const newStrokes = value.strokeTypes.includes(strokeId)
      ? value.strokeTypes.filter((s) => s !== strokeId)
      : [...value.strokeTypes, strokeId]
    updateSettings({ strokeTypes: newStrokes })
  }

  const toggleEnvironment = (envId: string) => {
    const newEnvs = value.trainingEnvironments.includes(envId)
      ? value.trainingEnvironments.filter((e) => e !== envId)
      : [...value.trainingEnvironments, envId]
    updateSettings({ trainingEnvironments: newEnvs })
  }

  const toggleEquipment = (equipId: string) => {
    const newEquip = value.equipment.includes(equipId)
      ? value.equipment.filter((e) => e !== equipId)
      : [...value.equipment, equipId]
    updateSettings({ equipment: newEquip })
  }

  const handleCssChange = (timeStr: string) => {
    setCssInput(timeStr)
    const seconds = parseCssTime(timeStr)
    updateSettings({ currentCss: seconds })
  }

  return (
    <div className="space-y-8">
      {/* Experience Level */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">
          {t('What is your swimming experience level?', 'Vad är din simerfarenhet?')}
        </Label>
        <RadioGroup
          value={value.swimmingExperience}
          onValueChange={(val) => updateSettings({ swimmingExperience: val as SwimmingSettings['swimmingExperience'] })}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          {[
            { id: 'beginner', label: 'Beginner', labelSv: 'Nybörjare', desc: '<1 year', descSv: '<1 år' },
            { id: 'intermediate', label: 'Intermediate', labelSv: 'Medel', desc: '1-3 years', descSv: '1-3 år' },
            { id: 'advanced', label: 'Advanced', labelSv: 'Avancerad', desc: '3+ years', descSv: '3+ år' },
            { id: 'elite', label: 'Elite', labelSv: 'Elit', desc: 'Competitive', descSv: 'Tävling' },
          ].map((exp) => (
            <Label
              key={exp.id}
              htmlFor={`exp-${exp.id}`}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg border p-3 cursor-pointer transition-colors text-center',
                value.swimmingExperience === exp.id
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-primary/50'
              )}
            >
              <RadioGroupItem value={exp.id} id={`exp-${exp.id}`} className="sr-only" />
              <span className="font-medium">{locale === 'sv' ? exp.labelSv : exp.label}</span>
              <span className="text-xs text-muted-foreground">{locale === 'sv' ? exp.descSv : exp.desc}</span>
            </Label>
          ))}
        </RadioGroup>
      </div>

      {/* Stroke Types */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">
          {t('Which strokes do you train?', 'Vilka simsätt tränar du?')}
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {STROKE_TYPES.map((stroke) => (
            <Label
              key={stroke.id}
              htmlFor={`stroke-${stroke.id}`}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                value.strokeTypes.includes(stroke.id)
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-primary/50'
              )}
            >
              <Checkbox
                id={`stroke-${stroke.id}`}
                checked={value.strokeTypes.includes(stroke.id)}
                onCheckedChange={() => toggleStroke(stroke.id)}
              />
              <span className="text-lg">{stroke.icon}</span>
              <span className="text-sm">{locale === 'sv' ? stroke.labelSv : stroke.label}</span>
            </Label>
          ))}
        </div>
      </div>

      {/* Primary Stroke */}
      {value.strokeTypes.length > 0 && (
        <div className="space-y-4">
          <Label className="text-base font-semibold">
            {t('What is your primary stroke?', 'Vilket är ditt huvudsakliga simsätt?')}
          </Label>
          <RadioGroup
            value={value.primaryStroke}
            onValueChange={(val) => updateSettings({ primaryStroke: val })}
            className="grid grid-cols-2 sm:grid-cols-3 gap-3"
          >
            {STROKE_TYPES.filter((s) => value.strokeTypes.includes(s.id)).map((stroke) => (
              <Label
                key={stroke.id}
                htmlFor={`primary-${stroke.id}`}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                  value.primaryStroke === stroke.id
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-primary/50'
                )}
              >
                <RadioGroupItem value={stroke.id} id={`primary-${stroke.id}`} />
                <span className="text-sm">{locale === 'sv' ? stroke.labelSv : stroke.label}</span>
              </Label>
            ))}
          </RadioGroup>
        </div>
      )}

      {/* Primary Discipline */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">
          {t('What is your primary swimming goal?', 'Vad är ditt primära simmål?')}
        </Label>
        <RadioGroup
          value={value.primaryDiscipline}
          onValueChange={(val) => updateSettings({ primaryDiscipline: val })}
          className="grid grid-cols-2 sm:grid-cols-3 gap-3"
        >
          {SWIMMING_DISCIPLINES.map((disc) => (
            <Label
              key={disc.id}
              htmlFor={`disc-${disc.id}`}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                value.primaryDiscipline === disc.id
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-primary/50'
              )}
            >
              <RadioGroupItem value={disc.id} id={`disc-${disc.id}`} />
              <span className="text-sm">{locale === 'sv' ? disc.labelSv : disc.label}</span>
            </Label>
          ))}
        </RadioGroup>
      </div>

      {/* CSS (Critical Swim Speed) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t('Critical Swim Speed (CSS)', 'Kritisk Simhastighet (CSS)')}
          </CardTitle>
          <CardDescription>
            {t(
              'CSS is your threshold pace - the fastest pace you can maintain for a continuous swim. Enter time per 100m.',
              'CSS är din tröskeltemper - den snabbaste fart du kan hålla vid kontinuerlig simning. Ange tid per 100m.'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('CSS pace (min:sec per 100m)', 'CSS tempo (min:sek per 100m)')}</Label>
              <Input
                type="text"
                placeholder="1:45"
                value={cssInput}
                onChange={(e) => handleCssChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t('Format: m:ss (e.g., 1:45 = 1 min 45 sec)', 'Format: m:ss (t.ex. 1:45 = 1 min 45 sek)')}
              </p>
            </div>
            <div className="space-y-2">
              <Label>{t('Last CSS test date', 'Senaste CSS-test')}</Label>
              <Input
                type="date"
                value={value.cssTestDate || ''}
                onChange={(e) => updateSettings({ cssTestDate: e.target.value || null })}
              />
            </div>
          </div>

          {value.currentCss && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">{t('Your estimated paces:', 'Dina beräknade tempon:')}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">{t('Recovery:', 'Återhämtning:')}</span>
                  <span className="ml-2 font-mono">{formatCssTime(Math.round(value.currentCss * 1.25))}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('Endurance:', 'Uthållighet:')}</span>
                  <span className="ml-2 font-mono">{formatCssTime(Math.round(value.currentCss * 1.10))}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">CSS:</span>
                  <span className="ml-2 font-mono">{formatCssTime(value.currentCss)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">VO2max:</span>
                  <span className="ml-2 font-mono">{formatCssTime(Math.round(value.currentCss * 0.92))}</span>
                </div>
              </div>
            </div>
          )}

          {/* Pool Length */}
          <div className="space-y-2">
            <Label>{t('Preferred pool length', 'Föredragen bassänglängd')}</Label>
            <RadioGroup
              value={value.preferredPoolLength}
              onValueChange={(val) => updateSettings({ preferredPoolLength: val })}
              className="grid grid-cols-2 gap-2"
            >
              {POOL_LENGTHS.map((pool) => (
                <Label
                  key={pool.id}
                  htmlFor={`pool-${pool.id}`}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border p-2 cursor-pointer transition-colors text-sm',
                    value.preferredPoolLength === pool.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  )}
                >
                  <RadioGroupItem value={pool.id} id={`pool-${pool.id}`} />
                  <span>{locale === 'sv' ? pool.labelSv : pool.label}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          {/* HR Monitor */}
          <Label className="flex items-center gap-3 cursor-pointer">
            <Checkbox
              checked={value.hasHeartRateMonitor}
              onCheckedChange={(checked) => updateSettings({ hasHeartRateMonitor: !!checked })}
            />
            <span>{t('I have a waterproof heart rate monitor', 'Jag har en vattentät pulsmätare')}</span>
          </Label>
        </CardContent>
      </Card>

      {/* Training Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t('Training Setup', 'Träningsinställningar')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Training Environments */}
          <div className="space-y-2">
            <Label>{t('Training environments', 'Träningsmiljöer')}</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TRAINING_ENVIRONMENTS.map((env) => (
                <Label
                  key={env.id}
                  htmlFor={`env-${env.id}`}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border p-2 cursor-pointer transition-colors text-sm',
                    value.trainingEnvironments.includes(env.id)
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  )}
                >
                  <Checkbox
                    id={`env-${env.id}`}
                    checked={value.trainingEnvironments.includes(env.id)}
                    onCheckedChange={() => toggleEnvironment(env.id)}
                  />
                  <span>{locale === 'sv' ? env.labelSv : env.label}</span>
                </Label>
              ))}
            </div>
          </div>

          {/* Open Water Experience */}
          {value.trainingEnvironments.some((e) => ['lake', 'ocean'].includes(e)) && (
            <div className="space-y-2">
              <Label>{t('Open water experience', 'Öppet vatten-erfarenhet')}</Label>
              <RadioGroup
                value={value.openWaterExperience}
                onValueChange={(val) => updateSettings({ openWaterExperience: val as SwimmingSettings['openWaterExperience'] })}
                className="grid grid-cols-2 sm:grid-cols-4 gap-2"
              >
                {[
                  { id: 'none', label: 'None', labelSv: 'Ingen' },
                  { id: 'beginner', label: 'Beginner', labelSv: 'Nybörjare' },
                  { id: 'intermediate', label: 'Intermediate', labelSv: 'Medel' },
                  { id: 'advanced', label: 'Advanced', labelSv: 'Avancerad' },
                ].map((exp) => (
                  <Label
                    key={exp.id}
                    htmlFor={`ow-${exp.id}`}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border p-2 cursor-pointer transition-colors text-sm',
                      value.openWaterExperience === exp.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    )}
                  >
                    <RadioGroupItem value={exp.id} id={`ow-${exp.id}`} />
                    <span>{locale === 'sv' ? exp.labelSv : exp.label}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Equipment */}
          <div className="space-y-2">
            <Label>{t('Available equipment', 'Tillgänglig utrustning')}</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EQUIPMENT.map((equip) => (
                <Label
                  key={equip.id}
                  htmlFor={`equip-${equip.id}`}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border p-2 cursor-pointer transition-colors text-sm',
                    value.equipment.includes(equip.id)
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  )}
                >
                  <Checkbox
                    id={`equip-${equip.id}`}
                    checked={value.equipment.includes(equip.id)}
                    onCheckedChange={() => toggleEquipment(equip.id)}
                  />
                  <span>{locale === 'sv' ? equip.labelSv : equip.label}</span>
                </Label>
              ))}
            </div>
          </div>

          {/* Weekly Volume */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('Weekly swim sessions', 'Simpass per vecka')}</Label>
              <Input
                type="number"
                min={1}
                max={14}
                className="max-w-[150px]"
                value={value.weeklySwimSessions}
                onChange={(e) => updateSettings({ weeklySwimSessions: parseInt(e.target.value) || 3 })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('Weekly distance (km)', 'Veckodistans (km)')}</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                className="max-w-[150px]"
                value={value.weeklySwimDistance}
                onChange={(e) => updateSettings({ weeklySwimDistance: parseFloat(e.target.value) || 5 })}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Default swimming settings
export const DEFAULT_SWIMMING_SETTINGS: SwimmingSettings = {
  strokeTypes: ['freestyle'],
  primaryStroke: 'freestyle',
  primaryDiscipline: '',
  preferredPoolLength: '25',
  trainingEnvironments: ['pool_indoor'],
  currentCss: null,
  cssTestDate: null,
  weeklySwimDistance: 5,
  weeklySwimSessions: 3,
  equipment: [],
  hasHeartRateMonitor: false,
  openWaterExperience: 'none',
  swimmingExperience: 'intermediate',
}
