'use client';

/**
 * Program Report Viewer (Athlete Portal)
 *
 * Displays compiled program report with:
 * - Training zones
 * - Race protocols
 * - Field test schedule
 * - Quality programming schedule
 * - PDF/JSON export
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, FileJson, FileText, Calendar, Target, Dumbbell, AlertTriangle } from 'lucide-react';

interface ProgramReportViewerProps {
  programId: string;
}

export function ProgramReportViewer({ programId }: ProgramReportViewerProps) {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    async function fetchReport() {
      setLoading(true);
      try {
        const response = await fetch(`/api/programs/${programId}/report`);
        if (response.ok) {
          const data = await response.json();
          setReport(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch report:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [programId]);

  async function exportPDF() {
    try {
      const response = await fetch(`/api/programs/${programId}/export/pdf`, {
        method: 'POST'
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mitt-traningsprogram-${programId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Misslyckades med att exportera PDF');
    }
  }

  async function exportJSON() {
    try {
      const response = await fetch(`/api/programs/${programId}/export/json`);
      if (response.ok) {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mitt-traningsprogram-${programId}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('JSON export failed:', error);
      alert('Misslyckades med att exportera JSON');
    }
  }

  if (loading) {
    return <div>Laddar rapport...</div>;
  }

  if (!report) {
    return (
      <Alert>
        <AlertDescription>
          Din programrapport är inte tillgänglig ännu. Kontakta din tränare.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Export Buttons */}
      <div className="flex gap-2">
        <Button onClick={exportPDF} variant="default">
          <FileText className="h-4 w-4 mr-2" />
          Ladda ner PDF
        </Button>
        <Button onClick={exportJSON} variant="outline">
          <FileJson className="h-4 w-4 mr-2" />
          Ladda ner JSON
        </Button>
      </div>

      {/* Program Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Programöversikt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Mål</p>
              <p className="font-medium">{report.goal?.type || 'Allmän träning'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Metodik</p>
              <Badge>{report.methodology || 'N/A'}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Längd</p>
              <p className="font-medium">{report.totalWeeks || 0} veckor</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pass/vecka</p>
              <p className="font-medium">{report.sessionsPerWeek || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Training Zones */}
      {report.trainingZones && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Dina träningszoner
            </CardTitle>
            <CardDescription>Puls- och tempozoner baserade på testresultat</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-green-50 border border-green-200 rounded">
                <div>
                  <p className="font-medium">Zon 1 - Återhämtning</p>
                  <p className="text-sm text-muted-foreground">50-60% maxpuls</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm">{report.trainingZones.zone1?.hrRange || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">{report.trainingZones.zone1?.paceRange || 'N/A'}</p>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 border border-blue-200 rounded">
                <div>
                  <p className="font-medium">Zon 2 - Lätt</p>
                  <p className="text-sm text-muted-foreground">60-70% maxpuls</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm">{report.trainingZones.zone2?.hrRange || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">{report.trainingZones.zone2?.paceRange || 'N/A'}</p>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 bg-yellow-50 border border-yellow-200 rounded">
                <div>
                  <p className="font-medium">Zon 3 - Tempo</p>
                  <p className="text-sm text-muted-foreground">70-80% maxpuls</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm">{report.trainingZones.zone3?.hrRange || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">{report.trainingZones.zone3?.paceRange || 'N/A'}</p>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 bg-orange-50 border border-orange-200 rounded">
                <div>
                  <p className="font-medium">Zon 4 - Tröskel</p>
                  <p className="text-sm text-muted-foreground">80-90% maxpuls</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm">{report.trainingZones.zone4?.hrRange || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">{report.trainingZones.zone4?.paceRange || 'N/A'}</p>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 border border-red-200 rounded">
                <div>
                  <p className="font-medium">Zon 5 - VO₂max</p>
                  <p className="text-sm text-muted-foreground">90-100% maxpuls</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm">{report.trainingZones.zone5?.hrRange || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">{report.trainingZones.zone5?.paceRange || 'N/A'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Field Test Schedule */}
      {report.fieldTestSchedule && report.fieldTestSchedule.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Testschema
            </CardTitle>
            <CardDescription>Planerade fälttester för att följa dina framsteg</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.fieldTestSchedule.map((test: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted rounded">
                  <div>
                    <p className="font-medium">{test.testType}</p>
                    <p className="text-sm text-muted-foreground">Vecka {test.week}</p>
                  </div>
                  <Badge variant={test.required ? 'default' : 'outline'}>
                    {test.required ? 'Obligatorisk' : 'Valfri'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Race Schedule */}
      {report.raceSchedule && report.raceSchedule.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Tävlingsschema
            </CardTitle>
            <CardDescription>Planerade tävlingar och lopp</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.raceSchedule.map((race: any, i: number) => (
                <div key={i} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">{race.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Vecka {race.week} • {race.distance}
                      </p>
                    </div>
                    <Badge variant={race.classification === 'A' ? 'default' : 'secondary'}>
                      {race.classification}-lopp
                    </Badge>
                  </div>
                  {race.protocol && (
                    <div className="mt-2 p-2 bg-muted rounded text-sm">
                      <p className="font-medium mb-1">Loppstrategi:</p>
                      <p className="text-muted-foreground">{race.protocol}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quality Programming */}
      {report.qualityProgramming && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5" />
              Kompletterande träning
            </CardTitle>
            <CardDescription>
              Styrka, plyometri och löpteknik
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {report.qualityProgramming.strength && (
                <div>
                  <h4 className="font-medium mb-2">Styrketräning</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {report.qualityProgramming.strength.frequency} pass/vecka • {report.qualityProgramming.strength.phase} fas
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {report.qualityProgramming.strength.exercises?.slice(0, 5).map((ex: string, i: number) => (
                      <Badge key={i} variant="outline">{ex}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {report.qualityProgramming.plyometrics && (
                <div>
                  <h4 className="font-medium mb-2">Plyometrisk träning</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {report.qualityProgramming.plyometrics.frequency} pass/vecka • {report.qualityProgramming.plyometrics.contacts} kontakter/pass
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {report.qualityProgramming.plyometrics.exercises?.slice(0, 5).map((ex: string, i: number) => (
                      <Badge key={i} variant="outline">{ex}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {report.qualityProgramming.drills && (
                <div>
                  <h4 className="font-medium mb-2">Löpövningar</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {report.qualityProgramming.drills.frequency} pass/vecka
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {report.qualityProgramming.drills.drills?.map((drill: string, i: number) => (
                      <Badge key={i} variant="outline">{drill}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warnings and Notes */}
      {report.warnings && report.warnings.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-2">Viktigt att tänka på:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {report.warnings.map((warning: string, i: number) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {report.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Tränarens anteckningar</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{report.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
