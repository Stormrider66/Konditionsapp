
/**
 * Generate upgrade prompt for FREE tier users trying to access AI
 */
export function getUpgradePrompt(): string {
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
