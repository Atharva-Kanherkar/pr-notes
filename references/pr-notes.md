# PR notes template

Copy this into the PR body. Every section needs real content; HTML comments do not count.

~~~markdown
Plan note: <link>
Linked issue: <#123 or "none">

## What I did

<The change as built, in a few sentences. Where it differs from the plan note, and why.>

## Codebase affected

- <area>: <files or modules, and what kind of change>

## Users affected

<Who notices, where, what they see. Or: "No user-facing change, because ...".>

## Tests I ran

<One line on what you ran, then the commands and output, unedited.>

```
$ <command>
<output, as printed>
```

Not run: <what and why, or "nothing skipped">.

## Tradeoffs and risks

- <what you gave up>
- <what could break, how far it spreads, how someone would notice>
- <how to back it out>
~~~

## A filled example

~~~markdown
Plan note: https://github.com/acme/hooks/issues/412#issuecomment-2210
Linked issue: #412

## What I did

Webhook delivery now retries 5xx answers and timeouts up to 5 times with jittered exponential
backoff. Differs from the plan: the cap is 6 attempts total (1 + 5 retries), which matches how
the dashboard already counts attempts.

## Codebase affected

- Delivery: `src/webhooks/deliver.ts` (response classification), new `src/webhooks/backoff.ts`.
- Schema: `migrations/0042_webhook_attempts.sql` adds two nullable columns; no backfill.
- Worker: `src/worker/schedule.ts` polls `next_attempt_at`.

## Users affected

Customers whose receivers have short outages stop losing events. Receivers that are down for
longer see up to 5 extra requests per event over about a minute. The dashboard's attempt count
can now go above 1.

## Tests I ran

Unit and integration tests for the webhook module, then the full suite.

```
$ npm test -- webhooks
 PASS  src/webhooks/backoff.test.ts (6 tests)
 PASS  src/webhooks/deliver.test.ts (11 tests)
 PASS  test/integration/webhook-retry.test.ts (3 tests)
Tests: 20 passed, 20 total

$ npm test
[... 1,204 passing lines trimmed ...]
 FAIL  test/integration/billing-export.test.ts
  ● export > writes a CSV for the month
    ECONNREFUSED 127.0.0.1:5433
Tests: 1 failed, 1,388 passed, 1,389 total
```

The billing-export failure needs the local Postgres replica, which I don't have running. It
fails the same way on main.

Not run: the load test, it needs the staging cluster.

## Tradeoffs and risks

- Retries add load on receivers that are already struggling; jitter spreads it, but a mass outage
  means up to 5x request volume for about a minute.
- The migration adds nullable columns only, so it does not rewrite the table. On the 40M row
  production table it should be metadata-only; worth watching the deploy.
- Back it out by setting `WEBHOOK_MAX_ATTEMPTS=1`; the columns can stay.
~~~

## What weak sections look like

| Section | Weak | Why it fails a reviewer |
|---|---|---|
| What I did | "Implemented the feature as described." | Says nothing the title didn't. |
| Codebase affected | A pasted list of 40 file paths. | No grouping, no sense of which change matters. |
| Users affected | "Improves reliability." | Who, where, what do they see? |
| Tests I ran | "All tests pass." | No command, no output, nothing to check. |
| Tests I ran | Output with the one failure deleted. | This is the worst one. Never do it. |
| Tradeoffs and risks | "None." | Every change gives something up. Say what. |
