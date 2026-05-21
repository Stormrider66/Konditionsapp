'use client';

/**
 * WorkoutAssignmentDialog Component
 *
 * Allows coaches to assign workouts to athletes for specific dates.
 */

import { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import { CalendarIcon, Users, Dumbbell, Send, Check, Clock, ChevronDown } from 'lucide-react';
import { AppointmentSchedulingFields } from '@/components/coach/scheduling/AppointmentSchedulingFields';
import {
  RepeatWeeklyFields,
  computeWeeklyDates,
  DEFAULT_OCCURRENCES,
} from '@/components/coach/scheduling/RepeatWeeklyFields';
import { format } from 'date-fns';
import { enUS, sv } from 'date-fns/locale';
import { toast } from 'sonner';
import { useLocale } from '@/i18n/client';
import { getBusinessScopeHeaders } from '@/lib/business-scope-client';

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
  businessId?: string;
}

export function WorkoutAssignmentDialog({
  workoutId: propWorkoutId,
  workoutName: propWorkoutName,
  workout,
  trigger,
  open: controlledOpen,
  onOpenChange,
  onAssigned,
  businessId,
}: WorkoutAssignmentDialogProps) {
  const locale = useLocale() === 'sv' ? 'sv' : 'en';
  const dateLocale = locale === 'sv' ? sv : enUS;
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
  const pathname = usePathname();
  const businessHeaders = useMemo(() => ({
    ...(getBusinessScopeHeaders(pathname) ?? {}),
    ...(businessId ? { 'x-business-id': businessId } : {}),
  }), [businessId, pathname]);

  async function fetchAthletes() {
    try {
      const response = await fetch(
        businessId ? `/api/business/${businessId}/clients` : '/api/clients?limit=100',
        { headers: businessHeaders }
      );
      if (response.ok) {
        const data = await response.json();
        // API returns { success: true, data: clients }
        setAthletes(data.clients || data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch athletes:', error);
    }
  }

  useEffect(() => {
    if (open) {
      void fetchAthletes();
    }
  }, [open]);

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
      toast.error(t(locale, 'Select at least one athlete', 'Välj minst en atlet'));
      return;
    }

    setLoading(true);
    try {
      const dates = repeatEnabled
        ? computeWeeklyDates(assignedDate, occurrences)
        : [assignedDate];

      const responses = await Promise.all(
        dates.map((d) =>
          fetch('/api/hybrid-assignments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...businessHeaders },
            body: JSON.stringify({
              workoutId,
              athleteIds: selectedAthletes,
              assignedDate: d.toISOString(),
              notes: notes || undefined,
              customScaling: customScaling || undefined,
              scalingNotes: scalingNotes || undefined,
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
              body: await response.json().catch(() => ({})),
            }))
            .catch((error) => {
              console.error('Failed to assign on date:', d, error);
              return { ok: false, body: {} as Record<string, unknown> };
            })
        )
      );

      const successCount = responses.filter((r) => r.ok).length;
      const failCount = responses.length - successCount;

      if (successCount > 0) {
        const total = successCount * selectedAthletes.length;
        const msg =
          dates.length > 1
            ? t(
                locale,
                `${selectedAthletes.length} athlete(s) × ${successCount} dates = ${total} assignments.`,
                `${selectedAthletes.length} atlet(er) × ${successCount} datum = ${total} tilldelningar.`
              )
            : t(
                locale,
                `Workout assigned to ${selectedAthletes.length} athlete(s).`,
                `Passet tilldelat ${selectedAthletes.length} atlet(er).`
              );

        if (failCount > 0) {
          toast.warning(t(locale, 'Partially assigned', 'Delvis tilldelat'), {
            description: t(
              locale,
              `${msg} ${failCount} date(s) could not be assigned.`,
              `${msg} ${failCount} datum kunde inte tilldelas.`
            ),
          });
        } else {
          toast.success(
            dates.length > 1
              ? t(locale, 'Workouts assigned', 'Pass tilldelade!')
              : t(locale, 'Workout assigned', 'Pass tilldelat!'),
            { description: msg }
          );
        }

        setOpen(false);
        setSelectedAthletes([]);
        setNotes('');
        setCustomScaling('');
        setScalingNotes('');
        setSchedulingOpen(false);
        setStartTime('');
        setEndTime('');
        setLocationId('');
        setLocationName('');
        setCreateCalendarEvent(true);
        setRepeatEnabled(false);
        setOccurrences(DEFAULT_OCCURRENCES);
        onAssigned?.();
      } else {
        const firstError = (responses[0]?.body as { error?: string })?.error;
        toast.error(firstError || t(locale, 'Could not assign the workout', 'Kunde inte tilldela passet'));
      }
    } catch (error) {
      console.error('Failed to assign workout:', error);
      toast.error(t(locale, 'Something went wrong', 'Något gick fel'));
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
            {t(locale, 'Assign', 'Tilldela')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            {t(locale, 'Assign Workout', 'Tilldela Pass')}
          </DialogTitle>
          <DialogDescription>
            {t(locale, 'Assign', 'Tilldela')} <strong>{workoutName}</strong>{' '}
            {t(locale, 'to athletes for a specific date.', 'till atleter för ett specifikt datum.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Date Selection */}
          <div className="space-y-2">
            <Label>{t(locale, 'Date', 'Datum')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(assignedDate, 'PPP', { locale: dateLocale })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={assignedDate}
                  onSelect={(date) => date && setAssignedDate(date)}
                  locale={dateLocale}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <RepeatWeeklyFields
              enabled={repeatEnabled}
              onEnabledChange={setRepeatEnabled}
              occurrences={occurrences}
              onOccurrencesChange={setOccurrences}
              baseDate={assignedDate}
              idSuffix="-hybrid-assign"
            />
          </div>

          {/* Athlete Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t(locale, 'Athletes', 'Atleter')} ({selectedAthletes.length} {t(locale, 'selected', 'valda')})
              </Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  {t(locale, 'All', 'Alla')}
                </Button>
                <Button variant="ghost" size="sm" onClick={selectNone}>
                  {t(locale, 'None', 'Ingen')}
                </Button>
              </div>
            </div>
            <div className="border rounded-md max-h-48 overflow-y-auto">
              {athletes.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  {t(locale, 'Loading athletes...', 'Laddar atleter...')}
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
            <Label>{t(locale, 'Suggest scaling (optional)', 'Föreslå Scaling (valfritt)')}</Label>
            <Select value={customScaling || 'RX'} onValueChange={(val) => setCustomScaling(val === 'RX' ? '' : val)}>
              <SelectTrigger>
                <SelectValue placeholder="Standard (Rx)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RX">Standard (Rx)</SelectItem>
                <SelectItem value="SCALED">Scaled</SelectItem>
                <SelectItem value="FOUNDATIONS">Foundations</SelectItem>
                <SelectItem value="CUSTOM">{t(locale, 'Custom', 'Anpassad')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Scaling Notes */}
          {customScaling && (
            <div className="space-y-2">
              <Label htmlFor="scalingNotes">{t(locale, 'Scaling notes', 'Skalningsnoteringar')}</Label>
              <Textarea
                id="scalingNotes"
                value={scalingNotes}
                onChange={(e) => setScalingNotes(e.target.value)}
                placeholder={t(locale, "e.g. 'Use 30kg instead of 43kg on thrusters'", "t.ex. 'Använd 30kg istället för 43kg på thrusters'")}
                rows={2}
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
                  {t(locale, 'Schedule time (optional)', 'Schemalägg tid (valfritt)')}
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
            <Label htmlFor="notes">{t(locale, 'Notes to the athlete (optional)', 'Anteckningar till atleten (valfritt)')}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t(locale, 'Message or instructions...', 'Meddelande eller instruktioner...')}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t(locale, 'Cancel', 'Avbryt')}
          </Button>
          <Button onClick={handleAssign} disabled={loading || selectedAthletes.length === 0}>
            {loading ? (
              t(locale, 'Assigning...', 'Tilldelar...')
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {t(locale, 'Assign', 'Tilldela')} ({repeatEnabled ? `${selectedAthletes.length}×${occurrences}` : selectedAthletes.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function t(locale: 'en' | 'sv', en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
