'use client';

/**
 * Ergometer Zone Card
 *
 * Compact zone display for use within workout segments
 * Shows target zone, power range, and pace (for Concept2)
 */

import { ErgometerType } from '@prisma/client';
import { Badge } from '@/components/ui/badge';
import { Zap, Clock } from 'lucide-react';

interface ErgometerZone {
  zone: number;
  name: string;
  nameSwedish: string;
  powerMin: number;
  powerMax: number;
  percentMin: number;
  percentMax: number;
  paceMin?: number | null;
  paceMax?: number | null;
}

interface ErgometerZoneCardProps {
  zone: ErgometerZone;
  ergometerType: ErgometerType;
  duration?: number; // seconds
  isActive?: boolean;
  compact?: boolean;
}

const ZONE_COLORS: Record<number, { bg: string; text: string; border: string; solid: string }> = {
  1: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', solid: 'bg-green-500' },
  2: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', solid: 'bg-blue-500' },
  3: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', solid: 'bg-yellow-500' },
  4: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300', solid: 'bg-orange-500' },
  5: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', solid: 'bg-red-500' },
  6: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300', solid: 'bg-purple-500' },
};

function formatPace(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = (seconds % 60).toFixed(1);
  return `${min}:${sec.padStart(4, '0')}`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) {
    return `${mins} min`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function isConcept2(ergometerType: ErgometerType): boolean {
  return ['CONCEPT2_ROW', 'CONCEPT2_SKIERG', 'CONCEPT2_BIKEERG'].includes(ergometerType);
}

export function ErgometerZoneCard({
  zone,
  ergometerType,
  duration,
  isActive = false,
  compact = false,
}: ErgometerZoneCardProps) {
  const colors = ZONE_COLORS[zone.zone] || ZONE_COLORS[1];
  const showPace = isConcept2(ergometerType) && zone.paceMin && zone.paceMax;

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${colors.bg} ${colors.border} border ${
          isActive ? 'ring-2 ring-offset-1 ring-black' : ''
        }`}
      >
        <span className={`font-bold text-sm ${colors.text}`}>Z{zone.zone}</span>
        <span className="text-sm font-mono">{zone.powerMin}-{zone.powerMax}W</span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border p-3 ${colors.bg} ${colors.border} ${
        isActive ? 'ring-2 ring-offset-2 ring-primary' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded flex items-center justify-center text-white font-bold text-sm ${colors.solid}`}
          >
            Z{zone.zone}
          </div>
          <div>
            <p className={`font-semibold text-sm ${colors.text}`}>{zone.nameSwedish}</p>
            <p className="text-xs text-muted-foreground">{zone.percentMin}-{zone.percentMax}%</p>
          </div>
        </div>
        {duration && (
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDuration(duration)}
          </Badge>
        )}
      </div>

      {/* Power Target */}
      <div className="flex items-center gap-2 mb-2">
        <Zap className="h-4 w-4 text-muted-foreground" />
        <span className="text-lg font-bold font-mono">
          {zone.powerMin}-{zone.powerMax}
          <span className="text-sm font-normal ml-1">W</span>
        </span>
      </div>

      {/* Pace (Concept2 only) */}
      {showPace && (
        <div className="text-sm text-muted-foreground">
          Tempo: {formatPace(zone.paceMax!)}-{formatPace(zone.paceMin!)} /500m
        </div>
      )}
    </div>
  );
}

// ==================== ZONE STRIP ====================

interface ErgometerZoneStripProps {
  zones: ErgometerZone[];
  currentZone?: number;
  highlightedZone?: number;
}

export function ErgometerZoneStrip({
  zones,
  currentZone,
  highlightedZone,
}: ErgometerZoneStripProps) {
  return (
    <div className="flex gap-1">
      {zones.map((zone) => {
        const colors = ZONE_COLORS[zone.zone] || ZONE_COLORS[1];
        const isActive = currentZone === zone.zone;
        const isHighlighted = highlightedZone === zone.zone;

        return (
          <div
            key={zone.zone}
            className={`
              flex-1 text-center py-1 px-2 rounded text-xs font-medium transition-all
              ${colors.bg} ${colors.text}
              ${isActive ? 'ring-2 ring-offset-1 ring-black scale-105' : ''}
              ${isHighlighted ? 'ring-2 ring-primary' : ''}
            `}
            title={`${zone.nameSwedish}: ${zone.powerMin}-${zone.powerMax}W`}
          >
            Z{zone.zone}
          </div>
        );
      })}
    </div>
  );
}

// ==================== WORKOUT ZONE TARGET ====================

interface WorkoutZoneTargetProps {
  zone: ErgometerZone;
  ergometerType: ErgometerType;
  targetDescription?: string;
}

export function WorkoutZoneTarget({
  zone,
  ergometerType,
  targetDescription,
}: WorkoutZoneTargetProps) {
  const colors = ZONE_COLORS[zone.zone] || ZONE_COLORS[1];
  const showPace = isConcept2(ergometerType) && zone.paceMin && zone.paceMax;

  return (
    <div className={`rounded-lg border-l-4 ${colors.border} bg-muted/30 p-3`}>
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold ${colors.solid}`}
        >
          Z{zone.zone}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{zone.nameSwedish}</span>
            <span className="text-muted-foreground text-sm">
              ({zone.percentMin}-{zone.percentMax}%)
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="font-mono font-medium">
              {zone.powerMin}-{zone.powerMax}W
            </span>
            {showPace && (
              <span className="text-muted-foreground">
                {formatPace(zone.paceMax!)}-{formatPace(zone.paceMin!)} /500m
              </span>
            )}
          </div>
        </div>
      </div>
      {targetDescription && (
        <p className="mt-2 text-sm text-muted-foreground">{targetDescription}</p>
      )}
    </div>
  );
}
