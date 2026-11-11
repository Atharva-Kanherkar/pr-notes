#!/usr/bin/env node
// pr-notes checker: does a pull request body carry its five PR notes?
//
//   node check-pr-notes.mjs body.md
//   gh pr view 123 --json body -q .body | node check-pr-notes.mjs
//   PR_BODY="$body" node check-pr-notes.mjs          (how the CI workflow calls it)
//
// Sections: What I did, Codebase affected, Users affected, Tests I ran (with an
// output block or a reasoned no-run declaration), Tradeoffs and risks. This
// checks format, not execution authenticity or correctness. Exempt: PR_AUTHOR_TYPE=Bot,
// the `format-exempt` label (PR_LABELS as a JSON array), or the body marker
// `<!-- pr-format: exempt -->`. Zero dependencies, Node 18+.
// https://github.com/Atharva-Kanherkar/pr-notes

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// `## Tests I ran`, `### 🧪 Tests I ran:` both count. A heading deeper than h3
// is a subsection of something else, so it does not.
const HEADING = /^[ \t]{0,3}(#{2,3})[ \t]+(.+?)[ \t]*$/gm;

/** Strip the parts of a body that are not content a reader would see. */
export function visibleText(markdown) {
  return markdown
    .replace(/<!--[\s\S]*?-->/g, '') // HTML comments (template guidance)
    .replace(/^[ \t]*[-*+][ \t]+\[[ x]\][ \t]*$/gm, '') // empty checklist rows
    .replace(/^[ \t]*_?(?:TODO|TBD|N\/A)[.!]?_?[ \t]*$/gim, ''); // placeholders
}

/**
 * Split a markdown body into its h2/h3 headings and the text under each.
 * Returns `[{ level, title, body, index }]` in document order.
 */
export function parseHeadings(markdown) {
  const source = String(markdown ?? '');
  const found = [];
  for (const match of source.matchAll(HEADING)) {
    found.push({
      level: match[1].length,
      title: match[2].replace(/[:：]\s*$/, '').trim(),
      start: match.index ?? 0,
      contentStart: (match.index ?? 0) + match[0].length,
    });
  }
  return found.map((heading, position) => ({
    level: heading.level,
    title: heading.title,
    index: position,
    body: source.slice(
      heading.contentStart,
      position + 1 < found.length ? found[position + 1].start : source.length,
    ),
  }));
}

/** Minimum non-whitespace characters a section needs to count as written. */
export const MIN_SECTION_CHARS = 20;

/** Marker a body can carry to opt out of the gate. */
export const EXEMPT_MARKER = 'pr-format: exempt';

/** Label that exempts a pull request. */
export const EXEMPT_LABEL = 'format-exempt';

export const SECTIONS = [
  {
    key: 'did',
    heading: 'What I did',
    pattern: /what\s+(?:i|we)\s+did|what\s+this\s+pr\s+does|what\s+changed/i,
  },
  { key: 'codebase', heading: 'Codebase affected', pattern: /codebase|code\s+affected/i },
  { key: 'users', heading: 'Users affected', pattern: /users?\s+affected|user\s+impact|who\s+is\s+affected/i },
  { key: 'tests', heading: 'Tests I ran', pattern: /tests?\s+(?:i|we)\s+ran|tests?\s+run\b/i },
  { key: 'risks', heading: 'Tradeoffs and risks', pattern: /trade-?offs?|risks?|what\s+could\s+go\s+wrong/i },
];

const FENCE = /^[ \t]{0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?^[ \t]{0,3}\1[ \t]*$/gm;
const FENCE_TOKEN = '\u0000fenced-output\u0000';

/**
 * Pasted test output often contains `## ` lines, so fenced blocks are swapped
 * for a token before headings are parsed. A non-empty block keeps its token,
 * which records that the section contains a non-empty block, not that it is authentic.
 */
function maskFences(markdown) {
  return markdown.replace(FENCE, (block) => {
    const inner = block.split('\n').slice(1, -1).join('\n').trim();
    return inner ? FENCE_TOKEN : '';
  });
}

/**
 * The marker only counts as an HTML comment in the body itself. A body that
 * mentions it in code, as this rule's own docs and PRs do, is not exempt.
 */
function hasExemptMarker(markdown) {
  const prose = markdown.replace(FENCE, '').replace(/`[^`\n]*`/g, '');
  return /<!--\s*pr-format:\s*exempt\s*-->/i.test(prose);
}

function matchesSection(title, pattern) {
  return pattern.test(title.replace(/[^\p{L}\p{N}\s/-]/gu, ' '));
}

/** A no-output section must start with an explicit, visible no-run declaration. */
function hasNoRunDeclaration(markdown) {
  const firstLine = visibleText(markdown).trim().split('\n')[0];
  const declaration = /^Not run:[ \t]*(.+)$/i.exec(firstLine);
  if (!declaration) return false;
  const reason = declaration[1].replace(/[`*_]/g, '').trim();
  return /\p{L}/u.test(reason) &&
    !/^(?:<[^>]*>|TODO\b.*|TBD\b.*|N\/A|none|nothing(?: skipped)?|unknown|not applicable)[.!]?$/i.test(reason);
}

