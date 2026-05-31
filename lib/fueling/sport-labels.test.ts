import { describe, expect, it } from 'vitest'
import { fuelingSportLabel } from './sport-labels'

describe('fuelingSportLabel', () => {
  it('uses English labels by default', () => {
    expect(fuelingSportLabel('RUNNING')).toBe('Running')
    expect(fuelingSportLabel('FUNCTIONAL_FITNESS')).toBe('Functional fitness')
  })

  it('uses Swedish labels when requested', () => {
    expect(fuelingSportLabel('RUNNING', 'sv')).toBe('Löpning')
    expect(fuelingSportLabel('FUNCTIONAL_FITNESS', 'sv')).toBe('Funktionell träning')
  })
})
