'use client'

/**
 * Power Test Form Container
 *
 * Container component for all power-related tests:
 * - Vertical Jump (CMJ, SJ, DJ)
 * - Standing Long Jump
 * - Medicine Ball Throw
 */

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from '@/components/ui/GlassCard'
import { ArrowUp, MoveHorizontal, Target, Zap } from 'lucide-react'
import { VerticalJumpForm } from './VerticalJumpForm'
import { StandingLongJumpForm } from './StandingLongJumpForm'
import { MedicineBallThrowForm } from './MedicineBallThrowForm'

interface Client {
  id: string
  name: string
  weight: number
  gender: 'MALE' | 'FEMALE'
}

interface PowerTestFormProps {
  clients: Client[]
  onTestSaved?: (test: any) => void
}

type PowerTestType = 'vertical-jump' | 'standing-long-jump' | 'medicine-ball'

export function PowerTestForm({ clients, onTestSaved }: PowerTestFormProps) {
  const [testType, setTestType] = useState<PowerTestType>('vertical-jump')
  const [savedTests, setSavedTests] = useState<any[]>([])

  const handleTestSaved = (test: any) => {
    setSavedTests((prev) => [test, ...prev])
    onTestSaved?.(test)
  }

  if (clients.length === 0) {
    return (
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-slate-900 dark:text-white" />
            <span className="text-slate-900 dark:text-white">Krafttest</span>
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <p className="text-slate-500 dark:text-slate-400">
            Inga klienter hittades. Lägg till klienter för att kunna registrera test.
          </p>
        </GlassCardContent>
      </GlassCard>
    )
  }

  return (
    <div className="space-y-6">
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-slate-900 dark:text-white" />
            <span className="text-slate-900 dark:text-white">Krafttest</span>
          </GlassCardTitle>
          <GlassCardDescription className="text-slate-500 dark:text-slate-400">
            Mät explosiv kraft och styrka genom hopp- och kasttest
          </GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent>
          <Tabs value={testType} onValueChange={(v) => setTestType(v as PowerTestType)}>
            <TabsList className="grid w-full grid-cols-3 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm">
              <TabsTrigger value="vertical-jump" className="flex items-center gap-2">
                <ArrowUp className="h-4 w-4" />
                <span className="hidden sm:inline">Vertikalhopp</span>
                <span className="sm:hidden">Vert.</span>
              </TabsTrigger>
              <TabsTrigger value="standing-long-jump" className="flex items-center gap-2">
                <MoveHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Längdhopp</span>
                <span className="sm:hidden">Längd</span>
              </TabsTrigger>
              <TabsTrigger value="medicine-ball" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline">Medicinboll</span>
                <span className="sm:hidden">Med.boll</span>
              </TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="vertical-jump" className="mt-0">
                <VerticalJumpForm clients={clients} onTestSaved={handleTestSaved} />
              </TabsContent>

              <TabsContent value="standing-long-jump" className="mt-0">
                <StandingLongJumpForm clients={clients} onTestSaved={handleTestSaved} />
              </TabsContent>

              <TabsContent value="medicine-ball" className="mt-0">
                <MedicineBallThrowForm clients={clients} onTestSaved={handleTestSaved} />
              </TabsContent>
            </div>
          </Tabs>
        </GlassCardContent>
      </GlassCard>

      {/* Recent saved tests */}
      {savedTests.length > 0 && (
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="text-lg text-slate-900 dark:text-white">Senaste sparade test</GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="space-y-2">
              {savedTests.slice(0, 5).map((test) => (
                <div
                  key={test.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-white/5"
                >
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{test.client?.name || 'Okänd klient'}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {test.protocol?.replace(/_/g, ' ')} -{' '}
                      {new Date(test.testDate).toLocaleDateString('sv-SE')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {test.primaryResult} {test.primaryUnit}
                    </p>
                    {test.benchmarkTier && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">{test.benchmarkTier}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </GlassCardContent>
        </GlassCard>
      )}
    </div>
  )
}

// Export sub-components for individual use
export { VerticalJumpForm } from './VerticalJumpForm'
export { StandingLongJumpForm } from './StandingLongJumpForm'
export { MedicineBallThrowForm } from './MedicineBallThrowForm'
