
/**
 * Generate upgrade prompt for FREE tier users trying to access AI
 */
export function getUpgradePrompt(locale: 'en' | 'sv' = 'en'): string {
  if (locale === 'sv') {
    return `
## AI-coaching inte tillgänglig

Din nuvarande prenumeration (Gratis) inkluderar inte AI-coaching.

Uppgradera till **Standard** för att få:
- AI-coaching med 50 meddelanden per månad
- Daglig träningsloggning
- Garmin & Strava-synkning

Eller välj **Pro** för obegränsad AI-coaching, videoanalys och mer!

[Uppgradera nu](/athlete/subscription)
`;
  }

  return `
## AI coaching unavailable

Your current subscription (Free) does not include AI coaching.

Upgrade to **Standard** to get:
- AI coaching with 50 messages per month
- Daily training logging
- Garmin & Strava syncing

Or choose **Pro** for unlimited AI coaching, video analysis, and more.

[Upgrade now](/athlete/subscription)
`;
}
