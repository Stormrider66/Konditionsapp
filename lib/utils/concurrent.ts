/**
 * Concurrency helpers
 *
 * Shared utilities for processing collections in bounded, concurrent
 * batches. Cron jobs across the app (coach-alerts, preworkout-nudges,
 * trial-warnings, expire-trials, mental-prep, injury-digest, …) all
 * use the same hand-rolled pattern of chunking a list, running the
 * chunk through Promise.all, aggregating outcomes, and optionally
 * bailing out on an execution-budget timeout. This module centralises
 * that pattern so each caller only has to describe the work.
 */

export interface ProcessInBatchesOptions {
  /** How many items may be in-flight concurrently inside one chunk */
  concurrency: number
  /**
   * Optional early-stop predicate evaluated before each chunk. Return
   * true to stop processing additional chunks (e.g. time-budget check).
   */
  shouldStop?: () => boolean
}

/**
 * Process `items` in concurrent chunks of size `concurrency`, yielding
 * each chunk's outcomes in order as they complete. Callers can accumulate
 * results, check per-chunk early-exit conditions (e.g. an outer batch
 * limit), and break out of the iteration normally.
 *
 * Example:
 *
 *     for await (const outcomes of processInBatches(athletes, processAthlete, {
 *       concurrency: 6,
 *       shouldStop: () => Date.now() - startTime >= executionBudgetMs,
 *     })) {
 *       for (const outcome of outcomes) {
 *         results.processed++
 *         // …
 *       }
 *       if (results.processed >= batchLimit) break
 *     }
 */
export async function* processInBatches<T, R>(
  items: readonly T[],
  fn: (item: T) => Promise<R>,
  options: ProcessInBatchesOptions
): AsyncGenerator<R[], void, void> {
  const { concurrency, shouldStop } = options
  if (concurrency < 1) {
    throw new Error('processInBatches: concurrency must be >= 1')
  }

  for (let i = 0; i < items.length; i += concurrency) {
    if (shouldStop?.()) {
      return
    }
    const chunk = items.slice(i, i + concurrency)
    const outcomes = await Promise.all(chunk.map((item) => fn(item)))
    yield outcomes
  }
}
