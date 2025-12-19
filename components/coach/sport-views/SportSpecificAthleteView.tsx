'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME } from '@/lib/themes'
import { HYROXAthleteView } from './HYROXAthleteView'
import { CyclingAthleteView } from './CyclingAthleteView'
import { GeneralFitnessAthleteView } from './GeneralFitnessAthleteView'
import { TriathlonAthleteView } from './TriathlonAthleteView'
import { SkiingAthleteView } from './SkiingAthleteView'
import { SwimmingAthleteView } from './SwimmingAthleteView'

const SPORT_DISPLAY: Record<string, { icon: string; label: string }> = {
  RUNNING: { icon: '🏃', label: 'Löpning' },
  CYCLING: { icon: '🚴', label: 'Cykling' },
  SKIING: { icon: '⛷️', label: 'Längdskidåkning' },
  TRIATHLON: { icon: '🏊', label: 'Triathlon' },
  HYROX: { icon: '💪', label: 'HYROX' },
  GENERAL_FITNESS: { icon: '🏋️', label: 'Allmän Fitness' },
  SWIMMING: { icon: '🏊‍♂️', label: 'Simning' },
}

interface SportProfile {
  id: string
  primarySport: string
  secondarySports: string[]
  cyclingSettings?: Record<string, unknown>
  skiingSettings?: Record<string, unknown>
  swimmingSettings?: Record<string, unknown>
  triathlonSettings?: Record<string, unknown>
  hyroxSettings?: Record<string, unknown>
  generalFitnessSettings?: Record<string, unknown>
}

interface SportSpecificAthleteViewProps {
  clientId: string
  clientName: string
  sportProfile: SportProfile | null
}

export function SportSpecificAthleteView({
  clientId,
  clientName,
  sportProfile,
}: SportSpecificAthleteViewProps) {
  const themeContext = useWorkoutThemeOptional();
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME;

  if (!sportProfile) {
    return (
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader>
          <CardTitle style={{ color: theme.colors.textPrimary }}>Sportprofil</CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>Atletens träningsinriktning</CardDescription>
        </CardHeader>
        <CardContent>
          <p style={{ color: theme.colors.textMuted }}>
            Denna atlet har inte slutfört sin sportprofil ännu.
          </p>
        </CardContent>
      </Card>
    )
  }

  const primarySport = sportProfile.primarySport
  const sportDisplay = SPORT_DISPLAY[primarySport]

  const renderSportView = () => {
    switch (primarySport) {
      case 'HYROX':
        return (
          <HYROXAthleteView
            clientId={clientId}
            clientName={clientName}
            settings={sportProfile.hyroxSettings}
          />
        )
      case 'CYCLING':
        return (
          <CyclingAthleteView
            clientId={clientId}
            clientName={clientName}
            settings={sportProfile.cyclingSettings}
          />
        )
      case 'GENERAL_FITNESS':
        return (
          <GeneralFitnessAthleteView
            clientId={clientId}
            clientName={clientName}
            settings={sportProfile.generalFitnessSettings}
          />
        )
      case 'TRIATHLON':
        return (
          <TriathlonAthleteView
            clientId={clientId}
            clientName={clientName}
            settings={sportProfile.triathlonSettings}
          />
        )
      case 'SKIING':
        return (
          <SkiingAthleteView
            clientId={clientId}
            clientName={clientName}
            settings={sportProfile.skiingSettings}
          />
        )
      case 'SWIMMING':
        return (
          <SwimmingAthleteView
            clientId={clientId}
            clientName={clientName}
            settings={sportProfile.swimmingSettings}
          />
        )
      case 'RUNNING':
        // Running athletes use the default test/zone view
        return (
          <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{sportDisplay?.icon}</span>
                <div>
                  <CardTitle style={{ color: theme.colors.textPrimary }}>{sportDisplay?.label}</CardTitle>
                  <CardDescription style={{ color: theme.colors.textMuted }}>Löparens testdata visas nedan</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm" style={{ color: theme.colors.textMuted }}>
                Se testhistorik och träningszoner nedan för fullständig löparanalys.
              </p>
            </CardContent>
          </Card>
        )
      default:
        return (
          <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
            <CardHeader>
              <CardTitle style={{ color: theme.colors.textPrimary }}>Sportprofil</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{sportDisplay?.icon}</span>
                <span className="font-medium" style={{ color: theme.colors.textPrimary }}>{sportDisplay?.label}</span>
              </div>
              <p className="text-sm" style={{ color: theme.colors.textMuted }}>
                Detaljerad vy för denna sport kommer snart.
              </p>
            </CardContent>
          </Card>
        )
    }
  }

  return (
    <div className="space-y-4">
      {/* Sport badge header */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="default" className="text-sm px-3 py-1">
          {sportDisplay?.icon} {sportDisplay?.label}
        </Badge>
        {sportProfile.secondarySports?.length > 0 && (
          <>
            {sportProfile.secondarySports.map((sport) => {
              const display = SPORT_DISPLAY[sport]
              return (
                <Badge key={sport} variant="secondary" className="text-sm px-3 py-1">
                  {display?.icon} {display?.label}
                </Badge>
              )
            })}
          </>
        )}
      </div>

      {/* Sport-specific view */}
      {renderSportView()}
    </div>
  )
}
