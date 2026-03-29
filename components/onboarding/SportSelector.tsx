'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SportType } from '@prisma/client'

interface SportOption {
  value: SportType
  label: string
  labelSv: string
  description: string
  descriptionSv: string
  icon: string
  color: string
  features: string[]
}

const SPORT_OPTIONS: SportOption[] = [
  {
    value: 'RUNNING',
    label: 'Running',
    labelSv: 'Löpning',
    description: 'Road, trail, and track running with pace-based training',
    descriptionSv: 'Väg-, terräng- och banlöpning med tempobaserad träning',
    icon: '🏃',
    color: 'bg-green-500/10 border-green-500/20 hover:border-green-500/40',
    features: ['Pace zones', 'Race predictions', 'Running economy'],
  },
  {
    value: 'CYCLING',
    label: 'Cycling',
    labelSv: 'Cykling',
    description: 'Road, indoor, and MTB cycling with power-based training',
    descriptionSv: 'Landsvägs-, inomhus- och MTB-cykling med wattbaserad träning',
    icon: '🚴',
    color: 'bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40',
    features: ['FTP zones', 'Power metrics', 'Indoor/Outdoor'],
  },
  {
    value: 'SKIING',
    label: 'Cross-Country Skiing',
    labelSv: 'Längdskidåkning',
    description: 'Classic and skate technique training for nordic skiing',
    descriptionSv: 'Klassisk och skateteknik för längdskidåkning',
    icon: '⛷️',
    color: 'bg-cyan-500/10 border-cyan-500/20 hover:border-cyan-500/40',
    features: ['Classic/Skate', 'Vasaloppet prep', 'Technique focus'],
  },
  {
    value: 'TRIATHLON',
    label: 'Triathlon',
    labelSv: 'Triathlon',
    description: 'Swim, bike, run training for multi-sport events',
    descriptionSv: 'Simning, cykling, löpning för multisportevenemang',
    icon: '🏊',
    color: 'bg-purple-500/10 border-purple-500/20 hover:border-purple-500/40',
    features: ['3 sports', 'Brick workouts', 'Race transitions'],
  },
  {
    value: 'HYROX',
    label: 'HYROX',
    labelSv: 'HYROX',
    description: 'Functional fitness racing with 8 stations',
    descriptionSv: 'Funktionell fitness-racing med 8 stationer',
    icon: '💪',
    color: 'bg-orange-500/10 border-orange-500/20 hover:border-orange-500/40',
    features: ['8 stations', 'Compromised running', 'Race simulation'],
  },
  {
    value: 'GENERAL_FITNESS',
    label: 'General Fitness',
    labelSv: 'Allmän Fitness',
    description: 'CrossFit-style workouts: EMOMs, AMRAPs, mixed training',
    descriptionSv: 'CrossFit-liknande pass: EMOM, AMRAP, blandad träning',
    icon: '🏋️',
    color: 'bg-red-500/10 border-red-500/20 hover:border-red-500/40',
    features: ['EMOMs', 'AMRAPs', 'For Time'],
  },
  {
    value: 'FUNCTIONAL_FITNESS',
    label: 'Functional Fitness',
    labelSv: 'Funktionell Fitness',
    description: 'CrossFit-style training with benchmarks, gymnastics, and olympic lifting',
    descriptionSv: 'CrossFit-liknande träning med benchmarks, gymnastik och olympiska lyft',
    icon: '🔥',
    color: 'bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40',
    features: ['Benchmarks', 'Gymnastics', 'Olympic Lifting'],
  },
  {
    value: 'SWIMMING',
    label: 'Swimming',
    labelSv: 'Simning',
    description: 'Pool and open water swimming with CSS-based training',
    descriptionSv: 'Pool och öppet vatten med CSS-baserad träning',
    icon: '🏊‍♂️',
    color: 'bg-sky-500/10 border-sky-500/20 hover:border-sky-500/40',
    features: ['CSS zones', 'Stroke drills', 'Open water'],
  },
  {
    value: 'TEAM_ICE_HOCKEY',
    label: 'Ice Hockey',
    labelSv: 'Ishockey',
    description: 'Position-specific training for ice hockey players',
    descriptionSv: 'Positionsspecifik träning för ishockeyspelare',
    icon: '🏒',
    color: 'bg-slate-500/10 border-slate-500/20 hover:border-slate-500/40',
    features: ['Position training', 'Season periodization', 'Match schedule'],
  },
  {
    value: 'TEAM_FOOTBALL',
    label: 'Football',
    labelSv: 'Fotboll',
    description: 'Football training with GPS integration',
    descriptionSv: 'Fotbollsträning med GPS-integration',
    icon: '⚽',
    color: 'bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40',
    features: ['GPS data', 'Match load', 'Position training'],
  },
  {
    value: 'TEAM_HANDBALL',
    label: 'Handball',
    labelSv: 'Handboll',
    description: 'Handball training with match periodization',
    descriptionSv: 'Handbollsträning med matchperiodisering',
    icon: '🤾',
    color: 'bg-yellow-500/10 border-yellow-500/20 hover:border-yellow-500/40',
    features: ['Match schedule', 'Jump training', 'Throwing power'],
  },
  {
    value: 'TEAM_FLOORBALL',
    label: 'Floorball',
    labelSv: 'Innebandy',
    description: 'Floorball training with interval focus',
    descriptionSv: 'Innebandyträning med intervallfokus',
    icon: '🏑',
    color: 'bg-lime-500/10 border-lime-500/20 hover:border-lime-500/40',
    features: ['Sprint intervals', 'Stick skills', 'Match prep'],
  },
  {
    value: 'TEAM_BASKETBALL',
    label: 'Basketball',
    labelSv: 'Basket',
    description: 'Basketball training with position-specific focus',
    descriptionSv: 'Basketträning med positionsspecifikt fokus',
    icon: '🏀',
    color: 'bg-orange-500/10 border-orange-500/20 hover:border-orange-500/40',
    features: ['Jump training', 'Agility', 'Court coverage'],
  },
  {
    value: 'TEAM_VOLLEYBALL',
    label: 'Volleyball',
    labelSv: 'Volleyboll',
    description: 'Volleyball training with position specialization',
    descriptionSv: 'Volleybollträning med positionsspecialisering',
    icon: '🏐',
    color: 'bg-indigo-500/10 border-indigo-500/20 hover:border-indigo-500/40',
    features: ['Vertical jump', 'Reaction time', 'Spike power'],
  },
  {
    value: 'TENNIS',
    label: 'Tennis',
    labelSv: 'Tennis',
    description: 'Tennis training with play style optimization',
    descriptionSv: 'Tennisträning med spelstilsoptimering',
    icon: '🎾',
    color: 'bg-green-500/10 border-green-500/20 hover:border-green-500/40',
    features: ['Play styles', 'Surface training', 'Tournament prep'],
  },
  {
    value: 'PADEL',
    label: 'Padel',
    labelSv: 'Padel',
    description: 'Padel training with position and partner synergy',
    descriptionSv: 'Padelträning med positions- och partnersynergi',
    icon: '🎾',
    color: 'bg-yellow-500/10 border-yellow-500/20 hover:border-yellow-500/40',
    features: ['Court positions', 'Partner play', 'Smash power'],
  },
  {
    value: 'NUTRITION',
    label: 'Nutrition',
    labelSv: 'Kost & Nutrition',
    description: 'Focus on nutrition tracking, meal planning, and body composition goals',
    descriptionSv: 'Fokusera på kostuppföljning, måltidsplanering och kroppssammansättningsmål',
    icon: '🥗',
    color: 'bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40',
    features: ['Makrospårning', 'AI-matanalys', 'Måluppföljning'],
  },
]

