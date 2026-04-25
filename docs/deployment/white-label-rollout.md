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

## What still leaks "Trainomics"

| Surface                            | Leak | Notes |
|-------------------------------------|------|-------|
| `noreply@trainomics.app` From:      | ⚠️    | Sending domain is shared. Per-business sending domains is **item #5** on the deliverability backlog — needs Resend domain API. |
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

## Backlog

- **Per-business sending domain** (item #5): biggest remaining brand leak. Adds `customEmailDomain` + DKIM CNAMEs via `resend.domains.create`. Don't start until trainomics.app's DMARC reports are clean for two weeks.
- **PDF report branding**: thread `BusinessBranding` through `lib/exports/`. Probably one afternoon's work.
- **Vercel Domains API integration**: auto-add the domain on POST instead of manual ticket.
- **`emailSenderName` hint label**: today's UI doesn't show what the resulting From: looks like in real time. Cheap polish, low priority.
