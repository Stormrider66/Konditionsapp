'use client';

/**
 * Cardio Session Detail Sheet Component
 *
 * Slide-out sheet showing full session details with actions:
 * - View all segments with duration/pace/zone
 * - Edit, Delete, Assign, Export actions
 * - Recent assignments history
 */

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Edit,
  Trash2,
  Users,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  MapPin,
  Activity,
  Zap,
} from 'lucide-react';
import type { CardioSessionData, CardioSegment, SessionAssignment } from '@/types';
import { SessionExportButton } from '@/components/exports/SessionExportButton';
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME } from '@/lib/themes';

interface CardioSessionDetailSheetProps {
  session: CardioSessionData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onAssign: () => void;
  onTeamAssign?: () => void;
}

const sportLabels: Record<string, { label: string; icon: string }> = {
  RUNNING: { label: 'Löpning', icon: '🏃' },
  CYCLING: { label: 'Cykling', icon: '🚴' },
  SWIMMING: { label: 'Simning', icon: '🏊' },
  SKIING: { label: 'Skidor', icon: '⛷️' },
  TRIATHLON: { label: 'Triathlon', icon: '🏊🚴🏃' },
  HYROX: { label: 'HYROX', icon: '💪' },
  GENERAL_FITNESS: { label: 'Allmän Kondition', icon: '🏋️' },
};

const segmentTypeLabels: Record<string, { label: string; color: string }> = {
  WARMUP: { label: 'Uppvärmning', color: 'bg-yellow-500' },
  COOLDOWN: { label: 'Nedvarvning', color: 'bg-blue-300' },
  INTERVAL: { label: 'Intervall', color: 'bg-red-500' },
  STEADY: { label: 'Jämnt tempo', color: 'bg-green-500' },
  RECOVERY: { label: 'Återhämtning', color: 'bg-gray-400' },
  HILL: { label: 'Backe', color: 'bg-orange-500' },
  DRILLS: { label: 'Teknik', color: 'bg-purple-500' },
};

const zoneColors: Record<number, string> = {
  1: 'bg-gray-400',
  2: 'bg-blue-500',
  3: 'bg-green-500',
  4: 'bg-yellow-500',
  5: 'bg-red-500',
};

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Väntande', color: 'bg-yellow-500' },
  SCHEDULED: { label: 'Schemalagd', color: 'bg-blue-500' },
  COMPLETED: { label: 'Genomförd', color: 'bg-green-500' },
  SKIPPED: { label: 'Hoppade över', color: 'bg-gray-500' },
  MODIFIED: { label: 'Modifierad', color: 'bg-purple-500' },
};

function formatDuration(seconds?: number): string {
  if (!seconds) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}min`;
  }
  return secs > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${mins} min`;
}

