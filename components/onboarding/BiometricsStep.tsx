'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { InfoIcon, HeartPulse, Watch, Zap } from 'lucide-react'

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
  { id: 'other', label: 'Other', labelSv: 'Annan', icon: '⌚' },
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
  locale = 'sv',
  age,
}: BiometricsStepProps) {
  const t = (en: string, sv: string) => (locale === 'sv' ? sv : en)

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
            {t('Why we ask for this', 'Varför vi frågar om detta')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {t(
            'Heart rate data helps us calculate more accurate training zones. Athletes with better cardiovascular fitness have wider aerobic zones, while beginners have narrower zones. This affects how we prescribe training intensity.',
            'Pulsdata hjälper oss beräkna mer exakta träningszoner. Atleter med bättre kardiovaskulär kondition har bredare aeroba zoner, medan nybörjare har smalare zoner. Detta påverkar hur vi föreskriver träningsintensitet.'
          )}
        </CardContent>
      </Card>

      {/* Resting Heart Rate */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-red-500" />
            {t('Resting Heart Rate', 'Vilopuls')}
          </CardTitle>
          <CardDescription>
            {t(
              'Measure in the morning before getting out of bed, over several days for best accuracy.',
              'Mät på morgonen innan du går upp ur sängen, under flera dagar för bäst noggrannhet.'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={30}
              max={120}
              placeholder={t('e.g., 55', 't.ex. 55')}
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
              {t('Typical range: 40-80 BPM', 'Typiskt intervall: 40-80 BPM')}
            </Badge>
            {value.restingHR && value.restingHR < 50 && (
              <Badge variant="secondary" className="text-xs bg-green-100">
                {t('Athletic level', 'Atletisk nivå')}
              </Badge>
            )}
            {value.restingHR && value.restingHR >= 50 && value.restingHR <= 60 && (
              <Badge variant="secondary" className="text-xs bg-blue-100">
                {t('Good fitness', 'Bra kondition')}
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
            {t('Maximum Heart Rate', 'Maxpuls')}
            <Badge variant="outline" className="text-xs ml-1">
              {t('Optional', 'Valfritt')}
            </Badge>
          </CardTitle>
          <CardDescription>
            {t(
              'If you know your max HR from a test or hard workout, enter it here. Otherwise, we\'ll estimate it.',
              'Om du känner till din maxpuls från ett test eller hårt pass, ange den här. Annars uppskattar vi den.'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={140}
              max={230}
              placeholder={estimatedMaxHR ? `~${estimatedMaxHR}` : t('e.g., 185', 't.ex. 185')}
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
              {t(
                `Based on your age, estimated max HR is ~${estimatedMaxHR} BPM`,
                `Baserat på din ålder uppskattas maxpuls till ~${estimatedMaxHR} BPM`
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Watch VO2max Estimate */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Watch className="h-4 w-4 text-purple-500" />
            {t('Watch VO2max Estimate', 'VO2max från klocka')}
            <Badge variant="outline" className="text-xs ml-1">
              {t('Optional', 'Valfritt')}
            </Badge>
          </CardTitle>
          <CardDescription>
            {t(
              'If your fitness watch shows a VO2max estimate, enter it here. This helps us calibrate your training zones.',
              'Om din träningsklocka visar en VO2max-uppskattning, ange den här. Detta hjälper oss kalibrera dina träningszoner.'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Watch brand selector */}
          <div className="space-y-2">
            <Label className="text-sm">
              {t('Watch brand', 'Klockans märke')}
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
                  {brand.id === 'other' && locale === 'sv' ? brand.labelSv : brand.label}
                </button>
              ))}
            </div>
          </div>

          {/* VO2max input - only show if watch brand selected */}
          {value.watchBrand && (
            <div className="space-y-2">
              <Label className="text-sm">
                {t('VO2max value from watch', 'VO2max-värde från klockan')}
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={20}
                  max={90}
                  step={0.1}
                  placeholder={t('e.g., 45', 't.ex. 45')}
                  value={value.watchVO2maxEstimate ?? ''}
                  onChange={(e) => updateData({
                    watchVO2maxEstimate: e.target.value ? parseFloat(e.target.value) : null
                  })}
                  className="max-w-[120px]"
                />
                <span className="text-sm text-muted-foreground">ml/kg/min</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t(
                  'This is usually found in your watch app under "Fitness" or "Training Status".',
                  'Detta hittas vanligtvis i din klockapp under "Fitness" eller "Träningsstatus".'
                )}
              </p>
            </div>
          )}

          {/* VO2max reference */}
          <div className="border rounded-lg p-3 bg-muted/30">
            <p className="text-xs font-medium mb-2">
              {t('VO2max Reference', 'VO2max-referens')}
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>{t('Untrained', 'Otränad')}: &lt;35</span>
              <span>{t('Recreational', 'Motionär')}: 40-50</span>
              <span>{t('Beginner', 'Nybörjare')}: 35-40</span>
              <span>{t('Well-trained', 'Vältränad')}: 55-65</span>
              <span>{t('Trained', 'Tränad')}: 50-55</span>
              <span>{t('Elite', 'Elit')}: &gt;65</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Field test recommendation */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-600" />
            {t('Want more accurate zones?', 'Vill du ha mer exakta zoner?')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {t(
            'A field test (like a 30-minute time trial or a lactate test) provides much more accurate training zones. You can do this later in the app after completing onboarding.',
            'Ett fälttest (som ett 30-minuters tempopass eller ett laktattest) ger mycket mer exakta träningszoner. Du kan göra detta senare i appen efter att du har slutfört onboarding.'
          )}
        </CardContent>
      </Card>
    </div>
  )
}
