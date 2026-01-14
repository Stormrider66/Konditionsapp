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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Krafttest
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Inga klienter hittades. Lägg till klienter för att kunna registrera test.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Krafttest
          </CardTitle>
          <CardDescription>
            Mät explosiv kraft och styrka genom hopp- och kasttest
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={testType} onValueChange={(v) => setTestType(v as PowerTestType)}>
            <TabsList className="grid w-full grid-cols-3">
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
        </CardContent>
      </Card>

      {/* Recent saved tests */}
      {savedTests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Senaste sparade test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {savedTests.slice(0, 5).map((test) => (
                <div
                  key={test.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{test.client?.name || 'Okänd klient'}</p>
                    <p className="text-sm text-muted-foreground">
                      {test.protocol?.replace(/_/g, ' ')} -{' '}
                      {new Date(test.testDate).toLocaleDateString('sv-SE')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {test.primaryResult} {test.primaryUnit}
                    </p>
                    {test.benchmarkTier && (
                      <p className="text-xs text-muted-foreground">{test.benchmarkTier}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Export sub-components for individual use
export { VerticalJumpForm } from './VerticalJumpForm'
export { StandingLongJumpForm } from './StandingLongJumpForm'
export { MedicineBallThrowForm } from './MedicineBallThrowForm'
