'use client';

/**
 * Cardio Session Library Component
 *
 * Grid/list view of saved cardio sessions with:
 * - Search and filter by sport
 * - Click to open detail sheet
 * - Quick actions
 */

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Search,
  Activity,
  Clock,
  MapPin,
  Users,
  Loader2,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import type { CardioSessionData } from '@/types';
import { CardioSessionDetailSheet } from './CardioSessionDetailSheet';
import { CardioSessionAssignmentDialog } from './CardioSessionAssignmentDialog';

interface CardioSessionLibraryProps {
  onNewSession?: () => void;
  onEditSession?: (session: CardioSessionData) => void;
}

const sportLabels: Record<string, { label: string; icon: string }> = {
  RUNNING: { label: 'Löpning', icon: '🏃' },
  CYCLING: { label: 'Cykling', icon: '🚴' },
  SWIMMING: { label: 'Simning', icon: '🏊' },
  SKIING: { label: 'Skidor', icon: '⛷️' },
  TRIATHLON: { label: 'Triathlon', icon: '🏊🚴🏃' },
  HYROX: { label: 'HYROX', icon: '💪' },
  GENERAL_FITNESS: { label: 'Allmän', icon: '🏋️' },
};

const zoneColors: Record<number, string> = {
  1: 'bg-gray-400',
  2: 'bg-blue-500',
  3: 'bg-green-500',
  4: 'bg-yellow-500',
  5: 'bg-red-500',
};

function formatDuration(seconds?: number): string {
  if (!seconds) return '-';
  const mins = Math.floor(seconds / 60);
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  }
  return `${mins} min`;
}

function formatDistance(meters?: number): string {
  if (!meters) return '';
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${meters} m`;
}

export function CardioSessionLibrary({
  onNewSession,
  onEditSession,
}: CardioSessionLibraryProps) {
  const [sessions, setSessions] = useState<CardioSessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState<string>('all');

  // Sheet state
  const [sheetSession, setSheetSession] = useState<CardioSessionData | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Assignment dialog state
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assignSessionId, setAssignSessionId] = useState<string | undefined>();
  const [assignSessionName, setAssignSessionName] = useState<string | undefined>();

  // Delete confirmation
  const [deleteSession, setDeleteSession] = useState<CardioSessionData | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, [search, sportFilter]);

  async function fetchSessions() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (sportFilter && sportFilter !== 'all') params.set('sport', sportFilter);
      params.set('limit', '50');

      const response = await fetch(`/api/cardio-sessions?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenSheet(session: CardioSessionData) {
    setSheetSession(session);
    setIsSheetOpen(true);
  }

  function handleSheetEdit() {
    if (sheetSession && onEditSession) {
      onEditSession(sheetSession);
      setIsSheetOpen(false);
    }
  }

  function handleSheetDelete() {
    if (sheetSession) {
      setDeleteSession(sheetSession);
      setIsSheetOpen(false);
    }
  }

  function handleSheetAssign() {
    if (sheetSession) {
      setAssignSessionId(sheetSession.id);
      setAssignSessionName(sheetSession.name);
      setIsAssignOpen(true);
    }
  }

  async function confirmDelete() {
    if (!deleteSession) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/cardio-sessions/${deleteSession.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Pass borttaget', {
          description: `"${deleteSession.name}" har tagits bort.`,
        });
        fetchSessions();
      } else {
        toast.error('Kunde inte ta bort passet');
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
      toast.error('Ett fel uppstod');
    } finally {
      setDeleting(false);
      setDeleteSession(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Sök pass..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sportFilter} onValueChange={setSportFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Alla sporter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla sporter</SelectItem>
            <SelectItem value="RUNNING">Löpning</SelectItem>
            <SelectItem value="CYCLING">Cykling</SelectItem>
            <SelectItem value="SWIMMING">Simning</SelectItem>
            <SelectItem value="SKIING">Skidor</SelectItem>
            <SelectItem value="TRIATHLON">Triathlon</SelectItem>
            <SelectItem value="HYROX">HYROX</SelectItem>
            <SelectItem value="GENERAL_FITNESS">Allmän Kondition</SelectItem>
          </SelectContent>
        </Select>
        {onNewSession && (
          <Button onClick={onNewSession}>
            <Plus className="h-4 w-4 mr-2" />
            Nytt Pass
          </Button>
        )}
      </div>

      {/* Sessions Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : sessions.length === 0 ? (
        <Card className="p-12 text-center">
          <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Inga pass ännu</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search || sportFilter !== 'all'
              ? 'Inga pass matchar din sökning.'
              : 'Skapa ditt första konditionspass för att komma igång.'}
          </p>
          {onNewSession && !search && sportFilter === 'all' && (
            <Button onClick={onNewSession}>
              <Plus className="h-4 w-4 mr-2" />
              Skapa Pass
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => {
            const sportInfo = sportLabels[session.sport] || { label: session.sport, icon: '🏃' };
            const segments = session.segments || [];

            return (
              <Card
                key={session.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => handleOpenSheet(session)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{sportInfo.icon}</span>
                      <h3 className="font-medium truncate">{session.name}</h3>
                    </div>
                    {session.avgZone && (
                      <Badge className={`${zoneColors[Math.round(session.avgZone)] || 'bg-gray-500'} text-white text-xs`}>
                        Z{session.avgZone.toFixed(1)}
                      </Badge>
                    )}
                  </div>

                  {session.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {session.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Activity className="h-3.5 w-3.5" />
                      {segments.length} segment
                    </span>
                    {session.totalDuration && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDuration(session.totalDuration)}
                      </span>
                    )}
                    {session.totalDistance && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {formatDistance(session.totalDistance)}
                      </span>
                    )}
                    {(session._count?.assignments ?? 0) > 0 && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {session._count?.assignments}
                      </span>
                    )}
                  </div>

                  {session.tags && session.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {session.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {session.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{session.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Sheet */}
      <CardioSessionDetailSheet
        session={sheetSession}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        onEdit={handleSheetEdit}
        onDelete={handleSheetDelete}
        onAssign={handleSheetAssign}
      />

      {/* Assignment Dialog */}
      <CardioSessionAssignmentDialog
        sessionId={assignSessionId}
        sessionName={assignSessionName}
        open={isAssignOpen}
        onOpenChange={setIsAssignOpen}
        onAssigned={() => {
          fetchSessions();
          setIsAssignOpen(false);
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteSession} onOpenChange={() => setDeleteSession(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort pass?</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill ta bort &quot;{deleteSession?.name}&quot;?
              Detta kan inte ångras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? 'Tar bort...' : 'Ta bort'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
