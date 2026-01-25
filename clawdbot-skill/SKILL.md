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

Required env vars on the Gateway host:
- DASHBOARD_USER_ID
- DASHBOARD_USER_EMAIL

## Helper

All commands below use URL-encoded email to avoid broken URLs with special characters:

```bash
EMAIL_ENC="$(python3 -c 'import os,urllib.parse; print(urllib.parse.quote(os.environ["DASHBOARD_USER_EMAIL"]))')"
```

## Todos

### List all todos

```bash
# Required env vars on the Gateway host:
#   DASHBOARD_USER_ID
#   DASHBOARD_USER_EMAIL

EMAIL_ENC="$(python3 -c 'import os,urllib.parse; print(urllib.parse.quote(os.environ["DASHBOARD_USER_EMAIL"]))')"

curl --connect-timeout 5 --max-time 20 \
  --fail-with-body -sS \
  -w "\nHTTP %{http_code}\n" \
  "https://dashboard-jac.netlify.app/.netlify/functions/todos?userId=${DASHBOARD_USER_ID}&email=${EMAIL_ENC}"
```

### Add a new todo (robust)

```bash
# Required env vars on the Gateway host:
#   DASHBOARD_USER_ID
#   DASHBOARD_USER_EMAIL
#
# Notes:
# - dueDate is optional (YYYY-MM-DD)
# - This command times out quickly and prints HTTP status for easier debugging.

EMAIL_ENC="$(python3 -c 'import os,urllib.parse; print(urllib.parse.quote(os.environ["DASHBOARD_USER_EMAIL"]))')"

curl --connect-timeout 5 --max-time 20 \
  --fail-with-body -sS \
  -w "\nHTTP %{http_code}\n" \
  "https://dashboard-jac.netlify.app/.netlify/functions/todos?userId=${DASHBOARD_USER_ID}&email=${EMAIL_ENC}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"title":"Buy groceries","dueDate":"2026-01-25"}'
```

### Complete/uncomplete a todo

```bash
# Required env vars on the Gateway host:
#   DASHBOARD_USER_ID
#   DASHBOARD_USER_EMAIL
#
# Replace TODO_ID with the actual todo ID

EMAIL_ENC="$(python3 -c 'import os,urllib.parse; print(urllib.parse.quote(os.environ["DASHBOARD_USER_EMAIL"]))')"

curl --connect-timeout 5 --max-time 20 \
  --fail-with-body -sS \
  -w "\nHTTP %{http_code}\n" \
  "https://dashboard-jac.netlify.app/.netlify/functions/todos?userId=${DASHBOARD_USER_ID}&email=${EMAIL_ENC}&id=TODO_ID" \
  -X PUT \
  -H "Content-Type: application/json" \
  -d '{"completed":true}'
```

### Delete a todo

```bash
# Required env vars on the Gateway host:
#   DASHBOARD_USER_ID
#   DASHBOARD_USER_EMAIL
#
# Replace TODO_ID with the actual todo ID

EMAIL_ENC="$(python3 -c 'import os,urllib.parse; print(urllib.parse.quote(os.environ["DASHBOARD_USER_EMAIL"]))')"

curl --connect-timeout 5 --max-time 20 \
  --fail-with-body -sS \
  -w "\nHTTP %{http_code}\n" \
  "https://dashboard-jac.netlify.app/.netlify/functions/todos?userId=${DASHBOARD_USER_ID}&email=${EMAIL_ENC}&id=TODO_ID" \
  -X DELETE
```

## Habits

### List all habits

```bash
# Required env vars on the Gateway host:
#   DASHBOARD_USER_ID
#   DASHBOARD_USER_EMAIL

EMAIL_ENC="$(python3 -c 'import os,urllib.parse; print(urllib.parse.quote(os.environ["DASHBOARD_USER_EMAIL"]))')"

curl --connect-timeout 5 --max-time 20 \
  --fail-with-body -sS \
  -w "\nHTTP %{http_code}\n" \
  "https://dashboard-jac.netlify.app/.netlify/functions/habits?userId=${DASHBOARD_USER_ID}&email=${EMAIL_ENC}"
```

### Toggle habit completion for today

