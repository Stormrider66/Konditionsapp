'use client';

/**
 * Cardio Session Assignment Dialog
 *
 * Dialog for assigning cardio sessions to athletes:
 * - Multi-select athletes
 * - Optional scheduled date
 * - Optional scheduling (time, location)
 * - Optional notes
 */

import { useState, useEffect } from 'react';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Calendar, Loader2, Clock, ChevronDown, Watch, Search, MapPin, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { AppointmentSchedulingFields } from '@/components/coach/scheduling/AppointmentSchedulingFields';
import {
  RepeatWeeklyFields,
  computeWeeklyDates,
  DEFAULT_OCCURRENCES,
} from '@/components/coach/scheduling/RepeatWeeklyFields';

interface Athlete {
  id: string;
  name: string;
  email?: string;
}

interface LocationOption {
  id: string;
  name: string;
}

interface TrainerOption {
  id: string;
  name: string;
  email: string;
}

interface CardioSessionAssignmentDialogProps {
  sessionId?: string;
  sessionName?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onAssigned?: () => void;
}

export function CardioSessionAssignmentDialog({
  sessionId,
  sessionName,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onAssigned,
}: CardioSessionAssignmentDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [assignedDate, setAssignedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [athletesExpanded, setAthletesExpanded] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingAthletes, setLoadingAthletes] = useState(false);

  // Location & trainer
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [trainers, setTrainers] = useState<TrainerOption[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [customLocationName, setCustomLocationName] = useState('');
  const [useCustomLocation, setUseCustomLocation] = useState(false);
  const [selectedTrainerId, setSelectedTrainerId] = useState('');

  // Garmin push state
  const [pushToGarmin, setPushToGarmin] = useState(false);

  // Scheduling state
  const [schedulingOpen, setSchedulingOpen] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [locationId, setLocationId] = useState('');
  const [locationName, setLocationName] = useState('');
  const [createCalendarEvent, setCreateCalendarEvent] = useState(true);

  // Multi-date / weekly repeat state
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [occurrences, setOccurrences] = useState(DEFAULT_OCCURRENCES);

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  useEffect(() => {
    if (open) {
      fetchAthletes();
      fetchLocations();
      fetchTrainers();
      // Reset form
      setSelectedAthletes([]);
      setSearchQuery('');
      setAthletesExpanded(true);
      setAssignedDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      // Reset location & trainer
      setSelectedLocationId('');
      setCustomLocationName('');
      setUseCustomLocation(false);
      setSelectedTrainerId('');
      // Reset Garmin and scheduling
      setPushToGarmin(false);
      setSchedulingOpen(false);
      setStartTime('');
      setEndTime('');
      setLocationId('');
      setLocationName('');
      setCreateCalendarEvent(true);
      // Reset repeat
      setRepeatEnabled(false);
      setOccurrences(DEFAULT_OCCURRENCES);
    }
  }, [open]);

  async function fetchAthletes() {
    setLoadingAthletes(true);
    try {
      const pageSize = 500;
      let offset = 0;
      let hasMore = true;
      const allAthletes: Athlete[] = [];

      while (hasMore) {
        const response = await fetch(`/api/clients?limit=${pageSize}&offset=${offset}`);
        if (!response.ok) {
          throw new Error('Failed to fetch athletes');
        }

        const data = await response.json();
        const pageAthletes = (data.data || []) as Athlete[];
        allAthletes.push(...pageAthletes);

        hasMore = Boolean(data.pagination?.hasMore);
        offset += pageSize;
      }

      setAthletes(allAthletes);
    } catch (error) {
      console.error('Failed to fetch athletes:', error);
      setAthletes([]);
    } finally {
      setLoadingAthletes(false);
    }
  }

  async function fetchLocations() {
    try {
      const response = await fetch('/api/locations');
      if (response.ok) {
        const data = await response.json();
        setLocations(data.locations || []);
      }
    } catch (error) {
      console.error('Failed to fetch locations:', error);
    }
  }

  async function fetchTrainers() {
    try {
      const response = await fetch('/api/trainers');
      if (response.ok) {
        const data = await response.json();
        setTrainers(data.trainers || []);
      }
    } catch (error) {
      console.error('Failed to fetch trainers:', error);
    }
  }

  function toggleAthlete(athleteId: string) {
    setSelectedAthletes((prev) =>
      prev.includes(athleteId)
        ? prev.filter((id) => id !== athleteId)
        : [...prev, athleteId]
    );
  }

  function selectAll() {
    if (selectedAthletes.length === athletes.length) {
      setSelectedAthletes([]);
    } else {
      setSelectedAthletes(athletes.map((a) => a.id));
    }
  }

  async function handleAssign() {
    if (!sessionId || selectedAthletes.length === 0 || !assignedDate) return;

    setLoading(true);
    try {
      const baseDate = new Date(assignedDate);
      const dates = repeatEnabled
        ? computeWeeklyDates(baseDate, occurrences)
        : [baseDate];
      const dateStrings = dates.map((d) => d.toISOString().split('T')[0]);

      const responses = await Promise.all(
        dateStrings.map((isoDate) =>
          fetch(`/api/cardio-sessions/${sessionId}/assign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              athleteIds: selectedAthletes,
              assignedDate: isoDate,
              notes: notes || undefined,
              pushToGarmin: pushToGarmin || undefined,
              locationId: selectedLocationId || undefined,
              locationName: customLocationName || undefined,
              responsibleCoachId: selectedTrainerId || undefined,
              // Include scheduling fields if time is set (same time on each date)
              ...(startTime && {
                startTime,
                endTime: endTime || undefined,
                locationId: locationId || undefined,
                locationName: locationName || undefined,
                createCalendarEvent,
              }),
            }),
          })
            .then(async (response) => ({
              ok: response.ok,
              isoDate,
              body: await response.json().catch(() => ({})),
            }))
            .catch((error) => {
              console.error(`Failed to assign on ${isoDate}:`, error);
              return { ok: false, isoDate, body: {} as Record<string, unknown> };
            })
        )
      );

      const successCount = responses.filter((r) => r.ok).length;
      const failCount = responses.length - successCount;
      const totalAssignments = successCount * selectedAthletes.length;

      if (successCount > 0) {
        let description =
          dates.length > 1
            ? `${selectedAthletes.length} atlet(er) × ${successCount} datum = ${totalAssignments} tilldelningar.`
            : `Tilldelat till ${selectedAthletes.length} atlet(er).`;

        if (pushToGarmin) {
          let garminSuccess = 0;
          let garminFailed = 0;
          for (const r of responses) {
            const list = (r.body as { garminResults?: Array<{ success: boolean }> }).garminResults;
            if (Array.isArray(list)) {
              garminSuccess += list.filter((g) => g.success).length;
              garminFailed += list.filter((g) => !g.success).length;
            }
          }
          if (garminSuccess > 0) {
            description += ` Skickat till Garmin för ${garminSuccess} pass.`;
          }
          if (garminFailed > 0) {
            description += ` Garmin-push misslyckades för ${garminFailed} pass.`;
          }
          if (garminSuccess === 0 && garminFailed === 0) {
            description += ' Ingen atlet har Garmin anslutet.';
          }
        }

        if (failCount > 0) {
          description += ` ${failCount} datum kunde inte tilldelas.`;
          toast.warning('Delvis tilldelat', { description });
        } else {
          toast.success(dates.length > 1 ? 'Pass tilldelade!' : 'Pass tilldelat!', { description });
        }

        setOpen(false);
        onAssigned?.();
      } else {
        const firstError = (responses[0]?.body as { error?: string })?.error;
        toast.error('Tilldelning misslyckades', {
          description: firstError || 'Kunde inte tilldela passet.',
        });
      }
    } catch (error) {
      console.error('Failed to assign session:', error);
      toast.error('Tilldelning misslyckades', {
        description: 'Ett oväntat fel inträffade.',
      });
    } finally {
      setLoading(false);
    }
  }

  const filteredAthletes = athletes.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      (a.email && a.email.toLowerCase().includes(q))
    );
  });

  const dialogContent = (
    <DialogContent className="max-h-[85vh] overflow-y-auto p-0 sm:max-w-md">
      <DialogHeader className="sticky top-0 z-10 border-b bg-background px-6 pt-6 pb-4">
        <DialogTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Tilldela Konditionspass
        </DialogTitle>
        <DialogDescription>
          {sessionName ? `Tilldela "${sessionName}" till en eller flera atleter.` : 'Välj atleter att tilldela passet till.'}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 px-6 py-4">
        {/* Date Selection */}
        <div className="space-y-2">
          <Label htmlFor="assignedDate" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Datum
          </Label>
          <Input
            id="assignedDate"
            type="date"
            value={assignedDate}
            onChange={(e) => setAssignedDate(e.target.value)}
          />
          <RepeatWeeklyFields
            enabled={repeatEnabled}
            onEnabledChange={setRepeatEnabled}
            occurrences={occurrences}
            onOccurrencesChange={setOccurrences}
            baseDate={assignedDate ? new Date(assignedDate) : null}
            idSuffix="-cardio-assign"
          />
        </div>

        {/* Location Selection */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Plats (valfritt)
          </Label>
          {locations.length > 0 && !useCustomLocation ? (
            <Select value={selectedLocationId || 'none'} onValueChange={(v) => {
              if (v === 'custom') {
                setUseCustomLocation(true);
                setSelectedLocationId('');
              } else if (v === 'none') {
                setSelectedLocationId('');
              } else {
                setSelectedLocationId(v);
                setCustomLocationName('');
              }
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Välj plats..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ingen plats</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
                <SelectItem value="custom">Annan plats...</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="space-y-1">
              <Input
                placeholder="Ange plats (t.ex. Löparbanan, Gymmet)"
                value={customLocationName}
                onChange={(e) => setCustomLocationName(e.target.value)}
              />
              {locations.length > 0 && (
                <button
                  type="button"
                  className="text-xs text-blue-600 hover:underline"
                  onClick={() => { setUseCustomLocation(false); setCustomLocationName(''); }}
                >
                  Välj från lista istället
                </button>
              )}
            </div>
          )}
        </div>

        {/* Trainer Selection */}
        {trainers.length > 0 && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Tränare (valfritt)
            </Label>
            <Select value={selectedTrainerId || 'none'} onValueChange={(v) => setSelectedTrainerId(v === 'none' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Välj tränare..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ingen specifik tränare</SelectItem>
                {trainers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Athletes Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1 px-0 hover:bg-transparent"
              onClick={() => setAthletesExpanded(!athletesExpanded)}
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${athletesExpanded ? 'rotate-180' : ''}`} />
              <Label className="cursor-pointer">Atleter</Label>
              {!athletesExpanded && selectedAthletes.length > 0 && (
                <span className="text-xs text-muted-foreground ml-1">
                  ({selectedAthletes.length} valda)
                </span>
              )}
            </Button>
            {athletesExpanded && (
              <Button variant="ghost" size="sm" onClick={selectAll}>
                {selectedAthletes.length === athletes.length ? 'Avmarkera alla' : 'Markera alla'}
              </Button>
            )}
          </div>

          {/* Collapsed summary */}
          {!athletesExpanded && selectedAthletes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {athletes
                .filter((a) => selectedAthletes.includes(a.id))
                .map((a) => (
                  <span key={a.id} className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                    {a.name}
                  </span>
                ))}
            </div>
          )}

          {/* Expanded list */}
          {athletesExpanded && (
            <>
              {loadingAthletes ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : athletes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Inga atleter hittades. Lägg till atleter först.
                </p>
              ) : (
                <>
                  {athletes.length > 5 && (
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Sök atlet..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-9"
                      />
                    </div>
                  )}
                  <div className="scrollbar-visible max-h-64 overflow-y-auto overscroll-contain rounded-md border p-2">
                    <div className="space-y-1">
                      {filteredAthletes.map((athlete) => (
                        <div
                          key={athlete.id}
                          className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded cursor-pointer"
                          onClick={() => toggleAthlete(athlete.id)}
                        >
                          <Checkbox
                            checked={selectedAthletes.includes(athlete.id)}
                            onCheckedChange={() => toggleAthlete(athlete.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{athlete.name}</div>
                            {athlete.email && (
                              <div className="text-xs text-muted-foreground truncate">{athlete.email}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {searchQuery && filteredAthletes.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      Inga atleter matchar din sökning.
                    </p>
                  )}
                  {selectedAthletes.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {selectedAthletes.length} atlet(er) valda
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Push to Garmin */}
        {selectedAthletes.length > 0 && (
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Watch className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="pushToGarmin" className="text-sm font-medium cursor-pointer">
                  Skicka till Garmin
                </Label>
                <p className="text-xs text-muted-foreground">
                  Passet visas på atletens Garmin-klocka
                </p>
              </div>
            </div>
            <Switch
              id="pushToGarmin"
              checked={pushToGarmin}
              onCheckedChange={setPushToGarmin}
            />
          </div>
        )}

        {/* Scheduling Section */}
        <Collapsible open={schedulingOpen} onOpenChange={setSchedulingOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between text-muted-foreground hover:text-foreground"
            >
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Schemalägg tid (valfritt)
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${schedulingOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 pb-4">
            <div className="border rounded-lg bg-muted/30 p-4">
              <AppointmentSchedulingFields
                startTime={startTime}
                endTime={endTime}
                locationId={locationId}
                locationName={locationName}
                createCalendarEvent={createCalendarEvent}
                onStartTimeChange={setStartTime}
                onEndTimeChange={setEndTime}
                onLocationIdChange={setLocationId}
                onLocationNameChange={setLocationName}
                onCreateCalendarEventChange={setCreateCalendarEvent}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Anteckningar (valfritt)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Eventuella instruktioner till atleten..."
            rows={2}
          />
        </div>
      </div>

      <DialogFooter className="sticky bottom-0 z-10 border-t bg-background px-6 py-4">
        <Button variant="outline" onClick={() => setOpen(false)}>
          Avbryt
        </Button>
        <Button
          onClick={handleAssign}
          disabled={loading || selectedAthletes.length === 0}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Tilldelar...
            </>
          ) : (
            <>
              <Users className="h-4 w-4 mr-2" />
              Tilldela ({repeatEnabled ? `${selectedAthletes.length}×${occurrences}` : selectedAthletes.length})
            </>
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  );

  // If controlled, render without trigger
  if (isControlled) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {dialogContent}
      </Dialog>
    );
  }

  // Uncontrolled with trigger
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {dialogContent}
    </Dialog>
  );
}
