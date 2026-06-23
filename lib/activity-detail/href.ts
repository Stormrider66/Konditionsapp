/**
 * Maps an activity (from the recent-activity feed or the dashboard hero) to its
 * detail destination. Cardio/stream + AI sources go to the unified
 * `/athlete/activity/[source]/[id]` view; sources with a dedicated page link
 * there directly. `+garmin` source variants are normalized to their base.
 *
 * Returns undefined when the activity can't be deep-linked (e.g. a hybrid log
 * without its workout-template id, which the hybrid route is keyed by).
 */
export function resolveActivityDetailHref(
  source: string,
  id: string,
  basePath: string,
  opts?: { hybridWorkoutId?: string | null }
): string | undefined {
  const base = source.replace('+garmin', '')
  switch (base) {
    case 'quickerg':
      return `${basePath}/athlete/quick-erg/${id}`
    case 'garmin':
    case 'strava':
    case 'concept2':
    case 'phonerun':
    case 'manual':
    case 'ai':
      return `${basePath}/athlete/activity/${base}/${id}`
    case 'adhoc':
      return `${basePath}/athlete/ad-hoc/${id}`
    case 'hybrid':
      return opts?.hybridWorkoutId
        ? `${basePath}/athlete/hybrid/${opts.hybridWorkoutId}`
        : undefined
    default:
      return undefined
  }
}
