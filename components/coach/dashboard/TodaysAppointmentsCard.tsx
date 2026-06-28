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
  DashboardCard,
  DashboardCardContent,
  DashboardCardHeader,
  DashboardCardTitle,
  dashboardEmptyStateClass,
  dashboardListItemClass,
} from '@/components/coach/dashboard/DashboardCard';
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
  CalendarCheck,
} from 'lucide-react';
import { format, addDays, subDays, isToday, isTomorrow, isYesterday } from 'date-fns';
import { enUS, sv } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import { useLocale, useTranslations } from '@/i18n/client';

interface TodaysAppointment {
  id: string;
  type: 'strength' | 'cardio' | 'agility' | 'hybrid' | 'external';
  workoutName: string;
  startTime: string;
  endTime: string | null;
  location: { id: string; name: string } | null;
  locationName: string | null;
  athletes: { id: string; name: string }[];
  teamName: string | null;
  assignedDate: Date;
  status: string;
  // External calendar fields
  source?: string;
  description?: string;
  color?: string;
}

interface TodaysAppointmentsCardProps {
  basePath?: string;
  variant?: 'default' | 'compact';
}

const TYPE_ICONS: Record<string, typeof Dumbbell> = {
  strength: Dumbbell,
  cardio: Heart,
  agility: Zap,
  hybrid: Flame,
  external: CalendarCheck,
};

const TYPE_COLORS: Record<string, string> = {
  strength: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800/40 dark:bg-orange-950/25 dark:text-orange-300',
  cardio: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/40 dark:bg-blue-950/25 dark:text-blue-300',
  agility: 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800/40 dark:bg-purple-950/25 dark:text-purple-300',
  hybrid: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800/40 dark:bg-red-950/25 dark:text-red-300',
  external: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/25 dark:text-emerald-300',
};

const SOURCE_LABELS: Record<string, string> = {
  BOKADIREKT: 'Bokadirekt',
  ZOEZI: 'Zoezi',
  APPLE: 'Apple',
  GOOGLE: 'Google',
  OUTLOOK: 'Outlook',
  ICAL_URL: 'Kalender',
};

function getDateLabel(date: Date, locale: Locale, today: string, tomorrow: string, yesterday: string): string {
  if (isToday(date)) return today;
  if (isTomorrow(date)) return tomorrow;
  if (isYesterday(date)) return yesterday;
  return format(date, 'd MMM', { locale });
}

