'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { useTranslations } from '@/i18n/client'

interface MacroRatio {
  proteinPercent: number
  carbsPercent: number
  fatPercent: number
}

interface MacroPieChartProps {
  macroRatio: MacroRatio
}

const COLORS = {
  protein: '#3b82f6',
  carbs: '#f59e0b',
  fat: '#ef4444',
}

export function MacroPieChart({ macroRatio }: MacroPieChartProps) {
  const t = useTranslations('components.macroPieChart')
  const tooltipStyle = {
    backgroundColor: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    color: 'hsl(var(--popover-foreground))',
    fontSize: 12,
  }
  const data = [
    { name: t('macros.protein'), value: macroRatio.proteinPercent, color: COLORS.protein },
    { name: t('macros.carbs'), value: macroRatio.carbsPercent, color: COLORS.carbs },
    { name: t('macros.fat'), value: macroRatio.fatPercent, color: COLORS.fat },
  ]

  return (
    <GlassCard>
      <GlassCardHeader className="pb-2">
        <GlassCardTitle className="text-base text-cyan-600 dark:text-cyan-400">{t('title')}</GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number) => [`${value}%`, '']}
              />
              <Legend
                formatter={(value) => (
                  <span className="text-xs text-slate-600 dark:text-slate-300">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center mt-2">
          <div>
            <p className="text-lg font-bold text-blue-400">{macroRatio.proteinPercent}%</p>
            <p className="text-[10px] text-slate-500">{t('macros.protein')}</p>
          </div>
          <div>
            <p className="text-lg font-bold text-amber-400">{macroRatio.carbsPercent}%</p>
            <p className="text-[10px] text-slate-500">{t('macros.carbsShort')}</p>
          </div>
          <div>
            <p className="text-lg font-bold text-red-400">{macroRatio.fatPercent}%</p>
            <p className="text-[10px] text-slate-500">{t('macros.fat')}</p>
          </div>
        </div>
      </GlassCardContent>
    </GlassCard>
  )
}
