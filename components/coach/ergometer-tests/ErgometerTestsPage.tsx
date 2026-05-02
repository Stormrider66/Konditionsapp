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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Plus, Activity, TrendingUp, Users, ArrowLeft } from 'lucide-react';

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
    fetchClients();
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      fetchClientData();
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
      <div className="container mx-auto py-8 px-4 max-w-7xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Ergometertester
          </h1>
          <p className="text-muted-foreground text-sm">
            Konditionstester pa roddmaskin, SkiErg, BikeErg, Wattbike och Air Bike
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!showNewTestForm && (
            <>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Valj atlet..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button onClick={() => setShowNewTestForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nytt test
              </Button>
            </>
          )}
        </div>
      </div>

      {/* New test form */}
      {showNewTestForm && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setShowNewTestForm(false)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tillbaka
            </Button>
            <h2 className="text-xl font-semibold">Nytt ergometertest</h2>
          </div>
          <ErgometerFieldTestForm
            athletes={athletesForForm}
            onTestComplete={(result) => {
              setShowNewTestForm(false);
              // Refresh test list if a client is selected
              if (selectedClientId) {
                fetchClientData();
              }
            }}
          />
        </div>
      )}

      {/* No client selected and no form */}
      {!selectedClientId && !showNewTestForm && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Valj en atlet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Valj en atlet fran listan ovan for att se testhistorik, eller klicka &quot;Nytt test&quot; for att genomfora ett test.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Client selected - show tabs */}
      {selectedClientId && !showNewTestForm && (
        <Tabs defaultValue="tests" className="space-y-6">
          <TabsList>
            <TabsTrigger value="tests">Testhistorik</TabsTrigger>
            <TabsTrigger value="zones">Zoner</TabsTrigger>
          </TabsList>

          <TabsContent value="tests">
            <Card>
              <CardHeader>
                <CardTitle>Testhistorik</CardTitle>
                <CardDescription>
                  Alla ergometertester for {selectedClient?.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTests ? (
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : tests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>Inga tester registrerade an.</p>
                    <p className="text-sm">Klicka &quot;Nytt test&quot; for att lagga till ett test.</p>
                  </div>
                ) : (
                  <ErgometerTestList tests={tests} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="zones">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Traningszoner
                </CardTitle>
                <CardDescription>
                  Beraknade zoner baserat pa testresultat
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTests ? (
                  <Skeleton className="h-40 w-full" />
                ) : zones.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Inga zoner beraknade an.</p>
                    <p className="text-sm">Genomfor ett test for att berakna traningszoner.</p>
                  </div>
                ) : (
                  <SimpleZoneGrid zones={zones} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// ==================== SIMPLE ZONE GRID ====================

const ZONE_COLORS = [
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-green-100 text-green-800 border-green-200',
  'bg-yellow-100 text-yellow-800 border-yellow-200',
  'bg-orange-100 text-orange-800 border-orange-200',
  'bg-red-100 text-red-800 border-red-200',
  'bg-purple-100 text-purple-800 border-purple-200',
];

function SimpleZoneGrid({ zones }: { zones: ErgometerZone[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {zones.sort((a, b) => a.zone - b.zone).map((zone) => (
        <div
          key={zone.zone}
          className={`p-3 rounded-lg border text-center ${ZONE_COLORS[zone.zone - 1] || 'bg-gray-100'}`}
        >
          <p className="text-xs font-medium opacity-75">Zon {zone.zone}</p>
          <p className="text-lg font-bold">{zone.powerMin}-{zone.powerMax}W</p>
          <p className="text-xs">{zone.nameSwedish || zone.name}</p>
          <p className="text-[10px] opacity-60">{zone.percentMin}-{zone.percentMax}%</p>
        </div>
      ))}
    </div>
  );
}

// ==================== TEST LIST COMPONENT ====================

function ErgometerTestList({ tests }: { tests: ErgometerTest[] }) {
  const ERGOMETER_LABELS: Record<string, string> = {
    CONCEPT2_ROW: 'Concept2 Rodd',
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
          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div>
              <p className="font-medium">{ERGOMETER_LABELS[test.ergometerType] || test.ergometerType}</p>
              <p className="text-sm text-muted-foreground">
                {PROTOCOL_LABELS[test.testProtocol] || test.testProtocol.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {test.avgPower && (
              <Badge variant="outline">{test.avgPower}W snitt</Badge>
            )}
            {test.criticalPower && (
              <Badge variant="secondary">CP: {test.criticalPower}W</Badge>
            )}
            <span className="text-sm text-muted-foreground">
              {new Date(test.testDate).toLocaleDateString('sv-SE')}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
