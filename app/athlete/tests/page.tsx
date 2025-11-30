// app/athlete/tests/page.tsx
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
import {
  ArrowLeft,
  Calendar,
  TrendingUp,
  Activity,
  Heart,
  Zap,
} from 'lucide-react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'

export default async function AthleteTestsPage() {
  const user = await requireAthlete()

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

  // Fetch all tests for this client
  const tests = await prisma.test.findMany({
    where: {
      clientId: athleteAccount.clientId,
      status: 'COMPLETED',
    },
    orderBy: {
      testDate: 'desc',
    },
  })

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <Link href="/athlete/dashboard">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tillbaka till dashboard
        </Button>
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mina Konditionstester</h1>
        <p className="text-muted-foreground">
          Översikt över alla dina genomförda konditionstester och resultat
        </p>
      </div>

      {/* Test Stats */}
      {tests.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Totalt tester
                </CardTitle>
                <Activity className="h-5 w-5 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{tests.length}</div>
            </CardContent>
          </Card>

          {tests[0]?.vo2max && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Senaste VO2max
                  </CardTitle>
                  <Zap className="h-5 w-5 text-red-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{tests[0].vo2max.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground mt-1">ml/kg/min</p>
              </CardContent>
            </Card>
          )}

          {tests[0]?.maxHR && (
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
                <div className="text-3xl font-bold">{tests[0].maxHR}</div>
                <p className="text-xs text-muted-foreground mt-1">bpm</p>
              </CardContent>
            </Card>
          )}

          {tests.length > 1 && tests[0]?.vo2max && tests[1]?.vo2max && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Förbättring
                  </CardTitle>
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {(tests[0].vo2max - tests[1].vo2max > 0 ? '+' : '')}
                  {(tests[0].vo2max - tests[1].vo2max).toFixed(1)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">ml/kg/min</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Alla Tester</CardTitle>
          <CardDescription>
            Klicka på ett test för att se detaljerad rapport
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Inga tester genomförda ännu</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Plats</TableHead>
                    <TableHead className="text-center">VO2max</TableHead>
                    <TableHead className="text-center">Max Puls</TableHead>
                    <TableHead className="text-center">Aerob Tröskel</TableHead>
                    <TableHead className="text-center">Anaerob Tröskel</TableHead>
                    <TableHead className="text-right">Åtgärd</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tests.map((test) => (
                    <TableRow key={test.id}>
                      <TableCell className="font-medium">
                        {format(new Date(test.testDate), 'PPP', { locale: sv })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {formatTestType(test.testType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {test.location || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {test.vo2max ? `${test.vo2max.toFixed(1)}` : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {test.maxHR ? `${test.maxHR} bpm` : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {(test.aerobicThreshold as any)?.heartRate
                          ? `${(test.aerobicThreshold as any).heartRate} bpm`
                          : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {(test.anaerobicThreshold as any)?.heartRate
                          ? `${(test.anaerobicThreshold as any).heartRate} bpm`
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/athlete/tests/${test.id}`}>
                          <Button variant="ghost" size="sm">
                            Visa Rapport
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* VO2max Progress Chart - if multiple tests */}
      {tests.length > 1 && tests.some((t) => t.vo2max) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>VO2max Progression</CardTitle>
            <CardDescription>
              Din utveckling över tid
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-end gap-4">
              {tests
                .slice()
                .reverse()
                .filter((t) => t.vo2max)
                .map((test, index) => {
                  const maxVo2 = Math.max(
                    ...tests.filter((t) => t.vo2max).map((t) => t.vo2max!)
                  )
                  const height = (test.vo2max! / maxVo2) * 100

                  return (
                    <div key={test.id} className="flex-1 flex flex-col items-center">
                      <div className="text-sm font-semibold mb-2">
                        {test.vo2max!.toFixed(1)}
                      </div>
                      <div
                        className="w-full bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t-lg transition-all hover:from-blue-600 hover:to-cyan-500"
                        style={{ height: `${height}%`, minHeight: '40px' }}
                      ></div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {format(new Date(test.testDate), 'MMM yy', { locale: sv })}
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}
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
