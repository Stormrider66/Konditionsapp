'use client'

import { useState } from 'react'
import { SportType } from '@prisma/client'
import { useLocale } from 'next-intl'
import { cn } from '@/lib/utils'

interface Sport {
  id: SportType
  icon: string
  label: Record<AppLocale, string>
  description: Record<AppLocale, string>
  color: string
}

type AppLocale = 'en' | 'sv'

const getAppLocale = (locale: string): AppLocale => (locale === 'sv' ? 'sv' : 'en')

const t = (locale: AppLocale, sv: string, en: string) => (locale === 'sv' ? sv : en)

const sports: Sport[] = [
  {
    id: 'RUNNING',
    icon: '🏃',
    label: { en: 'Running', sv: 'Löpning' },
    description: { en: 'Marathon, half, 10K, 5K', sv: 'Marathon, halv, 10K, 5K' },
    color: 'hover:border-orange-500 hover:bg-orange-50',
  },
  {
    id: 'CYCLING',
    icon: '🚴',
    label: { en: 'Cycling', sv: 'Cykling' },
    description: { en: 'FTP-based programs', sv: 'FTP-baserade program' },
    color: 'hover:border-blue-500 hover:bg-blue-50',
  },
  {
    id: 'STRENGTH',
    icon: '💪',
    label: { en: 'Strength', sv: 'Styrka' },
    description: { en: 'Periodized strength training', sv: 'Periodiserad styrketräning' },
    color: 'hover:border-red-500 hover:bg-red-50',
  },
  {
    id: 'SKIING',
    icon: '⛷️',
    label: { en: 'Skiing', sv: 'Skidåkning' },
    description: { en: 'Classic & skating', sv: 'Klassisk & skating' },
    color: 'hover:border-sky-500 hover:bg-sky-50',
  },
  {
    id: 'SWIMMING',
    icon: '🏊',
    label: { en: 'Swimming', sv: 'Simning' },
    description: { en: 'CSS-based zones', sv: 'CSS-baserade zoner' },
    color: 'hover:border-cyan-500 hover:bg-cyan-50',
  },
  {
    id: 'TRIATHLON',
    icon: '🏅',
    label: { en: 'Triathlon', sv: 'Triathlon' },
    description: { en: 'Swim, bike & run', sv: 'Sim, cykel & löpning' },
    color: 'hover:border-purple-500 hover:bg-purple-50',
  },
  {
    id: 'HYROX',
    icon: '🏋️',
    label: { en: 'HYROX', sv: 'HYROX' },
    description: { en: 'Running + functional fitness', sv: 'Löpning + funktionell träning' },
    color: 'hover:border-yellow-500 hover:bg-yellow-50',
  },
  {
    id: 'GENERAL_FITNESS',
    icon: '🎯',
    label: { en: 'General Fitness', sv: 'Allmän Fitness' },
    description: { en: '6 goal-based programs', sv: '6 målbaserade program' },
    color: 'hover:border-green-500 hover:bg-green-50',
  },
  {
    id: 'TEAM_ICE_HOCKEY',
    icon: '🏒',
    label: { en: 'Ice Hockey', sv: 'Ishockey' },
    description: { en: 'Position and season-aware', sv: 'Position och säsongsfas' },
    color: 'hover:border-blue-500 hover:bg-blue-50',
  },
  {
    id: 'TEAM_FOOTBALL',
    icon: '⚽',
    label: { en: 'Football', sv: 'Fotboll' },
    description: { en: 'Match-week planning', sv: 'Matchveckoplanering' },
    color: 'hover:border-emerald-500 hover:bg-emerald-50',
  },
  {
    id: 'TEAM_BASKETBALL',
    icon: '🏀',
    label: { en: 'Basketball', sv: 'Basket' },
    description: { en: 'Court speed and jumps', sv: 'Court speed och hopp' },
    color: 'hover:border-orange-500 hover:bg-orange-50',
  },
  {
    id: 'TEAM_HANDBALL',
    icon: '🤾',
    label: { en: 'Handball', sv: 'Handboll' },
    description: { en: 'Power, contact, throws', sv: 'Power, kontakt, kast' },
    color: 'hover:border-rose-500 hover:bg-rose-50',
  },
  {
    id: 'TEAM_FLOORBALL',
    icon: '🏑',
    label: { en: 'Floorball', sv: 'Innebandy' },
    description: { en: 'Shift fitness and agility', sv: 'Byteskondition och agility' },
    color: 'hover:border-lime-500 hover:bg-lime-50',
  },
  {
    id: 'TEAM_VOLLEYBALL',
    icon: '🏐',
    label: { en: 'Volleyball', sv: 'Volleyboll' },
    description: { en: 'Jump power and shoulders', sv: 'Hoppkraft och axlar' },
    color: 'hover:border-pink-500 hover:bg-pink-50',
  },
  {
    id: 'TENNIS',
    icon: '🎾',
    label: { en: 'Tennis', sv: 'Tennis' },
    description: { en: 'Footwork and match play', sv: 'Fotarbete och matchspel' },
    color: 'hover:border-teal-500 hover:bg-teal-50',
  },
  {
    id: 'PADEL',
    icon: '🏓',
    label: { en: 'Padel', sv: 'Padel' },
    description: { en: 'Walls, rotation, reactions', sv: 'Väggspel, rotation, reaktion' },
    color: 'hover:border-fuchsia-500 hover:bg-fuchsia-50',
  },
]

