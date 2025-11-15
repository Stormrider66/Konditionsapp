'use client';

/**
 * Benchmark Schedule (Athlete Portal)
 *
 * Displays upcoming field tests with:
 * - Test types and purposes
 * - Due dates
 * - Critical flags for approaching deadlines
 * - Completed test results
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, CheckCircle, AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';

interface BenchmarkScheduleProps {
  programId: string;
}

export function BenchmarkSchedule({ programId }: BenchmarkScheduleProps) {
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<any[]>([]);

  useEffect(() => {
    async function fetchBenchmarks() {
      setLoading(true);
      try {
        // Fetch field test schedule from program
        const response = await fetch(`/api/programs/${programId}/benchmarks`);
        if (response.ok) {
          const data = await response.json();
          setTests(data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch benchmarks:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchBenchmarks();
  }, [programId]);

  if (loading) {
    return <div>Laddar testschema...</div>;
  }

  if (tests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Testschema
          </CardTitle>
          <CardDescription>Inga fälttester planerade</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Ditt program innehåller inga planerade fälttester. Kontakta din tränare om du vill lägga till tester.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Separate upcoming and completed tests
  const upcomingTests = tests.filter(t => !t.completed);
  const completedTests = tests.filter(t => t.completed);

  return (
    <div className="space-y-6">
      {/* Critical Tests Alert */}
      {upcomingTests.some(t => t.daysUntil !== undefined && t.daysUntil < 7 && t.required) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium">Du har kommande obligatoriska tester inom 7 dagar!</p>
            <p className="text-sm mt-1">
              Se till att genomföra dessa för att hålla ditt program uppdaterat.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Upcoming Tests */}
      {upcomingTests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Kommande tester ({upcomingTests.length})
            </CardTitle>
            <CardDescription>
              Planerade fälttester för att följa dina framsteg
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingTests.map((test, i) => (
                <TestCard key={i} test={test} isCompleted={false} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Tests */}
      {completedTests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Genomförda tester ({completedTests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedTests.map((test, i) => (
                <TestCard key={i} test={test} isCompleted={true} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TestCard({ test, isCompleted }: { test: any; isCompleted: boolean }) {
  const isCritical = !isCompleted && test.daysUntil !== undefined && test.daysUntil < 7 && test.required;

  return (
    <div className={`border rounded-lg p-4 ${isCritical ? 'border-red-300 bg-red-50' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium">{getTestTypeName(test.testType)}</h4>
            {isCompleted && (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle className="h-3 w-3 mr-1" />
                Klar
              </Badge>
            )}
            {test.required && !isCompleted && (
              <Badge variant="destructive">Obligatorisk</Badge>
            )}
            {!test.required && !isCompleted && (
              <Badge variant="outline">Valfri</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">Vecka {test.week}</p>
        </div>
      </div>

      {/* Purpose */}
      <div className="mb-3">
        <p className="text-sm">{getTestPurpose(test.testType)}</p>
      </div>

      {/* Timing */}
      {!isCompleted && test.dueDate && (
        <div className="flex items-center gap-2 mb-3 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className={isCritical ? 'text-red-700 font-medium' : 'text-muted-foreground'}>
            {isCritical ? `⚠️ Deadline om ${test.daysUntil} dagar` : `Om ${test.daysUntil} dagar`}
          </span>
        </div>
      )}

      {/* Results */}
      {isCompleted && test.results && (
        <div className="p-3 bg-muted rounded mb-3">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <p className="font-medium text-sm">Testresultat</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {test.results.lt2Pace && (
              <div>
                <span className="text-muted-foreground">LT2 tempo:</span>
                <span className="font-mono ml-1">{test.results.lt2Pace.toFixed(2)} min/km</span>
              </div>
            )}
            {test.results.lt2HR && (
              <div>
                <span className="text-muted-foreground">LT2 puls:</span>
                <span className="font-mono ml-1">{test.results.lt2HR} bpm</span>
              </div>
            )}
            {test.results.vdot && (
              <div>
                <span className="text-muted-foreground">VDOT:</span>
                <span className="font-mono ml-1">{test.results.vdot.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Button */}
      {!isCompleted ? (
        <Button className="w-full" asChild>
          <Link href={`/athlete/tests/new?type=${test.testType}`}>
            Genomför test
          </Link>
        </Button>
      ) : (
        <Button variant="outline" className="w-full" asChild>
          <Link href={`/athlete/tests/${test.id}`}>
            Visa resultat
          </Link>
        </Button>
      )}
    </div>
  );
}

function getTestTypeName(testType: string): string {
  const names: Record<string, string> = {
    'THIRTY_MIN_TT': '30-minuters tidskörning',
    'HR_DRIFT': 'HR-drift test',
    'CRITICAL_VELOCITY': 'Critical Velocity test',
    'LACTATE_THRESHOLD': 'Laktattröskel test',
    'FIVE_K_TT': '5K tidskörning'
  };
  return names[testType] || testType;
}

function getTestPurpose(testType: string): string {
  const purposes: Record<string, string> = {
    'THIRTY_MIN_TT': 'Guldstandard för att bestämma din lactattröskelnivå (LT2). Används för att uppdatera dina träningszoner.',
    'HR_DRIFT': 'Validerar att ditt lättatempo verkligen är lätt. Drift <5% indikerar korrekt tempo under LT1.',
    'CRITICAL_VELOCITY': 'Matematisk modell för att uppskatta din tröskel. Kräver 2-4 tester på olika distanser.',
    'LACTATE_THRESHOLD': 'Mäter laktatnivåer vid olika intensiteter för att bestämma dina trösklar.',
    'FIVE_K_TT': 'Kort maxtest för att uppskatta din VO₂max och aktuella kondition.'
  };
  return purposes[testType] || 'Ett test för att följa dina framsteg.';
}
