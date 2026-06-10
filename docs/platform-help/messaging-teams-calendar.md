# Messaging, Teams & Calendar

How coach–athlete messaging works, how teams and the team calendar are managed, and how personal calendar events (vacations, travel, illness, camps) affect training planning.

## Coach–Athlete Messaging

### Overview

The platform has built-in direct messaging between a coach and each of their athletes. Coaches open **Messages** from the coach menu; athletes open **Messages** from the athlete menu. Messages are private one-to-one conversations — there are no group chats in the messaging tool (team-wide communication happens via team calendar events and assigned workouts instead).

### The coach view

The coach Messages page shows a conversation list with one entry per athlete, sorted by most recent activity. Each entry shows the athlete's name, a preview of the last message, its timestamp, and a red badge with the number of unread messages from that athlete. A filter lets the coach show **All** conversations or only those with **Unread** messages. Selecting a conversation opens the full message thread, where the coach's messages appear on one side and the athlete's on the other.

### The athlete view

The athlete Messages page shows a single thread with the athlete's coach. If the athlete has no coach connected yet, the page explains that messaging is unavailable until a coach relationship exists. Self-coached athletes therefore do not have a message thread.

### Message features

- **Length limit**: messages can be up to 1,000 characters, with a live character counter.
- **Read receipts**: messages show an envelope icon — closed when unsent/unread, open once the recipient has read it. Opening a conversation automatically marks incoming messages as read.
- **Workout references**: a message can be linked to a specific workout; the thread then shows a small workout badge with the workout's name so both parties know which session is being discussed.

### AI-drafted messages

In the coach AI chat, the assistant can prepare a message to an athlete or a whole team roster on the coach's behalf. The draft is never sent automatically: the assistant shows a confirmation card with the recipient(s) and full message body, and the message is only delivered after the coach explicitly clicks the confirm button (e.g. "Send message"). The coach can also cancel the draft, and unconfirmed drafts expire automatically.

## Teams

### Creating and managing teams

Coaches create teams on the **Teams** page with a name, optional description, and a sport type (e.g. Ice Hockey, Football, Floorball). Teams can be grouped under **Organizations** (clubs), and the Teams page shows teams grouped by organization, with standalone teams listed separately. Each team card shows the roster (players) and links to the team dashboard and team calendar. Teams can be edited or deleted (deletion asks for confirmation and cannot be undone).

### Team staff and the responsible coach

Multiple staff members can work with a team. Business owners, admins, and coaches in the organization — plus any staff member directly assigned to the team — can be selected as the **responsible coach** for a team calendar event. The responsible coach is the named person accountable for delivering that session. Events can also be created without a responsible coach. An assistants dialog on the team calendar lets you manage who has assistant access to the team.

### Team plans

Each team can have an active **team plan** (season plan) divided into ordered blocks, shown on the team Plan page together with team notes. The team calendar also surfaces the currently active plan so day-to-day sessions can be created inside the right phase of the season.

## Team Calendar

### Event types

The team calendar supports these event types: Ice practice, Strength, Conditioning (cardio), Hybrid, Agility, Stability/Prehab, Plyometrics, Interval session, Game, Test, Rest day, Meeting, Annual plan, and Other. Each type is color-coded in the calendar. The calendar offers day, week, and month views.

### Recurring events

Events can repeat — for example a weekly practice. When planning a linked team workout you can choose to create the same session on the selected date and the following weeks.

### Content planning workflow

Physical sessions (strength, cardio, hybrid, agility, prehab, plyometrics, interval) carry a **content status** so staff can see what still needs work: *Planned framework* → *Needs content* → *Content ready* → *Assigned*. Each event can also have a **content owner** (coach, physical trainer, physio, shared, or self) so it is clear who is responsible for filling in the session content.

### Planning and assigning team workouts

A team event can be linked to an actual workout (a strength session, cardio/interval session, hybrid workout, or agility workout) built in the studios. From the calendar, the "plan team workout" dialog lets you pick the workout, date, optional time and location, and a responsible coach. When the session is **assigned to the team**, the platform creates an individual assignment for every athlete on the roster and tracks how many were assigned and how many have completed it. Events also support an attendance list (attending / absent / unknown per player).

### Practice sheets

Ice/field practice events can carry a structured practice plan (blocks of drills/segments). Each event has a printable **practice sheet** page so the plan can be brought to the rink or field.

## Athlete Calendar Events (Blockers)

### Event types and training impact

Athletes (or their coach, or the AI assistant after confirmation) can add calendar events that describe periods when normal training is not possible. Event types: **Altitude camp**, **Training camp**, **Travel**, **Illness**, **Vacation**, **Work blocker**, **Personal blocker**, plus events imported from external calendars and coach-scheduled workout sessions.

Every event has a **training impact**:

- **No training** — no training is possible on those days.
- **Reduced** — training is possible at roughly 50% or less.
- **Modified** — training continues but with modifications.
- **Normal** — training continues as planned.

The form pre-selects a sensible default per type (travel, illness, vacation, and work/personal blockers default to *No training*; altitude and training camps default to *Modified*), and you can add free-text impact notes such as "Morning sessions only".

### Illness events

Illness events have extra fields: illness type, an expected **return-to-training date**, and a medical clearance flag. The days between the end of the illness and the return-to-training date are automatically treated as *Reduced* days with a gradual ramp-up, so planning does not jump straight back to full load after sickness.

### Altitude camps

Altitude camp events record the altitude in meters and an adaptation phase, plus the date of return to sea level. Planning tools use this to know the athlete is in an altitude-adaptation period.

### How blockers affect planning

Calendar events feed an **availability calculation** that program generation and session planning use: days with a *No training* event are excluded entirely, and *Reduced*/*Modified* days are flagged with the reason and any impact notes so the plan can lighten those days. The AI assistant also sees the athlete's calendar context when suggesting or creating training, and conflict detection can flag clashes between scheduled workouts and blockers. Every calendar change is logged in a change history that powers notifications, so a coach can see when an athlete adds or moves a blocker.

### External calendars

Athletes can connect external calendars (Google, Outlook, Apple/iCal URLs); coaches can additionally connect booking systems (e.g. Bokadirekt, Zoezi). Imported events are read-only, get a configurable default event type and training impact (default *Normal*), and sync on a schedule. Each connection can be color-coded and toggled on/off.

### Cross-organization calendar

Users who belong to multiple organizations have a unified calendar with three modes: **Personal** (my own schedule across all organizations), **All teams** (full team calendars from every organization), and **Planning** (interactive planning with conflict detection). Each calendar's visibility can be set to full details, busy-only time blocks, or hidden, and individual organizations can be hidden from the combined view.

## Match Schedules (Team Sports)

Athletes in team sports (hockey, football, etc.) have a **Matches** page listing upcoming and past matches. Matches can be added manually with opponent, home/away, date and time, venue, and competition/league info. After a match, result and performance stats can be recorded — minutes played, goals, assists, plus/minus and penalty minutes for hockey, and GPS data (total distance, sprint distance, max speed) for football. Match schedules can also come from external sources and can be linked to calendar events; on the team side, games appear as **Game** events in the team calendar.
