import { describe, expect, it } from 'vitest'
import { inferCompleteProtein, inferProteinSource, normalizeProteinSource } from '../protein-quality'

describe('protein quality helpers', () => {
  it('classifies common animal protein as animal and complete', () => {
    const source = inferProteinSource('Laxfilé')
    expect(source).toBe('ANIMAL')
    expect(inferCompleteProtein('Laxfilé', null, source)).toBe(true)
  })

  it('classifies soy-based protein as plant and complete', () => {
    const source = inferProteinSource('Tofu')
    expect(source).toBe('PLANT')
    expect(inferCompleteProtein('Tofu', null, source)).toBe(true)
  })

  it('keeps ordinary legumes as plant but incomplete when isolated', () => {
    const source = inferProteinSource('Kikärtor')
    expect(source).toBe('PLANT')
    expect(inferCompleteProtein('Kikärtor', null, source)).toBe(false)
  })

  it('normalizes only supported source values', () => {
    expect(normalizeProteinSource('animal')).toBe('ANIMAL')
    expect(normalizeProteinSource('not-a-source')).toBeNull()
  })
})
