'use client';

// Types, copy, format options, and the sortable movement card for the
// hybrid workout builder.

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Trash2,
  GripVertical,
  Timer,
  Repeat,
  Dumbbell,
  Trophy,
  Zap,
  Clock,
  Target,
} from 'lucide-react';
import type { HybridMetconData, HybridSectionData } from '@/types';
import type { HockeyHybridPreset } from '@/lib/hockey/hockey-builder-presets';

export interface Exercise {
  id: string;
  name: string;
  nameSv?: string;
  nameEn?: string | null;
  standardAbbreviation?: string;
  movementCategory?: string;
  equipmentTypes: string[];
  defaultReps?: number;
  defaultWeightMale?: number;
  defaultWeightFemale?: number;
}

export interface WorkoutMovement {
  id: string;
  exerciseId: string;
  exercise: Exercise;
  order: number;
  reps?: number;
  calories?: number;
  distance?: number;
  duration?: number;
  weightMale?: number;
  weightFemale?: number;
  notes?: string;
}

export interface MetconBlock {
  id: string;
  title: string;
  format: 'EMOM' | 'AMRAP' | 'FOR_TIME' | 'INTERVALS' | 'CUSTOM';
  intervalSeconds?: number;
  rounds?: number;
  workSeconds?: number;
  restSeconds?: number;
  restAfterSeconds?: number;
  notes?: string;
  movements: WorkoutMovement[];
}

/**
 * Shape consumed by `initialData`. Exported so consumers (notably the
 * workout importer's converter) can produce it without redeclaring the
 * shape locally and silently drifting.
 */
export interface HybridWorkoutBuilderInitialData {
  id?: string;
  name: string;
  description?: string;
  format: string;
  timeCap?: number;
  workTime?: number;
  restTime?: number;
  totalRounds?: number;
  totalMinutes?: number;
  repScheme?: string;
  scalingLevel?: string;
  teamId?: string | null;
  trainingYear?: number | null;
  movements?: WorkoutMovement[];
  tags?: string[];
  // Section data
  warmupData?: HybridSectionData;
  strengthData?: HybridSectionData;
  metconData?: HybridMetconData;
  cooldownData?: HybridSectionData;
}

export interface HybridWorkoutBuilderProps {
  onSave: (workoutId?: string, workoutName?: string) => void;
  onCancel: () => void;
  initialData?: HybridWorkoutBuilderInitialData;
  businessId?: string;
}

export type AppLocale = 'en' | 'sv';
export type LocationItem = { id: string; name: string; city: string | null };
export type EquipmentItem = { enablesExercises?: string[] };

export const formatOptions = [
  { value: 'EMOM', label: { en: 'EMOM', sv: 'EMOM' }, icon: Clock, description: { en: 'Every minute on the minute', sv: 'Varje minut på minuten' } },
  { value: 'AMRAP', label: { en: 'AMRAP', sv: 'AMRAP' }, icon: Repeat, description: { en: 'As many rounds as possible in the given time', sv: 'Så många rundor som möjligt på given tid' } },
  { value: 'FOR_TIME', label: { en: 'For Time', sv: 'På Tid' }, icon: Timer, description: { en: 'Finish the work as fast as possible', sv: 'Slutför arbetet så snabbt som möjligt' } },
  { value: 'TABATA', label: { en: 'Tabata', sv: 'Tabata' }, icon: Zap, description: { en: '20s work / 10s rest x 8 rounds', sv: '20s arbete / 10s vila x 8 rundor' } },
  { value: 'CHIPPER', label: { en: 'Chipper', sv: 'Chipper' }, icon: Target, description: { en: 'Long sequence of movements, once through', sv: 'Lång sekvens av rörelser, en gång' } },
  { value: 'LADDER', label: { en: 'Ladder', sv: 'Stege' }, icon: Dumbbell, description: { en: 'Ascending or descending rep scheme', sv: 'Stigande/fallande rep-schema' } },
  { value: 'INTERVALS', label: { en: 'Intervals', sv: 'Intervaller' }, icon: Zap, description: { en: 'Work/rest intervals', sv: 'Arbete/vila intervaller' } },
  { value: 'HYROX_SIM', label: { en: 'HYROX Sim', sv: 'HYROX Sim' }, icon: Trophy, description: { en: 'HYROX simulation with running and stations', sv: 'HYROX-simulering (löpning + stationer)' } },
];

export const DEFAULT_EMOM_INTERVAL_SECONDS = 60;
export const DEFAULT_EMOM_ROUNDS = 10;

