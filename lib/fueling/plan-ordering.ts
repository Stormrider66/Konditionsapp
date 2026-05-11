export interface FuelingPlanOrderable {
  raceDate: Date | string | null
  createdAt: Date | string
  updatedAt: Date | string
}

export function sortFuelingPlansForDisplay<T extends FuelingPlanOrderable>(
  plans: T[],
  today = new Date()
): T[] {
  const startOfToday = startOfDay(today).getTime()

  return [...plans].sort((a, b) => {
    const groupA = planOrderGroup(a, startOfToday)
    const groupB = planOrderGroup(b, startOfToday)
    if (groupA !== groupB) return groupA - groupB

    if (groupA === 0) {
      const dateDiff = toTime(a.raceDate) - toTime(b.raceDate)
      return dateDiff || toTime(b.updatedAt) - toTime(a.updatedAt)
    }
    if (groupA === 2) {
      const dateDiff = toTime(b.raceDate) - toTime(a.raceDate)
      return dateDiff || toTime(b.updatedAt) - toTime(a.updatedAt)
    }
    return toTime(b.updatedAt) - toTime(a.updatedAt)
  })
}

function planOrderGroup(plan: FuelingPlanOrderable, startOfToday: number): number {
  if (!plan.raceDate) return 1
  return toTime(plan.raceDate) >= startOfToday ? 0 : 2
}

function toTime(value: Date | string | null): number {
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : 0
}

function startOfDay(value: Date): Date {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}
