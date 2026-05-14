'use client';

/**
 * Hybrid Workout Builder Component
 *
 * A multi-step form for creating hybrid workouts with:
 * - Format selection
 * - Time/round configuration
 * - Sections: Warmup, Strength, Metcon, Cooldown
 * - Movement selection with drag-and-drop
 * - Weight/rep configuration per movement
 */

import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Timer,
  Repeat,
  Dumbbell,
  Trophy,
  Zap,
  Clock,
  Target,
  Activity,
  MapPin,
  Copy,
} from 'lucide-react';
import { SectionEditor } from './SectionEditor';
import type { HybridMetconData, HybridSectionData } from '@/types';
import { PrintWorkoutButton } from '@/components/workouts/print/PrintWorkoutButton';

interface Exercise {
  id: string;
  name: string;
  nameSv?: string;
  standardAbbreviation?: string;
  movementCategory?: string;
  equipmentTypes: string[];
  defaultReps?: number;
  defaultWeightMale?: number;
  defaultWeightFemale?: number;
}

interface WorkoutMovement {
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

interface MetconBlock {
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
  movements?: WorkoutMovement[];
  tags?: string[];
  // Section data
  warmupData?: HybridSectionData;
  strengthData?: HybridSectionData;
  metconData?: HybridMetconData;
  cooldownData?: HybridSectionData;
}

interface HybridWorkoutBuilderProps {
  onSave: (workoutId?: string) => void;
  onCancel: () => void;
  initialData?: HybridWorkoutBuilderInitialData;
}

const formatOptions = [
  { value: 'EMOM', label: 'EMOM', labelSv: 'EMOM', icon: Clock, description: 'Varje minut på minuten' },
  { value: 'AMRAP', label: 'AMRAP', labelSv: 'AMRAP', icon: Repeat, description: 'Så många rundor som möjligt på given tid' },
  { value: 'FOR_TIME', label: 'For Time', labelSv: 'På Tid', icon: Timer, description: 'Slutför arbetet så snabbt som möjligt' },
  { value: 'TABATA', label: 'Tabata', labelSv: 'Tabata', icon: Zap, description: '20s arbete / 10s vila × 8 rundor' },
  { value: 'CHIPPER', label: 'Chipper', labelSv: 'Chipper', icon: Target, description: 'Lång sekvens av rörelser, en gång' },
  { value: 'LADDER', label: 'Ladder', labelSv: 'Stege', icon: Dumbbell, description: 'Stigande/fallande rep-schema' },
  { value: 'INTERVALS', label: 'Intervals', labelSv: 'Intervaller', icon: Zap, description: 'Arbete/vila intervaller' },
  { value: 'HYROX_SIM', label: 'HYROX Sim', labelSv: 'HYROX Sim', icon: Trophy, description: 'HYROX-simulering (löpning + stationer)' },
];

const DEFAULT_EMOM_INTERVAL_SECONDS = 60;
const DEFAULT_EMOM_ROUNDS = 10;

const equipmentTypeAliases: Record<string, string[]> = {
  machine_ski: ['skierg', 'ski_erg', 'concept2_skierg'],
  machine_row: ['rowing', 'rower', 'row_intervals', 'row_steady_state', 'concept2_row'],
  machine_bike: ['bikeerg', 'cycling_intervals', 'cycling_steady_state', 'wattbike'],
  assault_bike: ['assault_bike', 'airbike_intervals', 'airbike_steady_state', 'echo_bike'],
  running: ['treadmill_run', 'curved_treadmill_run', 'treadmill_walk', 'incline_walking'],
};

function expandEquipmentTypes(types: string[]) {
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

const categoryLabels: Record<string, string> = {
  OLYMPIC_LIFT: 'Tyngdlyftning',
  POWERLIFTING: 'Styrkelyft',
  GYMNASTICS: 'Gymnastik',
  MONOSTRUCTURAL: 'Kondition',
  KETTLEBELL_WORK: 'Kettlebell',
  STRONGMAN: 'Strongman',
  CORE_WORK: 'Core',
  ACCESSORY: 'Tillbehör',
  HYROX_STATION: 'HYROX',
};

// Parse rep schemes to extract round info and per-round reps
interface RepSchemeInfo {
  rounds: number;
  repsPerRound: number[];
  type: 'descending' | 'ascending' | 'fixed' | 'variable';
  totalReps: number;
}

function parseRepScheme(scheme: string): RepSchemeInfo | null {
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

function createTempId(prefix = 'temp') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatSecondsLabel(seconds?: number) {
  if (!seconds) return '';
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes > 0 && remainder > 0) {
    return `${minutes}:${remainder.toString().padStart(2, '0')}`;
  }
  if (minutes > 0) return `${minutes}:00`;
  return `${seconds}s`;
}

function movementToMetconPayload(movement: WorkoutMovement, order: number) {
  return {
    id: movement.id,
    exerciseId: movement.exerciseId,
    exerciseName: movement.exercise.nameSv || movement.exercise.name,
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

function createMovementFromExercise(exercise: Exercise, order: number): WorkoutMovement {
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

function buildInitialMetconBlocks(
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
interface SortableMovementCardProps {
  movement: WorkoutMovement;
  index: number;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<WorkoutMovement>) => void;
  repSchemeInfo?: RepSchemeInfo | null;
}

function SortableMovementCard({ movement, index, onRemove, onUpdate, repSchemeInfo }: SortableMovementCardProps) {
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
                {movement.exercise.nameSv || movement.exercise.name}
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
                  placeholder="Antal"
                />
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Distans (m)</Label>
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
              <Label className="text-xs">Vikt Herr (kg)</Label>
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
              <Label className="text-xs">Vikt Dam (kg)</Label>
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

export function HybridWorkoutBuilder({ onSave, onCancel, initialData }: HybridWorkoutBuilderProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [format, setFormat] = useState(initialData?.format || '');
  const [timeCap, setTimeCap] = useState<number | undefined>(initialData?.timeCap);
  const [totalMinutes, setTotalMinutes] = useState<number | undefined>(initialData?.totalMinutes);
  const [totalRounds, setTotalRounds] = useState<number | undefined>(initialData?.totalRounds);
  const [workTime, setWorkTime] = useState<number | undefined>(initialData?.workTime);
  const [restTime, setRestTime] = useState<number | undefined>(initialData?.restTime);
  const [repScheme, setRepScheme] = useState(initialData?.repScheme || '');
  const [scalingLevel, setScalingLevel] = useState(initialData?.scalingLevel || 'RX');
  const [metconBlocks, setMetconBlocks] = useState<MetconBlock[]>(() =>
    buildInitialMetconBlocks(initialData)
  );
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);

  // Section data
  const [warmupData, setWarmupData] = useState<HybridSectionData | undefined>(initialData?.warmupData);
  const [strengthData, setStrengthData] = useState<HybridSectionData | undefined>(initialData?.strengthData);
  const [cooldownData, setCooldownData] = useState<HybridSectionData | undefined>(initialData?.cooldownData);

  // Section visibility toggles
  const [showWarmup, setShowWarmup] = useState(!!initialData?.warmupData);
  const [showStrength, setShowStrength] = useState(!!initialData?.strengthData);
  const [showCooldown, setShowCooldown] = useState(!!initialData?.cooldownData);

  // Section open/closed state
  const [warmupOpen, setWarmupOpen] = useState(false);
  const [strengthOpen, setStrengthOpen] = useState(false);
  const [cooldownOpen, setCooldownOpen] = useState(false);

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [exercisePopoverOpen, setExercisePopoverOpen] = useState(false);
  const [exercisePickerBlockId, setExercisePickerBlockId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Equipment filter
  const [locations, setLocations] = useState<{ id: string; name: string; city: string | null }[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('ALL');
  const [locationEquipmentTypes, setLocationEquipmentTypes] = useState<string[]>([]);

  // DnD Kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const metconMovements = metconBlocks.flatMap((block) => block.movements);

  function handleBlockDragEnd(blockId: string, event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setMetconBlocks((blocks) => blocks.map((block) => {
        if (block.id !== blockId) return block;
        const items = block.movements;
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        // Update order numbers
        return {
          ...block,
          movements: newItems.map((item, index) => ({ ...item, order: index + 1 })),
        };
      }));
    }
  }

  useEffect(() => {
    fetchExercises();
  }, []);

  // Fetch locations
  useEffect(() => {
    async function fetchLocations() {
      try {
        const res = await fetch('/api/locations');
        if (res.ok) {
          const data = await res.json();
          const locs = Array.isArray(data) ? data : (data.locations || []);
          setLocations(locs.map((l: any) => ({ id: l.id, name: l.name, city: l.city })));
        }
      } catch {
        // Locations not available
      }
    }
    fetchLocations();
  }, []);

  // Fetch equipment when location changes
  useEffect(() => {
    if (selectedLocationId === 'ALL') {
      setLocationEquipmentTypes([]);
      return;
    }
    async function fetchEquipment() {
      try {
        const res = await fetch(`/api/locations/${selectedLocationId}/equipment`);
        if (res.ok) {
          const data = await res.json();
          const equipment = data.equipment || [];
          // Collect all enablesExercises types from equipment
          const types = equipment.flatMap((e: any) => e.enablesExercises || []);
          setLocationEquipmentTypes([...new Set(types)] as string[]);
        }
      } catch {
        setLocationEquipmentTypes([]);
      }
    }
    fetchEquipment();
  }, [selectedLocationId]);

  async function fetchExercises() {
    try {
      const response = await fetch('/api/hybrid-movements?limit=1000');
      if (response.ok) {
        const data = await response.json();
        setExercises(data.movements || []);
      } else {
        console.error('Failed to fetch exercises, status:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch exercises:', error);
    }
  }

  function addMetconBlock() {
    const blockNumber = metconBlocks.length + 1;
    setMetconBlocks((blocks) => [
      ...blocks,
      {
        id: createTempId('block'),
        title: `Block ${blockNumber}`,
        format: format === 'EMOM' ? 'EMOM' : 'CUSTOM',
        intervalSeconds: format === 'EMOM' ? DEFAULT_EMOM_INTERVAL_SECONDS : undefined,
        rounds: format === 'EMOM' ? DEFAULT_EMOM_ROUNDS : undefined,
        movements: [],
      },
    ]);
  }

  function duplicateMetconBlock(blockId: string) {
    const source = metconBlocks.find((block) => block.id === blockId);
    if (!source) return;

    setMetconBlocks((blocks) => [
      ...blocks,
      {
        ...source,
        id: createTempId('block'),
        title: `${source.title} kopia`,
        movements: source.movements.map((movement, index) => ({
          ...movement,
          id: createTempId('movement'),
          order: index + 1,
        })),
      },
    ]);
  }

  function removeMetconBlock(blockId: string) {
    setMetconBlocks((blocks) => {
      if (blocks.length === 1) return blocks;
      return blocks.filter((block) => block.id !== blockId);
    });
  }

  function updateMetconBlock(blockId: string, updates: Partial<MetconBlock>) {
    setMetconBlocks((blocks) =>
      blocks.map((block) => (block.id === blockId ? { ...block, ...updates } : block))
    );
  }

  function addMovement(exercise: Exercise) {
    const targetBlockId = exercisePickerBlockId || metconBlocks[0]?.id;
    if (!targetBlockId) return;

    setMetconBlocks((blocks) =>
      blocks.map((block) => {
        if (block.id !== targetBlockId) return block;
        return {
          ...block,
          movements: [
            ...block.movements,
            createMovementFromExercise(exercise, block.movements.length + 1),
          ],
        };
      })
    );
    setExercisePopoverOpen(false);
    setExercisePickerBlockId(null);
    setExerciseSearch('');
  }

  function removeMovement(id: string) {
    setMetconBlocks((blocks) =>
      blocks.map((block) => ({
        ...block,
        movements: block.movements
          .filter((movement) => movement.id !== id)
          .map((movement, index) => ({ ...movement, order: index + 1 })),
      }))
    );
  }

  function updateMovement(id: string, updates: Partial<WorkoutMovement>) {
    setMetconBlocks((blocks) =>
      blocks.map((block) => ({
        ...block,
        movements: block.movements.map((movement) =>
          movement.id === id ? { ...movement, ...updates } : movement
        ),
      }))
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const flatMovements = metconBlocks.flatMap((block) => block.movements);
      const emomBlocks = metconBlocks.filter((block) => block.format === 'EMOM');
      const primaryEmomBlock = emomBlocks[0];
      const derivedIntervalSeconds = primaryEmomBlock?.intervalSeconds || workTime;
      const derivedRounds =
        format === 'EMOM' && emomBlocks.length > 0
          ? emomBlocks.reduce((sum, block) => sum + (block.rounds || 0), 0) || totalRounds
          : totalRounds;
      const derivedTotalMinutes =
        format === 'EMOM' && emomBlocks.length > 0
          ? Math.ceil(
              emomBlocks.reduce(
                (sum, block) =>
                  sum + (block.rounds || 0) * (block.intervalSeconds || derivedIntervalSeconds || 60) +
                  (block.restAfterSeconds || 0),
                0
              ) / 60
            )
          : totalMinutes;
      const metconData = {
        blocks: metconBlocks.map((block) => ({
          id: block.id,
          title: block.title,
          format: block.format,
          intervalSeconds: block.intervalSeconds,
          rounds: block.rounds,
          workSeconds: block.workSeconds,
          restSeconds: block.restSeconds,
          restAfterSeconds: block.restAfterSeconds,
          notes: block.notes,
          movements: block.movements.map((movement, index) =>
            movementToMetconPayload(movement, index + 1)
          ),
        })),
      };

      const payload = {
        name,
        description,
        format,
        timeCap,
        totalMinutes: derivedTotalMinutes,
        totalRounds: derivedRounds,
        workTime: format === 'EMOM' ? derivedIntervalSeconds : workTime,
        restTime: format === 'EMOM' ? 0 : restTime,
        repScheme,
        scalingLevel,
        tags,
        movements: flatMovements.map((m, index) => ({
          exerciseId: m.exerciseId,
          order: index + 1,
          reps: m.reps,
          calories: m.calories,
          distance: m.distance,
          duration: m.duration,
          weightMale: m.weightMale,
          weightFemale: m.weightFemale,
          notes: m.notes,
        })),
        // Section data - only include if section is enabled
        warmupData: showWarmup ? warmupData : null,
        strengthData: showStrength ? strengthData : null,
        metconData,
        cooldownData: showCooldown ? cooldownData : null,
      };

      const method = initialData?.id ? 'PUT' : 'POST';
      const url = initialData?.id
        ? `/api/hybrid-workouts/${initialData.id}`
        : '/api/hybrid-workouts';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        onSave(result.id || initialData?.id);
      } else {
        console.error('Failed to save workout');
      }
    } catch (error) {
      console.error('Failed to save workout:', error);
    } finally {
      setSaving(false);
    }
  }

  const searchFilteredExercises = exercises.filter(
    (e) =>
      e.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
      e.nameSv?.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
      e.standardAbbreviation?.toLowerCase().includes(exerciseSearch.toLowerCase())
  );

  // Apply equipment filter
  const filteredExercises = selectedLocationId !== 'ALL' && locationEquipmentTypes.length > 0
    ? searchFilteredExercises.filter(ex => {
        if (!ex.equipmentTypes || ex.equipmentTypes.length === 0) return true
        if (ex.equipmentTypes.some(t => ['BODYWEIGHT', 'RUNNING'].includes(t.toUpperCase()))) return true
        const normalizedTypes = expandEquipmentTypes(locationEquipmentTypes)
        return ex.equipmentTypes.some(t => normalizedTypes.has(t.toLowerCase()))
      })
    : searchFilteredExercises;

  // Group exercises by category
  const groupedExercises = filteredExercises.reduce(
    (acc, exercise) => {
      const cat = exercise.movementCategory || 'OTHER';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(exercise);
      return acc;
    },
    {} as Record<string, Exercise[]>
  );


  const canProceedStep1 = format !== '';
  const canProceedStep2 = name.trim() !== '';
  const canSave = metconMovements.length > 0;

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`flex items-center ${s < 3 ? 'gap-2' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                s === step
                  ? 'bg-primary text-primary-foreground'
                  : s < step
                    ? 'bg-green-500 text-white'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {s}
            </div>
            {s < 3 && <div className="w-12 h-0.5 bg-muted" />}
          </div>
        ))}
      </div>

      {/* Step 1: Format Selection */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Välj Format</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {formatOptions.map((option) => (
              <Card
                key={option.value}
                className={`cursor-pointer transition-all ${
                  format === option.value
                    ? 'border-primary ring-2 ring-primary'
                    : 'hover:border-primary/50'
                }`}
                onClick={() => {
                  setFormat(option.value);
                  if (option.value === 'EMOM') {
                    setWorkTime((current) => current || DEFAULT_EMOM_INTERVAL_SECONDS);
                    setTotalRounds((current) => current || DEFAULT_EMOM_ROUNDS);
                    setMetconBlocks((blocks) =>
                      blocks.map((block, index) =>
                        index === 0
                          ? {
                              ...block,
                              format: 'EMOM',
                              intervalSeconds: block.intervalSeconds || DEFAULT_EMOM_INTERVAL_SECONDS,
                              rounds: block.rounds || DEFAULT_EMOM_ROUNDS,
                            }
                          : block
                      )
                    );
                  }
                  setStep(2); // Auto-advance to step 2
                }}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <option.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">{option.labelSv}</h4>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Workout Details */}
      {step === 2 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Passets Detaljer</h3>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Namn *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="t.ex. Fran, Murph, Custom WOD"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scaling">Scaling Level</Label>
              <Select value={scalingLevel} onValueChange={setScalingLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RX">Rx (Förskriven)</SelectItem>
                  <SelectItem value="SCALED">Scaled (Anpassad)</SelectItem>
                  <SelectItem value="FOUNDATIONS">Foundations (Nybörjare)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beskrivning</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beskriv passet..."
              rows={3}
            />
          </div>

          {/* Format-specific fields */}
          {format === 'AMRAP' && (
            <div className="space-y-2">
              <Label htmlFor="totalMinutes">Total Tid (minuter)</Label>
              <Input
                id="totalMinutes"
                type="number"
                value={totalMinutes || ''}
                onChange={(e) => setTotalMinutes(e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="t.ex. 20"
              />
            </div>
          )}

          {format === 'FOR_TIME' && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="timeCap">Time Cap (sekunder)</Label>
                <Input
                  id="timeCap"
                  type="number"
                  value={timeCap || ''}
                  onChange={(e) => setTimeCap(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="t.ex. 1200 (20 min)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalRounds">Antal Rundor</Label>
                <Input
                  id="totalRounds"
                  type="number"
                  value={totalRounds || ''}
                  onChange={(e) => setTotalRounds(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="t.ex. 3"
                />
              </div>
            </div>
          )}

          {(format === 'TABATA' || format === 'INTERVALS') && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="workTime">Arbetstid (sekunder)</Label>
                <Input
                  id="workTime"
                  type="number"
                  value={workTime || ''}
                  onChange={(e) => setWorkTime(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="t.ex. 20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="restTime">Vilotid (sekunder)</Label>
                <Input
                  id="restTime"
                  type="number"
                  value={restTime || ''}
                  onChange={(e) => setRestTime(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="t.ex. 10"
                />
              </div>
            </div>
          )}

          {(format === 'FOR_TIME' || format === 'CHIPPER' || format === 'LADDER') && (
            <div className="space-y-3">
              <Label>Rep-schema</Label>
              {/* Preset buttons */}
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '21-15-9', value: '21-15-9' },
                  { label: '15-12-9', value: '15-12-9' },
                  { label: '10-9-8-7-6-5-4-3-2-1', value: '10-9-8-7-6-5-4-3-2-1' },
                  { label: '50-40-30-20-10', value: '50-40-30-20-10' },
                  { label: '1-2-3-4-5-6-7-8-9-10', value: '1-2-3-4-5-6-7-8-9-10' },
                  { label: '5 Rundor', value: '5 rounds' },
                  { label: '3 Rundor', value: '3 rounds' },
                  { label: '7 Rundor', value: '7 rounds' },
                  { label: '10 Rundor', value: '10 rounds' },
                ].map((preset) => (
                  <Button
                    key={preset.value}
                    type="button"
                    variant={repScheme === preset.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setRepScheme(preset.value);
                      // Auto-set totalRounds based on scheme
                      const parsed = parseRepScheme(preset.value);
                      if (parsed) {
                        setTotalRounds(parsed.rounds);
                      }
                    }}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              <Input
                id="repScheme"
                value={repScheme}
                onChange={(e) => {
                  const value = e.target.value;
                  setRepScheme(value);
                  // Auto-set totalRounds based on custom scheme
                  const parsed = parseRepScheme(value);
                  if (parsed) {
                    setTotalRounds(parsed.rounds);
                  }
                }}
                placeholder="Eller skriv eget schema..."
              />
              {/* Show rep scheme explanation */}
              {(() => {
                const parsed = parseRepScheme(repScheme);
                if (!parsed) return null;

                const typeLabels = {
                  descending: 'fallande',
                  ascending: 'stigande',
                  variable: 'varierande',
                  fixed: 'fasta'
                };

                return (
                  <div className="p-3 bg-muted/50 rounded-lg text-sm">
                    {parsed.repsPerRound.length > 0 ? (
                      <div className="space-y-2">
                        <p className="font-medium">
                          {parsed.rounds} rundor ({typeLabels[parsed.type]} reps) • Totalt: {parsed.totalReps} reps/övning
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {parsed.repsPerRound.map((reps, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-xs font-medium"
                            >
                              {reps}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p>{parsed.rounds} rundor med samma reps - ange antal reps per övning i steg 3</p>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Sections & Movements */}
      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Passinnehåll</h3>
          <p className="text-sm text-muted-foreground">
            Lägg till sektioner för ditt pass. Metcon är obligatoriskt, övriga är valfria.
          </p>

          {/* WARMUP SECTION */}
          <Card className={`overflow-hidden ${showWarmup ? 'border-orange-500/50' : ''}`}>
            <Collapsible open={showWarmup && warmupOpen} onOpenChange={setWarmupOpen}>
              <div className="flex items-center justify-between p-3 bg-muted/30">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="warmup-toggle"
                    checked={showWarmup}
                    onChange={(e) => {
                      setShowWarmup(e.target.checked);
                      if (e.target.checked) setWarmupOpen(true);
                      if (!e.target.checked) setWarmupData(undefined);
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Activity className="h-4 w-4 text-orange-500" />
                  <Label htmlFor="warmup-toggle" className="font-medium cursor-pointer">
                    Uppvärmning
                  </Label>
                  {warmupData?.duration && (
                    <Badge variant="outline" className="text-xs">
                      ~{Math.ceil(warmupData.duration / 60)} min
                    </Badge>
                  )}
                </div>
                {showWarmup && (
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <ChevronDown className={`h-4 w-4 transition-transform ${warmupOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                )}
              </div>
              <CollapsibleContent>
                <CardContent className="pt-4">
                  <SectionEditor
                    sectionType="WARMUP"
                    data={warmupData}
                    onChange={setWarmupData}
                    exercises={exercises}
                  />
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* STRENGTH SECTION */}
          <Card className={`overflow-hidden ${showStrength ? 'border-red-500/50' : ''}`}>
            <Collapsible open={showStrength && strengthOpen} onOpenChange={setStrengthOpen}>
              <div className="flex items-center justify-between p-3 bg-muted/30">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="strength-toggle"
                    checked={showStrength}
                    onChange={(e) => {
                      setShowStrength(e.target.checked);
                      if (e.target.checked) setStrengthOpen(true);
                      if (!e.target.checked) setStrengthData(undefined);
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Dumbbell className="h-4 w-4 text-red-500" />
                  <Label htmlFor="strength-toggle" className="font-medium cursor-pointer">
                    Styrka
                  </Label>
                  {strengthData?.movements && strengthData.movements.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {strengthData.movements.length} övningar
                    </Badge>
                  )}
                </div>
                {showStrength && (
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <ChevronDown className={`h-4 w-4 transition-transform ${strengthOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                )}
              </div>
              <CollapsibleContent>
                <CardContent className="pt-4">
                  <SectionEditor
                    sectionType="STRENGTH"
                    data={strengthData}
                    onChange={setStrengthData}
                    exercises={exercises}
                  />
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Equipment filter by location */}
          {locations.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>Gym:</span>
              </div>
              <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="All equipment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All utrustning</SelectItem>
                  {locations.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}{loc.city ? ` (${loc.city})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedLocationId !== 'ALL' && (
                <Badge variant="secondary" className="text-xs">
                  {filteredExercises.length} av {searchFilteredExercises.length} tillgängliga
                </Badge>
              )}
            </div>
          )}

          {/* METCON SECTION - Always visible, required */}
          <Card className="border-primary/50 overflow-hidden">
            <div className="p-3 bg-primary/10">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="font-medium">Metcon</span>
                <Badge variant="secondary" className="text-xs">Obligatorisk</Badge>
                <Badge variant="outline" className="text-xs">
                  {metconBlocks.length} block
                </Badge>
                {repScheme && (
                  <Badge variant="outline" className="text-xs">
                    {repScheme}
                  </Badge>
                )}
                {metconMovements.length > 0 && (
                  <Badge variant="outline" className="text-xs ml-auto">
                    {metconMovements.length} rörelser
                  </Badge>
                )}
              </div>
              {(() => {
                const parsed = parseRepScheme(repScheme);
                if (!parsed) return null;
                if (parsed.repsPerRound.length > 0) {
                  return (
                    <p className="text-xs text-muted-foreground mt-2">
                      {parsed.rounds} rundor: {parsed.repsPerRound.join(' → ')} reps • Totalt {parsed.totalReps} reps/övning
                    </p>
                  );
                }
                return (
                  <p className="text-xs text-muted-foreground mt-2">
                    {parsed.rounds} rundor med samma reps per runda
                  </p>
                );
              })()}
            </div>
            <CardContent className="pt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Block</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addMetconBlock}>
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Nytt block
                  </Button>
                </div>

                {metconBlocks.map((block, blockIndex) => {
                  const blockDuration =
                    block.format === 'EMOM' && block.rounds && block.intervalSeconds
                      ? block.rounds * block.intervalSeconds + (block.restAfterSeconds || 0)
                      : undefined;
                  const hasRestAfter = Boolean(block.restAfterSeconds && block.restAfterSeconds > 0);

                  return (
                    <div key={block.id} className="rounded-lg border bg-background p-3 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {blockIndex + 1}
                          </Badge>
                          <Input
                            value={block.title}
                            onChange={(e) => updateMetconBlock(block.id, { title: e.target.value })}
                            className="h-9 w-44 font-medium"
                            placeholder="Blocknamn"
                          />
                          {block.format === 'EMOM' && block.rounds && block.intervalSeconds && (
                            <Badge variant="outline" className="text-xs">
                              E{formatSecondsLabel(block.intervalSeconds)} x {block.rounds}
                            </Badge>
                          )}
                          {blockDuration && (
                            <Badge variant="outline" className="text-xs">
                              {Math.ceil(blockDuration / 60)} min
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => duplicateMetconBlock(block.id)}
                            title="Duplicera block"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => removeMetconBlock(block.id)}
                            disabled={metconBlocks.length === 1}
                            title="Ta bort block"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-5">
                        <div className="space-y-1">
                          <Label className="text-xs">Format</Label>
                          <Select
                            value={block.format}
                            onValueChange={(value) =>
                              updateMetconBlock(block.id, {
                                format: value as MetconBlock['format'],
                                intervalSeconds:
                                  value === 'EMOM' ? block.intervalSeconds || DEFAULT_EMOM_INTERVAL_SECONDS : block.intervalSeconds,
                                rounds: value === 'EMOM' ? block.rounds || DEFAULT_EMOM_ROUNDS : block.rounds,
                              })
                            }
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="EMOM">EMOM/E2MOM</SelectItem>
                              <SelectItem value="AMRAP">AMRAP</SelectItem>
                              <SelectItem value="FOR_TIME">For Time</SelectItem>
                              <SelectItem value="INTERVALS">Intervaller</SelectItem>
                              <SelectItem value="CUSTOM">Anpassad</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Start var (s)</Label>
                          <Input
                            type="number"
                            className="h-9"
                            value={block.intervalSeconds || ''}
                            onChange={(e) =>
                              updateMetconBlock(block.id, {
                                intervalSeconds: e.target.value ? parseInt(e.target.value) : undefined,
                              })
                            }
                            placeholder="60"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Rundor</Label>
                          <Input
                            type="number"
                            className="h-9"
                            value={block.rounds || ''}
                            onChange={(e) =>
                              updateMetconBlock(block.id, {
                                rounds: e.target.value ? parseInt(e.target.value) : undefined,
                              })
                            }
                            placeholder="10"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex h-4 items-center justify-between gap-2">
                            <Label className="text-xs">Vila mellan</Label>
                            <Switch
                              checked={hasRestAfter}
                              onCheckedChange={(checked) =>
                                updateMetconBlock(block.id, {
                                  restAfterSeconds: checked ? (block.restAfterSeconds || 180) : undefined,
                                })
                              }
                              aria-label="Lägg till vila efter blocket"
                              className="h-4 w-7 [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-3"
                            />
                          </div>
                          {hasRestAfter ? (
                            <Input
                              type="number"
                              className="h-9"
                              value={block.restAfterSeconds || ''}
                              onChange={(e) =>
                                updateMetconBlock(block.id, {
                                  restAfterSeconds: e.target.value ? parseInt(e.target.value) : undefined,
                                })
                              }
                              placeholder="180"
                            />
                          ) : (
                            <div className="flex h-9 items-center rounded-md border bg-muted/30 px-3">
                              <span className="text-xs text-muted-foreground">Ingen vila</span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Rörelser</Label>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-9 w-full"
                            onClick={() => {
                              const isOpen = exercisePopoverOpen && exercisePickerBlockId === block.id;
                              setExercisePopoverOpen(!isOpen);
                              setExercisePickerBlockId(isOpen ? null : block.id);
                            }}
                          >
                            <Plus className="mr-1 h-3.5 w-3.5" />
                            Lägg till
                          </Button>
                        </div>
                      </div>

                      <Textarea
                        value={block.notes || ''}
                        onChange={(e) => updateMetconBlock(block.id, { notes: e.target.value || undefined })}
                        rows={2}
                        placeholder="Blockanteckningar, tempo eller coach cues..."
                      />

                      {exercisePopoverOpen && exercisePickerBlockId === block.id && (
                        <div className="rounded-lg border border-dashed p-3">
                          <Input
                            placeholder="Sök rörelser..."
                            value={exerciseSearch}
                            onChange={(e) => setExerciseSearch(e.target.value)}
                            className="mb-3 h-9"
                          />
                          <div className="max-h-[200px] overflow-y-auto">
                            {filteredExercises.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-3">Inga rörelser hittades.</p>
                            ) : (
                              Object.entries(groupedExercises).map(([category, exs]) => (
                                <div key={category} className="mb-3">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                                    {categoryLabels[category] || category}
                                  </p>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    {exs.slice(0, 8).map((exercise) => (
                                      <Button
                                        key={exercise.id}
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="justify-start h-auto py-1.5 px-2 text-xs text-left"
                                        onClick={() => addMovement(exercise)}
                                        title={exercise.name}
                                      >
                                        {exercise.nameSv || exercise.name}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}

                      {block.movements.length === 0 ? (
                        <button
                          type="button"
                          className="w-full py-5 text-center rounded-lg bg-muted/30 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => {
                            setExercisePopoverOpen(true);
                            setExercisePickerBlockId(block.id);
                          }}
                        >
                          <Dumbbell className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Lägg till rörelser för {block.title.toLowerCase()}.
                          </p>
                        </button>
                      ) : (
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(event) => handleBlockDragEnd(block.id, event)}
                        >
                          <SortableContext
                            items={block.movements.map((m) => m.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-2">
                              {block.movements.map((movement, index) => (
                                <SortableMovementCard
                                  key={movement.id}
                                  movement={movement}
                                  index={index}
                                  onRemove={removeMovement}
                                  onUpdate={updateMovement}
                                  repSchemeInfo={parseRepScheme(repScheme)}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* COOLDOWN SECTION */}
          <Card className={`overflow-hidden ${showCooldown ? 'border-blue-500/50' : ''}`}>
            <Collapsible open={showCooldown && cooldownOpen} onOpenChange={setCooldownOpen}>
              <div className="flex items-center justify-between p-3 bg-muted/30">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="cooldown-toggle"
                    checked={showCooldown}
                    onChange={(e) => {
                      setShowCooldown(e.target.checked);
                      if (e.target.checked) setCooldownOpen(true);
                      if (!e.target.checked) setCooldownData(undefined);
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Activity className="h-4 w-4 text-blue-500" />
                  <Label htmlFor="cooldown-toggle" className="font-medium cursor-pointer">
                    Nedvarvning
                  </Label>
                  {cooldownData?.duration && (
                    <Badge variant="outline" className="text-xs">
                      ~{Math.ceil(cooldownData.duration / 60)} min
                    </Badge>
                  )}
                </div>
                {showCooldown && (
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <ChevronDown className={`h-4 w-4 transition-transform ${cooldownOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                )}
              </div>
              <CollapsibleContent>
                <CardContent className="pt-4">
                  <SectionEditor
                    sectionType="COOLDOWN"
                    data={cooldownData}
                    onChange={setCooldownData}
                    exercises={exercises}
                  />
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={step === 1 ? onCancel : () => setStep(step - 1)}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          {step === 1 ? 'Avbryt' : 'Tillbaka'}
        </Button>

        <div className="flex gap-2">
          {initialData?.id && (
            <PrintWorkoutButton
              kind="hybrid"
              workoutId={initialData.id}
              label="Skriv ut"
            />
          )}
          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
            >
              Nästa
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={!canSave || saving}>
              {saving ? 'Sparar...' : 'Spara Pass'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
