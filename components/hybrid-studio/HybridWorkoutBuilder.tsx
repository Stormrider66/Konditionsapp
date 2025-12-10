'use client';

/**
 * Hybrid Workout Builder Component
 *
 * A multi-step form for creating hybrid workouts with:
 * - Format selection
 * - Time/round configuration
 * - Movement selection with drag-and-drop
 * - Weight/rep configuration per movement
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronRight,
  ChevronLeft,
  Timer,
  Repeat,
  Dumbbell,
  Trophy,
  Zap,
  Clock,
  Target,
  Search,
} from 'lucide-react';

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

interface HybridWorkoutBuilderProps {
  onSave: () => void;
  onCancel: () => void;
  initialData?: {
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
  };
}

const formatOptions = [
  { value: 'FOR_TIME', label: 'For Time', labelSv: 'På Tid', icon: Timer, description: 'Slutför arbetet så snabbt som möjligt' },
  { value: 'AMRAP', label: 'AMRAP', labelSv: 'AMRAP', icon: Repeat, description: 'Så många rundor som möjligt på given tid' },
  { value: 'EMOM', label: 'EMOM', labelSv: 'EMOM', icon: Clock, description: 'Varje minut på minuten' },
  { value: 'TABATA', label: 'Tabata', labelSv: 'Tabata', icon: Zap, description: '20s arbete / 10s vila × 8 rundor' },
  { value: 'CHIPPER', label: 'Chipper', labelSv: 'Chipper', icon: Target, description: 'Lång sekvens av rörelser, en gång' },
  { value: 'LADDER', label: 'Ladder', labelSv: 'Stege', icon: Dumbbell, description: 'Stigande/fallande rep-schema' },
  { value: 'INTERVALS', label: 'Intervals', labelSv: 'Intervaller', icon: Zap, description: 'Arbete/vila intervaller' },
  { value: 'HYROX_SIM', label: 'HYROX Sim', labelSv: 'HYROX Sim', icon: Trophy, description: 'HYROX-simulering (löpning + stationer)' },
];

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
  const [movements, setMovements] = useState<WorkoutMovement[]>(initialData?.movements || []);
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [exercisePopoverOpen, setExercisePopoverOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchExercises();
  }, []);

  async function fetchExercises() {
    try {
      const response = await fetch('/api/hybrid-movements?limit=200');
      if (response.ok) {
        const data = await response.json();
        setExercises(data.movements);
      }
    } catch (error) {
      console.error('Failed to fetch exercises:', error);
    }
  }

  function addMovement(exercise: Exercise) {
    const newMovement: WorkoutMovement = {
      id: `temp-${Date.now()}`,
      exerciseId: exercise.id,
      exercise,
      order: movements.length + 1,
      reps: exercise.defaultReps,
      weightMale: exercise.defaultWeightMale,
      weightFemale: exercise.defaultWeightFemale,
    };
    setMovements([...movements, newMovement]);
    setExercisePopoverOpen(false);
    setExerciseSearch('');
  }

  function removeMovement(id: string) {
    setMovements(movements.filter((m) => m.id !== id).map((m, i) => ({ ...m, order: i + 1 })));
  }

  function updateMovement(id: string, updates: Partial<WorkoutMovement>) {
    setMovements(movements.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  }

  function moveMovement(fromIndex: number, toIndex: number) {
    const newMovements = [...movements];
    const [removed] = newMovements.splice(fromIndex, 1);
    newMovements.splice(toIndex, 0, removed);
    setMovements(newMovements.map((m, i) => ({ ...m, order: i + 1 })));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        name,
        description,
        format,
        timeCap,
        totalMinutes,
        totalRounds,
        workTime,
        restTime,
        repScheme,
        scalingLevel,
        tags,
        movements: movements.map((m) => ({
          exerciseId: m.exerciseId,
          order: m.order,
          reps: m.reps,
          calories: m.calories,
          distance: m.distance,
          duration: m.duration,
          weightMale: m.weightMale,
          weightFemale: m.weightFemale,
          notes: m.notes,
        })),
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
        onSave();
      } else {
        console.error('Failed to save workout');
      }
    } catch (error) {
      console.error('Failed to save workout:', error);
    } finally {
      setSaving(false);
    }
  }

  const filteredExercises = exercises.filter(
    (e) =>
      e.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
      e.nameSv?.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
      e.standardAbbreviation?.toLowerCase().includes(exerciseSearch.toLowerCase())
  );

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
  const canSave = movements.length > 0;

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
                onClick={() => setFormat(option.value)}
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
          {(format === 'AMRAP' || format === 'EMOM') && (
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
            <div className="space-y-2">
              <Label htmlFor="repScheme">Rep-schema</Label>
              <Input
                id="repScheme"
                value={repScheme}
                onChange={(e) => setRepScheme(e.target.value)}
                placeholder="t.ex. 21-15-9 eller 50-40-30-20-10"
              />
            </div>
          )}
        </div>
      )}

      {/* Step 3: Movements */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Rörelser</h3>
            <Popover open={exercisePopoverOpen} onOpenChange={setExercisePopoverOpen}>
              <PopoverTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Lägg till rörelse
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="end">
                <Command>
                  <CommandInput
                    placeholder="Sök rörelser..."
                    value={exerciseSearch}
                    onValueChange={setExerciseSearch}
                  />
                  <CommandList>
                    <CommandEmpty>Inga rörelser hittades.</CommandEmpty>
                    {Object.entries(groupedExercises).map(([category, exs]) => (
                      <CommandGroup key={category} heading={categoryLabels[category] || category}>
                        {exs.slice(0, 10).map((exercise) => (
                          <CommandItem
                            key={exercise.id}
                            onSelect={() => addMovement(exercise)}
                          >
                            <div className="flex items-center gap-2 w-full">
                              <span className="font-medium">
                                {exercise.standardAbbreviation || exercise.name}
                              </span>
                              <span className="text-muted-foreground text-sm">
                                {exercise.nameSv}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {movements.length === 0 ? (
            <Card className="p-8 text-center">
              <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h4 className="font-medium mb-2">Inga rörelser än</h4>
              <p className="text-sm text-muted-foreground">
                Klicka på &quot;Lägg till rörelse&quot; för att börja bygga ditt pass.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {movements.map((movement, index) => (
                <Card key={movement.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-1">
                      <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                      <span className="text-xs text-muted-foreground">{index + 1}</span>
                    </div>

                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">
                            {movement.exercise.standardAbbreviation || movement.exercise.name}
                          </span>
                          {movement.exercise.nameSv && (
                            <span className="text-muted-foreground ml-2">
                              ({movement.exercise.nameSv})
                            </span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMovement(movement.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>

                      <div className="grid gap-3 md:grid-cols-4">
                        <div className="space-y-1">
                          <Label className="text-xs">Reps</Label>
                          <Input
                            type="number"
                            value={movement.reps || ''}
                            onChange={(e) =>
                              updateMovement(movement.id, {
                                reps: e.target.value ? parseInt(e.target.value) : undefined,
                              })
                            }
                            placeholder="Antal"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Distans (m)</Label>
                          <Input
                            type="number"
                            value={movement.distance || ''}
                            onChange={(e) =>
                              updateMovement(movement.id, {
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
                              updateMovement(movement.id, {
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
                              updateMovement(movement.id, {
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
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={step === 1 ? onCancel : () => setStep(step - 1)}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          {step === 1 ? 'Avbryt' : 'Tillbaka'}
        </Button>

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
  );
}
