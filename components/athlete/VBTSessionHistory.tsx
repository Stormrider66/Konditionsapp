'use client';

/**
 * VBT Session History Component
 *
 * Displays list of VBT sessions with exercise summaries
 * and velocity metrics.
 */

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Gauge,
  Calendar,
  Dumbbell,
  Trash2,
  ChevronRight,
  Smartphone,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { enUS, sv } from 'date-fns/locale';
import { useLocale, useTranslations } from '@/i18n/client';

interface VBTSession {
  id: string;
  sessionDate: string;
  deviceType: string;
  deviceName?: string;
  fileName?: string;
  totalSets: number;
  totalReps: number;
  exerciseCount: number;
  notes?: string;
  sessionRPE?: number;
  bodyWeight?: number;
  createdAt: string;
  exercises: {
    name: string;
    sets: number;
    reps: number;
    avgVelocity?: number;
    avgLoad?: number;
  }[];
}

interface VBTSessionHistoryProps {
  clientId: string;
  limit?: number;
  onSessionClick?: (sessionId: string) => void;
}

const DEVICE_LABELS: Record<string, string> = {
  VMAXPRO: 'Vmaxpro',
  VITRUVE: 'Vitruve',
  GYMAWARE: 'GymAware',
  PUSH: 'PUSH Band',
  PERCH: 'Perch',
  TENDO: 'Tendo',
  GENERIC: 'CSV Import',
};

export function VBTSessionHistory({
  clientId,
  limit = 10,
  onSessionClick,
}: VBTSessionHistoryProps) {
  const t = useTranslations('components.vbtSessionHistory');
  const [sessions, setSessions] = useState<VBTSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/athlete/vbt?clientId=${clientId}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(t('errors.fetchFailed'));
      }

      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setIsLoading(false);
    }
  }, [clientId, limit, t]);

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm(t('confirmDelete'))) {
      return;
    }

    setDeletingId(sessionId);

    try {
      const response = await fetch(
        `/api/athlete/vbt?sessionId=${sessionId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error(t('errors.deleteFailed'));
      }

      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      alert(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            {t('title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            {t('title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="h-5 w-5" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <div className="text-center py-8">
            <Gauge className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('emptyTitle')}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {t('emptyDescription')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onClick={() => onSessionClick?.(session.id)}
                onDelete={(e) => handleDelete(session.id, e)}
                isDeleting={deletingId === session.id}
                t={t}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SessionCard({
  session,
  onClick,
  onDelete,
  isDeleting,
  t,
}: {
  session: VBTSession;
  onClick?: () => void;
  onDelete: (e: React.MouseEvent) => void;
  isDeleting: boolean;
  t: (key: string, values?: Record<string, string | number | Date>) => string;
}) {
  const locale = useLocale();
  const dateLocale = locale === 'en' ? enUS : sv;
  const sessionDate = new Date(session.sessionDate);

  return (
    <div
      className={`border rounded-lg p-3 space-y-2 transition-colors ${
        onClick ? 'hover:bg-gray-50/50 cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">
              {format(sessionDate, 'EEEE d MMMM', { locale: dateLocale })}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(sessionDate, {
                addSuffix: true,
                locale: dateLocale,
              })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="text-xs">
              <Smartphone className="h-3 w-3 mr-1" />
              {DEVICE_LABELS[session.deviceType] || session.deviceType}
            </Badge>
            <span>{t('exerciseCount', { count: session.exerciseCount })}</span>
            <span>{session.totalSets} set</span>
            <span>{session.totalReps} reps</span>
            {session.sessionRPE && (
              <Badge variant="outline" className="text-xs">
                RPE {session.sessionRPE}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          {onClick && (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Exercise Summary */}
      <div className="flex flex-wrap gap-2 pt-1">
        {session.exercises.slice(0, 4).map((ex, i) => (
          <Badge
            key={i}
            variant="outline"
            className="text-xs font-normal"
          >
            <Dumbbell className="h-3 w-3 mr-1" />
            {ex.name}
            {ex.avgVelocity && (
              <span className="ml-1 text-muted-foreground">
                {ex.avgVelocity.toFixed(2)} m/s
              </span>
            )}
          </Badge>
        ))}
        {session.exercises.length > 4 && (
          <Badge variant="outline" className="text-xs font-normal">
            {t('moreExercises', { count: session.exercises.length - 4 })}
          </Badge>
        )}
      </div>

      {session.notes && (
        <p className="text-xs text-muted-foreground line-clamp-1 pt-1">
          {session.notes}
        </p>
      )}
    </div>
  );
}
