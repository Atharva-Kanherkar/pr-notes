# PR notes template

Use the five sections below. Keep them short for small changes; expand decisions, impact,
review focus, and verification gaps when the consequences warrant it. HTML comments do not count.

No notes app is needed. Keep the plan under `## Plan` above the final notes, with `### What`,
`### Why`, and `### How`. If using an accessible external plan, a link is enough. Summarize
its intent, criteria, and important decisions here when the original is private or local.

~~~markdown
Plan note: <reviewer-accessible link, or "included below">
Linked issue: <#123 or "none">

## Plan

### What
<Planned outcome, acceptance criteria, and scope.>

### Why
<Problem evidence, assumptions, and simpler alternative.>

### How
<Planned implementation, impact, and verification. Preserve changes and reasons.>

## What I did

<Observable behavior, important decisions and assumptions, and deviations from the plan with why.>

## Codebase affected

- <area>: <files or modules and the change>
- Review first: <important path or symbol, and what to check there>

## Users affected

- <person, agent, or system>: <surface, before/after behavior, compatibility/action needed, evidence>
- Uncertain impact: <what has not been traced or verified, if relevant>

## Tests I ran

<What ran, which behavior it establishes, and relevant revision/environment.>

```
$ <command>
<actual output, including failures, warnings, and skips>
```

Not run: <remaining checks and why, or "nothing skipped">.
Still unverified: <what the evidence does not establish>.

## Tradeoffs and risks

- <what was given up and why>
- <remaining findings or possible failures, reach, and detection>
- <how to reverse the change or limit its effects>
~~~

When no checks ran, start the tests section with `Not run: <specific reason>`
and explain the uncertainty. Do not invent output to pass. If any checks ran, preserve their
actual output and identify the rest. The format check cannot verify the truth of either claim.

Use **Users affected** for all relevant consumers: people, coding agents, automation, API clients,
and integrations. Trace their entry points or callers. Include relevant unchanged contracts,
label uncertainty, and skip irrelevant groups. "No user-facing change" still needs a reason
and any developer, agent, or system effects.

For UI work, add screenshots of relevant states. For substantial work, offer optional questions
about the important path, a verification gap, and recovery. The human supplies the answers;
the agent must not claim understanding or approval on their behalf.

## A filled example

This fictional example uses an accessible external plan and records a failure and verification gap.

~~~markdown
Plan note: https://github.com/acme/hooks/issues/412#issuecomment-2210
Linked issue: #412

## What I did

Delivery now retries 5xx responses and timeouts with jittered exponential backoff, up to five
retries (six attempts total). 4xx responses remain final. This matches the plan.

Decision: count the initial request as attempt 1, matching the dashboard. Preserve the event
ID across retries. Assumption to verify in rollout: receivers use that ID to deduplicate.

## Codebase affected

- Delivery: `src/webhooks/deliver.ts` classifies responses; new `src/webhooks/backoff.ts` sets delays.
- Schema: `migrations/0042_webhook_attempts.sql` adds two nullable columns; no backfill.
- Worker: `src/worker/schedule.ts` polls `next_attempt_at`.
- Review first: delivery state transitions and the worker's claim/update boundary. A restart
  must neither lose a retry nor exceed the attempt cap.

## Users affected

- Webhook receivers: short outages get later delivery attempts; an unavailable receiver can get
  five extra requests per event. Classifier and integration cases cover this behavior locally.
- Operators: retry traffic can increase queue depth; watch backlog and failure metrics during rollout.
- Dashboard users: the attempt counter can exceed 1; the existing counter consumes stored attempts.
- API clients: the delivery serializer retains the event format and ID. No payload migration needed.
- Uncertain impact: receiver-side deduplication in production has not been verified.

## Tests I ran

On the final revision, using Node 22 and a local test receiver. Module checks cover recovery
after two failures, final 4xx, timeouts, exhaustion, and stable event IDs. Then ran the full suite.

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

The billing-export test cannot connect to the local Postgres replica. Running it on main in
the same environment produced the same failure. This does not establish that billing passes.

Not run: the load test; it needs the staging cluster.
Still unverified: queue capacity during a mass outage and receiver-side deduplication in production.

## Tradeoffs and risks

- Retries trade extra traffic for recovery. One event can produce up to six requests total;
  jitter spreads them but does not establish capacity.
- The migration adds nullable columns without a backfill. Inspect the production migration plan;
  local tests do not establish lock duration on the large production table.
- Monitor retry queue depth and failures. Disable retries with `WEBHOOK_MAX_ATTEMPTS=1`;
  the nullable columns can remain.
~~~

## What weak sections look like

| Section | Weak | What the reviewer needs |
|---|---|---|
| What I did | "Implemented the feature as described." | Actual behavior, decisions, and deviations. |
| Codebase affected | Forty pasted file paths. | Grouped areas and the important path to inspect first. |
| Users affected | "Improves reliability." | Who or what notices, where, and how behavior changes. |
| Users affected | "No user impact" for an agent instruction change. | Which agents and developers consume it and what changes for them. |
| Tests I ran | "All tests pass." | Actual commands, output, and what they establish. |
| Tests I ran | Output with a failure deleted. | The failure and what was done about it. |
| Tests I ran | "Green, so everything works." | What remains unverified and why it matters. |
| Tradeoffs and risks | "None." | Specific uncertainty or the reason effects are limited. |
