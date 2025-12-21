'use client';

/**
 * Strength Session Library Component
 *
 * Grid/list view of saved strength sessions with:
 * - Search and filter
 * - Click to open detail sheet
 * - Quick actions
 */

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
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
  Dumbbell,
  Clock,
  Users,
  Loader2,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import type { StrengthSessionData } from '@/types';
import { StrengthSessionDetailSheet } from './StrengthSessionDetailSheet';
import { StrengthSessionAssignmentDialog } from './StrengthSessionAssignmentDialog';
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME } from '@/lib/themes';

interface StrengthSessionLibraryProps {
  onNewSession?: () => void;
  onEditSession?: (session: StrengthSessionData) => void;
}

const phaseLabels: Record<string, { label: string; color: string }> = {
  ANATOMICAL_ADAPTATION: { label: 'Anatom. Anpassning', color: 'bg-blue-500' },
  MAXIMUM_STRENGTH: { label: 'Maxstyrka', color: 'bg-red-500' },
  POWER: { label: 'Power', color: 'bg-orange-500' },
  MAINTENANCE: { label: 'Underhåll', color: 'bg-green-500' },
  TAPER: { label: 'Taper', color: 'bg-purple-500' },
};

export function StrengthSessionLibrary({
  onNewSession,
  onEditSession,
}: StrengthSessionLibraryProps) {
  const themeContext = useWorkoutThemeOptional();
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME;

  const [sessions, setSessions] = useState<StrengthSessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<string>('all');

  // Sheet state
  const [sheetSession, setSheetSession] = useState<StrengthSessionData | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Assignment dialog state
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assignSessionId, setAssignSessionId] = useState<string | undefined>();
  const [assignSessionName, setAssignSessionName] = useState<string | undefined>();

  // Delete confirmation
  const [deleteSession, setDeleteSession] = useState<StrengthSessionData | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (phaseFilter && phaseFilter !== 'all') params.set('phase', phaseFilter);
      params.set('limit', '50');

      const response = await fetch(`/api/strength-sessions?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      logger.error('Failed to fetch strength sessions', {}, error);
    } finally {
      setLoading(false);
    }
  }, [search, phaseFilter]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  function handleOpenSheet(session: StrengthSessionData) {
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
      const response = await fetch(`/api/strength-sessions/${deleteSession.id}`, {
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
        <Select value={phaseFilter} onValueChange={setPhaseFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Alla faser" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla faser</SelectItem>
            <SelectItem value="ANATOMICAL_ADAPTATION">Anatomisk Anpassning</SelectItem>
            <SelectItem value="MAXIMUM_STRENGTH">Maxstyrka</SelectItem>
            <SelectItem value="POWER">Power</SelectItem>
            <SelectItem value="MAINTENANCE">Underhåll</SelectItem>
            <SelectItem value="TAPER">Taper</SelectItem>
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
        <Card className="p-12 text-center" style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <Dumbbell className="h-12 w-12 mx-auto mb-4" style={{ color: theme.colors.textMuted }} />
          <h3 className="text-lg font-medium mb-2" style={{ color: theme.colors.textPrimary }}>Inga pass ännu</h3>
          <p className="text-sm mb-4" style={{ color: theme.colors.textMuted }}>
            {search || phaseFilter !== 'all'
              ? 'Inga pass matchar din sökning.'
              : 'Skapa ditt första styrkepass för att komma igång.'}
          </p>
          {onNewSession && !search && phaseFilter === 'all' && (
            <Button onClick={onNewSession}>
              <Plus className="h-4 w-4 mr-2" />
              Skapa Pass
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => {
            const phaseInfo = phaseLabels[session.phase] || { label: session.phase, color: 'bg-gray-500' };
            const exercises = session.exercises || [];

            return (
              <Card
                key={session.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}
                onClick={() => handleOpenSheet(session)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Dumbbell className="h-4 w-4 text-red-500" />
                      <h3 className="font-medium truncate" style={{ color: theme.colors.textPrimary }}>{session.name}</h3>
                    </div>
                    <Badge className={`${phaseInfo.color} text-white text-xs`}>
                      {phaseInfo.label}
                    </Badge>
                  </div>

                  {session.description && (
                    <p className="text-sm line-clamp-2 mb-3" style={{ color: theme.colors.textMuted }}>
                      {session.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm" style={{ color: theme.colors.textMuted }}>
                    <span className="flex items-center gap-1">
                      <Dumbbell className="h-3.5 w-3.5" />
                      {exercises.length} övningar
                    </span>
                    {session.estimatedDuration && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {session.estimatedDuration} min
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
      <StrengthSessionDetailSheet
        session={sheetSession}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        onEdit={handleSheetEdit}
        onDelete={handleSheetDelete}
        onAssign={handleSheetAssign}
      />

      {/* Assignment Dialog */}
      <StrengthSessionAssignmentDialog
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
