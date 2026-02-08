'use client';

/**
 * Section Editor Component
 *
 * Reusable editor for warmup, strength, and cooldown sections.
 * Supports notes-only mode or structured movements with drag-and-drop.
 */

import { useState } from 'react';
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
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Plus,
  Trash2,
  GripVertical,
  FileText,
  ListOrdered,
} from 'lucide-react';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import type { HybridSectionData, HybridSectionMovement, HybridSectionType } from '@/types';

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

interface SectionEditorProps {
  sectionType: HybridSectionType;
  data?: HybridSectionData;
  onChange: (data: HybridSectionData | undefined) => void;
  exercises: Exercise[];
  disabled?: boolean;
}

const sectionLabels: Record<HybridSectionType, { title: string; placeholder: string }> = {
  WARMUP: {
    title: 'Uppvärmning',
    placeholder: 'T.ex. "10 min lätt rodd, dynamiska stretchövningar..."',
  },
  STRENGTH: {
    title: 'Styrka',
    placeholder: 'T.ex. "Bygg upp till 5RM knäböj..."',
  },
  METCON: {
    title: 'Metcon',
    placeholder: 'Beskrivning av huvudpasset...',
  },
  COOLDOWN: {
    title: 'Nedvarvning',
    placeholder: 'T.ex. "5 min lätt rodd, statisk stretching..."',
  },
};

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

// Sortable movement card for sections
interface SortableSectionMovementProps {
  movement: HybridSectionMovement;
  index: number;
  sectionType: HybridSectionType;
  onRemove: (index: number) => void;
  onUpdate: (index: number, updates: Partial<HybridSectionMovement>) => void;
}

