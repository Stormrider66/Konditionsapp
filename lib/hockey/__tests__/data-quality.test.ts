import {
  buildHockeyDataQuality,
  buildSimcaExportQualitySummary,
  buildSimcaRowQuality,
} from '../data-quality'

describe('hockey data quality', () => {
  it('calculates battery coverage, missing required labels and SIMCA-ready athletes', () => {
    const quality = buildHockeyDataQuality([
      {
        id: 'ready',
        name: 'Ready Player',
        position: { key: 'C', label: 'Center' },
        latestTestDate: '2026-04-30',
        metrics: {
          muscleLabWkg: 25,
          standingLongJump: 246,
          threeJumpBest: 720,
          backSquat1RM: 140,
          powerClean1RM: 80,
          benchPress1RM: 110,
          pullUp1RM: 35,
          gripMax: 58,
          sprint5m: 1.1,
          sprint10m: 1.8,
          sprint20m: 3.1,
          sprint30m: 4.2,
          agilityBest: 5.4,
          endurance7x40Best: 5.6,
          endurance7x40AverageKmh: 25,
          endurance7x40Resistance: 94,
          endurance7x40Drop: 6,
          vo2max: 58,
          lt2SpeedKmh: 15.2,
          lt2HeartRate: 176,
          maxHeartRate: 194,
          maxLactate: 12,
          rampDurationMin: 13,
        },
        qualityFlags: [],
      },
      {
        id: 'missing',
        name: 'Missing Player',
        position: { key: 'D', label: 'Defender' },
        latestTestDate: null,
        metrics: {
          muscleLabWkg: 22,
          sprint10m: 1.9,
        },
        qualityFlags: [{ severity: 'warning' }],
      },
    ], {
      labelForKey: (key) => ({
        standingLongJump: 'Standing long jump',
        powerClean1RM: 'Power clean',
        benchPress1RM: 'Bench press',
      }[key] ?? key),
    })

    expect(quality.analysisReadyAthletes).toBe(1)
    expect(quality.athletesWithoutTests).toBe(1)
    expect(quality.warningCount).toBe(1)
    expect(quality.watchlist[0]).toMatchObject({
      id: 'missing',
      name: 'Missing Player',
      latestTestDate: null,
    })
    expect(quality.watchlist[0].missingLabels).toContain('Standing long jump')
    expect(quality.areaSummaries.find((area) => area.area.id === 'strength')?.completeAthletes).toBe(1)
  })

  it('marks SIMCA rows ready only when required fields and core coverage pass', () => {
    const ready = buildSimcaRowQuality({
      musclelab_ap_w_per_kg_bw: 25,
      standing_long_jump_cm: 246,
      three_jump_best_cm: 720,
      back_squat_1rm_kg: 140,
      power_clean_1rm_kg: 80,
      bench_press_1rm_kg: 110,
      pullup_1rm_kg: 35,
      grip_max_kg: 58,
      sprint_5m_s: 1.1,
      sprint_10m_s: 1.8,
      sprint_20m_s: 3.1,
      sprint_30m_s: 4.2,
      agility_505_best_s: 5.4,
      endurance_7x40_best_s: 5.6,
      endurance_7x40_mean_kmh: 25,
      endurance_7x40_resistance_pct: 94,
      endurance_7x40_drop_pct: 6,
      vo2max_ml_kg_min: 58,
      lt2_speed_kmh: 15.2,
      lt2_heart_rate_bpm: 176,
      max_heart_rate_bpm: 194,
      max_lactate_mmol_l: 12,
      ramp_duration_min: 13,
    })
    const missing = buildSimcaRowQuality({
      musclelab_ap_w_per_kg_bw: 25,
      standing_long_jump_cm: null,
      sprint_10m_s: 1.8,
    })

    expect(ready.simca_row_core_coverage_pct).toBe(100)
    expect(ready.simca_row_required_missing_count).toBe(0)
    expect(ready.simca_row_analysis_ready).toBe(1)
    expect(missing.simca_row_analysis_ready).toBe(0)
    expect(missing.simca_row_required_missing_keys).toContain('standing_long_jump_cm')
  })

  it('summarizes SIMCA export readiness across rows', () => {
    const ready = {
      musclelab_ap_w_per_kg_bw: 25,
      standing_long_jump_cm: 246,
      back_squat_1rm_kg: 140,
      power_clean_1rm_kg: 80,
      bench_press_1rm_kg: 110,
      pullup_1rm_kg: 35,
      grip_max_kg: 58,
      three_jump_best_cm: 720,
      sprint_5m_s: 1.1,
      sprint_10m_s: 1.8,
      sprint_20m_s: 3.1,
      sprint_30m_s: 4.2,
      agility_505_best_s: 5.4,
      endurance_7x40_best_s: 5.6,
      endurance_7x40_mean_kmh: 25,
      endurance_7x40_resistance_pct: 94,
      endurance_7x40_drop_pct: 6,
      vo2max_ml_kg_min: 58,
      lt2_speed_kmh: 15.2,
      lt2_heart_rate_bpm: 176,
      max_heart_rate_bpm: 194,
      max_lactate_mmol_l: 12,
      ramp_duration_min: 13,
    }
    const missing = {
      musclelab_ap_w_per_kg_bw: 21,
      sprint_10m_s: 1.9,
    }
    const rows = [
      { ...ready, ...buildSimcaRowQuality(ready) },
      { ...missing, ...buildSimcaRowQuality(missing) },
    ]

    const summary = buildSimcaExportQualitySummary(rows)

    expect(summary.rowCount).toBe(2)
    expect(summary.analysisReadyRows).toBe(1)
    expect(summary.missingRequiredCells).toBeGreaterThan(0)
    expect(summary.areaCoverage.find((area) => area.id === 'power')?.coveragePercent).toBeGreaterThan(0)
  })
})
