'use client';

/**
 * WorkoutAssignmentDialog Component
 *
 * Allows coaches to assign workouts to athletes for specific dates.
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, Users, Dumbbell, Send, Check } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { toast } from 'sonner';

interface Athlete {
  id: string;
  name: string;
  email?: string;
}

interface WorkoutAssignmentDialogProps {
  workoutId?: string;
  workoutName?: string;
  workout?: { id: string; name: string };
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onAssigned?: () => void;
}

export function WorkoutAssignmentDialog({
  workoutId: propWorkoutId,
  workoutName: propWorkoutName,
  workout,
  trigger,
  open: controlledOpen,
  onOpenChange,
  onAssigned,
}: WorkoutAssignmentDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  // Support both direct props and workout object
  const workoutId = propWorkoutId || workout?.id || '';
  const workoutName = propWorkoutName || workout?.name || '';
  const [loading, setLoading] = useState(false);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [assignedDate, setAssignedDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState('');
  const [customScaling, setCustomScaling] = useState<string>('');
  const [scalingNotes, setScalingNotes] = useState('');

  useEffect(() => {
    if (open) {
      fetchAthletes();
    }
  }, [open]);

  async function fetchAthletes() {
    try {
      const response = await fetch('/api/clients?limit=100');
      if (response.ok) {
        const data = await response.json();
        setAthletes(data.clients || []);
      }
    } catch (error) {
      console.error('Failed to fetch athletes:', error);
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
    setSelectedAthletes(athletes.map((a) => a.id));
  }

  function selectNone() {
    setSelectedAthletes([]);
  }

  async function handleAssign() {
    if (selectedAthletes.length === 0) {
      toast.error('Välj minst en atlet');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/hybrid-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workoutId,
          athleteIds: selectedAthletes,
          assignedDate: assignedDate.toISOString(),
          notes: notes || undefined,
          customScaling: customScaling || undefined,
          scalingNotes: scalingNotes || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Passet tilldelat ${selectedAthletes.length} atlet(er)`);
        setOpen(false);
        setSelectedAthletes([]);
        setNotes('');
        setCustomScaling('');
        setScalingNotes('');
        onAssigned?.();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Kunde inte tilldela passet');
      }
    } catch (error) {
      console.error('Failed to assign workout:', error);
      toast.error('Något gick fel');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Send className="h-4 w-4" />
            Tilldela
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Tilldela Pass
          </DialogTitle>
          <DialogDescription>
            Tilldela <strong>{workoutName}</strong> till atleter för ett specifikt datum.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Date Selection */}
          <div className="space-y-2">
            <Label>Datum</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(assignedDate, 'PPP', { locale: sv })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={assignedDate}
                  onSelect={(date) => date && setAssignedDate(date)}
                  locale={sv}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Athlete Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Atleter ({selectedAthletes.length} valda)
              </Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Alla
                </Button>
                <Button variant="ghost" size="sm" onClick={selectNone}>
                  Ingen
                </Button>
              </div>
            </div>
            <div className="border rounded-md max-h-48 overflow-y-auto">
              {athletes.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  Laddar atleter...
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {athletes.map((athlete) => (
                    <label
                      key={athlete.id}
                      className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedAthletes.includes(athlete.id)}
                        onCheckedChange={() => toggleAthlete(athlete.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{athlete.name}</div>
                        {athlete.email && (
                          <div className="text-xs text-muted-foreground truncate">
                            {athlete.email}
                          </div>
                        )}
                      </div>
                      {selectedAthletes.includes(athlete.id) && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Scaling Suggestion */}
          <div className="space-y-2">
            <Label>Föreslå Scaling (valfritt)</Label>
            <Select value={customScaling} onValueChange={setCustomScaling}>
              <SelectTrigger>
                <SelectValue placeholder="Standard (Rx)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Standard (Rx)</SelectItem>
                <SelectItem value="SCALED">Scaled</SelectItem>
                <SelectItem value="FOUNDATIONS">Foundations</SelectItem>
                <SelectItem value="CUSTOM">Anpassad</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Scaling Notes */}
          {customScaling && (
            <div className="space-y-2">
              <Label htmlFor="scalingNotes">Skalningsnoteringar</Label>
              <Textarea
                id="scalingNotes"
                value={scalingNotes}
                onChange={(e) => setScalingNotes(e.target.value)}
                placeholder="t.ex. 'Använd 30kg istället för 43kg på thrusters'"
                rows={2}
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Anteckningar till atleten (valfritt)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Meddelande eller instruktioner..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Avbryt
          </Button>
          <Button onClick={handleAssign} disabled={loading || selectedAthletes.length === 0}>
            {loading ? (
              'Tilldelar...'
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Tilldela ({selectedAthletes.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
