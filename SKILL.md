---
name: pr-notes
description: Write shared plan notes before implementation and evidence-based PR descriptions after diff review, including who or what is affected. Use when starting work intended for a pull request, opening or updating a PR, writing PR notes, or adding PR-note templates and checks to a repository.
---

# PR notes

Preserve intent before implementation, then give reviewers the decisions, impact, evidence, and
gaps they need to evaluate the actual change. The notes guide code review; approval needs
judgment about both the change and its evidence.

Use two notes: a shared **plan note** before coding and **PR notes** after review. Both can live
in the PR description. For work already underway, record what is known now and say the plan was
written late; never invent an earlier plan or reconstruct human intent as fact.

Scale detail with the cost of being wrong. A tiny change can have a few sentences under What,
Why, and How. Use a diagram when it explains a mechanism. Substantial changes need clearer
acceptance criteria, evidence, and review attention. Split unrelated work into smaller PRs.

Skip this workflow for questions or work that will never become a PR, such as a throwaway spike.

## Where the notes live

Respect the user's chosen location. Otherwise use a connected notes tool if available; without
one, use the PR description. Never require a notes app or an issue to complete this workflow.

- **PR description only:** Put the plan in an existing draft PR body before coding, then add
  the final PR notes after review. If no PR exists yet, stage the plan in
  `.pr-notes/<branch>/plan.md` before implementation and include it in the first PR body. Exclude
  `.pr-notes/` through `.git/info/exclude`. No empty commit or premature PR is needed just to store
  the plan. Keep the plan as a clearly marked `## Plan` section above the five PR sections.
- **Connected notes tool:** Keep the shared plan there and the final notes as its child where
  supported. In Bridge, create the plan as kind `note`, not `task`. Share the page link.
- **Issue comment:** Use this when the user chooses it; edit the same plan comment as work changes.
  Follow repository conventions and the user's authorization for posting comments.

The final PR notes always go in the PR body. If reviewers cannot open the original plan, include
its intent, acceptance criteria, and important decisions there. A local path or a private notes
link alone is not a reviewer handoff. Save a copy beside the plan when useful.

## 1. Plan before implementation

Read code to understand the problem first. Before the first implementation edit, fill
[references/plan-note.md](references/plan-note.md):

- **What:** the observable outcome, affected people or consumers, scope, and acceptance criteria.
- **Why:** the problem and supporting evidence. Distinguish observed facts from assumptions.
  Consider a simpler alternative, including reuse or leaving behavior alone, and explain
  the choice briefly. Add a diagram if it makes the mechanism easier to understand.
- **How:** the files and symbols likely to change, implementation steps, and exact checks that
  would establish the criteria. Identify consequential verification gaps and risks.

Use the person's stated intent. Ask for missing information when it would materially change
the outcome; label routine assumptions and continue within the authorized scope.

The note is two-way. Re-read it before coding, on resuming or handing off work, and before
opening or updating the PR. Incorporate human edits and the user's latest explicit instructions;
resolve material conflicts rather than treating an old plan as newer than the conversation.

Share the plan and continue unless the person asked to review it first or an action needs
authorization that has not been given. Update the note when the work changes, with a short
"Changed during implementation" line and the reason. In a PR-only workflow, keep that record
in the plan section when adding the final notes.

## 2. Implement, verify, and trace impact

Implement from the plan. Run the relevant checks, read their output, and keep the real output
for the PR notes. Re-run affected checks after later edits so evidence covers the final change.

For each acceptance criterion, record what establishes it and what remains unverified. A
passing check covers only what it exercises. Consider whether a test could share the same
mistaken assumption as the implementation; use an observable behavior or failure case to check it.

Explicitly identify **who or what the change affects**. Trace relevant entry points, callers,
configuration, and interfaces to identify direct and indirect consumers. Consider end users,
operators, maintainers, coding agents, automation, API clients, and integrations where relevant;
do not fill a checklist of groups with no connection to the change.

For each affected group, state its surface, before/after behavior, compatibility or action needed,
and the evidence for the impact. Include a relevant unchanged contract when it matters. Label
inferred or unverified impact. Do not claim "all users" or "no impact" without checking the paths
that support it. Carry this assessment into **Users affected**, including agents and systems.
Offer to walk the human through that assessment when the effects are complex.

