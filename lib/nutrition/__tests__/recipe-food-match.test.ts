import { describe, expect, it } from 'vitest'

import {
  isConfidentFoodMatch,
  occursAsWholeWord,
  pickConfidentFood,
} from '../recipe-food-match'

describe('occursAsWholeWord', () => {
  it('matches a whole word at the start of the name', () => {
    expect(occursAsWholeWord('havregryn', 'havregryn, fullkorn')).toBe(true)
    expect(occursAsWholeWord('mjölk', 'mjölk 3%')).toBe(true)
    expect(occursAsWholeWord('ägg', 'ägg, hönsägg, hela')).toBe(true)
  })

  it('rejects a fragment that is only part of a longer word', () => {
    // The real production bug: "vanilj" rode popularity onto "vaniljpudding".
    expect(occursAsWholeWord('vanilj', 'vaniljpudding')).toBe(false)
    // "ris" must not match "griskött" / "grissylta".
    expect(occursAsWholeWord('ris', 'griskött')).toBe(false)
    expect(occursAsWholeWord('socker', 'farinsockerkaka')).toBe(false)
  })

  it('handles accents and casing consistently', () => {
    expect(occursAsWholeWord('Kräftor', 'kräftor, kokta')).toBe(true)
    expect(occursAsWholeWord('', 'anything')).toBe(false)
  })
})

describe('isConfidentFoodMatch', () => {
  it('accepts exact and whole-word matches', () => {
    expect(isConfidentFoodMatch('socker', 'socker')).toBe(true)
    expect(isConfidentFoodMatch('kycklingfilé', 'kycklingfilé, grillad')).toBe(true)
    expect(isConfidentFoodMatch('havregryn', 'havregryn, fullkorn')).toBe(true)
  })

  it('rejects the fragment matches the scanner used to accept silently', () => {
    expect(isConfidentFoodMatch('vanilj', 'vaniljpudding')).toBe(false)
    expect(isConfidentFoodMatch('vaniljpulver', 'vaniljsocker')).toBe(false)
    expect(isConfidentFoodMatch('kokossocker', 'sockerkaka')).toBe(false)
  })

  it('rejects 1-char queries outright', () => {
    expect(isConfidentFoodMatch('a', 'avokado')).toBe(false)
  })
})

describe('pickConfidentFood', () => {
  const rows = [
    { id: '1', searchName: 'vaniljpudding' }, // most popular, but a fragment match
    { id: '2', searchName: 'vaniljpulver' }, // the real food, lower popularity
  ]

  it('skips the popular fragment hit and picks the genuine whole-word match', () => {
    expect(pickConfidentFood('vaniljpulver', rows)?.id).toBe('2')
  })

  it('returns null when nothing clears the bar', () => {
    expect(pickConfidentFood('vanilj', rows)).toBeNull()
  })
})
