import type { MVAWarning, PCAModelResult, PLSModelResult } from './types'

/**
 * Model-reliability heuristics for team MVA.
 *
 * Small squads with many variables make PCA/PLS prone to instability and
 * overfitting. SIMCA practitioners read R²/Q² gaps and observation-to-variable
 * ratios by eye; these helpers encode the same checks so the coach gets an
 * explicit, localized warning instead of an over-confident model.
 */

const HIGH_IMPUTATION_RATIO = 0.2 // >20% of cells imputed → treat with caution
const MIN_OBS_PER_VARIABLE = 3 // rule-of-thumb floor for stable components

function imputationRatio(model: { nObservations: number; nXVariables: number; imputedCells: number }): number {
  const cells = model.nObservations * model.nXVariables
  return cells > 0 ? model.imputedCells / cells : 0
}

export function assessPCAReliability(result: PCAModelResult): MVAWarning[] {
  const warnings: MVAWarning[] = []
  const nObs = result.athleteIds.length
  const nVars = result.variableIds.length
  const imputed = result.preprocessedData.imputedCells

  if (nVars > 0 && nObs / nVars < MIN_OBS_PER_VARIABLE) {
    warnings.push({
      code: 'low_obs_per_variable',
      severity: 'warning',
      messageEn: `Only ${nObs} players for ${nVars} variables (< ${MIN_OBS_PER_VARIABLE}:1). Principal components can be unstable — prefer fewer, high-coverage variables.`,
      messageSv: `Bara ${nObs} spelare för ${nVars} variabler (< ${MIN_OBS_PER_VARIABLE}:1). Huvudkomponenterna kan bli instabila — välj färre variabler med hög täckning.`,
    })
  }

  const ratio = imputationRatio({ nObservations: nObs, nXVariables: nVars, imputedCells: imputed })
  if (ratio > HIGH_IMPUTATION_RATIO) {
    warnings.push({
      code: 'high_imputation',
      severity: 'warning',
      messageEn: `${Math.round(ratio * 100)}% of cells were imputed with the column mean. The map leans on filled-in data — collect the missing tests before acting on outliers.`,
      messageSv: `${Math.round(ratio * 100)}% av cellerna imputerades med kolumnmedel. Kartan vilar på ifylld data — samla in saknade tester innan du agerar på outliers.`,
    })
  }

  const cumulative = result.cumulativeVariance[result.cumulativeVariance.length - 1] ?? 0
  if (cumulative > 0 && cumulative < 0.5) {
    warnings.push({
      code: 'low_explained_variance',
      severity: 'info',
      messageEn: `The selected components explain only ${Math.round(cumulative * 100)}% of total variance — much of the spread between players is not captured by this map.`,
      messageSv: `De valda komponenterna förklarar bara ${Math.round(cumulative * 100)}% av total varians — mycket av spridningen mellan spelare fångas inte av kartan.`,
    })
  }

  return warnings
}

export function assessPLSReliability(result: PLSModelResult): MVAWarning[] {
  const warnings: MVAWarning[] = []
  const nObs = result.athleteIds.length
  const imputed = result.preprocessedData.imputedCells
  const nVars = result.xVariableIds.length

  if (result.q2 < 0) {
    warnings.push({
      code: 'q2_negative',
      severity: 'warning',
      messageEn: `Q² is ${result.q2.toFixed(2)} (< 0): the model predicts new players worse than the team average. Do not use it for selection — treat the drivers as exploratory only.`,
      messageSv: `Q² är ${result.q2.toFixed(2)} (< 0): modellen förutsäger nya spelare sämre än lagets medel. Använd den inte för uttagning — se drivkrafterna som enbart utforskande.`,
    })
  } else if (result.q2 < 0.05) {
    warnings.push({
      code: 'q2_weak',
      severity: 'info',
      messageEn: `Q² is only ${result.q2.toFixed(2)} — weak cross-validated predictive power. The drivers are directional, not reliable predictors.`,
      messageSv: `Q² är bara ${result.q2.toFixed(2)} — svag korsvaliderad prediktionsförmåga. Drivkrafterna är riktningsgivande, inte tillförlitliga prediktorer.`,
    })
  }

  if (result.r2Y - result.q2 > 0.3) {
    warnings.push({
      code: 'overfit_gap',
      severity: 'warning',
      messageEn: `Large gap between fit (R²Y=${result.r2Y.toFixed(2)}) and cross-validation (Q²=${result.q2.toFixed(2)}) suggests overfitting. The model memorises this squad more than it generalises.`,
      messageSv: `Stort gap mellan anpassning (R²Y=${result.r2Y.toFixed(2)}) och korsvalidering (Q²=${result.q2.toFixed(2)}) tyder på överanpassning. Modellen lär sig detta lag mer än den generaliserar.`,
    })
  }

  if (nVars > 0 && nObs / nVars < MIN_OBS_PER_VARIABLE) {
    warnings.push({
      code: 'low_obs_per_variable',
      severity: 'warning',
      messageEn: `Only ${nObs} players for ${nVars} X-variables (< ${MIN_OBS_PER_VARIABLE}:1). VIP rankings can shift with a single player — interpret with caution.`,
      messageSv: `Bara ${nObs} spelare för ${nVars} X-variabler (< ${MIN_OBS_PER_VARIABLE}:1). VIP-rankningen kan ändras av en enda spelare — tolka försiktigt.`,
    })
  }

  const ratio = imputationRatio({ nObservations: nObs, nXVariables: nVars, imputedCells: imputed })
  if (ratio > HIGH_IMPUTATION_RATIO) {
    warnings.push({
      code: 'high_imputation',
      severity: 'warning',
      messageEn: `${Math.round(ratio * 100)}% of X-cells were imputed with the column mean, which weakens the associations behind the VIP scores.`,
      messageSv: `${Math.round(ratio * 100)}% av X-cellerna imputerades med kolumnmedel, vilket försvagar sambanden bakom VIP-värdena.`,
    })
  }

  return warnings
}