## 3. Review the actual diff

Read the diff and relevant surrounding code before writing the final summary:

- Compare behavior with the plan and criteria. Check relevant error paths, boundaries, and
  existing invariants. Look for accidental scope or default changes.
- Challenge consequential assumptions: what would make the approach wrong, and what evidence
  could reveal it? Assess maintainability, architecture, security, and performance as relevant.
- Record significant decisions, defaults, rejected alternatives, and deviations with concise
  reasons. Supply a checkable decision summary, not a transcript of internal reasoning.
- Fix findings and re-verify affected behavior. Report unresolved findings with file/line,
  impact, and missing evidence; do not hide them behind a passing format check.

A reviewer with fresh context can help with substantial or risky changes when available and
authorized. Label self-review accurately; another agent's agreement is additional evidence,
not human approval. Recommend deeper human review when consequences are high or you cannot
explain what the checks would miss.

When review reveals a repeatable failure, capture the lesson in a focused regression check or
an existing project rule when useful. Avoid generic instructions accumulated from every edit.

## 4. Write the PR notes

Use [references/pr-notes.md](references/pr-notes.md), including its filled example and PR-only
layout. Link or include the plan and name the issue if any, then keep these five sections:

| Section | Contains |
|---|---|
| **What I did** | Observable behavior, important decisions and assumptions, deviations and why. |
| **Codebase affected** | Grouped modules, APIs, migrations, config, or CI. Point to important paths to review first and explain why. |
| **Users affected** | Affected people, agents, automation, clients, or integrations; surface, before/after behavior, compatibility, and evidence or uncertainty. |
| **Tests I ran** | Actual commands and output, what they establish, what they miss, and what was not run. |
| **Tradeoffs and risks** | What was given up, remaining findings, possible failures, reach, detection, and rollback. |

"No user-facing change" is valid with a reason; still name developer, agent, or system effects
when present. Keep the heading **Users affected** for compatibility with existing checks.

Keep **Tests I ran** honest:

- Paste actual output in fenced blocks. Preserve failures, warnings, skips, and flakes and
  explain their disposition. Never rewrite output into a success summary.
- Trim long passing output only with an explicit marker such as `[... 340 passing lines trimmed ...]`.
- Explain what the checks establish and leave unverified. Identify the revision and relevant
  environment when they affect reproducibility or interpretation.
- If some checks ran, include their output and list others as `Not run: <what and why>`.
- If no checks ran, start the section with `Not run: <specific reason>` without inventing output.
  State what is unverified. For manual checks, record the actions and observed results in an
  evidence block; attach relevant screenshots. Do not invent a shell command for a manual action.

For UI changes, add screenshots of relevant appearance or interaction states.

For substantial work, offer an optional understanding check: how does the important path work,
what failure might the checks miss, and how would we detect or reverse it? Make the questions
specific to the actual change. Never invent human answers or approval, and do not turn the
questions into an automatic merge gate.

Before opening or updating the PR, run:

```bash
node <this skill's directory>/scripts/check-pr-notes.mjs body.md
```

The checker validates format: five populated sections and an output block or a reasoned no-run
declaration. It cannot authenticate output, prove the plan predated implementation, verify
correctness, or establish human understanding. A passing result is not approval to merge.

Use `gh pr create --body-file body.md` when creating a PR and share its link. In a PR-only
workflow, preserve the plan above the final notes rather than replacing it with a new summary.

## Add the format check to a repository

When asked, copy the PR template, workflow, and checker from `assets/github/` and `scripts/`.
Merge with existing files and repository conventions rather than replacing them blindly.
Add a short rule to existing agent instruction files naming the two notes and checker command.

The workflow skips drafts. Bot authors, the `format-exempt` label, and
`<!-- pr-format: exempt -->` also bypass the check. Branch protection changes require the user's
authorization; installing this skill alone does not enforce its workflow.

## Writing style

Plain, specific, and proportional to the change. Prefer claims a reviewer can check against a
file, command, output, or screen. Say what you do not know instead of filling the gap.
