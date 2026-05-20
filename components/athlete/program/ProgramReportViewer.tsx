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
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileJson, FileText, Calendar, Target, Dumbbell, AlertTriangle } from 'lucide-react';

interface ProgramReportViewerProps {
  programId: string;
}

type AppLocale = 'en' | 'sv';

const getAppLocale = (locale: string): AppLocale => (locale === 'sv' ? 'sv' : 'en');

const t = (locale: AppLocale, svText: string, enText: string) => (
  locale === 'sv' ? svText : enText
);

export function ProgramReportViewer({ programId }: ProgramReportViewerProps) {
  const locale = getAppLocale(useLocale());
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

    void fetchReport();
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
        a.download = `${t(locale, 'mitt-traningsprogram', 'my-training-program')}-${programId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('PDF export failed:', error);
      alert(t(locale, 'Misslyckades med att exportera PDF', 'Failed to export PDF'));
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
        a.download = `${t(locale, 'mitt-traningsprogram', 'my-training-program')}-${programId}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('JSON export failed:', error);
      alert(t(locale, 'Misslyckades med att exportera JSON', 'Failed to export JSON'));
    }
  }

  if (loading) {
    return <div>{t(locale, 'Laddar rapport...', 'Loading report...')}</div>;
  }

  if (!report) {
    return (
      <Alert>
        <AlertDescription>
          {t(locale, 'Din programrapport är inte tillgänglig ännu. Kontakta din tränare.', 'Your program report is not available yet. Contact your coach.')}
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
          {t(locale, 'Ladda ner PDF', 'Download PDF')}
        </Button>
        <Button onClick={exportJSON} variant="outline">
          <FileJson className="h-4 w-4 mr-2" />
          {t(locale, 'Ladda ner JSON', 'Download JSON')}
        </Button>
      </div>

      {/* Program Overview */}
      <Card>
        <CardHeader>
          <CardTitle>{t(locale, 'Programöversikt', 'Program overview')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{t(locale, 'Mål', 'Goal')}</p>
              <p className="font-medium">{report.goal?.type || t(locale, 'Allmän träning', 'General training')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t(locale, 'Metodik', 'Methodology')}</p>
              <Badge>{report.methodology || 'N/A'}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t(locale, 'Längd', 'Length')}</p>
              <p className="font-medium">{report.totalWeeks || 0} {t(locale, 'veckor', 'weeks')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t(locale, 'Pass/vecka', 'Sessions/week')}</p>
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
              {t(locale, 'Dina träningszoner', 'Your training zones')}
            </CardTitle>
            <CardDescription>{t(locale, 'Puls- och tempozoner baserade på testresultat', 'Heart-rate and pace zones based on test results')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-green-50 border border-green-200 rounded">
                <div>
                  <p className="font-medium">{t(locale, 'Zon 1 - Återhämtning', 'Zone 1 - Recovery')}</p>
                  <p className="text-sm text-muted-foreground">50-60% {t(locale, 'maxpuls', 'max HR')}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm">{report.trainingZones.zone1?.hrRange || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">{report.trainingZones.zone1?.paceRange || 'N/A'}</p>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 border border-blue-200 rounded">
                <div>
                  <p className="font-medium">{t(locale, 'Zon 2 - Lätt', 'Zone 2 - Easy')}</p>
                  <p className="text-sm text-muted-foreground">60-70% {t(locale, 'maxpuls', 'max HR')}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm">{report.trainingZones.zone2?.hrRange || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">{report.trainingZones.zone2?.paceRange || 'N/A'}</p>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 bg-yellow-50 border border-yellow-200 rounded">
                <div>
                  <p className="font-medium">{t(locale, 'Zon 3 - Tempo', 'Zone 3 - Tempo')}</p>
                  <p className="text-sm text-muted-foreground">70-80% {t(locale, 'maxpuls', 'max HR')}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm">{report.trainingZones.zone3?.hrRange || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">{report.trainingZones.zone3?.paceRange || 'N/A'}</p>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 bg-orange-50 border border-orange-200 rounded">
                <div>
                  <p className="font-medium">{t(locale, 'Zon 4 - Tröskel', 'Zone 4 - Threshold')}</p>
                  <p className="text-sm text-muted-foreground">80-90% {t(locale, 'maxpuls', 'max HR')}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm">{report.trainingZones.zone4?.hrRange || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">{report.trainingZones.zone4?.paceRange || 'N/A'}</p>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 border border-red-200 rounded">
                <div>
                  <p className="font-medium">Zon 5 - VO₂max</p>
                  <p className="text-sm text-muted-foreground">90-100% {t(locale, 'maxpuls', 'max HR')}</p>
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
              {t(locale, 'Testschema', 'Test schedule')}
            </CardTitle>
            <CardDescription>{t(locale, 'Planerade fälttester för att följa dina framsteg', 'Planned field tests to track your progress')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.fieldTestSchedule.map((test: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted rounded">
                  <div>
                    <p className="font-medium">{test.testType}</p>
                    <p className="text-sm text-muted-foreground">{t(locale, 'Vecka', 'Week')} {test.week}</p>
                  </div>
                  <Badge variant={test.required ? 'default' : 'outline'}>
                    {test.required ? t(locale, 'Obligatorisk', 'Required') : t(locale, 'Valfri', 'Optional')}
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
              {t(locale, 'Tävlingsschema', 'Race schedule')}
            </CardTitle>
            <CardDescription>{t(locale, 'Planerade tävlingar och lopp', 'Planned races and events')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.raceSchedule.map((race: any, i: number) => (
                <div key={i} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">{race.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {t(locale, 'Vecka', 'Week')} {race.week} • {race.distance}
                      </p>
                    </div>
                    <Badge variant={race.classification === 'A' ? 'default' : 'secondary'}>
                      {race.classification}-{t(locale, 'lopp', 'race')}
                    </Badge>
                  </div>
                  {race.protocol && (
                    <div className="mt-2 p-2 bg-muted rounded text-sm">
                      <p className="font-medium mb-1">{t(locale, 'Loppstrategi:', 'Race strategy:')}</p>
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
              {t(locale, 'Kompletterande träning', 'Supplemental training')}
            </CardTitle>
            <CardDescription>
              {t(locale, 'Styrka, plyometri och löpteknik', 'Strength, plyometrics, and running technique')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {report.qualityProgramming.strength && (
                <div>
                  <h4 className="font-medium mb-2">{t(locale, 'Styrketräning', 'Strength training')}</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {report.qualityProgramming.strength.frequency} {t(locale, 'pass/vecka', 'sessions/week')} • {report.qualityProgramming.strength.phase} {t(locale, 'fas', 'phase')}
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
                  <h4 className="font-medium mb-2">{t(locale, 'Plyometrisk träning', 'Plyometric training')}</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {report.qualityProgramming.plyometrics.frequency} {t(locale, 'pass/vecka', 'sessions/week')} • {report.qualityProgramming.plyometrics.contacts} {t(locale, 'kontakter/pass', 'contacts/session')}
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
                  <h4 className="font-medium mb-2">{t(locale, 'Löpövningar', 'Running drills')}</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {report.qualityProgramming.drills.frequency} {t(locale, 'pass/vecka', 'sessions/week')}
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
            <p className="font-medium mb-2">{t(locale, 'Viktigt att tänka på:', 'Important notes:')}</p>
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
            <CardTitle>{t(locale, 'Tränarens anteckningar', "Coach's notes")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{report.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
