'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GlassCard, GlassCardContent, GlassCardDescription, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { Progress } from '@/components/ui/progress'
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  Target,
  Flame,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DailyNutritionData {
  date: string
  calories: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
  mealCount: number
}

interface NutritionGoals {
  calories: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
}

interface NutritionScoreProps {
  dailyData: DailyNutritionData[]
  goals: NutritionGoals
  className?: string
  variant?: 'default' | 'glass'
}

interface ScoreBreakdown {
  category: string
  score: number
  maxScore: number
  description: string
}

function calculateDailyScore(
  data: DailyNutritionData,
  goals: NutritionGoals
): { score: number; breakdown: ScoreBreakdown[] } {
  const breakdown: ScoreBreakdown[] = []

  // Calorie accuracy (25 points) - within 10% is perfect
  const calorieDeviation = Math.abs(data.calories - goals.calories) / goals.calories
  const calorieScore = calorieDeviation <= 0.1 ? 25 : calorieDeviation <= 0.2 ? 20 : calorieDeviation <= 0.3 ? 15 : 5
  breakdown.push({
    category: 'Kalorier',
    score: calorieScore,
    maxScore: 25,
    description: calorieDeviation <= 0.1 ? 'Inom mål' : calorieDeviation <= 0.2 ? 'Nära mål' : 'Utanför mål',
  })

  // Protein target (30 points) - hitting 90%+ is perfect
  const proteinRatio = data.proteinGrams / goals.proteinGrams
  const proteinScore = proteinRatio >= 0.9 ? 30 : proteinRatio >= 0.8 ? 24 : proteinRatio >= 0.7 ? 18 : proteinRatio >= 0.5 ? 10 : 5
  breakdown.push({
    category: 'Protein',
    score: proteinScore,
    maxScore: 30,
    description: proteinRatio >= 0.9 ? 'Utmärkt' : proteinRatio >= 0.7 ? 'Bra' : 'Behöver ökas',
  })

  // Carbs balance (20 points)
  const carbsRatio = data.carbsGrams / goals.carbsGrams
  const carbsScore = carbsRatio >= 0.8 && carbsRatio <= 1.2 ? 20 : carbsRatio >= 0.6 && carbsRatio <= 1.4 ? 15 : 8
  breakdown.push({
    category: 'Kolhydrater',
    score: carbsScore,
    maxScore: 20,
    description: carbsRatio >= 0.8 && carbsRatio <= 1.2 ? 'Balanserat' : 'Kunde vara bättre',
  })

  // Fat balance (15 points)
  const fatRatio = data.fatGrams / goals.fatGrams
  const fatScore = fatRatio >= 0.7 && fatRatio <= 1.3 ? 15 : fatRatio >= 0.5 && fatRatio <= 1.5 ? 10 : 5
  breakdown.push({
    category: 'Fett',
    score: fatScore,
    maxScore: 15,
    description: fatRatio >= 0.7 && fatRatio <= 1.3 ? 'Balanserat' : 'Justera intaget',
  })

  // Meal frequency (10 points) - 3-5 meals is ideal
  const mealScore = data.mealCount >= 3 && data.mealCount <= 5 ? 10 : data.mealCount >= 2 ? 7 : 3
  breakdown.push({
    category: 'Måltider',
    score: mealScore,
    maxScore: 10,
    description: data.mealCount >= 3 ? `${data.mealCount} måltider - bra!` : 'Fler måltider rekommenderas',
  })

  const totalScore = breakdown.reduce((sum, b) => sum + b.score, 0)
  return { score: totalScore, breakdown }
}

function getScoreGrade(score: number): { label: string; color: string; emoji: string } {
  if (score >= 90) return { label: 'Utmärkt', color: 'text-green-500', emoji: '🏆' }
  if (score >= 75) return { label: 'Mycket bra', color: 'text-green-400', emoji: '⭐' }
  if (score >= 60) return { label: 'Bra', color: 'text-yellow-500', emoji: '👍' }
  if (score >= 45) return { label: 'Kan förbättras', color: 'text-orange-500', emoji: '💪' }
  return { label: 'Fokusera mer', color: 'text-red-500', emoji: '🎯' }
}