```bash
# Required env vars on the Gateway host:
#   DASHBOARD_USER_ID
#   DASHBOARD_USER_EMAIL
#
# Replace HABIT_ID with the actual habit ID
# Replace DATE with YYYY-MM-DD format

EMAIL_ENC="$(python3 -c 'import os,urllib.parse; print(urllib.parse.quote(os.environ["DASHBOARD_USER_EMAIL"]))')"

curl --connect-timeout 5 --max-time 20 \
  --fail-with-body -sS \
  -w "\nHTTP %{http_code}\n" \
  "https://dashboard-jac.netlify.app/.netlify/functions/habit-completions?userId=${DASHBOARD_USER_ID}&email=${EMAIL_ENC}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"habitId":"HABIT_ID","date":"2026-01-24"}'
```

## Journal

### Get today's journal entry

```bash
# Required env vars on the Gateway host:
#   DASHBOARD_USER_ID
#   DASHBOARD_USER_EMAIL
#
# Replace DATE with YYYY-MM-DD format

EMAIL_ENC="$(python3 -c 'import os,urllib.parse; print(urllib.parse.quote(os.environ["DASHBOARD_USER_EMAIL"]))')"

curl --connect-timeout 5 --max-time 20 \
  --fail-with-body -sS \
  -w "\nHTTP %{http_code}\n" \
  "https://dashboard-jac.netlify.app/.netlify/functions/journal?userId=${DASHBOARD_USER_ID}&email=${EMAIL_ENC}&date=2026-01-24"
```

### Create or update journal entry

```bash
# Required env vars on the Gateway host:
#   DASHBOARD_USER_ID
#   DASHBOARD_USER_EMAIL
#
# Notes:
# - mood and energy are optional integers from 1-5

EMAIL_ENC="$(python3 -c 'import os,urllib.parse; print(urllib.parse.quote(os.environ["DASHBOARD_USER_EMAIL"]))')"

curl --connect-timeout 5 --max-time 20 \
  --fail-with-body -sS \
  -w "\nHTTP %{http_code}\n" \
  "https://dashboard-jac.netlify.app/.netlify/functions/journal?userId=${DASHBOARD_USER_ID}&email=${EMAIL_ENC}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-01-24","content":"Today was productive...","mood":4,"energy":3}'
```

## Focus Line

### Get today's focus line

```bash
# Required env vars on the Gateway host:
#   DASHBOARD_USER_ID
#   DASHBOARD_USER_EMAIL
#
# Replace DATE with YYYY-MM-DD format

EMAIL_ENC="$(python3 -c 'import os,urllib.parse; print(urllib.parse.quote(os.environ["DASHBOARD_USER_EMAIL"]))')"

curl --connect-timeout 5 --max-time 20 \
  --fail-with-body -sS \
  -w "\nHTTP %{http_code}\n" \
  "https://dashboard-jac.netlify.app/.netlify/functions/focus-lines?userId=${DASHBOARD_USER_ID}&email=${EMAIL_ENC}&date=2026-01-24"
```

### Set today's focus line

```bash
# Required env vars on the Gateway host:
#   DASHBOARD_USER_ID
#   DASHBOARD_USER_EMAIL

EMAIL_ENC="$(python3 -c 'import os,urllib.parse; print(urllib.parse.quote(os.environ["DASHBOARD_USER_EMAIL"]))')"

curl --connect-timeout 5 --max-time 20 \
  --fail-with-body -sS \
  -w "\nHTTP %{http_code}\n" \
  "https://dashboard-jac.netlify.app/.netlify/functions/focus-lines?userId=${DASHBOARD_USER_ID}&email=${EMAIL_ENC}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-01-24","content":"Ship the new feature"}'
```

## Common Interactions

When the user asks to:

- **"Add a task"** or **"Remind me to..."** -> Use the todos POST endpoint
- **"What's on my list?"** or **"Show my todos"** -> Use the todos GET endpoint
- **"Mark X as done"** -> Use the todos PUT endpoint with `completed: true`
- **"Did I do my habits?"** -> Use the habits GET endpoint to list
- **"Log my habit"** or **"I did X"** -> Use the habit-completions POST endpoint
- **"Journal entry"** or **"Write in my journal"** -> Use the journal POST endpoint
- **"What's my focus?"** -> Use the focus-lines GET endpoint
- **"Set my focus to..."** -> Use the focus-lines POST endpoint

## Response Format

All endpoints return JSON. Successful responses typically include the data directly or wrapped in a descriptive key (e.g., `{"todos": [...]}`, `{"habits": [...]}`).

Errors return: `{"error": "Error message"}`

HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad request
- 401: Unauthorized (check env vars)
- 404: Not found
- 500: Server error
