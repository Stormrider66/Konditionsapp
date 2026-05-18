'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SportType } from '@prisma/client'
import { useLocale, useTranslations } from '@/i18n/client'

interface SportOption {
  value: SportType
  icon: string
  color: string
}

const SPORT_OPTIONS: SportOption[] = [
  {
    value: 'RUNNING',
    icon: '🏃',
    color: 'bg-green-500/10 border-green-500/20 hover:border-green-500/40',
  },
  {
    value: 'CYCLING',
    icon: '🚴',
    color: 'bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40',
  },
  {
    value: 'SKIING',
    icon: '⛷️',
    color: 'bg-cyan-500/10 border-cyan-500/20 hover:border-cyan-500/40',
  },
  {
    value: 'TRIATHLON',
    icon: '🏊',
    color: 'bg-purple-500/10 border-purple-500/20 hover:border-purple-500/40',
  },
  {
    value: 'HYROX',
    icon: '💪',
    color: 'bg-orange-500/10 border-orange-500/20 hover:border-orange-500/40',
  },
  {
    value: 'GENERAL_FITNESS',
    icon: '🏋️',
    color: 'bg-red-500/10 border-red-500/20 hover:border-red-500/40',
  },
  {
    value: 'FUNCTIONAL_FITNESS',
    icon: '🔥',
    color: 'bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40',
  },
  {
    value: 'SWIMMING',
    icon: '🏊‍♂️',
    color: 'bg-sky-500/10 border-sky-500/20 hover:border-sky-500/40',
  },
  {
    value: 'TEAM_ICE_HOCKEY',
    icon: '🏒',
    color: 'bg-slate-500/10 border-slate-500/20 hover:border-slate-500/40',
  },
  {
    value: 'TEAM_FOOTBALL',
    icon: '⚽',
    color: 'bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40',
  },
  {
    value: 'TEAM_HANDBALL',
    icon: '🤾',
    color: 'bg-yellow-500/10 border-yellow-500/20 hover:border-yellow-500/40',
  },
  {
    value: 'TEAM_FLOORBALL',
    icon: '🏑',
    color: 'bg-lime-500/10 border-lime-500/20 hover:border-lime-500/40',
  },
  {
    value: 'TEAM_BASKETBALL',
    icon: '🏀',
    color: 'bg-orange-500/10 border-orange-500/20 hover:border-orange-500/40',
  },
  {
    value: 'TEAM_VOLLEYBALL',
    icon: '🏐',
    color: 'bg-indigo-500/10 border-indigo-500/20 hover:border-indigo-500/40',
  },
  {
    value: 'TENNIS',
    icon: '🎾',
    color: 'bg-green-500/10 border-green-500/20 hover:border-green-500/40',
  },
  {
    value: 'PADEL',
    icon: '🎾',
    color: 'bg-yellow-500/10 border-yellow-500/20 hover:border-yellow-500/40',
  },
  {
    value: 'NUTRITION',
    icon: '🥗',
    color: 'bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40',
  },
]

interface SportSelectorProps {
  value?: SportType
  onChange: (sport: SportType) => void
  showFeatures?: boolean
  className?: string
}

export function SportSelector({
  value,
  onChange,
  showFeatures = true,
  className,
}: SportSelectorProps) {
  const [selected, setSelected] = useState<SportType | undefined>(value)
  const t = useTranslations('components.sportSelector')
  const locale = useLocale()
  const localeKey = locale === 'en' ? 'en' : 'sv'

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
                  {t(`selected.${localeKey}`)}
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg">
              {t(`sports.${sport.value}.label.${localeKey}`)}
            </CardTitle>
            <CardDescription className="text-sm">
              {t(`sports.${sport.value}.description.${localeKey}`)}
            </CardDescription>
          </CardHeader>
          {showFeatures && (
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-1">
                {(['feature1', 'feature2', 'feature3'] as const).map((featureKey) => (
                  <Badge key={featureKey} variant="secondary" className="text-xs">
                    {t(`sports.${sport.value}.features.${featureKey}.${localeKey}`)}
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
  maxSelections?: number
  excludeSports?: SportType[]
  className?: string
}

export function MultiSportSelector({
  value = [],
  onChange,
  maxSelections = 3,
  excludeSports = [],
  className,
}: MultiSportSelectorProps) {
  const [selected, setSelected] = useState<SportType[]>(value)
  const t = useTranslations('components.sportSelector')
  const locale = useLocale()
  const localeKey = locale === 'en' ? 'en' : 'sv'

  const handleToggle = (sport: SportType) => {
    let newSelection: SportType[]
    if (selected.includes(sport)) {
      newSelection = selected.filter((s) => s !== sport)
    } else if (selected.length < maxSelections) {
      newSelection = [...selected, sport]
    } else {
      return
    }
    setSelected(newSelection)
    onChange(newSelection)
  }

  const availableSports = SPORT_OPTIONS.filter(
    (sport) => !excludeSports.includes(sport.value)
  )

  return (
    <div className={cn('space-y-4', className)}>
      <p className="text-sm text-muted-foreground">
        {t(`secondarySelectionLimit.${localeKey}`, {
          max: maxSelections,
          count: selected.length,
        })}
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
              {t(`sports.${sport.value}.label.${localeKey}`)}
            </span>
          </Button>
        ))}
      </div>
    </div>
  )
}

export { SPORT_OPTIONS }
export type { SportOption }
