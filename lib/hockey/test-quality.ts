export type HockeyQualityFlagSeverity = 'info' | 'warning'
type AppLocale = 'en' | 'sv'

export interface HockeyQualityFlag {
  key: string
  severity: HockeyQualityFlagSeverity
  label: string
  detail: string
}

export interface HockeyQualityInput {
  metrics: Record<string, number | null | undefined>
  endurance7x40?: unknown
  muscleLabMaxima?: unknown
}

function numberFromJson(value: unknown, key: string): number | null {
  if (!value || typeof value !== 'object') return null
  const raw = (value as Record<string, unknown>)[key]
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null
}

function numberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is number => typeof entry === 'number' && Number.isFinite(entry))
}

function pctDiff(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null || b == null || a <= 0 || b <= 0) return null
  return Math.abs(a - b) / ((a + b) / 2) * 100
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function pushFlag(flags: HockeyQualityFlag[], key: string, severity: HockeyQualityFlagSeverity, label: string, detail: string) {
  flags.push({ key, severity, label, detail })
}

export function buildHockeyQualityFlags(input: HockeyQualityInput, locale: AppLocale = 'en'): HockeyQualityFlag[] {
  const { metrics } = input
  const flags: HockeyQualityFlag[] = []

  const sprint5m = metrics.sprint5m
  const sprint10m = metrics.sprint10m
  const sprint20m = metrics.sprint20m
  const sprint30m = metrics.sprint30m

  if (sprint5m != null && sprint10m != null && sprint10m <= sprint5m) {
    pushFlag(flags, 'sprint10m', 'warning', t(locale, 'Check 5-10 m sprint', 'Kontrollera 5-10m sprint'), t(locale, '10 m total time cannot be faster than or equal to 5 m total time.', '10m total tid kan inte vara snabbare än eller lika med 5m total tid.'))
  }
  if (sprint10m != null && sprint20m != null && sprint20m <= sprint10m) {
    pushFlag(flags, 'sprint20m', 'warning', t(locale, 'Check 10-20 m sprint', 'Kontrollera 10-20m sprint'), t(locale, '20 m total time cannot be faster than or equal to 10 m total time.', '20m total tid kan inte vara snabbare än eller lika med 10m total tid.'))
  }
  if (sprint20m != null && sprint30m != null && sprint30m <= sprint20m) {
    pushFlag(flags, 'sprint30m', 'warning', t(locale, 'Check 20-30 m sprint', 'Kontrollera 20-30m sprint'), t(locale, '30 m total time cannot be faster than or equal to 20 m total time.', '30m total tid kan inte vara snabbare än eller lika med 20m total tid.'))
  }

  if (sprint5m != null && sprint10m != null && sprint5m > 0 && sprint10m > 0) {
    const firstFiveSpeed = 5 / sprint5m
    const tenSpeed = 10 / sprint10m
    if (firstFiveSpeed > tenSpeed * 1.25) {
      pushFlag(flags, 'sprint5m', 'info', t(locale, 'Unusual acceleration profile', 'Ovanlig accelerationsprofil'), t(locale, '5 m speed is very high relative to 10 m. Check start/trigger and split registration.', '5m-farten är mycket hög relativt 10m. Kontrollera start/trigger och splitregistrering.'))
    }
  }

  const enduranceTimes = numberArray(input.endurance7x40)
  if (input.endurance7x40 != null && enduranceTimes.length !== 7) {
    pushFlag(flags, 'endurance7x40', 'warning', t(locale, '7x40 missing repetitions', '7x40 saknar repetitioner'), t(locale, `Expected 7 times but found ${enduranceTimes.length}.`, `Förväntade 7 tider men hittade ${enduranceTimes.length}.`))
  }
  if (metrics.enduranceFatigueDrop != null && metrics.enduranceFatigueDrop >= 12) {
    pushFlag(flags, 'enduranceFatigueDrop', 'warning', t(locale, 'Large 7x40 drop', 'Stor 7x40 drop'), t(locale, `${metrics.enduranceFatigueDrop.toFixed(1)}% drop suggests fatigue, pacing, or recovery issues.`, `${metrics.enduranceFatigueDrop.toFixed(1)}% drop tyder på trötthet, pacing eller återhämtningsproblem.`))
  }
  if (metrics.endurance7x40DecrementPct != null && metrics.endurance7x40DecrementPct >= 8) {
    pushFlag(flags, 'endurance7x40DecrementPct', 'warning', t(locale, 'High sprint decrement', 'Hög sprintdecrement'), t(locale, `${metrics.endurance7x40DecrementPct.toFixed(1)}% decrement across 7x40.`, `${metrics.endurance7x40DecrementPct.toFixed(1)}% decrement över 7x40.`))
  }

  const threeJumpAsymmetry = pctDiff(metrics.threeJumpLeft, metrics.threeJumpRight)
  if (threeJumpAsymmetry != null && threeJumpAsymmetry >= 10) {
    pushFlag(flags, 'threeJumpAsymmetry', 'warning', t(locale, '3-hop asymmetry', '3-steg asymmetri'), t(locale, `${threeJumpAsymmetry.toFixed(1)}% difference between right and left.`, `${threeJumpAsymmetry.toFixed(1)}% skillnad mellan höger och vänster.`))
  }
  const gripAsymmetry = pctDiff(metrics.gripStrengthLeft, metrics.gripStrengthRight)
  if (gripAsymmetry != null && gripAsymmetry >= 15) {
    pushFlag(flags, 'gripAsymmetry', 'info', t(locale, 'Grip asymmetry', 'Greppasymmetri'), t(locale, `${gripAsymmetry.toFixed(1)}% difference between right and left grip strength.`, `${gripAsymmetry.toFixed(1)}% skillnad mellan höger och vänster greppstyrka.`))
  }
  const agilityAsymmetry = pctDiff(metrics.agility505Left, metrics.agility505Right)
  if (agilityAsymmetry != null && agilityAsymmetry >= 5) {
    pushFlag(flags, 'agilityAsymmetry', 'warning', t(locale, '5-10-5 asymmetry', '5-10-5 asymmetri'), t(locale, `${agilityAsymmetry.toFixed(1)}% difference between sides.`, `${agilityAsymmetry.toFixed(1)}% skillnad mellan sidor.`))
  }

  const standingLongJump = metrics.standingLongJump
  if (standingLongJump != null && (standingLongJump < 120 || standingLongJump > 360)) {
    pushFlag(flags, 'standingLongJump', 'info', t(locale, 'Check standing long jump', 'Kontrollera längdhopp'), t(locale, `${standingLongJump.toFixed(0)} cm is outside the expected hockey range.`, `${standingLongJump.toFixed(0)} cm ligger utanför förväntat hockeyspann.`))
  }

  const muscleLabWkg = metrics.muscleLabWkg ?? numberFromJson(input.muscleLabMaxima, 'maxAveragePowerPerBodyMass')
  if (muscleLabWkg != null && (muscleLabWkg < 10 || muscleLabWkg > 45)) {
    pushFlag(flags, 'muscleLabWkg', 'info', t(locale, 'Check MuscleLab W/kg', 'Kontrollera MuscleLab W/kg'), t(locale, `${muscleLabWkg.toFixed(1)} W/kg is outside the expected report range.`, `${muscleLabWkg.toFixed(1)} W/kg ligger utanför förväntat rapportspann.`))
  }
  const peakVelocity = numberFromJson(input.muscleLabMaxima, 'maxPeakVelocity')
  if (peakVelocity != null && peakVelocity > 5) {
    pushFlag(flags, 'muscleLabVelocity', 'info', t(locale, 'Check peak velocity', 'Kontrollera peak velocity'), t(locale, `${peakVelocity.toFixed(2)} m/s is high. Make sure the export matches the protocol.`, `${peakVelocity.toFixed(2)} m/s är högt. Säkerställ att exporten matchar protokollet.`))
  }

  if (flags.length === 0 && Object.values(metrics).some((value) => value != null)) {
    pushFlag(flags, 'quality-ok', 'info', t(locale, 'Test quality OK', 'Testkvalitet OK'), t(locale, 'No automatic data-quality flags were found in the latest hockey test.', 'Inga automatiska datakvalitetsflaggor hittades i senaste hockeytestet.'))
  }

  return flags.slice(0, 8)
}
