'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GlassCard, GlassCardContent, GlassCardDescription, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  TrendingDown,
  TrendingUp,
  Scale,
  Flame,
  Target,
  Calendar,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from '@/i18n/client'

interface DailyCalorieData {
  date: string
  calories: number
  tdee: number // Total Daily Energy Expenditure
}

interface DeficitSurplusTrackerProps {
  dailyData: DailyCalorieData[]
  goal: 'deficit' | 'surplus' | 'maintenance'
  targetWeeklyChange: number // kg per week (negative for deficit)
  currentWeight?: number
  targetWeight?: number
  className?: string
  variant?: 'default' | 'glass'
}

// 1 kg of body weight ≈ 7700 kcal
const KCAL_PER_KG = 7700

export function DeficitSurplusTracker({
  dailyData,
  goal,
  targetWeeklyChange,
  currentWeight,
  targetWeight,
  className,
  variant = 'default',
}: DeficitSurplusTrackerProps) {
  const t = useTranslations('components.deficitSurplusTracker')
  const isGlass = variant === 'glass'
  const analysis = useMemo(() => {
    if (dailyData.length === 0) return null

    // Calculate daily balances
    const balances = dailyData.map(d => ({
      date: d.date,
      balance: d.calories - d.tdee,
    }))

    // Weekly totals
    const totalBalance = balances.reduce((sum, b) => sum + b.balance, 0)
    const avgDailyBalance = totalBalance / dailyData.length

    // Expected change based on actual intake
    const expectedWeeklyChange = (avgDailyBalance * 7) / KCAL_PER_KG

    // Target daily balance
    const targetDailyBalance = (targetWeeklyChange * KCAL_PER_KG) / 7

    // How well are they hitting target?
    const targetAccuracy = targetDailyBalance !== 0
      ? Math.max(0, 100 - Math.abs((avgDailyBalance - targetDailyBalance) / targetDailyBalance) * 100)
      : avgDailyBalance === 0 ? 100 : 50

    // Days in deficit/surplus
    const daysInDeficit = balances.filter(b => b.balance < 0).length
    const daysInSurplus = balances.filter(b => b.balance > 0).length

    // Calculate time to goal
    let weeksToGoal: number | null = null
    if (currentWeight && targetWeight && expectedWeeklyChange !== 0) {
      const weightDiff = targetWeight - currentWeight
      if ((weightDiff < 0 && expectedWeeklyChange < 0) || (weightDiff > 0 && expectedWeeklyChange > 0)) {
        weeksToGoal = Math.abs(weightDiff / expectedWeeklyChange)
      }
    }

    return {
      totalBalance,
      avgDailyBalance: Math.round(avgDailyBalance),
      expectedWeeklyChange,
      targetDailyBalance: Math.round(targetDailyBalance),
      targetAccuracy: Math.round(targetAccuracy),
      daysInDeficit,
      daysInSurplus,
      daysTotal: dailyData.length,
      weeksToGoal,
    }
  }, [dailyData, targetWeeklyChange, currentWeight, targetWeight])

  const Wrapper = isGlass ? GlassCard : Card
  const Header = isGlass ? GlassCardHeader : CardHeader
  const Title = isGlass ? GlassCardTitle : CardTitle
  const Description = isGlass ? GlassCardDescription : CardDescription
  const Content = isGlass ? GlassCardContent : CardContent
  const mutedText = isGlass ? 'text-slate-400' : 'text-muted-foreground'

  if (!analysis) {
    return (
      <Wrapper className={className}>
        <Header>
          <Title className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            {t('title')}
          </Title>
        </Header>
        <Content>
          <p className={mutedText}>
            {t('empty')}
          </p>
        </Content>
      </Wrapper>
    )
  }

  const isOnTrack = analysis.targetAccuracy >= 70
  const goalLabel = goal === 'deficit' ? t('goals.deficit') : goal === 'surplus' ? t('goals.surplus') : t('goals.maintenance')

  return (
    <Wrapper className={className}>
      <Header>
        <div className="flex items-center justify-between">
          <div>
            <Title className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              {t('title')}
            </Title>
            <Description>
              {t('goalDescription', {
                goal: goalLabel,
                change: `${targetWeeklyChange > 0 ? '+' : ''}${targetWeeklyChange}`,
              })}
            </Description>
          </div>
          <Badge variant={isOnTrack ? 'default' : 'secondary'}>
            {isOnTrack ? (
              <CheckCircle2 className="h-3 w-3 mr-1" />
            ) : (
              <AlertTriangle className="h-3 w-3 mr-1" />
            )}
            {isOnTrack ? t('status.onTrack') : t('status.needsAdjustment')}
          </Badge>
        </div>
      </Header>
      <Content className="space-y-6">
        {/* Daily Balance Gauge */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{t('averageDailyBalance')}</span>
            <span className={cn(
              "font-bold",
              analysis.avgDailyBalance < 0 ? "text-blue-500" : analysis.avgDailyBalance > 0 ? "text-orange-500" : "text-green-500"
            )}>
              {analysis.avgDailyBalance > 0 ? '+' : ''}{analysis.avgDailyBalance} kcal
            </span>
          </div>

          {/* Visual balance indicator */}
          <div className="relative h-8 bg-muted rounded-full overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <span className="text-xs font-medium">
                {t('dailyTarget', {
                  balance: `${analysis.targetDailyBalance > 0 ? '+' : ''}${analysis.targetDailyBalance}`,
                })}
              </span>
            </div>
            {/* Balance bar */}
            <div
              className={cn(
                "absolute top-0 h-full transition-all duration-500",
                analysis.avgDailyBalance < 0 ? "bg-blue-500/30 right-1/2" : "bg-orange-500/30 left-1/2"
              )}
              style={{
                width: `${Math.min(50, Math.abs(analysis.avgDailyBalance) / 20)}%`,
              }}
            />
            {/* Center line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-border" />
          </div>

          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <TrendingDown className="h-3 w-3 text-blue-500" />
              {t('goals.deficit')}
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-orange-500" />
              {t('goals.surplus')}
            </span>
          </div>
        </div>

        {/* Expected vs Target */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{t('targetPerWeek')}</span>
            </div>
            <p className="text-lg font-bold">
              {targetWeeklyChange > 0 ? '+' : ''}{targetWeeklyChange} kg
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Flame className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{t('expectedPerWeek')}</span>
            </div>
            <p className={cn(
              "text-lg font-bold",
              Math.abs(analysis.expectedWeeklyChange - targetWeeklyChange) < 0.2
                ? "text-green-500"
                : "text-yellow-500"
            )}>
              {analysis.expectedWeeklyChange > 0 ? '+' : ''}{analysis.expectedWeeklyChange.toFixed(2)} kg
            </p>
          </div>
        </div>

        {/* Target Accuracy */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>{t('targetAccuracy')}</span>
            <span className="font-medium">{analysis.targetAccuracy}%</span>
          </div>
          <Progress value={analysis.targetAccuracy} className="h-2" />
        </div>

        {/* Days breakdown */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="text-center flex-1">
            <p className="text-2xl font-bold text-blue-500">{analysis.daysInDeficit}</p>
            <p className="text-xs text-muted-foreground">{t('daysDeficit')}</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center flex-1">
            <p className="text-2xl font-bold text-orange-500">{analysis.daysInSurplus}</p>
            <p className="text-xs text-muted-foreground">{t('daysSurplus')}</p>
          </div>
        </div>

        {/* Time to goal */}
        {analysis.weeksToGoal && currentWeight && targetWeight && (
          <div className="p-3 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{t('timeToGoal.title')}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t.rich('timeToGoal.description', {
                targetWeight,
                currentWeight,
                weeks: Math.round(analysis.weeksToGoal),
                strong: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
              })}
            </p>
          </div>
        )}

        {/* Tips based on goal */}
        <div className="text-xs text-muted-foreground space-y-1">
          {goal === 'deficit' && (
            <>
              <p>{t('tips.deficitCalories')}</p>
              <p>{t('tips.deficitProtein')}</p>
            </>
          )}
          {goal === 'surplus' && (
            <>
              <p>{t('tips.surplusCalories')}</p>
              <p>{t('tips.surplusStrength')}</p>
            </>
          )}
          {goal === 'maintenance' && (
            <>
              <p>{t('tips.maintenanceVariation')}</p>
              <p>{t('tips.maintenanceWeeklyAverage')}</p>
            </>
          )}
        </div>
      </Content>
    </Wrapper>
  )
}
