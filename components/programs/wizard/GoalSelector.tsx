'use client'

import { SportType } from '@prisma/client'
import { cn } from '@/lib/utils'

interface Goal {
  id: string
  label: string
  description: string
  duration?: string
}

const goalsBySport: Record<string, Goal[]> = {
  RUNNING: [
    { id: 'marathon', label: 'Marathon', description: '42.2 km', duration: '16-26 veckor' },
    { id: 'half-marathon', label: 'Halvmaraton', description: '21.1 km', duration: '12-20 veckor' },
    { id: '10k', label: '10K', description: 'Snabb 10 km', duration: '8-12 veckor' },
    { id: '5k', label: '5K', description: 'Snabb 5 km', duration: '6-10 veckor' },
    { id: 'custom', label: 'Anpassad', description: 'Egen distans eller mål', duration: 'Valfri' },
  ],
  CYCLING: [
    { id: 'ftp-builder', label: 'FTP Builder', description: 'Höj din tröskeleffekt', duration: '8 veckor' },
    { id: 'base-builder', label: 'Basbyggare', description: 'Aerob grund', duration: '12 veckor' },
    { id: 'gran-fondo', label: 'Gran Fondo', description: 'Långdistans 100-200km', duration: '8 veckor' },
    { id: 'custom', label: 'Anpassad', description: 'Eget mål', duration: 'Valfri' },
  ],
  STRENGTH: [
    { id: 'injury-prevention', label: 'Skadeprevention', description: 'Stabilitet & balans', duration: '8-12 veckor' },
    { id: 'power', label: 'Kraftutveckling', description: 'Explosivitet & styrka', duration: '12-16 veckor' },
    { id: 'running-economy', label: 'Löparekonomi', description: 'Styrka för löpare', duration: '12 veckor' },
    { id: 'general', label: 'Allmän styrka', description: 'Balanserad utveckling', duration: '8-16 veckor' },
  ],
  SKIING: [
    { id: 'threshold-builder', label: 'Tröskelbyggare', description: 'Höj laktattröskel', duration: '8 veckor' },
    { id: 'prep-phase', label: 'Förberedelse', description: 'Sommar/höst med rullskidor', duration: '12 veckor' },
    { id: 'vasaloppet', label: 'Vasaloppet', description: 'Långlopp 90 km', duration: '16 veckor' },
    { id: 'custom', label: 'Anpassad', description: 'Eget mål', duration: 'Valfri' },
  ],
  SWIMMING: [
    { id: 'sprint', label: 'Sprint', description: '50-200m fokus', duration: '8 veckor' },
    { id: 'distance', label: 'Distans', description: '400m-1500m fokus', duration: '12 veckor' },
    { id: 'open-water', label: 'Öppet vatten', description: 'Långdistanssim', duration: '12 veckor' },
    { id: 'custom', label: 'Anpassad', description: 'Eget mål', duration: 'Valfri' },
  ],
  TRIATHLON: [
    { id: 'sprint', label: 'Sprint', description: '750m/20km/5km', duration: '8 veckor' },
    { id: 'olympic', label: 'Olympic', description: '1.5km/40km/10km', duration: '12 veckor' },
    { id: 'half-ironman', label: '70.3', description: '1.9km/90km/21km', duration: '16 veckor' },
    { id: 'ironman', label: 'Ironman', description: '3.8km/180km/42km', duration: '24 veckor' },
    { id: 'custom', label: 'Anpassad', description: 'Eget mål', duration: 'Valfri' },
  ],
  HYROX: [
    { id: 'pro', label: 'Pro Division', description: 'Elitklassen', duration: '12 veckor' },
    { id: 'age-group', label: 'Age Group', description: 'Åldersklass', duration: '12 veckor' },
    { id: 'doubles', label: 'Doubles', description: 'Parlopp', duration: '8 veckor' },
    { id: 'custom', label: 'Anpassad', description: 'Eget mål', duration: 'Valfri' },
  ],
  GENERAL_FITNESS: [
    { id: 'weight_loss', label: 'Viktminskning', description: 'Fettförbränning & kondition', duration: '12 veckor' },
    { id: 'strength', label: 'Styrka', description: 'Muskelbyggande', duration: '12 veckor' },
    { id: 'endurance', label: 'Uthållighet', description: 'Konditionsträning', duration: '12 veckor' },
    { id: 'flexibility', label: 'Rörlighet', description: 'Stretching & mobilitet', duration: '8 veckor' },
    { id: 'stress_relief', label: 'Stresshantering', description: 'Yoga & mindfulness', duration: '8 veckor' },
    { id: 'general_health', label: 'Allmän hälsa', description: 'Balanserad träning', duration: '8 veckor' },
  ],
}

interface GoalSelectorProps {
  sport: SportType
  selectedGoal: string | null
  onSelect: (goal: string) => void
  onBack: () => void
}

export function GoalSelector({ sport, selectedGoal, onSelect, onBack }: GoalSelectorProps) {
  const goals = goalsBySport[sport] || []

  const sportLabels: Record<string, string> = {
    RUNNING: 'Löpning',
    CYCLING: 'Cykling',
    STRENGTH: 'Styrka',
    SKIING: 'Skidåkning',
    SWIMMING: 'Simning',
    TRIATHLON: 'Triathlon',
    HYROX: 'HYROX',
    GENERAL_FITNESS: 'Allmän Fitness',
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Välj mål</h2>
        <p className="text-muted-foreground">
          Vad är målet med {sportLabels[sport]?.toLowerCase() || 'träningen'}?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {goals.map((goal) => {
          const isSelected = selectedGoal === goal.id
          return (
            // ...
            <button
              key={goal.id}
              onClick={() => onSelect(goal.id)}
              className={cn(
                'flex flex-col items-start p-5 rounded-xl border-2 transition-all duration-200 text-left',
                isSelected
                  ? 'border-primary bg-primary/10 ring-2 ring-primary ring-offset-2'
                  : 'border-slate-200 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm hover:border-primary/50 hover:bg-white/60 dark:hover:bg-slate-800/60',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
              )}
            >
              <span className="font-semibold text-lg text-slate-900 dark:text-white">{goal.label}</span>
              <span className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {goal.description}
              </span>
              {goal.duration && (
                <span className="text-xs text-primary mt-2 font-medium">
                  {goal.duration}
                </span>
              )}
            </button>
            // ...
          )
        })}
      </div>
    </div>
  )
}
