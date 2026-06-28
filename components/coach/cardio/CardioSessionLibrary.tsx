'use client';

/**
 * Cardio Session Library Component
 *
 * Grid/list view of saved cardio sessions with:
 * - Search and filter by sport
 * - Click to open detail sheet
 * - Quick actions
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { logger } from '@/lib/logger';
import { useLocale } from '@/i18n/client';
import {
  RolePanel as Card,
  RolePanelContent as CardContent,
} from '@/components/layouts/role-shell/RolePage';
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
  CalendarPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import type { CardioSessionData } from '@/types';
import { CardioSessionDetailSheet } from './CardioSessionDetailSheet';
import { CardioSessionAssignmentDialog } from './CardioSessionAssignmentDialog';
import { TeamWorkoutAssignmentDialog } from '@/components/coach/team/TeamWorkoutAssignmentDialog';
import { PlanTeamWorkoutDialog } from '@/components/coach/team-calendar/PlanTeamWorkoutDialog';
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME } from '@/lib/themes';
import { getBusinessScopeHeaders } from '@/lib/business-scope-client';
import {
  getWorkoutAthleteIdFromTags,
  getWorkoutAthleteTag,
  visibleWorkoutTags,
} from '@/lib/workouts/business-tags';
import {
  useWorkoutLibraryAthletes,
  useTeamNameLookup,
  useWorkoutLibraryTeams,
  WorkoutAthleteTagBadge,
  WorkoutAthleteTagFilter,
  WorkoutTeamYearBadges,
  WorkoutTeamYearFilters,
} from '@/components/workouts/WorkoutLibraryMetadataFields';

interface CardioSessionLibraryProps {
  onNewSession?: () => void;
  onEditSession?: (session: CardioSessionData) => void;
  businessId?: string;
  calendarAssignTarget?: {
    clientId: string;
    date: string;
  };
  onCalendarAssignSession?: (session: CardioSessionData) => void;
}

type AppLocale = 'en' | 'sv';

type LocalizedLabel = Record<AppLocale, string>;

function copy(locale: AppLocale, en: string, sv: string) {
  return locale === 'sv' ? sv : en;
}

const sportLabels: Record<string, { label: LocalizedLabel; icon: string }> = {
  RUNNING: { label: { en: 'Running', sv: 'Löpning' }, icon: '🏃' },
  CYCLING: { label: { en: 'Cycling', sv: 'Cykling' }, icon: '🚴' },
  SWIMMING: { label: { en: 'Swimming', sv: 'Simning' }, icon: '🏊' },
  SKIING: { label: { en: 'Skiing', sv: 'Skidor' }, icon: '⛷️' },
  TRIATHLON: { label: { en: 'Triathlon', sv: 'Triathlon' }, icon: '🏊🚴🏃' },
  HYROX: { label: { en: 'HYROX', sv: 'HYROX' }, icon: '💪' },
  GENERAL_FITNESS: { label: { en: 'General fitness', sv: 'Allmän kondition' }, icon: '🏋️' },
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

function getSportInfo(sport: string, locale: AppLocale) {
  const sportInfo = sportLabels[sport];
  return sportInfo
    ? { label: sportInfo.label[locale], icon: sportInfo.icon }
    : { label: sport, icon: '🏃' };
}

export function CardioSessionLibrary({
  onNewSession,
  onEditSession,
  businessId,
  calendarAssignTarget,
  onCalendarAssignSession,
}: CardioSessionLibraryProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en';
  const themeContext = useWorkoutThemeOptional();
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME;
  const pathname = usePathname();
  const businessHeaders = useMemo(() => ({
    ...(getBusinessScopeHeaders(pathname) ?? {}),
    ...(businessId ? { 'x-business-id': businessId } : {}),
  }), [businessId, pathname]);

  const [sessions, setSessions] = useState<CardioSessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [athleteFilter, setAthleteFilter] = useState<string>(calendarAssignTarget?.clientId ?? 'all');
  const { teams } = useWorkoutLibraryTeams(businessHeaders);
  const { athletes } = useWorkoutLibraryAthletes(businessHeaders, businessId);
  const teamNames = useTeamNameLookup(teams);
  const athleteNames = useMemo(() => {
    const names = new Map<string, string>();
    athletes.forEach((athlete) => names.set(athlete.id, athlete.name));
    return names;
  }, [athletes]);

  // Sheet state
  const [sheetSession, setSheetSession] = useState<CardioSessionData | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Assignment dialog state
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assignSessionId, setAssignSessionId] = useState<string | undefined>();
  const [assignSessionName, setAssignSessionName] = useState<string | undefined>();

  // Team assignment dialog state
  const [isTeamAssignOpen, setIsTeamAssignOpen] = useState(false);
  const [teamAssignSessionId, setTeamAssignSessionId] = useState<string | undefined>();
  const [teamAssignSessionName, setTeamAssignSessionName] = useState<string | undefined>();
  const [planSession, setPlanSession] = useState<CardioSessionData | null>(null);

  // Delete confirmation
  const [deleteSession, setDeleteSession] = useState<CardioSessionData | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (sportFilter && sportFilter !== 'all') params.set('sport', sportFilter);
      if (teamFilter && teamFilter !== 'all') params.set('teamId', teamFilter);
      if (yearFilter && yearFilter !== 'all') params.set('trainingYear', yearFilter);
      if (athleteFilter && athleteFilter !== 'all') params.append('tag', getWorkoutAthleteTag(athleteFilter));
      params.set('limit', '50');

      const response = await fetch(`/api/cardio-sessions?${params}`, {
        headers: businessHeaders,
      });
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      logger.error('Failed to fetch cardio sessions', {}, error);
    } finally {
      setLoading(false);
    }
  }, [athleteFilter, businessHeaders, search, sportFilter, teamFilter, yearFilter]);

  useEffect(() => {
    void Promise.resolve().then(fetchSessions);
  }, [fetchSessions]);

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

  function handleSheetTeamAssign() {
    if (sheetSession) {
      setTeamAssignSessionId(sheetSession.id);
      setTeamAssignSessionName(sheetSession.name);
      setIsTeamAssignOpen(true);
    }
  }

  async function confirmDelete() {
    if (!deleteSession) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/cardio-sessions/${deleteSession.id}`, {
        method: 'DELETE',
        headers: businessHeaders,
      });

      if (response.ok) {
        toast.success(copy(locale, 'Session deleted', 'Pass borttaget'), {
          description: copy(locale, `"${deleteSession.name}" has been deleted.`, `"${deleteSession.name}" har tagits bort.`),
        });
        void fetchSessions();
      } else {
        toast.error(copy(locale, 'Could not delete the session', 'Kunde inte ta bort passet'));
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
      toast.error(copy(locale, 'Something went wrong', 'Ett fel uppstod'));
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
            placeholder={copy(locale, 'Search sessions...', 'Sök pass...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sportFilter} onValueChange={setSportFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder={copy(locale, 'All sports', 'Alla sporter')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{copy(locale, 'All sports', 'Alla sporter')}</SelectItem>
            <SelectItem value="RUNNING">{copy(locale, 'Running', 'Löpning')}</SelectItem>
            <SelectItem value="CYCLING">{copy(locale, 'Cycling', 'Cykling')}</SelectItem>
            <SelectItem value="SWIMMING">{copy(locale, 'Swimming', 'Simning')}</SelectItem>
            <SelectItem value="SKIING">{copy(locale, 'Skiing', 'Skidor')}</SelectItem>
            <SelectItem value="TRIATHLON">{copy(locale, 'Triathlon', 'Triathlon')}</SelectItem>
            <SelectItem value="HYROX">HYROX</SelectItem>
            <SelectItem value="GENERAL_FITNESS">{copy(locale, 'General fitness', 'Allmän kondition')}</SelectItem>
          </SelectContent>
        </Select>
        <WorkoutTeamYearFilters
          teams={teams}
          teamFilter={teamFilter}
          yearFilter={yearFilter}
          onTeamFilterChange={setTeamFilter}
          onYearFilterChange={setYearFilter}
        />
        <WorkoutAthleteTagFilter
          athletes={athletes}
          athleteFilter={athleteFilter}
          onAthleteFilterChange={setAthleteFilter}
        />
        {onNewSession && (
          <Button onClick={onNewSession}>
            <Plus className="h-4 w-4 mr-2" />
            {copy(locale, 'New session', 'Nytt pass')}
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
          <Activity className="h-12 w-12 mx-auto mb-4" style={{ color: theme.colors.textMuted }} />
          <h3 className="text-lg font-medium mb-2" style={{ color: theme.colors.textPrimary }}>
            {copy(locale, 'No sessions yet', 'Inga pass ännu')}
          </h3>
          <p className="text-sm mb-4" style={{ color: theme.colors.textMuted }}>
            {search || sportFilter !== 'all' || teamFilter !== 'all' || yearFilter !== 'all'
              ? copy(locale, 'No sessions match your search.', 'Inga pass matchar din sökning.')
              : copy(locale, 'Create your first cardio session to get started.', 'Skapa ditt första konditionspass för att komma igång.')}
          </p>
          {onNewSession && !search && sportFilter === 'all' && teamFilter === 'all' && yearFilter === 'all' && (
            <Button onClick={onNewSession}>
              <Plus className="h-4 w-4 mr-2" />
              {copy(locale, 'Create session', 'Skapa pass')}
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => {
            const sportInfo = getSportInfo(session.sport, locale);
            const segments = session.segments || [];
            const visibleTags = visibleWorkoutTags(session.tags);
            const teamName = session.teamId ? teamNames.get(session.teamId) ?? copy(locale, 'Team', 'Lag') : null;
            const athleteTagId = getWorkoutAthleteIdFromTags(session.tags);
            const athleteName = athleteTagId ? athleteNames.get(athleteTagId) : null;

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
                      <span className="text-lg" title={sportInfo.label}>{sportInfo.icon}</span>
                      <h3 className="font-medium truncate" style={{ color: theme.colors.textPrimary }}>{session.name}</h3>
                    </div>
                    {session.avgZone && (
                      <Badge className={`${zoneColors[Math.round(session.avgZone)] || 'bg-gray-500'} text-white text-xs`}>
                        Z{session.avgZone.toFixed(1)}
                      </Badge>
                    )}
                  </div>

                  {session.description && (
                    <p className="text-sm line-clamp-2 mb-3" style={{ color: theme.colors.textMuted }}>
                      {session.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm" style={{ color: theme.colors.textMuted }}>
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

                  {visibleTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {visibleTags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {visibleTags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{visibleTags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                  <WorkoutTeamYearBadges
                    teamName={teamName}
                    trainingYear={session.trainingYear}
                    className="mt-3 flex flex-wrap gap-1"
                  />
                  {athleteName && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      <WorkoutAthleteTagBadge athleteName={athleteName} />
                    </div>
                  )}

                  {calendarAssignTarget && onCalendarAssignSession && (
                    <Button
                      type="button"
                      size="sm"
                      className="mt-3 mr-2"
                      onClick={(event) => {
                        event.stopPropagation();
                        onCalendarAssignSession(session);
                      }}
                    >
                      <CalendarPlus className="h-3.5 w-3.5 mr-1.5" />
                      {copy(locale, 'Use for this day', 'Använd för denna dag')}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={(event) => {
                      event.stopPropagation();
                      setPlanSession(session);
                    }}
                  >
                    <CalendarPlus className="h-3.5 w-3.5 mr-1.5" />
                    {copy(locale, 'Plan', 'Planera')}
                  </Button>
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
        onTeamAssign={handleSheetTeamAssign}
        businessId={businessId}
      />

      {/* Assignment Dialog */}
      <CardioSessionAssignmentDialog
        sessionId={assignSessionId}
        sessionName={assignSessionName}
        open={isAssignOpen}
        onOpenChange={setIsAssignOpen}
        onAssigned={() => {
          void fetchSessions();
          setIsAssignOpen(false);
        }}
        businessId={businessId}
      />

      {/* Team Assignment Dialog */}
      {teamAssignSessionId && teamAssignSessionName && (
        <TeamWorkoutAssignmentDialog
          workoutType="cardio"
          workoutId={teamAssignSessionId}
          workoutName={teamAssignSessionName}
          open={isTeamAssignOpen}
          onOpenChange={setIsTeamAssignOpen}
          onAssigned={() => {
            void fetchSessions();
            setIsTeamAssignOpen(false);
          }}
        />
      )}

      <PlanTeamWorkoutDialog
        key={planSession?.id ?? 'cardio-plan-dialog'}
        open={Boolean(planSession)}
        onOpenChange={(open) => {
          if (!open) setPlanSession(null);
        }}
        workoutType="CARDIO"
        workoutId={planSession?.id ?? null}
        workoutName={planSession?.name ?? ''}
        workoutDescription={planSession?.description ?? null}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteSession} onOpenChange={() => setDeleteSession(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy(locale, 'Delete session?', 'Ta bort pass?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {copy(locale, 'Are you sure you want to delete', 'Är du säker på att du vill ta bort')}{' '}
              &quot;{deleteSession?.name}&quot;?{' '}
              {copy(locale, 'This cannot be undone.', 'Detta kan inte ångras.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy(locale, 'Cancel', 'Avbryt')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? copy(locale, 'Deleting...', 'Tar bort...') : copy(locale, 'Delete', 'Ta bort')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
