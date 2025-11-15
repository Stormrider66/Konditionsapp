// app/athlete/tests/[id]/page.tsx
import { redirect } from 'next/navigation'
import { requireAthlete } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowLeft, Calendar, MapPin, User, TrendingUp, Heart, Zap } from 'lucide-react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { TestChart } from '@/components/charts/TestChart'

interface AthleteTestDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function AthleteTestDetailPage({ params }: AthleteTestDetailPageProps) {
  const user = await requireAthlete()
  const { id } = await params

  // Get athlete account
  const athleteAccount = await prisma.athleteAccount.findUnique({
    where: { userId: user.id },
    include: {
      client: true,
    },
  })

  if (!athleteAccount) {
    redirect('/login')
  }

  // Fetch test with stages
  const test = await prisma.test.findUnique({
    where: { id },
    include: {
      testStages: {
        orderBy: { sequence: 'asc' },
      },
      client: true,
    },
  })

  // Verify test belongs to this athlete
  if (!test || test.clientId !== athleteAccount.clientId) {
    redirect('/athlete/tests')
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <Link href="/athlete/tests">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tillbaka till tester
        </Button>
      </Link>

      {/* Test Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">Testrapport</h1>
          <Badge variant="outline">{formatTestType(test.testType)}</Badge>
        </div>
        <div className="flex flex-wrap gap-4 text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {format(new Date(test.testDate), 'PPP', { locale: sv })}
          </div>
          {test.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {test.location}
            </div>
          )}
          {test.testLeader && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Testledare: {test.testLeader}
            </div>
          )}
        </div>
      </div>

      {/* Key Results */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                VO2max
              </CardTitle>
              <Zap className="h-5 w-5 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {test.vo2max ? test.vo2max.toFixed(1) : '-'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">ml/kg/min</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Max Puls
              </CardTitle>
              <Heart className="h-5 w-5 text-pink-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{test.maxHR || '-'}</div>
            <p className="text-xs text-muted-foreground mt-1">bpm</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Max Laktat
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {test.maxLactate ? test.maxLactate.toFixed(1) : '-'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">mmol/L</p>
          </CardContent>
        </Card>
      </div>

      {/* Test Chart */}
      {test.testStages.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Testresultat</CardTitle>
            <CardDescription>
              Puls och laktat under testet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TestChart test={test as any} client={test.client as any} />
          </CardContent>
        </Card>
      )}

      {/* Thresholds */}
      {(test.aerobicThreshold || test.anaerobicThreshold) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Tröskelvärden</CardTitle>
            <CardDescription>
              Dina träningszoner baserade på testresultaten
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {test.aerobicThreshold && (
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    Aerob Tröskel
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Puls:</div>
                    <div className="font-medium">
                      {test.aerobicThreshold.heartRate} bpm
                    </div>
                    <div className="text-muted-foreground">
                      {test.testType === 'RUNNING'
                        ? 'Hastighet:'
                        : test.testType === 'CYCLING'
                        ? 'Watt:'
                        : 'Tempo:'}
                    </div>
                    <div className="font-medium">
                      {test.aerobicThreshold.value.toFixed(1)}{' '}
                      {test.aerobicThreshold.unit}
                    </div>
                    <div className="text-muted-foreground">Laktat:</div>
                    <div className="font-medium">
                      {test.aerobicThreshold.lactate?.toFixed(1) || '-'} mmol/L
                    </div>
                  </div>
                </div>
              )}

              {test.anaerobicThreshold && (
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    Anaerob Tröskel
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Puls:</div>
                    <div className="font-medium">
                      {test.anaerobicThreshold.heartRate} bpm
                    </div>
                    <div className="text-muted-foreground">
                      {test.testType === 'RUNNING'
                        ? 'Hastighet:'
                        : test.testType === 'CYCLING'
                        ? 'Watt:'
                        : 'Tempo:'}
                    </div>
                    <div className="font-medium">
                      {test.anaerobicThreshold.value.toFixed(1)}{' '}
                      {test.anaerobicThreshold.unit}
                    </div>
                    <div className="text-muted-foreground">Laktat:</div>
                    <div className="font-medium">
                      {test.anaerobicThreshold.lactate?.toFixed(1) || '-'} mmol/L
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Training Zones */}
      {test.trainingZones && Array.isArray(test.trainingZones) && test.trainingZones.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Träningszoner</CardTitle>
            <CardDescription>
              Rekommenderade träningszoner baserade på ditt test
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {test.trainingZones.map((zone: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
                      style={{
                        backgroundColor: getZoneColor(zone.zone),
                      }}
                    >
                      {zone.zone}
                    </div>
                    <div>
                      <div className="font-medium">{zone.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {zone.minHR} - {zone.maxHR} bpm
                      </div>
                    </div>
                  </div>
                  {zone.minValue && zone.maxValue && (
                    <div className="text-right">
                      <div className="font-medium">
                        {zone.minValue.toFixed(1)} - {zone.maxValue.toFixed(1)}{' '}
                        {zone.unit}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Stages Table */}
      <Card>
        <CardHeader>
          <CardTitle>Testdata</CardTitle>
          <CardDescription>
            Detaljerad data från varje teststeg
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Steg</TableHead>
                  <TableHead>
                    {test.testType === 'RUNNING'
                      ? 'Hastighet (km/h)'
                      : test.testType === 'CYCLING'
                      ? 'Watt'
                      : 'Tempo (min/km)'}
                  </TableHead>
                  {test.testType === 'RUNNING' && <TableHead>Lutning (%)</TableHead>}
                  <TableHead>Puls (bpm)</TableHead>
                  <TableHead>Laktat (mmol/L)</TableHead>
                  {test.testStages.some((s) => s.vo2) && <TableHead>VO2</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {test.testStages.map((stage) => (
                  <TableRow key={stage.id}>
                    <TableCell className="font-medium">{stage.sequence}</TableCell>
                    <TableCell>
                      {stage.speed || stage.power || stage.pace || '-'}
                    </TableCell>
                    {test.testType === 'RUNNING' && (
                      <TableCell>{stage.incline || 0}</TableCell>
                    )}
                    <TableCell>{stage.heartRate || '-'}</TableCell>
                    <TableCell>
                      {stage.lactate ? stage.lactate.toFixed(1) : '-'}
                    </TableCell>
                    {test.testStages.some((s) => s.vo2) && (
                      <TableCell>
                        {stage.vo2 ? stage.vo2.toFixed(1) : '-'}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Helper functions
function formatTestType(type: string): string {
  const types: Record<string, string> = {
    RUNNING: 'Löpning',
    CYCLING: 'Cykling',
    SKIING: 'Skidåkning',
  }
  return types[type] || type
}

function getZoneColor(zone: number): string {
  const colors: Record<number, string> = {
    1: '#22c55e', // green
    2: '#84cc16', // lime
    3: '#eab308', // yellow
    4: '#f97316', // orange
    5: '#ef4444', // red
  }
  return colors[zone] || '#6b7280'
}