function formatDistance(meters?: number): string {
  if (!meters) return '-';
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${meters} m`;
}

export function CardioSessionDetailSheet({
  session,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onAssign,
  onTeamAssign,
}: CardioSessionDetailSheetProps) {
  const themeContext = useWorkoutThemeOptional();
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME;

  const [assignments, setAssignments] = useState<SessionAssignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [assignmentsOpen, setAssignmentsOpen] = useState(false);

  const fetchAssignments = useCallback(async () => {
    if (!session?.id) return;

    setLoadingAssignments(true);
    try {
      const response = await fetch(`/api/cardio-sessions/${session.id}/assign`);
      if (response.ok) {
        const data = await response.json();
        setAssignments(data.assignments || []);
      }
    } catch (error) {
      logger.error('Failed to fetch assignments', { sessionId: session?.id }, error);
    } finally {
      setLoadingAssignments(false);
    }
  }, [session?.id]);

  useEffect(() => {
    if (open && session?.id) {
      fetchAssignments();
    }
  }, [open, session?.id, fetchAssignments]);

  if (!session) return null;

  const sportInfo = sportLabels[session.sport] || { label: session.sport, icon: '🏃' };
  const segments = session.segments || [];

  // Prepare export data
  const exportData = {
    sessionName: session.name,
    sport: sportInfo.label,
    date: new Date(),
    segments: segments.map((s: CardioSegment, i: number) => ({
      order: i + 1,
      type: segmentTypeLabels[s.type]?.label || s.type,
      duration: s.duration,
      distance: s.distance,
      pace: s.pace,
      zone: s.zone,
      notes: s.notes,
    })),
    totalDuration: session.totalDuration,
    totalDistance: session.totalDistance,
    avgZone: session.avgZone,
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-lg overflow-y-auto"
        style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border }}
      >
        <SheetHeader className="pb-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <SheetTitle className="text-xl flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
                <span>{sportInfo.icon}</span>
                {session.name}
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2 mt-1" style={{ color: theme.colors.textMuted }}>
                <Activity className="h-4 w-4" />
                {sportInfo.label}
              </SheetDescription>
            </div>
            {session.avgZone && (
              <Badge className={`${zoneColors[Math.round(session.avgZone)] || 'bg-gray-500'} text-white`}>
                Zon {session.avgZone.toFixed(1)}
              </Badge>
            )}
          </div>
        </SheetHeader>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pb-4">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-1" />
            Redigera
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4 mr-1" />
            Ta bort
          </Button>
          <Button variant="outline" size="sm" onClick={onAssign}>
            <Users className="h-4 w-4 mr-1" />
            Tilldela
          </Button>
          {onTeamAssign && (
            <Button variant="outline" size="sm" onClick={onTeamAssign}>
              <Users className="h-4 w-4 mr-1" />
              Tilldela lag
            </Button>
          )}
          <SessionExportButton
            sessionType="cardio"
            getSessionData={() => exportData}
            variant="outline"
            size="sm"
          />
        </div>

        <Separator className="my-2" />

        {/* Description */}
        {session.description && (
          <div className="py-3">
            <p className="text-sm whitespace-pre-wrap" style={{ color: theme.colors.textMuted }}>{session.description}</p>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 py-3">
          <div
            className="text-center p-3 rounded-lg"
            style={{ backgroundColor: theme.id === 'FITAPP_DARK' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
          >
            <div className="text-2xl font-bold flex items-center justify-center gap-1" style={{ color: theme.colors.textPrimary }}>
              <Clock className="h-4 w-4" />
              {formatDuration(session.totalDuration)}
            </div>
            <div className="text-xs" style={{ color: theme.colors.textMuted }}>Total tid</div>
          </div>
          <div
            className="text-center p-3 rounded-lg"
            style={{ backgroundColor: theme.id === 'FITAPP_DARK' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
          >
            <div className="text-2xl font-bold flex items-center justify-center gap-1" style={{ color: theme.colors.textPrimary }}>
              <MapPin className="h-4 w-4" />
              {formatDistance(session.totalDistance)}
            </div>
            <div className="text-xs" style={{ color: theme.colors.textMuted }}>Distans</div>
          </div>
          <div
            className="text-center p-3 rounded-lg"
            style={{ backgroundColor: theme.id === 'FITAPP_DARK' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
          >
            <div className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>{segments.length}</div>
            <div className="text-xs" style={{ color: theme.colors.textMuted }}>Segment</div>
          </div>
        </div>

        <Separator className="my-2" />

        {/* Zone Distribution Bar */}
        {segments.some((s: CardioSegment) => s.zone && s.duration) && (
          <div className="py-3">
            <div className="text-sm font-medium mb-2 flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
              <Zap className="h-4 w-4" />
              Zonfördelning
            </div>
            <div className="h-4 flex rounded-lg overflow-hidden">
              {segments
                .filter((s: CardioSegment) => s.zone && s.duration)
                .map((s: CardioSegment, i: number) => {
                  const totalDuration = segments.reduce(
                    (sum: number, seg: CardioSegment) => sum + (seg.duration || 0),
                    0
                  );
                  const percentage = totalDuration > 0 ? ((s.duration || 0) / totalDuration) * 100 : 0;
                  return (
                    <div
                      key={i}
                      className={`${zoneColors[s.zone!] || 'bg-gray-400'} transition-all`}
                      style={{ width: `${percentage}%` }}
                      title={`Zon ${s.zone}: ${formatDuration(s.duration)}`}
                    />
                  );
                })}
            </div>
            <div className="flex justify-between text-xs mt-1" style={{ color: theme.colors.textMuted }}>
              <span>Z1-2 Lätt</span>
              <span>Z3 Medel</span>
              <span>Z4-5 Hårt</span>
            </div>
          </div>
        )}

        <Separator className="my-2" />

        {/* Segments */}
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.accent }}>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-base flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
              <Activity className="h-4 w-4 text-blue-500" />
              <span>Segment</span>
              <Badge variant="secondary">{segments.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {segments.length > 0 ? (
              <ul className="space-y-3">
                {segments.map((segment: CardioSegment, i: number) => {
                  const typeInfo = segmentTypeLabels[segment.type] || { label: segment.type, color: 'bg-gray-500' };
                  return (
                    <li key={segment.id || i} className="flex items-start gap-3 text-sm">
                      <span className="w-5 flex-shrink-0 font-medium" style={{ color: theme.colors.textMuted }}>
                        {i + 1}.
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge className={`${typeInfo.color} text-white text-xs`}>
                            {typeInfo.label}
                          </Badge>
                          {segment.zone && (
                            <Badge className={`${zoneColors[segment.zone]} text-white text-xs`}>
                              Z{segment.zone}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1" style={{ color: theme.colors.textMuted }}>
                          {segment.duration && formatDuration(segment.duration)}
                          {segment.distance && ` • ${formatDistance(segment.distance)}`}
                          {segment.pace && ` @ ${segment.pace}`}
                        </div>
                        {segment.notes && (
                          <div className="text-xs italic mt-1" style={{ color: theme.colors.textMuted }}>
                            {segment.notes}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm" style={{ color: theme.colors.textMuted }}>Inga segment tillagda</p>
            )}
          </CardContent>
        </Card>

        {/* Tags */}
        {session.tags && session.tags.length > 0 && (
          <div className="py-4">
            <div className="flex flex-wrap gap-1">
              {session.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Separator className="my-2" />

        {/* Assignments History */}
        <Collapsible open={assignmentsOpen} onOpenChange={setAssignmentsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-3 h-auto" style={{ color: theme.colors.textPrimary }}>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="font-semibold">Tilldelningar</span>
                <Badge variant="secondary">{session._count?.assignments || assignments.length}</Badge>
              </div>
              {assignmentsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-3 pb-3">
            {loadingAssignments ? (
              <p className="text-sm" style={{ color: theme.colors.textMuted }}>Laddar tilldelningar...</p>
            ) : assignments.length === 0 ? (
              <p className="text-sm" style={{ color: theme.colors.textMuted }}>Inga tilldelningar än</p>
            ) : (
              <ul className="space-y-2">
                {assignments.map((assignment) => {
                  const statusInfo = statusLabels[assignment.status] || { label: assignment.status, color: 'bg-gray-500' };
                  return (
                    <li key={assignment.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span style={{ color: theme.colors.textPrimary }}>{assignment.athlete?.name || 'Okänd'}</span>
                        <Badge className={`${statusInfo.color} text-white text-xs`}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <span className="text-xs" style={{ color: theme.colors.textMuted }}>
                        {new Date(assignment.assignedDate).toLocaleDateString('sv-SE')}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CollapsibleContent>
        </Collapsible>
      </SheetContent>
    </Sheet>
  );
}
