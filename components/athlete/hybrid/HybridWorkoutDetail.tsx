'use client';

/**
 * Hybrid Workout Detail Component
 *
 * Shows workout details with score logging form and custom scaling support.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Timer,
  Repeat,
  Dumbbell,
  Trophy,
  Zap,
  Clock,
  Target,
  Medal,
  Play,
  Save,
  History,
  Edit,
  AlertCircle,
  StopCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { WorkoutTimer } from './WorkoutTimer';
import { useWorkoutThemeOptional } from '@/lib/themes/ThemeProvider';
import { MINIMALIST_WHITE_THEME } from '@/lib/themes/definitions';
import {
  confirmFutureCompletion,
  readFutureCompletionWarning,
} from '@/lib/workouts/future-completion-client';
import { useLocale, useTranslations } from '@/i18n/client';

interface HybridMovement {
  id: string;
  order: number;
  setNumber?: number | null;
  reps?: number | null;
  calories?: number | null;
  distance?: number | null;
  duration?: number | null;
  weightMale?: number | null;
  weightFemale?: number | null;
  notes?: string | null;
  exercise: {
    id: string;
    name: string;
    nameSv?: string | null;
    standardAbbreviation?: string | null;
    equipmentTypes: string[];
  };
}

interface HybridWorkout {
  id: string;
  name: string;
  description?: string | null;
  format: string;
  timeCap?: number | null;
  workTime?: number | null;
  restTime?: number | null;
  totalRounds?: number | null;
  totalMinutes?: number | null;
  repScheme?: string | null;
  scalingLevel: string;
  isBenchmark: boolean;
  benchmarkSource?: string | null;
  tags: string[];
  movements: HybridMovement[];
  results: HybridWorkoutResult[];
}

interface HybridWorkoutResult {
  id: string;
  scoreType: string;
  timeScore?: number | null;
  roundsCompleted?: number | null;
  repsCompleted?: number | null;
  loadUsed?: number | null;
  caloriesScore?: number | null;
  scalingLevel: string;
  scalingNotes?: string | null;
  customModifications?: CustomModification[] | null;
  isPR: boolean;
  completedAt: string | Date;
  notes?: string | null;
  perceivedEffort?: number | null;
}

interface CustomModification {
  movementId: string;
  movementName: string;
  modificationType: 'weight' | 'reps' | 'substitute' | 'skip';
  originalValue: string;
  newValue: string;
}

interface HybridWorkoutDetailProps {
  workout: HybridWorkout;
  clientId: string;
  personalBest: HybridWorkoutResult | null;
  basePath?: string;
}

type TranslationKey = Parameters<ReturnType<typeof useTranslations>>[0]

const formatLabels: Record<string, { labelKey: TranslationKey; icon: React.ReactNode }> = {
  AMRAP: { labelKey: 'formats.amrap', icon: <Repeat className="h-5 w-5" /> },
  FOR_TIME: { labelKey: 'formats.forTime', icon: <Timer className="h-5 w-5" /> },
  EMOM: { labelKey: 'formats.emom', icon: <Clock className="h-5 w-5" /> },
  TABATA: { labelKey: 'formats.tabata', icon: <Zap className="h-5 w-5" /> },
  CHIPPER: { labelKey: 'formats.chipper', icon: <Target className="h-5 w-5" /> },
  LADDER: { labelKey: 'formats.ladder', icon: <Dumbbell className="h-5 w-5" /> },
  INTERVALS: { labelKey: 'formats.intervals', icon: <Zap className="h-5 w-5" /> },
  HYROX_SIM: { labelKey: 'formats.hyrox', icon: <Trophy className="h-5 w-5" /> },
  CUSTOM: { labelKey: 'formats.custom', icon: <Dumbbell className="h-5 w-5" /> },
};

const scalingLabels: Record<string, { labelKey: TranslationKey; color: string }> = {
  RX: { labelKey: 'scaling.rx', color: 'bg-green-500' },
  SCALED: { labelKey: 'scaling.scaled', color: 'bg-yellow-500' },
  FOUNDATIONS: { labelKey: 'scaling.foundations', color: 'bg-blue-500' },
  CUSTOM: { labelKey: 'scaling.custom', color: 'bg-purple-500' },
};

// Map workout format to timer mode
function getTimerMode(format: string): 'FOR_TIME' | 'AMRAP' | 'EMOM' | 'TABATA' | 'INTERVALS' | 'STOPWATCH' {
  switch (format) {
    case 'AMRAP':
      return 'AMRAP';
    case 'EMOM':
      return 'EMOM';
    case 'TABATA':
      return 'TABATA';
    case 'INTERVALS':
      return 'INTERVALS';
    case 'FOR_TIME':
    case 'CHIPPER':
    case 'LADDER':
    case 'HYROX_SIM':
    default:
      return 'FOR_TIME';
  }
}

export function HybridWorkoutDetail({ workout, clientId, personalBest, basePath = '' }: HybridWorkoutDetailProps) {
  const t = useTranslations('components.hybridWorkoutDetail');
  const locale = useLocale();
  const router = useRouter();
  const [isLoggingOpen, setIsLoggingOpen] = useState(false);
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('workout');
  const [timerResult, setTimerResult] = useState<number | null>(null);

  // Handle timer completion - capture time and open logging form
  const handleTimerComplete = (finalTimeMs: number) => {
    setTimerResult(finalTimeMs);
    setIsTimerOpen(false);
    setIsLoggingOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`${basePath}/athlete/hybrid`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {workout.isBenchmark && <Trophy className="h-6 w-6 text-yellow-500" />}
            <h1 className="text-2xl md:text-3xl font-bold">{workout.name}</h1>
          </div>
          <div className="flex items-center gap-2 mt-1 text-muted-foreground">
            {formatLabels[workout.format]?.icon}
            <span>{formatLabels[workout.format] ? t(formatLabels[workout.format].labelKey) : workout.format}</span>
            {workout.isBenchmark && (
              <Badge variant="secondary">{workout.benchmarkSource}</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {/* Timer Button */}
          <Dialog open={isTimerOpen} onOpenChange={setIsTimerOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="lg" className="gap-2">
                <StopCircle className="h-5 w-5" />
                <span className="hidden sm:inline">{t('actions.timer')}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t('timerDialog.title', { name: workout.name })}</DialogTitle>
                <DialogDescription>
                  {t('timerDialog.description')}
                </DialogDescription>
              </DialogHeader>
              <WorkoutTimer
                mode={getTimerMode(workout.format)}
                totalSeconds={
                  workout.format === 'AMRAP'
                    ? workout.totalMinutes ? workout.totalMinutes * 60 : 0
                    : workout.timeCap || 0
                }
                workSeconds={workout.workTime || 20}
                restSeconds={workout.restTime || 10}
                rounds={
                  workout.format === 'EMOM'
                    ? workout.totalMinutes || 10
                    : workout.totalRounds || 8
                }
                onComplete={handleTimerComplete}
              />
            </DialogContent>
          </Dialog>

          {/* Log Result Button */}
          <Dialog open={isLoggingOpen} onOpenChange={setIsLoggingOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2">
                <Play className="h-5 w-5" />
                <span className="hidden sm:inline">{t('actions.logResult')}</span>
                <span className="sm:hidden">{t('actions.log')}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('logDialog.title', { name: workout.name })}</DialogTitle>
                <DialogDescription>
                  {t('logDialog.description')}
                </DialogDescription>
              </DialogHeader>
              <ScoreLoggingForm
                workout={workout}
                clientId={clientId}
                personalBest={personalBest}
                initialTimeMs={timerResult}
                onSuccess={() => {
                  setIsLoggingOpen(false);
                  setTimerResult(null);
                  router.refresh();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* PR Card */}
      {personalBest && (
        <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Medal className="h-8 w-8 text-yellow-600" />
                <div>
                  <div className="font-semibold text-yellow-800">{t('personalRecord')}</div>
                  <div className="text-sm text-yellow-700">
                    {new Date(personalBest.completedAt).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US')}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-2xl text-yellow-700">
                  {formatScore(personalBest, workout.format)}
                </div>
                <Badge className={`${scalingLabels[personalBest.scalingLevel]?.color} text-white`}>
                  {scalingLabels[personalBest.scalingLevel]
                    ? t(scalingLabels[personalBest.scalingLevel].labelKey)
                    : personalBest.scalingLevel}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="workout">{t('tabs.workout')}</TabsTrigger>
          <TabsTrigger value="history">
            {t('tabs.history', { count: workout.results?.length || 0 })}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workout" className="mt-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Workout Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {formatLabels[workout.format]?.icon}
                  {t('details.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {workout.description && (
                  <p className="text-muted-foreground">{workout.description}</p>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  {workout.totalMinutes && (
                    <div>
                      <span className="text-muted-foreground">{t('details.time')}</span>{' '}
                      <span className="font-medium">{workout.totalMinutes} min</span>
                    </div>
                  )}
                  {workout.timeCap && (
                    <div>
                      <span className="text-muted-foreground">Time Cap:</span>{' '}
                      <span className="font-medium">{Math.floor(workout.timeCap / 60)} min</span>
                    </div>
                  )}
                  {workout.totalRounds && (
                    <div>
                      <span className="text-muted-foreground">{t('details.rounds')}</span>{' '}
                      <span className="font-medium">{workout.totalRounds}</span>
                    </div>
                  )}
                  {workout.repScheme && (
                    <div>
                      <span className="text-muted-foreground">Reps:</span>{' '}
                      <span className="font-medium">{workout.repScheme}</span>
                    </div>
                  )}
                </div>

                <div>
                  <Badge className={`${scalingLabels[workout.scalingLevel]?.color} text-white`}>
                    {scalingLabels[workout.scalingLevel]
                      ? t(scalingLabels[workout.scalingLevel].labelKey)
                      : workout.scalingLevel}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Movements Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Dumbbell className="h-5 w-5" />
                  {t('movements.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {workout.movements.map((movement, index) => (
                    <MovementRow key={movement.id} movement={movement} index={index} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                {t('history.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workout.results && workout.results.length > 0 ? (
                <div className="space-y-3">
                  {workout.results.map((result) => (
                    <div
                      key={result.id}
                      className={`p-4 rounded-lg border ${result.isPR ? 'bg-yellow-50 border-yellow-200' : 'bg-muted/50'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {result.isPR && <Medal className="h-5 w-5 text-yellow-600" />}
                          <div>
                            <div className="font-medium">
                              {new Date(result.completedAt).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </div>
                            {result.notes && (
                              <div className="text-sm text-muted-foreground mt-1">
                                {result.notes}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-xl">
                            {formatScore(result, workout.format)}
                          </div>
                          <Badge
                            variant="outline"
                            className={`${scalingLabels[result.scalingLevel]?.color} text-white text-xs`}
                          >
                            {scalingLabels[result.scalingLevel]
                              ? t(scalingLabels[result.scalingLevel].labelKey)
                              : result.scalingLevel}
                          </Badge>
                          {result.perceivedEffort && (
                            <div className="text-xs text-muted-foreground mt-1">
                              RPE: {result.perceivedEffort}/10
                            </div>
                          )}
                        </div>
                      </div>
                      {result.scalingLevel === 'CUSTOM' && result.scalingNotes && (
                        <div className="mt-2 text-sm text-purple-700 bg-purple-50 p-2 rounded">
                          <Edit className="h-3 w-3 inline mr-1" />
                          {result.scalingNotes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t('history.empty')}</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setIsLoggingOpen(true)}
                  >
                    {t('history.logFirst')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MovementRow({ movement, index }: { movement: HybridMovement; index: number }) {
  // Get theme from context (optional - falls back to default)
  const themeContext = useWorkoutThemeOptional();
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME;

  const prescription: string[] = [];

  if (movement.reps) prescription.push(`${movement.reps} reps`);
  if (movement.calories) prescription.push(`${movement.calories} cal`);
  if (movement.distance) prescription.push(`${movement.distance}m`);
  if (movement.duration) {
    const mins = Math.floor(movement.duration / 60);
    const secs = movement.duration % 60;
    prescription.push(mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`);
  }

  const weight =
    movement.weightMale && movement.weightFemale
      ? `${movement.weightMale}/${movement.weightFemale}kg`
      : movement.weightMale
        ? `${movement.weightMale}kg`
        : null;

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
        style={{
          backgroundColor: theme.colors.exerciseNumber,
          color: theme.colors.exerciseNumberText,
        }}
      >
        {index + 1}
      </div>
      <div className="flex-1">
        <div className="font-medium">{movement.exercise.nameSv || movement.exercise.name}</div>
        <div className="text-sm text-muted-foreground">
          {prescription.join(' • ')}
          {weight && <span className="ml-2 text-primary">@ {weight}</span>}
        </div>
        {movement.notes && (
          <div className="text-xs text-muted-foreground italic mt-1">{movement.notes}</div>
        )}
      </div>
    </div>
  );
}

interface ScoreLoggingFormProps {
  workout: HybridWorkout;
  clientId: string;
  personalBest: HybridWorkoutResult | null;
  initialTimeMs?: number | null;
  onSuccess: () => void;
}

function ScoreLoggingForm({ workout, personalBest, initialTimeMs, onSuccess }: ScoreLoggingFormProps) {
  const t = useTranslations('components.hybridWorkoutDetail');
  const [loading, setLoading] = useState(false);
  const [scalingLevel, setScalingLevel] = useState<string>(workout.scalingLevel);
  const [showCustomScaling, setShowCustomScaling] = useState(false);

  // Convert initialTimeMs to minutes and seconds if provided
  const initialMinutes = initialTimeMs ? Math.floor(initialTimeMs / 60000).toString() : '';
  const initialSeconds = initialTimeMs ? Math.floor((initialTimeMs % 60000) / 1000).toString().padStart(2, '0') : '';

  // Score fields
  const [minutes, setMinutes] = useState(initialMinutes);
  const [seconds, setSeconds] = useState(initialSeconds);
  const [rounds, setRounds] = useState('');
  const [reps, setReps] = useState('');
  const [notes, setNotes] = useState('');
  const [rpe, setRpe] = useState('');
  const [scalingNotes, setScalingNotes] = useState('');

  // Custom modifications
  const [modifications, setModifications] = useState<CustomModification[]>([]);

  const scoreType = getScoreType(workout.format);

  function handleScalingChange(value: string) {
    setScalingLevel(value);
    setShowCustomScaling(value === 'CUSTOM');
    if (value !== 'CUSTOM') {
      setModifications([]);
      setScalingNotes('');
    }
  }

  function addModification(movement: HybridMovement) {
    const existing = modifications.find((m) => m.movementId === movement.id);
    if (!existing) {
      setModifications([
        ...modifications,
        {
          movementId: movement.id,
          movementName: movement.exercise.nameSv || movement.exercise.name,
          modificationType: 'weight',
          originalValue: movement.weightMale ? `${movement.weightMale}kg` : '-',
          newValue: '',
        },
      ]);
    }
  }

  function updateModification(index: number, field: keyof CustomModification, value: string) {
    const updated = [...modifications];
    updated[index] = { ...updated[index], [field]: value };
    setModifications(updated);
  }

  function removeModification(index: number) {
    setModifications(modifications.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // Build score data
      const scoreData: Record<string, unknown> = {
        scoreType,
        scalingLevel,
      };

      if (scoreType === 'TIME') {
        const totalSeconds = (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);
        if (totalSeconds <= 0) {
          toast.error(t('toast.invalidTime'));
          setLoading(false);
          return;
        }
        scoreData.timeScore = totalSeconds;
      } else if (scoreType === 'ROUNDS_REPS') {
        scoreData.roundsCompleted = parseInt(rounds) || 0;
        scoreData.repsCompleted = parseInt(reps) || 0;
      }

      if (notes) scoreData.notes = notes;
      if (rpe) scoreData.perceivedEffort = parseInt(rpe);

      if (scalingLevel === 'CUSTOM') {
        scoreData.scalingNotes = scalingNotes;
        scoreData.customModifications = modifications;
      }

      let response = await fetch(`/api/hybrid-workouts/${workout.id}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scoreData),
      });

      const futureWarning = await readFutureCompletionWarning(response);
      if (futureWarning) {
        if (!confirmFutureCompletion(futureWarning)) {
          setLoading(false);
          return;
        }

        response = await fetch(`/api/hybrid-workouts/${workout.id}/results`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...scoreData, allowFutureCompletion: true }),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to log result');
      }

      if (data.result.isPR) {
        toast.success(t('toast.newPrTitle'), {
          description: t('toast.newPrDescription', {
            diff: formatScoreDiff(data.previousBest, data.result, workout.format, t),
          }),
        });
      } else {
        toast.success(t('toast.logged'));
      }

      onSuccess();
    } catch (error) {
      console.error('Failed to log result:', error);
      toast.error(t('toast.logFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Scaling Level */}
      <div className="space-y-2">
        <Label>{t('form.scalingLevel')}</Label>
        <Select value={scalingLevel} onValueChange={handleScalingChange}>
          <SelectTrigger>
            <SelectValue placeholder={t('form.chooseScaling')} />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(scalingLabels).map(([key, { labelKey }]) => (
              <SelectItem key={key} value={key}>
                {t(labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {scalingLevel === 'CUSTOM' && (
          <p className="text-sm text-purple-600 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {t('form.describeCustomBelow')}
          </p>
        )}
      </div>

      {/* Custom Scaling Section */}
      {showCustomScaling && (
        <Card className="border-purple-200 bg-purple-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Edit className="h-4 w-4" />
              {t('customScaling.title')}
            </CardTitle>
            <CardDescription>
              {t('customScaling.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="scalingNotes">{t('customScaling.notesLabel')}</Label>
              <Textarea
                id="scalingNotes"
                placeholder={t('customScaling.notesPlaceholder')}
                value={scalingNotes}
                onChange={(e) => setScalingNotes(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>

            {/* Per-movement modifications */}
            <div>
              <Label className="mb-2 block">{t('customScaling.specificChanges')}</Label>
              <div className="space-y-2">
                {workout.movements.map((movement) => {
                  const existingMod = modifications.find((m) => m.movementId === movement.id);
                  if (existingMod) return null;

                  return (
                    <Button
                      key={movement.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addModification(movement)}
                      className="mr-2 mb-2"
                    >
                      + {movement.exercise.nameSv || movement.exercise.name}
                    </Button>
                  );
                })}
              </div>

              {modifications.length > 0 && (
                <div className="mt-4 space-y-3">
                  {modifications.map((mod, index) => (
                    <div key={mod.movementId} className="p-3 border rounded-lg bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{mod.movementName}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeModification(index)}
                        >
                          ×
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Select
                          value={mod.modificationType}
                          onValueChange={(v) =>
                            updateModification(index, 'modificationType', v as CustomModification['modificationType'])
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weight">{t('modificationTypes.weight')}</SelectItem>
                            <SelectItem value="reps">{t('modificationTypes.reps')}</SelectItem>
                            <SelectItem value="substitute">{t('modificationTypes.substitute')}</SelectItem>
                            <SelectItem value="skip">{t('modificationTypes.skip')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder={t('customScaling.from')}
                          value={mod.originalValue}
                          onChange={(e) => updateModification(index, 'originalValue', e.target.value)}
                          className="h-9"
                        />
                        <Input
                          placeholder={t('customScaling.to')}
                          value={mod.newValue}
                          onChange={(e) => updateModification(index, 'newValue', e.target.value)}
                          className="h-9"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Score Input */}
      <div className="space-y-2">
        <Label>{t('form.result')}</Label>
        {scoreType === 'TIME' && (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                type="number"
                placeholder={t('form.minutes')}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                min="0"
                className="h-12 text-lg text-center"
              />
            </div>
            <span className="text-2xl font-bold">:</span>
            <div className="flex-1">
              <Input
                type="number"
                placeholder={t('form.seconds')}
                value={seconds}
                onChange={(e) => setSeconds(e.target.value)}
                min="0"
                max="59"
                className="h-12 text-lg text-center"
              />
            </div>
          </div>
        )}

        {scoreType === 'ROUNDS_REPS' && (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">{t('form.rounds')}</Label>
              <Input
                type="number"
                placeholder="0"
                value={rounds}
                onChange={(e) => setRounds(e.target.value)}
                min="0"
                className="h-12 text-lg text-center"
              />
            </div>
            <span className="text-2xl font-bold mt-5">+</span>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">{t('form.reps')}</Label>
              <Input
                type="number"
                placeholder="0"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                min="0"
                className="h-12 text-lg text-center"
              />
            </div>
          </div>
        )}

        {/* Show PR comparison */}
        {personalBest && (
          <p className="text-sm text-muted-foreground">
            {t('form.personalBest', {
              score: formatScore(personalBest, workout.format),
              scaling: scalingLabels[personalBest.scalingLevel]
                ? t(scalingLabels[personalBest.scalingLevel].labelKey)
                : personalBest.scalingLevel,
            })}
          </p>
        )}
      </div>

      {/* RPE */}
      <div className="space-y-2">
        <Label>{t('form.rpe')}</Label>
        <Select value={rpe} onValueChange={setRpe}>
          <SelectTrigger>
            <SelectValue placeholder={t('form.chooseRpe')} />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <SelectItem key={n} value={n.toString()}>
                {n} - {getRpeLabel(n, t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">{t('form.notes')}</Label>
        <Textarea
          id="notes"
          placeholder={t('form.notesPlaceholder')}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      {/* Submit */}
      <Button type="submit" className="w-full h-12" disabled={loading}>
        {loading ? (
          t('actions.saving')
        ) : (
          <>
            <Save className="h-5 w-5 mr-2" />
            {t('actions.saveResult')}
          </>
        )}
      </Button>
    </form>
  );
}

// Helper functions
function getScoreType(format: string): string {
  switch (format) {
    case 'FOR_TIME':
    case 'CHIPPER':
    case 'HYROX_SIM':
      return 'TIME';
    case 'AMRAP':
      return 'ROUNDS_REPS';
    case 'EMOM':
    case 'TABATA':
    case 'INTERVALS':
      return 'COMPLETION';
    default:
      return 'TIME';
  }
}

function formatScore(result: HybridWorkoutResult, format: string): string {
  const scoreType = result.scoreType || getScoreType(format);

  if (scoreType === 'TIME' && result.timeScore) {
    const minutes = Math.floor(result.timeScore / 60);
    const seconds = result.timeScore % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  if (scoreType === 'ROUNDS_REPS') {
    if (result.repsCompleted && !result.roundsCompleted) {
      return `${result.repsCompleted} reps`;
    }
    return `${result.roundsCompleted || 0}+${result.repsCompleted || 0}`;
  }
  return '-';
}

function formatScoreDiff(
  previous: HybridWorkoutResult | null,
  current: HybridWorkoutResult,
  format: string,
  t: ReturnType<typeof useTranslations>
): string {
  if (!previous) return '';

  if (current.timeScore && previous.timeScore) {
    const diff = previous.timeScore - current.timeScore;
    const mins = Math.floor(Math.abs(diff) / 60);
    const secs = Math.abs(diff) % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  if (current.roundsCompleted !== undefined && previous.roundsCompleted !== undefined) {
    const currentTotal = (current.roundsCompleted || 0) * 100 + (current.repsCompleted || 0);
    const previousTotal = (previous.roundsCompleted || 0) * 100 + (previous.repsCompleted || 0);
    const diff = currentTotal - previousTotal;
    return t('scoreDiff.rounds', { count: Math.floor(diff / 100), sign: diff > 0 ? '+' : '' });
  }

  return '';
}

function getRpeLabel(rpe: number, t: ReturnType<typeof useTranslations>): string {
  const keys: Record<number, TranslationKey> = {
    1: 'rpeLabels.1',
    2: 'rpeLabels.2',
    3: 'rpeLabels.3',
    4: 'rpeLabels.4',
    5: 'rpeLabels.5',
    6: 'rpeLabels.6',
    7: 'rpeLabels.7',
    8: 'rpeLabels.8',
    9: 'rpeLabels.9',
    10: 'rpeLabels.10',
  };
  return keys[rpe] ? t(keys[rpe]) : '';
}
