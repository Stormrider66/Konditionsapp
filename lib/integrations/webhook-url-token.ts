import { timingSafeStringEqual } from '@/lib/security/timing-safe'

/**
 * Shared-secret gate for provider webhooks that don't sign their POST
 * requests (Strava, Garmin, Concept2). The secret is embedded as a
 * `?token=<secret>` query param in the webhook URL registered with the
 * provider, so only callers that know the registered URL pass.
 *
 * Opt-in for rollout safety: when the env secret is unset the gate is
 * open (existing registrations keep working). To enable, set the env var
 * AND re-register the provider webhook URL with the token included.
 */
export function verifyWebhookUrlToken(
  providedToken: string | null,
  expectedToken: string | undefined
): boolean {
  if (!expectedToken) return true
  return !!providedToken && timingSafeStringEqual(providedToken, expectedToken)
}