export const equipmentTypeAliases: Record<string, string[]> = {
  machine_ski: ['skierg', 'ski_erg', 'concept2_skierg'],
  machine_row: ['rowing', 'rower', 'row_intervals', 'row_steady_state', 'concept2_row'],
  machine_bike: ['bikeerg', 'cycling_intervals', 'cycling_steady_state', 'wattbike'],
  assault_bike: ['assault_bike', 'airbike_intervals', 'airbike_steady_state', 'echo_bike'],
  running: ['treadmill_run', 'curved_treadmill_run', 'treadmill_walk', 'incline_walking'],
};

export function expandEquipmentTypes(types: string[]) {
  const normalized = new Set<string>();

  types.forEach((type) => {
    const key = type.toLowerCase();
    normalized.add(key);
    equipmentTypeAliases[key]?.forEach((alias) => normalized.add(alias));

    Object.entries(equipmentTypeAliases).forEach(([canonical, aliases]) => {
      if (aliases.includes(key)) {
        normalized.add(canonical);
      }
    });
  });

  return normalized;
}

export const categoryLabels: Record<string, Record<AppLocale, string>> = {
  OLYMPIC_LIFT: { en: 'Olympic lifting', sv: 'Tyngdlyftning' },
  POWERLIFTING: { en: 'Powerlifting', sv: 'Styrkelyft' },
  GYMNASTICS: { en: 'Gymnastics', sv: 'Gymnastik' },
  MONOSTRUCTURAL: { en: 'Conditioning', sv: 'Kondition' },
  KETTLEBELL_WORK: { en: 'Kettlebell', sv: 'Kettlebell' },
  STRONGMAN: { en: 'Strongman', sv: 'Strongman' },
  CORE_WORK: { en: 'Core', sv: 'Core' },
  ACCESSORY: { en: 'Accessory', sv: 'Tillbehör' },
  HYROX_STATION: { en: 'HYROX', sv: 'HYROX' },
};

