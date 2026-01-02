'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { Edit2, Activity, Zap, Heart, Timer, Trophy } from 'lucide-react'
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
  variant?: 'default' | 'glass'
}

import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
  GlassCardDescription
} from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'

export function ProfileHeroSection({ data, viewMode, variant = 'default' }: ProfileHeroSectionProps) {
  const isGlass = variant === 'glass'
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
  const sportBadgeColor = getSportBadgeColor(sportProfile?.primarySport || '', isGlass)

  const CardWrapper = isGlass ? GlassCard : Card;

  return (
    <CardWrapper className={cn(isGlass ? "border-white/5 bg-white/5" : "")}>
      <CardContent className="p-8">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
          {/* Avatar */}
          <div className="relative group">
            <div className={cn(
              "absolute -inset-1 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000",
              isGlass ? "bg-blue-600" : "bg-primary"
            )} />
            <Avatar className="h-24 w-24 text-2xl relative border-2 border-white/10">
              <AvatarFallback className={cn(
                "bg-gradient-to-br text-white font-black",
                isGlass ? "from-slate-800 to-slate-900" : "from-blue-500 to-purple-600"
              )}>
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Main Info */}
          <div className="flex-1 min-w-0 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-3">
              <h1 className={cn(
                "text-3xl md:text-5xl font-black tracking-tighter uppercase italic leading-none",
                isGlass ? "text-white" : "text-gray-900"
              )}>
                {client.name}
              </h1>

              {/* Sport Badges */}
              {sportProfile?.primarySport && (
                <Badge className={cn("rounded-xl h-7 px-3 text-[10px] font-black uppercase tracking-widest border-0", sportBadgeColor)}>
                  {getSportDisplayName(sportProfile.primarySport)}
                </Badge>
              )}
            </div>

            {/* Meta Info Row */}
            <div className={cn(
              "flex flex-wrap items-center justify-center md:justify-start gap-4 text-[10px] font-black uppercase tracking-widest mb-6",
              isGlass ? "text-slate-500" : "text-gray-600"
            )}>
              <span className="flex items-center gap-1">
                <span className={cn(isGlass ? "text-blue-500" : "font-medium")}>{age}</span> år
              </span>
              <span className="opacity-20">•</span>
              <span>
                {client.height} cm / {client.weight} kg
              </span>
              <span className="opacity-20">•</span>
              <span>{client.gender === 'MALE' ? 'Man' : 'Kvinna'}</span>
              {client.team && (
                <>
                  <span className="opacity-20">•</span>
                  <span className={cn(isGlass ? "text-emerald-500" : "")}>{client.team.name}</span>
                </>
              )}
            </div>

            {/* Experience & Category */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              {athleteProfile?.category && (
                <Badge variant="outline" className={cn(
                  "text-[9px] font-black uppercase tracking-widest h-6 rounded-lg",
                  isGlass ? "bg-white/5 border-white/5 text-slate-400" : ""
                )}>
                  {getCategoryLabel(athleteProfile.category)}
                </Badge>
              )}
              {athleteProfile?.yearsRunning && (
                <Badge variant="outline" className={cn(
                  "text-[9px] font-black uppercase tracking-widest h-6 rounded-lg",
                  isGlass ? "bg-white/5 border-white/5 text-slate-400" : ""
                )}>
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
        <div className={cn(
          "grid grid-cols-2 lg:grid-cols-4 gap-8 mt-10 pt-8",
          isGlass ? "border-t border-white/5" : "border-t"
        )}>
          <MetricCard
            icon={Activity}
            label="VO2max"
            value={vo2max ? `${vo2max.toFixed(1)}` : '-'}
            unit="ml/kg/min"
            subtext={latestTest ? `${format(new Date(latestTest.testDate), 'd MMM yyyy', { locale: sv })}` : undefined}
            isGlass={isGlass}
            accentColor="emerald"
          />

          <MetricCard
            icon={Zap}
            label="VDOT"
            value={vdot ? `${vdot.toFixed(1)}` : '-'}
            subtext={vdot ? getVdotLevel(vdot) : undefined}
            isGlass={isGlass}
            accentColor="blue"
          />

          <MetricCard
            icon={Heart}
            label="Max puls"
            value={maxHR ? `${maxHR}` : '-'}
            unit="bpm"
            isGlass={isGlass}
            accentColor="red"
          />

          <MetricCard
            icon={Timer}
            label="Träning/v"
            value={athleteProfile?.typicalWeeklyKm ? `${athleteProfile.typicalWeeklyKm}` : '-'}
            unit="km"
            isGlass={isGlass}
            accentColor="purple"
          />
        </div>

        {/* Latest Test/Race Info */}
        {(latestTest || latestRace) && (
          <div className={cn(
            "flex flex-wrap justify-center md:justify-start gap-6 mt-8 pt-6 text-[9px] font-black uppercase tracking-[0.2em]",
            isGlass ? "border-t border-white/5 text-slate-600" : "border-t text-gray-400"
          )}>
            {latestTest && (
              <span className="flex items-center gap-2">
                <Activity className="h-3 w-3 text-blue-500" />
                Senaste konditionstest: {format(new Date(latestTest.testDate), 'd MMMM yyyy', { locale: sv })}
              </span>
            )}
            {latestRace && (
              <span className="flex items-center gap-2">
                <Trophy className="h-3 w-3 text-yellow-500" />
                Senaste Tävling: {latestRace.raceName || latestRace.distance} ({format(new Date(latestRace.raceDate), 'd MMM yyyy', { locale: sv })})
              </span>
            )}
          </div>
        )}
      </CardContent>
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
  isGlass = false,
  accentColor = 'blue'
}: {
  icon: React.ElementType
  label: string
  value: string
  unit?: string
  subtext?: string
  isGlass?: boolean
  accentColor?: 'blue' | 'emerald' | 'red' | 'purple'
}) {
  const accentClasses = {
    blue: 'text-blue-500 bg-blue-500/10',
    emerald: 'text-emerald-500 bg-emerald-500/10',
    red: 'text-red-500 bg-red-500/10',
    purple: 'text-purple-500 bg-purple-500/10',
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-3xl bg-white/[0.02] border border-white/5 group hover:bg-white/5 transition-all">
      <div className={cn(
        "w-10 h-10 rounded-2xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110",
        accentClasses[accentColor]
      )}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{label}</p>
      <div className="flex items-baseline justify-center gap-1 mb-1">
        <span className={cn(
          "text-2xl font-black uppercase italic tracking-tighter",
          isGlass ? "text-white" : "text-gray-900"
        )}>{value}</span>
        {unit && <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{unit}</span>}
      </div>
      {subtext && (
        <div className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{subtext}</div>
      )}
    </div>
  )
}

// Helper functions
function getSportBadgeColor(sport: string, isGlass: boolean = false): string {
  if (isGlass) {
    const colors: Record<string, string> = {
      RUNNING: 'bg-emerald-500/10 text-emerald-400',
      CYCLING: 'bg-blue-500/10 text-blue-400',
      SWIMMING: 'bg-cyan-500/10 text-cyan-400',
      TRIATHLON: 'bg-purple-500/10 text-purple-400',
      HYROX: 'bg-orange-500/10 text-orange-400',
      SKIING: 'bg-sky-500/10 text-sky-400',
      GENERAL_FITNESS: 'bg-slate-500/10 text-slate-400',
      STRENGTH: 'bg-red-500/10 text-red-400',
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
