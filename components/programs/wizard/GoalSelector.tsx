'use client'

import { SportType } from '@prisma/client'
import { useLocale } from 'next-intl'
import { cn } from '@/lib/utils'

interface Goal {
  id: string
  label: Record<AppLocale, string>
  description: Record<AppLocale, string>
  duration?: Record<AppLocale, string>
}

type AppLocale = 'en' | 'sv'

const getAppLocale = (locale: string): AppLocale => (locale === 'sv' ? 'sv' : 'en')

const t = (locale: AppLocale, sv: string, en: string) => (locale === 'sv' ? sv : en)

const teamCourtGoals: Goal[] = [
  { id: 'off-season-build', label: { en: 'Off-season build', sv: 'Off-season uppbyggnad' }, description: { en: 'Strength, base, robustness', sv: 'Styrka, bas och tålighet' }, duration: { en: '10-12 weeks', sv: '10-12 veckor' } },
  { id: 'pre-season-readiness', label: { en: 'Pre-season readiness', sv: 'Försäsongsform' }, description: { en: 'Sport fitness and power', sv: 'Sportspecifik kondition och power' }, duration: { en: '8 weeks', sv: '8 veckor' } },
  { id: 'in-season-maintenance', label: { en: 'In-season maintenance', sv: 'Säsongsunderhåll' }, description: { en: 'Maintain quality around games', sv: 'Behåll kvalitet runt matcher' }, duration: { en: '8 weeks', sv: '8 veckor' } },
  { id: 'speed-power', label: { en: 'Speed & power', sv: 'Snabbhet & power' }, description: { en: 'Acceleration, jumps, change of direction', sv: 'Acceleration, hopp, riktningsförändring' }, duration: { en: '8 weeks', sv: '8 veckor' } },
  { id: 'injury-prevention', label: { en: 'Injury prevention', sv: 'Skadeprevention' }, description: { en: 'Position-specific robustness', sv: 'Positionsspecifik robusthet' }, duration: { en: '10 weeks', sv: '10 veckor' } },
  { id: 'custom', label: { en: 'Custom', sv: 'Anpassad' }, description: { en: 'Own team or player goal', sv: 'Eget lag- eller spelarmål' }, duration: { en: 'Optional', sv: 'Valfri' } },
]

const racketGoals: Goal[] = [
  { id: 'off-season-build', label: { en: 'Off-season build', sv: 'Off-season uppbyggnad' }, description: { en: 'Strength, mobility, base fitness', sv: 'Styrka, rörlighet och bas' }, duration: { en: '10 weeks', sv: '10 veckor' } },
  { id: 'pre-season-readiness', label: { en: 'Pre-season readiness', sv: 'Försäsongsform' }, description: { en: 'Footwork, power, point fitness', sv: 'Fotarbete, power och poängkondition' }, duration: { en: '8 weeks', sv: '8 veckor' } },
  { id: 'in-season-maintenance', label: { en: 'In-season maintenance', sv: 'Säsongsunderhåll' }, description: { en: 'Quality between matches', sv: 'Kvalitet mellan matcher' }, duration: { en: '8 weeks', sv: '8 veckor' } },
  { id: 'tournament', label: { en: 'Tournament block', sv: 'Turneringsblock' }, description: { en: 'Taper, match play, recovery', sv: 'Toppning, matchspel, återhämtning' }, duration: { en: '6 weeks', sv: '6 veckor' } },
  { id: 'speed-power', label: { en: 'Speed & power', sv: 'Snabbhet & power' }, description: { en: 'First step, rotation, reactions', sv: 'Första steg, rotation, reaktion' }, duration: { en: '8 weeks', sv: '8 veckor' } },
  { id: 'custom', label: { en: 'Custom', sv: 'Anpassad' }, description: { en: 'Own match or player goal', sv: 'Eget match- eller spelarmål' }, duration: { en: 'Optional', sv: 'Valfri' } },
]

