# Getting Started: The Coach Dashboard

A guided tour of the coach workspace: navigation, athlete management, the studios, monitoring, testing tools, AI assistance, and settings.

## What it is

(Coaches) The coach dashboard is your home base in the platform. From here you manage athletes, build and assign training programs, run physiological tests, monitor training load and recovery, and use AI tools for program creation and day-to-day athlete oversight. Everything is scoped to your business (organization), so if you belong to several businesses you work inside one at a time.

## Where to find it

After logging in as a coach you land on **Dashboard**. The top navigation bar contains the four primary destinations — **Dashboard**, **Calendar**, **Athletes**, and **Programs** — plus two dropdown menus:

- **Tools**: Test, Test Overview, AI Studio, AI Canvas, Hybrid Studio, Strength Studio, Cardio Studio, Agility Studio, Ergometer Tests, Video Analysis, Monitoring, Live HR, Intervals, Drills, Hockey Tests, Test Protocols.
- **More**: Staff, Social Media, Challenges, Community, Analytics, Teams, Browse Athletes, Organizations, Documents, Messages, Referrals, Settings.

Which items appear is adapted to your business type (for example a personal-trainer setup hides team tools, while a team setup prioritizes them), so your menus may show a subset of the full list.

## How it works

**Athletes.** The **Athletes** page lists your clients with search and team filters. You can add athletes directly, send invitations, or use Browse Athletes. Each athlete has a profile with tests, programs, logs, and monitoring data. Coach subscription tiers cap how many athletes you can manage (FREE trial: 1, BASIC: 20, PRO: 100, ENTERPRISE: unlimited).

**The studios.** Dedicated builders for different training styles: **Strength Studio** (strength sessions and progressions), **Cardio Studio** (endurance sessions), **Hybrid Studio** (CrossFit-, HYROX-, and functional-fitness-style workouts), **Agility Studio** (agility drills and workouts), and **Cross-Training**. **AI Studio** is a chat workspace where you create training programs with AI — select an athlete, attach documents as context, and chat; it also handles long multi-phase program generation.

**Calendar.** The coach calendar shows all your athletes' calendars in one aggregated view with filtering and quick navigation — upcoming workouts, events, and races.

**Monitoring.** The Monitoring page gives a per-athlete view of recovery and load trends: HRV, resting heart rate, readiness score (0–100), plus zone distribution, weekly zone summaries, and a yearly training overview. Pick the athlete from the selector at the top.

**Testing tools.** The **Test** page is the data-entry hub for new tests, with tabs for lactate testing, body composition, power, speed, agility, strength, swimming, endurance, HYROX, and (for hockey athletes) hockey test batteries. **Test Overview** summarizes results across athletes, and **Ergometer Tests** covers Concept2/Wattbike/air-bike protocols. See the testing guide for details.

**Floating AI chat.** A floating AI chat button is available on every coach page. It is page-aware: it automatically knows which page you are on and what data is visible (for example the monitoring charts currently on screen), and uses that as context for its answers. You can review and toggle the included context before sending.

**AI Assistant panel (dashboard).** The dashboard includes an "AI Assistant — Athletes who need attention" panel listing automatically generated alerts. Alert types:

- **Readiness drop** — 3 or more consecutive days with readiness below 5.5.
- **Missed check-ins** — no daily check-in for 3+ days.
- **Missed workouts** — past-due assigned workouts that were not completed.
- **Pain reports** — recent pain or injury mentions in the athlete's AI conversations.
- **High load** — acute:chronic workload ratio above 1.5.

Each alert has a severity (Low, Medium, High, Critical), and the panel badge turns red when critical alerts exist. You can filter by type, and dismiss, mark as actioned, or resolve each alert. The list refreshes every minute.

**Settings and AI keys (BYOK).** Under **Settings → AI** you configure your own API keys for the AI providers — Anthropic (Claude), Google (Gemini), and OpenAI. The platform uses a Bring Your Own Key model for cost transparency: AI features (program generation, document embedding, video analysis, chat) run on your keys. The same page lets you pick a default model and restrict which models your athletes can use. Other settings cover dashboards, calendars, athlete dashboards, exercise aliases, and AI cost tracking.

## Common questions

**Q: Why don't I see all the menu items listed here?**
A: The navigation adapts to your business type and role. Less-relevant tools are tucked away or hidden — for example, hockey tests only appear in setups that use them.

**Q: Why does the AI chat or AI Studio say API keys are missing?**
A: AI features run on your own provider keys (BYOK). Go to Settings → AI and add a key for at least one provider (Anthropic, Google, or OpenAI).

**Q: Where do the AI Assistant alerts come from?**
A: A background job regularly scans your athletes for readiness drops, missed check-ins, missed workouts, pain mentions, and high training-load ratios, and creates alerts for anything that needs attention.

**Q: I dismissed an alert — is the underlying issue gone?**
A: No. Dismissing only removes the alert card. Use "resolve" once you have actually handled the issue, or "actioned" with a note to track what you did.

**Q: Can I belong to more than one business?**
A: Yes. Your athletes, programs, and tests are scoped per business. Switch businesses to see that organization's data.

## Related features

- Training programs and AI generation — see *Training Programs*.
- Physiological testing and thresholds — see *Testing and Thresholds*.
- Training load monitoring and ACWR — see *Training Load and ACWR*.
