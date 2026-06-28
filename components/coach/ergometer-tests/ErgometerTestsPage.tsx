'use client';

/**
 * Coach Ergometer Tests Page
 *
 * Manage ergometer field tests for athletes:
 * - Create new tests (Row, SkiErg, BikeErg, Wattbike, Air Bike)
 * - View test history and progression
 * - Analyze zones and benchmarks
 */

import { useState, useEffect, useCallback } from 'react';
import { ErgometerType } from '@prisma/client';
import { RolePageFrame, RolePageHeader, RolePanel } from '@/components/layouts/role-shell/RolePage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ErgometerFieldTestForm } from '@/components/coach/ergometer-tests';
import { WattbikeCapture } from '@/components/athlete/wattbike';
import { useLocale } from '@/i18n/client';
import { Plus, Activity, TrendingUp, Users, ArrowLeft } from 'lucide-react';

type AppLocale = 'en' | 'sv';

const copy = {
  en: {
    title: 'Ergometer tests',
    description: 'Endurance tests on rowing machine, SkiErg, BikeErg, Wattbike, and Air Bike',
    selectAthlete: 'Select athlete...',
    newTest: 'New test',
    back: 'Back',
    newTestTitle: 'New ergometer test',
    selectTitle: 'Select an athlete',
    selectBody:
      'Select an athlete from the list above to view test history, or click "New test" to run a test.',
    tabs: {
      tests: 'Test history',
      zones: 'Zones',
    },
    testsDescription: (name?: string) => `All ergometer tests for ${name ?? 'the selected athlete'}`,
    noTests: 'No tests registered yet.',
    noTestsHint: 'Click "New test" to add a test.',
    zonesTitle: 'Training zones',
    zonesDescription: 'Calculated zones based on test results',
    noZones: 'No zones calculated yet.',
    noZonesHint: 'Complete a test to calculate training zones.',
    zone: 'Zone',
    avg: 'avg',
  },
  sv: {
    title: 'Ergometertester',
    description: 'Konditionstester på roddmaskin, SkiErg, BikeErg, Wattbike och Air Bike',
    selectAthlete: 'Välj atlet...',
    newTest: 'Nytt test',
    back: 'Tillbaka',
    newTestTitle: 'Nytt ergometertest',
    selectTitle: 'Välj en atlet',
    selectBody:
      'Välj en atlet från listan ovan för att se testhistorik, eller klicka "Nytt test" för att genomföra ett test.',
    tabs: {
      tests: 'Testhistorik',
      zones: 'Zoner',
    },
    testsDescription: (name?: string) => `Alla ergometertester för ${name ?? 'vald atlet'}`,
    noTests: 'Inga tester registrerade än.',
    noTestsHint: 'Klicka "Nytt test" för att lägga till ett test.',
    zonesTitle: 'Träningszoner',
    zonesDescription: 'Beräknade zoner baserat på testresultat',
    noZones: 'Inga zoner beräknade än.',
    noZonesHint: 'Genomför ett test för att beräkna träningszoner.',
    zone: 'Zon',
    avg: 'snitt',
  },
} as const;

function formatDate(date: Date | string, locale: AppLocale) {
  return new Date(date).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US');
}

interface Client {
  id: string;
  name: string;
  gender?: 'MALE' | 'FEMALE';
  weight?: number;
}

interface ErgometerTest {
  id: string;
  ergometerType: ErgometerType;
  testProtocol: string;
  testDate: string;
  avgPower?: number;
  peakPower?: number;
  criticalPower?: number;
}

interface ErgometerZone {
  zone: number;
  name: string;
  nameSwedish: string;
  powerMin: number;
  powerMax: number;
  percentMin: number;
  percentMax: number;
}

