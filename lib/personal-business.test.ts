import { describe, expect, it } from 'vitest'
import { defaultPersonalBusinessName, sluggifyBusinessName } from './personal-business'

describe('personal business naming', () => {
  it('defaults generated coach and physio business names to English', () => {
    expect(defaultPersonalBusinessName('Alex', 'COACH')).toBe("Alex's coaching")
    expect(defaultPersonalBusinessName('Alex', 'PHYSIO')).toBe("Alex's practice")
  })

  it('keeps Swedish generated names when requested explicitly', () => {
    expect(defaultPersonalBusinessName('Alex', 'COACH', 'sv')).toBe('Alexs coaching')
    expect(defaultPersonalBusinessName('Alex', 'PHYSIO', 'sv')).toBe('Alexs praktik')
  })

  it('keeps generated English names URL-safe', () => {
    expect(sluggifyBusinessName(defaultPersonalBusinessName('Alex', 'PHYSIO'))).toBe('alexs-practice')
  })
})
