'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import { Edit2, Activity, Zap, Heart, Timer, Trophy, RefreshCw, Pencil } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AIContextButton } from '@/components/ai-studio/AIContextButton'
import { ChangeSportDialog } from '@/components/athlete/ChangeSportDialog'
import type { AthleteProfileData } from '@/lib/athlete-profile/data-fetcher'
import { calculateAge, getSportDisplayName } from '@/lib/athlete-profile/utils'
import { SportType } from '@prisma/client'

interface ProfileHeroSectionProps {
  data: AthleteProfileData
  viewMode: 'coach' | 'athlete'
  variant?: 'default' | 'glass'
  basePath?: string
}

import {
  GlassCard,
} from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'
import { useLocale } from '@/i18n/client'

export function ProfileHeroSection({ data, viewMode, variant = 'default', basePath = '' }: ProfileHeroSectionProps) {
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const dateLocale = locale === 'sv' ? sv : enUS
  const t = (svText: string, enText: string) => locale === 'sv' ? svText : enText
  const isGlass = variant === 'glass'
  const isAthlete = viewMode === 'athlete'
  const client = data.identity.client!
  const sportProfile = data.identity.sportProfile
  const athleteProfile = data.identity.athleteProfile
  const latestTest = data.physiology.tests[0]
  const latestRace = data.performance.raceResults[0]
  const canEditMetrics = viewMode === 'coach' || isAthlete

  const router = useRouter()

  // State for change sport dialog
  const [showChangeSportDialog, setShowChangeSportDialog] = useState(false)

  // State for birth date dialog
  const [showBirthDateDialog, setShowBirthDateDialog] = useState(false)
  const [birthDateValue, setBirthDateValue] = useState(
    client.birthDate ? new Date(client.birthDate).toISOString().split('T')[0] : ''
  )
  const [birthDateSaving, setBirthDateSaving] = useState(false)
  const [birthDateError, setBirthDateError] = useState('')

  const handleBirthDateSave = async () => {
    setBirthDateError('')
    setBirthDateSaving(true)
    try {
      const res = await fetch('/api/athlete/profile/birthdate', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ birthDate: birthDateValue }),
      })
      const json = await res.json()
      if (!json.success) {
        setBirthDateError(json.error || t('Kunde inte spara', 'Could not save'))
        return
      }
      setShowBirthDateDialog(false)
      router.refresh()
    } catch {
      setBirthDateError(t('Något gick fel', 'Something went wrong'))
    } finally {
      setBirthDateSaving(false)
    }
  }

  // State for body measurements dialog
  const [showBodyDialog, setShowBodyDialog] = useState(false)
  const [bodyHeight, setBodyHeight] = useState(client.height)
  const [bodyWeight, setBodyWeight] = useState(client.weight)
  const [bodySaving, setBodySaving] = useState(false)
  const [bodyError, setBodyError] = useState('')

  const handleBodySave = async () => {
    setBodyError('')
    setBodySaving(true)
    try {
      const res = await fetch(
        isAthlete ? '/api/athlete/profile/body' : `/api/clients/${client.id}/profile-metrics`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ height: bodyHeight, weight: bodyWeight }),
        }
      )
      const json = await res.json()
      if (!json.success) {
        setBodyError(json.error || t('Kunde inte spara', 'Could not save'))
        return
      }
      setShowBodyDialog(false)
      router.refresh()
    } catch {
      setBodyError(t('Något gick fel', 'Something went wrong'))
    } finally {
      setBodySaving(false)
    }
  }

  // State for physiology dialog
  const [showPhysioDialog, setShowPhysioDialog] = useState(false)
  const [physioVo2max, setPhysioVo2max] = useState<number | null>(client.manualVo2max)
  const [physioMaxHR, setPhysioMaxHR] = useState<number | null>(client.manualMaxHR)
  const [physioSaving, setPhysioSaving] = useState(false)
  const [physioError, setPhysioError] = useState('')

  const handlePhysioSave = async () => {
    setPhysioError('')
    setPhysioSaving(true)
    try {
      const res = await fetch(
        isAthlete ? '/api/athlete/profile/physiology' : `/api/clients/${client.id}/profile-metrics`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            manualVo2max: physioVo2max || null,
            manualMaxHR: physioMaxHR || null,
          }),
        }
      )
      const json = await res.json()
      if (!json.success) {
        setPhysioError(json.error || t('Kunde inte spara', 'Could not save'))
        return
      }
      setShowPhysioDialog(false)
      router.refresh()
    } catch {
      setPhysioError(t('Något gick fel', 'Something went wrong'))
    } finally {
      setPhysioSaving(false)
    }
  }

  // Calculate key metrics
  const age = calculateAge(client.birthDate)
  const vo2max = client.manualVo2max || latestTest?.vo2max
  const vo2maxSource = client.manualVo2max ? 'manual' : (latestTest?.vo2max ? 'test' : null)
  const vdot = athleteProfile?.currentVDOT || latestRace?.vdot
  const maxHR = client.manualMaxHR || latestTest?.maxHR
  const maxHRSource = client.manualMaxHR ? 'manual' : (latestTest?.maxHR ? 'test' : null)

  // Calculate VO2max trend data from actual test history
  const vo2maxHistory = data.physiology?.tests
    ? data.physiology.tests
        .filter((t) => t.vo2max !== null && t.status === 'COMPLETED')
        .map((t) => t.vo2max as number)
        .reverse()
    : []
  const vo2maxChartData = [...vo2maxHistory]
  if (client.manualVo2max && (vo2maxChartData.length === 0 || vo2maxChartData[vo2maxChartData.length - 1] !== client.manualVo2max)) {
    vo2maxChartData.push(client.manualVo2max)
  }

  // Calculate training load daily values for the last 7 days. WORKOUT rows
  // only — ACWR_SUMMARY rows duplicate dailyLoad and would double the
  // sparkline.
  const loadHistory = data.training?.trainingLoads
    ? data.training.trainingLoads
        .filter((l) => l.source === 'WORKOUT')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-7)
        .map((l) => l.dailyLoad || 0)
    : []

  // Get initials for avatar
  const initials = client.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  // Sport badge color
  const sportBadgeColor = getSportBadgeColor(sportProfile?.primarySport || '', isGlass)

  const CardWrapper = isGlass ? GlassCard : Card;

  return (
    <CardWrapper className={cn(
      isGlass ? "border-slate-200 bg-white/80 dark:border-white/5 dark:bg-white/5 shadow-sm dark:shadow-none transition-colors" : ""
    )}>
      <CardContent className="p-8">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
          {/* Avatar */}
          <div className="relative group">
            <div className={cn(
              "absolute -inset-1 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000",
              isGlass ? "bg-blue-400 dark:bg-blue-600" : "bg-primary"
            )} />
            <Avatar className="h-24 w-24 text-2xl relative border-2 border-white/10">
              <AvatarFallback className={cn(
                "bg-gradient-to-br text-white font-black",
                isGlass ? "from-slate-700 to-slate-800 dark:from-slate-800 dark:to-slate-900" : "from-blue-500 to-purple-600"
              )}>
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Main Info */}
          <div className="flex-1 min-w-0 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-3">
              <h1 className={cn(
                "text-3xl md:text-5xl font-black tracking-tighter uppercase italic leading-none transition-colors",
                isGlass ? "text-slate-900 dark:text-white" : "text-gray-900"
              )}>
                {client.name}
              </h1>

              {/* Sport Badges */}
              {sportProfile?.primarySport && (
                <div className="flex items-center gap-2">
                  <Badge className={cn("rounded-xl h-7 px-3 text-[10px] font-black uppercase tracking-widest border-0 transition-colors", sportBadgeColor)}>
                    {getSportDisplayName(sportProfile.primarySport, locale)}
                  </Badge>
                  {isAthlete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowChangeSportDialog(true)}
                      className={cn(
                        "h-7 px-2 text-[10px] font-medium gap-1",
                        isGlass ? "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white" : "text-gray-500 hover:text-gray-900"
                      )}
                    >
                      <RefreshCw className="h-3 w-3" />
                      {t('Byt', 'Change')}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Meta Info Row */}
            <div className={cn(
              "flex flex-wrap items-center justify-center md:justify-start gap-4 text-[10px] font-black uppercase tracking-widest mb-6 transition-colors",
              isGlass ? "text-slate-600 dark:text-slate-500" : "text-gray-600"
            )}>
              <span className="inline-flex items-center gap-1">
                <span className={cn(isGlass ? "text-blue-600 dark:text-blue-500" : "font-medium")}>{age}</span> {t('år', 'years')}
                {isAthlete && (
                  <button
                    onClick={() => {
                      setBirthDateValue(
                        client.birthDate ? new Date(client.birthDate).toISOString().split('T')[0] : ''
                      )
                      setBirthDateError('')
                      setShowBirthDateDialog(true)
                    }}
                    className={cn(
                      "inline-flex items-center justify-center rounded-md p-0.5 transition-colors",
                      isGlass ? "text-slate-400 hover:text-slate-900 dark:hover:text-white" : "text-gray-400 hover:text-gray-900"
                    )}
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
              </span>
              <span className="opacity-20">•</span>
              <span className="inline-flex items-center gap-1">
                {client.height} cm / {client.weight} kg
                {canEditMetrics && (
                  <button
                    onClick={() => {
                      setBodyHeight(client.height)
                      setBodyWeight(client.weight)
                      setBodyError('')
                      setShowBodyDialog(true)
                    }}
                    className={cn(
                      "inline-flex items-center justify-center rounded-md p-0.5 transition-colors",
                      isGlass ? "text-slate-400 hover:text-slate-900 dark:hover:text-white" : "text-gray-400 hover:text-gray-900"
                    )}
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
              </span>
              <span className="opacity-20">•</span>
              <span>{client.gender === 'MALE' ? t('Man', 'Male') : t('Kvinna', 'Female')}</span>
              {client.team && (
                <>
                  <span className="opacity-20">•</span>
                  <span className={cn(isGlass ? "text-emerald-600 dark:text-emerald-500" : "")}>{client.team.name}</span>
                </>
              )}
            </div>

            {/* Experience & Category */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              {athleteProfile?.category && (
                <Badge variant="outline" className={cn(
                  "text-[9px] font-black uppercase tracking-widest h-6 rounded-lg transition-colors",
                  isGlass ? "bg-slate-100 border-slate-200 text-slate-500 dark:bg-white/5 dark:border-white/5 dark:text-slate-400" : ""
                )}>
                  {getCategoryLabel(athleteProfile.category, locale)}
                </Badge>
              )}
              {athleteProfile?.yearsRunning && (
                <Badge variant="outline" className={cn(
                  "text-[9px] font-black uppercase tracking-widest h-6 rounded-lg transition-colors",
                  isGlass ? "bg-slate-100 border-slate-200 text-slate-500 dark:bg-white/5 dark:border-white/5 dark:text-slate-400" : ""
                )}>
                  {athleteProfile.yearsRunning} {t('års erfarenhet', 'years experience')}
                </Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {viewMode === 'coach' && (
              <>
                <AIContextButton
                  athleteId={client.id}
                  athleteName={client.name}
                />
                <Link href={`${basePath}/coach/clients/${client.id}/edit`}>
                  <Button variant="outline" size="sm">
                    <Edit2 className="w-4 h-4 mr-2" />
                    {t('Redigera', 'Edit')}
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Key Metrics Row */}
        <div className={cn(
          "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-10 pt-8 transition-colors",
          isGlass ? "border-t border-slate-200 dark:border-white/5" : "border-t"
        )}>
          <MetricCard
            icon={Activity}
            label="VO2max"
            value={vo2max ? `${vo2max.toFixed(1)}` : '-'}
            unit="ml/kg/min"
            subtext={vo2maxSource === 'test' && latestTest ? `${format(new Date(latestTest.testDate), 'd MMM yyyy', { locale: dateLocale })}` : vo2maxSource === 'manual' ? t('Manuellt', 'Manual') : undefined}
            sourceLabel={t('Källa', 'Source')}
            statusLabel={t('Aktiv', 'Active')}
            isGlass={isGlass}
            accentColor="emerald"
            widget={<Sparkline data={vo2maxChartData} color="emerald" />}
            onEdit={canEditMetrics ? () => {
              setPhysioVo2max(client.manualVo2max)
              setPhysioMaxHR(client.manualMaxHR)
              setPhysioError('')
              setShowPhysioDialog(true)
            } : undefined}
          />

          <MetricCard
            icon={Zap}
            label="VDOT"
            value={vdot ? `${vdot.toFixed(1)}` : '-'}
            subtext={vdot ? getVdotLevel(vdot, locale) : undefined}
            sourceLabel={t('Källa', 'Source')}
            statusLabel={t('Aktiv', 'Active')}
            isGlass={isGlass}
            accentColor="blue"
            widget={<VdotProgress vdot={vdot || 0} locale={locale} />}
          />

          <MetricCard
            icon={Heart}
            label={t('Max puls', 'Max HR')}
            value={maxHR ? `${maxHR}` : '-'}
            unit="bpm"
            subtext={maxHRSource === 'manual' ? t('Manuellt', 'Manual') : undefined}
            sourceLabel={t('Källa', 'Source')}
            statusLabel={t('Aktiv', 'Active')}
            isGlass={isGlass}
            accentColor="red"
            widget={<PulseWave />}
            onEdit={canEditMetrics ? () => {
              setPhysioVo2max(client.manualVo2max)
              setPhysioMaxHR(client.manualMaxHR)
              setPhysioError('')
              setShowPhysioDialog(true)
            } : undefined}
          />

          <MetricCard
            icon={Timer}
            label={t('Träning/v', 'Training/w')}
            value={athleteProfile?.typicalWeeklyKm ? `${athleteProfile.typicalWeeklyKm}` : '-'}
            unit="km"
            statusLabel={t('Aktiv', 'Active')}
            isGlass={isGlass}
            accentColor="purple"
            widget={<MiniBarChart data={loadHistory} />}
          />
        </div>

        {/* Latest Test/Race Info */}
        {(latestTest || latestRace) && (
          <div className={cn(
            "flex flex-wrap justify-center md:justify-start gap-6 mt-8 pt-6 text-[9px] font-black uppercase tracking-[0.2em] transition-colors",
            isGlass ? "border-t border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-500" : "border-t text-gray-400"
          )}>
            {latestTest && (
              <span className="flex items-center gap-2">
                <Activity className="h-3 w-3 text-blue-600 dark:text-blue-500" />
                {t('Senaste konditionstest', 'Latest fitness test')}: {format(new Date(latestTest.testDate), 'd MMMM yyyy', { locale: dateLocale })}
              </span>
            )}
            {latestRace && (
              <span className="flex items-center gap-2">
                <Trophy className="h-3 w-3 text-yellow-600 dark:text-yellow-500" />
                {t('Senaste Tävling', 'Latest race')}: {latestRace.raceName || latestRace.distance} ({format(new Date(latestRace.raceDate), 'd MMM yyyy', { locale: dateLocale })})
              </span>
            )}
          </div>
        )}
      </CardContent>

      {/* Change Sport Dialog */}
      {isAthlete && sportProfile && (
        <ChangeSportDialog
          open={showChangeSportDialog}
          onOpenChange={setShowChangeSportDialog}
          clientId={client.id}
          currentSport={sportProfile.primarySport as SportType}
          currentSecondarySports={(sportProfile.secondarySports as SportType[]) || []}
        />
      )}

      {/* Edit Body Measurements Dialog */}
      {canEditMetrics && (
        <Dialog open={showBodyDialog} onOpenChange={setShowBodyDialog}>
          <DialogContent className="sm:max-w-[360px] text-foreground">
            <DialogHeader>
              <DialogTitle className="text-foreground">{t('Uppdatera mått', 'Update measurements')}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="height" className="text-foreground">{t('Längd', 'Height')} (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  min={100}
                  max={250}
                  step={0.1}
                  value={bodyHeight}
                  onChange={(e) => setBodyHeight(parseFloat(e.target.value) || 0)}
                  className="text-foreground"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="weight" className="text-foreground">{t('Vikt', 'Weight')} (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  min={30}
                  max={300}
                  step={0.1}
                  value={bodyWeight}
                  onChange={(e) => setBodyWeight(parseFloat(e.target.value) || 0)}
                  className="text-foreground"
                />
              </div>
              {bodyError && (
                <p className="text-sm text-red-500">{bodyError}</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBodyDialog(false)} className="text-foreground">
                {t('Avbryt', 'Cancel')}
              </Button>
              <Button onClick={handleBodySave} disabled={bodySaving}>
                {bodySaving ? t('Sparar...', 'Saving...') : t('Spara', 'Save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {/* Edit Birth Date Dialog */}
      {isAthlete && (
        <Dialog open={showBirthDateDialog} onOpenChange={setShowBirthDateDialog}>
          <DialogContent className="sm:max-w-[360px] text-foreground">
            <DialogHeader>
              <DialogTitle className="text-foreground">{t('Uppdatera födelsedatum', 'Update birth date')}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="birthdate" className="text-foreground">{t('Födelsedatum', 'Birth date')}</Label>
                <Input
                  id="birthdate"
                  type="date"
                  value={birthDateValue}
                  onChange={(e) => setBirthDateValue(e.target.value)}
                  className="text-foreground"
                />
              </div>
              {birthDateError && (
                <p className="text-sm text-red-500">{birthDateError}</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBirthDateDialog(false)} className="text-foreground">
                {t('Avbryt', 'Cancel')}
              </Button>
              <Button onClick={handleBirthDateSave} disabled={birthDateSaving || !birthDateValue}>
                {birthDateSaving ? t('Sparar...', 'Saving...') : t('Spara', 'Save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {/* Edit Physiology Dialog */}
      {canEditMetrics && (
        <Dialog open={showPhysioDialog} onOpenChange={setShowPhysioDialog}>
          <DialogContent className="sm:max-w-[360px] text-foreground">
            <DialogHeader>
              <DialogTitle className="text-foreground">{t('Uppdatera fysiologiska värden', 'Update physiology values')}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {t('Fyll i aktuella manuella värden när de ändras mellan konditionstester.', 'Enter current manual values when they change between fitness tests.')}
            </p>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="vo2max" className="text-foreground">VO2max (ml/kg/min)</Label>
                <Input
                  id="vo2max"
                  type="number"
                  min={10}
                  max={100}
                  step={0.1}
                  placeholder={t('t.ex. 52.3', 'e.g. 52.3')}
                  value={physioVo2max ?? ''}
                  onChange={(e) => setPhysioVo2max(e.target.value ? parseFloat(e.target.value) : null)}
                  className="text-foreground"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="maxhr" className="text-foreground">{t('Max puls', 'Max HR')} (bpm)</Label>
                <Input
                  id="maxhr"
                  type="number"
                  min={100}
                  max={250}
                  step={1}
                  placeholder={t('t.ex. 195', 'e.g. 195')}
                  value={physioMaxHR ?? ''}
                  onChange={(e) => setPhysioMaxHR(e.target.value ? parseInt(e.target.value) : null)}
                  className="text-foreground"
                />
              </div>
              {physioError && (
                <p className="text-sm text-red-500">{physioError}</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPhysioDialog(false)} className="text-foreground">
                {t('Avbryt', 'Cancel')}
              </Button>
              <Button onClick={handlePhysioSave} disabled={physioSaving}>
                {physioSaving ? t('Sparar...', 'Saving...') : t('Spara', 'Save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </CardWrapper>
  )
}

// Helper component for metric cards
function MetricCard({
  icon: Icon,
  label,
  value,
  unit,
  subtext,
  sourceLabel = 'Source',
  statusLabel = 'Active',
  isGlass = false,
  accentColor = 'blue',
  onEdit,
  widget
}: {
  icon: React.ElementType
  label: string
  value: string
  unit?: string
  subtext?: string
  sourceLabel?: string
  statusLabel?: string
  isGlass?: boolean
  accentColor?: 'blue' | 'emerald' | 'red' | 'purple'
  onEdit?: () => void
  widget?: React.ReactNode
}) {
  const accentClasses = {
    blue: 'text-blue-500 dark:text-blue-400 bg-blue-500/10 border-blue-500/20 shadow-blue-500/10 hover:border-blue-500/30',
    emerald: 'text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/10 hover:border-emerald-500/30',
    red: 'text-red-500 dark:text-red-400 bg-red-500/10 border-red-500/20 shadow-red-500/10 hover:border-red-500/30',
    purple: 'text-purple-500 dark:text-purple-400 bg-purple-500/10 border-purple-500/20 shadow-purple-500/10 hover:border-purple-500/30',
  }

  return (
    <div className={cn(
      "relative flex flex-col p-6 rounded-[2rem] group transition-all duration-300 border min-h-[175px]",
      isGlass
        ? "bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border-slate-200/80 dark:border-white/10 shadow-xl"
        : "bg-white border-gray-100 shadow-md",
      "hover:scale-[1.02] hover:-translate-y-1 hover:shadow-2xl",
      accentColor === 'blue' && 'hover:shadow-blue-500/10',
      accentColor === 'emerald' && 'hover:shadow-emerald-500/10',
      accentColor === 'red' && 'hover:shadow-red-500/10',
      accentColor === 'purple' && 'hover:shadow-purple-500/10'
    )}>
      {/* Top row */}
      <div className="flex items-start justify-between mb-4 w-full">
        {/* Left Side: Status / Circle indicator to balance the header visually */}
        <div className="flex items-center gap-1.5">
          <span className={cn(
            "w-2 h-2 rounded-full",
            accentColor === 'blue' && 'bg-blue-400/80 shadow-[0_0_8px_rgba(59,130,246,0.6)]',
            accentColor === 'emerald' && 'bg-emerald-400/80 shadow-[0_0_8px_rgba(16,185,129,0.6)]',
            accentColor === 'red' && 'bg-red-400/80 shadow-[0_0_8px_rgba(239,68,68,0.6)]',
            accentColor === 'purple' && 'bg-purple-400/80 shadow-[0_0_8px_rgba(168,85,247,0.6)]'
          )} />
          <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{statusLabel}</span>
        </div>

        {/* Right Side: Icon Badge */}
        <div className={cn(
          "w-10 h-10 rounded-2xl flex items-center justify-center border transition-all duration-300 group-hover:scale-110 shadow-sm",
          accentClasses[accentColor].split(' ').slice(0, 3).join(' ')
        )}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {/* Main Info */}
      <div className="w-full mb-3">
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 transition-colors">
          {label}
        </p>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white leading-none transition-colors">
            {value}
          </span>
          {unit && (
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {unit}
            </span>
          )}
        </div>
      </div>

      {/* Visualization Widget */}
      {widget && (
        <div className="w-full py-2 my-1 border-t border-slate-100/50 dark:border-white/5">
          {widget}
        </div>
      )}

      {/* Edit Trigger */}
      {onEdit && (
        <button
          onClick={onEdit}
          className="absolute top-4 right-14 p-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity bg-slate-100 dark:bg-white/10 text-slate-500 hover:text-slate-950 dark:text-slate-455 hover:bg-slate-200 dark:hover:bg-white/20 shadow-sm"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Bottom Subtext */}
      {subtext && (
        <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-auto pt-2 border-t border-slate-100/30 dark:border-white/5 w-full flex items-center justify-between">
          <span>{sourceLabel}</span>
          <span className="text-slate-700 dark:text-slate-400 normal-case font-medium">{subtext}</span>
        </div>
      )}
    </div>
  )
}

// Helper functions
function getSportBadgeColor(sport: string, isGlass: boolean = false): string {
  if (isGlass) {
    const colors: Record<string, string> = {
      RUNNING: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
      CYCLING: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
      SWIMMING: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400',
      TRIATHLON: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
      HYROX: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
      SKIING: 'bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
      GENERAL_FITNESS: 'bg-slate-100 text-slate-700 dark:bg-slate-500/10 dark:text-slate-400',
      STRENGTH: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
    }
    return colors[sport] || 'bg-white/5 text-slate-400'
  }

  const colors: Record<string, string> = {
    RUNNING: 'bg-green-100 text-green-800 border-green-200',
    CYCLING: 'bg-blue-100 text-blue-800 border-blue-200',
    SWIMMING: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    TRIATHLON: 'bg-purple-100 text-purple-800 border-purple-200',
    HYROX: 'bg-orange-100 text-orange-800 border-orange-200',
    SKIING: 'bg-sky-100 text-sky-800 border-sky-200',
    GENERAL_FITNESS: 'bg-gray-100 text-gray-800 border-gray-200',
    STRENGTH: 'bg-red-100 text-red-800 border-red-200',
  }
  return colors[sport] || 'bg-gray-100 text-gray-800'
}

function getCategoryLabel(category: string, locale: 'en' | 'sv'): string {
  const labels: Record<'en' | 'sv', Record<string, string>> = {
    en: {
      BEGINNER: 'Beginner',
      RECREATIONAL: 'Recreational',
      ADVANCED: 'Advanced',
      ELITE: 'Elite',
    },
    sv: {
      BEGINNER: 'Nybörjare',
      RECREATIONAL: 'Motionär',
      ADVANCED: 'Avancerad',
      ELITE: 'Elit',
    },
  }
  return labels[locale][category] || category
}

function getVdotLevel(vdot: number, locale: 'en' | 'sv'): string {
  const t = (svText: string, enText: string) => locale === 'sv' ? svText : enText
  if (vdot >= 70) return t('Världsklass', 'World class')
  if (vdot >= 60) return t('Elit', 'Elite')
  if (vdot >= 50) return t('Avancerad', 'Advanced')
  if (vdot >= 40) return t('Mellanstadie', 'Intermediate')
  if (vdot >= 30) return t('Motionär', 'Recreational')
  return t('Nybörjare', 'Beginner')
}

// Sparkline visualization for VO2max
function Sparkline({ data, color = 'emerald' }: { data: number[]; color?: string }) {
  const accentColors: Record<string, string> = {
    emerald: 'text-emerald-500 dark:text-emerald-400',
    blue: 'text-blue-500 dark:text-blue-400',
    red: 'text-red-500 dark:text-red-400',
    purple: 'text-purple-500 dark:text-purple-400',
  }
  
  const strokeColor = accentColors[color] || 'text-slate-500'

  if (data.length < 2) {
    // Elegant fallback trend path if there is insufficient historical data
    return (
      <svg className={cn("w-full h-8 overflow-visible opacity-30", strokeColor)} viewBox="0 0 120 30">
        <path
          d="M 5 22 Q 30 15 50 18 T 95 10 T 115 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
      </svg>
    )
  }
  
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min === 0 ? 1 : max - min
  const width = 120
  const height = 30
  const padding = 2
  
  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * (width - padding * 2) + padding
    const y = height - ((val - min) / range) * (height - padding * 2) - padding
    return { x, y }
  })
  
  let path = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i]
    const p1 = points[i + 1]
    const cpX1 = p0.x + (p1.x - p0.x) / 3
    const cpY1 = p0.y
    const cpX2 = p0.x + (2 * (p1.x - p0.x)) / 3
    const cpY2 = p1.y
    path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`
  }
  
  const areaPath = `${path} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`
  const gradId = `sparkline-grad-${color}`

  return (
    <svg className={cn("w-full h-8 overflow-visible", strokeColor)} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// VDOT progress bar mapped relative to target bounds
function VdotProgress({ vdot, locale }: { vdot: number; locale: 'en' | 'sv' }) {
  const t = (svText: string, enText: string) => locale === 'sv' ? svText : enText
  const percentage = Math.min(Math.max(((vdot - 30) / (70 - 30)) * 100, 0), 100)
  return (
    <div className="w-full px-1 mt-2">
      <div className="flex justify-between text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
        <span>{t('Nybörjare', 'Beginner')}</span>
        <span>{t('Elit', 'Elite')}</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden p-[1px]">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-blue-400 dark:to-indigo-400 rounded-full transition-all duration-500 shadow-[0_0_6px_rgba(59,130,246,0.4)]"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

// ECG animated pulse wave for Heart Rate
function PulseWave() {
  return (
    <div className="w-full h-8 flex items-center justify-center overflow-hidden">
      <svg className="w-full h-full text-red-500 dark:text-red-400 overflow-visible" viewBox="0 0 120 30">
        <path
          d="M 0 15 L 30 15 L 36 2 L 42 28 L 47 11 L 51 18 L 56 15 L 120 15"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-80 dark:opacity-100 drop-shadow-[0_0_3px_rgba(239,68,68,0.4)] animate-pulse"
        />
      </svg>
    </div>
  )
}

// Weekly training volume columns
function MiniBarChart({ data }: { data: number[] }) {
  const bars = data.length > 0 ? data : [15, 35, 25, 55, 40, 48, 30]
  const max = Math.max(...bars)
  const scaled = bars.map(v => (max > 0 ? (v / max) * 100 : 20))
  return (
    <div className="flex items-end justify-between h-8 w-full px-2 mt-1 gap-1">
      {scaled.map((height, idx) => (
        <div
          key={idx}
          className="w-1.5 bg-gradient-to-t from-purple-500 to-fuchsia-500 dark:from-purple-400 dark:to-fuchsia-400 rounded-full transition-all duration-300 hover:scale-y-110 shadow-[0_0_3px_rgba(168,85,247,0.15)]"
          style={{ height: `${Math.max(height, 15)}%` }}
        />
      ))}
    </div>
  )
}
