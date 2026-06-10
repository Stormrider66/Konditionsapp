# Integrations: Strava, Garmin, Concept2, Oura, VBT and Timing Gates

Connect your training apps and devices so activities, recovery data, and ergometer results flow into the platform automatically.

## What it is

The platform connects to four cloud services — Strava, Garmin Connect, Concept2 Logbook, and Oura Ring — plus file-based imports for velocity-based training (VBT) devices and agility timing gates. Once connected, your workouts and health data sync in and show up in your activity feed, training load, and the AI coach's context, without manual logging.

## Where to find it (Athletes)

Go to **Settings** in the athlete menu. The **Integrations** card lists Strava, Garmin Connect, Concept2, and Oura Ring, each with a Connect button, connection status, and a "Last sync" timestamp once connected. A help icon on the card opens a detailed guide covering what each service syncs and how the data flows (device → service's cloud → this platform). VBT data has its own **VBT Data** page in the athlete menu, and agility/timing-gate results appear on the athlete **Agility** page.

## How it works

**Connecting.** Click "Connect" for a service. You are redirected to that provider's login page to authorize access, then sent back. Status changes to "Connected". To disconnect, click "Disconnect" — for Concept2 and Oura your historical synced data is kept.

**What each service syncs:**
- **Strava** — activities (running, trail/virtual running, cycling, MTB/gravel, swimming, walking, hiking, cross-country/roller skiing, strength training, rowing, and more) with distance, time, elevation, pace, heart rate, cadence, power, and calories. The platform computes training stress (TSS) and training impulse (TRIMP) for each activity using your own max and resting heart rate, and can fetch heart-rate streams for deeper analysis.
- **Garmin Connect** — HRV (heart-rate variability), sleep, stress level, resting heart rate, daily summaries, and activities. Garmin pushes data to the platform; wear your watch, sync it with the Garmin Connect app, and data arrives shortly after.
- **Concept2 Logbook** — RowErg, SkiErg, and BikeErg workouts with pace per 500 m, intervals, and heart rate. Using the ErgData phone app on the erg is the recommended way to get workouts into the Concept2 Logbook.
- **Oura Ring** — HRV, resting heart rate, sleep, and readiness.

**Automatic sync.** Strava and Concept2 notify the platform the moment a new activity or result is uploaded, so webhooks sync new workouts within minutes. Garmin pushes dailies, sleep, HRV, and activities as they arrive. Oura is also refreshed by a scheduled sync job.

**Manual sync.** Each connected card has a "Sync now" button: Strava re-checks roughly the last 30 days, Concept2 the last 90 days, Oura the last 3 days, and Garmin sends a push request (data then arrives shortly after).

**Recovery source.** If both Garmin and Oura are connected, a picker appears asking which device should provide HRV, resting heart rate, and sleep: Auto (Oura is preferred over Garmin), Garmin, or Oura.

**Where synced data shows up.** Your recent-activity feed merges manual logs, AI workouts, Strava, Garmin, and Concept2 entries, each tagged with a source badge. Synced activities feed your weekly training summary, training-load metrics (TSS/TRIMP), and ACWR monitoring, and give the AI coach real context about what you've actually done. Recovery data (HRV, sleep, resting HR) feeds readiness.

**Subscription requirement.** Strava, Garmin, and Concept2 sync require a Standard or higher athlete plan; they are not available on the Free tier.

**VBT devices (Athletes & Coaches).** The platform parses CSV exports from Vmaxpro/Enode, Vitruve, GymAware, PUSH Band, Perch, and Tendo units. Athletes view their bar-speed data on the VBT Data page.

**Timing gates (Coaches).** In the Agility Studio, coaches can import timing-gate results from Brower, Freelap, and Witty systems, or as a generic CSV. Athletes see assigned agility workouts and their results on the athlete Agility page.

## Common questions

**Q: My activity isn't showing up. What should I check?**
A: Data must reach the provider's cloud first — confirm the activity is visible in Strava/Garmin Connect/Concept2 Logbook, then press "Sync now" on the integration card. The "Last sync" timestamp tells you when the platform last received data.

**Q: How do I reconnect if the connection stops working?**
A: Disconnect the service on the Settings → Integrations card, then connect again and re-authorize. Access tokens are refreshed automatically in the background, but a full reconnect resolves a revoked or expired authorization.

**Q: Will I lose my history if I disconnect?**
A: No new data will sync, but previously synced results are kept (Concept2 and Oura state this explicitly when disconnecting).

**Q: I have both a Garmin watch and an Oura ring — which one wins?**
A: You choose. A "Recovery source" picker appears when both are connected. On Auto, Oura's HRV, resting heart rate, and sleep are used ahead of Garmin's.

**Q: Do synced activities count toward my training load?**
A: Yes. Each Strava/Garmin/Concept2 session gets a computed training stress score and counts in your load, weekly summary, and ACWR injury-risk monitoring.

**Q: Why can't I connect Strava on the Free plan?**
A: Strava, Garmin, and Concept2 sync are Standard-and-above features. Upgrade on the Subscription page to enable them.

## Related features

- Training load and ACWR monitoring (synced activities feed both)
- Daily readiness check-in (uses HRV, sleep, and resting HR from Garmin/Oura)
- AI coach chat and workout generation (uses synced activity history as context)
- Subscriptions and tiers (integration access by plan)
