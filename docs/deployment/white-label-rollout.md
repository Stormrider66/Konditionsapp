# White-label rollout

What's actually shippable today, what still leaks the Trainomics brand, and the
DNS/Vercel checklist a customer goes through to enable a custom domain.

> Read this together with `docs/deployment/email-deliverability.md`. SPF/DKIM/DMARC
> on `trainomics.app` is a prerequisite — without it, transactional mail from
> white-label tenants still goes to spam, no matter how branded the UI is.

---

## Tier matrix

Feature gates live in `lib/branding/feature-gate.ts` and are enforced both on
read (`resolveBusinessBranding`) and write (`/api/coach/admin/branding` PUT).

| Capability                          | Tier 0 (every business) | Tier 1: `CUSTOM_BRANDING` | Tier 2: `WHITE_LABEL` |
|-------------------------------------|:-----------------------:|:-------------------------:|:---------------------:|
| Logo URL                            | ✅                      | ✅                        | ✅                    |
| Primary color                       | ✅                      | ✅                        | ✅                    |
| Reply-to email                      | ✅                      | ✅                        | ✅                    |
| Secondary color, background tint    |                         | ✅                        | ✅                    |
| Custom font (curated)               |                         | ✅                        | ✅                    |
| Custom favicon                      |                         | ✅                        | ✅                    |
| `emailSenderName` (display name)    |                         |                           | ✅                    |
| Custom HTML `<title>`               |                         |                           | ✅                    |
| Hide platform branding (Powered-by) |                         |                           | ✅                    |
| Custom domain (`coach.brand.com`)   |                         |                           | ✅                    |
| Custom sending domain (`@brand.com`)|                         |                           | ✅                    |

Every gated field is set to `null`/default when the tier is missing — even if
it's populated in the DB. Defense in depth: downgrading a tenant doesn't leak
their old branding.

## What's branded today

| Surface                                            | Status |
|----------------------------------------------------|--------|
| App page title (browser tab)                       | ✅ Honors `pageTitle` (Tier 2) and `faviconUrl` (Tier 1) |
| Custom font                                        | ✅ `DynamicFontLoader` + CSS var `--business-font` |
| Coach top nav: name, logo, badge color             | ✅ Reads `useBusinessBrandingOptional()` — logo URL > primary color gradient > default blue |
| `Powered by Trainomics` footer                     | ✅ Hidden when `hidePlatformBranding=true` |
| Email From: display name                           | ✅ Uses `emailSenderName` when WHITE_LABEL active |
| Email reply-to                                     | ✅ Per-business `replyToEmail` (Tier 0) — falls back to `support@trainomics.app` |
| Email body branding (logo, colors, footer)         | ✅ All 5 Resend callers route through `resolveEmailBranding(businessId)` |
| Custom domain routing (`coach.brand.com` → tenant) | ✅ `proxy.ts` rewrites by `Host` header with 5-min cache |
| Custom domain UI (add + DNS instructions + verify) | ✅ `CustomDomainSection` in the Branding tab |
| Custom sending domain (`noreply@brand.com`) | ✅ `CustomEmailDomainSection` — provisions DKIM through Resend's domain API and surfaces records inline |

## What still leaks "Trainomics"

| Surface                            | Leak | Notes |
|-------------------------------------|------|-------|
| `/login` and `/signup` pages        | ❌    | No business context (anonymous), so always shows platform branding. Acceptable trade-off; revisit if a customer specifically asks. |
| PDF exports (test reports)          | ❌    | Header/footer hardcoded. `lib/exports/` doesn't yet take a `BusinessBranding` argument. Low frequency — fix when a customer flags it. |
| Marketing pages (`/`, `/pricing`)   | ❌    | Out of scope — those are platform pages and should stay platform-branded. |

## Customer-facing custom-domain checklist

When a WHITE_LABEL customer wants `coach.brand.com`:

1. **In the app** — Branding tab → Custom Domain section → enter `coach.brand.com` → click *Lägg till*. The app gives them a CNAME and a TXT record.
2. **At the customer's registrar** — they add both records:
   - `CNAME coach.brand.com → cname.trainomics.app`
   - `TXT _trainomics-verify.coach.brand.com → trainomics-verify=<uuid>`
3. **In Vercel (you)** — open the project's *Domains* tab and add `coach.brand.com` to the project. Vercel will:
   - issue an ACM certificate automatically (only works once the CNAME resolves)
   - confirm the domain is live within ~30 minutes
4. **In the app** — customer clicks *Verifiera nu*. If DNS has propagated, `domainVerified` flips to true and `proxy.ts` starts rewriting `coach.brand.com/...` → `/<slug>/coach/dashboard`.