export const COPY: Record<AppLocale, {
  hockeyTemplates: string;
  chooseFormat: string;
  workoutDetails: string;
  name: string;
  namePlaceholder: string;
  scalingLevel: string;
  rx: string;
  scaled: string;
  foundations: string;
  description: string;
  descriptionPlaceholder: string;
  totalTimeMinutes: string;
  timeCapSeconds: string;
  totalRounds: string;
  workTimeSeconds: string;
  restTimeSeconds: string;
  repScheme: string;
  customRepSchemePlaceholder: string;
  rounds: string;
  reps: string;
  total: string;
  repsPerExercise: string;
  sameRepsHint: string;
  content: string;
  contentDescription: string;
  warmup: string;
  strength: string;
  cooldown: string;
  exercises: string;
  gym: string;
  allEquipment: string;
  available: string;
  required: string;
  movements: string;
  sameRepsPerRound: string;
  block: string;
  newBlock: string;
  blockName: string;
  duplicateBlock: string;
  removeBlock: string;
  format: string;
  intervals: string;
  custom: string;
  startEverySeconds: string;
  restBetween: string;
  addRestAfterBlock: string;
  noRest: string;
  add: string;
  blockNotesPlaceholder: string;
  searchMovements: string;
  noMovementsFound: string;
  addMovementsFor: string;
  cancel: string;
  back: string;
  print: string;
  next: string;
  saving: string;
  saveWorkout: string;
  repsPlaceholder: string;
  distanceMeters: string;
  maleWeightKg: string;
  femaleWeightKg: string;
  count: string;
  typeLabels: Record<RepSchemeInfo['type'], string>;
}> = {
  en: {
    hockeyTemplates: 'Hockey templates',
    chooseFormat: 'Choose Format',
    workoutDetails: 'Workout Details',
    name: 'Name *',
    namePlaceholder: 'e.g. Fran, Murph, Custom WOD',
    scalingLevel: 'Scaling Level',
    rx: 'Rx (prescribed)',
    scaled: 'Scaled',
    foundations: 'Foundations (beginner)',
    description: 'Description',
    descriptionPlaceholder: 'Describe the workout...',
    totalTimeMinutes: 'Total Time (minutes)',
    timeCapSeconds: 'Time Cap (seconds)',
    totalRounds: 'Total Rounds',
    workTimeSeconds: 'Work time (seconds)',
    restTimeSeconds: 'Rest time (seconds)',
    repScheme: 'Rep scheme',
    customRepSchemePlaceholder: 'Or enter a custom scheme...',
    rounds: 'rounds',
    reps: 'reps',
    total: 'Total',
    repsPerExercise: 'reps/exercise',
    sameRepsHint: 'rounds with the same reps - enter reps per exercise in step 3',
    content: 'Workout Content',
    contentDescription: 'Add sections for this workout. Metcon is required, the others are optional.',
    warmup: 'Warm-up',
    strength: 'Strength',
    cooldown: 'Cool-down',
    exercises: 'exercises',
    gym: 'Gym:',
    allEquipment: 'All equipment',
    available: 'available',
    required: 'Required',
    movements: 'movements',
    sameRepsPerRound: 'rounds with the same reps per round',
    block: 'Block',
    newBlock: 'New block',
    blockName: 'Block name',
    duplicateBlock: 'Duplicate block',
    removeBlock: 'Remove block',
    format: 'Format',
    intervals: 'Intervals',
    custom: 'Custom',
    startEverySeconds: 'Start every (s)',
    restBetween: 'Rest between',
    addRestAfterBlock: 'Add rest after block',
    noRest: 'No rest',
    add: 'Add',
    blockNotesPlaceholder: 'Block notes, tempo, or coach cues...',
    searchMovements: 'Search movements...',
    noMovementsFound: 'No movements found.',
    addMovementsFor: 'Add movements for',
    cancel: 'Cancel',
    back: 'Back',
    print: 'Print',
    next: 'Next',
    saving: 'Saving...',
    saveWorkout: 'Save Workout',
    repsPlaceholder: 'Count',
    distanceMeters: 'Distance (m)',
    maleWeightKg: 'Weight Men (kg)',
    femaleWeightKg: 'Weight Women (kg)',
    count: 'Count',
    typeLabels: {
      descending: 'descending',
      ascending: 'ascending',
      variable: 'variable',
      fixed: 'fixed',
    },
  },
  sv: {
    hockeyTemplates: 'Hockeymallar',
    chooseFormat: 'Välj Format',
    workoutDetails: 'Passets Detaljer',
    name: 'Namn *',
    namePlaceholder: 't.ex. Fran, Murph, Custom WOD',
    scalingLevel: 'Scaling Level',
    rx: 'Rx (Förskriven)',
    scaled: 'Scaled (Anpassad)',
    foundations: 'Foundations (Nybörjare)',
    description: 'Beskrivning',
    descriptionPlaceholder: 'Beskriv passet...',
    totalTimeMinutes: 'Total Tid (minuter)',
    timeCapSeconds: 'Time Cap (sekunder)',
    totalRounds: 'Antal Rundor',
    workTimeSeconds: 'Arbetstid (sekunder)',
    restTimeSeconds: 'Vilotid (sekunder)',
    repScheme: 'Rep-schema',
    customRepSchemePlaceholder: 'Eller skriv eget schema...',
    rounds: 'rundor',
    reps: 'reps',
    total: 'Totalt',
    repsPerExercise: 'reps/övning',
    sameRepsHint: 'rundor med samma reps - ange antal reps per övning i steg 3',
    content: 'Passinnehåll',
    contentDescription: 'Lägg till sektioner för ditt pass. Metcon är obligatoriskt, övriga är valfria.',
    warmup: 'Uppvärmning',
    strength: 'Styrka',
    cooldown: 'Nedvarvning',
    exercises: 'övningar',
    gym: 'Gym:',
    allEquipment: 'All utrustning',
    available: 'tillgängliga',
    required: 'Obligatorisk',
    movements: 'rörelser',
    sameRepsPerRound: 'rundor med samma reps per runda',
    block: 'Block',
    newBlock: 'Nytt block',
    blockName: 'Blocknamn',
    duplicateBlock: 'Duplicera block',
    removeBlock: 'Ta bort block',
    format: 'Format',
    intervals: 'Intervaller',
    custom: 'Anpassad',
    startEverySeconds: 'Start var (s)',
    restBetween: 'Vila mellan',
    addRestAfterBlock: 'Lägg till vila efter blocket',
    noRest: 'Ingen vila',
    add: 'Lägg till',
    blockNotesPlaceholder: 'Blockanteckningar, tempo eller coach cues...',
    searchMovements: 'Sök rörelser...',
    noMovementsFound: 'Inga rörelser hittades.',
    addMovementsFor: 'Lägg till rörelser för',
    cancel: 'Avbryt',
    back: 'Tillbaka',
    print: 'Skriv ut',
    next: 'Nästa',
    saving: 'Sparar...',
    saveWorkout: 'Spara Pass',
    repsPlaceholder: 'Antal',
    distanceMeters: 'Distans (m)',
    maleWeightKg: 'Vikt Herr (kg)',
    femaleWeightKg: 'Vikt Dam (kg)',
    count: 'Antal',
    typeLabels: {
      descending: 'fallande',
      ascending: 'stigande',
      variable: 'varierande',
      fixed: 'fasta',
    },
  },
};

