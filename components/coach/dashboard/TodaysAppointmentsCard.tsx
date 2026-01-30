'use client';

/**
 * TodaysAppointmentsCard - Dashboard card showing today's scheduled sessions
 *
 * Features:
 * - Shows scheduled workouts with time, location, athletes
 * - Distinguishes between team and individual sessions
 * - Links to workout details
 */

import { useEffect, useState } from 'react';
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
} from 'lucide-react';

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

export function TodaysAppointmentsCard({ basePath = '' }: TodaysAppointmentsCardProps) {
  const [appointments, setAppointments] = useState<TodaysAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, []);

  async function fetchAppointments() {
    try {
      const response = await fetch('/api/coach/appointments/today');
      if (response.ok) {
        const data = await response.json();
        setAppointments(data.appointments || []);
      }
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <GlassCard>
        <GlassCardHeader className="pb-3">
          <GlassCardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-500" />
            Dagens bokningar
          </GlassCardTitle>
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
          <GlassCardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-500" />
            Dagens bokningar
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Inga schemalagda pass idag</p>
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
            Dagens bokningar
          </GlassCardTitle>
          <Badge variant="secondary" className="text-xs">
            {appointments.length}
          </Badge>
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
