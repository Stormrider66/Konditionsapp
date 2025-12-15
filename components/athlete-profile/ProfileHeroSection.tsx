'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { Edit2, Activity, Zap, Heart, Timer } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { AIContextButton } from '@/components/ai-studio/AIContextButton'
import type { AthleteProfileData } from '@/lib/athlete-profile/data-fetcher'
import { calculateAge, getSportDisplayName } from '@/lib/athlete-profile/data-fetcher'

interface ProfileHeroSectionProps {
  data: AthleteProfileData
  viewMode: 'coach' | 'athlete'
}

export function ProfileHeroSection({ data, viewMode }: ProfileHeroSectionProps) {
  const client = data.identity.client!
  const sportProfile = data.identity.sportProfile
  const athleteProfile = data.identity.athleteProfile
  const latestTest = data.physiology.tests[0]
  const latestRace = data.performance.raceResults[0]

  // Calculate key metrics
  const age = calculateAge(client.birthDate)
  const vo2max = latestTest?.vo2max
  const vdot = athleteProfile?.currentVDOT || latestRace?.vdot
  const maxHR = latestTest?.maxHR

  // Get initials for avatar
  const initials = client.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  // Sport badge color
  const sportBadgeColor = getSportBadgeColor(sportProfile?.primarySport || '')

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row items-start gap-6">
          {/* Avatar */}
          <Avatar className="h-20 w-20 text-2xl">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Main Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 truncate">
                {client.name}
              </h1>

              {/* Sport Badges */}
              {sportProfile?.primarySport && (
                <Badge className={sportBadgeColor}>
                  {getSportDisplayName(sportProfile.primarySport)}
                </Badge>
              )}
              {sportProfile?.secondarySports?.map((sport) => (
                <Badge key={sport} variant="outline" className="text-xs">
                  {getSportDisplayName(sport)}
                </Badge>
              ))}
            </div>

            {/* Meta Info Row */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
              <span className="flex items-center gap-1">
                <span className="font-medium">{age}</span> år
              </span>
              <span className="text-gray-300">•</span>
              <span>
                {client.height} cm / {client.weight} kg
              </span>
              <span className="text-gray-300">•</span>
              <span>{client.gender === 'MALE' ? 'Man' : 'Kvinna'}</span>
              {client.team && (
                <>
                  <span className="text-gray-300">•</span>
                  <span>{client.team.name}</span>
                </>
              )}
            </div>

            {/* Experience & Category */}
            <div className="flex flex-wrap items-center gap-2">
              {athleteProfile?.category && (
                <Badge variant="secondary" className="text-xs">
                  {getCategoryLabel(athleteProfile.category)}
                </Badge>
              )}
              {sportProfile?.runningExperience && sportProfile.primarySport === 'RUNNING' && (
                <Badge variant="outline" className="text-xs">
                  {getExperienceLabel(sportProfile.runningExperience)}
                </Badge>
              )}
              {sportProfile?.cyclingExperience && sportProfile.primarySport === 'CYCLING' && (
                <Badge variant="outline" className="text-xs">
                  {getExperienceLabel(sportProfile.cyclingExperience)}
                </Badge>
              )}
              {athleteProfile?.yearsRunning && (
                <Badge variant="outline" className="text-xs">
                  {athleteProfile.yearsRunning} års erfarenhet
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
                <Link href={`/clients/${client.id}/edit`}>
                  <Button variant="outline" size="sm">
                    <Edit2 className="w-4 h-4 mr-2" />
                    Redigera
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
          <MetricCard
            icon={Activity}
            label="VO2max"
            value={vo2max ? `${vo2max.toFixed(1)}` : '-'}
            unit="ml/kg/min"
            subtext={latestTest ? `Testad ${format(new Date(latestTest.testDate), 'd MMM yyyy', { locale: sv })}` : undefined}
          />

          <MetricCard
            icon={Zap}
            label="VDOT"
            value={vdot ? `${vdot.toFixed(1)}` : '-'}
            subtext={vdot ? getVdotLevel(vdot) : undefined}
          />

          <MetricCard
            icon={Heart}
            label="Max puls"
            value={maxHR ? `${maxHR}` : '-'}
            unit="bpm"
          />

          <MetricCard
            icon={Timer}
            label="Träning/vecka"
            value={athleteProfile?.typicalWeeklyKm ? `${athleteProfile.typicalWeeklyKm}` : '-'}
            unit="km"
          />
        </div>

        {/* Latest Test/Race Info */}
        {(latestTest || latestRace) && (
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t text-sm text-gray-500">
            {latestTest && (
              <span>
                Senaste test: {format(new Date(latestTest.testDate), 'd MMMM yyyy', { locale: sv })}
              </span>
            )}
            {latestRace && (
              <span>
                Senaste tävling: {latestRace.raceName || latestRace.distance} ({format(new Date(latestRace.raceDate), 'd MMM yyyy', { locale: sv })})
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Helper component for metric cards
function MetricCard({
  icon: Icon,
  label,
  value,
  unit,
  subtext,
}: {
  icon: React.ElementType
  label: string
  value: string
  unit?: string
  subtext?: string
}) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-1">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="flex items-baseline justify-center gap-1">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {unit && <span className="text-sm text-gray-500">{unit}</span>}
      </div>
      {subtext && (
        <div className="text-xs text-gray-400 mt-1">{subtext}</div>
      )}
    </div>
  )
}

// Helper functions
function getSportBadgeColor(sport: string): string {
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

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    BEGINNER: 'Nybörjare',
    RECREATIONAL: 'Motionär',
    ADVANCED: 'Avancerad',
    ELITE: 'Elit',
  }
  return labels[category] || category
}

function getExperienceLabel(experience: string): string {
  const labels: Record<string, string> = {
    BEGINNER: 'Nybörjare',
    INTERMEDIATE: 'Mellanstadie',
    ADVANCED: 'Avancerad',
    ELITE: 'Elit',
  }
  return labels[experience] || experience
}

function getVdotLevel(vdot: number): string {
  if (vdot >= 70) return 'Världsklass'
  if (vdot >= 60) return 'Elit'
  if (vdot >= 50) return 'Avancerad'
  if (vdot >= 40) return 'Mellanstadie'
  if (vdot >= 30) return 'Motionär'
  return 'Nybörjare'
}