const goalsBySport: Record<string, Goal[]> = {
  RUNNING: [
    { id: 'marathon', label: { en: 'Marathon', sv: 'Marathon' }, description: { en: '42.2 km', sv: '42.2 km' }, duration: { en: '16-26 weeks', sv: '16-26 veckor' } },
    { id: 'half-marathon', label: { en: 'Half marathon', sv: 'Halvmaraton' }, description: { en: '21.1 km', sv: '21.1 km' }, duration: { en: '12-20 weeks', sv: '12-20 veckor' } },
    { id: '10k', label: { en: '10K', sv: '10K' }, description: { en: 'Fast 10 km', sv: 'Snabb 10 km' }, duration: { en: '8-12 weeks', sv: '8-12 veckor' } },
    { id: '5k', label: { en: '5K', sv: '5K' }, description: { en: 'Fast 5 km', sv: 'Snabb 5 km' }, duration: { en: '6-10 weeks', sv: '6-10 veckor' } },
    { id: 'custom', label: { en: 'Custom', sv: 'Anpassad' }, description: { en: 'Own distance or goal', sv: 'Egen distans eller mål' }, duration: { en: 'Optional', sv: 'Valfri' } },
  ],
  CYCLING: [
    { id: 'ftp-builder', label: { en: 'FTP Builder', sv: 'FTP Builder' }, description: { en: 'Raise your threshold power', sv: 'Höj din tröskeleffekt' }, duration: { en: '8 weeks', sv: '8 veckor' } },
    { id: 'base-builder', label: { en: 'Base Builder', sv: 'Basbyggare' }, description: { en: 'Aerobic foundation', sv: 'Aerob grund' }, duration: { en: '12 weeks', sv: '12 veckor' } },
    { id: 'gran-fondo', label: { en: 'Gran Fondo', sv: 'Gran Fondo' }, description: { en: 'Long distance 100-200 km', sv: 'Långdistans 100-200km' }, duration: { en: '8 weeks', sv: '8 veckor' } },
    { id: 'custom', label: { en: 'Custom', sv: 'Anpassad' }, description: { en: 'Own goal', sv: 'Eget mål' }, duration: { en: 'Optional', sv: 'Valfri' } },
  ],
  STRENGTH: [
    { id: 'injury-prevention', label: { en: 'Injury prevention', sv: 'Skadeprevention' }, description: { en: 'Stability & balance', sv: 'Stabilitet & balans' }, duration: { en: '8-12 weeks', sv: '8-12 veckor' } },
    { id: 'power', label: { en: 'Power development', sv: 'Kraftutveckling' }, description: { en: 'Explosiveness & strength', sv: 'Explosivitet & styrka' }, duration: { en: '12-16 weeks', sv: '12-16 veckor' } },
    { id: 'running-economy', label: { en: 'Running economy', sv: 'Löparekonomi' }, description: { en: 'Strength for runners', sv: 'Styrka för löpare' }, duration: { en: '12 weeks', sv: '12 veckor' } },
    { id: 'general', label: { en: 'General strength', sv: 'Allmän styrka' }, description: { en: 'Balanced development', sv: 'Balanserad utveckling' }, duration: { en: '8-16 weeks', sv: '8-16 veckor' } },
  ],
  SKIING: [
    { id: 'threshold-builder', label: { en: 'Threshold builder', sv: 'Tröskelbyggare' }, description: { en: 'Raise lactate threshold', sv: 'Höj laktattröskel' }, duration: { en: '8 weeks', sv: '8 veckor' } },
    { id: 'prep-phase', label: { en: 'Preparation', sv: 'Förberedelse' }, description: { en: 'Summer/fall with roller skiing', sv: 'Sommar/höst med rullskidor' }, duration: { en: '12 weeks', sv: '12 veckor' } },
    { id: 'vasaloppet', label: { en: 'Vasaloppet', sv: 'Vasaloppet' }, description: { en: 'Long race 90 km', sv: 'Långlopp 90 km' }, duration: { en: '16 weeks', sv: '16 veckor' } },
    { id: 'custom', label: { en: 'Custom', sv: 'Anpassad' }, description: { en: 'Own goal', sv: 'Eget mål' }, duration: { en: 'Optional', sv: 'Valfri' } },
  ],
  SWIMMING: [
    { id: 'sprint', label: { en: 'Sprint', sv: 'Sprint' }, description: { en: '50-200 m focus', sv: '50-200m fokus' }, duration: { en: '8 weeks', sv: '8 veckor' } },
    { id: 'distance', label: { en: 'Distance', sv: 'Distans' }, description: { en: '400-1500 m focus', sv: '400m-1500m fokus' }, duration: { en: '12 weeks', sv: '12 veckor' } },
    { id: 'open-water', label: { en: 'Open water', sv: 'Öppet vatten' }, description: { en: 'Long-distance swimming', sv: 'Långdistanssim' }, duration: { en: '12 weeks', sv: '12 veckor' } },
    { id: 'custom', label: { en: 'Custom', sv: 'Anpassad' }, description: { en: 'Own goal', sv: 'Eget mål' }, duration: { en: 'Optional', sv: 'Valfri' } },
  ],
  TRIATHLON: [
    { id: 'sprint', label: { en: 'Sprint', sv: 'Sprint' }, description: { en: '750m/20km/5km', sv: '750m/20km/5km' }, duration: { en: '8 weeks', sv: '8 veckor' } },
    { id: 'olympic', label: { en: 'Olympic', sv: 'Olympic' }, description: { en: '1.5km/40km/10km', sv: '1.5km/40km/10km' }, duration: { en: '12 weeks', sv: '12 veckor' } },
    { id: 'half-ironman', label: { en: '70.3', sv: '70.3' }, description: { en: '1.9km/90km/21km', sv: '1.9km/90km/21km' }, duration: { en: '16 weeks', sv: '16 veckor' } },
    { id: 'ironman', label: { en: 'Ironman', sv: 'Ironman' }, description: { en: '3.8km/180km/42km', sv: '3.8km/180km/42km' }, duration: { en: '24 weeks', sv: '24 veckor' } },
    { id: 'custom', label: { en: 'Custom', sv: 'Anpassad' }, description: { en: 'Own goal', sv: 'Eget mål' }, duration: { en: 'Optional', sv: 'Valfri' } },
  ],
  HYROX: [
    { id: 'pro', label: { en: 'Pro Division', sv: 'Pro Division' }, description: { en: 'Elite class', sv: 'Elitklassen' }, duration: { en: '12 weeks', sv: '12 veckor' } },
    { id: 'age-group', label: { en: 'Age Group', sv: 'Age Group' }, description: { en: 'Age group', sv: 'Åldersklass' }, duration: { en: '12 weeks', sv: '12 veckor' } },
    { id: 'doubles', label: { en: 'Doubles', sv: 'Doubles' }, description: { en: 'Pair race', sv: 'Parlopp' }, duration: { en: '8 weeks', sv: '8 veckor' } },
    { id: 'custom', label: { en: 'Custom', sv: 'Anpassad' }, description: { en: 'Own goal', sv: 'Eget mål' }, duration: { en: 'Optional', sv: 'Valfri' } },
  ],
  GENERAL_FITNESS: [
    { id: 'weight_loss', label: { en: 'Weight loss', sv: 'Viktminskning' }, description: { en: 'Fat burning & fitness', sv: 'Fettförbränning & kondition' }, duration: { en: '12 weeks', sv: '12 veckor' } },
    { id: 'strength', label: { en: 'Strength', sv: 'Styrka' }, description: { en: 'Muscle building', sv: 'Muskelbyggande' }, duration: { en: '12 weeks', sv: '12 veckor' } },
    { id: 'endurance', label: { en: 'Endurance', sv: 'Uthållighet' }, description: { en: 'Cardio training', sv: 'Konditionsträning' }, duration: { en: '12 weeks', sv: '12 veckor' } },
    { id: 'flexibility', label: { en: 'Mobility', sv: 'Rörlighet' }, description: { en: 'Stretching & mobility', sv: 'Stretching & mobilitet' }, duration: { en: '8 weeks', sv: '8 veckor' } },
    { id: 'stress_relief', label: { en: 'Stress management', sv: 'Stresshantering' }, description: { en: 'Yoga & mindfulness', sv: 'Yoga & mindfulness' }, duration: { en: '8 weeks', sv: '8 veckor' } },
    { id: 'general_health', label: { en: 'General health', sv: 'Allmän hälsa' }, description: { en: 'Balanced training', sv: 'Balanserad träning' }, duration: { en: '8 weeks', sv: '8 veckor' } },
  ],
  TEAM_ICE_HOCKEY: [
    { id: 'off-season-build', label: { en: 'Off-season build', sv: 'Off-season uppbyggnad' }, description: { en: 'Strength, base fitness, mobility', sv: 'Styrka, bas och rörlighet' }, duration: { en: '12 weeks', sv: '12 veckor' } },
    { id: 'pre-season-readiness', label: { en: 'Pre-season readiness', sv: 'Försäsongsform' }, description: { en: 'Shift fitness and power', sv: 'Byteskondition och power' }, duration: { en: '8 weeks', sv: '8 veckor' } },
    { id: 'in-season-maintenance', label: { en: 'In-season maintenance', sv: 'Säsongsunderhåll' }, description: { en: 'Maintain power, recover well', sv: 'Behåll power, återhämta smart' }, duration: { en: '8 weeks', sv: '8 veckor' } },
    { id: 'speed-power', label: { en: 'Speed & power', sv: 'Snabbhet & power' }, description: { en: 'Acceleration and explosive work', sv: 'Acceleration och explosivitet' }, duration: { en: '8 weeks', sv: '8 veckor' } },
    { id: 'injury-prevention', label: { en: 'Injury prevention', sv: 'Skadeprevention' }, description: { en: 'Groin, hip, shoulder, ankle', sv: 'Ljumske, höft, axel, fotled' }, duration: { en: '10 weeks', sv: '10 veckor' } },
    { id: 'return-to-play', label: { en: 'Return to play', sv: 'Return to play' }, description: { en: 'Gradual ramp to games', sv: 'Stegrad väg till match' }, duration: { en: '6 weeks', sv: '6 veckor' } },
    { id: 'custom', label: { en: 'Custom', sv: 'Anpassad' }, description: { en: 'Own team or player goal', sv: 'Eget lag- eller spelarmål' }, duration: { en: 'Optional', sv: 'Valfri' } },
  ],
  TEAM_FOOTBALL: [
    { id: 'off-season-build', label: { en: 'Off-season build', sv: 'Off-season uppbyggnad' }, description: { en: 'Strength, base, robustness', sv: 'Styrka, bas och tålighet' }, duration: { en: '10 weeks', sv: '10 veckor' } },
    { id: 'pre-season-readiness', label: { en: 'Pre-season readiness', sv: 'Försäsongsform' }, description: { en: 'Football fitness and speed', sv: 'Fotbollskondition och snabbhet' }, duration: { en: '8 weeks', sv: '8 veckor' } },
    { id: 'in-season-maintenance', label: { en: 'In-season maintenance', sv: 'Säsongsunderhåll' }, description: { en: 'Match-week maintenance', sv: 'Underhåll runt matchvecka' }, duration: { en: '8 weeks', sv: '8 veckor' } },
    { id: 'speed-power', label: { en: 'Speed & power', sv: 'Snabbhet & power' }, description: { en: 'Sprint, acceleration, jumps', sv: 'Sprint, acceleration, hopp' }, duration: { en: '8 weeks', sv: '8 veckor' } },
    { id: 'injury-prevention', label: { en: 'Injury prevention', sv: 'Skadeprevention' }, description: { en: 'Hamstring, groin, ankle, knee', sv: 'Hamstring, ljumske, fotled, knä' }, duration: { en: '10 weeks', sv: '10 veckor' } },
    { id: 'return-to-play', label: { en: 'Return to play', sv: 'Return to play' }, description: { en: 'Controlled ramp to match load', sv: 'Kontrollerad väg till matchbelastning' }, duration: { en: '6 weeks', sv: '6 veckor' } },
    { id: 'custom', label: { en: 'Custom', sv: 'Anpassad' }, description: { en: 'Own team or player goal', sv: 'Eget lag- eller spelarmål' }, duration: { en: 'Optional', sv: 'Valfri' } },
  ],
  TEAM_BASKETBALL: teamCourtGoals,
  TEAM_HANDBALL: teamCourtGoals,
  TEAM_FLOORBALL: teamCourtGoals,
  TEAM_VOLLEYBALL: teamCourtGoals,
  TENNIS: racketGoals,
  PADEL: racketGoals,
}