function SortableSectionMovement({
  movement,
  index,
  sectionType,
  onRemove,
  onUpdate,
}: SortableSectionMovementProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `section-movement-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  const showSetsRest = sectionType === 'STRENGTH';

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`p-3 ${isDragging ? 'shadow-lg ring-2 ring-primary' : ''}`}
    >
      <div className="flex items-start gap-2">
        <button
          className="touch-none cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded mt-1"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">{movement.exerciseName}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onRemove(index)}
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>

          <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
            {showSetsRest && (
              <div className="space-y-1">
                <Label className="text-xs">Set</Label>
                <Input
                  type="number"
                  className="h-8"
                  value={movement.sets || ''}
                  onChange={(e) =>
                    onUpdate(index, { sets: e.target.value ? parseInt(e.target.value) : undefined })
                  }
                  placeholder="3"
                />
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Reps</Label>
              <Input
                type="number"
                className="h-8"
                value={movement.reps || ''}
                onChange={(e) =>
                  onUpdate(index, { reps: e.target.value ? parseInt(e.target.value) : undefined })
                }
                placeholder="10"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tid (s)</Label>
              <Input
                type="number"
                className="h-8"
                value={movement.duration || ''}
                onChange={(e) =>
                  onUpdate(index, { duration: e.target.value ? parseInt(e.target.value) : undefined })
                }
                placeholder="30"
              />
            </div>
            {!showSetsRest && (
              <div className="space-y-1">
                <Label className="text-xs">Distans (m)</Label>
                <Input
                  type="number"
                  className="h-8"
                  value={movement.distance || ''}
                  onChange={(e) =>
                    onUpdate(index, { distance: e.target.value ? parseFloat(e.target.value) : undefined })
                  }
                  placeholder="400"
                />
              </div>
            )}
          </div>

          {showSetsRest && (
            <div className="grid gap-2 grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">Vila (s)</Label>
                <Input
                  type="number"
                  className="h-8"
                  value={movement.restSeconds || ''}
                  onChange={(e) =>
                    onUpdate(index, { restSeconds: e.target.value ? parseInt(e.target.value) : undefined })
                  }
                  placeholder="90"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Vikt H (kg)</Label>
                <Input
                  type="number"
                  className="h-8"
                  value={movement.weightMale || ''}
                  onChange={(e) =>
                    onUpdate(index, { weightMale: e.target.value ? parseFloat(e.target.value) : undefined })
                  }
                  placeholder="60"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Vikt D (kg)</Label>
                <Input
                  type="number"
                  className="h-8"
                  value={movement.weightFemale || ''}
                  onChange={(e) =>
                    onUpdate(index, { weightFemale: e.target.value ? parseFloat(e.target.value) : undefined })
                  }
                  placeholder="40"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export function SectionEditor({
  sectionType,
  data,
  onChange,
  exercises,
  disabled = false,
}: SectionEditorProps) {
  const [useStructured, setUseStructured] = useState(
    data?.movements && data.movements.length > 0
  );
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);

  const labels = sectionLabels[sectionType];

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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id && data?.movements) {
      const oldIndex = parseInt(active.id.toString().replace('section-movement-', ''));
      const newIndex = parseInt(over.id.toString().replace('section-movement-', ''));

      const newMovements = arrayMove(data.movements, oldIndex, newIndex).map((m, i) => ({
        ...m,
        order: i + 1,
      }));

      onChange({ ...data, movements: newMovements });
    }
  }

  function handleNotesChange(notes: string) {
    onChange({
      ...data,
      notes: notes || undefined,
    });
  }

  function handleDurationChange(duration: number | undefined) {
    onChange({
      ...data,
      duration,
    });
  }

  function addMovement(exercise: Exercise) {
    const newMovement: HybridSectionMovement = {
      exerciseId: exercise.id,
      exerciseName: exercise.nameSv || exercise.name,
      order: (data?.movements?.length || 0) + 1,
      reps: exercise.defaultReps,
      weightMale: exercise.defaultWeightMale,
      weightFemale: exercise.defaultWeightFemale,
    };

    onChange({
      ...data,
      movements: [...(data?.movements || []), newMovement],
    });

    setShowExerciseSelector(false);
    setExerciseSearch('');
  }

  function removeMovement(index: number) {
    if (!data?.movements) return;

    const newMovements = data.movements
      .filter((_, i) => i !== index)
      .map((m, i) => ({ ...m, order: i + 1 }));

    onChange({
      ...data,
      movements: newMovements.length > 0 ? newMovements : undefined,
    });
  }

  function updateMovement(index: number, updates: Partial<HybridSectionMovement>) {
    if (!data?.movements) return;

    const newMovements = data.movements.map((m, i) =>
      i === index ? { ...m, ...updates } : m
    );

    onChange({ ...data, movements: newMovements });
  }

  function toggleMode(structured: boolean) {
    setUseStructured(structured);
    if (!structured) {
      // Clear movements when switching to notes-only
      onChange({ ...data, movements: undefined });
    }
  }

  const filteredExercises = exercises.filter(
    (e) =>
      e.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
      e.nameSv?.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
      e.standardAbbreviation?.toLowerCase().includes(exerciseSearch.toLowerCase())
  );

  const groupedExercises = filteredExercises.reduce(
    (acc, exercise) => {
      const cat = exercise.movementCategory || 'OTHER';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(exercise);
      return acc;
    },
    {} as Record<string, Exercise[]>
  );

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <InfoTooltip conceptKey="workoutSections" />
          <button
            type="button"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
              !useStructured
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            }`}
            onClick={() => toggleMode(false)}
            disabled={disabled}
          >
            <FileText className="h-3.5 w-3.5" />
            Anteckningar
          </button>
          <button
            type="button"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
              useStructured
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            }`}
            onClick={() => toggleMode(true)}
            disabled={disabled}
          >
            <ListOrdered className="h-3.5 w-3.5" />
            Strukturerat
          </button>
        </div>

        {(sectionType === 'WARMUP' || sectionType === 'COOLDOWN') && (
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Tid (min)</Label>
            <Input
              type="number"
              className="h-8 w-16"
              value={data?.duration ? Math.ceil(data.duration / 60) : ''}
              onChange={(e) =>
                handleDurationChange(
                  e.target.value ? parseInt(e.target.value) * 60 : undefined
                )
              }
              placeholder="10"
              disabled={disabled}
            />
          </div>
        )}
      </div>

      {/* Notes Input (always shown) */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Anteckningar</Label>
        <Textarea
          value={data?.notes || ''}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder={labels.placeholder}
          rows={useStructured ? 2 : 4}
          disabled={disabled}
        />
      </div>

      {/* Structured Movements */}
      {useStructured && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Övningar</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowExerciseSelector(!showExerciseSelector)}
              disabled={disabled}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              {showExerciseSelector ? 'Stäng' : 'Lägg till'}
            </Button>
          </div>

          {/* Exercise Selector */}
          {showExerciseSelector && (
            <Card>
              <CardContent className="p-3">
                <Input
                  placeholder="Sök övningar..."
                  value={exerciseSearch}
                  onChange={(e) => setExerciseSearch(e.target.value)}
                  className="mb-3 h-9"
                />
                <div className="max-h-[200px] overflow-y-auto">
                  {filteredExercises.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-3">
                      Inga övningar hittades.
                    </p>
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
              </CardContent>
            </Card>
          )}

          {/* Movement List */}
          {data?.movements && data.movements.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={data.movements.map((_, i) => `section-movement-${i}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {data.movements.map((movement, index) => (
                    <SortableSectionMovement
                      key={`section-movement-${index}`}
                      movement={movement}
                      index={index}
                      sectionType={sectionType}
                      onRemove={removeMovement}
                      onUpdate={updateMovement}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Klicka på &quot;Lägg till&quot; för att lägga till övningar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
