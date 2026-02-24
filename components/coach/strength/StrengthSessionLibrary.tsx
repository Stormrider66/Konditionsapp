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
} from 'lucide-react';
import { toast } from 'sonner';
import type { StrengthSessionData } from '@/types';
import { StrengthSessionDetailSheet } from './StrengthSessionDetailSheet';
import { StrengthSessionAssignmentDialog } from './StrengthSessionAssignmentDialog';
import { TeamWorkoutAssignmentDialog } from '@/components/coach/team/TeamWorkoutAssignmentDialog';
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME } from '@/lib/themes';

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

const CATEGORY_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  RUNNER: { label: 'Löpare', icon: TrendingUp, color: 'bg-blue-100 text-blue-800' },
  BEGINNER: { label: 'Nybörjare', icon: Target, color: 'bg-green-100 text-green-800' },
  MARATHON: { label: 'Maraton', icon: Target, color: 'bg-purple-100 text-purple-800' },
  INJURY_PREVENTION: { label: 'Skadeprevention', icon: Shield, color: 'bg-yellow-100 text-yellow-800' },
  POWER: { label: 'Kraft', icon: Zap, color: 'bg-red-100 text-red-800' },
  MAINTENANCE: { label: 'Underhåll', icon: Dumbbell, color: 'bg-gray-100 text-gray-800' },
};

const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: 'Nybörjare',
  INTERMEDIATE: 'Mellan',
  ADVANCED: 'Avancerad',
  ELITE: 'Elit',
};

interface StrengthSessionLibraryProps {
  onNewSession?: () => void;
  onEditSession?: (session: StrengthSessionData) => void;
  businessId?: string;
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
  businessId,
}: StrengthSessionLibraryProps) {
  const themeContext = useWorkoutThemeOptional();
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME;

  const [activeTab, setActiveTab] = useState<'sessions' | 'templates'>('sessions');
  const [sessions, setSessions] = useState<StrengthSessionData[]>([]);
  const [templates, setTemplates] = useState<SystemTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [copyingTemplate, setCopyingTemplate] = useState<string | null>(null);

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
      fetchTemplates();
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: template.nameSv,
          description: template.descriptionSv,
          phase: template.phase,
          estimatedDuration: template.estimatedDuration,
          exercises: fullTemplate.exercises
            .filter((e: { section: string }) => e.section === 'MAIN')
            .map((e: { exerciseName: string; exerciseNameSv: string; sets: number; reps: string; restSeconds?: number; tempo?: string; notes?: string }, idx: number) => ({
              exerciseId: `template-${e.exerciseName.toLowerCase().replace(/\s+/g, '-')}`,
              exerciseName: e.exerciseNameSv,
              order: idx,
              sets: e.sets,
              reps: parseInt(e.reps) || 10,
              restSeconds: e.restSeconds || 90,
              tempo: e.tempo,
              notes: e.notes,
            })),
          warmupData: template.includesWarmup ? {
            notes: 'Uppvärmning från mall',
            duration: 8,
            exercises: fullTemplate.exercises
              .filter((e: { section: string }) => e.section === 'WARMUP')
              .map((e: { exerciseName: string; exerciseNameSv: string; sets: number; reps: string; notes?: string }) => ({
                exerciseId: `template-warmup-${e.exerciseName.toLowerCase().replace(/\s+/g, '-')}`,
                exerciseName: e.exerciseNameSv,
                sets: e.sets,
                reps: e.reps,
                notes: e.notes,
              })),
          } : undefined,
          coreData: template.includesCore ? {
            notes: 'Core-övningar från mall',
            duration: 5,
            exercises: fullTemplate.exercises
              .filter((e: { section: string }) => e.section === 'CORE')
              .map((e: { exerciseName: string; exerciseNameSv: string; sets: number; reps: string; restSeconds?: number; notes?: string }) => ({
                exerciseId: `template-core-${e.exerciseName.toLowerCase().replace(/\s+/g, '-')}`,
                exerciseName: e.exerciseNameSv,
                sets: e.sets,
                reps: e.reps,
                restSeconds: e.restSeconds,
                notes: e.notes,
              })),
          } : undefined,
          cooldownData: template.includesCooldown ? {
            notes: 'Nedvarvning från mall',
            duration: 7,
            exercises: fullTemplate.exercises
              .filter((e: { section: string }) => e.section === 'COOLDOWN')
              .map((e: { exerciseName: string; exerciseNameSv: string; notes?: string }) => ({
                exerciseId: `template-cooldown-${e.exerciseName.toLowerCase().replace(/\s+/g, '-')}`,
                exerciseName: e.exerciseNameSv,
                duration: 30,
                notes: e.notes,
              })),
          } : undefined,
          tags: [...template.tags, `template:${template.id}`],
        }),
      });

      if (createResponse.ok) {
        toast.success('Mall kopierad!', {
          description: `"${template.nameSv}" har lagts till i dina pass.`,
        });
        setActiveTab('sessions');
        fetchSessions();
      } else {
        throw new Error('Failed to create session');
      }
    } catch (error) {
      console.error('Failed to copy template:', error);
      toast.error('Kunde inte kopiera mallen');
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
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'sessions' | 'templates')}>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <TabsList>
            <TabsTrigger value="sessions" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Mina Pass
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Library className="h-4 w-4" />
              Systemmallar
            </TabsTrigger>
          </TabsList>
          {onNewSession && activeTab === 'sessions' && (
            <Button onClick={onNewSession}>
              <Plus className="h-4 w-4 mr-2" />
              Nytt Pass
            </Button>
          )}
        </div>

        <TabsContent value="sessions" className="space-y-4 mt-4">
          {/* Filters for sessions */}
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
        </TabsContent>

        <TabsContent value="templates" className="space-y-4 mt-4">
          {/* Filters for templates */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Sök mallar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Alla kategorier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla kategorier</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
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
              <h3 className="text-lg font-medium mb-2" style={{ color: theme.colors.textPrimary }}>Inga mallar hittades</h3>
              <p className="text-sm mb-4" style={{ color: theme.colors.textMuted }}>
                Justera din sökning eller välj en annan kategori.
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => {
                const categoryInfo = CATEGORY_LABELS[template.category] || {
                  label: template.category || 'Okänd',
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
                            {template.nameSv}
                          </h3>
                        </div>
                        <Badge className={categoryInfo.color}>
                          {categoryInfo.label}
                        </Badge>
                      </div>

                      <p className="text-sm line-clamp-2 mb-3" style={{ color: theme.colors.textMuted }}>
                        {template.descriptionSv}
                      </p>

                      <div className="flex items-center gap-4 text-sm mb-3" style={{ color: theme.colors.textMuted }}>
                        <span className="flex items-center gap-1">
                          <Dumbbell className="h-3.5 w-3.5" />
                          {template.exerciseCount} övningar
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {template.estimatedDuration} min
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-3">
                        <Badge variant="outline" className="text-xs">
                          {LEVEL_LABELS[template.athleteLevel] || template.athleteLevel}
                        </Badge>
                        {template.includesWarmup && (
                          <Badge variant="outline" className="text-xs">
                            <Flame className="h-3 w-3 mr-1 text-yellow-500" />
                            Uppvärmning
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
                            Nedvarvning
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
                            Kopierar...
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            Kopiera till mina pass
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
          fetchSessions();
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
            fetchSessions();
            setIsTeamAssignOpen(false);
          }}
        />
      )}

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
