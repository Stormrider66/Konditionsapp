'use client';

/**
 * Strength Session Assignment Dialog
 *
 * Dialog for assigning strength sessions to athletes:
 * - Multi-select athletes
 * - Optional scheduled date
 * - Optional scheduling (time, location)
 * - Optional notes
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from '@/i18n/client';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, Calendar, Loader2, Clock, ChevronDown, UserCircle, Watch, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { AppointmentSchedulingFields } from '@/components/coach/scheduling/AppointmentSchedulingFields';
import { getBusinessScopeHeaders } from '@/lib/business-scope-client';

interface Athlete {
  id: string;
  name: string;
  email?: string;
}

interface Coach {
  id: string;
  name: string;
  email?: string;
}

interface StrengthSessionAssignmentDialogProps {
  sessionId?: string;
  sessionName?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onAssigned?: () => void;
  businessId?: string;
  /** Pre-fill the date field (YYYY-MM-DD). Falls back to today when omitted. */
  defaultDate?: string;
  /** Client ids to pre-select when the dialog opens (e.g. the athlete this session was built for). */
  defaultAthleteIds?: string[];
}

interface AssignmentsResponse {
  assignments?: Array<{
    athleteId?: string | null;
    athlete?: { id?: string | null } | null;
  }>;
  skipped?: Array<{ athleteId: string; reasons?: string[] }>;
  error?: string;
}

interface GarminPushResponse {
  success?: boolean;
  message?: string;
  scheduleWarning?: string;
}

type AppLocale = 'en' | 'sv';

function copy(locale: AppLocale, en: string, sv: string) {
  return locale === 'sv' ? sv : en;
}

