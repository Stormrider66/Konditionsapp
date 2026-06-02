# Garmin Production Review Checklist

Last updated: 2026-06-02

Use this as the working checklist for the Garmin Connect Developer Program production access ticket.

## 1. Legal

- Privacy Policy direct anchor: `/privacy#garmin-data-processing`.
- The Garmin section now describes Garmin data collected, why it is used, where it is stored, which processors may handle it, AI processing, disconnect behavior, deletion by request, and Garmin pre-approval for future Garmin privacy-policy changes.
- Submit the updated Garmin privacy-policy wording to Garmin and wait for written approval before deploying changes that affect Garmin data processing.

## 2. Technical Review

- Confirmed externally by Henrik:
  - Two authorized Garmin Connect users exist.
  - User Deregistration endpoint is enabled in the Garmin portal.
  - User Permission endpoint is enabled in the Garmin portal.
  - Partner Verification has been completed twice.
  - Successful workout transfer is visible inside Garmin Connect.
- App changes:
  - Garmin webhook endpoints now return HTTP 200 after payload receipt and process the payload asynchronously.
  - The dedicated Cloud Run webhook service accepts up to 100 MB payloads for activity details.
  - Interval-session Garmin enrichment now uses already-synced GarminActivity records instead of making direct Garmin PULL calls.
- Screenshot packet still needed:
  - Garmin connection status.
  - Garmin data shown in the app with attribution.
  - Successful Garmin workout transfer in Trainomics.
  - Successful Garmin workout visible in Garmin Connect.
  - Garmin disconnect / deregistration user flow.
  - Permission-change handling evidence from Partner Verification if Garmin asks for it.

## 3. Team Members and Account Setup

- Confirmed externally by Henrik:
  - API Blog signup is complete.
  - Solo-founder account setup; no additional team members.
  - No generic, freemail, or third-party integrator account should be added to the Garmin developer account.

## 4. UX and Brand Review

- Include all places where Garmin data appears in the screenshot zip.
- Screenshot packet guide: `docs/GARMIN_SCREENSHOT_PACKET.md`.
- Key in-app surfaces:
  - Integrations settings.
  - Garmin health card.
  - Readiness dashboard.
  - Training load widget.
  - Recent activity list.
  - Daily check-in Garmin prefill.
  - Weekly training summary.
  - Interval-session Garmin sync panel.
  - Program or strength workout push to Garmin Connect.
- Keep Garmin references as Garmin Connect where the app is referring to the connected service.
- Device-sourced or Garmin-derived data should show Garmin attribution and, for AI-derived insights, the Garmin-derived insight notice.

## 5. Training / Courses API Scope

- Trainomics currently implements Garmin Training API workout creation and workout scheduling.
- Trainomics does not currently implement Garmin Courses API transfer.
- If Garmin asks for a Courses API screenshot, respond that Courses API is not part of the current requested production scope, unless we explicitly add Course transfer later.

## 6. Disconnect and Deletion

- Disconnect behavior:
  - Calls Garmin deregistration.
  - Removes the local Garmin token.
  - Stops future Garmin webhook pushes and future AI processing of newly received Garmin data.
- Historical Garmin-derived records are preserved for training history unless the user requests deletion or deletes the account.
- This behavior is now reflected in the Garmin privacy-policy section.
