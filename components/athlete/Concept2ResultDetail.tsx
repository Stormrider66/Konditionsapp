'use client';

/**
 * Concept2 Result Detail Component
 *
 * Displays detailed information about a single Concept2 workout result
 * including splits, pace analysis, and performance metrics.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Ship,
  Clock,
  Flame,
  Heart,
  Timer,
  TrendingUp,
  Waves,
  Bike,
  PersonStanding,
  Gauge,
  Activity,
} from 'lucide-react';
import { format } from 'date-fns';
import { enUS, sv } from 'date-fns/locale';
import { useLocale } from 'next-intl';

interface Concept2Result {
  id: string;
  type: string;
  workoutType?: string;
  date: string;
  distance: number;
  time: number;
  calories?: number;
  strokeRate?: number;
  dragFactor?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  minHeartRate?: number;
  pace?: number;
  tss?: number;
  trimp?: number;
  mappedIntensity?: string;
  isVerified: boolean;
  splits?: SplitData[];
  comments?: string;
}

interface SplitData {
  type?: string;
  time?: number;
  distance?: number;
  stroke_rate?: number;
  calories?: number;
  heart_rate?: { average?: number };
}

interface Concept2ResultDetailProps {
  result: Concept2Result;
}

type AppLocale = 'en' | 'sv';

const getAppLocale = (locale: string): AppLocale => (locale === 'sv' ? 'sv' : 'en');

const t = (locale: AppLocale, svText: string, enText: string) => (
  locale === 'sv' ? svText : enText
);

const dateLocale = (locale: AppLocale) => (locale === 'sv' ? sv : enUS);

const EQUIPMENT_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  rower: { label: 'RowErg', icon: <Ship className="h-5 w-5" />, color: 'bg-blue-100 text-blue-800' },
  skierg: { label: 'SkiErg', icon: <PersonStanding className="h-5 w-5" />, color: 'bg-sky-100 text-sky-800' },
  bike: { label: 'BikeErg', icon: <Bike className="h-5 w-5" />, color: 'bg-green-100 text-green-800' },
  dynamic: { label: 'Dynamic', icon: <Waves className="h-5 w-5" />, color: 'bg-purple-100 text-purple-800' },
  slides: { label: 'Slides', icon: <Ship className="h-5 w-5" />, color: 'bg-indigo-100 text-indigo-800' },
  multierg: { label: 'MultiErg', icon: <Activity className="h-5 w-5" />, color: 'bg-orange-100 text-orange-800' },
};

const INTENSITY_CONFIG: Record<string, { label: Record<AppLocale, string>; color: string }> = {
  EASY: { label: { en: 'Easy', sv: 'Lätt' }, color: 'bg-green-100 text-green-800' },
  MODERATE: { label: { en: 'Moderate', sv: 'Måttlig' }, color: 'bg-yellow-100 text-yellow-800' },
  HARD: { label: { en: 'Hard', sv: 'Hård' }, color: 'bg-red-100 text-red-800' },
};

/**
 * Format time from tenths of seconds to MM:SS.t
 */
function formatTime(tenths: number): string {
  const totalSeconds = tenths / 10;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toFixed(1).padStart(4, '0')}`;
}

/**
 * Format pace from seconds per 500m to M:SS.t/500m
 */
function formatPace(secondsPer500m: number): string {
  const minutes = Math.floor(secondsPer500m / 60);
  const seconds = secondsPer500m % 60;
  return `${minutes}:${seconds.toFixed(1).padStart(4, '0')}/500m`;
}

/**
 * Format distance
 */
function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${meters} m`;
}