// Parse rep schemes to extract round info and per-round reps
export interface RepSchemeInfo {
  rounds: number;
  repsPerRound: number[];
  type: 'descending' | 'ascending' | 'fixed' | 'variable';
  totalReps: number;
}

export function parseRepScheme(scheme: string): RepSchemeInfo | null {
  if (!scheme) return null;

  // Handle "X rounds" or "X rundor" patterns (English and Swedish)
  const roundsMatch = scheme.match(/^(\d+)\s*(rounds?|rundor)$/i);
  if (roundsMatch) {
    return {
      rounds: parseInt(roundsMatch[1]),
      repsPerRound: [],
      type: 'fixed',
      totalReps: 0
    };
  }

  // Handle descending/ascending patterns like "21-15-9" or "10-9-8-7-6-5-4-3-2-1"
  const parts = scheme.split('-').map(p => parseInt(p.trim()));
  if (parts.length > 1 && parts.every(p => !isNaN(p))) {
    const totalReps = parts.reduce((sum, n) => sum + n, 0);

    // Determine if ascending or descending
    let type: 'descending' | 'ascending' | 'variable' = 'variable';
    if (parts.length >= 2) {
      const isDescending = parts.every((val, i) => i === 0 || val <= parts[i - 1]);
      const isAscending = parts.every((val, i) => i === 0 || val >= parts[i - 1]);
      if (isDescending && parts[0] > parts[parts.length - 1]) {
        type = 'descending';
      } else if (isAscending && parts[0] < parts[parts.length - 1]) {
        type = 'ascending';
      }
    }

    return { rounds: parts.length, repsPerRound: parts, type, totalReps };
  }

  return null;
}

export function createTempId(prefix = 'temp') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatSecondsLabel(seconds?: number) {
  if (!seconds) return '';
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes > 0 && remainder > 0) {
    return `${minutes}:${remainder.toString().padStart(2, '0')}`;
  }
  if (minutes > 0) return `${minutes}:00`;
  return `${seconds}s`;
}

export function getExerciseDisplayName(exercise: Exercise, locale: AppLocale) {
  return locale === 'sv'
    ? exercise.nameSv || exercise.name || exercise.nameEn || 'Övning'
    : exercise.nameEn || exercise.name || exercise.nameSv || 'Exercise';
}

export function movementToMetconPayload(movement: WorkoutMovement, order: number, locale: AppLocale) {
  return {
    id: movement.id,
    exerciseId: movement.exerciseId,
    exerciseName: getExerciseDisplayName(movement.exercise, locale),
    order,
    reps: movement.reps,
    calories: movement.calories,
    distance: movement.distance,
    duration: movement.duration,
    weightMale: movement.weightMale,
    weightFemale: movement.weightFemale,
    notes: movement.notes,
  };
}

export function createMovementFromExercise(exercise: Exercise, order: number): WorkoutMovement {
  return {
    id: createTempId('movement'),
    exerciseId: exercise.id,
    exercise,
    order,
    reps: exercise.defaultReps,
    weightMale: exercise.defaultWeightMale,
    weightFemale: exercise.defaultWeightFemale,
  };
}