export function NutritionScore({ dailyData, goals, className, variant = 'default' }: NutritionScoreProps) {
  const isGlass = variant === 'glass'
  const analysis = useMemo(() => {
    if (dailyData.length === 0) {
      return null
    }

    // Calculate scores for each day
    const dailyScores = dailyData.map(d => calculateDailyScore(d, goals))

    // Average score
    const avgScore = dailyScores.reduce((sum, s) => sum + s.score, 0) / dailyScores.length

    // Trend (comparing first half to second half)
    const midpoint = Math.floor(dailyScores.length / 2)
    const firstHalfAvg = dailyScores.slice(0, midpoint).reduce((sum, s) => sum + s.score, 0) / midpoint
    const secondHalfAvg = dailyScores.slice(midpoint).reduce((sum, s) => sum + s.score, 0) / (dailyScores.length - midpoint)
    const trend = secondHalfAvg - firstHalfAvg

    // Best and worst day
    const bestDayIndex = dailyScores.reduce((best, s, i) => s.score > dailyScores[best].score ? i : best, 0)
    const worstDayIndex = dailyScores.reduce((worst, s, i) => s.score < dailyScores[worst].score ? i : worst, 0)

    // Latest day breakdown
    const latestBreakdown = dailyScores[dailyScores.length - 1]?.breakdown || []

    return {
      avgScore: Math.round(avgScore),
      trend,
      bestDay: { date: dailyData[bestDayIndex]?.date, score: dailyScores[bestDayIndex]?.score },
      worstDay: { date: dailyData[worstDayIndex]?.date, score: dailyScores[worstDayIndex]?.score },
      latestBreakdown,
      daysLogged: dailyData.length,
    }
  }, [dailyData, goals])

  if (!analysis) {
    const EmptyCard = isGlass ? GlassCard : Card
    const EmptyHeader = isGlass ? GlassCardHeader : CardHeader
    const EmptyTitle = isGlass ? GlassCardTitle : CardTitle
    const EmptyContent = isGlass ? GlassCardContent : CardContent

    return (
      <EmptyCard className={className}>
        <EmptyHeader>
          <EmptyTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Nutritionspoäng
          </EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <p className={isGlass ? 'text-slate-400' : 'text-muted-foreground'}>
            Börja logga måltider för att se din poäng.
          </p>
        </EmptyContent>
      </EmptyCard>
    )
  }

  const grade = getScoreGrade(analysis.avgScore)

  const Wrapper = isGlass ? GlassCard : Card
  const Header = isGlass ? GlassCardHeader : CardHeader
  const Title = isGlass ? GlassCardTitle : CardTitle
  const Description = isGlass ? GlassCardDescription : CardDescription
  const Content = isGlass ? GlassCardContent : CardContent
  const mutedText = isGlass ? 'text-slate-400' : 'text-muted-foreground'
  const mainText = isGlass ? 'text-white' : ''

  return (
    <Wrapper className={className}>
      <Header>
        <Title className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Nutritionspoäng
        </Title>
        <Description>
          Baserat på {analysis.daysLogged} dagar med loggning
        </Description>
      </Header>
      <Content className="space-y-6">
        {/* Main Score */}
        <div className="text-center">
          <div className={cn("text-5xl font-bold mb-2", mainText)}>
            {analysis.avgScore}
            <span className={cn("text-2xl", mutedText)}>/100</span>
          </div>
          <div className={cn("flex items-center justify-center gap-2 text-lg font-medium", grade.color)}>
            <span>{grade.emoji}</span>
            <span>{grade.label}</span>
          </div>
          {/* Trend */}
          <div className={cn("flex items-center justify-center gap-1 mt-2 text-sm", mutedText)}>
            {analysis.trend > 2 ? (
              <>
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span>Förbättras</span>
              </>
            ) : analysis.trend < -2 ? (
              <>
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span>Försämras</span>
              </>
            ) : (
              <>
                <Minus className="h-4 w-4" />
                <span>Stabilt</span>
              </>
            )}
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="space-y-3">
          <h4 className={cn("font-medium text-sm", mainText)}>Senaste dagens breakdown</h4>
          {analysis.latestBreakdown.map((item) => (
            <div key={item.category} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className={mainText}>{item.category}</span>
                <span className={mutedText}>
                  {item.score}/{item.maxScore}
                </span>
              </div>
              <Progress value={(item.score / item.maxScore) * 100} className="h-2" />
              <p className={cn("text-xs", mutedText)}>{item.description}</p>
            </div>
          ))}
        </div>

        {/* Best/Worst Days */}
        <div className="grid grid-cols-2 gap-4 text-center text-sm">
          <div className="p-3 rounded-lg bg-green-500/10">
            <Star className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <p className={cn("font-medium", mainText)}>Bästa dag</p>
            <p className={mutedText}>{analysis.bestDay.score} poäng</p>
          </div>
          <div className="p-3 rounded-lg bg-red-500/10">
            <Target className="h-4 w-4 mx-auto mb-1 text-red-500" />
            <p className={cn("font-medium", mainText)}>Sämsta dag</p>
            <p className={mutedText}>{analysis.worstDay.score} poäng</p>
          </div>
        </div>
      </Content>
    </Wrapper>
  )
}
