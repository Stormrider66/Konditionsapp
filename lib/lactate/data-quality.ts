// Helper to detect significant lactate decreases between stages.
export function detectLactateDecreases(
  stages: Array<{ lactate: number }>
): Array<{ fromStage: number; toStage: number; drop: number }> {
  const warnings: Array<{ fromStage: number; toStage: number; drop: number }> = []
  for (let i = 1; i < stages.length; i++) {
    const drop = stages[i - 1].lactate - stages[i].lactate
    if (drop > 0.3) {
      warnings.push({
        fromStage: i,
        toStage: i + 1,
        drop: Math.round(drop * 100) / 100,
      })
    }
  }
  return warnings
}