export function StrengthSessionAssignmentDialog({
  sessionId,
  sessionName,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onAssigned,
  businessId,
  defaultDate,
  defaultAthleteIds,
}: StrengthSessionAssignmentDialogProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en';
  const [internalOpen, setInternalOpen] = useState(false);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [athleteSearch, setAthleteSearch] = useState('');
  const [assignedDate, setAssignedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [pushToGarmin, setPushToGarmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingAthletes, setLoadingAthletes] = useState(false);

  // Coach selection state
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [selectedCoach, setSelectedCoach] = useState<string>('');

  // Scheduling state
  const [schedulingOpen, setSchedulingOpen] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [locationId, setLocationId] = useState('');
  const [locationName, setLocationName] = useState('');
  const [createCalendarEvent, setCreateCalendarEvent] = useState(true);
  const pathname = usePathname();
  const businessHeaders = useMemo(() => ({
    ...(getBusinessScopeHeaders(pathname) ?? {}),
    ...(businessId ? { 'x-business-id': businessId } : {}),
  }), [businessId, pathname]);

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  // Track open transitions to avoid resetting the form on dependency churn
  const prevOpenRef = useRef(false);
  const prevBusinessIdRef = useRef<string | undefined>(businessId);

  const fetchAthletes = useCallback(async () => {
    setLoadingAthletes(true);
    try {
      // Use business-scoped API if businessId is provided
      const url = businessId
        ? `/api/business/${businessId}/clients`
        : '/api/clients?limit=100';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        // Handle both response formats
        const clientsList = data.clients || data.data || [];
        setAthletes(clientsList);
      }
    } catch (error) {
      console.error('Failed to fetch athletes:', error);
    } finally {
      setLoadingAthletes(false);
    }
  }, [businessId]);

  const fetchCoaches = useCallback(async () => {
    try {
      if (businessId) {
        // Business context: fetch list of coaches from the business
        const response = await fetch(`/api/business/${businessId}/coaches`);
        if (response.ok) {
          const data = await response.json();
          const coachesList = data.coaches || [];
          setCoaches(coachesList);
        }
      } else {
        // Standard context: fetch current user info
        const response = await fetch('/api/users/me');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setCoaches([{
              id: data.data.id,
              name: data.data.name || copy(locale, 'Me', 'Jag'),
              email: data.data.email,
            }]);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch coaches:', error);
    }
  }, [businessId, locale]);

  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    const prevBusinessId = prevBusinessIdRef.current;

    const justOpened = open && !wasOpen;
    const businessChangedWhileOpen = open && wasOpen && prevBusinessId !== businessId;

    if (justOpened) {
      void Promise.resolve().then(() => {
        void fetchAthletes();
        void fetchCoaches();
        // Reset form (only when dialog opens). Seed date/athletes from the
        // caller's context (e.g. the athlete this session was built for, or the
        // calendar day the coach is deploying onto) so the common case needs no
        // re-entry; both fall back to today / no selection when omitted.
        setSelectedAthletes(defaultAthleteIds ?? []);
        setAssignedDate(defaultDate || new Date().toISOString().split('T')[0]);
        setAthleteSearch('');
        setNotes('');
        setPushToGarmin(false);
        setSelectedCoach('');
        // Reset scheduling
        setSchedulingOpen(false);
        setStartTime('');
        setEndTime('');
        setLocationId('');
        setLocationName('');
        setCreateCalendarEvent(true);
      });
    } else if (businessChangedWhileOpen) {
      // If context changes while open, refresh lists but keep user input intact
      void fetchAthletes();
      void fetchCoaches();
    }

    prevOpenRef.current = open;
    prevBusinessIdRef.current = businessId;
  }, [open, businessId, fetchAthletes, fetchCoaches, defaultDate, defaultAthleteIds]);

  const normalizedAthleteSearch = athleteSearch.trim().toLowerCase();
  const hasAthleteSearch = normalizedAthleteSearch.length > 0;

  const filteredAthletes = useMemo(() => {
    if (!normalizedAthleteSearch) return athletes;
    return athletes.filter((athlete) =>
      athlete.name.toLowerCase().includes(normalizedAthleteSearch) ||
      (athlete.email?.toLowerCase().includes(normalizedAthleteSearch) ?? false)
    );
  }, [athletes, normalizedAthleteSearch]);

  const selectedAthleteIds = useMemo(() => new Set(selectedAthletes), [selectedAthletes]);

  // "Select all" acts on the currently visible (filtered) athletes so it stays
  // intuitive while a search is active; selections outside the filter are kept.
  const allFilteredSelected =
    filteredAthletes.length > 0 &&
    filteredAthletes.every((athlete) => selectedAthleteIds.has(athlete.id));
  const visibleSelectedCount = filteredAthletes.filter((athlete) => selectedAthleteIds.has(athlete.id)).length;
  const hiddenSelectedCount = hasAthleteSearch
    ? Math.max(selectedAthletes.length - visibleSelectedCount, 0)
    : 0;
  const bulkAthleteActionLabel = allFilteredSelected
    ? copy(
      locale,
      hasAthleteSearch ? 'Clear visible' : 'Clear all',
      hasAthleteSearch ? 'Avmarkera synliga' : 'Avmarkera alla'
    )
    : copy(
      locale,
      hasAthleteSearch ? 'Select visible' : 'Select all',
      hasAthleteSearch ? 'Markera synliga' : 'Markera alla'
    );

  function toggleAthlete(athleteId: string) {
    setSelectedAthletes((prev) =>
      prev.includes(athleteId)
        ? prev.filter((id) => id !== athleteId)
        : [...prev, athleteId]
    );
  }

  function selectAll() {
    const filteredIds = filteredAthletes.map((a) => a.id);
    if (allFilteredSelected) {
      setSelectedAthletes((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedAthletes((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  }

  async function handleAssign() {
    if (!sessionId || selectedAthletes.length === 0) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/strength-sessions/${sessionId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...businessHeaders },
        body: JSON.stringify({
          athleteIds: selectedAthletes,
          assignedDate,
          notes: notes || undefined,
          responsibleCoachId: selectedCoach || undefined,
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

      const data = (await response.json().catch(() => ({}))) as AssignmentsResponse;

      if (response.ok) {
        const assignedAthleteIds = (data.assignments ?? [])
          .map((assignment) => assignment.athlete?.id ?? assignment.athleteId)
          .filter((athleteId): athleteId is string => Boolean(athleteId));
        const assignedCount = assignedAthleteIds.length || selectedAthletes.length;
        const skippedCount = data.skipped?.length ?? 0;

        if (pushToGarmin && assignedAthleteIds.length > 0) {
          const garminResults = await Promise.allSettled(
            assignedAthleteIds.map(async (athleteId) => {
              const garminResponse = await fetch(`/api/strength-sessions/${sessionId}/push-garmin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...businessHeaders },
                body: JSON.stringify({
                  athleteId,
                  scheduleDate: assignedDate,
                }),
              });
              const garminData = (await garminResponse.json().catch(() => ({}))) as GarminPushResponse & { error?: string };
              if (!garminResponse.ok) {
                throw new Error(garminData.error || copy(locale, 'Garmin push failed', 'Garmin-skickning misslyckades'));
              }
              return garminData;
            })
          );

          const successfulPushes = garminResults.filter((result) => result.status === 'fulfilled').length;
          const failedPushes = garminResults.length - successfulPushes;
          const scheduleWarnings = garminResults.filter(
            (result) => result.status === 'fulfilled' && Boolean(result.value.scheduleWarning)
          ).length;

          if (failedPushes === 0) {
            toast.success(copy(locale, 'Assigned and sent to Garmin', 'Tilldelat och skickat till Garmin'), {
              description: copy(
                locale,
                `${successfulPushes} athlete(s) updated${scheduleWarnings ? `, ${scheduleWarnings} with calendar warning` : ''}${skippedCount ? `, ${skippedCount} skipped` : ''}.`,
                `${successfulPushes} atlet(er) uppdaterade${scheduleWarnings ? `, ${scheduleWarnings} med kalendervarning` : ''}${skippedCount ? `, ${skippedCount} hoppades över` : ''}.`
              ),
            });
          } else {
            toast.warning(copy(locale, 'Assigned with Garmin warnings', 'Tilldelat med Garmin-varningar'), {
              description: copy(
                locale,
                `${assignedCount} assigned. Garmin succeeded for ${successfulPushes} and failed for ${failedPushes}.`,
                `${assignedCount} tilldelade. Garmin lyckades för ${successfulPushes} och misslyckades för ${failedPushes}.`
              ),
            });
          }
        } else {
          toast.success(copy(locale, 'Session assigned!', 'Pass tilldelat!'), {
            description: copy(
              locale,
              `Assigned to ${assignedCount} athlete(s)${skippedCount ? `, ${skippedCount} skipped` : ''}.`,
              `Tilldelat till ${assignedCount} atlet(er)${skippedCount ? `, ${skippedCount} hoppades över` : ''}.`
            ),
          });
        }
        setOpen(false);
        onAssigned?.();
      } else {
        toast.error(copy(locale, 'Assignment failed', 'Tilldelning misslyckades'), {
          description: data.error || copy(locale, 'Could not assign the session.', 'Kunde inte tilldela passet.'),
        });
      }
    } catch (error) {
      console.error('Failed to assign session:', error);
      toast.error(copy(locale, 'Assignment failed', 'Tilldelning misslyckades'), {
        description: copy(locale, 'An unexpected error occurred.', 'Ett oväntat fel inträffade.'),
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
          {copy(locale, 'Assign Strength Session', 'Tilldela Styrkepass')}
        </DialogTitle>
        <DialogDescription>
          {sessionName
            ? copy(locale, `Assign "${sessionName}" to one or more athletes.`, `Tilldela "${sessionName}" till en eller flera atleter.`)
            : copy(locale, 'Select athletes to assign the session to.', 'Välj atleter att tilldela passet till.')}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4 overflow-y-auto min-h-0">
        {/* Date Selection */}
        <div className="space-y-2">
          <Label htmlFor="assignedDate" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {copy(locale, 'Date', 'Datum')}
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
            <Label>{copy(locale, 'Athletes', 'Atleter')}</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={selectAll}
              disabled={loadingAthletes || filteredAthletes.length === 0}
            >
              {bulkAthleteActionLabel}
            </Button>
          </div>

          {!loadingAthletes && athletes.length > 5 && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={athleteSearch}
                onChange={(e) => setAthleteSearch(e.target.value)}
                placeholder={copy(locale, 'Search name or email...', 'Sök namn eller e-post...')}
                className="pl-8 pr-8"
                aria-label={copy(locale, 'Search athlete by name or email', 'Sök atlet via namn eller e-post')}
              />
              {athleteSearch && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                  onClick={() => setAthleteSearch('')}
                  aria-label={copy(locale, 'Clear athlete search', 'Rensa atletsökning')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {loadingAthletes ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : athletes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {copy(locale, 'No athletes found. Add athletes first.', 'Inga atleter hittades. Lägg till atleter först.')}
            </p>
          ) : filteredAthletes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {copy(locale, 'No athletes match your search.', 'Inga atleter matchar din sökning.')}
            </p>
          ) : (
            <ScrollArea className="h-[200px] border rounded-md p-2">
              <div className="space-y-2">
                {filteredAthletes.map((athlete) => (
                  <div
                    key={athlete.id}
                    className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded cursor-pointer"
                    onClick={() => toggleAthlete(athlete.id)}
                  >
                    <Checkbox
                      checked={selectedAthleteIds.has(athlete.id)}
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
              {selectedAthletes.length} {copy(locale, 'athlete(s) selected', 'atlet(er) valda')}
              {hiddenSelectedCount > 0 && (
                <> {copy(locale, `(${hiddenSelectedCount} outside search)`, `(${hiddenSelectedCount} utanför sökningen)`)}</>
              )}
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
                {copy(locale, 'Schedule time (optional)', 'Schemalägg tid (valfritt)')}
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

        {/* Garmin Push */}
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <Checkbox
            id="pushToGarmin"
            checked={pushToGarmin}
            onCheckedChange={(checked) => setPushToGarmin(checked === true)}
            className="mt-0.5"
          />
          <div className="space-y-1">
            <Label htmlFor="pushToGarmin" className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <Watch className="h-4 w-4" />
              {copy(locale, 'Send to Garmin Connect', 'Skicka till Garmin Connect')}
            </Label>
            <p className="text-xs text-muted-foreground">
              {copy(
                locale,
                'Connected athletes get the session on the selected date.',
                'Anslutna atleter får passet på valt datum.'
              )}
            </p>
          </div>
        </div>

        {/* Responsible Coach Selection */}
        {coaches.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="coach" className="flex items-center gap-2">
              <UserCircle className="h-4 w-4" />
              {copy(locale, 'Responsible coach (optional)', 'Ansvarig coach (valfritt)')}
            </Label>
            <Select
              value={selectedCoach || 'none'}
              onValueChange={(val) => setSelectedCoach(val === 'none' ? '' : val)}
            >
              <SelectTrigger id="coach">
                <SelectValue placeholder={copy(locale, 'Select coach for calendar...', 'Välj coach för kalender...')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{copy(locale, 'None selected', 'Ingen vald')}</SelectItem>
                {coaches.map((coach) => (
                  <SelectItem key={coach.id} value={coach.id}>
                    {coach.name}
                    {coach.email && (
                      <span className="text-muted-foreground ml-2 text-xs">
                        ({coach.email})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {copy(locale, "The session appears in the selected coach's calendar", 'Passet visas i den valda coachens kalender')}
            </p>
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">{copy(locale, 'Notes (optional)', 'Anteckningar (valfritt)')}</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={copy(locale, 'Any instructions for the athlete...', 'Eventuella instruktioner till atleten...')}
            rows={2}
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => setOpen(false)}>
          {copy(locale, 'Cancel', 'Avbryt')}
        </Button>
        <Button
          onClick={handleAssign}
          disabled={loading || selectedAthletes.length === 0}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {pushToGarmin
                ? copy(locale, 'Assigning and sending...', 'Tilldelar och skickar...')
                : copy(locale, 'Assigning...', 'Tilldelar...')}
            </>
          ) : (
            <>
              <Users className="h-4 w-4 mr-2" />
              {copy(locale, 'Assign', 'Tilldela')} ({selectedAthletes.length})
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
