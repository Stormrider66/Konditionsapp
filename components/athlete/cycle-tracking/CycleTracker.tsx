'use client';

/**
 * Cycle Tracker Component
 *
 * Main dashboard for menstrual cycle tracking:
 * - Current phase indicator with visual
 * - Cycle calendar view
 * - Quick symptom logging
 * - AI-powered recommendations
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { Loader2, Calendar, Play, TrendingUp, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from '@/i18n/client';

interface CycleTrackerProps {
  clientId: string;
}

interface CycleData {
  hasCycle: boolean;
  cycle?: {
    id: string;
    cycleNumber: number;
    startDate: string;
    cycleDay: number;
    phase: 'MENSTRUAL' | 'FOLLICULAR' | 'OVULATORY' | 'LUTEAL';
    daysUntilNextPhase: number;
  };
  recommendations?: {
    intensityModifier: number;
    volumeModifier: number;
    focusAreas: string[];
    description: string;
    tips: string[];
  };
  recentLogs?: any[];
  message?: string;
}

const PHASE_COLORS: Record<string, string> = {
  MENSTRUAL: 'bg-red-500',
  FOLLICULAR: 'bg-green-500',
  OVULATORY: 'bg-yellow-500',
  LUTEAL: 'bg-purple-500',
};

const PHASE_ICONS: Record<string, string> = {
  MENSTRUAL: '🔴',
  FOLLICULAR: '🌱',
  OVULATORY: '🌸',
  LUTEAL: '🌙',
};

export function CycleTracker({ clientId }: CycleTrackerProps) {
  const { toast } = useToast();
  const t = useTranslations('components.cycleTracker');
  const [loading, setLoading] = useState(true);
  const [cycleData, setCycleData] = useState<CycleData | null>(null);
  const [showLogForm, setShowLogForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Quick log form state
  const [flowIntensity, setFlowIntensity] = useState(0);
  const [cramps, setCramps] = useState(1);
  const [fatigue, setFatigue] = useState(1);
  const [moodScore, setMoodScore] = useState(3);

  const phaseLabel = useCallback((phase?: string) => {
    if (!phase) return t('phases.unknown');
    const phaseKey = phase.toLowerCase() as 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';
    if (!['menstrual', 'follicular', 'ovulatory', 'luteal'].includes(phaseKey)) {
      return t('phases.unknown');
    }
    return t(`phases.${phaseKey}`);
  }, [t]);

  const fetchCycleData = useCallback(async () => {
    try {
      const response = await fetch(`/api/menstrual-cycle?clientId=${clientId}`);
      if (!response.ok) throw new Error('Failed to fetch cycle data');
      const data = await response.json();
      setCycleData(data);
    } catch (error) {
      console.error('Error fetching cycle data:', error);
      toast({
        title: t('toasts.errorTitle'),
        description: t('toasts.fetchError'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [clientId, toast]);

  useEffect(() => {
    fetchCycleData();
  }, [fetchCycleData]);

  const startNewCycle = async () => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/menstrual-cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, action: 'start' }),
      });

      if (!response.ok) throw new Error('Failed to start cycle');

      toast({
        title: t('toasts.cycleStartedTitle'),
        description: t('toasts.cycleStartedDescription'),
      });

      await fetchCycleData();
    } catch (error) {
      console.error('Error starting cycle:', error);
      toast({
        title: t('toasts.errorTitle'),
        description: t('toasts.startError'),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const submitDailyLog = async () => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/menstrual-cycle/daily-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          flowIntensity: flowIntensity > 0 ? flowIntensity : null,
          cramps,
          fatigue,
          moodScore,
        }),
      });

      if (!response.ok) throw new Error('Failed to save log');

      const result = await response.json();

      toast({
        title: t('toasts.logSavedTitle'),
        description: t('toasts.logSavedDescription', {
          day: result.cycleInfo?.cycleDay || '?',
          phase: phaseLabel(result.cycleInfo?.phase),
        }),
      });

      // Show warnings if any
      if (result.warnings?.length > 0) {
        toast({
          title: t('toasts.warningTitle'),
          description: result.warnings[0],
          variant: 'destructive',
        });
      }

      setShowLogForm(false);
      await fetchCycleData();
    } catch (error) {
      console.error('Error saving log:', error);
      toast({
        title: t('toasts.errorTitle'),
        description: t('toasts.saveError'),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  // No active cycle
  if (!cycleData?.hasCycle) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          <CardDescription>
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              {t('empty')}
            </AlertDescription>
          </Alert>
          <Button onClick={startNewCycle} disabled={submitting} className="w-full">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            {t('actions.startCycle')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { cycle, recommendations } = cycleData;

  return (
    <div className="space-y-4">
      {/* Current Phase Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">{PHASE_ICONS[cycle!.phase]}</span>
              {phaseLabel(cycle!.phase)}
            </CardTitle>
            <Badge className={`${PHASE_COLORS[cycle!.phase]} text-white`}>
              {t('day', { day: cycle!.cycleDay })}
            </Badge>
          </div>
          <CardDescription>
            {t('cycleSummary', {
              cycle: cycle!.cycleNumber,
              days: cycle!.daysUntilNextPhase,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Phase Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('progress')}</span>
              <span className="font-medium">{Math.round((cycle!.cycleDay / 28) * 100)}%</span>
            </div>
            <div className="flex gap-1">
              {/* Visual cycle bar */}
              <div className={`h-3 rounded-l-full ${cycle!.cycleDay >= 1 ? 'bg-red-500' : 'bg-gray-200'}`} style={{ width: '18%' }} title={t('phaseTitles.menstruation')} />
              <div className={`h-3 ${cycle!.cycleDay >= 6 ? 'bg-green-500' : 'bg-gray-200'}`} style={{ width: '28%' }} title={t('phaseTitles.follicular')} />
              <div className={`h-3 ${cycle!.cycleDay >= 14 ? 'bg-yellow-500' : 'bg-gray-200'}`} style={{ width: '11%' }} title={t('phaseTitles.ovulation')} />
              <div className={`h-3 rounded-r-full ${cycle!.cycleDay >= 17 ? 'bg-purple-500' : 'bg-gray-200'}`} style={{ width: '43%' }} title={t('phaseTitles.luteal')} />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t('day', { day: 1 })}</span>
              <span>{t('day', { day: 6 })}</span>
              <span>{t('day', { day: 14 })}</span>
              <span>{t('day', { day: 17 })}</span>
              <span>{t('day', { day: 28 })}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Training Recommendations */}
      {recommendations && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              {t('recommendations.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{recommendations.description}</p>

            {/* Modifiers */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">{t('recommendations.intensity')}</p>
                <p className="font-bold text-lg">
                  {Math.round(recommendations.intensityModifier * 100)}%
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">{t('recommendations.volume')}</p>
                <p className="font-bold text-lg">
                  {Math.round(recommendations.volumeModifier * 100)}%
                </p>
              </div>
            </div>

            {/* Focus Areas */}
            <div>
              <p className="text-sm font-medium mb-2">{t('recommendations.focusAreas')}</p>
              <div className="flex flex-wrap gap-2">
                {recommendations.focusAreas.map((area, i) => (
                  <Badge key={i} variant="secondary">{area}</Badge>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div>
              <p className="text-sm font-medium mb-2">{t('recommendations.tips')}</p>
              <ul className="space-y-1">
                {recommendations.tips.slice(0, 3).map((tip, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 shrink-0 mt-0.5" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Daily Log */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t('log.title')}</CardTitle>
            {!showLogForm && (
              <Button variant="outline" size="sm" onClick={() => setShowLogForm(true)}>
                {t('actions.logNow')}
              </Button>
            )}
          </div>
        </CardHeader>
        {showLogForm && (
          <CardContent className="space-y-4">
            {/* Flow Intensity */}
            <div>
              <label className="text-sm font-medium">
                {t('log.flow')}: {flowIntensity === 0 ? t('log.none') : `${flowIntensity}/5`}
              </label>
              <Slider
                min={0}
                max={5}
                step={1}
                value={[flowIntensity]}
                onValueChange={([v]) => setFlowIntensity(v)}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{t('log.none')}</span>
                <span>{t('log.heavy')}</span>
              </div>
            </div>

            {/* Cramps */}
            <div>
              <label className="text-sm font-medium">
                {t('log.cramps')}: {cramps}/5
              </label>
              <Slider
                min={1}
                max={5}
                step={1}
                value={[cramps]}
                onValueChange={([v]) => setCramps(v)}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{t('log.noCramps')}</span>
                <span>{t('log.severe')}</span>
              </div>
            </div>

            {/* Fatigue */}
            <div>
              <label className="text-sm font-medium">
                {t('log.fatigue')}: {fatigue}/5
              </label>
              <Slider
                min={1}
                max={5}
                step={1}
                value={[fatigue]}
                onValueChange={([v]) => setFatigue(v)}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{t('log.energetic')}</span>
                <span>{t('log.exhausted')}</span>
              </div>
            </div>

            {/* Mood */}
            <div>
              <label className="text-sm font-medium">
                {t('log.mood')}: {moodScore}/5
              </label>
              <Slider
                min={1}
                max={5}
                step={1}
                value={[moodScore]}
                onValueChange={([v]) => setMoodScore(v)}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{t('log.low')}</span>
                <span>{t('log.excellent')}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={submitDailyLog}
                disabled={submitting}
                className="flex-1"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t('actions.save')}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowLogForm(false)}
                disabled={submitting}
              >
                {t('actions.cancel')}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Start New Cycle Button */}
      <Button
        variant="outline"
        className="w-full"
        onClick={startNewCycle}
        disabled={submitting}
      >
        {t('actions.restartCycle')}
      </Button>
    </div>
  );
}