interface SportSelectorProps {
  selectedSport: SportType | null
  onSelect: (sport: SportType) => void
  teams?: Array<{
    id: string
    name: string
    sportType?: SportType | null
  }>
}

export function SportSelector({ selectedSport, onSelect, teams = [] }: SportSelectorProps) {
  const locale = getAppLocale(useLocale())
  const [showAllSports, setShowAllSports] = useState(false)
  const hockeyTeam = teams.find((team) => team.sportType === 'TEAM_ICE_HOCKEY')
  const recommendedSportIds: SportType[] = hockeyTeam
    ? ['TEAM_ICE_HOCKEY', 'STRENGTH']
    : []
  const recommendedSports = recommendedSportIds
    .map((sportId) => sports.find((sport) => sport.id === sportId))
    .filter((sport): sport is Sport => Boolean(sport))
  const visibleSports = hockeyTeam && !showAllSports
    ? recommendedSports
    : sports

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">{t(locale, 'Välj sport', 'Choose sport')}</h2>
        <p className="text-muted-foreground">
          {t(locale, 'Vilken typ av träningsprogram vill du skapa?', 'What type of training program do you want to create?')}
        </p>
      </div>

      {hockeyTeam && (
        <div className="rounded-lg border bg-muted/20 p-4 text-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-slate-900 dark:text-white">
                {t(locale, 'Hockeylag upptäckt', 'Hockey team detected')}: {hockeyTeam.name}
              </p>
              <p className="mt-1 text-muted-foreground">
                {t(
                  locale,
                  'Guiden prioriterar hockeyprogram och styrkeblock. Hockeyspecifik kondition väljs som mål i nästa steg.',
                  'The wizard prioritizes hockey programs and strength blocks. Hockey-specific conditioning is chosen as a goal in the next step.'
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAllSports((value) => !value)}
              className="w-fit rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-background"
            >
              {showAllSports
                ? t(locale, 'Visa rekommenderade', 'Show recommended')
                : t(locale, 'Visa alla sporter', 'Show all sports')}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {visibleSports.map((sport) => {
          const isSelected = selectedSport === sport.id
          return (
            // ...
            <button
              key={sport.id}
              onClick={() => onSelect(sport.id)}
              className={cn(
                'flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-200',
                'min-h-[140px]',
                isSelected
                  ? 'border-primary bg-primary/10 ring-2 ring-primary ring-offset-2'
                  : `border-slate-200 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm ${sport.color}`,
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
              )}
            >
              <span className="text-4xl mb-3">{sport.icon}</span>
              <span className="font-semibold text-lg text-slate-900 dark:text-white">{sport.label[locale]}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-center">
                {sport.description[locale]}
              </span>
            </button>
            // ...
          )
        })}
      </div>
    </div>
  )
}
