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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Calendar, Loader2, Clock, ChevronDown } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);
  const [loadingAthletes, setLoadingAthletes] = useState(false);

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
      setAssignedDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      // Reset scheduling
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
      const response = await fetch('/api/clients?limit=100');
      if (response.ok) {
        const data = await response.json();
        setAthletes(data.clients || []);
      }
    } catch (error) {
      console.error('Failed to fetch athletes:', error);
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
        toast.success('Pass tilldelat!', {
          description: `Tilldelat till ${selectedAthletes.length} atlet(er).`,
        });
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

  const dialogContent = (
    <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Tilldela Konditionspass
        </DialogTitle>
        <DialogDescription>
          {sessionName ? `Tilldela "${sessionName}" till en eller flera atleter.` : 'Välj atleter att tilldela passet till.'}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4 overflow-y-auto min-h-0">
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
            <Label>Atleter</Label>
            <Button variant="ghost" size="sm" onClick={selectAll}>
              {selectedAthletes.length === athletes.length ? 'Avmarkera alla' : 'Markera alla'}
            </Button>
          </div>

          {loadingAthletes ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : athletes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Inga atleter hittades. Lägg till atleter först.
            </p>
          ) : (
            <ScrollArea className="h-[200px] border rounded-md p-2">
              <div className="space-y-2">
                {athletes.map((athlete) => (
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
                    <div className="flex-1">
                      <div className="font-medium text-sm">{athlete.name}</div>
                      {athlete.email && (
                        <div className="text-xs text-muted-foreground">{athlete.email}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
          {selectedAthletes.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {selectedAthletes.length} atlet(er) valda
            </p>
          )}
        </div>

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
            <div className="border rounded-lg p-4 bg-muted/30">
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

      <DialogFooter>
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
