# Floating AI Copilot Roadmap

## Goal

Turn the floating AI assistant from a chat widget into a page-aware copilot that can explain the current screen, find the right data, navigate the app, prepare actions, and eventually monitor coach workflows proactively.

The build should move in five useful levels. Each level must be valuable on its own and should not depend on fragile browser automation.

## Level 1: Smart Dashboard Helper

Status: first slice shipped on 2026-05-16

The assistant understands the current page, visible concepts, and dashboard summary signals. It can explain what the coach is seeing, summarize priorities, and suggest the next place to look.

Scope:

- Inject aggregate dashboard state into chat context.
- Add dashboard-specific starter prompts in the floating chat.
- Teach coach chat to answer as a current-page companion when page context exists.
- Be explicit when only aggregate context is available and athlete-level lookup needs a later tool.

Success examples:

- "Summarize this dashboard."
- "What should I look at first?"
- "Explain readiness and ACWR on this page."
- "What does the coach dashboard suggest today?"

Guardrails:

- Do not send athlete-identifying dashboard data without a consent-aware read tool.
- Do not claim to have clicked, opened, or changed anything.
- Keep recommendations concrete and tied to the available page context.

## Level 2: Data Finder

Status: first read-tool slice shipped on 2026-05-16

The assistant can answer targeted read questions by calling permission-aware tools.

Scope:

- Find athlete by name within the current business/team scope.
- Read latest completed workouts, tests, readiness, injuries, program status, and pending feedback.
- Return links or suggested destinations for deeper inspection.
- Apply consent checks before exposing athlete health or training details to AI context.

Success examples:

- "Find David Thomasson's latest completed workout."
- "Who has missed sessions this week?"
- "Which athletes have low readiness today?"
- "Show me the latest lactate test for Anna."

## Level 3: Navigation Assistant

Status: first navigation-intent slice shipped on 2026-05-16

The assistant can move the coach around the application through first-class navigation intents.

Scope:

- Navigate to athlete profile, history, calendar, tests, program, team dashboard, and studio pages.
- Highlight or preselect relevant tabs/filters where supported.
- Add a safe client-side navigation tool rather than simulated browser clicks.

Success examples:

- "Open David's history."
- "Go to the Pitea Hockey A-lag dashboard."
- "Take me to the program builder for this athlete."

## Level 4: Action Assistant

Status: first confirmed message-action slice shipped on 2026-05-16

The assistant can prepare and perform coach actions, with confirmation for meaningful writes.

Scope:

- Create, modify, and assign sessions or programs.
- Schedule tests and follow-ups.
- Draft messages to athletes or teams.
- Prepare reports and summaries.
- Require confirmation for destructive, sensitive, or athlete-visible writes.

Success examples:

- "Schedule a lactate test for David next Thursday."
- "Draft a message to everyone who missed today's session."
- "Create a lower-load substitute workout for athletes under 50 readiness."

## Level 5: Semi-Autonomous Coach Operator

The assistant monitors workflows and raises useful suggestions without waiting for every prompt.

Scope:

- Proactive dashboard insights.
- Risk and workload alerts.
- Follow-up queues.
- Weekly team summaries.
- Background checks using existing cron and managed-agent infrastructure.

Success examples:

- "Three athletes need feedback before tomorrow."
- "Two players have a load spike before match day."
- "This team has no planned sessions next week."

## Implementation Principles

- Prefer app-native tools over browser control.
- Keep every read/write scoped to the current user, business, role, and team permissions.
- Separate read tools from write tools.
- Add confirmation before athlete-visible changes.
- Log tool actions for auditability.
- Ship each level behind behavior that is useful even if later levels are not built yet.
