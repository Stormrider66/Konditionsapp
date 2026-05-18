'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { InfoIcon, HeartPulse, Watch, Zap } from 'lucide-react'
import { useTranslations } from '@/i18n/client'

export interface BiometricsData {
  restingHR: number | null
  maxHR: number | null
  watchVO2maxEstimate: number | null
  watchBrand: string | null
}

export const DEFAULT_BIOMETRICS_DATA: BiometricsData = {
  restingHR: null,
  maxHR: null,
  watchVO2maxEstimate: null,
  watchBrand: null,
}

const WATCH_BRANDS = [
  { id: 'garmin', label: 'Garmin', icon: '⌚' },
  { id: 'apple', label: 'Apple Watch', icon: '⌚' },
  { id: 'polar', label: 'Polar', icon: '⌚' },
  { id: 'suunto', label: 'Suunto', icon: '⌚' },
  { id: 'coros', label: 'COROS', icon: '⌚' },
  { id: 'whoop', label: 'WHOOP', icon: '⌚' },
  { id: 'fitbit', label: 'Fitbit', icon: '⌚' },
  { id: 'samsung', label: 'Samsung Galaxy Watch', icon: '⌚' },
  { id: 'other', label: 'Other', icon: '⌚' },
]

interface BiometricsStepProps {
  value: BiometricsData
  onChange: (data: BiometricsData) => void
  locale?: 'en' | 'sv'
  age?: number // Used to show estimated max HR
}

export function BiometricsStep({
  value,
  onChange,
  age,
}: BiometricsStepProps) {
  const t = useTranslations('components.biometricsStep')

  const updateData = (updates: Partial<BiometricsData>) => {
    onChange({ ...value, ...updates })
  }

  // Estimated max HR using Tanaka formula (208 - 0.7 × age)
  const estimatedMaxHR = age ? Math.round(208 - 0.7 * age) : null

  return (
    <div className="space-y-6">
      {/* Introduction */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <InfoIcon className="h-4 w-4 text-blue-600" />
            {t('intro.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {t('intro.description')}
        </CardContent>
      </Card>

      {/* Resting Heart Rate */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-red-500" />
            {t('sections.resting.title')}
          </CardTitle>
          <CardDescription>
            {t('sections.resting.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={30}
              max={120}
              placeholder={t('fields.resting.placeholder')}
              value={value.restingHR ?? ''}
              onChange={(e) => updateData({
                restingHR: e.target.value ? parseInt(e.target.value) : null
              })}
              className="max-w-[120px]"
            />
            <span className="text-sm text-muted-foreground">BPM</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {t('fields.resting.rangeBadge')}
            </Badge>
            {value.restingHR && value.restingHR < 50 && (
              <Badge variant="secondary" className="text-xs bg-green-100">
                {t('fields.resting.levelAthletic')}
              </Badge>
            )}
            {value.restingHR && value.restingHR >= 50 && value.restingHR <= 60 && (
              <Badge variant="secondary" className="text-xs bg-blue-100">
                {t('fields.resting.levelGoodFitness')}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Max Heart Rate */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-orange-500" />
            {t('sections.maxRate.title')}
            <Badge variant="outline" className="text-xs ml-1">
              {t('labels.optional')}
            </Badge>
          </CardTitle>
          <CardDescription>
            {t('sections.maxRate.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={140}
              max={230}
              placeholder={estimatedMaxHR ? `~${estimatedMaxHR}` : t('fields.maxRate.placeholder')}
              value={value.maxHR ?? ''}
              onChange={(e) => updateData({
                maxHR: e.target.value ? parseInt(e.target.value) : null
              })}
              className="max-w-[120px]"
            />
            <span className="text-sm text-muted-foreground">BPM</span>
          </div>
          {estimatedMaxHR && !value.maxHR && (
            <p className="text-xs text-muted-foreground">
              {t('sections.maxRate.estimatedMessage', { bpm: estimatedMaxHR })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Watch VO2max Estimate */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Watch className="h-4 w-4 text-purple-500" />
            {t('sections.watchVo2.title')}
            <Badge variant="outline" className="text-xs ml-1">
              {t('labels.optional')}
            </Badge>
          </CardTitle>
          <CardDescription>
            {t('sections.watchVo2.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Watch brand selector */}
          <div className="space-y-2">
            <Label className="text-sm">
              {t('fields.watchBrand.label')}
            </Label>
            <div className="flex flex-wrap gap-2">
              {WATCH_BRANDS.map((brand) => (
                <button
                  key={brand.id}
                  type="button"
                  onClick={() => updateData({ watchBrand: value.watchBrand === brand.id ? null : brand.id })}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    value.watchBrand === brand.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {brand.id === 'other' ? t('watchBrands.other') : brand.label}
                </button>
              ))}
            </div>
          </div>

          {/* VO2max input - only show if watch brand selected */}
          {value.watchBrand && (
            <div className="space-y-2">
              <Label className="text-sm">
                {t('fields.watchVo2Value.label')}
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={20}
                  max={90}
                  step={0.1}
                  placeholder={t('fields.watchVo2Value.placeholder')}
                  value={value.watchVO2maxEstimate ?? ''}
                  onChange={(e) => updateData({
                    watchVO2maxEstimate: e.target.value ? parseFloat(e.target.value) : null
                  })}
                  className="max-w-[120px]"
                />
                <span className="text-sm text-muted-foreground">ml/kg/min</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('fields.watchVo2Value.helpText')}
              </p>
            </div>
          )}

          {/* VO2max reference */}
          <div className="border rounded-lg p-3 bg-muted/30">
            <p className="text-xs font-medium mb-2">
              {t('fields.vo2Reference.title')}
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>{t('fields.vo2Reference.untrained')}: &lt;35</span>
              <span>{t('fields.vo2Reference.recreational')}: 40-50</span>
              <span>{t('fields.vo2Reference.beginner')}: 35-40</span>
              <span>{t('fields.vo2Reference.trained')}: 50-55</span>
              <span>{t('fields.vo2Reference.wellTrained')}: 55-65</span>
              <span>{t('fields.vo2Reference.elite')}: &gt;65</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Field test recommendation */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-600" />
            {t('sections.fieldTest.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {t('sections.fieldTest.description')}
        </CardContent>
      </Card>
    </div>
  )
}
