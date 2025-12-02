'use client'

import { SportType } from '@prisma/client'
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

export function DataSourceSelector({
  sport,
  selectedSource,
  onSelect,
  dataSources,
}: DataSourceSelectorProps) {
  const getSourceInfo = (type: DataSourceType) => {
    return dataSources.find((d) => d.type === type) || { type, available: false }
  }

  const testSource = getSourceInfo('TEST')
  const profileSource = getSourceInfo('PROFILE')
  const manualSource = getSourceInfo('MANUAL')

  const sportLabels: Record<string, { value: string; unit: string }> = {
    RUNNING: { value: 'VDOT', unit: '' },
    CYCLING: { value: 'FTP', unit: 'W' },
    SKIING: { value: 'Tröskel', unit: '' },
    SWIMMING: { value: 'CSS', unit: '/100m' },
    TRIATHLON: { value: 'Multi', unit: '' },
    HYROX: { value: 'Zoner', unit: '' },
    GENERAL_FITNESS: { value: 'Nivå', unit: '' },
    STRENGTH: { value: 'Nivå', unit: '' },
  }

  const metric = sportLabels[sport] || { value: 'Värde', unit: '' }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Datakälla</h2>
        <p className="text-muted-foreground">
          Hur ska vi beräkna träningszoner och intensitet?
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
              ? 'border-primary bg-primary/5 ring-2 ring-primary ring-offset-2'
              : testSource.available
              ? 'border-muted bg-card hover:border-primary/50 hover:bg-muted/50'
              : 'border-muted bg-muted/30 cursor-not-allowed opacity-60',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
          )}
        >
          <div
            className={cn(
              'w-14 h-14 rounded-full flex items-center justify-center mb-4',
              testSource.available ? 'bg-blue-100 text-blue-600' : 'bg-muted text-muted-foreground'
            )}
          >
            <FlaskConical className="w-7 h-7" />
          </div>
          <span className="font-semibold text-lg">Labtest</span>
          <span className="text-sm text-muted-foreground mt-1 text-center">
            Använd befintligt konditionstest med träningszoner
          </span>
          <div className="mt-4 flex items-center gap-2">
            {testSource.available ? (
              <>
                <Check className="w-4 h-4 text-green-600" />
                <Badge variant="secondary">
                  {testSource.testCount} test tillgängliga
                </Badge>
              </>
            ) : (
              <>
                <X className="w-4 h-4 text-red-500" />
                <span className="text-xs text-muted-foreground">Inga tester</span>
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
              ? 'border-primary bg-primary/5 ring-2 ring-primary ring-offset-2'
              : profileSource.available
              ? 'border-muted bg-card hover:border-primary/50 hover:bg-muted/50'
              : 'border-muted bg-muted/30 cursor-not-allowed opacity-60',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
          )}
        >
          <div
            className={cn(
              'w-14 h-14 rounded-full flex items-center justify-center mb-4',
              profileSource.available ? 'bg-purple-100 text-purple-600' : 'bg-muted text-muted-foreground'
            )}
          >
            <User className="w-7 h-7" />
          </div>
          <span className="font-semibold text-lg">Sportprofil</span>
          <span className="text-sm text-muted-foreground mt-1 text-center">
            Använd sparade värden från atletens profil
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
                <span className="text-xs text-muted-foreground">Ingen profil</span>
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
              ? 'border-primary bg-primary/5 ring-2 ring-primary ring-offset-2'
              : 'border-muted bg-card hover:border-primary/50 hover:bg-muted/50',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
          )}
        >
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 bg-green-100 text-green-600">
            <PenLine className="w-7 h-7" />
          </div>
          <span className="font-semibold text-lg">Manuellt</span>
          <span className="text-sm text-muted-foreground mt-1 text-center">
            Ange värden direkt i formuläret
          </span>
          <div className="mt-4 flex items-center gap-2">
            <Check className="w-4 h-4 text-green-600" />
            <Badge variant="secondary">Alltid tillgänglig</Badge>
          </div>
        </button>
      </div>
    </div>
  )
}
