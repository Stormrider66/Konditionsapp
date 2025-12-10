'use client';

/**
 * Phase Recommendations Component
 *
 * Displays phase-specific training recommendations:
 * - Intensity/volume modifiers
 * - Focus areas for training
 * - Nutrition recommendations
 * - Recovery tips
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dumbbell,
  Moon,
  Heart,
  Utensils,
  ArrowDown,
  ArrowUp,
  Minus,
  Zap,
  Battery,
  Brain,
} from 'lucide-react';

type Phase = 'MENSTRUAL' | 'FOLLICULAR' | 'OVULATORY' | 'LUTEAL';

interface PhaseRecommendationsProps {
  phase: Phase;
  cycleDay: number;
  intensityModifier: number;
  volumeModifier: number;
  focusAreas: string[];
}

const PHASE_DATA: Record<Phase, {
  title: string;
  icon: string;
  color: string;
  bgColor: string;
  description: string;
  training: {
    intensity: string;
    volume: string;
    types: string[];
    avoid: string[];
  };
  nutrition: string[];
  recovery: string[];
  hormoneInfo: string;
}> = {
  MENSTRUAL: {
    title: 'Menstruationsfas',
    icon: '🔴',
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    description: 'Dag 1-5: Kroppen återhämtar sig. Hormonnivåer är låga, vilket kan påverka energi och humör.',
    training: {
      intensity: 'Låg till måttlig',
      volume: 'Reducerad (80%)',
      types: ['Lätt löpning', 'Yoga', 'Simning', 'Promenader', 'Stretching'],
      avoid: ['Högintensiv intervallträning', 'Tunga styrkelyft', 'Tävling'],
    },
    nutrition: [
      'Järnrik kost (kött, baljväxter, spenat)',
      'Anti-inflammatoriska livsmedel',
      'Varm mat och dryck kan lindra',
      'Undvik koffein vid kraftiga kramper',
    ],
    recovery: [
      'Prioritera sömn (7-9 timmar)',
      'Värmebehandling för kramplindring',
      'Lätt rörelse hellre än total vila',
      'Lyssna på kroppens signaler',
    ],
    hormoneInfo: 'Östrogen och progesteron är på sin lägsta nivå. FSH börjar öka för att förbereda nästa ägg.',
  },
  FOLLICULAR: {
    title: 'Follikelfas',
    icon: '🌱',
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    description: 'Dag 6-13: Energin ökar! Östrogen stiger och kroppen är redo för utmaningar.',
    training: {
      intensity: 'Måttlig till hög',
      volume: 'Normal (100%)',
      types: ['Styrketräning', 'HIIT', 'Intervaller', 'Teknisk träning', 'Nya övningar'],
      avoid: ['Underträning - utnyttja energin!'],
    },
    nutrition: [
      'Öka proteinintag för muskelbyggnad',
      'Komplettfulla kolhydrater för energi',
      'Ät efter träning för optimal återhämtning',
      'Fibrerad mat stödjer hormonbalans',
    ],
    recovery: [
      'Återhämtning går snabbare nu',
      'Bra tid för back-to-back träningspass',
      'Muskler svarar bättre på styrketräning',
      'Notera personbästa - du är stark nu!',
    ],
    hormoneInfo: 'Östrogen ökar stadigt och stimulerar FSH. Kroppen förbereder sig för ovulation.',
  },
  OVULATORY: {
    title: 'Ovulationsfas',
    icon: '🌸',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
    description: 'Dag 14-16: Toppform! Östrogen når sin peak och du kan prestera maximalt.',
    training: {
      intensity: 'Hög till maximal',
      volume: 'Något ökad (105%)',
      types: ['Tävling', 'Personbästa-försök', 'Explosiv träning', 'Sprint', 'Max-styrka'],
      avoid: ['Överdrivet hög belastning på knäled', 'Ignorer värk - ökad skaderisk'],
    },
    nutrition: [
      'Bra tid för prestationsföda',
      'Koffein kan ge extra boost',
      'Antioxidanter för återhämtning',
      'Håll dig väl hydrerad',
    ],
    recovery: [
      'OBS: Ökad risk för ligamentskador',
      'Fokusera på uppvärmning och teknik',
      'Planer tävlingar under denna fas',
      'Var medveten om eventuell överträning',
    ],
    hormoneInfo: 'LH och östrogen når sin peak, vilket triggar ovulation. Testosteron ökar också, vilket stärker prestation.',
  },
  LUTEAL: {
    title: 'Lutealfas',
    icon: '🌙',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    description: 'Dag 17-28: Kroppen förbereder sig. Progesteron ökar och RPE kan kännas högre.',
    training: {
      intensity: 'Måttlig',
      volume: 'Något reducerad (85%)',
      types: ['Steady-state aerob', 'Teknikfokus', 'Uthållighet', 'Rörlighetsträning'],
      avoid: ['Mycket hög intensitet', 'Nya tunga övningar', 'Överansträngning'],
    },
    nutrition: [
      'Öka kolhydrater mot slutet av fasen',
      'Magnesiumrika livsmedel kan hjälpa',
      'Extra järn om du förlorar mycket blod',
      'Minska salt vid svullnad',
    ],
    recovery: [
      'Förvänta dig högre upplevd ansträngning',
      'Extra vätskebehov',
      'Sömnkvalitet kan påverkas - prioritera',
      'PMS-symtom kan påverka motivation',
    ],
    hormoneInfo: 'Progesteron dominerar och höjer kroppstemperatur. Östrogen sjunker mot slutet, vilket kan orsaka PMS.',
  },
};

export function PhaseRecommendations({
  phase,
  cycleDay,
  intensityModifier,
  volumeModifier,
  focusAreas,
}: PhaseRecommendationsProps) {
  const data = PHASE_DATA[phase];

  // Calculate intensity arrow
  const intensityArrow = intensityModifier > 1 ? (
    <ArrowUp className="h-4 w-4 text-green-500" />
  ) : intensityModifier < 1 ? (
    <ArrowDown className="h-4 w-4 text-red-500" />
  ) : (
    <Minus className="h-4 w-4 text-gray-500" />
  );

  const volumeArrow = volumeModifier > 1 ? (
    <ArrowUp className="h-4 w-4 text-green-500" />
  ) : volumeModifier < 1 ? (
    <ArrowDown className="h-4 w-4 text-red-500" />
  ) : (
    <Minus className="h-4 w-4 text-gray-500" />
  );

  return (
    <div className="space-y-4">
      {/* Phase Overview */}
      <Card className={data.bgColor}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{data.icon}</span>
            <div>
              <CardTitle className={data.color}>{data.title}</CardTitle>
              <CardDescription>Dag {cycleDay} av cykeln</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{data.description}</p>

          {/* Modifiers */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-3 bg-background rounded-lg">
              <Zap className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-xs text-muted-foreground">Intensitet</p>
                <div className="flex items-center gap-1">
                  <span className="font-bold">{Math.round(intensityModifier * 100)}%</span>
                  {intensityArrow}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-background rounded-lg">
              <Battery className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Volym</p>
                <div className="flex items-center gap-1">
                  <span className="font-bold">{Math.round(volumeModifier * 100)}%</span>
                  {volumeArrow}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Training Recommendations */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            Träning
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Rekommenderade aktiviteter</p>
            <div className="flex flex-wrap gap-1">
              {data.training.types.map((type, i) => (
                <Badge key={i} variant="secondary" className="text-xs">{type}</Badge>
              ))}
            </div>
          </div>
          {data.training.avoid.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Undvik</p>
              <div className="flex flex-wrap gap-1">
                {data.training.avoid.map((item, i) => (
                  <Badge key={i} variant="outline" className="text-xs text-red-600 border-red-200">{item}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Nutrition */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Utensils className="h-4 w-4" />
            Kost
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1">
            {data.nutrition.map((tip, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Recovery */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Moon className="h-4 w-4" />
            Återhämtning
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1">
            {data.recovery.map((tip, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Hormone Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Hormoner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{data.hormoneInfo}</p>
        </CardContent>
      </Card>
    </div>
  );
}
