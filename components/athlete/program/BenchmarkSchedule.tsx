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
import { useLocale } from '@/i18n/client';

interface BenchmarkScheduleProps {
  programId: string;
  basePath?: string;
}

type AppLocale = 'en' | 'sv';

interface BenchmarkTest {
  id?: string;
  testType: string;
  week: number;
  completed?: boolean;
  required?: boolean;
  daysUntil?: number;
  dueDate?: string;
  results?: {
    lt2Pace?: number;
    lt2HR?: number;
    vdot?: number;
  };
}

function getAppLocale(locale: string): AppLocale {
  return locale.startsWith('sv') ? 'sv' : 'en';
}

function text(locale: AppLocale, svText: string, enText: string): string {
  return locale === 'sv' ? svText : enText;
}

export function BenchmarkSchedule({ programId, basePath = '' }: BenchmarkScheduleProps) {
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<BenchmarkTest[]>([]);
  const locale = getAppLocale(useLocale());

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

    void fetchBenchmarks();
  }, [programId]);

  if (loading) {
    return <div>{text(locale, 'Laddar testschema...', 'Loading test schedule...')}</div>;
  }

  if (tests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {text(locale, 'Testschema', 'Test schedule')}
          </CardTitle>
          <CardDescription>{text(locale, 'Inga fälttester planerade', 'No field tests planned')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {text(
              locale,
              'Ditt program innehåller inga planerade fälttester. Kontakta din tränare om du vill lägga till tester.',
              'Your program does not include any planned field tests. Contact your coach if you want to add tests.'
            )}
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
            <p className="font-medium">{text(locale, 'Du har kommande obligatoriska tester inom 7 dagar!', 'You have required tests coming up within 7 days!')}</p>
            <p className="text-sm mt-1">
              {text(locale, 'Se till att genomföra dessa för att hålla ditt program uppdaterat.', 'Complete them to keep your program up to date.')}
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
              {text(locale, 'Kommande tester', 'Upcoming tests')} ({upcomingTests.length})
            </CardTitle>
            <CardDescription>
              {text(locale, 'Planerade fälttester för att följa dina framsteg', 'Planned field tests to track your progress')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingTests.map((test, i) => (
                <TestCard key={i} test={test} isCompleted={false} basePath={basePath} locale={locale} />
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
              {text(locale, 'Genomförda tester', 'Completed tests')} ({completedTests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedTests.map((test, i) => (
                <TestCard key={i} test={test} isCompleted={true} basePath={basePath} locale={locale} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TestCard({ test, isCompleted, basePath = '', locale }: { test: BenchmarkTest; isCompleted: boolean; basePath?: string; locale: AppLocale }) {
  const isCritical = !isCompleted && test.daysUntil !== undefined && test.daysUntil < 7 && test.required;

  return (
    <div className={`border rounded-lg p-4 ${isCritical ? 'border-red-300 bg-red-50' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium">{getTestTypeName(test.testType, locale)}</h4>
            {isCompleted && (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle className="h-3 w-3 mr-1" />
                {text(locale, 'Klar', 'Done')}
              </Badge>
            )}
            {test.required && !isCompleted && (
              <Badge variant="destructive">{text(locale, 'Obligatorisk', 'Required')}</Badge>
            )}
            {!test.required && !isCompleted && (
              <Badge variant="outline">{text(locale, 'Valfri', 'Optional')}</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{text(locale, 'Vecka', 'Week')} {test.week}</p>
        </div>
      </div>

      {/* Purpose */}
      <div className="mb-3">
        <p className="text-sm">{getTestPurpose(test.testType, locale)}</p>
      </div>

      {/* Timing */}
      {!isCompleted && test.dueDate && (
        <div className="flex items-center gap-2 mb-3 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className={isCritical ? 'text-red-700 font-medium' : 'text-muted-foreground'}>
            {isCritical
              ? text(locale, `Deadline om ${test.daysUntil} dagar`, `Deadline in ${test.daysUntil} days`)
              : text(locale, `Om ${test.daysUntil} dagar`, `In ${test.daysUntil} days`)}
          </span>
        </div>
      )}

      {/* Results */}
      {isCompleted && test.results && (
        <div className="p-3 bg-muted rounded mb-3">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <p className="font-medium text-sm">{text(locale, 'Testresultat', 'Test results')}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {test.results.lt2Pace && (
              <div>
                <span className="text-muted-foreground">{text(locale, 'LT2 tempo:', 'LT2 pace:')}</span>
                <span className="font-mono ml-1">{test.results.lt2Pace.toFixed(2)} min/km</span>
              </div>
            )}
            {test.results.lt2HR && (
              <div>
                <span className="text-muted-foreground">{text(locale, 'LT2 puls:', 'LT2 HR:')}</span>
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
          <Link href={`${basePath}/athlete/tests/new?type=${test.testType}`}>
            {text(locale, 'Genomför test', 'Complete test')}
          </Link>
        </Button>
      ) : (
        <Button variant="outline" className="w-full" asChild>
          <Link href={`${basePath}/athlete/tests/${test.id}`}>
            {text(locale, 'Visa resultat', 'View results')}
          </Link>
        </Button>
      )}
    </div>
  );
}

function getTestTypeName(testType: string, locale: AppLocale): string {
  const names: Record<string, Record<AppLocale, string>> = {
    THIRTY_MIN_TT: { sv: '30-minuters tidskörning', en: '30-minute time trial' },
    HR_DRIFT: { sv: 'HR-drift test', en: 'HR drift test' },
    CRITICAL_VELOCITY: { sv: 'Critical Velocity test', en: 'Critical Velocity test' },
    LACTATE_THRESHOLD: { sv: 'Laktattröskel test', en: 'Lactate threshold test' },
    FIVE_K_TT: { sv: '5K tidskörning', en: '5K time trial' },
  };
  return names[testType]?.[locale] || testType;
}

function getTestPurpose(testType: string, locale: AppLocale): string {
  const purposes: Record<string, Record<AppLocale, string>> = {
    THIRTY_MIN_TT: {
      sv: 'Guldstandard för att bestämma din lactattröskelnivå (LT2). Används för att uppdatera dina träningszoner.',
      en: 'Gold standard for determining your lactate threshold level (LT2). Used to update your training zones.',
    },
    HR_DRIFT: {
      sv: 'Validerar att ditt lättatempo verkligen är lätt. Drift <5% indikerar korrekt tempo under LT1.',
      en: 'Validates that your easy pace is truly easy. Drift <5% indicates correct pacing below LT1.',
    },
    CRITICAL_VELOCITY: {
      sv: 'Matematisk modell för att uppskatta din tröskel. Kräver 2-4 tester på olika distanser.',
      en: 'Mathematical model for estimating your threshold. Requires 2-4 tests across different distances.',
    },
    LACTATE_THRESHOLD: {
      sv: 'Mäter laktatnivåer vid olika intensiteter för att bestämma dina trösklar.',
      en: 'Measures lactate levels at different intensities to determine your thresholds.',
    },
    FIVE_K_TT: {
      sv: 'Kort maxtest för att uppskatta din VO₂max och aktuella kondition.',
      en: 'Short maximal test to estimate your VO2 max and current fitness.',
    },
  };
  return purposes[testType]?.[locale] || text(locale, 'Ett test för att följa dina framsteg.', 'A test to track your progress.');
}
