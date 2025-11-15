'use client';

/**
 * Program Report Preview
 *
 * Preview and export compiled program reports including:
 * - Athlete info and goal
 * - Training phases and periodization
 * - Race-day protocols
 * - Field test schedule
 * - Training zones and paces
 * - Quality programming schedule (strength, plyometrics, drills)
 *
 * Export formats: PDF, JSON
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, FileJson, FileText, Calendar, TrendingUp, Dumbbell, Info } from 'lucide-react';

interface ProgramReportPreviewProps {
  programId: string;
  programData?: any;
}

export function ProgramReportPreview({ programId, programData }: ProgramReportPreviewProps) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(programData || null);

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
        a.download = `program-${programId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Failed to export PDF');
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
        a.download = `program-${programId}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('JSON export failed:', error);
      alert('Failed to export JSON');
    }
  }

  if (!report && !loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Program Report</CardTitle>
          <CardDescription>Preview and export comprehensive program report</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchReport}>Load Report</Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return <div>Loading report...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Export Buttons */}
      <div className="flex gap-2">
        <Button onClick={exportPDF} variant="default">
          <FileText className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
        <Button onClick={exportJSON} variant="outline">
          <FileJson className="h-4 w-4 mr-2" />
          Export JSON
        </Button>
      </div>

      {/* Program Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Program Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Athlete</p>
              <p className="font-medium">{report.athlete?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Goal</p>
              <p className="font-medium">{report.goal?.type || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Methodology</p>
              <Badge>{report.methodology || 'N/A'}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="font-medium">{report.totalWeeks || 0} weeks</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sessions/Week</p>
              <p className="font-medium">{report.sessionsPerWeek || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Start Date</p>
              <p className="font-medium">
                {report.startDate ? new Date(report.startDate).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Training Zones */}
      {report.trainingZones && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Training Zones
            </CardTitle>
            <CardDescription>Heart rate and pace zones based on test results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-green-50 border border-green-200 rounded">
                <div>
                  <p className="font-medium">Zone 1 - Recovery</p>
                  <p className="text-sm text-muted-foreground">50-60% max HR</p>
                </div>
                <div className="text-right">
                  <p className="font-mono">{report.trainingZones.zone1?.hrRange || 'N/A'}</p>
                  <p className="text-sm text-muted-foreground">{report.trainingZones.zone1?.paceRange || 'N/A'}</p>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 border border-blue-200 rounded">
                <div>
                  <p className="font-medium">Zone 2 - Easy</p>
                  <p className="text-sm text-muted-foreground">60-70% max HR</p>
                </div>
                <div className="text-right">
                  <p className="font-mono">{report.trainingZones.zone2?.hrRange || 'N/A'}</p>
                  <p className="text-sm text-muted-foreground">{report.trainingZones.zone2?.paceRange || 'N/A'}</p>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 bg-yellow-50 border border-yellow-200 rounded">
                <div>
                  <p className="font-medium">Zone 3 - Tempo</p>
                  <p className="text-sm text-muted-foreground">70-80% max HR</p>
                </div>
                <div className="text-right">
                  <p className="font-mono">{report.trainingZones.zone3?.hrRange || 'N/A'}</p>
                  <p className="text-sm text-muted-foreground">{report.trainingZones.zone3?.paceRange || 'N/A'}</p>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 bg-orange-50 border border-orange-200 rounded">
                <div>
                  <p className="font-medium">Zone 4 - Threshold</p>
                  <p className="text-sm text-muted-foreground">80-90% max HR</p>
                </div>
                <div className="text-right">
                  <p className="font-mono">{report.trainingZones.zone4?.hrRange || 'N/A'}</p>
                  <p className="text-sm text-muted-foreground">{report.trainingZones.zone4?.paceRange || 'N/A'}</p>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 border border-red-200 rounded">
                <div>
                  <p className="font-medium">Zone 5 - VO₂max</p>
                  <p className="text-sm text-muted-foreground">90-100% max HR</p>
                </div>
                <div className="text-right">
                  <p className="font-mono">{report.trainingZones.zone5?.hrRange || 'N/A'}</p>
                  <p className="text-sm text-muted-foreground">{report.trainingZones.zone5?.paceRange || 'N/A'}</p>
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
              Field Test Schedule
            </CardTitle>
            <CardDescription>Recommended testing timeline for tracking progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.fieldTestSchedule.map((test: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted rounded">
                  <div>
                    <p className="font-medium">{test.testType}</p>
                    <p className="text-sm text-muted-foreground">Week {test.week}</p>
                  </div>
                  <Badge variant={test.required ? 'default' : 'outline'}>
                    {test.required ? 'Required' : 'Optional'}
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
              <TrendingUp className="h-5 w-5" />
              Race Schedule
            </CardTitle>
            <CardDescription>Planned races with decision recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.raceSchedule.map((race: any, i: number) => (
                <div key={i} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">{race.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Week {race.week} • {race.distance}
                      </p>
                    </div>
                    <Badge variant={race.classification === 'A' ? 'default' : 'secondary'}>
                      {race.classification}-Race
                    </Badge>
                  </div>
                  {race.protocol && (
                    <Alert className="mt-2">
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        <p className="font-medium text-sm mb-1">Race Protocol:</p>
                        <p className="text-xs">{race.protocol}</p>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quality Programming Schedule */}
      {report.qualityProgramming && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5" />
              Quality Programming
            </CardTitle>
            <CardDescription>
              Integrated strength, plyometrics, and running drills
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {report.qualityProgramming.strength && (
                <div>
                  <h4 className="font-medium mb-2">Strength Training</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {report.qualityProgramming.strength.frequency} sessions/week • {report.qualityProgramming.strength.phase} phase
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
                  <h4 className="font-medium mb-2">Plyometric Training</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {report.qualityProgramming.plyometrics.frequency} sessions/week • {report.qualityProgramming.plyometrics.contacts} contacts/session
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
                  <h4 className="font-medium mb-2">Running Drills</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {report.qualityProgramming.drills.frequency} sessions/week
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
          <AlertDescription>
            <p className="font-medium mb-2">Warnings:</p>
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
            <CardTitle>Coach Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{report.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
