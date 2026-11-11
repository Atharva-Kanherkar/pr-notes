# Review evidence and README

## Functional behavior

- The README opens with a hook, explains the two notes in plain language, and includes a short concrete example before detailed setup.
- Keep the existing five PR section headings and automatic skill discovery.
- The plan records problem evidence, assumptions, a simpler alternative, acceptance criteria, and a verification approach before implementation.
- The agent reviews the actual diff against the plan and acceptance criteria, records significant decisions and remaining findings, and points reviewers to important paths.
- Verification explains what checks establish and leave unverified. Real output retains failures, warnings, skips, and explicit trim markers.
- Private or local plans have a reviewer-accessible summary in the PR.
- Without a notes app, keep the plan and final notes together in the PR description. Use an existing draft PR when available; stage the plan locally until the PR exists otherwise. Do not require an issue comment, additional app, or empty commit.
- Explicitly identify affected people, coding agents, automation, API clients, and integrations where relevant. Trace callers/entry points and describe each affected group's surface and before/after behavior; label uncertainty instead of inventing impact.
- Diagram depth and review effort scale with risk. Human comprehension questions are optional; the agent never invents human responses or approval.
- Describe CI accurately: body structure and evidence presence, without claiming proof of plan chronology, authentic execution, correctness, or human understanding.
- A tests section with `Not run: <specific reason>` and no output can pass the format check when nothing ran. Bare declarations, placeholders, comments, and arbitrary unsupported passing claims fail.
- Existing valid PR bodies, headings, exemptions, nested sections, and fenced output remain compatible.

## Unit tests

Run `node --test test/*.test.mjs`.

- Keep all existing checker tests passing.
- Accept an explicit no-run declaration with a specific visible reason, including CRLF and nested verification notes.
- Reject a missing or placeholder no-run reason, a reason supplied only in an HTML comment, unrelated prose without evidence, and a declaration outside the tests section.
- Keep requiring real fenced output when checks are reported as run. Output authenticity remains outside this check.

## Integration / functional tests

- Run the CLI on the filled example and on an honest no-run body; both pass.
- Run the CLI on the unfilled GitHub template and an unexplained no-run body; both fail with actionable messages.
- Check both PR templates agree with the five required headings and the revised workflow.

## Smoke tests

- Run `bash -n install.sh` and `node --check scripts/check-pr-notes.mjs`.
- Run the skill-creator validator on this repository.
- Check local Markdown links and scan authored changes for em dashes and attribution trailers.

## E2E tests

Not applicable: this repository ships Markdown, a Node format checker, and a shell installer. No app or deployment changes.

## Manual checks

- Read the README as someone arriving from X: understand the problem and use within the first screen.
- Walk a tiny documentation fix and a webhook retry change through the skill; both have clear next actions without mandatory diagrams, interviews, quizzes, or extra approval gates.
- Review the entire diff against this contract before opening the PR.
- Check Node 18 and 22 compatibility if runtimes are available; state any untested environment explicitly.

## Out of scope

Posting to X, merging the PR, changing the installer, editing Bridge, and changing branch protection.
