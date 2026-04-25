import { describe, expect, it } from 'vitest'
import { parseWideFormat } from '@/lib/strength/parse-wide-format'

describe('parseWideFormat', () => {
  describe('empty + degenerate inputs', () => {
    it('returns empty result for empty string', () => {
      const result = parseWideFormat('')
      expect(result).toEqual({
        headers: [],
        names: [],
        bodyWeightDetected: false,
        cells: [],
      })
    })

    it('returns empty result for whitespace-only input', () => {
      const result = parseWideFormat('   \n\n\t\n   ')
      expect(result).toEqual({
        headers: [],
        names: [],
        bodyWeightDetected: false,
        cells: [],
      })
    })

    it('returns empty result for a single header line (no data rows)', () => {
      const result = parseWideFormat('Namn\tBenböj\tBänkpress')
      expect(result).toEqual({
        headers: [],
        names: [],
        bodyWeightDetected: false,
        cells: [],
      })
    })

    it('returns empty result when all rows are blank', () => {
      const result = parseWideFormat('\n\n   \n\t\t\n   \n')
      expect(result).toEqual({
        headers: [],
        names: [],
        bodyWeightDetected: false,
        cells: [],
      })
    })
  })

  describe('separator handling', () => {
    it('parses tab-separated input', () => {
      const result = parseWideFormat('Namn\tBenböj\tBänkpress\nOscar\t180\t100')
      expect(result.headers).toEqual(['Benböj', 'Bänkpress'])
      expect(result.names).toEqual(['Oscar'])
      expect(result.cells).toHaveLength(2)
      expect(result.cells[0]).toMatchObject({ value: 180, colIndex: 0 })
      expect(result.cells[1]).toMatchObject({ value: 100, colIndex: 1 })
    })

    it('parses comma-separated input identically to tab', () => {
      const tabResult = parseWideFormat('Namn\tBenböj\tBänkpress\nOscar\t180\t100')
      const commaResult = parseWideFormat('Namn,Benböj,Bänkpress\nOscar,180,100')
      expect(commaResult.headers).toEqual(tabResult.headers)
      expect(commaResult.names).toEqual(tabResult.names)
      expect(commaResult.cells).toEqual(tabResult.cells)
    })

    it('parses semicolon-separated input identically to tab', () => {
      const tabResult = parseWideFormat('Namn\tBenböj\tBänkpress\nOscar\t180\t100')
      const semiResult = parseWideFormat('Namn;Benböj;Bänkpress\nOscar;180;100')
      expect(semiResult.headers).toEqual(tabResult.headers)
      expect(semiResult.names).toEqual(tabResult.names)
      expect(semiResult.cells).toEqual(tabResult.cells)
    })

    it('handles mixed separators across lines (each line picks its own)', () => {
      // Header is comma-separated, data row is tab-separated.
      const result = parseWideFormat('Namn,Benböj,Bänkpress\nOscar\t180\t100')
      expect(result.headers).toEqual(['Benböj', 'Bänkpress'])
      expect(result.names).toEqual(['Oscar'])
      expect(result.cells).toHaveLength(2)
      expect(result.cells[0]).toMatchObject({ value: 180, colIndex: 0, rawHeader: 'Benböj' })
      expect(result.cells[1]).toMatchObject({ value: 100, colIndex: 1, rawHeader: 'Bänkpress' })
    })

    it('tab beats comma when both are present on the same line', () => {
      // "180,5" inside a tab-separated row should NOT be split on the comma — it's a decimal.
      const result = parseWideFormat('Namn\tBenböj\nOscar\t180,5')
      expect(result.cells).toHaveLength(1)
      expect(result.cells[0]).toMatchObject({ value: 180.5 })
    })

    it('treats single-column input (no separator) as one cell', () => {
      const result = parseWideFormat('Header\nOscar')
      // First cell of the data row is the name; there are no data columns.
      expect(result.headers).toEqual([])
      expect(result.names).toEqual(['Oscar'])
      expect(result.cells).toEqual([])
    })
  })

  describe('annotation parsing', () => {
    it('parses "180 Hex" as value=180, note="Hex"', () => {
      const result = parseWideFormat('Namn\tBenböj\nOscar\t180 Hex')
      expect(result.cells).toHaveLength(1)
      expect(result.cells[0]).toMatchObject({ value: 180, note: 'Hex' })
    })

    it('parses "180hex" with no space — annotation captured without space', () => {
      // Regex: ^([\d]+(?:[.,]\d+)?)\s*(.*)$ — \s* allows zero spaces, so "hex" still flows into note.
      const result = parseWideFormat('Namn\tBenböj\nOscar\t180hex')
      expect(result.cells).toHaveLength(1)
      expect(result.cells[0]).toMatchObject({ value: 180, note: 'hex' })
    })

    it('parses "180,5" with European decimal as value=180.5, empty note', () => {
      const result = parseWideFormat('Namn\tBenböj\nOscar\t180,5')
      expect(result.cells).toHaveLength(1)
      expect(result.cells[0]).toMatchObject({ value: 180.5, note: '' })
    })

    it('parses "180.5" with US decimal as value=180.5', () => {
      const result = parseWideFormat('Namn\tBenböj\nOscar\t180.5')
      expect(result.cells).toHaveLength(1)
      expect(result.cells[0]).toMatchObject({ value: 180.5, note: '' })
    })

    it('parses "180 Hex PR" with multi-word annotation', () => {
      const result = parseWideFormat('Namn\tBenböj\nOscar\t180 Hex PR')
      expect(result.cells).toHaveLength(1)
      expect(result.cells[0]).toMatchObject({ value: 180, note: 'Hex PR' })
    })

    it('treats bare empty cell as no value (no emit)', () => {
      const result = parseWideFormat('Namn\tBenböj\tBänkpress\nOscar\t\t100')
      expect(result.cells).toHaveLength(1)
      expect(result.cells[0]).toMatchObject({ value: 100, colIndex: 1 })
    })

    it('treats "-" as no value (no emit)', () => {
      const result = parseWideFormat('Namn\tBenböj\tBänkpress\nOscar\t-\t100')
      expect(result.cells).toHaveLength(1)
      expect(result.cells[0]).toMatchObject({ value: 100, colIndex: 1 })
    })

    it('treats "—" (em-dash) as no value (no emit)', () => {
      const result = parseWideFormat('Namn\tBenböj\tBänkpress\nOscar\t—\t100')
      expect(result.cells).toHaveLength(1)
      expect(result.cells[0]).toMatchObject({ value: 100, colIndex: 1 })
    })

    it('treats "–" (en-dash) as no value (no emit)', () => {
      const result = parseWideFormat('Namn\tBenböj\tBänkpress\nOscar\t–\t100')
      expect(result.cells).toHaveLength(1)
      expect(result.cells[0]).toMatchObject({ value: 100, colIndex: 1 })
    })

    it('treats non-numeric "DNF" as no value (no emit)', () => {
      const result = parseWideFormat('Namn\tBenböj\tBänkpress\nOscar\tDNF\t100')
      expect(result.cells).toHaveLength(1)
      expect(result.cells[0]).toMatchObject({ value: 100, colIndex: 1 })
    })
  })

  describe('Vikt column detection + stripping', () => {
    it('detects "Vikt" header (case-insensitive)', () => {
      const result = parseWideFormat('Namn\tBenböj\tVikt\nOscar\t180\t82.4')
      expect(result.bodyWeightDetected).toBe(true)
      expect(result.headers).toEqual(['Benböj'])
      expect(result.cells).toHaveLength(1)
      expect(result.cells[0]).toMatchObject({ value: 180, bodyWeight: 82.4 })
    })

    it('detects "vikt" lowercase', () => {
      const result = parseWideFormat('Namn\tBenböj\tvikt\nOscar\t180\t82.4')
      expect(result.bodyWeightDetected).toBe(true)
      expect(result.headers).toEqual(['Benböj'])
    })

    it('detects "Bodyweight" header', () => {
      const result = parseWideFormat('Namn\tBenböj\tBodyweight\nOscar\t180\t82.4')
      expect(result.bodyWeightDetected).toBe(true)
      expect(result.headers).toEqual(['Benböj'])
      expect(result.cells[0]).toMatchObject({ bodyWeight: 82.4 })
    })

    it('detects "Kroppsvikt" header', () => {
      const result = parseWideFormat('Namn\tBenböj\tKroppsvikt\nOscar\t180\t82.4')
      expect(result.bodyWeightDetected).toBe(true)
      expect(result.headers).toEqual(['Benböj'])
      expect(result.cells[0]).toMatchObject({ bodyWeight: 82.4 })
    })

    it('detects "BW" header', () => {
      const result = parseWideFormat('Namn\tBenböj\tBW\nOscar\t180\t82.4')
      expect(result.bodyWeightDetected).toBe(true)
      expect(result.headers).toEqual(['Benböj'])
      expect(result.cells[0]).toMatchObject({ bodyWeight: 82.4 })
    })

    it('detects "bw" lowercase', () => {
      const result = parseWideFormat('Namn\tBenböj\tbw\nOscar\t180\t82.4')
      expect(result.bodyWeightDetected).toBe(true)
    })

    it('does NOT include the bodyweight column in headers', () => {
      const result = parseWideFormat('Namn\tBenböj\tVikt\tBänkpress\nOscar\t180\t82.4\t100')
      expect(result.headers).toEqual(['Benböj', 'Bänkpress'])
      expect(result.headers).not.toContain('Vikt')
    })

    it('attaches bodyWeight to every cell on a row', () => {
      const result = parseWideFormat('Namn\tBenböj\tVikt\tBänkpress\nOscar\t180\t82.4\t100')
      expect(result.cells).toHaveLength(2)
      expect(result.cells[0]).toMatchObject({ value: 180, bodyWeight: 82.4 })
      expect(result.cells[1]).toMatchObject({ value: 100, bodyWeight: 82.4 })
    })

    it('sets bodyWeight=null on cells when no bodyweight column present', () => {
      const result = parseWideFormat('Namn\tBenböj\tBänkpress\nOscar\t180\t100')
      expect(result.bodyWeightDetected).toBe(false)
      expect(result.cells).toHaveLength(2)
      expect(result.cells[0].bodyWeight).toBeNull()
      expect(result.cells[1].bodyWeight).toBeNull()
    })

    it('sets bodyWeight=null on cells when the bodyweight column exists but the cell is blank', () => {
      const result = parseWideFormat('Namn\tBenböj\tVikt\nOscar\t180\t\nEdward\t160\t79.6')
      expect(result.bodyWeightDetected).toBe(true)
      expect(result.cells).toHaveLength(2)
      expect(result.cells[0]).toMatchObject({ rawName: 'Oscar', bodyWeight: null })
      expect(result.cells[1]).toMatchObject({ rawName: 'Edward', bodyWeight: 79.6 })
    })
  })

  describe('indices', () => {
    it('colIndex aligns with headers AFTER bodyweight stripping', () => {
      // Vikt is in the middle: between Benböj and Bänkpress.
      // After stripping, headers = [Benböj, Bänkpress]. Bänkpress should be colIndex=1.
      const result = parseWideFormat('Namn\tBenböj\tVikt\tBänkpress\nOscar\t180\t82.4\t100')
      expect(result.headers).toEqual(['Benböj', 'Bänkpress'])
      const benboj = result.cells.find((c) => c.rawHeader === 'Benböj')
      const bank = result.cells.find((c) => c.rawHeader === 'Bänkpress')
      expect(benboj?.colIndex).toBe(0)
      expect(bank?.colIndex).toBe(1)
    })

    it('rowIndex skips empty/nameless rows', () => {
      const paste =
        'Namn\tBenböj\n' +
        'Oscar\t180\n' +
        '\t150\n' + // nameless — should be dropped, no rowIndex consumed
        'Edward\t160'
      const result = parseWideFormat(paste)
      expect(result.names).toEqual(['Oscar', 'Edward'])
      expect(result.cells).toHaveLength(2)
      expect(result.cells[0]).toMatchObject({ rawName: 'Oscar', rowIndex: 0, value: 180 })
      expect(result.cells[1]).toMatchObject({ rawName: 'Edward', rowIndex: 1, value: 160 })
    })
  })

  describe('skipped rows', () => {
    it('drops rows where the name cell is blank entirely', () => {
      const paste = 'Namn\tBenböj\nOscar\t180\n\t999\nEdward\t160'
      const result = parseWideFormat(paste)
      expect(result.names).toEqual(['Oscar', 'Edward'])
      // No cell from the nameless row should appear, even though "999" is parseable.
      expect(result.cells.find((c) => c.value === 999)).toBeUndefined()
    })

    it('drops rows where the name cell is whitespace-only', () => {
      const paste = 'Namn\tBenböj\nOscar\t180\n   \t999\nEdward\t160'
      const result = parseWideFormat(paste)
      expect(result.names).toEqual(['Oscar', 'Edward'])
      expect(result.cells.find((c) => c.value === 999)).toBeUndefined()
    })
  })

  describe('cell emission', () => {
    it('only emits cells with parseable numeric values', () => {
      const paste = 'Namn\tA\tB\tC\tD\nOscar\t100\t\t-\tDNF'
      const result = parseWideFormat(paste)
      expect(result.cells).toHaveLength(1)
      expect(result.cells[0]).toMatchObject({ value: 100, colIndex: 0 })
    })

    it('does not emit cells for em-dash, en-dash, or hyphen', () => {
      const paste = 'Namn\tA\tB\tC\nOscar\t-\t—\t–'
      const result = parseWideFormat(paste)
      expect(result.cells).toHaveLength(0)
    })
  })

  describe('realistic full sheet', () => {
    it('parses a multi-row, multi-column sample mirroring the photo', () => {
      const paste =
        'Namn\tBenböj\tFrivändning\tBänkpress\tChins\tVikt\n' +
        'Oscar Nilsson\t\t180 Hex\t\t25\t82.4\n' +
        'Edward Björk\t160\t100\t\t25\t79.6\n' +
        'Lukas Andersson\t170\t110\t120\t30\t85.2'

      const result = parseWideFormat(paste)

      expect(result.bodyWeightDetected).toBe(true)
      expect(result.headers).toEqual(['Benböj', 'Frivändning', 'Bänkpress', 'Chins'])
      expect(result.headers).toHaveLength(4)
      expect(result.names).toEqual(['Oscar Nilsson', 'Edward Björk', 'Lukas Andersson'])
      expect(result.names).toHaveLength(3)

      // Oscar: 180 Hex (Frivändning) + 25 (Chins) = 2 cells
      // Edward: 160 + 100 + 25 = 3 cells
      // Lukas: 170 + 110 + 120 + 30 = 4 cells
      // Total = 9
      expect(result.cells).toHaveLength(9)

      // Spot-check Oscar's Frivändning with annotation
      const oscarFriv = result.cells.find(
        (c) => c.rawName === 'Oscar Nilsson' && c.rawHeader === 'Frivändning',
      )
      expect(oscarFriv).toMatchObject({
        rowIndex: 0,
        colIndex: 1,
        rawName: 'Oscar Nilsson',
        rawHeader: 'Frivändning',
        value: 180,
        note: 'Hex',
        bodyWeight: 82.4,
      })

      // Spot-check Lukas's Bänkpress
      const lukasBank = result.cells.find(
        (c) => c.rawName === 'Lukas Andersson' && c.rawHeader === 'Bänkpress',
      )
      expect(lukasBank).toMatchObject({
        rowIndex: 2,
        colIndex: 2,
        value: 120,
        note: '',
        bodyWeight: 85.2,
      })

      // Edward's Chins should be colIndex=3 (after Vikt stripped)
      const edwardChins = result.cells.find(
        (c) => c.rawName === 'Edward Björk' && c.rawHeader === 'Chins',
      )
      expect(edwardChins).toMatchObject({
        rowIndex: 1,
        colIndex: 3,
        value: 25,
        bodyWeight: 79.6,
      })

      // Oscar's Benböj cell should NOT exist (empty)
      const oscarBenboj = result.cells.find(
        (c) => c.rawName === 'Oscar Nilsson' && c.rawHeader === 'Benböj',
      )
      expect(oscarBenboj).toBeUndefined()
    })
  })

  describe('whitespace tolerance', () => {
    it('trims leading/trailing whitespace in cells', () => {
      const result = parseWideFormat('Namn\tBenböj\n  Oscar  \t  180  ')
      expect(result.names).toEqual(['Oscar'])
      expect(result.cells).toHaveLength(1)
      expect(result.cells[0]).toMatchObject({ rawName: 'Oscar', value: 180 })
    })

    it('trims leading/trailing whitespace in headers', () => {
      const result = parseWideFormat('Namn\t  Benböj  \t  Vikt  \nOscar\t180\t82.4')
      expect(result.headers).toEqual(['Benböj'])
      expect(result.bodyWeightDetected).toBe(true)
      expect(result.cells[0]).toMatchObject({ rawHeader: 'Benböj', bodyWeight: 82.4 })
    })

    it('trims whitespace around annotations', () => {
      const result = parseWideFormat('Namn\tBenböj\nOscar\t180   Hex   ')
      expect(result.cells[0]).toMatchObject({ value: 180, note: 'Hex' })
    })
  })

  describe('CRLF line endings', () => {
    it('parses CRLF (\\r\\n) the same as LF', () => {
      const lf = parseWideFormat('Namn\tBenböj\nOscar\t180\nEdward\t160')
      const crlf = parseWideFormat('Namn\tBenböj\r\nOscar\t180\r\nEdward\t160')
      expect(crlf.headers).toEqual(lf.headers)
      expect(crlf.names).toEqual(lf.names)
      expect(crlf.cells).toEqual(lf.cells)
    })

    it('handles trailing CRLF without producing an empty row', () => {
      const result = parseWideFormat('Namn\tBenböj\r\nOscar\t180\r\n')
      expect(result.names).toEqual(['Oscar'])
      expect(result.cells).toHaveLength(1)
    })
  })
})
