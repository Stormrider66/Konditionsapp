'use client';

/**
 * Ergometer Zone Table
 *
 * Displays training zones for ergometer-based training
 * with power and pace (for Concept2) targets
 */

import { ErgometerType } from '@prisma/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';

interface ErgometerZone {
  zone: number;
  name: string;
  nameSwedish: string;
  powerMin: number;
  powerMax: number;
  percentMin: number;
  percentMax: number;
  paceMin?: number;
  paceMax?: number;
  hrMin?: number;
  hrMax?: number;
  description: string;
  typicalDuration?: string;
}

interface ErgometerZoneTableProps {
  zones: ErgometerZone[];
  ergometerType: ErgometerType;
  thresholdPower: number;
  thresholdSource?: string;
  showPace?: boolean;
  compact?: boolean;
}

const ZONE_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  2: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  3: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  4: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
  5: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
  6: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
};

const ERGOMETER_LABELS: Record<ErgometerType, string> = {
  CONCEPT2_ROW: 'Roddmaskin',
  CONCEPT2_SKIERG: 'SkiErg',
  CONCEPT2_BIKEERG: 'BikeErg',
  WATTBIKE: 'Wattbike',
  ASSAULT_BIKE: 'Air Bike',
};

function formatPace(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = (seconds % 60).toFixed(1);
  return `${min}:${sec.padStart(4, '0')}`;
}

function isConcept2(ergometerType: ErgometerType): boolean {
  return ['CONCEPT2_ROW', 'CONCEPT2_SKIERG', 'CONCEPT2_BIKEERG'].includes(ergometerType);
}

export function ErgometerZoneTable({
  zones,
  ergometerType,
  thresholdPower,
  thresholdSource = 'Unknown',
  showPace = true,
  compact = false,
}: ErgometerZoneTableProps) {
  const showPaceColumn = showPace && isConcept2(ergometerType);

  return (
    <Card>
      <CardHeader className={compact ? 'py-3' : undefined}>
        <CardTitle className={compact ? 'text-base' : undefined}>
          Traningszoner - {ERGOMETER_LABELS[ergometerType]}
        </CardTitle>
        <CardDescription>
          Baserat pa troskel: <strong>{thresholdPower}W</strong> ({thresholdSource})
        </CardDescription>
      </CardHeader>
      <CardContent className={compact ? 'py-2' : undefined}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 px-2 font-medium">Zon</th>
                <th className="py-2 px-2 font-medium">Namn</th>
                <th className="py-2 px-2 font-medium">Effekt (W)</th>
                <th className="py-2 px-2 font-medium">% Troskel</th>
                {showPaceColumn && <th className="py-2 px-2 font-medium">Tempo /500m</th>}
                {!compact && <th className="py-2 px-2 font-medium hidden sm:table-cell">Anvandning</th>}
              </tr>
            </thead>
            <tbody>
              {zones.map((zone) => {
                const colors = ZONE_COLORS[zone.zone] || ZONE_COLORS[1];
                return (
                  <tr key={zone.zone} className={`border-b ${colors.bg}`}>
                    <td className="py-2 px-2">
                      <Badge variant="outline" className={`${colors.text} ${colors.border}`}>
                        Z{zone.zone}
                      </Badge>
                    </td>
                    <td className="py-2 px-2 font-medium">{zone.nameSwedish}</td>
                    <td className="py-2 px-2 font-mono">
                      {zone.powerMin}-{zone.powerMax}
                    </td>
                    <td className="py-2 px-2 text-muted-foreground">
                      {zone.percentMin}-{zone.percentMax}%
                    </td>
                    {showPaceColumn && (
                      <td className="py-2 px-2 font-mono">
                        {zone.paceMax && zone.paceMin
                          ? `${formatPace(zone.paceMax)}-${formatPace(zone.paceMin)}`
                          : '-'}
                      </td>
                    )}
                    {!compact && (
                      <td className="py-2 px-2 text-muted-foreground hidden sm:table-cell">
                        {zone.typicalDuration || zone.description}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Zone Description Legend */}
        {!compact && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div className="space-y-1">
                <p>
                  <strong>Z1-Z2:</strong> Aterhämtning och basuthallighet. Langre pass, lagre intensitet.
                </p>
                <p>
                  <strong>Z3:</strong> Tempo. Lagom anstrangande, lattare intervaller.
                </p>
                <p>
                  <strong>Z4:</strong> Troskel. Tuff men hallbar, typiska 4-20 min intervaller.
                </p>
                <p>
                  <strong>Z5-Z6:</strong> VO2max och anaerob. Korta, harda intervaller (30s-5min).
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== COMPACT VARIANT ====================

export function ErgometerZoneStrip({
  zones,
  currentZone,
}: {
  zones: ErgometerZone[];
  currentZone?: number;
}) {
  return (
    <div className="flex gap-1">
      {zones.map((zone) => {
        const colors = ZONE_COLORS[zone.zone] || ZONE_COLORS[1];
        const isActive = currentZone === zone.zone;
        return (
          <div
            key={zone.zone}
            className={`
              flex-1 text-center py-1 px-2 rounded text-xs font-medium
              ${colors.bg} ${colors.text}
              ${isActive ? 'ring-2 ring-offset-1 ring-black' : ''}
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

// ==================== SINGLE ZONE CARD ====================

export function ErgometerZoneCard({
  zone,
  showPace = false,
}: {
  zone: ErgometerZone;
  showPace?: boolean;
}) {
  const colors = ZONE_COLORS[zone.zone] || ZONE_COLORS[1];

  return (
    <div className={`rounded-lg border p-3 ${colors.bg} ${colors.border}`}>
      <div className="flex items-center justify-between mb-2">
        <Badge variant="outline" className={`${colors.text} ${colors.border}`}>
          Zon {zone.zone}
        </Badge>
        <span className="text-xs text-muted-foreground">{zone.percentMin}-{zone.percentMax}%</span>
      </div>
      <h4 className={`font-semibold ${colors.text}`}>{zone.nameSwedish}</h4>
      <p className="text-lg font-mono font-bold mt-1">
        {zone.powerMin}-{zone.powerMax}W
      </p>
      {showPace && zone.paceMin && zone.paceMax && (
        <p className="text-sm text-muted-foreground mt-1">
          {formatPace(zone.paceMax)} - {formatPace(zone.paceMin)} /500m
        </p>
      )}
      {zone.typicalDuration && (
        <p className="text-xs text-muted-foreground mt-2">{zone.typicalDuration}</p>
      )}
    </div>
  );
}

// ==================== ZONE GRID ====================

export function ErgometerZoneGrid({
  zones,
  ergometerType,
}: {
  zones: ErgometerZone[];
  ergometerType: ErgometerType;
}) {
  const showPace = isConcept2(ergometerType);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {zones.map((zone) => (
        <ErgometerZoneCard key={zone.zone} zone={zone} showPace={showPace} />
      ))}
    </div>
  );
}
