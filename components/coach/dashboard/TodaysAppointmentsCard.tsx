'use client';

/**
 * TodaysAppointmentsCard - Dashboard card showing today's scheduled sessions
 *
 * Features:
 * - Shows scheduled workouts with time, location, athletes
 * - Distinguishes between team and individual sessions
 * - Links to workout details
 */

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Clock,
  MapPin,
  Users,
  User,
  Dumbbell,
  Heart,
  Zap,
  Flame,
  ArrowRight,
  Calendar,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { format, addDays, subDays, isToday, isTomorrow, isYesterday } from 'date-fns';
import { sv } from 'date-fns/locale';

interface TodaysAppointment {
  id: string;
  type: 'strength' | 'cardio' | 'agility' | 'hybrid';
  workoutName: string;
  startTime: string;
  endTime: string | null;
  location: { id: string; name: string } | null;
  locationName: string | null;
  athletes: { id: string; name: string }[];
  teamName: string | null;
  assignedDate: Date;
  status: string;
}

interface TodaysAppointmentsCardProps {
  basePath?: string;
  variant?: 'default' | 'compact';
}

const TYPE_ICONS = {
  strength: Dumbbell,
  cardio: Heart,
  agility: Zap,
  hybrid: Flame,
};

const TYPE_COLORS = {
  strength: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  cardio: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  agility: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  hybrid: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const TYPE_LABELS = {
  strength: 'Styrka',
  cardio: 'Kondition',
  agility: 'Agility',
  hybrid: 'Hybrid',
};

function getDateLabel(date: Date): string {
  if (isToday(date)) return 'Idag';
  if (isTomorrow(date)) return 'Imorgon';
  if (isYesterday(date)) return 'Igår';
  return format(date, 'd MMM', { locale: sv });
}

export function TodaysAppointmentsCard({ basePath = '', variant = 'default' }: TodaysAppointmentsCardProps) {
  const [appointments, setAppointments] = useState<TodaysAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const fetchAppointments = useCallback(async (date: Date) => {
    setLoading(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const response = await fetch(`/api/coach/appointments/today?date=${dateStr}`);
      if (response.ok) {
        const data = await response.json();
        setAppointments(data.appointments || []);
      }
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments(selectedDate);
  }, [selectedDate, fetchAppointments]);

  const goToPreviousDay = () => setSelectedDate(prev => subDays(prev, 1));
  const goToNextDay = () => setSelectedDate(prev => addDays(prev, 1));
  const goToToday = () => setSelectedDate(new Date());

  // Compact variant for Performance Insights Row
  if (variant === 'compact') {
    const dateLabel = getDateLabel(selectedDate);
    const showTodayButton = !isToday(selectedDate);

    return (
      <GlassCard>
        <GlassCardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <GlassCardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-500" />
              Bokningar
            </GlassCardTitle>
            {/* Date Navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={goToPreviousDay}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <button
                onClick={showTodayButton ? goToToday : undefined}
                className={`text-xs font-medium min-w-[60px] text-center ${
                  showTodayButton
                    ? 'text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                {dateLabel}
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={goToNextDay}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </GlassCardHeader>
        <GlassCardContent>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Inga schemalagda pass {isToday(selectedDate) ? 'idag' : ''}
            </p>
          ) : (
            <div className="space-y-2">
              {appointments.slice(0, 3).map((appointment) => {
                const Icon = TYPE_ICONS[appointment.type];
                return (
                  <div
                    key={`${appointment.type}-${appointment.id}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 dark:hover:bg-white/5 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate dark:text-slate-200">
                        {appointment.workoutName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {appointment.startTime} • {appointment.athletes.length === 1
                          ? appointment.athletes[0].name
                          : `${appointment.athletes.length} atleter`}
                      </p>
                    </div>
                    <Badge className={`text-xs ${TYPE_COLORS[appointment.type]}`}>
                      <Icon className="h-3 w-3" />
                    </Badge>
                  </div>
                );
              })}
              <Link href={`${basePath}/coach/calendar`} className="block text-center">
                <Button variant="ghost" size="sm" className="text-xs w-full">
                  {appointments.length > 3 ? `+${appointments.length - 3} fler` : 'Visa kalender'} <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          )}
        </GlassCardContent>
      </GlassCard>
    );
  }

  // Default variant
  const dateLabel = getDateLabel(selectedDate);
  const showTodayButton = !isToday(selectedDate);

  const DateNavigation = () => (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={goToPreviousDay}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <button
        onClick={showTodayButton ? goToToday : undefined}
        className={`text-sm font-medium min-w-[70px] text-center ${
          showTodayButton
            ? 'text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer'
            : 'text-slate-700 dark:text-slate-300'
        }`}
      >
        {dateLabel}
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={goToNextDay}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );

  if (loading) {
    return (
      <GlassCard>
        <GlassCardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <GlassCardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-500" />
              Bokningar
            </GlassCardTitle>
            <DateNavigation />
          </div>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  if (appointments.length === 0) {
    return (
      <GlassCard>
        <GlassCardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <GlassCardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-500" />
              Bokningar
            </GlassCardTitle>
            <DateNavigation />
          </div>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Inga schemalagda pass {isToday(selectedDate) ? 'idag' : ''}</p>
            <p className="text-xs mt-1">
              Schemalägg pass genom att ange tid vid tilldelning
            </p>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <GlassCardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <GlassCardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-500" />
            Bokningar
          </GlassCardTitle>
          <div className="flex items-center gap-2">
            <DateNavigation />
            <Badge variant="secondary" className="text-xs">
              {appointments.length}
            </Badge>
          </div>
        </div>
      </GlassCardHeader>
      <GlassCardContent className="space-y-3">
        {appointments.slice(0, 5).map((appointment) => {
          const Icon = TYPE_ICONS[appointment.type];
          const locationDisplay = appointment.locationName || appointment.location?.name;

          return (
            <div
              key={`${appointment.type}-${appointment.id}`}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 dark:bg-white/5 hover:bg-muted/50 dark:hover:bg-white/10 transition-colors"
            >
              {/* Time */}
              <div className="flex-shrink-0 w-12 text-center">
                <span className="text-lg font-bold dark:text-slate-200">
                  {appointment.startTime}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={`text-xs ${TYPE_COLORS[appointment.type]}`}>
                    <Icon className="h-3 w-3 mr-1" />
                    {TYPE_LABELS[appointment.type]}
                  </Badge>
                  {appointment.teamName && (
                    <Badge variant="outline" className="text-xs">
                      <Users className="h-3 w-3 mr-1" />
                      {appointment.teamName}
                    </Badge>
                  )}
                </div>

                <p className="font-medium text-sm dark:text-slate-200 truncate">
                  {appointment.workoutName}
                </p>

                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                  {locationDisplay && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {locationDisplay}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    {appointment.athletes.length === 1 ? (
                      <>
                        <User className="h-3 w-3" />
                        {appointment.athletes[0].name}
                      </>
                    ) : (
                      <>
                        <Users className="h-3 w-3" />
                        {appointment.athletes.length} atleter
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {appointments.length > 5 && (
          <p className="text-xs text-muted-foreground text-center pt-1">
            + {appointments.length - 5} fler bokningar
          </p>
        )}

        <Link href={`${basePath}/coach/calendar`} className="block pt-2">
          <Button variant="ghost" size="sm" className="text-xs w-full">
            Visa kalender <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      </GlassCardContent>
    </GlassCard>
  );
}
