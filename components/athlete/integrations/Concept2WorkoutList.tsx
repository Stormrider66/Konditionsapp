'use client';

/**
 * Concept2 Workout List Component
 *
 * Displays synced Concept2 workouts with filtering and import-to-test functionality.
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
  GlassCardDescription
} from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';
import {
  Waves,
  Timer,
  Ruler,
  Flame,
  Heart,
  Activity,
  ArrowUpRight,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileInput,
  CheckCircle2,
} from 'lucide-react';

interface Concept2Workout {
  id: string;
  concept2Id: number;
  type: string;
  workoutType?: string;
  date: string;
  distance: number;
  time: number;
  calories?: number;
  strokeRate?: number;
  dragFactor?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  pace?: number;
  tss?: number;
  isVerified?: boolean;
  comments?: string;
}

interface Concept2WorkoutListProps {
  clientId: string;
  variant?: 'default' | 'glass';
  maxItems?: number;
}

const EQUIPMENT_LABELS: Record<string, string> = {
  rower: 'Roddmaskin',
  skierg: 'SkiErg',
  bike: 'BikeErg',
  dynamic: 'DynamicErg',
  slides: 'Slides',
  multierg: 'MultiErg',
  water: 'Rodd (vatten)',
  snow: 'Längdskidor',
  rollerski: 'Rullskidor',
  paddle: 'Paddling',
};

const EQUIPMENT_ICONS: Record<string, string> = {
  rower: 'Waves',
  skierg: 'Activity',
  bike: 'Activity',
};

export function Concept2WorkoutList({
  clientId,
  variant = 'default',
  maxItems = 20,
}: Concept2WorkoutListProps) {
  const { toast } = useToast();
  const isGlass = variant === 'glass';
  const [workouts, setWorkouts] = useState<Concept2Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<string | null>(null);
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState(false);

  const fetchWorkouts = useCallback(async () => {
    try {
      const typeParam = filter !== 'all' ? `&type=${filter}` : '';
      const response = await fetch(
        `/api/athlete/concept2/workouts?clientId=${clientId}&limit=${maxItems}${typeParam}`
      );
      if (response.ok) {
        const data = await response.json();
        setWorkouts(data.workouts || []);
      }
    } catch (error) {
      console.error('Failed to fetch Concept2 workouts:', error);
    } finally {
      setLoading(false);
    }
  }, [clientId, filter, maxItems]);

  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  const handleImportAsTest = async (workout: Concept2Workout) => {
    setImporting(workout.id);
    try {
      const response = await fetch('/api/athlete/concept2/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          concept2ResultId: workout.id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setImportedIds(prev => new Set(prev).add(workout.id));
        toast({
          title: 'Import klar',
          description: `Träningspass importerat som ${data.protocol || 'test'}`,
        });
      } else {
        toast({
          title: 'Fel',
          description: data.error || 'Kunde inte importera passet',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Fel',
        description: 'Kunde inte importera passet',
        variant: 'destructive',
      });
    } finally {
      setImporting(null);
    }
  };

  const formatTime = (tenths: number) => {
    const totalSeconds = Math.floor(tenths / 10);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const deciseconds = tenths % 10;
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${deciseconds}`;
  };

  const formatPace = (paceSeconds?: number) => {
    if (!paceSeconds) return '-';
    const minutes = Math.floor(paceSeconds / 60);
    const seconds = Math.round(paceSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}/500m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sv-SE', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const CardWrapper = isGlass ? GlassCard : Card;
  const displayWorkouts = expanded ? workouts : workouts.slice(0, 5);

  if (loading) {
    return (
      <CardWrapper>
        <CardHeader>
          <CardTitle className={cn(isGlass ? 'text-white font-black uppercase italic' : '')}>
            Concept2 Träningspass
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </CardWrapper>
    );
  }

  if (workouts.length === 0) {
    return (
      <CardWrapper>
        <CardHeader>
          <CardTitle className={cn(isGlass ? 'text-white font-black uppercase italic' : '')}>
            <Waves className="h-5 w-5 inline mr-2" />
            Concept2 Träningspass
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={cn(
            'text-center py-8',
            isGlass ? 'text-slate-500' : 'text-muted-foreground'
          )}>
            <Waves className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Inga träningspass synkroniserade</p>
            <p className="text-sm mt-1">
              Anslut ditt Concept2-konto och synka för att se dina pass här.
            </p>
          </div>
        </CardContent>
      </CardWrapper>
    );
  }

  return (
    <CardWrapper>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className={cn(
            'flex items-center gap-2',
            isGlass ? 'text-white font-black uppercase italic' : ''
          )}>
            <Waves className={cn('h-5 w-5', isGlass ? 'text-cyan-400' : 'text-cyan-600')} />
            Concept2 Träningspass
          </CardTitle>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className={cn(
              'w-[140px] h-8 text-xs',
              isGlass ? 'bg-white/5 border-white/10 text-white' : ''
            )}>
              <SelectValue placeholder="Alla typer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla typer</SelectItem>
              <SelectItem value="rower">Roddmaskin</SelectItem>
              <SelectItem value="skierg">SkiErg</SelectItem>
              <SelectItem value="bike">BikeErg</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <CardDescription className={cn(isGlass ? 'text-slate-500' : '')}>
          {workouts.length} synkroniserade pass
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayWorkouts.map(workout => (
          <div
            key={workout.id}
            className={cn(
              'rounded-xl p-4 transition-all duration-300',
              isGlass
                ? 'bg-white/[0.02] border border-white/5 hover:bg-white/5'
                : 'border hover:bg-muted/50'
            )}
          >
            <div className="flex items-start justify-between gap-4">
              {/* Left: Equipment & Date */}
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center',
                  isGlass ? 'bg-cyan-500/10 border border-cyan-500/20' : 'bg-cyan-100'
                )}>
                  <Waves className={cn('h-5 w-5', isGlass ? 'text-cyan-400' : 'text-cyan-600')} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'font-bold text-sm',
                      isGlass ? 'text-white' : ''
                    )}>
                      {EQUIPMENT_LABELS[workout.type] || workout.type}
                    </span>
                    {workout.isVerified && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    )}
                  </div>
                  <span className={cn(
                    'text-xs',
                    isGlass ? 'text-slate-500' : 'text-muted-foreground'
                  )}>
                    {formatDate(workout.date)}
                  </span>
                </div>
              </div>

              {/* Right: Import button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleImportAsTest(workout)}
                disabled={importing === workout.id || importedIds.has(workout.id)}
                className={cn(
                  'h-8 text-[10px] font-bold uppercase tracking-wider',
                  importedIds.has(workout.id)
                    ? 'text-emerald-500'
                    : isGlass
                      ? 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10'
                      : 'text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50'
                )}
              >
                {importing === workout.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : importedIds.has(workout.id) ? (
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                ) : (
                  <FileInput className="h-3.5 w-3.5 mr-1.5" />
                )}
                {importedIds.has(workout.id) ? 'Importerad' : 'Importera som test'}
              </Button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-4 gap-4 mt-4">
              <div>
                <div className={cn(
                  'text-[10px] font-bold uppercase tracking-wider mb-1',
                  isGlass ? 'text-slate-500' : 'text-muted-foreground'
                )}>
                  <Ruler className="h-3 w-3 inline mr-1" />
                  Distans
                </div>
                <div className={cn(
                  'text-sm font-bold',
                  isGlass ? 'text-white' : ''
                )}>
                  {workout.distance}m
                </div>
              </div>

              <div>
                <div className={cn(
                  'text-[10px] font-bold uppercase tracking-wider mb-1',
                  isGlass ? 'text-slate-500' : 'text-muted-foreground'
                )}>
                  <Timer className="h-3 w-3 inline mr-1" />
                  Tid
                </div>
                <div className={cn(
                  'text-sm font-bold',
                  isGlass ? 'text-white' : ''
                )}>
                  {formatTime(workout.time)}
                </div>
              </div>

              <div>
                <div className={cn(
                  'text-[10px] font-bold uppercase tracking-wider mb-1',
                  isGlass ? 'text-slate-500' : 'text-muted-foreground'
                )}>
                  <Activity className="h-3 w-3 inline mr-1" />
                  Pace
                </div>
                <div className={cn(
                  'text-sm font-bold',
                  isGlass ? 'text-white' : ''
                )}>
                  {formatPace(workout.pace)}
                </div>
              </div>

              <div>
                <div className={cn(
                  'text-[10px] font-bold uppercase tracking-wider mb-1',
                  isGlass ? 'text-slate-500' : 'text-muted-foreground'
                )}>
                  <Heart className="h-3 w-3 inline mr-1" />
                  Puls
                </div>
                <div className={cn(
                  'text-sm font-bold',
                  isGlass ? 'text-white' : ''
                )}>
                  {workout.avgHeartRate ? `${Math.round(workout.avgHeartRate)} bpm` : '-'}
                </div>
              </div>
            </div>

            {/* Additional metrics row */}
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-dashed border-white/5">
              {workout.strokeRate && (
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[9px] font-bold',
                    isGlass ? 'border-white/10 text-slate-400' : ''
                  )}
                >
                  {Math.round(workout.strokeRate)} spm
                </Badge>
              )}
              {workout.calories && (
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[9px] font-bold',
                    isGlass ? 'border-white/10 text-slate-400' : ''
                  )}
                >
                  <Flame className="h-3 w-3 mr-1" />
                  {workout.calories} kcal
                </Badge>
              )}
              {workout.dragFactor && (
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[9px] font-bold',
                    isGlass ? 'border-white/10 text-slate-400' : ''
                  )}
                >
                  Drag: {workout.dragFactor}
                </Badge>
              )}
              {workout.tss && (
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[9px] font-bold',
                    isGlass ? 'border-white/10 text-slate-400' : ''
                  )}
                >
                  TSS: {Math.round(workout.tss)}
                </Badge>
              )}
            </div>
          </div>
        ))}

        {workouts.length > 5 && (
          <Button
            variant="ghost"
            className={cn(
              'w-full h-10 text-[11px] font-bold uppercase tracking-wider',
              isGlass ? 'text-slate-400 hover:text-white hover:bg-white/5' : ''
            )}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2" />
                Visa mindre
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                Visa alla {workouts.length} pass
              </>
            )}
          </Button>
        )}
      </CardContent>
    </CardWrapper>
  );
}
