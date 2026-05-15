# Email deliverability for `trainomics.app`

Status when this doc was written (2026-04-25): every transactional email goes
out from `noreply@trainomics.app` via Resend. Display name + reply-to are now
overridable per business in **Branding tab → Reply-to e-postadress**, but the
sending domain is still shared. To stop ending up in the spam folder we need
SPF + DKIM + DMARC on `trainomics.app` itself. This is mostly DNS work — once
the records are published nothing else changes in the codebase.

> **What this gets you:** mail authenticates as us, Gmail/Outlook stop putting
> us in spam, and DMARC reports tell us if anyone is spoofing the domain.
>
> **What this does *not* solve:** sending from a customer-owned domain (e.g.
> `coach@mygym.com`). That's the per-business Resend domain integration —
> tracked separately as item #5 on the deliverability punch list.

---

## 1. Verify the domain in Resend

1. Log in to https://resend.com/domains
2. Click **Add Domain** → enter `trainomics.app`
3. Resend generates the records to add — **copy the exact values shown,
   do not invent them**. Resend's modern setup (confirmed against our
   account on 2026-04-26) gives you:
   - One **DKIM** TXT record at `resend._domainkey` containing a long `p=MIG...`
     public key.
   - Two **SPF** records on the `send` subdomain — an MX (priority 10) pointing
     at `feedback-smtp.<region>.amazonses.com` and a TXT
     `v=spf1 include:amazonses.com ~all`.
   - **No additional CNAMEs** (older Resend docs may show 3× DKIM CNAMEs to
     `<hash>.dkim.amazonses.com` — that's the legacy pattern; the current
     account uses the single-TXT DKIM above).

Keep the Resend tab open — you'll click **Verify** here once DNS has propagated.

## 2. Publish the DNS records

These go in whatever registrar/DNS provider hosts `trainomics.app` (Cloudflare,
Vercel DNS, Loopia, etc.). All Resend-generated records come from step 1 — the
DMARC TXT we author ourselves.

| Type  | Host (name)                        | Value                                                                  | TTL  |
|-------|------------------------------------|------------------------------------------------------------------------|------|
| TXT   | `resend._domainkey`                | (paste from Resend — long `p=MIG...` public key)                       | Auto |
| MX    | `send` (priority 10)               | (paste from Resend — `feedback-smtp.<region>.amazonses.com`)           | Auto |
| TXT   | `send`                             | `v=spf1 include:amazonses.com ~all`                                    | Auto |
| TXT   | `_dmarc`                           | `v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@trainomics.app; pct=100` | Auto |

Notes:

- **Cloudflare proxy**: leave all of these on **DNS only** (gray cloud), not
  proxied. Orange-cloud proxying breaks DKIM and rewrites MX targets.
- **SPF on `send.` subdomain (not the apex)**: this is intentional. Resend uses
  `send.trainomics.app` as the envelope sender (`Return-Path`) while the
  visible `From: noreply@trainomics.app` stays on the apex. SPF authenticates
  the envelope; DKIM signs with `d=trainomics.app` so DKIM aligns with the
  visible From:. DMARC passes via DKIM alignment.
- **DMARC alignment must be relaxed** (which is the default). Don't add
  `aspf=s` — strict SPF alignment would fail because `send.trainomics.app`
  ≠ `trainomics.app` exact match. `adkim=s` would technically pass since
  DKIM signs with the apex, but there's no upside to forcing it; relaxed is
  the lower-risk default. The DMARC record above uses the safe defaults.
- **DMARC `p=quarantine`** is the recommended starting point — Resend has
  already verified SPF + DKIM, so quarantine should never trigger for us.
  Use `p=none` for a one-week dry run if you want to be cautious. Don't
  jump straight to `p=reject` until reports confirm no false positives.
- **DMARC mailbox**: create `dmarc-reports@trainomics.app` (forward to a real
  inbox is fine). Reports come weekly as XML — that's how you spot
  misconfiguration and spoofing. Don't black-hole this address.

## 3. Verify

After DNS has propagated (5–60 min depending on TTL):

