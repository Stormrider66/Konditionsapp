import { describe, expect, it } from 'vitest'

import {
  generateStrengthSessionPDF,
  getStrengthPrintableExerciseName,
} from './strength-session-export'

describe('getStrengthPrintableExerciseName', () => {
  it('removes print section prefixes from generated exercise names', () => {
    expect(getStrengthPrintableExerciseName('Huvudpass - Knäböj')).toBe('Knäböj')
    expect(getStrengthPrintableExerciseName('Stabilitet / Prehab: Copenhagen plank')).toBe('Copenhagen plank')
  })
})

describe('generateStrengthSessionPDF', () => {
  it('generates a styled PDF for a strength session', () => {
    const blob = generateStrengthSessionPDF({
      sessionName: 'Maxstyrka 2 PHC 26',
      phase: 'Maxstyrka',
      locale: 'sv',
      organization: 'Trainomics',
      exercises: [
        {
          id: 'balance',
          name: 'Balansgång bosuboll',
          sets: 2,
          reps: '10',
          weight: '-',
          rest: 30,
          notes: '12 kg kb på rak arm',
        },
        {
          id: 'landmine',
          name: 'Huvudpass - Push/pull i landmine',
          sets: 2,
          reps: '5',
          weight: '-',
          rest: 30,
          notes: 'Dra stång i splitpos, rotera, byt arm och pressa.',
        },
      ],
    })

    expect(blob.size).toBeGreaterThan(0)
  })
})
