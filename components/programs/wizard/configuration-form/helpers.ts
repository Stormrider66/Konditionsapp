import type { SportType } from '@prisma/client'

export function getDefaultDuration(sport: SportType, goal: string): number {
  const durations: Record<string, Record<string, number>> = {
    RUNNING: {
      marathon: 20,
      'half-marathon': 16,
      '10k': 10,
      '5k': 8,
      custom: 12,
    },
    CYCLING: {
      'ftp-builder': 8,
      'base-builder': 12,
      'gran-fondo': 8,
      custom: 12,
    },
    SKIING: {
      'threshold-builder': 8,
      'prep-phase': 12,
      vasaloppet: 16,
      custom: 12,
    },
    SWIMMING: {
      sprint: 8,
      distance: 12,
      'open-water': 12,
      custom: 12,
    },
    TRIATHLON: {
      sprint: 8,
      olympic: 12,
      'half-ironman': 16,
      ironman: 24,
      custom: 16,
    },
    HYROX: {
      pro: 12,
      'age-group': 12,
      doubles: 8,
      custom: 12,
    },
    STRENGTH: {
      'injury-prevention': 10,
      power: 14,
      'running-economy': 12,
      general: 12,
    },
    GENERAL_FITNESS: {
      weight_loss: 12,
      strength: 12,
      endurance: 12,
      flexibility: 8,
      stress_relief: 8,
      general_health: 8,
    },
  }

  return durations[sport]?.[goal] || 12
}

export function getSportLabel(sport: SportType): string {
  const labels: Record<string, string> = {
    RUNNING: 'Löpning',
    CYCLING: 'Cykling',
    STRENGTH: 'Styrka',
    SKIING: 'Skidåkning',
    SWIMMING: 'Simning',
    TRIATHLON: 'Triathlon',
    HYROX: 'HYROX',
    GENERAL_FITNESS: 'Allmän Fitness',
  }
  return labels[sport] || sport
}

/**
 * Get suggested methodology based on experience level and goal
 */
export function getSuggestedMethodology(
  experienceLevel: string | undefined,
  goalType: string
): { method: string; name: string; reason: string } {
  // Beginners should use Polarized (simplest, safest)
  if (experienceLevel === 'beginner') {
    return {
      method: 'POLARIZED',
      name: 'Polarized (80/20)',
      reason: 'Enklaste och säkraste metoden för nybörjare. 80% lätt träning, 20% hård träning.',
    }
  }

  // Intermediate athletes can use Pyramidal for more threshold work
  if (experienceLevel === 'intermediate') {
    return {
      method: 'PYRAMIDAL',
      name: 'Pyramidal',
      reason: 'Balanserad metod med mer tröskelträning. Passar dig som har grundläggande kondition.',
    }
  }

  // Advanced athletes - select based on goal
  if (experienceLevel === 'advanced') {
    switch (goalType) {
      case 'marathon':
      case 'half-marathon':
        return {
          method: 'CANOVA',
          name: 'Canova (Marathon-specialist)',
          reason: 'Marathon-specialist metodik med fokus på specifik uthållighet för längre distanser.',
        }
      case '10k':
      case '5k':
        return {
          method: 'NORWEGIAN_SINGLE',
          name: 'Norwegian Singles',
          reason: 'Mer tröskelträning för kortare distanser. Effektivt för 5K och 10K.',
        }
      default:
        return {
          method: 'POLARIZED',
          name: 'Polarized (80/20)',
          reason: 'Klassisk och beprövad metod som fungerar för alla nivåer.',
        }
    }
  }

  // Default fallback
  return {
    method: 'POLARIZED',
    name: 'Polarized (80/20)',
    reason: 'Klassisk och beprövad metod som fungerar för alla nivåer.',
  }
}
