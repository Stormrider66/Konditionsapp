'use client'

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
]

interface SportSelectorProps {
  selectedSport: SportType | null
  onSelect: (sport: SportType) => void
}

export function SportSelector({ selectedSport, onSelect }: SportSelectorProps) {
  const locale = getAppLocale(useLocale())
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">{t(locale, 'Välj sport', 'Choose sport')}</h2>
        <p className="text-muted-foreground">
          {t(locale, 'Vilken typ av träningsprogram vill du skapa?', 'What type of training program do you want to create?')}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {sports.map((sport) => {
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
