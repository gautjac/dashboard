---
name: daily-dashboard
description: Interact with your Daily Dashboard - manage todos, habits, and journal entries
homepage: https://dashboard-jac.netlify.app
user-invocable: true
metadata: {"clawdbot":{"requires":{"env":["DASHBOARD_USER_ID","DASHBOARD_USER_EMAIL"]}}}
---

# Daily Dashboard Skill

Interact with your personal Daily Dashboard to manage todos, track habits, and write journal entries.

## Configuration

Set these environment variables before using this skill:

```bash
export DASHBOARD_USER_ID="your-netlify-identity-user-id"
export DASHBOARD_USER_EMAIL="your-email@example.com"
```

You can find your user ID in your browser's localStorage under `dashboard_user_id` after logging into the dashboard.

## Base URL

All API calls go to: `https://dashboard-jac.netlify.app/.netlify/functions`

## Todos

### List all todos

```bash
curl -s "https://dashboard-jac.netlify.app/.netlify/functions/todos?userId=${DASHBOARD_USER_ID}&email=${DASHBOARD_USER_EMAIL}"
```

### Add a new todo

```bash
curl -s "https://dashboard-jac.netlify.app/.netlify/functions/todos?userId=${DASHBOARD_USER_ID}&email=${DASHBOARD_USER_EMAIL}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"title": "Buy groceries", "dueDate": "2026-01-25"}'
```

The `dueDate` is optional and should be in `YYYY-MM-DD` format.

### Complete/uncomplete a todo

```bash
curl -s "https://dashboard-jac.netlify.app/.netlify/functions/todos?userId=${DASHBOARD_USER_ID}&email=${DASHBOARD_USER_EMAIL}&id=TODO_ID" \
  -X PUT \
  -H "Content-Type: application/json" \
  -d '{"completed": true}'
```

### Delete a todo

```bash
curl -s "https://dashboard-jac.netlify.app/.netlify/functions/todos?userId=${DASHBOARD_USER_ID}&email=${DASHBOARD_USER_EMAIL}&id=TODO_ID" \
  -X DELETE
```

## Habits

### List all habits

```bash
curl -s "https://dashboard-jac.netlify.app/.netlify/functions/habits?userId=${DASHBOARD_USER_ID}&email=${DASHBOARD_USER_EMAIL}"
```

### Toggle habit completion for today

```bash
curl -s "https://dashboard-jac.netlify.app/.netlify/functions/habit-completions?userId=${DASHBOARD_USER_ID}&email=${DASHBOARD_USER_EMAIL}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"habitId": "HABIT_ID", "date": "2026-01-24"}'
```

## Journal

### Get today's journal entry

```bash
curl -s "https://dashboard-jac.netlify.app/.netlify/functions/journal?userId=${DASHBOARD_USER_ID}&email=${DASHBOARD_USER_EMAIL}&date=2026-01-24"
```

### Create or update journal entry

```bash
curl -s "https://dashboard-jac.netlify.app/.netlify/functions/journal?userId=${DASHBOARD_USER_ID}&email=${DASHBOARD_USER_EMAIL}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"date": "2026-01-24", "content": "Today was productive...", "mood": 4, "energy": 3}'
```

Mood and energy are optional integers from 1-5.

## Focus Line

### Get today's focus line

```bash
curl -s "https://dashboard-jac.netlify.app/.netlify/functions/focus-lines?userId=${DASHBOARD_USER_ID}&email=${DASHBOARD_USER_EMAIL}&date=2026-01-24"
```

### Set today's focus line

```bash
curl -s "https://dashboard-jac.netlify.app/.netlify/functions/focus-lines?userId=${DASHBOARD_USER_ID}&email=${DASHBOARD_USER_EMAIL}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"date": "2026-01-24", "text": "Ship the new feature"}'
```

## Common Interactions

When the user asks to:

- **"Add a task"** or **"Remind me to..."** → Use the todos POST endpoint
- **"What's on my list?"** or **"Show my todos"** → Use the todos GET endpoint
- **"Mark X as done"** → Use the todos PUT endpoint with `completed: true`
- **"Did I do my habits?"** → Use the habits GET endpoint to list, then habit-completions to check status
- **"Log my habit"** or **"I did X"** → Use the habit-completions POST endpoint
- **"Journal entry"** or **"Write in my journal"** → Use the journal POST endpoint
- **"What's my focus?"** → Use the focus-lines GET endpoint
- **"Set my focus to..."** → Use the focus-lines POST endpoint

## Response Format

All endpoints return JSON. Successful responses typically include the data directly or wrapped in a descriptive key (e.g., `{"todos": [...]}`, `{"habits": [...]}`).

Errors return: `{"error": "Error message"}`
