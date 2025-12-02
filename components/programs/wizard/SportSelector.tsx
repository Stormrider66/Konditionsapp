'use client'

import { SportType } from '@prisma/client'
import { cn } from '@/lib/utils'

interface Sport {
  id: SportType
  icon: string
  label: string
  description: string
  color: string
}

const sports: Sport[] = [
  {
    id: 'RUNNING',
    icon: '🏃',
    label: 'Löpning',
    description: 'Marathon, halv, 10K, 5K',
    color: 'hover:border-orange-500 hover:bg-orange-50',
  },
  {
    id: 'CYCLING',
    icon: '🚴',
    label: 'Cykling',
    description: 'FTP-baserade program',
    color: 'hover:border-blue-500 hover:bg-blue-50',
  },
  {
    id: 'STRENGTH',
    icon: '💪',
    label: 'Styrka',
    description: 'Periodiserad styrketräning',
    color: 'hover:border-red-500 hover:bg-red-50',
  },
  {
    id: 'SKIING',
    icon: '⛷️',
    label: 'Skidåkning',
    description: 'Klassisk & skating',
    color: 'hover:border-sky-500 hover:bg-sky-50',
  },
  {
    id: 'SWIMMING',
    icon: '🏊',
    label: 'Simning',
    description: 'CSS-baserade zoner',
    color: 'hover:border-cyan-500 hover:bg-cyan-50',
  },
  {
    id: 'TRIATHLON',
    icon: '🏅',
    label: 'Triathlon',
    description: 'Sim, cykel & löpning',
    color: 'hover:border-purple-500 hover:bg-purple-50',
  },
  {
    id: 'HYROX',
    icon: '🏋️',
    label: 'HYROX',
    description: 'Löpning + funktionell träning',
    color: 'hover:border-yellow-500 hover:bg-yellow-50',
  },
  {
    id: 'GENERAL_FITNESS',
    icon: '🎯',
    label: 'Allmän Fitness',
    description: '6 målbaserade program',
    color: 'hover:border-green-500 hover:bg-green-50',
  },
]

interface SportSelectorProps {
  selectedSport: SportType | null
  onSelect: (sport: SportType) => void
}

export function SportSelector({ selectedSport, onSelect }: SportSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Välj sport</h2>
        <p className="text-muted-foreground">
          Vilken typ av träningsprogram vill du skapa?
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {sports.map((sport) => {
          const isSelected = selectedSport === sport.id
          return (
            <button
              key={sport.id}
              onClick={() => onSelect(sport.id)}
              className={cn(
                'flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-200',
                'min-h-[140px]',
                isSelected
                  ? 'border-primary bg-primary/5 ring-2 ring-primary ring-offset-2'
                  : `border-muted bg-card ${sport.color}`,
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
              )}
            >
              <span className="text-4xl mb-3">{sport.icon}</span>
              <span className="font-semibold text-lg">{sport.label}</span>
              <span className="text-xs text-muted-foreground mt-1 text-center">
                {sport.description}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
