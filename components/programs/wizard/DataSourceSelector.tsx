'use client'

import { SportType } from '@prisma/client'
import { useLocale } from 'next-intl'
import { cn } from '@/lib/utils'
import { FlaskConical, User, PenLine, Check, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export type DataSourceType = 'TEST' | 'PROFILE' | 'MANUAL'

export interface DataSourceInfo {
  type: DataSourceType
  available: boolean
  testCount?: number
  testId?: string
  profileValue?: string
  profileLabel?: string
}

interface DataSourceSelectorProps {
  sport: SportType
  selectedSource: DataSourceType | null
  onSelect: (source: DataSourceType) => void
  dataSources: DataSourceInfo[]
}

type AppLocale = 'en' | 'sv'

const getAppLocale = (locale: string): AppLocale => (locale === 'sv' ? 'sv' : 'en')

const t = (locale: AppLocale, sv: string, en: string) => (locale === 'sv' ? sv : en)

export function DataSourceSelector({
  sport,
  selectedSource,
  onSelect,
  dataSources,
}: DataSourceSelectorProps) {
  const locale = getAppLocale(useLocale())
  const getSourceInfo = (type: DataSourceType) => {
    return dataSources.find((d) => d.type === type) || { type, available: false }
  }

  const testSource = getSourceInfo('TEST')
  const profileSource = getSourceInfo('PROFILE')
  const isHockey = sport === 'TEAM_ICE_HOCKEY'

  const sportLabels: Record<string, { value: Record<AppLocale, string>; unit: string }> = {
    RUNNING: { value: { en: 'VDOT', sv: 'VDOT' }, unit: '' },
    CYCLING: { value: { en: 'FTP', sv: 'FTP' }, unit: 'W' },
    SKIING: { value: { en: 'Threshold', sv: 'Tröskel' }, unit: '' },
    SWIMMING: { value: { en: 'CSS', sv: 'CSS' }, unit: '/100m' },
    TRIATHLON: { value: { en: 'Multi', sv: 'Multi' }, unit: '' },
    HYROX: { value: { en: 'Zones', sv: 'Zoner' }, unit: '' },
    GENERAL_FITNESS: { value: { en: 'Level', sv: 'Nivå' }, unit: '' },
    STRENGTH: { value: { en: 'Level', sv: 'Nivå' }, unit: '' },
    TEAM_FOOTBALL: { value: { en: 'Profile', sv: 'Profil' }, unit: '' },
    TEAM_ICE_HOCKEY: { value: { en: 'Profile', sv: 'Profil' }, unit: '' },
    TEAM_BASKETBALL: { value: { en: 'Role', sv: 'Roll' }, unit: '' },
    TEAM_HANDBALL: { value: { en: 'Position', sv: 'Position' }, unit: '' },
    TEAM_FLOORBALL: { value: { en: 'Position', sv: 'Position' }, unit: '' },
    TEAM_VOLLEYBALL: { value: { en: 'Position', sv: 'Position' }, unit: '' },
    TENNIS: { value: { en: 'Style', sv: 'Stil' }, unit: '' },
    PADEL: { value: { en: 'Side', sv: 'Sida' }, unit: '' },
  }

  const metric = sportLabels[sport] || { value: { en: 'Value', sv: 'Värde' }, unit: '' }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">{t(locale, 'Datakälla', 'Data source')}</h2>
        <p className="text-muted-foreground">
          {t(locale, 'Hur ska vi beräkna träningszoner och intensitet?', 'How should training zones and intensity be calculated?')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Lab Test Option */}
        <button
          onClick={() => testSource.available && onSelect('TEST')}
          disabled={!testSource.available}
          className={cn(
            'flex flex-col items-center p-6 rounded-xl border-2 transition-all duration-200',
            selectedSource === 'TEST'
              ? 'border-primary bg-primary/10 ring-2 ring-primary ring-offset-2'
              : testSource.available
                ? 'border-slate-200 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm hover:border-primary/50 hover:bg-white/60 dark:hover:bg-slate-800/60'
                : 'border-slate-200 dark:border-white/5 bg-slate-100/50 dark:bg-slate-900/20 cursor-not-allowed opacity-60',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
          )}
        >
          <div
            className={cn(
              'w-14 h-14 rounded-full flex items-center justify-center mb-4',
              testSource.available ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
            )}
          >
            <FlaskConical className="w-7 h-7" />
          </div>
          <span className="font-semibold text-lg text-slate-900 dark:text-white">
            {isHockey ? t(locale, 'Hockeytester', 'Hockey tests') : t(locale, 'Labtest', 'Lab test')}
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-400 mt-1 text-center">
            {isHockey
              ? t(locale, 'Använd is-sprint, 5-10-5, 7x40, styrka, power och aerob profil', 'Use ice sprints, 5-10-5, 7x40, strength, power, and aerobic profile')
              : t(locale, 'Använd befintligt konditionstest med träningszoner', 'Use an existing fitness test with training zones')}
          </span>
          <div className="mt-4 flex items-center gap-2">
            {testSource.available ? (
              <>
                <Check className="w-4 h-4 text-green-600" />
                <Badge variant="secondary">
                  {testSource.testCount} {isHockey
                    ? t(locale, 'hockeytester', 'hockey tests')
                    : t(locale, 'test tillgängliga', 'tests available')}
                </Badge>
              </>
            ) : (
              <>
                <X className="w-4 h-4 text-red-500" />
                <span className="text-xs text-slate-500 dark:text-slate-400">{t(locale, 'Inga tester', 'No tests')}</span>
              </>
            )}
          </div>
        </button>

        {/* Sport Profile Option */}
        <button
          onClick={() => profileSource.available && onSelect('PROFILE')}
          disabled={!profileSource.available}
          className={cn(
            'flex flex-col items-center p-6 rounded-xl border-2 transition-all duration-200',
            selectedSource === 'PROFILE'
              ? 'border-primary bg-primary/10 ring-2 ring-primary ring-offset-2'
              : profileSource.available
                ? 'border-slate-200 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm hover:border-primary/50 hover:bg-white/60 dark:hover:bg-slate-800/60'
                : 'border-slate-200 dark:border-white/5 bg-slate-100/50 dark:bg-slate-900/20 cursor-not-allowed opacity-60',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
          )}
        >
          <div
            className={cn(
              'w-14 h-14 rounded-full flex items-center justify-center mb-4',
              profileSource.available ? 'bg-purple-100 text-purple-600' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
            )}
          >
            <User className="w-7 h-7" />
          </div>
          <span className="font-semibold text-lg text-slate-900 dark:text-white">{t(locale, 'Sportprofil', 'Sport profile')}</span>
          <span className="text-sm text-slate-500 dark:text-slate-400 mt-1 text-center">
            {t(locale, 'Använd sparade värden från atletens profil', "Use saved values from the athlete's profile")}
          </span>
          <div className="mt-4 flex items-center gap-2">
            {profileSource.available ? (
              <>
                <Check className="w-4 h-4 text-green-600" />
                <Badge variant="secondary">
                  {profileSource.profileLabel}: {profileSource.profileValue}
                  {metric.unit}
                </Badge>
              </>
            ) : (
              <>
                <X className="w-4 h-4 text-red-500" />
                <span className="text-xs text-slate-500 dark:text-slate-400">{t(locale, 'Ingen profil', 'No profile')}</span>
              </>
            )}
          </div>
        </button>

        {/* Manual Input Option */}
        <button
          onClick={() => onSelect('MANUAL')}
          className={cn(
            'flex flex-col items-center p-6 rounded-xl border-2 transition-all duration-200',
            selectedSource === 'MANUAL'
              ? 'border-primary bg-primary/10 ring-2 ring-primary ring-offset-2'
              : 'border-slate-200 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm hover:border-primary/50 hover:bg-white/60 dark:hover:bg-slate-800/60',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
          )}
        >
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 bg-green-100 text-green-600">
            <PenLine className="w-7 h-7" />
          </div>
          <span className="font-semibold text-lg text-slate-900 dark:text-white">{t(locale, 'Manuellt', 'Manual')}</span>
          <span className="text-sm text-slate-500 dark:text-slate-400 mt-1 text-center">
            {t(locale, 'Ange värden direkt i formuläret', 'Enter values directly in the form')}
          </span>
          <div className="mt-4 flex items-center gap-2">
            <Check className="w-4 h-4 text-green-600" />
            <Badge variant="secondary">{t(locale, 'Alltid tillgänglig', 'Always available')}</Badge>
          </div>
        </button>
      </div>
    </div>
  )
}
