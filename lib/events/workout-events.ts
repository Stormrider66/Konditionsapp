/**
 * Client-side event signalling for workout mutations.
 *
 * `NutritionDashboard` listens for `workout-logged` to re-fetch today's
 * macro targets when a workout is planned, completed, edited, or cancelled.
 */

export function emitWorkoutLogged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('workout-logged'))
}