export default function CoachErgometerTestsPage() {
  const locale = useLocale() as AppLocale;
  const t = copy[locale] ?? copy.en;
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [showNewTestForm, setShowNewTestForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<ErgometerTest[]>([]);
  const [zones, setZones] = useState<ErgometerZone[]>([]);
  const [loadingTests, setLoadingTests] = useState(false);

  const fetchClientData = useCallback(async () => {
    setLoadingTests(true);
    try {
      const [testsRes, zonesRes] = await Promise.all([
        fetch(`/api/ergometer-tests?clientId=${selectedClientId}`),
        fetch(`/api/ergometer-zones/${selectedClientId}`),
      ]);

      if (testsRes.ok) {
        const data = await testsRes.json();
        setTests(data.data?.tests || []);
      }

      if (zonesRes.ok) {
        const data = await zonesRes.json();
        setZones(data.data?.zones || []);
      }
    } catch (error) {
      console.error('Failed to fetch client data:', error);
    } finally {
      setLoadingTests(false);
    }
  }, [selectedClientId]);

  useEffect(() => {
    async function fetchClients() {
      try {
        const res = await fetch('/api/clients');
        if (res.ok) {
          const data = await res.json();
          setClients(data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch clients:', error);
      } finally {
        setLoading(false);
      }
    }
    void fetchClients();
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      const timeoutId = window.setTimeout(() => {
        void fetchClientData();
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }
  }, [selectedClientId, fetchClientData]);

  const selectedClient = clients.find(c => c.id === selectedClientId);

  // Format athletes for the test form
  const athletesForForm = clients.map(c => ({
    id: c.id,
    name: c.name,
    gender: c.gender,
    weight: c.weight,
  }));

  if (loading) {
    return (
      <RolePageFrame maxWidth="wide">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </RolePageFrame>
    );
  }

  return (
    <RolePageFrame maxWidth="wide">
      <RolePageHeader
        title={
          <span className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-blue-500" />
            {t.title}
          </span>
        }
        description={t.description}
        actions={
          !showNewTestForm ? (
            <>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="w-[220px] bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                  <SelectValue placeholder={t.selectAthlete} />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button onClick={() => setShowNewTestForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                {t.newTest}
              </Button>
            </>
          ) : null
        }
      />

      {/* New test form */}
      {showNewTestForm && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setShowNewTestForm(false)} className="text-slate-600 dark:text-slate-350">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t.back}
            </Button>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{t.newTestTitle}</h2>
          </div>
          <ErgometerFieldTestForm
            athletes={athletesForForm}
            onTestComplete={(_result) => {
              setShowNewTestForm(false);
              // Refresh test list if a client is selected
              if (selectedClientId) {
                void fetchClientData();
              }
            }}
          />
        </div>
      )}

      {/* No client selected and no form */}
      {!selectedClientId && !showNewTestForm && (
        <RolePanel>
          <div className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-blue-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-white">{t.selectTitle}</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
              {t.selectBody}
            </p>
          </div>
        </RolePanel>
      )}

      {/* Client selected - show tabs */}
      {selectedClientId && !showNewTestForm && (
        <div className="space-y-6">
          {/* Live BLE capture — coach capture station, covers iOS athletes */}
          <WattbikeCapture
            clientId={selectedClientId}
            onSaved={() => {
              void fetchClientData();
            }}
          />
          <Tabs defaultValue="tests" className="space-y-6">
          <TabsList className="bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 p-1 rounded-xl gap-1 w-fit flex">
            <TabsTrigger value="tests" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:border data-[state=active]:border-slate-200/80 dark:data-[state=active]:border-blue-500/30 data-[state=active]:shadow-sm">{t.tabs.tests}</TabsTrigger>
            <TabsTrigger value="zones" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:border data-[state=active]:border-slate-200/80 dark:data-[state=active]:border-blue-500/30 data-[state=active]:shadow-sm">{t.tabs.zones}</TabsTrigger>
          </TabsList>

          <TabsContent value="tests">
            <RolePanel>
              <div className="border-b border-zinc-200 p-5 dark:border-white/10">
                <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{t.tabs.tests}</h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {t.testsDescription(selectedClient?.name)}
                </p>
              </div>
              <div className="p-5">
                {loadingTests ? (
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : tests.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-450">
                    <Activity className="h-10 w-10 mx-auto mb-3 opacity-50 text-blue-500" />
                    <p className="font-medium text-slate-800 dark:text-slate-200">{t.noTests}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t.noTestsHint}</p>
                  </div>
                ) : (
                  <ErgometerTestList tests={tests} locale={locale} avgLabel={t.avg} />
                )}
              </div>
            </RolePanel>
          </TabsContent>

          <TabsContent value="zones">
            <RolePanel>
              <div className="border-b border-zinc-200 p-5 dark:border-white/10">
                <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-950 dark:text-zinc-50">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                  {t.zonesTitle}
                </h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {t.zonesDescription}
                </p>
              </div>
              <div className="p-5">
                {loadingTests ? (
                  <Skeleton className="h-40 w-full" />
                ) : zones.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-450">
                    <p className="font-medium text-slate-800 dark:text-slate-200">{t.noZones}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t.noZonesHint}</p>
                  </div>
                ) : (
                  <SimpleZoneGrid zones={zones} locale={locale} zoneLabel={t.zone} />
                )}
              </div>
            </RolePanel>
          </TabsContent>
          </Tabs>
        </div>
      )}
    </RolePageFrame>
  );
}

