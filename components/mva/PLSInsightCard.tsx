'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Brain } from 'lucide-react'

interface PLSInsight {
  summary: string
  keyDrivers: string[]
  recommendations: string[]
}

interface PLSInsightCardProps {
  insight: PLSInsight | null
}

export function PLSInsightCard({ insight }: PLSInsightCardProps) {
  if (!insight) return null

  return (
    <Card className="dark:bg-slate-900/50 dark:border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 dark:text-white">
          <Brain className="h-5 w-5" />
          AI-insikter
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm dark:text-slate-300 leading-relaxed">
          {insight.summary}
        </p>

        {insight.keyDrivers.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 dark:text-white">Nyckeldrivare</h4>
            <ul className="space-y-1">
              {insight.keyDrivers.map((driver, i) => (
                <li key={i} className="text-sm dark:text-slate-300 flex items-start gap-2">
                  <span className="text-muted-foreground mt-1 shrink-0">&#8226;</span>
                  {driver}
                </li>
              ))}
            </ul>
          </div>
        )}

        {insight.recommendations.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 dark:text-white">Rekommendationer</h4>
            <ul className="space-y-1">
              {insight.recommendations.map((rec, i) => (
                <li key={i} className="text-sm dark:text-slate-300 flex items-start gap-2">
                  <span className="text-muted-foreground mt-1 shrink-0">&#8226;</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