export function Concept2ResultDetail({ result }: Concept2ResultDetailProps) {
  const locale = getAppLocale(useLocale());
  const equipment = EQUIPMENT_CONFIG[result.type] || EQUIPMENT_CONFIG.rower;
  const intensity = result.mappedIntensity
    ? INTENSITY_CONFIG[result.mappedIntensity]
    : null;

  const workoutDate = new Date(result.date);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {equipment.icon}
              <span>{equipment.label}</span>
              {result.workoutType && (
                <span className="text-muted-foreground font-normal text-sm">
                  - {result.workoutType}
                </span>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {format(workoutDate, 'EEEE d MMMM yyyy, HH:mm', { locale: dateLocale(locale) })}
            </p>
          </div>
          <div className="flex gap-2">
            {intensity && (
              <Badge className={intensity.color}>{intensity.label[locale]}</Badge>
            )}
            {result.isVerified && (
              <Badge variant="outline" className="text-green-600 border-green-300">
                {t(locale, 'Verifierad', 'Verified')}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Primary Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            icon={<Timer className="h-4 w-4" />}
            label={t(locale, 'Tid', 'Time')}
            value={formatTime(result.time)}
          />
          <MetricCard
            icon={<TrendingUp className="h-4 w-4" />}
            label={t(locale, 'Distans', 'Distance')}
            value={formatDistance(result.distance)}
          />
          {result.pace && (
            <MetricCard
              icon={<Gauge className="h-4 w-4" />}
              label={t(locale, 'Tempo', 'Pace')}
              value={formatPace(result.pace)}
            />
          )}
          {result.calories && (
            <MetricCard
              icon={<Flame className="h-4 w-4" />}
              label={t(locale, 'Kalorier', 'Calories')}
              value={`${result.calories} kcal`}
            />
          )}
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {result.strokeRate && (
            <MetricCard
              icon={<Activity className="h-4 w-4" />}
              label={result.type === 'bike' ? 'RPM' : t(locale, 'Årtag/min', 'Strokes/min')}
              value={result.strokeRate.toFixed(1)}
            />
          )}
          {result.dragFactor && (
            <MetricCard
              icon={<Waves className="h-4 w-4" />}
              label={t(locale, 'Dragfaktor', 'Drag factor')}
              value={String(result.dragFactor)}
            />
          )}
          {result.tss && (
            <MetricCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="TSS"
              value={result.tss.toFixed(0)}
            />
          )}
          {result.trimp && (
            <MetricCard
              icon={<Heart className="h-4 w-4" />}
              label="TRIMP"
              value={result.trimp.toFixed(0)}
            />
          )}
        </div>

        {/* Heart Rate Section */}
        {(result.avgHeartRate || result.maxHeartRate) && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Heart className="h-4 w-4" />
              {t(locale, 'Puls', 'Heart rate')}
            </h4>
            <div className="grid grid-cols-3 gap-4">
              {result.avgHeartRate && (
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{Math.round(result.avgHeartRate)}</p>
                  <p className="text-xs text-muted-foreground">{t(locale, 'Medel bpm', 'Avg bpm')}</p>
                </div>
              )}
              {result.maxHeartRate && (
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">
                    {Math.round(result.maxHeartRate)}
                  </p>
                  <p className="text-xs text-muted-foreground">Max bpm</p>
                </div>
              )}
              {result.minHeartRate && (
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {Math.round(result.minHeartRate)}
                  </p>
                  <p className="text-xs text-muted-foreground">Min bpm</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Splits Section */}
        {result.splits && result.splits.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {t(locale, 'Intervaller/Splits', 'Intervals/Splits')}
            </h4>
            <div className="space-y-2">
              {result.splits.map((split, index) => (
                <SplitRow key={index} split={split} index={index} />
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        {result.comments && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">{t(locale, 'Anteckningar', 'Notes')}</h4>
            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              {result.comments}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center p-3 bg-muted/50 rounded-lg">
      <div className="text-muted-foreground mb-1">{icon}</div>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function SplitRow({ split, index }: { split: SplitData; index: number }) {
  const paceSeconds = split.time && split.distance
    ? (split.time / 10) / (split.distance / 500)
    : null;

  return (
    <div className="flex items-center gap-4 p-2 bg-muted/30 rounded text-sm">
      <span className="w-8 text-muted-foreground font-medium">#{index + 1}</span>
      {split.distance && (
        <span className="flex-1">{formatDistance(split.distance)}</span>
      )}
      {split.time && (
        <span className="flex-1">{formatTime(split.time)}</span>
      )}
      {paceSeconds && (
        <span className="flex-1 text-muted-foreground">
          {formatPace(paceSeconds)}
        </span>
      )}
      {split.stroke_rate && (
        <span className="w-16 text-muted-foreground">
          {split.stroke_rate} s/m
        </span>
      )}
      {split.heart_rate?.average && (
        <span className="w-16 text-muted-foreground flex items-center gap-1">
          <Heart className="h-3 w-3" />
          {Math.round(split.heart_rate.average)}
        </span>
      )}
    </div>
  );
}
