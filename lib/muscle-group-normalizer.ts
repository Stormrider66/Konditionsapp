export const CANONICAL_MUSCLE_GROUPS = [
  'Bröst',
  'Rygg',
  'Axlar',
  'Biceps',
  'Triceps',
  'Core',
  'Quadriceps',
  'Hamstrings',
  'Gluteus',
  'Vader',
  'Underarmar',
  'Helkropp',
] as const

export type CanonicalMuscleGroup = (typeof CANONICAL_MUSCLE_GROUPS)[number]

export const MUSCLE_GROUP_COLORS: Record<CanonicalMuscleGroup, string> = {
  Bröst: '#ef4444',      // red-500
  Rygg: '#3b82f6',       // blue-500
  Axlar: '#f97316',      // orange-500
  Biceps: '#8b5cf6',     // violet-500
  Triceps: '#a855f7',    // purple-500
  Core: '#eab308',       // yellow-500
  Quadriceps: '#22c55e', // green-500
  Hamstrings: '#14b8a6', // teal-500
  Gluteus: '#ec4899',    // pink-500
  Vader: '#06b6d4',      // cyan-500
  Underarmar: '#64748b', // slate-500
  Helkropp: '#6b7280',   // gray-500
}

const NORMALIZATION_MAP: Record<string, CanonicalMuscleGroup> = {
  // Bröst (Chest)
  'bröst': 'Bröst',
  'chest': 'Bröst',
  'pectorals': 'Bröst',
  'pecs': 'Bröst',
  'bröstet': 'Bröst',
  'bröstmuskel': 'Bröst',
  'pectoralis': 'Bröst',

  // Rygg (Back)
  'rygg': 'Rygg',
  'back': 'Rygg',
  'lats': 'Rygg',
  'latissimus': 'Rygg',
  'övre rygg': 'Rygg',
  'nedre rygg': 'Rygg',
  'upper back': 'Rygg',
  'lower back': 'Rygg',
  'traps': 'Rygg',
  'trapezius': 'Rygg',
  'rhomboids': 'Rygg',

  // Axlar (Shoulders)
  'axlar': 'Axlar',
  'shoulders': 'Axlar',
  'deltoids': 'Axlar',
  'delts': 'Axlar',
  'axel': 'Axlar',
  'deltoid': 'Axlar',

  // Biceps
  'biceps': 'Biceps',
  'bicep': 'Biceps',

  // Triceps
  'triceps': 'Triceps',
  'tricep': 'Triceps',

  // Core
  'core': 'Core',
  'abs': 'Core',
  'mage': 'Core',
  'abdominals': 'Core',
  'bål': 'Core',
  'obliques': 'Core',
  'sneda magmuskler': 'Core',

  // Quadriceps
  'quadriceps': 'Quadriceps',
  'quads': 'Quadriceps',
  'lår': 'Quadriceps',
  'framsida lår': 'Quadriceps',
  'quad': 'Quadriceps',
  'front thigh': 'Quadriceps',

  // Hamstrings
  'hamstrings': 'Hamstrings',
  'hamstring': 'Hamstrings',
  'baksida lår': 'Hamstrings',
  'bakre lår': 'Hamstrings',
  'posterior thigh': 'Hamstrings',

  // Gluteus
  'gluteus': 'Gluteus',
  'glutes': 'Gluteus',
  'rumpa': 'Gluteus',
  'säte': 'Gluteus',
  'gluteal': 'Gluteus',
  'gluteals': 'Gluteus',

  // Vader (Calves)
  'vader': 'Vader',
  'calves': 'Vader',
  'calf': 'Vader',
  'gastrocnemius': 'Vader',
  'soleus': 'Vader',

  // Underarmar (Forearms)
  'underarmar': 'Underarmar',
  'forearms': 'Underarmar',
  'forearm': 'Underarmar',
  'grip': 'Underarmar',
  'handgrepp': 'Underarmar',

  // Helkropp (Full body)
  'helkropp': 'Helkropp',
  'full body': 'Helkropp',
  'hela kroppen': 'Helkropp',
  'compound': 'Helkropp',
  'total body': 'Helkropp',

  // Broad categories that map to groups
  'ben': 'Quadriceps',
  'legs': 'Quadriceps',
  'ben & rumpa': 'Quadriceps',
  'överkropp': 'Bröst',
  'upper body': 'Bröst',
  'armar': 'Biceps',
  'arms': 'Biceps',
}

export function normalizeMuscleGroups(muscleGroupStr: string | null): CanonicalMuscleGroup[] {
  if (!muscleGroupStr) return ['Helkropp']

  const parts = muscleGroupStr.split(',').map((s) => s.trim().toLowerCase())
  const results: CanonicalMuscleGroup[] = []

  for (const part of parts) {
    if (!part) continue
    const match = NORMALIZATION_MAP[part]
    if (match) {
      if (!results.includes(match)) results.push(match)
    } else {
      // Fuzzy fallback: check if any key is contained in the part
      let found = false
      for (const [key, group] of Object.entries(NORMALIZATION_MAP)) {
        if (part.includes(key) || key.includes(part)) {
          if (!results.includes(group)) results.push(group)
          found = true
          break
        }
      }
      if (!found && !results.includes('Helkropp')) {
        results.push('Helkropp')
      }
    }
  }

  return results.length > 0 ? results : ['Helkropp']
}
