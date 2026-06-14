# Garmin Production Follow-Up Readiness

Last updated: June 14, 2026

Trainomics production app status:

- Production app name: Trainomics
- Approved APIs: Activity, Health, Training
- OAuth callback: `https://trainomics.app/api/integrations/garmin/callback`
- Webhook endpoint: `https://garmin-webhook.trainomics.app/api/integrations/garmin/webhook`
- Privacy anchor: `https://trainomics.app/privacy#garmin-data-processing`
- Production credentials are configured in Vercel for `GARMIN_CLIENT_ID` and `GARMIN_CLIENT_SECRET`.
- `GARMIN_WEBHOOK_VERIFY_TOKEN` should stay unchanged unless the Garmin portal webhook verification token is changed.

Production review checklist:

- Keep the production app behavior aligned with the approved evaluation app.
- Keep Garmin branding limited to approved places: connection card, Garmin-attributed health/activity views, and Garmin push/status controls.
- Do not change Garmin data handling in the Privacy Policy without written Garmin approval first.
- Confirm Activity data arrives through PUSH/PING webhooks after the first real user activity.
- Confirm Health data arrives through PUSH/PING webhooks after the first real wellness/body-composition update.
- Confirm Training API works in production by sending one cardio workout and one strength workout to Garmin Connect.
- Confirm pushed strength assignments show a Garmin badge in the athlete strength view.
- Confirm completed Garmin strength activities mark the matching Trainomics strength assignment as completed.