The Vercel step is **manual today**. There is no `vercel domains add` automation
hooked up. If it becomes a high-volume operation, integrate the [Vercel
Domains API](https://vercel.com/docs/rest-api/reference/endpoints/projects/add-a-domain-to-a-project)
with our project token. Until then, treat it as one ticket per customer rollout.

## Rollback

If a custom domain misbehaves after publish:

1. **DNS issue** — customer can self-serve via Branding tab → *Ta bort*. Clears `customDomain`/`domainVerified`. Visitors will get a Vercel 404 on the orphan domain until DNS TTL expires.
2. **Routing issue (proxy.ts)** — if a deploy breaks `Host`-based rewriting, every white-label tenant goes down at once. Roll the deploy back; the bug isn't tenant-specific.
3. **Cert issue** — Vercel handles cert issuance. If a tenant's cert fails to renew, their domain returns SSL errors. Remove the domain in Vercel, then re-add (forces a fresh cert request). The DB row stays intact.

## Operational caveats

- **Branding cache TTL**: `proxy.ts` caches `Business → customDomain → slug` lookups for 5 minutes. After verification, allow up to 5 minutes before the new domain serves traffic — even if DNS has propagated.
- **`hidePlatformBranding` is opt-in**: customer must explicitly toggle it. Default is `false` (we want the "Powered by Trainomics" footer for the trial period).
- **Logo size**: header constrains to 32×32. PDF exports (when we brand them) will need a higher-res asset; consider asking customers for both `logoUrl` (small) and a future `logoUrlHigh` (PDF/marketing).
- **Color contrast**: there is no validation that `primaryColor` reads against the dark header background. We render the user's hex as-is. If a customer picks pure white text on white, they'll find out. Acceptable given the audience (gym/club admins, not designers).
- **Downgrade behavior**: dropping a tenant from WHITE_LABEL → CUSTOM_BRANDING does **not** clear `customDomain` from the DB — the routing just stops honoring it (resolver returns `null`). Their custom domain goes dark immediately. Document this when designing the downgrade flow so customer success can give heads-up before the switch.

## Per-business sending domain — operational notes

`CustomEmailDomainSection` calls `resend.domains.create({ name, region: 'eu-west-1' })`,
stores the returned domain ID + DKIM/SPF records on `Business`, and exposes a
*Uppdatera status* button that calls `resend.domains.get(id)` to flip
`customEmailVerified`. Once verified, `resolveEmailBranding` flips the From:
header to `<senderName> <noreply@<their-domain>>` for that business — every
existing send path picks it up automatically (they all read
`branding.fromAddress`).

**Critical operational rule**: do **not** enable per-business sending domains
for any tenant until trainomics.app's DMARC reports have been clean for at
least two weeks. Reason: if a customer's DKIM is misconfigured *and* our own
SPF/DKIM is shaky, you can't tell which layer is failing in DMARC reports —
two unauthenticated sources at once. Keep the order: trainomics.app
authenticated → DMARC clean for 2w → flip `WHITE_LABEL` for the first pilot
tenant → watch their DMARC reports → expand.

**Forbidden domains**: the API rejects `gmail.com`, `outlook.com`,
`yahoo.com`, `icloud.com`, `protonmail.com`, etc. (full list in the route
file). Customer can't accidentally try to set `gmail.com` and tie up a domain
slot in our Resend account.

**When you re-add a domain**: if a customer changes their domain, the API
calls `resend.domains.remove(oldId)` before `domains.create(newName)` to keep
our Resend account tidy. Don't end up with a long tail of orphaned domain
records.

**Region**: hardcoded `eu-west-1` (Ireland) — keeps mail routing within EU
for GDPR purposes. If a customer ever asks for a different region, make it a
per-business field; until then this is the right default.

**Webhook auto-resync** (`/api/webhooks/resend`): Resend posts `domain.*`
events to us; the handler verifies the svix signature and flips
`customEmailVerified` automatically when status changes — including when a
customer breaks their DKIM at the registrar (Resend re-marks the domain
unverified → we flip our flag → sends fall back to `noreply@trainomics.app`
without anyone noticing it changed). Requires `RESEND_WEBHOOK_SECRET` env
var; see the email-deliverability doc.

**Rollback**:
- Customer-side mistake → *Ta bort* in the UI (calls DELETE → removes from Resend, clears DB). Sends fall back to `noreply@trainomics.app` immediately.
- DKIM stops verifying mid-flight → the webhook flips `customEmailVerified` to false on the next Resend status push, and sends silently fall back. Coach sees a "Väntar på DNS" badge in the Branding tab the next time they look. Recovery: customer republishes DKIM CNAMEs, click *Uppdatera status* (or wait for the next webhook ping).
- Resend account-level outage → all custom-domain tenants degrade. Toggle a kill switch (TODO: env var like `DISABLE_CUSTOM_SENDING_DOMAIN=true` that forces `customEmailVerified=false` in `resolveEmailBranding`) — not built yet, add when the first pilot goes live.

## Backlog

- **PDF report branding**: thread `BusinessBranding` through `lib/exports/`. Probably one afternoon's work.
- **Vercel Domains API integration**: auto-add the routing domain on POST instead of manual ticket.
- **`emailSenderName` hint label**: today's UI doesn't show what the resulting From: looks like in real time. Cheap polish, low priority.
- **Custom sending kill switch**: env var to force-disable per-business From: header without ripping out DB rows. Add when needed.
