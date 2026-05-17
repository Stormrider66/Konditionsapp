'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { ChevronDown, Check } from 'lucide-react'
import { SportType } from '@prisma/client'
import { cn } from '@/lib/utils'
import { useTranslations } from '@/i18n/client'

const SPORT_ICONS: Record<string, string> = {
  RUNNING: '🏃',
  CYCLING: '🚴',
  SKIING: '⛷️',
  TRIATHLON: '🏊',
  HYROX: '💪',
  GENERAL_FITNESS: '🏋️',
  FUNCTIONAL_FITNESS: '🔥',
  SWIMMING: '🏊‍♂️',
  TEAM_ICE_HOCKEY: '🏒',
  TEAM_FOOTBALL: '⚽',
  TEAM_HANDBALL: '🤾',
  TEAM_FLOORBALL: '🏑',
  TEAM_BASKETBALL: '🏀',
  TEAM_VOLLEYBALL: '🏐',
  TENNIS: '🎾',
  PADEL: '🎾',
}

// Cookie name for storing active sport
const ACTIVE_SPORT_COOKIE = 'activeSport'

interface SportSwitcherProps {
  primarySport: SportType
  secondarySports: SportType[]
  className?: string
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}

function setCookie(name: string, value: string, days: number = 365) {
  if (typeof document === 'undefined') return
  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/`
}

export function SportSwitcher({ primarySport, secondarySports, className }: SportSwitcherProps) {
  const router = useRouter()
  const t = useTranslations('components.sportSwitcher')

  // All available sports for this athlete - memoized to prevent re-renders
  const allSports = useMemo(
    () => [primarySport, ...secondarySports],
    [primarySport, secondarySports]
  )
  const [activeSport, setActiveSport] = useState<SportType>(() => {
    const savedSport = getCookie(ACTIVE_SPORT_COOKIE) as SportType | null
    return savedSport && allSports.includes(savedSport) ? savedSport : primarySport
  })
  const [isOpen, setIsOpen] = useState(false)
  const displaySport = allSports.includes(activeSport) ? activeSport : primarySport

  // Keep the cookie valid for this athlete's available sports.
  useEffect(() => {
    const savedSport = getCookie(ACTIVE_SPORT_COOKIE) as SportType | null
    if (!savedSport || !allSports.includes(savedSport)) {
      setCookie(ACTIVE_SPORT_COOKIE, primarySport)
    }
  }, [primarySport, allSports])

  const handleSportChange = (sport: SportType) => {
    setActiveSport(sport)
    setCookie(ACTIVE_SPORT_COOKIE, sport)
    setIsOpen(false)
    // Refresh the page to reload with new sport dashboard
    router.refresh()
  }

  // Don't render if only one sport
  if (allSports.length <= 1) {
    return null
  }

  const currentSportIcon = SPORT_ICONS[displaySport]

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "flex items-center gap-2 h-9 px-3 text-slate-300 hover:text-white hover:bg-white/10 transition-all",
            className
          )}
        >
          <span className="text-lg">{currentSportIcon}</span>
          <span className="text-sm font-medium hidden sm:inline">{getSportLabel(displaySport, t)}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 bg-slate-950 border-white/10 text-slate-200"
        align="start"
      >
        <DropdownMenuLabel className="text-slate-400 text-xs uppercase tracking-wider">
          {t('switchSport')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        {allSports.map((sport) => {
          const icon = SPORT_ICONS[sport]
          const isActive = sport === displaySport
          const isPrimary = sport === primarySport
          return (
            <DropdownMenuItem
              key={sport}
              onClick={() => handleSportChange(sport)}
              className={cn(
                "flex items-center gap-3 cursor-pointer",
                isActive
                  ? "bg-orange-500/20 text-white"
                  : "focus:bg-white/10 focus:text-white"
              )}
            >
              <span className="text-lg">{icon}</span>
              <span className="flex-1">{getSportLabel(sport, t)}</span>
              {isPrimary && (
                <span className="text-[10px] text-slate-500 uppercase">{t('primary')}</span>
              )}
              {isActive && (
                <Check className="h-4 w-4 text-orange-500" />
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function getSportLabel(sport: SportType, t: (key: string) => string): string {
  switch (sport) {
    case 'RUNNING':
      return t('sports.running')
    case 'CYCLING':
      return t('sports.cycling')
    case 'SKIING':
      return t('sports.skiing')
    case 'TRIATHLON':
      return t('sports.triathlon')
    case 'HYROX':
      return t('sports.hyrox')
    case 'GENERAL_FITNESS':
      return t('sports.generalFitness')
    case 'FUNCTIONAL_FITNESS':
      return t('sports.functionalFitness')
    case 'SWIMMING':
      return t('sports.swimming')
    case 'TEAM_ICE_HOCKEY':
      return t('sports.iceHockey')
    case 'TEAM_FOOTBALL':
      return t('sports.football')
    case 'TEAM_HANDBALL':
      return t('sports.handball')
    case 'TEAM_FLOORBALL':
      return t('sports.floorball')
    case 'TEAM_BASKETBALL':
      return t('sports.basketball')
    case 'TEAM_VOLLEYBALL':
      return t('sports.volleyball')
    case 'TENNIS':
      return t('sports.tennis')
    case 'PADEL':
      return t('sports.padel')
    default:
      return sport
  }
}

// Export cookie utilities for use in server components
export { ACTIVE_SPORT_COOKIE, getCookie, setCookie }
