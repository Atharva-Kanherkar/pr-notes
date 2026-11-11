# pr-notes

**Your agent shipped the code. Can you explain the change?**

`pr-notes` is a skill for coding agents that keeps the intent, evidence, and important decisions
with every pull request. Two short notes: a shared plan before the code, and PR notes after review.

Works with Claude Code, Codex, Cursor, and OpenCode. Includes a PR template and a CI format check
with no runtime dependencies beyond Node 18+.

## What it looks like

For a webhook retry fix:

> **Before:** Retry temporary failures, up to six attempts total. Keep 4xx responses final.
> Check that a receiver failing twice eventually gets the event.
>
> **After:** Added retries with backoff and jitter. The integration test covers recovery after
> two failures. A mass outage could still flood the queue; the load test was not run.
>
> **Affected:** Receivers get extra attempts. Operators need to watch queue depth.
> API clients keep the same event format.

A reviewer can see what was intended, who is affected, what was checked, and where to look harder.

## How it works

1. **Plan together.** Write what should change, why it matters, the assumptions, a simpler
   alternative, and what would count as done. You can edit the plan; the agent re-reads it.
2. **Build, check, review.** The agent runs the relevant checks, then reviews the actual diff
   against the plan. It records important decisions and anything still unverified.
3. **Leave useful PR notes.** Five sections: what changed, codebase affected, users affected,
   checks and their output, tradeoffs and risks. Include the plan or a link reviewers can open.

The impact section names affected people, coding agents, API clients, and integrations where
relevant, with what changes for each. Small change? A few sentences can be enough. Add a diagram
when it explains the mechanism; give changes to payments, permissions, or user data more attention.

Your part: judge whether this solves the right problem and whether the evidence is enough.
For substantial work, the agent can offer three optional questions: how does the important path
work, what could the checks miss, and how would you detect or reverse a failure?

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/Atharva-Kanherkar/pr-notes/main/install.sh | bash
```

This installs into each supported agent directory it finds. Start a new session, then say:

> Use pr-notes for this change.

The skill also supports automatic discovery when you start work for a PR. Your agent controls
when skills are loaded; the skill alone does not enforce the workflow.

<details>
<summary>Choose an agent or install in one project</summary>

```bash
git clone https://github.com/Atharva-Kanherkar/pr-notes
cd pr-notes
./install.sh --agent claude          # ~/.claude/skills
./install.sh --agent codex,cursor    # ~/.codex/skills, ~/.cursor/skills
./install.sh --agent opencode       # ~/.config/opencode/skills
./install.sh --dir ~/path/to/skills  # a custom skills directory
```

For one project's Claude Code installation, run the installer from that project:

```bash
cd /path/to/your-project
/path/to/pr-notes/install.sh --project
```

</details>

## No notes app? Use the PR description

Keep the plan and final notes together in the PR body. Use an existing draft PR for the plan.
If there is no PR yet, the agent writes the plan locally before coding and includes it in the
first PR description. No extra app or issue is needed.

If you prefer a connected notes app or an issue comment, use that for the shared plan. The final
notes still go in the PR. Include a plan summary when reviewers cannot open the original.

## Add the CI check

Ask your agent:

> Make pr-notes a rule for this repo.

The check requires the five PR sections to have content, plus a non-empty output block under
"Tests I ran" or an explicit `Not run: <reason>` when no checks ran.

**A passing check means the description has the expected format.** Reviewing the code and
evidence still has to establish correctness. The check cannot establish whether the plan came
first, whether pasted output is authentic, or whether someone understands the change.

<details>
<summary>Manual setup and local checks</summary>

From the repository you want to configure, point to your installed skill. This example uses
Codex; use your own installation path for another agent. Use these commands when the destination
files do not exist; otherwise merge the additions into your existing template and workflow.
When upgrading the skill, update these copied files in your repository too.

```bash
pr_notes_skill="$HOME/.codex/skills/pr-notes"
mkdir -p .github/workflows scripts
cp "$pr_notes_skill/assets/github/pull_request_template.md" .github/pull_request_template.md
cp "$pr_notes_skill/assets/github/workflows/pr-notes.yml" .github/workflows/pr-notes.yml
cp "$pr_notes_skill/scripts/check-pr-notes.mjs" scripts/check-pr-notes.mjs
```

Make `PR notes` a required check in branch protection to block merges on formatting failures.
Drafts, bot authors, the `format-exempt` label, and `<!-- pr-format: exempt -->` skip the check.

Check a body locally:

```bash
node scripts/check-pr-notes.mjs body.md
gh pr view 123 --json body -q .body | node scripts/check-pr-notes.mjs
```

</details>

## Read the workflow

- [Agent instructions](SKILL.md)
- [Plan template and examples](references/plan-note.md)
- [PR template and examples](references/pr-notes.md)
- Run the checker tests: `node --test test/*.test.mjs`

Related reading: Addy Osmani's [Agentic Code Review](https://addyosmani.com/blog/agentic-code-review/)
and [Cognitive Surrender](https://addyosmani.com/blog/cognitive-surrender/).

[MIT license](LICENSE)
