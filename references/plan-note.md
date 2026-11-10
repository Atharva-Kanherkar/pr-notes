# Plan: <short title>

Issue: <link or "none">
Two-way note: edit anything below. The agent re-reads this before coding and before the PR, and
your edits win.

## What

<The change in two to five lines.>

Out of scope: <what this deliberately does not do>.

## Why

<The problem in a few lines: who hits it, what happens, why it matters now.>

```mermaid
flowchart LR
  A[Where it starts] --> B[The step that breaks or changes]
  B --> C[What the user ends up seeing]
```

## How

- `<path/to/file>`: <what changes there>
- `<path/to/other>`: <what changes there>
- Tests: <the tests that will prove it, new or existing, and the commands to run them>
- Risky bits to look at first: <anything hard to undo>

---

## Example

# Plan: retry webhook delivery on 5xx

Issue: #412

## What

Webhook delivery retries up to 5 times with exponential backoff when the receiver answers 5xx or
times out. 4xx answers are still final.

Out of scope: a dead-letter queue UI, retries for 4xx.

## Why

A receiver that restarts for 30 seconds loses every event sent in that window, and customers have
no way to replay them.

```mermaid
sequenceDiagram
  participant Q as Delivery queue
  participant R as Receiver
  Q->>R: POST event
  R-->>Q: 503 (restarting)
  Note over Q: today: marked failed, event lost
  Q->>R: retry after 2s, 4s, 8s...
  R-->>Q: 200
```

## How

- `src/webhooks/deliver.ts`: classify the response; schedule a retry for 5xx and timeouts.
- `src/webhooks/backoff.ts` (new): delay = 2^attempt seconds with jitter, capped at 5 attempts.
- `migrations/0042_webhook_attempts.sql`: `attempts` and `next_attempt_at` columns.
- Tests: unit tests for the classifier and backoff; an integration test with a receiver that
  fails twice then succeeds. `npm test -- webhooks`.
- Risky bits: the migration on a large table; check it does not lock.
