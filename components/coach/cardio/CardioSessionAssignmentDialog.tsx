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
import { Users, Calendar, Loader2, Clock, ChevronDown, Watch, Search } from 'lucide-react';
import { toast } from 'sonner';
import { AppointmentSchedulingFields } from '@/components/coach/scheduling/AppointmentSchedulingFields';

interface Athlete {
  id: string;
  name: string;
  email?: string;
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

  // Garmin push state
  const [pushToGarmin, setPushToGarmin] = useState(false);

  // Scheduling state
  const [schedulingOpen, setSchedulingOpen] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [locationId, setLocationId] = useState('');
  const [locationName, setLocationName] = useState('');
  const [createCalendarEvent, setCreateCalendarEvent] = useState(true);

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  useEffect(() => {
    if (open) {
      fetchAthletes();
      // Reset form
      setSelectedAthletes([]);
      setSearchQuery('');
      setAthletesExpanded(true);
      setAssignedDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      // Reset Garmin and scheduling
      setPushToGarmin(false);
      setSchedulingOpen(false);
      setStartTime('');
      setEndTime('');
      setLocationId('');
      setLocationName('');
      setCreateCalendarEvent(true);
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
    if (!sessionId || selectedAthletes.length === 0) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/cardio-sessions/${sessionId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteIds: selectedAthletes,
          assignedDate,
          notes: notes || undefined,
          pushToGarmin: pushToGarmin || undefined,
          // Include scheduling fields if time is set
          ...(startTime && {
            startTime,
            endTime: endTime || undefined,
            locationId: locationId || undefined,
            locationName: locationName || undefined,
            createCalendarEvent,
          }),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        let description = `Tilldelat till ${selectedAthletes.length} atlet(er).`;

        if (pushToGarmin && result.garminResults) {
          const garminSuccess = result.garminResults.filter((r: { success: boolean }) => r.success).length;
          const garminFailed = result.garminResults.filter((r: { success: boolean }) => !r.success).length;
          if (garminSuccess > 0) {
            description += ` Skickat till Garmin för ${garminSuccess} atlet(er).`;
          }
          if (garminFailed > 0) {
            description += ` Garmin-push misslyckades för ${garminFailed} atlet(er).`;
          }
          if (garminSuccess === 0 && garminFailed === 0) {
            description += ' Ingen atlet har Garmin anslutet.';
          }
        }

        toast.success('Pass tilldelat!', { description });
        setOpen(false);
        onAssigned?.();
      } else {
        const data = await response.json();
        toast.error('Tilldelning misslyckades', {
          description: data.error || 'Kunde inte tilldela passet.',
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
        </div>

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
              Tilldela ({selectedAthletes.length})
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
