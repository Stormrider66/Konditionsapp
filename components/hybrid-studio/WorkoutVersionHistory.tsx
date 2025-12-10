'use client';

/**
 * WorkoutVersionHistory Component
 *
 * Displays version history for a workout and allows creating new versions.
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  History,
  GitBranch,
  GitCommit,
  Copy,
  ChevronRight,
  Clock,
  User,
  FileEdit,
  Dumbbell,
  ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { toast } from 'sonner';

interface VersionHistoryEntry {
  id: string;
  versionNumber: number;
  changeType: string;
  changeNotes?: string;
  changedBy?: string;
  createdAt: string;
}

interface RelatedVersion {
  id: string;
  name: string;
  version: number;
  versionNotes?: string;
  createdAt: string;
}

interface WorkoutVersionHistoryProps {
  workoutId: string;
  workoutName: string;
  currentVersion: number;
  onVersionChange?: () => void;
}

const CHANGE_TYPES = [
  { value: 'MODIFIED', label: 'Allmän ändring' },
  { value: 'MOVEMENTS_CHANGED', label: 'Rörelser ändrade' },
  { value: 'SCALING_UPDATED', label: 'Skalning uppdaterad' },
  { value: 'TIME_ADJUSTED', label: 'Tidsinställningar ändrade' },
  { value: 'FORKED', label: 'Kopia skapad' },
];

function getChangeTypeLabel(type: string): string {
  return CHANGE_TYPES.find((t) => t.value === type)?.label || type;
}

function getChangeTypeIcon(type: string) {
  switch (type) {
    case 'CREATED':
      return <GitCommit className="h-4 w-4 text-green-500" />;
    case 'FORKED':
      return <GitBranch className="h-4 w-4 text-blue-500" />;
    case 'MOVEMENTS_CHANGED':
      return <Dumbbell className="h-4 w-4 text-orange-500" />;
    default:
      return <FileEdit className="h-4 w-4 text-gray-500" />;
  }
}

export function WorkoutVersionHistory({
  workoutId,
  workoutName,
  currentVersion,
  onVersionChange,
}: WorkoutVersionHistoryProps) {
  const [loading, setLoading] = useState(true);
  const [versionHistory, setVersionHistory] = useState<VersionHistoryEntry[]>([]);
  const [relatedVersions, setRelatedVersions] = useState<RelatedVersion[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [changeType, setChangeType] = useState('MODIFIED');
  const [changeNotes, setChangeNotes] = useState('');
  const [createCopy, setCreateCopy] = useState(false);

  useEffect(() => {
    fetchVersionHistory();
  }, [workoutId]);

  async function fetchVersionHistory() {
    try {
      setLoading(true);
      const response = await fetch(`/api/hybrid-workouts/${workoutId}/versions`);
      if (response.ok) {
        const data = await response.json();
        setVersionHistory(data.versionHistory || []);
        setRelatedVersions(data.relatedVersions || []);
      }
    } catch (error) {
      console.error('Failed to fetch version history:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateVersion() {
    if (!changeNotes.trim() && !createCopy) {
      toast.error('Ange en beskrivning av ändringen');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch(`/api/hybrid-workouts/${workoutId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          changeType,
          changeNotes,
          createCopy,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(createCopy ? 'Ny version skapad' : 'Version sparad');
        setIsCreateDialogOpen(false);
        setChangeNotes('');
        setCreateCopy(false);
        fetchVersionHistory();
        onVersionChange?.();

        if (createCopy && data.workout?.id) {
          window.location.href = `/coach/hybrid-studio/workouts/${data.workout.id}`;
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Kunde inte spara version');
      }
    } catch (error) {
      console.error('Failed to create version:', error);
      toast.error('Något gick fel');
    } finally {
      setCreating(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Versionshistorik
            </CardTitle>
            <CardDescription>
              Aktuell version: v{currentVersion}
            </CardDescription>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <GitCommit className="h-4 w-4 mr-2" />
                Spara version
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Spara version</DialogTitle>
                <DialogDescription>
                  Dokumentera ändringar eller skapa en ny kopia av passet.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Typ av ändring</Label>
                  <Select value={changeType} onValueChange={setChangeType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHANGE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="changeNotes">Beskrivning av ändring</Label>
                  <Textarea
                    id="changeNotes"
                    value={changeNotes}
                    onChange={(e) => setChangeNotes(e.target.value)}
                    placeholder="t.ex. 'Bytte ut pull-ups mot ring rows för scaled version'"
                    rows={3}
                  />
                </div>

                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <input
                    type="checkbox"
                    id="createCopy"
                    checked={createCopy}
                    onChange={(e) => setCreateCopy(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <div>
                    <Label htmlFor="createCopy" className="cursor-pointer">
                      Skapa ny kopia
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Skapar ett nytt pass baserat på detta, istället för att bara logga ändringen
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Avbryt
                </Button>
                <Button onClick={handleCreateVersion} disabled={creating}>
                  {creating ? 'Sparar...' : createCopy ? 'Skapa kopia' : 'Spara version'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : versionHistory.length === 0 && relatedVersions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Ingen versionshistorik ännu</p>
            <p className="text-sm mt-2">
              Spara en version för att börja spåra ändringar
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Related versions (forks/branches) */}
            {relatedVersions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  Relaterade versioner
                </h4>
                <div className="space-y-2">
                  {relatedVersions.map((version) => (
                    <a
                      key={version.id}
                      href={`/coach/hybrid-studio/workouts/${version.id}`}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">v{version.version}</Badge>
                        <div>
                          <div className="font-medium group-hover:text-primary">
                            {version.name}
                          </div>
                          {version.versionNotes && (
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {version.versionNotes}
                            </div>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Version timeline */}
            {versionHistory.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Ändringslogg
                </h4>
                <ScrollArea className="h-[300px] pr-4">
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />

                    <div className="space-y-4">
                      {versionHistory.map((entry, index) => (
                        <div key={entry.id} className="relative flex gap-4">
                          {/* Timeline dot */}
                          <div className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-background border-2 border-muted">
                            {getChangeTypeIcon(entry.changeType)}
                          </div>

                          {/* Content */}
                          <div className="flex-1 pb-4">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                v{entry.versionNumber}
                              </Badge>
                              <span className="text-sm font-medium">
                                {getChangeTypeLabel(entry.changeType)}
                              </span>
                            </div>
                            {entry.changeNotes && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                {entry.changeNotes}
                              </p>
                            )}
                            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(entry.createdAt), 'PPp', { locale: sv })}
                              </span>
                              {entry.changedBy && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  Coach
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact version badge for showing in workout cards
 */
export function VersionBadge({
  version,
  hasHistory,
  onClick,
}: {
  version: number;
  hasHistory?: boolean;
  onClick?: () => void;
}) {
  if (version === 1 && !hasHistory) return null;

  return (
    <Badge
      variant="outline"
      className={`text-xs ${onClick ? 'cursor-pointer hover:bg-muted' : ''}`}
      onClick={onClick}
    >
      <GitCommit className="h-3 w-3 mr-1" />
      v{version}
    </Badge>
  );
}
