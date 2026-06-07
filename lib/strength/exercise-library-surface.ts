import {
  EquipmentType,
  MovementCategory,
  Prisma,
  WorkoutType,
} from '@prisma/client'

import {
  STRENGTH_STUDIO_ALLOWED_CATEGORIES,
  STRENGTH_STUDIO_CARDIO_EQUIPMENT_TYPES,
  STRENGTH_STUDIO_CARDIO_ICON_CATEGORIES,
  STRENGTH_STUDIO_EXCLUDED_MOVEMENT_CATEGORIES,
  STRENGTH_STUDIO_EXCLUDED_NAME_TERMS,
} from '@/lib/strength/exercise-library-filters'

export const STRENGTH_STUDIO_SURFACE = 'strength-studio'

export function isStrengthStudioSurface(surface: string | null | undefined): boolean {
  return surface === STRENGTH_STUDIO_SURFACE
}

export function getStrengthStudioExerciseWhereInput(): Prisma.ExerciseWhereInput {
  const excludedNameClauses = STRENGTH_STUDIO_EXCLUDED_NAME_TERMS.flatMap<Prisma.ExerciseWhereInput>((term) => [
    { name: { contains: term, mode: 'insensitive' } },
    { nameSv: { contains: term, mode: 'insensitive' } },
    { nameEn: { contains: term, mode: 'insensitive' } },
  ])

  return {
    AND: [
      {
        category: {
          in: Array.from(STRENGTH_STUDIO_ALLOWED_CATEGORIES) as WorkoutType[],
        },
      },
      {
        OR: [
          { iconCategory: null },
          {
            iconCategory: {
              notIn: Array.from(STRENGTH_STUDIO_CARDIO_ICON_CATEGORIES),
            },
          },
        ],
      },
      {
        OR: [
          { movementCategory: null },
          {
            NOT: {
              movementCategory: {
                in: Array.from(STRENGTH_STUDIO_EXCLUDED_MOVEMENT_CATEGORIES) as MovementCategory[],
              },
            },
          },
        ],
      },
      {
        NOT: {
          equipmentTypes: {
            hasSome: Array.from(STRENGTH_STUDIO_CARDIO_EQUIPMENT_TYPES) as EquipmentType[],
          },
        },
      },
      {
        OR: [
          { muscleGroup: null },
          {
            AND: [
              {
                NOT: {
                  muscleGroup: { equals: 'cardio', mode: 'insensitive' },
                },
              },
              {
                NOT: {
                  muscleGroup: { equals: 'kondition', mode: 'insensitive' },
                },
              },
            ],
          },
        ],
      },
      ...(excludedNameClauses.length > 0 ? [{ NOT: { OR: excludedNameClauses } }] : []),
    ],
  }
}