export function normalizeMovementName(value: string) {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function findExerciseForHockeyMovement(exercises: Exercise[], exerciseName: string) {
  const normalized = normalizeMovementName(exerciseName)
  const aliases: Record<string, string[]> = {
    'farmer carry': ['farmers carry', 'farmers walk'],
    'farmers carry': ['farmers carry', 'farmers walk'],
    'sandbag bear hug carry': ['sandbag carry'],
    'lateral bound': ['lateral bounds'],
    'skierg': ['skierg', 'skierg meters', 'skierg calories'],
  }
  const targets = new Set([normalized, ...(aliases[normalized] || [])])

  return exercises.find((exercise) => {
    const names = [
      exercise.name,
      exercise.nameSv,
      exercise.standardAbbreviation,
    ]
      .filter((name): name is string => Boolean(name))
      .map(normalizeMovementName)

    return names.some((name) => targets.has(name) || name.includes(normalized) || normalized.includes(name))
  })
}

export function metconBlockFormatForPreset(format: HockeyHybridPreset['format']): MetconBlock['format'] {
  if (format === 'EMOM' || format === 'AMRAP' || format === 'FOR_TIME' || format === 'INTERVALS') {
    return format
  }
  return 'CUSTOM'
}

export function buildInitialMetconBlocks(
  initialData?: HybridWorkoutBuilderInitialData
): MetconBlock[] {
  const movementLookup = new Map(
    (initialData?.movements || []).map((movement) => [movement.exerciseId, movement])
  );

  if (initialData?.metconData?.blocks?.length) {
    return initialData.metconData.blocks.map((block, blockIndex) => ({
      id: block.id || createTempId('block'),
      title: block.title || `Block ${blockIndex + 1}`,
      format: block.format || 'EMOM',
      intervalSeconds: block.intervalSeconds,
      rounds: block.rounds,
      workSeconds: block.workSeconds,
      restSeconds: block.restSeconds,
      restAfterSeconds: block.restAfterSeconds,
      notes: block.notes,
      movements: block.movements.map((movement, movementIndex) => {
        const hydrated = movementLookup.get(movement.exerciseId);
        if (hydrated) {
          return {
            ...hydrated,
            id: movement.id || hydrated.id || createTempId('movement'),
            order: movementIndex + 1,
            reps: movement.reps,
            calories: movement.calories,
            distance: movement.distance,
            duration: movement.duration,
            weightMale: movement.weightMale,
            weightFemale: movement.weightFemale,
            notes: movement.notes,
          };
        }

        return {
          id: movement.id || createTempId('movement'),
          exerciseId: movement.exerciseId,
          exercise: {
            id: movement.exerciseId,
            name: movement.exerciseName,
            equipmentTypes: [],
          },
          order: movementIndex + 1,
          reps: movement.reps,
          calories: movement.calories,
          distance: movement.distance,
          duration: movement.duration,
          weightMale: movement.weightMale,
          weightFemale: movement.weightFemale,
          notes: movement.notes,
        };
      }),
    }));
  }

  return [
    {
      id: createTempId('block'),
      title: 'Block 1',
      format: (initialData?.format === 'EMOM' ? 'EMOM' : 'CUSTOM'),
      intervalSeconds:
        initialData?.format === 'EMOM'
          ? (initialData.workTime || DEFAULT_EMOM_INTERVAL_SECONDS) + (initialData.restTime || 0)
          : undefined,
      rounds: initialData?.totalRounds,
      restAfterSeconds: undefined,
      movements: initialData?.movements || [],
    },
  ];
}

// Sortable movement card component
export interface SortableMovementCardProps {
  movement: WorkoutMovement;
  index: number;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<WorkoutMovement>) => void;
  repSchemeInfo?: RepSchemeInfo | null;
  locale: AppLocale;
  copy: (typeof COPY)[AppLocale];
}

export function SortableMovementCard({
  movement,
  index,
  onRemove,
  onUpdate,
  repSchemeInfo,
  locale,
  copy,
}: SortableMovementCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: movement.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <Card ref={setNodeRef} style={style} className={`p-4 ${isDragging ? 'shadow-lg ring-2 ring-primary' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-1">
          <button
            className="touch-none cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </button>
          <span className="text-xs text-muted-foreground">{index + 1}</span>
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">
                {getExerciseDisplayName(movement.exercise, locale)}
              </span>
              {movement.exercise.standardAbbreviation && (
                <span className="text-muted-foreground ml-2 text-sm">
                  ({movement.exercise.standardAbbreviation})
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemove(movement.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs">Reps</Label>
              {repSchemeInfo && repSchemeInfo.repsPerRound.length > 0 ? (
                <div className="h-10 px-3 py-2 border rounded-md bg-muted/50 text-sm">
                  {repSchemeInfo.repsPerRound.join('-')}
                </div>
              ) : (
                <Input
                  type="number"
                  value={movement.reps || ''}
                  onChange={(e) =>
                    onUpdate(movement.id, {
                      reps: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  placeholder={copy.count}
                />
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{copy.distanceMeters}</Label>
              <Input
                type="number"
                value={movement.distance || ''}
                onChange={(e) =>
                  onUpdate(movement.id, {
                    distance: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                placeholder="Meter"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{copy.maleWeightKg}</Label>
              <Input
                type="number"
                value={movement.weightMale || ''}
                onChange={(e) =>
                  onUpdate(movement.id, {
                    weightMale: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                placeholder="kg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{copy.femaleWeightKg}</Label>
              <Input
                type="number"
                value={movement.weightFemale || ''}
                onChange={(e) =>
                  onUpdate(movement.id, {
                    weightFemale: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                placeholder="kg"
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

