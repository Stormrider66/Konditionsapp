'use client';

/**
 * Audio Recorder Component for Daily Check-In
 *
 * Features:
 * - 60-second max recording
 * - Waveform visualization
 * - Playback before submission
 * - Upload to API for Gemini processing
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
  GlassCardDescription
} from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';
import {
  Mic,
  Square,
  Play,
  Pause,
  Upload,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface AudioRecorderProps {
  clientId: string;
  onRecordingComplete?: (result: AudioJournalResult) => void;
  onCancel?: () => void;
  maxDuration?: number; // seconds
  variant?: 'default' | 'glass';
}

interface AudioJournalResult {
  transcription: string;
  wellness: {
    sleepQuality?: number;
    sleepHours?: number;
    fatigue?: number;
    soreness?: number;
    sorenessLocation?: string;
    stress?: number;
    mood?: number;
    motivation?: number;
    rpe?: number;
  };
  aiInterpretation: {
    readinessEstimate: number;
    recommendedAction: 'PROCEED' | 'REDUCE' | 'EASY' | 'REST';
    flaggedConcerns: string[];
  };
}

type RecordingState = 'idle' | 'recording' | 'recorded' | 'uploading' | 'processing' | 'complete' | 'error';

export function AudioRecorder({
  clientId,
  onRecordingComplete,
  onCancel,
  maxDuration = 60,
  variant = 'default',
}: AudioRecorderProps) {
  const isGlass = variant === 'glass';
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AudioJournalResult | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // Draw waveform visualization
  const drawWaveform = useCallback(() => {
    if (!analyserRef.current || !canvasRef.current) return;

    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (state !== 'recording') return;

      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = 'rgb(240, 240, 240)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = isGlass ? 'rgb(96, 165, 250)' : 'rgb(59, 130, 246)'; // blue-400 or blue-500
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();
  }, [state, isGlass]);

  // Start recording
  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Setup audio analyser for visualization
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4',
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType,
        });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setState('recorded');

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setState('recording');
      setDuration(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          if (prev >= maxDuration - 1) {
            stopRecording();
            return maxDuration;
          }
          return prev + 1;
        });
      }, 1000);

      // Start waveform visualization
      drawWaveform();
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Kunde inte komma åt mikrofonen. Kontrollera att du har gett tillstånd.');
      setState('error');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }
  };

  // Play/pause recorded audio
  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Delete recording and start over
  const deleteRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setAudioBlob(null);
    setDuration(0);
    setState('idle');
    setResult(null);
  };

  // Upload and process with Gemini
  const uploadAndProcess = async () => {
    if (!audioBlob) return;

    try {
      setState('uploading');

      // Create FormData for upload
      const formData = new FormData();
      formData.append('audio', audioBlob, 'checkin.webm');
      formData.append('clientId', clientId);
      formData.append('duration', String(duration));

      // Upload audio
      const uploadResponse = await fetch('/api/audio-journal', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Uppladdning misslyckades');
      }

      const { id: journalId } = await uploadResponse.json();

      setState('processing');

      // Process with Gemini
      const processResponse = await fetch(`/api/audio-journal/${journalId}/process`, {
        method: 'POST',
      });

      if (!processResponse.ok) {
        throw new Error('AI-bearbetning misslyckades');
      }

      const processResult = await processResponse.json();
      setResult(processResult.extracted);
      setState('complete');

      // Notify parent
      onRecordingComplete?.(processResult.extracted);
    } catch (err) {
      console.error('Upload/process error:', err);
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
      setState('error');
    }
  };

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isGlass) {
    return (
      <GlassCard className="w-full">
        <GlassCardHeader className="pb-4">
          <GlassCardTitle className="flex items-center gap-2 text-2xl font-black tracking-tight">
            <Mic className="h-6 w-6 text-blue-500" />
            Röstincheckning
          </GlassCardTitle>
          <GlassCardDescription className="text-slate-400 font-medium">
            Berätta hur du mår idag - sömn, energi, ömhet, stress eller motivation. Vi analyserar din röst direkt.
          </GlassCardDescription>
        </GlassCardHeader>

        <GlassCardContent className="space-y-6">
          {/* Error display */}
          {error && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex gap-3 text-red-400 text-sm animate-in fade-in slide-in-from-top-1">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Waveform visualization */}
          {state === 'recording' && (
            <div className="relative group">
              <div className="absolute inset-0 bg-blue-500/5 blur-xl group-hover:bg-blue-500/10 transition-all rounded-2xl" />
              <div className="relative border border-white/5 rounded-2xl bg-white/5 backdrop-blur-sm overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={100}
                  className="w-full h-24"
                />
                <div className="absolute top-3 right-3 flex items-center gap-2 px-3 py-1 bg-red-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">Spelar in</span>
                </div>
              </div>
            </div>
          )}

          {/* Recording progress */}
          {(state === 'recording' || state === 'recorded') && (
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <span className="text-3xl font-black text-white tabular-nums">
                  {formatDuration(duration)}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                  Maxtid {formatDuration(maxDuration)}
                </span>
              </div>
              <Progress
                value={(duration / maxDuration) * 100}
                className="h-1.5 bg-white/5"
              // Note: The Progress component internal bar style needs to be handled via CSS or by using a custom progress BAR
              />
            </div>
          )}

          {/* Audio playback */}
          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          )}

          {/* Processing status */}
          {(state === 'uploading' || state === 'processing') && (
            <div className="flex flex-col items-center justify-center gap-4 py-8 animate-in fade-in zoom-in-95">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/20 blur-2xl animate-pulse" />
                <Loader2 className="h-12 w-12 text-blue-500 animate-spin relative" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-black text-white uppercase tracking-widest text-xs">
                  {state === 'uploading' ? 'Laddar upp...' : 'AI Analyserar...'}
                </p>
                <p className="text-xs text-slate-500 font-medium">Extraherar biometrisk data från din röst</p>
              </div>
            </div>
          )}

          {/* Result preview */}
          {state === 'complete' && result && (
            <div className="space-y-4 p-5 bg-emerald-500/5 rounded-2xl border border-emerald-500/20 animate-in zoom-in-95 duration-500">
              <div className="flex items-center gap-3 text-emerald-400">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <span className="font-black uppercase tracking-widest text-xs">Analys slutförd</span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Readiness</p>
                  <p className="text-2xl font-black text-white">{result.aiInterpretation.readinessEstimate}/10</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Åtgärd</p>
                  <p className="text-base font-bold text-white leading-tight">
                    {result.aiInterpretation.recommendedAction === 'PROCEED'
                      ? 'Kör enligt plan'
                      : result.aiInterpretation.recommendedAction === 'REDUCE'
                        ? 'Minska intensitet'
                        : result.aiInterpretation.recommendedAction === 'EASY'
                          ? 'Lugnt pass'
                          : 'Vila'}
                  </p>
                </div>
              </div>

              {result.aiInterpretation.flaggedConcerns.length > 0 && (
                <div className="pt-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-1">Noterat av AI</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.aiInterpretation.flaggedConcerns.map((concern, idx) => (
                      <span key={idx} className="bg-orange-500/10 text-orange-400 px-2.5 py-1 rounded-lg text-[10px] font-bold">
                        {concern}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 mt-4">
            {state === 'idle' && (
              <Button
                onClick={startRecording}
                size="lg"
                className="w-full h-16 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-sm shadow-[0_4px_20px_rgba(37,99,235,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Mic className="h-5 w-5 mr-3" />
                Starta inspelning
              </Button>
            )}

            {state === 'recording' && (
              <Button
                onClick={stopRecording}
                variant="destructive"
                size="lg"
                className="w-full h-16 rounded-2xl bg-red-600 hover:bg-red-500 font-black uppercase tracking-widest text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Square className="h-5 w-5 mr-3" />
                Stoppa inspelning
              </Button>
            )}

            {state === 'recorded' && (
              <div className="w-full space-y-3">
                <Button
                  onClick={uploadAndProcess}
                  size="lg"
                  className="w-full h-16 rounded-2xl bg-white text-black hover:bg-slate-100 font-black uppercase tracking-widest text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Upload className="h-5 w-5 mr-3" />
                  Skicka in för analys
                </Button>

                <div className="flex gap-3">
                  <Button
                    onClick={togglePlayback}
                    variant="ghost"
                    className="flex-1 h-12 rounded-xl bg-white/5 border border-white/10 text-white font-bold uppercase tracking-wider text-xs"
                  >
                    {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                    {isPlaying ? 'Pausa' : 'Lyssna'}
                  </Button>

                  <Button
                    onClick={deleteRecording}
                    variant="ghost"
                    className="flex-1 h-12 rounded-xl bg-red-500/5 hover:bg-red-500/10 text-red-400 font-bold uppercase tracking-wider text-xs"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Ta bort
                  </Button>
                </div>
              </div>
            )}

            {state === 'error' && (
              <Button onClick={deleteRecording} variant="outline" size="lg" className="w-full rounded-xl bg-white/5 border-white/10 text-white font-bold h-12">
                Försök igen
              </Button>
            )}

            {(state === 'idle' || state === 'recorded' || state === 'error') && onCancel && (
              <Button
                onClick={onCancel}
                variant="ghost"
                className="w-full text-slate-500 font-bold uppercase tracking-widest text-[10px] hover:text-slate-300"
              >
                Avbryt och gå till formulär
              </Button>
            )}
          </div>
        </GlassCardContent>
      </GlassCard>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Röstincheckning
        </CardTitle>
        <CardDescription>
          Berätta hur du mår idag. Nämn sömn, energi, ömhet, stress och motivation.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Error display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Waveform visualization (during recording) */}
        {state === 'recording' && (
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={400}
              height={80}
              className="w-full h-20 rounded-lg bg-gray-100 dark:bg-gray-800"
            />
            <Badge className="absolute top-2 right-2 bg-red-500 animate-pulse">
              Spelar in
            </Badge>
          </div>
        )}

        {/* Recording progress */}
        {(state === 'recording' || state === 'recorded') && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{formatDuration(duration)}</span>
              <span className="text-muted-foreground">/ {formatDuration(maxDuration)}</span>
            </div>
            <Progress value={(duration / maxDuration) * 100} className="h-2" />
          </div>
        )}

        {/* Audio playback element */}
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
        )}

        {/* Processing status */}
        {(state === 'uploading' || state === 'processing') && (
          <div className="flex items-center justify-center gap-2 py-4">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>
              {state === 'uploading' ? 'Laddar upp...' : 'AI analyserar din röstincheckning...'}
            </span>
          </div>
        )}

        {/* Result preview */}
        {state === 'complete' && result && (
          <div className="space-y-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Analys klar</span>
            </div>

            <div className="text-sm space-y-1">
              <p>
                <strong>Readiness:</strong> {result.aiInterpretation.readinessEstimate}/10
              </p>
              <p>
                <strong>Rekommendation:</strong>{' '}
                {result.aiInterpretation.recommendedAction === 'PROCEED'
                  ? 'Kör enligt plan'
                  : result.aiInterpretation.recommendedAction === 'REDUCE'
                    ? 'Minska intensitet'
                    : result.aiInterpretation.recommendedAction === 'EASY'
                      ? 'Lätt pass'
                      : 'Vila'}
              </p>
              {result.aiInterpretation.flaggedConcerns.length > 0 && (
                <p className="text-yellow-700 dark:text-yellow-300">
                  <strong>Flaggat:</strong> {result.aiInterpretation.flaggedConcerns.join(', ')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 justify-center">
          {state === 'idle' && (
            <Button onClick={startRecording} size="lg" className="gap-2">
              <Mic className="h-5 w-5" />
              Starta inspelning
            </Button>
          )}

          {state === 'recording' && (
            <Button onClick={stopRecording} variant="destructive" size="lg" className="gap-2">
              <Square className="h-5 w-5" />
              Stoppa
            </Button>
          )}

          {state === 'recorded' && (
            <>
              <Button onClick={togglePlayback} variant="outline" size="lg" className="gap-2">
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                {isPlaying ? 'Pausa' : 'Spela upp'}
              </Button>

              <Button onClick={uploadAndProcess} size="lg" className="gap-2">
                <Upload className="h-5 w-5" />
                Skicka in
              </Button>

              <Button onClick={deleteRecording} variant="ghost" size="lg" className="gap-2">
                <Trash2 className="h-5 w-5" />
                Ta bort
              </Button>
            </>
          )}

          {state === 'error' && (
            <Button onClick={deleteRecording} variant="outline" size="lg">
              Försök igen
            </Button>
          )}

          {(state === 'idle' || state === 'recorded' || state === 'error') && onCancel && (
            <Button onClick={onCancel} variant="ghost" size="lg">
              Avbryt
            </Button>
          )}
        </div>

        {/* Tips */}
        {state === 'idle' && (
          <div className="text-sm text-muted-foreground text-center">
            <p className="font-medium mb-1">Tips:</p>
            <p>&ldquo;Jag sov 7 timmar, känner mig pigg. Lite öm i högra vaden.&rdquo;</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
