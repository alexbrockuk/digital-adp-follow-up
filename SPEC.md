# SPEC.md — Digital ADP follow up, Phase 2

> Frozen implementation brief for the static refactor.

## Objective

Refactor the latest single-file HTML prototype into a lightweight static web app that preserves the current copy, logic, and person-tab workflow while improving structure, maintainability, and Master-tab progress visibility.

## Core experience

As a team member, I open my tab, see my follow-up actions, tick them off, and optionally add notes. The Master tab reflects overall team progress.

## Guardrails

- Keep the app lightweight and focused.
- Do not turn it into a management dashboard or CRM.
- No React, framework, package manager, backend, or build tooling.
- Keep `localStorage` persistence for checkboxes and notes.
- Use stable task IDs.
- Preserve the current visual tone and copy unless explicitly changed.

## Required structure

```text
digital-adp-follow-up/
  index.html
  styles.css
  app.js
  data/
    opportunities.json
  README.md
```

## Functional requirements

### Master tab

- Overall team progress bar
- Completed actions versus total actions
- Per-person completion summaries
- Master opportunity/task table
- Per-opportunity completion status
- Notes visible where useful, but not dominant

### Person tabs

- One tab per team member
- Progress summary for that person
- Three groupings:
  - Accounts you lead
  - Services you lead
  - You lead both
- Checkbox per task
- Optional notes per task

### Data model

- Move task data to `data/opportunities.json`
- Keep task types:
  - `account_lead`
  - `service_lead`
  - `self_led`
- Keep the JSON human-readable and suitable for later backend replacement

### Persistence and export

- Save checkbox state in browser `localStorage`
- Save notes in browser `localStorage`
- Restore state after refresh
- Export all task statuses to CSV

## Non-goals

- No opportunity stages
- No due dates
- No stakeholder tracking
- No readiness or governance layers
- No backend integration in this phase
