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

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock, MapPin, Calendar } from 'lucide-react';

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

// Common durations in minutes
const DURATION_OPTIONS = [
  { value: '30', label: '30 minuter' },
  { value: '45', label: '45 minuter' },
  { value: '60', label: '1 timme' },
  { value: '75', label: '1 timme 15 min' },
  { value: '90', label: '1,5 timmar' },
  { value: '120', label: '2 timmar' },
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
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [useCustomLocation, setUseCustomLocation] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<string>('60');

  useEffect(() => {
    fetchLocations();
  }, []);

  // Sync end time when start time or duration changes
  useEffect(() => {
    if (startTime && selectedDuration) {
      const newEndTime = addMinutesToTime(startTime, parseInt(selectedDuration, 10));
      onEndTimeChange(newEndTime);
    }
  }, [startTime, selectedDuration, onEndTimeChange]);

  async function fetchLocations() {
    setLoadingLocations(true);
    try {
      const response = await fetch('/api/locations');
      if (response.ok) {
        const data = await response.json();
        setLocations(data.locations || []);
      }
    } catch (error) {
      console.error('Failed to fetch locations:', error);
    } finally {
      setLoadingLocations(false);
    }
  }

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
          Starttid
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
        <Label htmlFor="duration">Längd</Label>
        <Select value={selectedDuration} onValueChange={setSelectedDuration}>
          <SelectTrigger>
            <SelectValue placeholder="Välj längd" />
          </SelectTrigger>
          <SelectContent>
            {DURATION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {startTime && endTime && (
          <p className="text-xs text-muted-foreground">
            Sluttid: {endTime}
          </p>
        )}
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label htmlFor="location" className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Plats
        </Label>
        {locations.length > 0 && !useCustomLocation ? (
          <Select value={locationId || 'none'} onValueChange={handleLocationChange}>
            <SelectTrigger>
              <SelectValue placeholder="Välj plats (valfritt)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Ingen plats</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
              <SelectItem value="custom">Annan plats...</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <div className="space-y-2">
            <Input
              id="locationName"
              type="text"
              placeholder="Ange plats (t.ex. Huvudgymmet)"
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
                Välj från lista istället
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
          Lägg till i atletens kalender
        </Label>
      </div>
    </div>
  );
}
