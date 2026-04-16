import type { TestData } from './types'

/** Calculate training zones from lactate test results. */
export function calculateZonesFromTest(test: TestData): string {
  const lt1 = test.aerobicThreshold;
  const lt2 = test.anaerobicThreshold;

  if (!lt1 && !lt2) return '';

  let zones = '\n### Beräknade träningszoner';

  if (lt1?.hr && lt2?.hr && test.maxHR) {
    const maxHR = test.maxHR;
    zones += `
| Zon | Namn | HR-intervall | % maxHR |
|-----|------|--------------|---------|
| Z1 | Återhämtning | <${Math.round(lt1.hr * 0.9)} | <${Math.round((lt1.hr * 0.9 / maxHR) * 100)}% |
| Z2 | Aerob bas | ${Math.round(lt1.hr * 0.9)}-${lt1.hr} | ${Math.round((lt1.hr * 0.9 / maxHR) * 100)}-${Math.round((lt1.hr / maxHR) * 100)}% |
| Z3 | Tempo | ${lt1.hr}-${Math.round((lt1.hr + lt2.hr) / 2)} | ${Math.round((lt1.hr / maxHR) * 100)}-${Math.round(((lt1.hr + lt2.hr) / 2 / maxHR) * 100)}% |
| Z4 | Tröskel | ${Math.round((lt1.hr + lt2.hr) / 2)}-${lt2.hr} | ${Math.round(((lt1.hr + lt2.hr) / 2 / maxHR) * 100)}-${Math.round((lt2.hr / maxHR) * 100)}% |
| Z5 | VO2max | ${lt2.hr}-${maxHR} | ${Math.round((lt2.hr / maxHR) * 100)}-100% |`;
  }

  return zones;
}
