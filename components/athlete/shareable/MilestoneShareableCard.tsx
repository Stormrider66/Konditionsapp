'use client'

import { forwardRef } from 'react'
import {
  Trophy,
  Flame,
  Award,
  Cake,
  Star,
  Zap,
  TrendingUp,
} from 'lucide-react'
import { celebrationColors, celebrationEmojis, type CelebrationLevel } from '@/lib/milestone-constants'

interface MilestoneShareableCardProps {
  title: string
  description: string
  milestoneType?: string
  celebrationLevel: CelebrationLevel
  value?: number
  unit?: string
  improvement?: number
  previousBest?: number
  athleteName?: string
}

const milestoneIcons: Record<string, React.ReactNode> = {
  PERSONAL_RECORD: <Trophy className="h-12 w-12" />,
  CONSISTENCY_STREAK: <Flame className="h-12 w-12" />,
  WORKOUT_COUNT: <Award className="h-12 w-12" />,
  TRAINING_ANNIVERSARY: <Cake className="h-12 w-12" />,
  FIRST_WORKOUT: <Star className="h-12 w-12" />,
  COMEBACK: <Zap className="h-12 w-12" />,
  PROGRAM_COMPLETED: <Trophy className="h-12 w-12" />,
}

// Solid gradient backgrounds for html2canvas compatibility (no backdrop-blur/animations)
const solidGradients: Record<CelebrationLevel, string> = {
  BRONZE: 'linear-gradient(135deg, #fef3c7, #fed7aa)',
  SILVER: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
  GOLD: 'linear-gradient(135deg, #fef9c3, #fde68a)',
  PLATINUM: 'linear-gradient(135deg, #f3e8ff, #fce7f3)',
}

export const MilestoneShareableCard = forwardRef<HTMLDivElement, MilestoneShareableCardProps>(
  function MilestoneShareableCard(
    { title, description, milestoneType, celebrationLevel, value, unit, improvement, previousBest, athleteName },
    ref
  ) {
    const level = celebrationLevel || 'BRONZE'
    const colors = celebrationColors[level]
    const icon = milestoneIcons[milestoneType || ''] || <Star className="h-12 w-12" />
    const emoji = celebrationEmojis[level]

    return (
      <div
        ref={ref}
        style={{
          width: 1200,
          height: 630,
          background: solidGradients[level],
          fontFamily: 'system-ui, sans-serif',
        }}
        className="relative flex flex-col items-center justify-center p-16"
      >
        {/* Icon */}
        <div className={`p-6 rounded-2xl mb-6 ${colors.iconBg} ${colors.iconColor}`}>
          {icon}
        </div>

        {/* Title + Emoji */}
        <div className="flex items-center gap-4 mb-4">
          <h1 className={`text-5xl font-bold text-center ${colors.textColor}`}>
            {title}
          </h1>
          <span className="text-5xl">{emoji}</span>
        </div>

        {/* Description */}
        <p className={`text-2xl text-center mb-8 opacity-80 ${colors.textColor}`}>
          {description}
        </p>

        {/* Value badge + improvement */}
        <div className="flex items-center gap-6 mb-8">
          {value != null && (
            <div className={`px-8 py-3 rounded-full text-3xl font-bold ${colors.badgeBg}`}>
              {value} {unit || ''}
            </div>
          )}
          {improvement != null && improvement > 0 && (
            <div className="flex items-center gap-2 text-green-600 text-2xl font-semibold">
              <TrendingUp className="h-6 w-6" />
              +{improvement}%
            </div>
          )}
          {previousBest != null && (
            <span className={`text-xl opacity-60 ${colors.textColor}`}>
              Tidigare: {previousBest} {unit}
            </span>
          )}
        </div>

        {/* Athlete name */}
        {athleteName && (
          <p className={`text-xl opacity-70 mb-4 ${colors.textColor}`}>
            {athleteName}
          </p>
        )}

        {/* Branding */}
        <div className="absolute bottom-6 right-8 flex items-center gap-2 opacity-60">
          <span className={`text-lg font-semibold ${colors.textColor}`}>Trainomics</span>
        </div>
      </div>
    )
  }
)
