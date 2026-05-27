import type { TestData } from './types'

type SportContextLocale = 'en' | 'sv'

function t(locale: SportContextLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

/** Calculate training zones from lactate test results. */
export function calculateZonesFromTest(test: TestData, locale: SportContextLocale = 'en'): string {
  const lt1 = test.aerobicThreshold;
  const lt2 = test.anaerobicThreshold;

  if (!lt1 && !lt2) return '';

  let zones = `\n### ${t(locale, 'Calculated training zones', 'Beräknade träningszoner')}`;

  if (lt1?.hr && lt2?.hr && test.maxHR) {
    const maxHR = test.maxHR;
    zones += `
| ${t(locale, 'Zone', 'Zon')} | ${t(locale, 'Name', 'Namn')} | ${t(locale, 'HR range', 'HR-intervall')} | % maxHR |
|-----|------|--------------|---------|
| Z1 | ${t(locale, 'Recovery', 'Återhämtning')} | <${Math.round(lt1.hr * 0.9)} | <${Math.round((lt1.hr * 0.9 / maxHR) * 100)}% |
| Z2 | ${t(locale, 'Aerobic base', 'Aerob bas')} | ${Math.round(lt1.hr * 0.9)}-${lt1.hr} | ${Math.round((lt1.hr * 0.9 / maxHR) * 100)}-${Math.round((lt1.hr / maxHR) * 100)}% |
| Z3 | Tempo | ${lt1.hr}-${Math.round((lt1.hr + lt2.hr) / 2)} | ${Math.round((lt1.hr / maxHR) * 100)}-${Math.round(((lt1.hr + lt2.hr) / 2 / maxHR) * 100)}% |
| Z4 | ${t(locale, 'Threshold', 'Tröskel')} | ${Math.round((lt1.hr + lt2.hr) / 2)}-${lt2.hr} | ${Math.round(((lt1.hr + lt2.hr) / 2 / maxHR) * 100)}-${Math.round((lt2.hr / maxHR) * 100)}% |
| Z5 | VO2max | ${lt2.hr}-${maxHR} | ${Math.round((lt2.hr / maxHR) * 100)}-100% |`;
  }

  return zones;
}