interface GoalSelectorProps {
  sport: SportType
  selectedGoal: string | null
  onSelect: (goal: string) => void
  onBack: () => void
}

export function GoalSelector({ sport, selectedGoal, onSelect, onBack: _onBack }: GoalSelectorProps) {
  const locale = getAppLocale(useLocale())
  const goals = goalsBySport[sport] || []

  const sportLabels: Record<string, Record<AppLocale, string>> = {
    RUNNING: { en: 'Running', sv: 'Löpning' },
    CYCLING: { en: 'Cycling', sv: 'Cykling' },
    STRENGTH: { en: 'Strength', sv: 'Styrka' },
    SKIING: { en: 'Skiing', sv: 'Skidåkning' },
    SWIMMING: { en: 'Swimming', sv: 'Simning' },
    TRIATHLON: { en: 'Triathlon', sv: 'Triathlon' },
    HYROX: { en: 'HYROX', sv: 'HYROX' },
    GENERAL_FITNESS: { en: 'General Fitness', sv: 'Allmän Fitness' },
    TEAM_ICE_HOCKEY: { en: 'Ice Hockey', sv: 'Ishockey' },
    TEAM_FOOTBALL: { en: 'Football', sv: 'Fotboll' },
    TEAM_BASKETBALL: { en: 'Basketball', sv: 'Basket' },
    TEAM_HANDBALL: { en: 'Handball', sv: 'Handboll' },
    TEAM_FLOORBALL: { en: 'Floorball', sv: 'Innebandy' },
    TEAM_VOLLEYBALL: { en: 'Volleyball', sv: 'Volleyboll' },
    TENNIS: { en: 'Tennis', sv: 'Tennis' },
    PADEL: { en: 'Padel', sv: 'Padel' },
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">{t(locale, 'Välj mål', 'Choose goal')}</h2>
        <p className="text-muted-foreground">
          {t(locale, 'Vad är målet med', 'What is the goal for')} {(sportLabels[sport]?.[locale] || t(locale, 'träningen', 'training')).toLowerCase()}?
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
              <span className="font-semibold text-lg text-slate-900 dark:text-white">{goal.label[locale]}</span>
              <span className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {goal.description[locale]}
              </span>
              {goal.duration && (
                <span className="text-xs text-primary mt-2 font-medium">
                  {goal.duration[locale]}
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
