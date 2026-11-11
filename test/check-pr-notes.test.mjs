import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  EXEMPT_LABEL,
  EXEMPT_MARKER,
  MIN_SECTION_CHARS,
  SECTIONS,
  checkPullRequestFormat,
  failureMessage,
} from "../scripts/check-pr-notes.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));

const OUTPUT = "```\n$ node --test scripts/test\n# pass 42\n# fail 0\n```";

const FILLED = {
  did: "Added a PR notes gate next to the title check.",
  codebase: "scrip../scripts/check-pr-notes.mjs and .github/workflows/pr-title.yml.",
  users: "No user-facing change; contributors see one more check.",
  tests: `Ran the release tests.\n\n${OUTPUT}`,
  risks: "Bodies written before this rule fail until edited.",
};

function body(overrides = {}) {
  const parts = { ...FILLED, ...overrides };
  return SECTIONS.filter((section) => parts[section.key] !== null)
    .map((section) => `## ${section.heading}\n\n${parts[section.key]}\n`)
    .join("\n");
}

test("accepts a body with all five sections filled in", () => {
  const result = checkPullRequestFormat(body());
  assert.equal(result.ok, true, result.problems.join("\n"));
  assert.equal(result.exempt, false);
  assert.ok(Object.values(result.sections).every(Boolean));
});

test("names every missing section", () => {
  const result = checkPullRequestFormat("Fixes the stall. Tested locally.");
  assert.equal(result.ok, false);
  assert.equal(result.problems.length, SECTIONS.length);
  for (const section of SECTIONS) {
    assert.ok(result.problems.some((problem) => problem.includes(section.heading)), section.heading);
  }
});

test("rejects one missing section and keeps the others", () => {
  const result = checkPullRequestFormat(body({ users: null }));
  assert.equal(result.ok, false);
  assert.deepEqual(result.problems, ["Missing a `## Users affected` section."]);
  assert.equal(result.sections.users, false);
  assert.equal(result.sections.did, true);
});

test("the unfilled template fails on every section", () => {
  const template = readFileSync(`${root}assets/github/pull_request_template.md`, "utf8");
  const result = checkPullRequestFormat(template);
  assert.equal(result.ok, false);
  assert.equal(result.problems.length, SECTIONS.length);
  assert.ok(result.problems.every((problem) => /empty or too thin/.test(problem)));
});

test("the template carries every heading the check looks for", () => {
  const template = readFileSync(`${root}assets/github/pull_request_template.md`, "utf8");
  for (const section of SECTIONS) {
    assert.match(template, new RegExp(`^## ${section.heading}$`, "m"));
  }
});

test("tests need a fenced block of raw output, not a summary", () => {
  const result = checkPullRequestFormat(body({ tests: "All tests pass locally, vitest and cargo." }));
  assert.equal(result.ok, false);
  assert.equal(result.problems.length, 1);
  assert.match(result.problems[0], /unedited output in a fenced code block/);
});

test("an empty fence does not count as output", () => {
  const result = checkPullRequestFormat(body({ tests: "Ran everything locally.\n\n```\n\n```" }));
  assert.equal(result.ok, false);
  assert.match(result.problems[0], /fenced code block/);
});

test("accepts an explicit no-run declaration with a visible reason", () => {
  const result = checkPullRequestFormat(body({
    tests: "Not run: the required staging receiver is unavailable.\n\nStill unverified: delivery recovery in staging.",
  }));
  assert.equal(result.ok, true, result.problems.join("\n"));
  assert.equal(result.exempt, false);
});

test("no-run declarations work with CRLF and nested verification notes", () => {
  const markdown = body({
    tests: "Not run: this draft has no implementation to exercise.\n\n### Still unverified\n\nAll planned acceptance criteria.",
  }).replaceAll("\n", "\r\n");
  const result = checkPullRequestFormat(markdown);
  assert.equal(result.ok, true, result.problems.join("\n"));
});

test("no-run declarations need a reason beyond placeholders or comments", () => {
  for (const reason of ["", "...", "___", "TODO", "TBD", "N/A", "none", "nothing skipped", "unknown", "<specific reason>", "<!-- staging is unavailable -->"]) {
    const result = checkPullRequestFormat(body({
      tests: `Not run: ${reason}\n\nStill unverified: webhook retry behavior.`,
    }));
    assert.equal(result.ok, false, reason || "empty reason");
    assert.equal(result.sections.tests, false);
    assert.match(result.problems[0], /Not run/);
  }
});

