# Garmin Cloud Run Webhook

## Why this exists

Garmin `ACTIVITY_DETAIL` pushes can exceed Vercel's function request body limit. This service moves Garmin webhook ingestion to Cloud Run while keeping the main Trainomics app and Garmin OAuth callback on Vercel.

## Architecture

- Main app and Garmin callback remain on Vercel
- Garmin webhook traffic goes to Cloud Run
- Shared processing logic lives in `lib/integrations/garmin/webhook-service.ts`
- Vercel still keeps a thin compatibility route in `app/api/integrations/garmin/webhook/route.ts`

## Production URLs

- Webhook:
  `https://garmin-webhook.trainomics.app/api/integrations/garmin/webhook`
- Health:
  `https://garmin-webhook.trainomics.app/health`
- Verification GET:
  `https://garmin-webhook.trainomics.app/api/integrations/garmin/webhook?verify_token=<token>&challenge=test`
- OAuth callback:
  `https://trainomics.app/api/integrations/garmin/callback`

## Cloud Run service

- Service name: `garmin-webhook`
- Region: `europe-north1`
- Custom domain: `garmin-webhook.trainomics.app`

## Environment variables

- `NODE_ENV=production`
- `LOG_LEVEL=info`
- `GARMIN_WEBHOOK_VERIFY_TOKEN=<same value as Garmin verification token>`
- `DATABASE_URL=<production postgres connection string>`

If Cloud Run shows Prisma connection-string parsing errors, redeploy from terminal with `--update-env-vars` in one quoted command to avoid hidden line breaks in `DATABASE_URL`.

## Build and deploy

Build and push:

```bash
gcloud builds submit \
  --tag europe-north1-docker.pkg.dev/<project-id>/trainomics/garmin-webhook:latest \
  .
```

Deploy:

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

## DNS

Cloudflare record for the custom domain:

- Type: `CNAME`
- Name: `garmin-webhook`
- Target: `ghs.googlehosted.com`
- Proxy status: `DNS only`

Wait for both DNS and managed TLS certificate provisioning before switching Garmin to the custom domain.

## Post-deploy checks

1. `curl https://garmin-webhook.trainomics.app/health`
2. `curl "https://garmin-webhook.trainomics.app/api/integrations/garmin/webhook?verify_token=<token>&challenge=test"`
3. Cloud Run logs show:
   - `Garmin webhook event received`
   - `Garmin webhook processing results`
4. Garmin Partner Verification uses the Cloud Run custom domain in all enabled webhook rows

## Troubleshooting

- `413` on Vercel: old historical entries before Cloud Run migration; verify new traffic lands in Cloud Run logs
- `invalid domain character in database URL`: Cloud Run `DATABASE_URL` is malformed; redeploy from terminal with one-line quoted env vars
- Trainomics still shows Garmin as connected after revoke: check `app/api/integrations/garmin/route.ts`; the API now treats `syncEnabled: false` as disconnected
- Public bots hitting the custom domain with `404` on random paths are expected and unrelated