```bash
# SPF (envelope) — note the host is `send.`, not the apex
dig +short TXT send.trainomics.app | grep spf1
# expect: "v=spf1 include:amazonses.com ~all"

# DKIM
dig +short TXT resend._domainkey.trainomics.app
# expect: a long string starting with "p=MIG..."

# DMARC
dig +short TXT _dmarc.trainomics.app
# expect: "v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@trainomics.app; ..."
```

Then go back to Resend and click **Verify**. The domain status should flip to
green for SPF + DKIM. DMARC isn't part of Resend's check — that's enforced by
the receiving server.

End-to-end check: send yourself an email through any of the existing flows
(coach invite, password reset, athlete welcome). View it in Gmail → Show
original. You should see:

```
SPF:   PASS with IP <ses ip> ...
DKIM:  PASS with domain trainomics.app
DMARC: PASS
```

All three must say PASS. If any says NEUTRAL or NONE, the matching DNS record
isn't being read — re-check step 2.

## 4. Operate

- **DMARC reports**: review the weekly XML drops in `dmarc-reports@trainomics.app`
  for the first month. Look for `disposition=quarantine|reject` on real
  Trainomics mail (means we mis-aligned something) or `count > 0` from IPs we
  don't recognize (means someone is spoofing us).
- **Invite delivery evidence**: invite emails are tagged before sending
  (`category=invite`, plus an `email_type` and business/target identifiers).
  The Resend webhook stores email lifecycle events in `EmailDeliveryEvent`, so
  "didn't receive the invite" can be checked against `email.delivered`,
  `email.delivery_delayed`, `email.bounced`, `email.complained`,
  `email.failed`, and `email.suppressed` instead of guessing.
- **Resend webhook subscriptions**: keep both domain events and email delivery
  events enabled for `https://trainomics.app/api/webhooks/resend`. At minimum:
  `domain.created`, `domain.updated`, `domain.deleted`, `email.sent`,
  `email.delivered`, `email.delivery_delayed`, `email.bounced`,
  `email.complained`, `email.failed`, and `email.suppressed`.
- **List-Unsubscribe header**: already set in `lib/email/index.ts` and the four
  direct Resend callers. Don't drop it — Gmail's bulk-sender rules require it
  for any mailing list.
- **`noreply@` vs business sender**: the From: address (`noreply@trainomics.app`)
  is platform-shared and stays put. The display name and Reply-To come from
  the business's branding settings (`emailSenderName` and `replyToEmail`), so
  a coach replying to `MyGym <noreply@trainomics.app>` lands in
  `info@mygym.se` if the gym set it.

## 5. Rollback

If outbound mail starts bouncing post-publish:

1. Look at Gmail's "Show original" — which check is failing?
2. SPF FAIL → registrar probably stripped a quote or the include. Re-paste.
3. DKIM FAIL → confirm the three CNAMEs resolve from outside your network
   (`dig @8.8.8.8 ...`). Some registrars flatten CNAMEs at the apex which
   breaks DKIM; if that's the case you need a provider that keeps CNAMEs.
4. DMARC quarantining real mail → temporarily change `_dmarc` to
   `v=DMARC1; p=none; rua=mailto:dmarc-reports@trainomics.app` while you fix
   the underlying SPF/DKIM mismatch. **Don't delete the record** — `none` is
   monitor-mode, the right escape hatch.

## 6. Per-business sending domains (item #5 — built; gated on trainomics.app DMARC)

Code path is wired (`/api/coach/admin/branding/custom-email-domain`,
`CustomEmailDomainSection` UI, `branding.fromAddress` switching). Two extra
pieces of operational setup are required before flipping it on for any
tenant:

1. **`RESEND_WEBHOOK_SECRET` env var** on Vercel. In the Resend dashboard
   → Webhooks → add endpoint `https://trainomics.app/api/webhooks/resend`
   with `domain.created`, `domain.updated`, `domain.deleted` subscribed.
   Copy the signing secret. Without this set, `customEmailVerified` only
   updates when a coach clicks *Uppdatera status* — no automatic re-sync
   if the customer later breaks their DKIM at the registrar.

2. **trainomics.app DMARC clean for two weeks** (above) before enabling
   `WHITE_LABEL` for any pilot tenant. Two unauthenticated layers at once
   makes DMARC reports unreadable.

See `docs/deployment/white-label-rollout.md` for the customer-facing flow
and rollback paths.
