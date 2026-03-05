'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'

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
  const data = [
    { name: 'Protein', value: macroRatio.proteinPercent, color: COLORS.protein },
    { name: 'Kolhydrater', value: macroRatio.carbsPercent, color: COLORS.carbs },
    { name: 'Fett', value: macroRatio.fatPercent, color: COLORS.fat },
  ]

  return (
    <GlassCard>
      <GlassCardHeader className="pb-2">
        <GlassCardTitle className="text-base text-cyan-400">Makrofördelning</GlassCardTitle>
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
                contentStyle={{
                  backgroundColor: 'rgba(15,23,42,0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: 12,
                }}
                formatter={(value: number) => [`${value}%`, '']}
              />
              <Legend
                formatter={(value) => (
                  <span className="text-xs text-slate-300">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center mt-2">
          <div>
            <p className="text-lg font-bold text-blue-400">{macroRatio.proteinPercent}%</p>
            <p className="text-[10px] text-slate-500">Protein</p>
          </div>
          <div>
            <p className="text-lg font-bold text-amber-400">{macroRatio.carbsPercent}%</p>
            <p className="text-[10px] text-slate-500">Kolhydr.</p>
          </div>
          <div>
            <p className="text-lg font-bold text-red-400">{macroRatio.fatPercent}%</p>
            <p className="text-[10px] text-slate-500">Fett</p>
          </div>
        </div>
      </GlassCardContent>
    </GlassCard>
  )
}