export function TodaysAppointmentsCard({ basePath = '', variant = 'default' }: TodaysAppointmentsCardProps) {
  const t = useTranslations('components.todaysAppointmentsCard');
  const locale = useLocale();
  const dateLocale = locale === 'sv' ? sv : enUS;
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
    const timeoutId = window.setTimeout(() => {
      void fetchAppointments(selectedDate);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [selectedDate, fetchAppointments]);

  const goToPreviousDay = () => setSelectedDate(prev => subDays(prev, 1));
  const goToNextDay = () => setSelectedDate(prev => addDays(prev, 1));
  const goToToday = () => setSelectedDate(new Date());

  // Compact variant for Performance Insights Row
  if (variant === 'compact') {
    const dateLabel = getDateLabel(selectedDate, dateLocale, t('dates.today'), t('dates.tomorrow'), t('dates.yesterday'));
    const showTodayButton = !isToday(selectedDate);

    return (
      <DashboardCard glow="emerald" className="group">
        <DashboardCardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <DashboardCardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-500" />
              {t('title')}
            </DashboardCardTitle>
            {/* Date Navigation */}
            <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-white/10 dark:bg-zinc-950/40">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-md"
                onClick={goToPreviousDay}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <button
                onClick={showTodayButton ? goToToday : undefined}
                className={`min-w-[60px] rounded-md px-1 text-center text-xs font-medium ${
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
                className="h-6 w-6 rounded-md"
                onClick={goToNextDay}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DashboardCardHeader>
        <DashboardCardContent>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {isToday(selectedDate) ? t('empty.noneToday') : t('empty.none')}
            </p>
          ) : (
            <div className="space-y-2">
              {appointments.slice(0, 3).map((appointment) => {
                const Icon = TYPE_ICONS[appointment.type] || CalendarCheck;
                const isExternal = appointment.type === 'external';
                const subText = isExternal
                  ? `${appointment.startTime}${appointment.source ? ` • ${SOURCE_LABELS[appointment.source] || appointment.source}` : ''}`
                  : `${appointment.startTime} • ${appointment.athletes.length === 1
                      ? appointment.athletes[0].name
                      : appointment.athletes.length > 0
                        ? t('athleteCount', { count: appointment.athletes.length })
                        : appointment.locationName || ''}`;
                return (
                  <div
                    key={`${appointment.type}-${appointment.id}`}
                    className={dashboardListItemClass('emerald', 'flex items-center justify-between gap-3 p-3')}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate dark:text-slate-200">
                        {appointment.workoutName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {subText}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`h-7 shrink-0 gap-1 text-xs ${TYPE_COLORS[appointment.type] || TYPE_COLORS.external}`}
                      style={appointment.color ? { backgroundColor: appointment.color + '20', color: appointment.color } : undefined}
                    >
                      <Icon className="h-3 w-3" />
                    </Badge>
                  </div>
                );
              })}
              <Link href={`${basePath}/coach/calendar`} className="block text-center">
                <Button variant="ghost" size="sm" className="text-xs w-full">
                  {appointments.length > 3 ? t('more', { count: appointments.length - 3 }) : t('viewCalendar')} <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          )}
        </DashboardCardContent>
      </DashboardCard>
    );
  }

  // Default variant
  const dateLabel = getDateLabel(selectedDate, dateLocale, t('dates.today'), t('dates.tomorrow'), t('dates.yesterday'));
  const showTodayButton = !isToday(selectedDate);

  const renderDateNavigation = () => (
    <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-white/10 dark:bg-zinc-950/40">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 rounded-md"
        onClick={goToPreviousDay}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <button
        onClick={showTodayButton ? goToToday : undefined}
        className={`min-w-[70px] rounded-md px-1 text-center text-sm font-medium ${
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
        className="h-7 w-7 rounded-md"
        onClick={goToNextDay}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );

  if (loading) {
    return (
      <DashboardCard glow="emerald" className="group">
        <DashboardCardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <DashboardCardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-500" />
              {t('title')}
            </DashboardCardTitle>
            {renderDateNavigation()}
          </div>
        </DashboardCardHeader>
        <DashboardCardContent>
          <div className={dashboardEmptyStateClass}>
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </DashboardCardContent>
      </DashboardCard>
    );
  }

  if (appointments.length === 0) {
    return (
      <DashboardCard glow="emerald" className="group">
        <DashboardCardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <DashboardCardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-500" />
              {t('title')}
            </DashboardCardTitle>
            {renderDateNavigation()}
          </div>
        </DashboardCardHeader>
        <DashboardCardContent>
          <div className={dashboardEmptyStateClass}>
            <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{isToday(selectedDate) ? t('empty.noneToday') : t('empty.none')}</p>
            <p className="text-xs mt-1">
              {t('empty.description')}
            </p>
          </div>
        </DashboardCardContent>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard glow="emerald" className="group">
      <DashboardCardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <DashboardCardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-500" />
            {t('title')}
          </DashboardCardTitle>
          <div className="flex items-center gap-2">
            {renderDateNavigation()}
            <Badge variant="secondary" className="text-xs">
              {appointments.length}
            </Badge>
          </div>
        </div>
      </DashboardCardHeader>
      <DashboardCardContent className="space-y-3">
        {appointments.slice(0, 5).map((appointment) => {
          const Icon = TYPE_ICONS[appointment.type] || CalendarCheck;
          const locationDisplay = appointment.locationName || appointment.location?.name;

          return (
            <div
              key={`${appointment.type}-${appointment.id}`}
              className={dashboardListItemClass('emerald', 'flex items-start gap-3 p-3')}
            >
              {/* Time */}
              <div className="flex w-14 flex-shrink-0 justify-center rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-center dark:border-white/10 dark:bg-zinc-900/60">
                <span className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
                  {appointment.startTime}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className={`gap-1 text-xs ${TYPE_COLORS[appointment.type]}`}>
                    <Icon className="h-3 w-3 mr-1" />
                    {t(`types.${appointment.type}`)}
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
                        {t('athleteCount', { count: appointment.athletes.length })}
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
            {t('moreAppointments', { count: appointments.length - 5 })}
          </p>
        )}

        <Link href={`${basePath}/coach/calendar`} className="block pt-2">
          <Button variant="ghost" size="sm" className="text-xs w-full">
            {t('viewCalendar')} <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      </DashboardCardContent>
    </DashboardCard>
  );
}