/** A section runs until the next heading at its own level or higher. */
function sectionBody(headings, position) {
  const { level } = headings[position];
  let text = headings[position].body;
  for (let next = position + 1; next < headings.length && headings[next].level > level; next += 1) {
    text += `\n${headings[next].title}\n${headings[next].body}`;
  }
  return text;
}

/**
 * Check a pull request body against the PR notes rule.
 *
 * @param {string} body raw pull request body markdown
 * @param {{ labels?: string[], isBot?: boolean }} [options]
 * @returns {{ ok: boolean, exempt: boolean, problems: string[], sections: Record<string, boolean> }}
 */
export function checkPullRequestFormat(body, options = {}) {
  const source = String(body ?? '');
  const labels = (options.labels ?? []).map((label) => String(label).toLowerCase());
  const all = Object.fromEntries(SECTIONS.map((section) => [section.key, true]));

  if (options.isBot || labels.includes(EXEMPT_LABEL) || hasExemptMarker(source)) {
    return { ok: true, exempt: true, problems: [], sections: all };
  }

  const headings = parseHeadings(maskFences(source.replace(/\r\n/g, '\n')));
  const problems = [];
  const sections = {};

  for (const section of SECTIONS) {
    const position = headings.findIndex((candidate) => matchesSection(candidate.title, section.pattern));
    if (position === -1) {
      problems.push(`Missing a \`## ${section.heading}\` section.`);
      sections[section.key] = false;
      continue;
    }
    const text = sectionBody(headings, position);
    const visible = visibleText(text);
    const written = visible.replace(/\s+/g, ' ').trim();
    if (written.length < MIN_SECTION_CHARS) {
      problems.push(
        `The \`${headings[position].title}\` section is empty or too thin ` +
          `(${written.length} characters, needs at least ${MIN_SECTION_CHARS}).`,
      );
      sections[section.key] = false;
      continue;
    }
    if (section.key === 'tests' && !visible.includes(FENCE_TOKEN) && !hasNoRunDeclaration(visible)) {
      problems.push(
        `The \`${headings[position].title}\` section needs the commands you ran and their ` +
          'unedited output in a fenced code block, or start with `Not run: <specific reason>` ' +
          'when no checks ran.',
      );
      sections[section.key] = false;
      continue;
    }
    sections[section.key] = true;
  }

  return { ok: problems.length === 0, exempt: false, problems, sections };
}

/** The failure text the CI job prints. */
export function failureMessage(problems) {
  return [
    'This pull request body is missing its PR notes:',
    '',
    ...problems.map((problem) => `- ${problem}`),
    '',
    'Edit the description; the check reruns on every edit.',
    'Template and rules: https://github.com/Atharva-Kanherkar/pr-notes',
    `If the PR genuinely does not fit, add the \`${EXEMPT_LABEL}\` label.`,
  ].join('\n');
}

function readBody(path) {
  if (path) return readFileSync(path, 'utf8');
  if (process.env.PR_BODY !== undefined) return process.env.PR_BODY;
  return readFileSync(0, 'utf8');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const labels = JSON.parse(process.env.PR_LABELS || '[]');
  const isBot = process.env.PR_AUTHOR_TYPE === 'Bot';
  const result = checkPullRequestFormat(readBody(process.argv[2]), { labels, isBot });
  if (result.exempt) {
    console.log('Exempt from the PR notes check.');
  } else if (result.ok) {
    console.log('PR notes present: what I did, codebase, users, tests, tradeoffs.');
  } else {
    console.error(failureMessage(result.problems));
    process.exit(1);
  }
}