// ==================== SIMPLE ZONE GRID ====================

const ZONE_COLORS = [
  'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
  'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
  'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30',
  'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/30',
  'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30',
  'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/30',
];

function SimpleZoneGrid({
  zones,
  locale,
  zoneLabel,
}: {
  zones: ErgometerZone[];
  locale: AppLocale;
  zoneLabel: string;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {zones.sort((a, b) => a.zone - b.zone).map((zone) => (
        <div
          key={zone.zone}
          className={`p-3 rounded-lg border text-center transition-all ${ZONE_COLORS[zone.zone - 1] || 'bg-gray-100 dark:bg-slate-800'}`}
        >
          <p className="text-xs font-semibold opacity-85">{zoneLabel} {zone.zone}</p>
          <p className="text-lg font-bold my-0.5">{zone.powerMin}-{zone.powerMax}W</p>
          <p className="text-xs font-medium">{locale === 'sv' ? zone.nameSwedish || zone.name : zone.name}</p>
          <p className="text-[10px] opacity-70">{zone.percentMin}-{zone.percentMax}%</p>
        </div>
      ))}
    </div>
  );
}

// ==================== TEST LIST COMPONENT ====================

function ErgometerTestList({
  tests,
  locale,
  avgLabel,
}: {
  tests: ErgometerTest[];
  locale: AppLocale;
  avgLabel: string;
}) {
  const ERGOMETER_LABELS: Record<string, string> = {
    CONCEPT2_ROW: locale === 'sv' ? 'Concept2 Rodd' : 'Concept2 Row',
    CONCEPT2_SKIERG: 'SkiErg',
    CONCEPT2_BIKEERG: 'BikeErg',
    WATTBIKE: 'Wattbike',
    ASSAULT_BIKE: 'Air Bike',
  };

  const PROTOCOL_LABELS: Record<string, string> = {
    PEAK_POWER_6S: '6s Peak Power',
    PEAK_POWER_7_STROKE: '7-Stroke Max',
    PEAK_POWER_30S: '30s Sprint',
    TT_1K: '1K Time Trial',
    TT_2K: '2K Time Trial',
    TT_10MIN: '10min Max Cal',
    TT_20MIN: '20min FTP',
    MAP_RAMP: 'MAP Ramp',
    CP_3MIN_ALL_OUT: '3min CP Test',
    CP_MULTI_TRIAL: 'Multi-Trial CP',
    INTERVAL_4X4: '4x4min Interval',
  };

  return (
    <div className="space-y-3">
      {tests.map((test) => (
        <div
          key={test.id}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-white/50 dark:bg-slate-900/10 hover:bg-slate-100/80 dark:hover:bg-slate-900/20 border border-slate-200 dark:border-white/5 rounded-lg transition-colors gap-3"
        >
          <div className="flex items-center gap-4">
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{ERGOMETER_LABELS[test.ergometerType] || test.ergometerType}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {PROTOCOL_LABELS[test.testProtocol] || test.testProtocol.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {test.avgPower && (
              <Badge variant="outline" className="border-slate-350 dark:border-white/20 text-slate-700 dark:text-slate-300">{test.avgPower}W {avgLabel}</Badge>
            )}
            {test.criticalPower && (
              <Badge variant="secondary" className="bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400">CP: {test.criticalPower}W</Badge>
            )}
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {formatDate(test.testDate, locale)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
