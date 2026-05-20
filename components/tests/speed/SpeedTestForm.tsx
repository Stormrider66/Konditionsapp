'use client'

/**
 * Speed Test Form Container
 *
 * Container component for all speed-related tests:
 * - Sprint tests (5m-40m)
 * - RSA (Repeated Sprint Ability)
 */

import { useState } from 'react'
import { useLocale } from 'next-intl'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Timer, Repeat, Gauge } from 'lucide-react'
import { SprintTestForm } from './SprintTestForm'
import { RSATestForm } from './RSATestForm'

interface Client {
  id: string
  name: string
  weight: number
  gender: 'MALE' | 'FEMALE'
}

interface SpeedTestFormProps {
  clients: Client[]
  onTestSaved?: (test: any) => void
}

type SpeedTestType = 'sprint' | 'rsa'

export function SpeedTestForm({ clients, onTestSaved }: SpeedTestFormProps) {
  const locale = useLocale()
  const dateLocale = locale === 'sv' ? 'sv-SE' : 'en-US'
  const [testType, setTestType] = useState<SpeedTestType>('sprint')
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
            <Gauge className="h-5 w-5" />
            {locale === 'sv' ? 'Hastighetstest' : 'Speed tests'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {locale === 'sv'
              ? 'Inga klienter hittades. Lägg till klienter för att kunna registrera test.'
              : 'No clients found. Add clients before registering tests.'}
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
            <Gauge className="h-5 w-5" />
            {locale === 'sv' ? 'Hastighetstest' : 'Speed tests'}
          </CardTitle>
          <CardDescription>
            {locale === 'sv'
              ? 'Mät sprint- och accelerationsförmåga samt uthållighet vid upprepade sprinter'
              : 'Measure sprint speed, acceleration, and repeated sprint ability'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={testType} onValueChange={(v) => setTestType(v as SpeedTestType)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sprint" className="flex items-center gap-2">
                <Timer className="h-4 w-4" />
                Sprint
              </TabsTrigger>
              <TabsTrigger value="rsa" className="flex items-center gap-2">
                <Repeat className="h-4 w-4" />
                RSA
              </TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="sprint" className="mt-0">
                <SprintTestForm clients={clients} onTestSaved={handleTestSaved} />
              </TabsContent>

              <TabsContent value="rsa" className="mt-0">
                <RSATestForm clients={clients} onTestSaved={handleTestSaved} />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Recent saved tests */}
      {savedTests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {locale === 'sv' ? 'Senaste sparade test' : 'Latest saved tests'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {savedTests.slice(0, 5).map((test) => (
                <div
                  key={test.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">
                      {test.client?.name || (locale === 'sv' ? 'Okänd klient' : 'Unknown client')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {test.protocol?.replace(/_/g, ' ')} -{' '}
                      {new Date(test.testDate).toLocaleDateString(dateLocale)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {test.primaryResult} {test.primaryUnit}
                    </p>
                    {test.secondaryResult && (
                      <p className="text-xs text-muted-foreground">
                        FI: {test.secondaryResult}%
                      </p>
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
export { SprintTestForm } from './SprintTestForm'
export { RSATestForm } from './RSATestForm'
