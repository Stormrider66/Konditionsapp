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
3. Resend generates one SPF TXT and three DKIM CNAME records — **copy the values
   it shows you, do not invent them**. The CNAME hostnames look like
   `resend._domainkey.trainomics.app`, `resend2._domainkey...`, etc., and the
   targets look like `<random>.dkim.amazonses.com`. They're unique to our
   account; never copy them from another tenant's docs.

Keep the Resend tab open — you'll click **Verify** here once DNS has propagated.

## 2. Publish the DNS records

These go in whatever registrar/DNS provider hosts `trainomics.app` (Vercel
DNS, Cloudflare, Loopia, etc.). All values come from Resend in step 1 except
the DMARC TXT, which we author ourselves.

| Type  | Host (name)                        | Value                                                                                      | TTL  |
|-------|------------------------------------|--------------------------------------------------------------------------------------------|------|
| TXT   | `@` (or `trainomics.app`)          | `v=spf1 include:amazonses.com ~all`                                                        | 3600 |
| CNAME | `resend._domainkey`                | (paste from Resend)                                                                        | 3600 |
| CNAME | `resend2._domainkey`               | (paste from Resend)                                                                        | 3600 |
| CNAME | `resend3._domainkey`               | (paste from Resend)                                                                        | 3600 |
| TXT   | `_dmarc`                           | `v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@trainomics.app; pct=100; adkim=s; aspf=s` | 3600 |

Notes:

- **SPF** uses `~all` (soft-fail). Keep it `~all` until DMARC is on `quarantine`
  for a couple of weeks and the reports look clean — only then consider `-all`.
- **DKIM**: copy the three CNAMEs from Resend verbatim. If your DNS provider
  appends the apex automatically, paste only the prefix (`resend._domainkey`).
  If it doesn't, paste the full hostname.
- **DMARC**: start with `p=none` if you want a one-week dry run with reports
  before any mail gets quarantined. Otherwise `p=quarantine` is fine — we
  control all senders. Don't jump straight to `p=reject` until reports confirm
  no false positives.
- **DMARC mailbox**: create `dmarc-reports@trainomics.app` in Resend (or
  forward to a real inbox). Don't aim DMARC reports at a black hole — the
  weekly XML aggregates are how you spot misconfiguration and spoofing.

## 3. Verify

After DNS has propagated (5–60 min depending on TTL):

```bash
# SPF
dig +short TXT trainomics.app | grep spf1
# expect: "v=spf1 include:amazonses.com ~all"

# DKIM (one example — repeat for resend2, resend3)
dig +short CNAME resend._domainkey.trainomics.app
# expect: <hash>.dkim.amazonses.com.

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
