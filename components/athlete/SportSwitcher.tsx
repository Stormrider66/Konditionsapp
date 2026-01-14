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

const SPORT_INFO: Record<string, { icon: string; label: string }> = {
  RUNNING: { icon: '🏃', label: 'Löpning' },
  CYCLING: { icon: '🚴', label: 'Cykling' },
  SKIING: { icon: '⛷️', label: 'Längdskidåkning' },
  TRIATHLON: { icon: '🏊', label: 'Triathlon' },
  HYROX: { icon: '💪', label: 'HYROX' },
  GENERAL_FITNESS: { icon: '🏋️', label: 'Allmän Fitness' },
  FUNCTIONAL_FITNESS: { icon: '🔥', label: 'Funktionell Fitness' },
  SWIMMING: { icon: '🏊‍♂️', label: 'Simning' },
  TEAM_ICE_HOCKEY: { icon: '🏒', label: 'Ishockey' },
  TEAM_FOOTBALL: { icon: '⚽', label: 'Fotboll' },
  TEAM_HANDBALL: { icon: '🤾', label: 'Handboll' },
  TEAM_FLOORBALL: { icon: '🏑', label: 'Innebandy' },
  TEAM_BASKETBALL: { icon: '🏀', label: 'Basket' },
  TEAM_VOLLEYBALL: { icon: '🏐', label: 'Volleyboll' },
  TENNIS: { icon: '🎾', label: 'Tennis' },
  PADEL: { icon: '🎾', label: 'Padel' },
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
  const [activeSport, setActiveSport] = useState<SportType>(primarySport)
  const [isOpen, setIsOpen] = useState(false)

  // All available sports for this athlete - memoized to prevent re-renders
  const allSports = useMemo(
    () => [primarySport, ...secondarySports],
    [primarySport, secondarySports]
  )

  // Load active sport from cookie on mount
  useEffect(() => {
    const savedSport = getCookie(ACTIVE_SPORT_COOKIE) as SportType | null
    if (savedSport && allSports.includes(savedSport)) {
      setActiveSport(savedSport)
    } else {
      // If no valid cookie, set to primary sport
      setActiveSport(primarySport)
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

  const currentSportInfo = SPORT_INFO[activeSport]

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
          <span className="text-lg">{currentSportInfo?.icon}</span>
          <span className="text-sm font-medium hidden sm:inline">{currentSportInfo?.label}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 bg-slate-950 border-white/10 text-slate-200"
        align="start"
      >
        <DropdownMenuLabel className="text-slate-400 text-xs uppercase tracking-wider">
          Byt sport
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        {allSports.map((sport) => {
          const info = SPORT_INFO[sport]
          const isActive = sport === activeSport
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
              <span className="text-lg">{info?.icon}</span>
              <span className="flex-1">{info?.label}</span>
              {isPrimary && (
                <span className="text-[10px] text-slate-500 uppercase">Huvud</span>
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

// Export cookie utilities for use in server components
export { ACTIVE_SPORT_COOKIE, getCookie, setCookie }
