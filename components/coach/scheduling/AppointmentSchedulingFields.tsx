'use client';

/**
 * AppointmentSchedulingFields - Reusable scheduling fields for workout assignment
 *
 * Features:
 * - Time picker (start time)
 * - Duration dropdown OR end time
 * - Location dropdown with free text fallback
 * - Calendar event checkbox
 */

import { useCallback, useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock, MapPin, Calendar } from 'lucide-react';
import { useTranslations } from '@/i18n/client';

interface Location {
  id: string;
  name: string;
}

interface AppointmentSchedulingFieldsProps {
  startTime: string;
  endTime: string;
  locationId: string;
  locationName: string;
  createCalendarEvent: boolean;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  onLocationIdChange: (id: string) => void;
  onLocationNameChange: (name: string) => void;
  onCreateCalendarEventChange: (create: boolean) => void;
}

const DURATION_OPTIONS = [
  { value: '30', labelKey: 'minutes30' },
  { value: '45', labelKey: 'minutes45' },
  { value: '60', labelKey: 'hour1' },
  { value: '75', labelKey: 'hour1Minutes15' },
  { value: '90', labelKey: 'hours1Half' },
  { value: '120', labelKey: 'hours2' },
];

function addMinutesToTime(time: string, minutes: number): string {
  if (!time) return '';
  const [hours, mins] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMins = totalMinutes % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
}

export function AppointmentSchedulingFields({
  startTime,
  endTime,
  locationId,
  locationName,
  createCalendarEvent,
  onStartTimeChange,
  onEndTimeChange,
  onLocationIdChange,
  onLocationNameChange,
  onCreateCalendarEventChange,
}: AppointmentSchedulingFieldsProps) {
  const t = useTranslations('components.appointmentSchedulingFields');
  const [locations, setLocations] = useState<Location[]>([]);
  const [useCustomLocation, setUseCustomLocation] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<string>('60');

  const fetchLocations = useCallback(async () => {
    try {
      const response = await fetch('/api/locations');
      if (response.ok) {
        const data = await response.json();
        setLocations(data.locations || []);
      }
    } catch (error) {
      console.error('Failed to fetch locations:', error);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchLocations();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchLocations]);

  // Sync end time when start time or duration changes
  useEffect(() => {
    if (startTime && selectedDuration) {
      const newEndTime = addMinutesToTime(startTime, parseInt(selectedDuration, 10));
      onEndTimeChange(newEndTime);
    }
  }, [startTime, selectedDuration, onEndTimeChange]);

  function handleLocationChange(value: string) {
    if (value === 'custom') {
      setUseCustomLocation(true);
      onLocationIdChange('');
    } else {
      setUseCustomLocation(false);
      onLocationIdChange(value);
      onLocationNameChange('');
    }
  }

  return (
    <div className="space-y-4">
      {/* Start Time */}
      <div className="space-y-2">
        <Label htmlFor="startTime" className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {t('startTime')}
        </Label>
        <Input
          id="startTime"
          type="time"
          value={startTime}
          onChange={(e) => onStartTimeChange(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <Label htmlFor="duration">{t('duration')}</Label>
        <Select value={selectedDuration} onValueChange={setSelectedDuration}>
          <SelectTrigger>
            <SelectValue placeholder={t('durationPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {DURATION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(`durations.${option.labelKey}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {startTime && endTime && (
          <p className="text-xs text-muted-foreground">
            {t('endTime', { time: endTime })}
          </p>
        )}
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label htmlFor="location" className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          {t('location')}
        </Label>
        {locations.length > 0 && !useCustomLocation ? (
          <Select value={locationId || 'none'} onValueChange={handleLocationChange}>
            <SelectTrigger>
              <SelectValue placeholder={t('locationPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('noLocation')}</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
              <SelectItem value="custom">{t('customLocation')}</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <div className="space-y-2">
            <Input
              id="locationName"
              type="text"
              placeholder={t('customLocationPlaceholder')}
              value={locationName}
              onChange={(e) => onLocationNameChange(e.target.value)}
            />
            {locations.length > 0 && (
              <button
                type="button"
                className="text-xs text-blue-600 hover:underline"
                onClick={() => {
                  setUseCustomLocation(false);
                  onLocationNameChange('');
                }}
              >
                {t('chooseFromList')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Calendar Event Checkbox */}
      <div className="flex items-center space-x-2 pt-2">
        <Checkbox
          id="createCalendarEvent"
          checked={createCalendarEvent}
          onCheckedChange={(checked) => onCreateCalendarEventChange(checked === true)}
        />
        <Label htmlFor="createCalendarEvent" className="flex items-center gap-2 cursor-pointer">
          <Calendar className="h-4 w-4" />
          {t('addToAthleteCalendar')}
        </Label>
      </div>
    </div>
  );
}