test("a no-run declaration hidden in a comment is not evidence", () => {
  const result = checkPullRequestFormat(body({
    tests: "No evidence is included for these checks.\n<!--\nNot run: staging is unavailable for this change.\n-->",
  }));
  assert.equal(result.ok, false);
  assert.equal(result.sections.tests, false);
});

test("output hidden in a comment does not satisfy the evidence requirement", () => {
  const result = checkPullRequestFormat(body({
    tests: `No visible test evidence is recorded.\n<!--\n${OUTPUT}\n-->`,
  }));
  assert.equal(result.ok, false);
  assert.equal(result.sections.tests, false);
});

test("skipping one suite does not replace output for checks reported as run", () => {
  const result = checkPullRequestFormat(body({
    tests: "Ran the unit suite successfully.\n\nNot run: the e2e suite requires a staging receiver.",
  }));
  assert.equal(result.ok, false);
  assert.equal(result.sections.tests, false);
});

test("a no-run declaration in another section does not satisfy tests", () => {
  const result = checkPullRequestFormat(body({
    tests: "No command or output has been recorded for this change.",
    risks: "Not run: the staging cluster is unavailable for this change.",
  }));
  assert.equal(result.ok, false);
  assert.equal(result.sections.tests, false);
});

test("a reasoned no-run declaration does not exempt missing sections", () => {
  const result = checkPullRequestFormat(body({
    users: null,
    tests: "Not run: the required staging receiver is unavailable.",
  }));
  assert.equal(result.ok, false);
  assert.equal(result.exempt, false);
  assert.equal(result.sections.tests, true);
  assert.deepEqual(result.problems, ["Missing a `## Users affected` section."]);
});

test("a plan in the PR body coexists with final notes without replacing them", () => {
  const plan = "## Plan\n\n### What\nKeep retries bounded.\n\n### Why\nTemporary failures lose events.\n\n### How\nVerify the attempt cap.\n\n";
  assert.equal(checkPullRequestFormat(plan + body()).ok, true);
  const missing = checkPullRequestFormat(plan + body({ did: null }));
  assert.equal(missing.ok, false);
  assert.equal(missing.sections.did, false);
});

test("headings inside pasted output do not split the section", () => {
  const noisy = "Ran it.\n\n```\n## Users affected\n# fail 0\n```";
  const result = checkPullRequestFormat(body({ tests: noisy }));
  assert.equal(result.ok, true, result.problems.join("\n"));
});

test("subsections stay inside their parent section", () => {
  const nested = `Ran the suites.\n\n### vitest\n\n${OUTPUT}\n\n### cargo\n\nskipped, no Rust change`;
  const result = checkPullRequestFormat(body({ tests: nested }));
  assert.equal(result.ok, true, result.problems.join("\n"));
});

test("tolerates emoji, h3, case and trailing colons", () => {
  const decorated = body()
    .replace("## What I did", "### 🛠 What I Did:")
    .replace("## Tradeoffs and risks", "## Trade-offs / what could go wrong");
  const result = checkPullRequestFormat(decorated);
  assert.equal(result.ok, true, result.problems.join("\n"));
});

test("content just under and just over the threshold flips the verdict", () => {
  const under = checkPullRequestFormat(body({ users: "x".repeat(MIN_SECTION_CHARS - 1) }));
  const over = checkPullRequestFormat(body({ users: "x".repeat(MIN_SECTION_CHARS) }));
  assert.equal(under.ok, false);
  assert.equal(over.ok, true);
});

test("bots, the label and the marker are exempt", () => {
  assert.equal(checkPullRequestFormat("bump deps", { isBot: true }).exempt, true);
  assert.equal(checkPullRequestFormat("", { labels: [EXEMPT_LABEL.toUpperCase()] }).exempt, true);
  assert.equal(checkPullRequestFormat(`<!-- ${EXEMPT_MARKER} -->`).exempt, true);
});

test("mentioning the marker in code does not exempt a body", () => {
  const inline = checkPullRequestFormat(`Escape hatch: \`<!-- ${EXEMPT_MARKER} -->\` in the body.`);
  const fenced = checkPullRequestFormat(`\`\`\`\n<!-- ${EXEMPT_MARKER} -->\n\`\`\``);
  assert.equal(inline.exempt, false);
  assert.equal(fenced.exempt, false);
  assert.equal(inline.ok, false);
});

test("a null body fails rather than throwing", () => {
  assert.equal(checkPullRequestFormat(null).ok, false);
});

test("the failure message lists each problem and the escape hatch", () => {
  const message = failureMessage(["Missing a `## Tests I ran` section."]);
  assert.match(message, /- Missing a `## Tests I ran` section\./);
  assert.match(message, new RegExp(EXEMPT_LABEL));
  assert.match(message, /pr-notes/);
});
