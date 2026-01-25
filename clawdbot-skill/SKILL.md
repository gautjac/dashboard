---
name: daily-dashboard
description: Manage todos, habits, and journal entries on your Daily Dashboard via HTTP API
homepage: https://dashboard-jac.netlify.app
user-invocable: true
metadata: {"clawdbot":{"requires":{"env":["DASHBOARD_USER_ID","DASHBOARD_USER_EMAIL"]}}}
---

# Daily Dashboard Skill

Use the `exec` tool to run curl commands against the Daily Dashboard API.

## Required Environment Variables

- `DASHBOARD_USER_ID` - Your user ID (usually your email)
- `DASHBOARD_USER_EMAIL` - Your email address

## API Base URL

`https://dashboard-jac.netlify.app/.netlify/functions`

## Tool Usage Pattern

Always use the `exec` tool to run these curl commands. Example:

```json
{"tool": "exec", "command": "curl -sS --max-time 10 'https://dashboard-jac.netlify.app/.netlify/functions/todos?userId=jac@jacgautreau.com&email=jac%40jacgautreau.com'"}
```

## Commands

### List Todos

When the user asks "show my todos", "what's on my list", or similar:

```
exec: curl -sS --max-time 10 "https://dashboard-jac.netlify.app/.netlify/functions/todos?userId=${DASHBOARD_USER_ID}&email=${DASHBOARD_USER_EMAIL}"
```

### Add a Todo

When the user asks "add a task", "remind me to", or similar:

```
exec: curl -sS --max-time 10 -X POST -H "Content-Type: application/json" -d '{"title":"TASK_TITLE","dueDate":"YYYY-MM-DD"}' "https://dashboard-jac.netlify.app/.netlify/functions/todos?userId=${DASHBOARD_USER_ID}&email=${DASHBOARD_USER_EMAIL}"
```

Replace `TASK_TITLE` with the task description and `YYYY-MM-DD` with the due date (optional).

### Complete a Todo

When the user asks "mark X as done", "complete X":

First list todos to get the ID, then:

```
exec: curl -sS --max-time 10 -X PUT -H "Content-Type: application/json" -d '{"completed":true}' "https://dashboard-jac.netlify.app/.netlify/functions/todos?userId=${DASHBOARD_USER_ID}&email=${DASHBOARD_USER_EMAIL}&id=TODO_ID"
```

### Delete a Todo

```
exec: curl -sS --max-time 10 -X DELETE "https://dashboard-jac.netlify.app/.netlify/functions/todos?userId=${DASHBOARD_USER_ID}&email=${DASHBOARD_USER_EMAIL}&id=TODO_ID"
```

### Get Journal Entry

When the user asks "what did I journal", "show my journal":

```
exec: curl -sS --max-time 10 "https://dashboard-jac.netlify.app/.netlify/functions/journal?userId=${DASHBOARD_USER_ID}&email=${DASHBOARD_USER_EMAIL}&date=YYYY-MM-DD"
```

### Write Journal Entry

When the user asks "write in my journal", "add journal entry":

```
exec: curl -sS --max-time 10 -X POST -H "Content-Type: application/json" -d '{"date":"YYYY-MM-DD","content":"JOURNAL_CONTENT","mood":4,"energy":4}' "https://dashboard-jac.netlify.app/.netlify/functions/journal?userId=${DASHBOARD_USER_ID}&email=${DASHBOARD_USER_EMAIL}"
```

### Get Focus Line

When the user asks "what's my focus":

```
exec: curl -sS --max-time 10 "https://dashboard-jac.netlify.app/.netlify/functions/focus-lines?userId=${DASHBOARD_USER_ID}&email=${DASHBOARD_USER_EMAIL}&date=YYYY-MM-DD"
```

### Set Focus Line

When the user asks "set my focus to":

```
exec: curl -sS --max-time 10 -X POST -H "Content-Type: application/json" -d '{"date":"YYYY-MM-DD","content":"FOCUS_TEXT"}' "https://dashboard-jac.netlify.app/.netlify/functions/focus-lines?userId=${DASHBOARD_USER_ID}&email=${DASHBOARD_USER_EMAIL}"
```

## Response Format

All endpoints return JSON:
- Success: `{"todos":[...]}` or `{"id":"...","title":"..."}`
- Error: `{"error":"Error message"}`

## Example Interaction

User: "Add a task to call mom tomorrow"

Agent action:
```json
{"tool": "exec", "command": "curl -sS --max-time 10 -X POST -H 'Content-Type: application/json' -d '{\"title\":\"Call mom\",\"dueDate\":\"2026-01-25\"}' 'https://dashboard-jac.netlify.app/.netlify/functions/todos?userId=jac@jacgautreau.com&email=jac%40jacgautreau.com'"}
```
