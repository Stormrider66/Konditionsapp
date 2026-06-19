import type { HybridMetconBlock, HybridMetconBlockMovement, HybridMetconData } from '@/types';

export interface HybridPlanMovement {
  id: string;
  exerciseId: string;
  name: string;
  label: string;
  logValue: number | string;
  notes?: string;
}

export interface HybridPlanSegment {
  id: string;
  type: 'work' | 'rest';
  title: string;
  durationSeconds: number;
  blockTitle: string;
  movements: HybridPlanMovement[];
  notes?: string;
  roundNumber?: number;
}

interface HybridPlanCopy {
  blockTitle: (number: number) => string;
  roundTitle: (blockTitle: string, round: number, total: number) => string;
  restAfter: (blockTitle: string) => string;
}

export function parseHybridDurationFromNotes(notes?: string | null): number | null {
  if (!notes) return null;

  const minuteMatch = notes.match(/(\d+(?:[,.]\d+)?)\s*(?:min|minutes?|minuter)\b/i);
  if (minuteMatch) {
    return Math.round(parseFloat(minuteMatch[1].replace(',', '.')) * 60);
  }

  const secondMatch = notes.match(/(\d+(?:[,.]\d+)?)\s*(?:s|sec|secs|seconds?|sek|sekunder)\b/i);
  if (secondMatch) {
    return Math.round(parseFloat(secondMatch[1].replace(',', '.')));
  }

  return null;
}

export function getHybridBlockDurationSeconds(block: HybridMetconBlock): number {
  const rounds = block.rounds ?? 1;
  const noteDuration = block.format !== 'EMOM' && rounds <= 1
    ? parseHybridDurationFromNotes(block.notes)
    : null;

  if (noteDuration && noteDuration > 0) return noteDuration;
  if (block.intervalSeconds && block.intervalSeconds > 0) return block.intervalSeconds;
  if (block.workSeconds && block.restSeconds) return block.workSeconds + block.restSeconds;
  if (block.workSeconds && block.workSeconds > 0) return block.workSeconds;

  const movementDuration = Math.max(...block.movements.map((movement) => movement.duration ?? 0), 0);
  return movementDuration > 0 ? movementDuration : 60;
}

export function formatHybridDurationCompact(durationSeconds: number): string {
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  return minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : `${seconds}s`;
}

export function formatHybridPlanMovement(movement: HybridMetconBlockMovement): HybridPlanMovement {
  const prescription: string[] = [];

  if (movement.reps) prescription.push(`${movement.reps} reps`);
  if (movement.calories) prescription.push(`${movement.calories} cal`);
  if (movement.distance) prescription.push(`${movement.distance}m`);
  if (movement.duration) prescription.push(formatHybridDurationCompact(movement.duration));

  const weight =
    movement.weightMale && movement.weightFemale
      ? `${movement.weightMale}/${movement.weightFemale}kg`
      : movement.weightMale
        ? `${movement.weightMale}kg`
        : movement.weightFemale
          ? `${movement.weightFemale}kg`
          : null;

  const logValue = movement.reps
    ?? (movement.calories ? `${movement.calories} cal` : undefined)
    ?? (movement.distance ? `${movement.distance}m` : undefined)
    ?? (movement.duration ? formatHybridDurationCompact(movement.duration) : '-');

  return {
    id: movement.id ?? movement.exerciseId,
    exerciseId: movement.exerciseId,
    name: movement.exerciseName,
    label: [movement.exerciseName, prescription.join(' '), weight ? `@ ${weight}` : null]
      .filter(Boolean)
      .join(' '),
    logValue,
    notes: movement.notes,
  };
}

export function buildHybridPlanSegments(
  metconData: HybridMetconData | null | undefined,
  copy: HybridPlanCopy
): HybridPlanSegment[] {
  if (!metconData?.blocks?.length) return [];

  let roundNumber = 0;

  return metconData.blocks.flatMap((block, blockIndex) => {
    const blockTitle = block.title || copy.blockTitle(blockIndex + 1);
    const rounds = Math.max(1, block.rounds ?? 1);
    const durationSeconds = getHybridBlockDurationSeconds(block);
    const movements = [...block.movements]
      .sort((a, b) => a.order - b.order)
      .map(formatHybridPlanMovement);
    const blockSegments: HybridPlanSegment[] = Array.from({ length: rounds }, (_, roundIndex) => {
      roundNumber += 1;

      return {
        id: `${block.id}-round-${roundIndex + 1}`,
        type: 'work',
        title: rounds > 1
          ? copy.roundTitle(blockTitle, roundIndex + 1, rounds)
          : blockTitle,
        durationSeconds,
        blockTitle,
        movements,
        notes: block.notes ?? undefined,
        roundNumber,
      };
    });

    if (block.restAfterSeconds && block.restAfterSeconds > 0) {
      blockSegments.push({
        id: `${block.id}-rest-after`,
        type: 'rest',
        title: copy.restAfter(blockTitle),
        durationSeconds: block.restAfterSeconds,
        blockTitle,
        movements: [],
      });
    }

    return blockSegments;
  });
}
