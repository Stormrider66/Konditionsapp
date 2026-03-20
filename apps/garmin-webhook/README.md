# Garmin Webhook Cloud Run Service

Dedicated Garmin webhook receiver for large request bodies that exceed Vercel's 4.5 MB function limit.

## Endpoints

- `GET /health`
- `GET /api/integrations/garmin/webhook`
- `POST /api/integrations/garmin/webhook`

The service reuses the shared Garmin webhook logic in `lib/integrations/garmin/webhook-service.ts`.

## Local run

```bash
npm run garmin-webhook:dev
```

## Required environment variables

- `DATABASE_URL`
- `DIRECT_URL` if Prisma uses it in your environment
- `GARMIN_WEBHOOK_VERIFY_TOKEN`
- Any logging / Prisma env vars used by the main app

## Deploy summary

1. Build and push the image:

```bash
gcloud builds submit \
  --tag europe-north1-docker.pkg.dev/<project-id>/trainomics/garmin-webhook:latest \
  .
```

2. Deploy to Cloud Run:

```bash
gcloud run deploy garmin-webhook \
  --image=europe-north1-docker.pkg.dev/<project-id>/trainomics/garmin-webhook:latest \
  --region=europe-north1 \
  --project=<project-id> \
  --allow-unauthenticated \
  --memory=1Gi \
  --cpu=1 \
  --max-instances=10 \
  --update-env-vars="NODE_ENV=production,LOG_LEVEL=info,GARMIN_WEBHOOK_VERIFY_TOKEN=<token>,DATABASE_URL=<postgres-url>"
```

3. Verify the service:

```bash
curl https://garmin-webhook.trainomics.app/health
curl "https://garmin-webhook.trainomics.app/api/integrations/garmin/webhook?verify_token=<token>&challenge=test"
```

Prefer Secret Manager for production secrets if you want to remove inline values from deploy commands.

## Garmin configuration

Point Garmin webhook endpoints to:

`https://garmin-webhook.trainomics.app/api/integrations/garmin/webhook`

Keep the OAuth callback on the main app:

`https://trainomics.app/api/integrations/garmin/callback`

See [docs/GARMIN_CLOUD_RUN_WEBHOOK.md](/Users/barbrolundholm/Documents/Trainomics/docs/GARMIN_CLOUD_RUN_WEBHOOK.md) for the full rollout checklist.
