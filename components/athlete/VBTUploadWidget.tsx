'use client';

/**
 * VBT Upload Widget
 *
 * Allows athletes/coaches to upload VBT CSV files from devices like:
 * - Vmaxpro/Enode
 * - Vitruve
 * - GymAware
 * - PUSH Band
 * - Perch
 * - Tendo
 */

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Gauge,
  Dumbbell,
} from 'lucide-react';

interface VBTUploadWidgetProps {
  clientId: string;
  onUploadComplete?: (sessionId?: string) => void;
}

interface UploadResult {
  success: boolean;
  sessionId?: string;
  totalReps: number;
  exerciseCount: number;
  exercises?: {
    name: string;
    sets: number;
    reps: number;
    matchedExerciseId?: string;
  }[];
  warnings?: string[];
  errors?: string[];
}

const DEVICE_OPTIONS = [
  { value: 'GENERIC', label: 'Auto-detect' },
  { value: 'VMAXPRO', label: 'Vmaxpro / Enode' },
  { value: 'VITRUVE', label: 'Vitruve' },
  { value: 'GYMAWARE', label: 'GymAware' },
  { value: 'PUSH', label: 'PUSH Band' },
  { value: 'PERCH', label: 'Perch' },
  { value: 'TENDO', label: 'Tendo' },
];

export function VBTUploadWidget({
  clientId,
  onUploadComplete,
}: VBTUploadWidgetProps) {
  const [file, setFile] = useState<File | null>(null);
  const [deviceType, setDeviceType] = useState('GENERIC');
  const [sessionDate, setSessionDate] = useState('');
  const [notes, setNotes] = useState('');
  const [bodyWeight, setBodyWeight] = useState('');
  const [sessionRPE, setSessionRPE] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const csvFile = acceptedFiles.find(
      (f) =>
        f.type === 'text/csv' ||
        f.name.endsWith('.csv') ||
        f.type === 'application/vnd.ms-excel'
    );
    if (csvFile) {
      setFile(csvFile);
      setResult(null);
      setError(null);
    } else {
      setError('Vänligen välj en CSV-fil');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientId', clientId);
      formData.append('deviceType', deviceType);
      if (sessionDate) formData.append('sessionDate', sessionDate);
      if (notes) formData.append('notes', notes);
      if (bodyWeight) formData.append('bodyWeight', bodyWeight);
      if (sessionRPE) formData.append('sessionRPE', sessionRPE);

      const response = await fetch('/api/athlete/vbt/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Uppladdning misslyckades');
      }

      setResult(data);

      if (data.success && onUploadComplete) {
        onUploadComplete(data.sessionId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setNotes('');
    setBodyWeight('');
    setSessionRPE('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="h-5 w-5" />
          Ladda upp VBT-data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Drop Zone */}
        {!result?.success && (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : file
                ? 'border-green-500 bg-green-50'
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-2">
              {file ? (
                <>
                  <FileSpreadsheet className="h-10 w-10 text-green-600" />
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <p className="font-medium">
                    {isDragActive ? 'Släpp filen här' : 'Dra och släpp CSV-fil'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Stöd för Vmaxpro, Vitruve, GymAware m.fl.
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Device & Date Selection */}
        {file && !result?.success && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deviceType">Enhet</Label>
              <Select value={deviceType} onValueChange={setDeviceType}>
                <SelectTrigger id="deviceType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEVICE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sessionDate">Träningsdatum (valfritt)</Label>
              <Input
                id="sessionDate"
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Optional Fields */}
        {file && !result?.success && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bodyWeight">Kroppsvikt (kg)</Label>
              <Input
                id="bodyWeight"
                type="number"
                step="0.1"
                placeholder="t.ex. 75.5"
                value={bodyWeight}
                onChange={(e) => setBodyWeight(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sessionRPE">Session RPE (1-10)</Label>
              <Input
                id="sessionRPE"
                type="number"
                min="1"
                max="10"
                placeholder="t.ex. 7"
                value={sessionRPE}
                onChange={(e) => setSessionRPE(e.target.value)}
              />
            </div>
          </div>
        )}

        {file && !result?.success && (
          <div className="space-y-2">
            <Label htmlFor="notes">Anteckningar (valfritt)</Label>
            <Textarea
              id="notes"
              placeholder="Lägg till anteckningar om passet..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Result */}
        {result?.success && (
          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <span className="font-medium">Uppladdning lyckades!</span>
                <br />
                {result.totalReps} repetitioner från {result.exerciseCount} övningar importerades.
              </AlertDescription>
            </Alert>

            {/* Exercise Summary */}
            {result.exercises && result.exercises.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Importerade övningar:</p>
                <div className="flex flex-wrap gap-2">
                  {result.exercises.map((ex, i) => (
                    <Badge
                      key={i}
                      variant={ex.matchedExerciseId ? 'default' : 'secondary'}
                      className="flex items-center gap-1"
                    >
                      <Dumbbell className="h-3 w-3" />
                      {ex.name}
                      <span className="text-xs opacity-75">
                        ({ex.sets}×{ex.reps})
                      </span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {result.warnings && result.warnings.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="text-sm list-disc list-inside">
                    {result.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {!result?.success ? (
            <>
              <Button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="flex-1"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Laddar upp...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Ladda upp
                  </>
                )}
              </Button>
              {file && (
                <Button variant="outline" onClick={handleReset}>
                  Avbryt
                </Button>
              )}
            </>
          ) : (
            <Button onClick={handleReset} className="flex-1">
              Ladda upp ny fil
            </Button>
          )}
        </div>

        {/* Help Text */}
        <p className="text-xs text-muted-foreground text-center">
          Exportera CSV från din VBT-app och ladda upp här.
          <br />
          Data sparas automatiskt och kopplas till din övningsbibliotek.
        </p>
      </CardContent>
    </Card>
  );
}
