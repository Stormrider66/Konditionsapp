/**
 * ACWR needs enough daily summary history before it is a useful risk signal.
 * The athlete training-load endpoint already treats fewer than 21 observed
 * days as insufficient; keep team/cron surfaces aligned with that policy.
 */
export const MIN_RELIABLE_ACWR_SUMMARY_DAYS = 21

export function hasReliableAcwrSummary(summaryDays: number): boolean {
  return summaryDays >= MIN_RELIABLE_ACWR_SUMMARY_DAYS
}
