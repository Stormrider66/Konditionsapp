'use client';

/**
 * Strength Session Library Component
 *
 * Grid/list view of saved strength sessions with:
 * - Search and filter
 * - Click to open detail sheet
 * - Quick actions
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { logger } from '@/lib/logger';
import { useLocale } from '@/i18n/client';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Dumbbell,
  Clock,
  Users,
  Loader2,
  Plus,
  Library,
  FolderOpen,
  Flame,
  Target,
  Timer,
  Shield,
  Zap,
  TrendingUp,
  Copy,
  CalendarPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import type { StrengthSessionData } from '@/types';
import { StrengthSessionDetailSheet } from './StrengthSessionDetailSheet';
import { StrengthSessionAssignmentDialog } from './StrengthSessionAssignmentDialog';
import { TeamWorkoutAssignmentDialog } from '@/components/coach/team/TeamWorkoutAssignmentDialog';
import { PlanTeamWorkoutDialog } from '@/components/coach/team-calendar/PlanTeamWorkoutDialog';
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME } from '@/lib/themes';
import { countStrengthSessionExercises } from '@/lib/strength/session-sections';
import { getBusinessScopeHeaders } from '@/lib/business-scope-client';
import { visibleStrengthSessionTags } from '@/lib/strength/session-business-tags';
import {
  useTeamNameLookup,
  useWorkoutLibraryTeams,
  WorkoutTeamYearBadges,
  WorkoutTeamYearFilters,
} from '@/components/workouts/WorkoutLibraryMetadataFields';

interface SystemTemplate {
  id: string;
  name: string;
  nameSv: string;
  description: string;
  descriptionSv: string;
  category: string;
  phase: string;
  sessionsPerWeek: number;
  estimatedDuration: number;
  athleteLevel: string;
  equipmentRequired: string[];
  includesWarmup: boolean;
  includesCore: boolean;
  includesCooldown: boolean;
  tags: string[];
  exerciseCount: number;
  isSystemTemplate: boolean;
}

type AppLocale = 'en' | 'sv';

type LocalizedLabel = Record<AppLocale, string>;

function copy(locale: AppLocale, en: string, sv: string) {
  return locale === 'sv' ? sv : en;
}

const CATEGORY_LABELS: Record<string, { label: LocalizedLabel; icon: React.ElementType; color: string }> = {
  RUNNER: { label: { en: 'Runner', sv: 'Löpare' }, icon: TrendingUp, color: 'bg-blue-100 text-blue-800' },
  BEGINNER: { label: { en: 'Beginner', sv: 'Nybörjare' }, icon: Target, color: 'bg-green-100 text-green-800' },
  MARATHON: { label: { en: 'Marathon', sv: 'Maraton' }, icon: Target, color: 'bg-purple-100 text-purple-800' },
  INJURY_PREVENTION: { label: { en: 'Injury prevention', sv: 'Skadeprevention' }, icon: Shield, color: 'bg-yellow-100 text-yellow-800' },
  POWER: { label: { en: 'Power', sv: 'Kraft' }, icon: Zap, color: 'bg-red-100 text-red-800' },
  MAINTENANCE: { label: { en: 'Maintenance', sv: 'Underhåll' }, icon: Dumbbell, color: 'bg-gray-100 text-gray-800' },
};

const LEVEL_LABELS: Record<string, LocalizedLabel> = {
  BEGINNER: { en: 'Beginner', sv: 'Nybörjare' },
  INTERMEDIATE: { en: 'Intermediate', sv: 'Mellan' },
  ADVANCED: { en: 'Advanced', sv: 'Avancerad' },
  ELITE: { en: 'Elite', sv: 'Elit' },
};

interface StrengthSessionLibraryProps {
  onNewSession?: () => void;
  onEditSession?: (session: StrengthSessionData) => void;
  onDuplicateSession?: (session: StrengthSessionData) => void;
  businessId?: string;
}

const phaseLabels: Record<string, { label: LocalizedLabel; color: string }> = {
  ANATOMICAL_ADAPTATION: { label: { en: 'Anatomical adaptation', sv: 'Anatom. Anpassning' }, color: 'bg-blue-500' },
  MAXIMUM_STRENGTH: { label: { en: 'Maximum strength', sv: 'Maxstyrka' }, color: 'bg-red-500' },
  POWER: { label: { en: 'Power', sv: 'Power' }, color: 'bg-orange-500' },
  MAINTENANCE: { label: { en: 'Maintenance', sv: 'Underhåll' }, color: 'bg-green-500' },
  TAPER: { label: { en: 'Taper', sv: 'Taper' }, color: 'bg-purple-500' },
};

function localizedValue(locale: AppLocale, en: string, sv: string) {
  return locale === 'sv' ? sv : en;
}

function categoryLabel(category: string, locale: AppLocale) {
  return CATEGORY_LABELS[category]?.label[locale] ?? category;
}

function levelLabel(level: string, locale: AppLocale) {
  return LEVEL_LABELS[level]?.[locale] ?? level;
}

function phaseLabel(phase: string, locale: AppLocale) {
  return phaseLabels[phase]?.label[locale] ?? phase;
}

export function StrengthSessionLibrary({
  onNewSession,
  onEditSession,
  onDuplicateSession,
  businessId,
}: StrengthSessionLibraryProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en';
  const themeContext = useWorkoutThemeOptional();
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME;
  const pathname = usePathname();
  const businessHeaders = useMemo(() => ({
    ...(getBusinessScopeHeaders(pathname) ?? {}),
    ...(businessId ? { 'x-business-id': businessId } : {}),
  }), [businessId, pathname]);

  const [activeTab, setActiveTab] = useState<'sessions' | 'templates'>('sessions');
  const [sessions, setSessions] = useState<StrengthSessionData[]>([]);
  const [templates, setTemplates] = useState<SystemTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [copyingTemplate, setCopyingTemplate] = useState<string | null>(null);
  const { teams } = useWorkoutLibraryTeams(businessHeaders);
  const teamNames = useTeamNameLookup(teams);

  // Sheet state
  const [sheetSession, setSheetSession] = useState<StrengthSessionData | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Assignment dialog state
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assignSessionId, setAssignSessionId] = useState<string | undefined>();
  const [assignSessionName, setAssignSessionName] = useState<string | undefined>();

  // Team assignment dialog state
  const [isTeamAssignOpen, setIsTeamAssignOpen] = useState(false);
  const [teamAssignSessionId, setTeamAssignSessionId] = useState<string | undefined>();
  const [teamAssignSessionName, setTeamAssignSessionName] = useState<string | undefined>();
  const [planSession, setPlanSession] = useState<StrengthSessionData | null>(null);

  // Delete confirmation
  const [deleteSession, setDeleteSession] = useState<StrengthSessionData | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (phaseFilter && phaseFilter !== 'all') params.set('phase', phaseFilter);
      if (teamFilter && teamFilter !== 'all') params.set('teamId', teamFilter);
      if (yearFilter && yearFilter !== 'all') params.set('trainingYear', yearFilter);
      params.set('limit', '50');

      const response = await fetch(`/api/strength-sessions?${params}`, {
        headers: businessHeaders,
      });
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      logger.error('Failed to fetch strength sessions', {}, error);
    } finally {
      setLoading(false);
    }
  }, [businessHeaders, search, phaseFilter, teamFilter, yearFilter]);

  useEffect(() => {
    void Promise.resolve().then(fetchSessions);
  }, [fetchSessions]);

  // Fetch system templates
  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (categoryFilter && categoryFilter !== 'all') params.set('category', categoryFilter);

      const response = await fetch(`/api/strength-templates/system?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.data || []);
      }
    } catch (error) {
      logger.error('Failed to fetch system templates', {}, error);
    } finally {
      setTemplatesLoading(false);
    }
  }, [search, categoryFilter]);

  useEffect(() => {
    if (activeTab === 'templates') {
      void Promise.resolve().then(fetchTemplates);
    }
  }, [activeTab, fetchTemplates]);

  // Copy template to own sessions
  const handleCopyTemplate = async (template: SystemTemplate) => {
    setCopyingTemplate(template.id);
    try {
      // Get full template data
      const response = await fetch(`/api/strength-templates/system/${template.id}`);
      if (!response.ok) throw new Error('Failed to fetch template');

      const { data: fullTemplate } = await response.json();

      // Create a session based on the template
      const createResponse = await fetch('/api/strength-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...businessHeaders },
        body: JSON.stringify({
          name: localizedValue(locale, template.name, template.nameSv),
          description: localizedValue(locale, template.description, template.descriptionSv),
          phase: template.phase,
          estimatedDuration: template.estimatedDuration,
          exercises: fullTemplate.exercises
            .filter((e: { section: string }) => e.section === 'MAIN')
            .map((e: { exerciseName: string; exerciseNameSv: string; sets: number; reps: string; restSeconds?: number; tempo?: string; notes?: string }, idx: number) => ({
              exerciseId: `template-${e.exerciseName.toLowerCase().replace(/\s+/g, '-')}`,
              exerciseName: localizedValue(locale, e.exerciseName, e.exerciseNameSv),
              order: idx,
              sets: e.sets,
              reps: parseInt(e.reps) || 10,
              restSeconds: e.restSeconds || 90,
              tempo: e.tempo,
              notes: e.notes,
            })),
          warmupData: template.includesWarmup ? {
            notes: copy(locale, 'Warm-up from template', 'Uppvärmning från mall'),
            duration: 8,
            exercises: fullTemplate.exercises
              .filter((e: { section: string }) => e.section === 'WARMUP')
              .map((e: { exerciseName: string; exerciseNameSv: string; sets: number; reps: string; notes?: string }) => ({
                exerciseId: `template-warmup-${e.exerciseName.toLowerCase().replace(/\s+/g, '-')}`,
                exerciseName: localizedValue(locale, e.exerciseName, e.exerciseNameSv),
                sets: e.sets,
                reps: e.reps,
                notes: e.notes,
              })),
          } : undefined,
          coreData: template.includesCore ? {
            notes: copy(locale, 'Core exercises from template', 'Core-övningar från mall'),
            duration: 5,
            exercises: fullTemplate.exercises
              .filter((e: { section: string }) => e.section === 'CORE')
              .map((e: { exerciseName: string; exerciseNameSv: string; sets: number; reps: string; restSeconds?: number; notes?: string }) => ({
                exerciseId: `template-core-${e.exerciseName.toLowerCase().replace(/\s+/g, '-')}`,
                exerciseName: localizedValue(locale, e.exerciseName, e.exerciseNameSv),
                sets: e.sets,
                reps: e.reps,
                restSeconds: e.restSeconds,
                notes: e.notes,
              })),
          } : undefined,
          cooldownData: template.includesCooldown ? {
            notes: copy(locale, 'Cool-down from template', 'Nedvarvning från mall'),
            duration: 7,
            exercises: fullTemplate.exercises
              .filter((e: { section: string }) => e.section === 'COOLDOWN')
              .map((e: { exerciseName: string; exerciseNameSv: string; notes?: string }) => ({
                exerciseId: `template-cooldown-${e.exerciseName.toLowerCase().replace(/\s+/g, '-')}`,
                exerciseName: localizedValue(locale, e.exerciseName, e.exerciseNameSv),
                duration: 30,
                notes: e.notes,
              })),
          } : undefined,
          tags: [...template.tags, `template:${template.id}`],
        }),
      });

      if (createResponse.ok) {
        toast.success(copy(locale, 'Template copied!', 'Mall kopierad!'), {
          description: copy(
            locale,
            `"${template.name}" has been added to your sessions.`,
            `"${template.nameSv}" har lagts till i dina pass.`
          ),
        });
        setActiveTab('sessions');
        void fetchSessions();
      } else {
        throw new Error('Failed to create session');
      }
    } catch (error) {
      console.error('Failed to copy template:', error);
      toast.error(copy(locale, 'Could not copy the template', 'Kunde inte kopiera mallen'));
    } finally {
      setCopyingTemplate(null);
    }
  };

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

  function handleSheetDuplicate() {
    if (sheetSession && onDuplicateSession) {
      onDuplicateSession(sheetSession);
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
      const response = await fetch(`/api/strength-sessions/${deleteSession.id}`, {
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
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'sessions' | 'templates')}>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <TabsList>
            <TabsTrigger value="sessions" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              {copy(locale, 'My sessions', 'Mina Pass')}
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Library className="h-4 w-4" />
              {copy(locale, 'System templates', 'Systemmallar')}
            </TabsTrigger>
          </TabsList>
          {onNewSession && activeTab === 'sessions' && (
            <Button onClick={onNewSession}>
              <Plus className="h-4 w-4 mr-2" />
              {copy(locale, 'New session', 'Nytt Pass')}
            </Button>
          )}
        </div>

        <TabsContent value="sessions" className="space-y-4 mt-4">
          {/* Filters for sessions */}
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
            <Select value={phaseFilter} onValueChange={setPhaseFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={copy(locale, 'All phases', 'Alla faser')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{copy(locale, 'All phases', 'Alla faser')}</SelectItem>
                <SelectItem value="ANATOMICAL_ADAPTATION">{copy(locale, 'Anatomical adaptation', 'Anatomisk Anpassning')}</SelectItem>
                <SelectItem value="MAXIMUM_STRENGTH">{copy(locale, 'Maximum strength', 'Maxstyrka')}</SelectItem>
                <SelectItem value="POWER">Power</SelectItem>
                <SelectItem value="MAINTENANCE">{copy(locale, 'Maintenance', 'Underhåll')}</SelectItem>
                <SelectItem value="TAPER">Taper</SelectItem>
              </SelectContent>
            </Select>
            <WorkoutTeamYearFilters
              teams={teams}
              teamFilter={teamFilter}
              yearFilter={yearFilter}
              onTeamFilterChange={setTeamFilter}
              onYearFilterChange={setYearFilter}
            />
          </div>

          {/* Sessions Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : sessions.length === 0 ? (
        <Card className="p-12 text-center" style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <Dumbbell className="h-12 w-12 mx-auto mb-4" style={{ color: theme.colors.textMuted }} />
          <h3 className="text-lg font-medium mb-2" style={{ color: theme.colors.textPrimary }}>
            {copy(locale, 'No sessions yet', 'Inga pass ännu')}
          </h3>
          <p className="text-sm mb-4" style={{ color: theme.colors.textMuted }}>
            {search || phaseFilter !== 'all' || teamFilter !== 'all' || yearFilter !== 'all'
              ? copy(locale, 'No sessions match your search.', 'Inga pass matchar din sökning.')
              : copy(locale, 'Create your first strength session to get started.', 'Skapa ditt första styrkepass för att komma igång.')}
          </p>
          {onNewSession && !search && phaseFilter === 'all' && teamFilter === 'all' && yearFilter === 'all' && (
            <Button onClick={onNewSession}>
              <Plus className="h-4 w-4 mr-2" />
              {copy(locale, 'Create session', 'Skapa Pass')}
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => {
            const phaseInfo = phaseLabels[session.phase] || { label: { en: session.phase, sv: session.phase }, color: 'bg-gray-500' };
            const exerciseCount = countStrengthSessionExercises(session);
            const visibleTags = visibleStrengthSessionTags(session.tags);
            const teamName = session.teamId ? teamNames.get(session.teamId) ?? copy(locale, 'Team', 'Lag') : null;

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
                      {phaseLabel(session.phase, locale)}
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
                      {exerciseCount} {copy(locale, 'exercises', 'övningar')}
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
        </TabsContent>

        <TabsContent value="templates" className="space-y-4 mt-4">
          {/* Filters for templates */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={copy(locale, 'Search templates...', 'Sök mallar...')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={copy(locale, 'All categories', 'Alla kategorier')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{copy(locale, 'All categories', 'Alla kategorier')}</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([key]) => (
                  <SelectItem key={key} value={key}>{categoryLabel(key, locale)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Templates Grid */}
          {templatesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <Card className="p-12 text-center" style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
              <Library className="h-12 w-12 mx-auto mb-4" style={{ color: theme.colors.textMuted }} />
              <h3 className="text-lg font-medium mb-2" style={{ color: theme.colors.textPrimary }}>
                {copy(locale, 'No templates found', 'Inga mallar hittades')}
              </h3>
              <p className="text-sm mb-4" style={{ color: theme.colors.textMuted }}>
                {copy(locale, 'Adjust your search or choose another category.', 'Justera din sökning eller välj en annan kategori.')}
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => {
                const categoryInfo = CATEGORY_LABELS[template.category] || {
                  label: { en: template.category || 'Unknown', sv: template.category || 'Okänd' },
                  icon: Dumbbell,
                  color: 'bg-gray-100 text-gray-800',
                };
                const CategoryIcon = categoryInfo?.icon || Dumbbell;

                return (
                  <Card
                    key={template.id}
                    className="hover:border-primary/50 transition-colors"
                    style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <CategoryIcon className="h-4 w-4" />
                          <h3 className="font-medium truncate" style={{ color: theme.colors.textPrimary }}>
                            {localizedValue(locale, template.name, template.nameSv)}
                          </h3>
                        </div>
                        <Badge className={categoryInfo.color}>
                          {categoryInfo.label[locale]}
                        </Badge>
                      </div>

                      <p className="text-sm line-clamp-2 mb-3" style={{ color: theme.colors.textMuted }}>
                        {localizedValue(locale, template.description, template.descriptionSv)}
                      </p>

                      <div className="flex items-center gap-4 text-sm mb-3" style={{ color: theme.colors.textMuted }}>
                        <span className="flex items-center gap-1">
                          <Dumbbell className="h-3.5 w-3.5" />
                          {template.exerciseCount} {copy(locale, 'exercises', 'övningar')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {template.estimatedDuration} min
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-3">
                        <Badge variant="outline" className="text-xs">
                          {levelLabel(template.athleteLevel, locale)}
                        </Badge>
                        {template.includesWarmup && (
                          <Badge variant="outline" className="text-xs">
                            <Flame className="h-3 w-3 mr-1 text-yellow-500" />
                            {copy(locale, 'Warm-up', 'Uppvärmning')}
                          </Badge>
                        )}
                        {template.includesCore && (
                          <Badge variant="outline" className="text-xs">
                            <Target className="h-3 w-3 mr-1 text-purple-500" />
                            Core
                          </Badge>
                        )}
                        {template.includesCooldown && (
                          <Badge variant="outline" className="text-xs">
                            <Timer className="h-3 w-3 mr-1 text-green-500" />
                            {copy(locale, 'Cool-down', 'Nedvarvning')}
                          </Badge>
                        )}
                      </div>

                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => handleCopyTemplate(template)}
                        disabled={copyingTemplate === template.id}
                      >
                        {copyingTemplate === template.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {copy(locale, 'Copying...', 'Kopierar...')}
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            {copy(locale, 'Copy to my sessions', 'Kopiera till mina pass')}
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Sheet */}
      <StrengthSessionDetailSheet
        session={sheetSession}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        onEdit={handleSheetEdit}
        onDuplicate={onDuplicateSession ? handleSheetDuplicate : undefined}
        onDelete={handleSheetDelete}
        onAssign={handleSheetAssign}
        onTeamAssign={handleSheetTeamAssign}
      />

      {/* Assignment Dialog */}
      <StrengthSessionAssignmentDialog
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
          workoutType="strength"
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
        key={planSession?.id ?? 'strength-plan-dialog'}
        open={Boolean(planSession)}
        onOpenChange={(open) => {
          if (!open) setPlanSession(null);
        }}
        workoutType="STRENGTH"
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
              &quot;{deleteSession?.name}&quot;?
              {(deleteSession?._count?.assignments ?? 0) > 0 && (
                <>
                  {' '}
                  {copy(locale, 'This also removes', 'Det här tar även bort')}{' '}
                  {deleteSession?._count?.assignments}{' '}
                  {copy(locale, "scheduled sessions from the athlete's calendar.", 'schemalagda pass från atletens kalender.')}
                </>
              )}
              {' '}{copy(locale, 'This cannot be undone.', 'Detta kan inte ångras.')}
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