interface SportSelectorProps {
  value?: SportType
  onChange: (sport: SportType) => void
  locale?: 'en' | 'sv'
  showFeatures?: boolean
  className?: string
}

export function SportSelector({
  value,
  onChange,
  locale = 'sv',
  showFeatures = true,
  className,
}: SportSelectorProps) {
  const [selected, setSelected] = useState<SportType | undefined>(value)

  const handleSelect = (sport: SportType) => {
    setSelected(sport)
    onChange(sport)
  }

  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {SPORT_OPTIONS.map((sport) => (
        <Card
          key={sport.value}
          className={cn(
            'cursor-pointer transition-all duration-200 border-2',
            sport.color,
            selected === sport.value && 'ring-2 ring-primary ring-offset-2'
          )}
          onClick={() => handleSelect(sport.value)}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-3xl">{sport.icon}</span>
              {selected === sport.value && (
                <Badge variant="default" className="text-xs">
                  {locale === 'sv' ? 'Vald' : 'Selected'}
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg">
              {locale === 'sv' ? sport.labelSv : sport.label}
            </CardTitle>
            <CardDescription className="text-sm">
              {locale === 'sv' ? sport.descriptionSv : sport.description}
            </CardDescription>
          </CardHeader>
          {showFeatures && (
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-1">
                {sport.features.map((feature) => (
                  <Badge key={feature} variant="secondary" className="text-xs">
                    {feature}
                  </Badge>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  )
}

interface MultiSportSelectorProps {
  value?: SportType[]
  onChange: (sports: SportType[]) => void
  locale?: 'en' | 'sv'
  maxSelections?: number
  excludeSports?: SportType[]
  className?: string
}

export function MultiSportSelector({
  value = [],
  onChange,
  locale = 'sv',
  maxSelections = 3,
  excludeSports = [],
  className,
}: MultiSportSelectorProps) {
  const [selected, setSelected] = useState<SportType[]>(value)

  const handleToggle = (sport: SportType) => {
    let newSelection: SportType[]
    if (selected.includes(sport)) {
      newSelection = selected.filter((s) => s !== sport)
    } else if (selected.length < maxSelections) {
      newSelection = [...selected, sport]
    } else {
      return // Max reached
    }
    setSelected(newSelection)
    onChange(newSelection)
  }

  // Filter out excluded sports
  const availableSports = SPORT_OPTIONS.filter(
    (sport) => !excludeSports.includes(sport.value)
  )

  return (
    <div className={cn('space-y-4', className)}>
      <p className="text-sm text-muted-foreground">
        {locale === 'sv'
          ? `Välj upp till ${maxSelections} sekundära sporter (${selected.length}/${maxSelections})`
          : `Select up to ${maxSelections} secondary sports (${selected.length}/${maxSelections})`}
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {availableSports.map((sport) => (
          <Button
            key={sport.value}
            variant={selected.includes(sport.value) ? 'default' : 'outline'}
            className={cn(
              'h-auto py-3 justify-start gap-2',
              selected.includes(sport.value) && 'bg-primary'
            )}
            onClick={() => handleToggle(sport.value)}
            disabled={!selected.includes(sport.value) && selected.length >= maxSelections}
          >
            <span className="text-lg">{sport.icon}</span>
            <span className="text-sm">
              {locale === 'sv' ? sport.labelSv : sport.label}
            </span>
          </Button>
        ))}
      </div>
    </div>
  )
}

// Export sport options for use in other components
export { SPORT_OPTIONS }
export type { SportOption }
