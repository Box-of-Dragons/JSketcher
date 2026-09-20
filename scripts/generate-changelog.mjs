/**
 * generate-changelog.mjs — JSketcher changelog generator.
 *
 * Generates docs/changelog.md showing only fork-specific commits (commits
 * that exist in the current branch but not in upstream). Uses `git cherry`
 * to identify fork-only commits by patch ID, so it works even when the fork
 * has rebased or rewritten history relative to upstream.
 *
 * Usage:
 *   node scripts/generate-changelog.mjs
 *   node scripts/generate-changelog.mjs --root=. --output=docs/changelog.md
 *   node scripts/generate-changelog.mjs --upstream=upstream/main
 *
 * Parameters:
 *   --root      Repository root path (default: current working directory)
 *   --output    Output file path (default: docs/changelog.md)
 *   --upstream  Upstream ref to compare against (default: upstream/main)
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, basename } from 'node:path';

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      if (eq !== -1) {
        args[arg.slice(2, eq)] = arg.slice(eq + 1);
      } else {
        const key = arg.slice(2);
        const next = argv[i + 1];
        if (next && !next.startsWith('--')) {
          args[key] = next;
          i++;
        } else {
          args[key] = true;
        }
      }
    }
  }
  return args;
}

function git(root, ...args) {
  try {
    return execFileSync('git', ['-C', root, ...args], {
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024,
    });
  } catch (e) {
    throw new Error(`git ${args.join(' ')} failed: ${e.message}`);
  }
}

function getChangelogGroup(subject, body = '') {
  if (isBreakingChange(subject, body)) return 'breaking';
  if (/^feat(\([^)]+\))?:/i.test(subject)) return 'feature';
  if (/^fix(\([^)]+\))?:/i.test(subject)) return 'fix';
  if (/^docs(\([^)]+\))?:/i.test(subject)) return 'docs';
  if (/^refactor(\([^)]+\))?:/i.test(subject)) return 'refactor';
  if (/^test(\([^)]+\))?:/i.test(subject)) return 'test';
  if (/^chore(\([^)]+\))?:/i.test(subject)) return 'chore';
  if (/^ui(\([^)]+\))?:/i.test(subject)) return 'ui';
  return 'other';
}

function humanizeCommitSubject(subject) {
  let summary = subject.replace(/^(?:[a-z]+(?:\([^)]+\))?!?:\s*|BREAKING CHANGE:?\s*)/i, '');
  summary = summary.trim();
  if (summary === '') return subject;
  return summary.charAt(0).toUpperCase() + summary.slice(1);
}

function cleanCommitDescription(subject, body) {
  body = body.trim();
  if (body === '') return null;

  const lines = body.split(/\r?\n/);

  let hasBullets = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '' || /^(Signed-off-by:|Co-authored-by:|Reviewed-by:|Acked-by:)/i.test(trimmed)) {
      continue;
    }
    if (/^[-*]\s/.test(trimmed)) {
      hasBullets = true;
      break;
    }
  }

  const stripPrefix = (text) => {
    const match = text.match(/^(?:[a-z]+(?:\([^)]+\))?!?:\s*|BREAKING CHANGE:?\s*)/i);
    if (match) {
      const rest = text.slice(match[0].length).trim();
      if (rest !== '') return rest;
    }
    return text;
  };

  const summaryPrefix = subject.replace(/^(?:[a-z]+(?:\([^)]+\))?!?:\s*|BREAKING CHANGE:?\s*)/i, '').trim();

  if (hasBullets) {
    const bullets = [];
    let currentBullet = null;

    const processCurrentBullet = () => {
      if (currentBullet === null) return;
      let trimmed = currentBullet.replace(/\s+/g, ' ').trim();
      if (trimmed === '') {
        currentBullet = null;
        return;
      }
      trimmed = stripPrefix(trimmed);
      if (summaryPrefix !== '' && trimmed.toLowerCase().startsWith(summaryPrefix.toLowerCase())) {
        trimmed = trimmed.slice(summaryPrefix.length).trim();
      }
      if (trimmed !== '') bullets.push(trimmed);
      currentBullet = null;
    };

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '' || /^(Signed-off-by:|Co-authored-by:|Reviewed-by:|Acked-by:)/i.test(trimmed)) {
        processCurrentBullet();
        continue;
      }
      if (/^[-*]\s+/.test(line)) {
        processCurrentBullet();
        currentBullet = trimmed.replace(/^[-*]\s+/, '');
      } else if (currentBullet !== null) {
        currentBullet += ' ' + trimmed;
      } else {
        currentBullet = trimmed;
      }
    }
    processCurrentBullet();

    return bullets.length > 0 ? bullets : null;
  }

  const paragraphs = [];
  let current = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') {
      if (current.length > 0) {
        paragraphs.push(current.join(' '));
        current = [];
      }
      continue;
    }
    if (/^(Signed-off-by:|Co-authored-by:|Reviewed-by:|Acked-by:)/i.test(trimmed)) {
      continue;
    }
    let cleaned = trimmed.replace(/^-\s*/, '').replace(/^\*\s*/, '');
    current.push(cleaned);
  }

  if (current.length > 0) {
    paragraphs.push(current.join(' '));
  }

  for (let paragraph of paragraphs) {
    paragraph = paragraph.replace(/\s+/g, ' ').trim();
    if (paragraph !== '') {
      paragraph = stripPrefix(paragraph);
      if (summaryPrefix !== '' && paragraph.toLowerCase().startsWith(summaryPrefix.toLowerCase())) {
        paragraph = paragraph.slice(summaryPrefix.length).trim();
      }
      if (paragraph === '') continue;
      return paragraph;
    }
  }

  return null;
}

// --- Main ---

const args = parseArgs(process.argv);
const root = args.root ? resolve(args.root) : process.cwd();
const format = args.format || 'md';
const outputPath = args.output
  ? resolve(args.output)
  : resolve(root, format === 'html' ? 'web/changelog-fragment.html' : 'docs/changelog.md');
const upstreamRef = args.upstream || 'upstream/main';
const headRef = args.head || 'HEAD';

// Find fork-only commits using git cherry (compares patch IDs)
let cherryOutput;
try {
  cherryOutput = git(root, 'cherry', upstreamRef, headRef);
} catch (e) {
  console.error(`Could not run 'git cherry ${upstreamRef} ${headRef}'.`);
  console.error(`Make sure the upstream remote exists: git remote add upstream https://github.com/xibyte/jsketcher.git`);
  console.error(`Then: git fetch upstream`);
  process.exit(1);
}

const forkCommitShas = [];
for (const line of cherryOutput.split('\n')) {
  const trimmed = line.trim();
  if (trimmed.startsWith('+ ')) {
    forkCommitShas.push(trimmed.slice(2));
  }
}

if (forkCommitShas.length === 0) {
  console.error('No fork-specific commits found. All commits exist in upstream.');
  process.exit(0);
}

// Fetch full details for each fork commit (oldest first for chronological order)
// --no-walk ensures we only get the named commits, not their full ancestry
const logOutput = git(root, 'log', '--no-walk', '--pretty=format:%H%x1f%ad%x1f%s%x1f%B%x1e', '--date=short', '--reverse', ...forkCommitShas);

// Parse all fork commit records into a list (oldest first due to --reverse)
const forkCommits = [];
for (const record of logOutput.split('\x1e')) {
  if (record.trim() === '') continue;
  const parts = record.split('\x1f', 4);
  if (parts.length !== 4) continue;
  forkCommits.push({
    sha: parts[0].trim(),
    date: parts[1].trim(),
    subject: parts[2].trim(),
    body: parts[3],
  });
}

// --- Version computation ---
// Release segments over the fork commits: each strict vX.Y.Z tag closes a
// segment and labels it. The open tail segment gets the pending version —
// the latest tag plus the single highest pending bump, applied once.

function parseSemverTag(tag) {
  const match = /^v(\d+)\.(\d+)\.(\d+)$/.exec(tag.trim());
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

// Breaking is signalled by `!` in the subject or a `BREAKING CHANGE:` /
// `BREAKING-CHANGE:` footer (line-anchored so prose mentions don't count).
function isBreakingChange(subject, body = '') {
  return /!:/.test(subject) || /^BREAKING[ -]CHANGE:/m.test(body);
}

function getCommitType(subject, body = '') {
  if (isBreakingChange(subject, body)) return 'major';
  if (/^feat(\([^)]+\))?!?:/i.test(subject)) return 'minor';
  return 'patch';
}

function bumpVersion(version, bump) {
  switch (bump) {
    case 'major':
      return [version[0] + 1, 0, 0];
    case 'minor':
      return [version[0], version[1] + 1, 0];
    case 'patch':
      return [version[0], version[1], version[2] + 1];
    default:
      return version.slice();
  }
}

function formatVersion(version) {
  return `v${version[0]}.${version[1]}.${version[2]}`;
}

// Map strict semver tags to the commit they point at; %(*objectname) peels
// annotated tags down to their commit.
const tagVersions = {};
const tagOutput = git(root, 'tag', '--format=%(objectname)|%(*objectname)|%(refname:short)');
for (const line of tagOutput.split('\n')) {
  const parts = line.trim().split('|');
  if (parts.length !== 3) continue;
  const version = parseSemverTag(parts[2]);
  if (!version) continue;
  tagVersions[parts[1] !== '' ? parts[1] : parts[0]] = version;
}

const changeGroups = {
  breaking: [],
  feature: [],
  fix: [],
  ui: [],
  docs: [],
  refactor: [],
  test: [],
  chore: [],
  other: [],
};

const segments = [];
let tailCommits = [];
for (const commit of forkCommits) {
  tailCommits.push(commit);
  if (tagVersions[commit.sha]) {
    segments.push({ version: tagVersions[commit.sha], commits: tailCommits });
    tailCommits = [];
  }
}

const lastTagVersion = segments.length > 0 ? segments[segments.length - 1].version : null;
const bumpRank = { none: 0, patch: 1, minor: 2, major: 3 };
let pendingBump = 'none';
for (const commit of tailCommits) {
  const bump = getCommitType(commit.subject, commit.body);
  if (bumpRank[bump] > bumpRank[pendingBump]) pendingBump = bump;
}
// With no prior tag the pending first release is always v0.1.0.
const tailVersion = lastTagVersion !== null ? bumpVersion(lastTagVersion, pendingBump) : [0, 1, 0];
segments.push({ version: tailVersion, commits: tailCommits });

for (const segment of segments) {
  const segmentVersion = formatVersion(segment.version);
  for (const commit of segment.commits) {
    const group = getChangelogGroup(commit.subject, commit.body);
    changeGroups[group].push({
      version: segmentVersion,
      sha: commit.sha.slice(0, 8),
      date: commit.date,
      subject: humanizeCommitSubject(commit.subject),
      description: cleanCommitDescription(commit.subject, commit.body),
    });
  }
}

const currentVersion = formatVersion(tailVersion);

// Total commit count and HEAD info (for the snapshot line)
const commitCount = parseInt(git(root, 'rev-list', '--count', headRef).trim(), 10);
const shortSha = git(root, 'rev-parse', '--short', headRef).trim();
const forkCommitCount = forkCommitShas.length;

const groupLabels = {
  breaking: 'Breaking Changes',
  feature: 'Features',
  fix: 'Fixes',
  ui: 'Interface',
  docs: 'Documentation',
  refactor: 'Refactors',
  test: 'Tests',
  chore: 'Maintenance',
  other: 'Other Changes',
};

const groupOrder = ['breaking', 'feature', 'fix', 'ui', 'docs', 'refactor', 'test', 'chore', 'other'];

const groupChipClass = {
  breaking: 'color-pair-red',
  feature: 'color-pair-gold',
  fix: 'color-pair-sage',
  ui: 'color-pair-sky',
  docs: 'color-pair-stone',
  refactor: 'color-pair-plum',
  test: 'color-pair-olive',
  chore: 'color-pair-ink',
  other: 'color-pair-ink',
};

let content;

if (format === 'html') {
  const esc = (s) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  // Collect unique versions in descending order (newest first)
  const allVersions = new Set();
  for (const items of Object.values(changeGroups)) {
    for (const item of items) {
      allVersions.add(item.version);
    }
  }
  const sortedVersions = [...allVersions].sort((a, b) => {
    const pa = a.replace(/^v/, '').split('.').map(Number);
    const pb = b.replace(/^v/, '').split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const va = pa[i] || 0;
      const vb = pb[i] || 0;
      if (va !== vb) return vb - va;
    }
    return 0;
  });

  const html = [];

  // --- Sidebar blocks (moved into the sidebar via JS on the page) ---
  // Change Types as a headed panel
  html.push('<div class="changelog-types" data-version="v2">');
  html.push('  <div class="container-section--headed">');
  html.push('    <div class="container-section-header">Change Types</div>');
  html.push('    <div class="container-section-body">');
  html.push('      <nav class="container-actions" aria-label="Changelog sections">');
  for (const groupKey of groupOrder) {
    const items = changeGroups[groupKey];
    if (!items || items.length === 0) continue;
    html.push(`        <a class="chip ${groupChipClass[groupKey]}" href="#${groupKey}-changes">${groupLabels[groupKey]}</a>`);
  }
  html.push('      </nav>');
  html.push('    </div>');
  html.push('  </div>');
  html.push('</div>');

  // Versions list as a headed panel
  html.push('<div class="changelog-versions" data-version="v2">');
  html.push('  <div class="container-section--headed">');
  html.push('    <div class="container-section-header">Versions</div>');
  html.push('    <div class="container-section-body">');
  html.push('      <ul class="list">');
  for (const version of sortedVersions) {
    html.push(`        <li><a href="#${esc(version)}"><span class="caption">${esc(version)}</span></a></li>`);
  }
  html.push('      </ul>');
  html.push('    </div>');
  html.push('  </div>');
  html.push('</div>');

  // --- Main content: Build Snapshot + change sections ---
  html.push('<div class="container-sections">');

  // Build snapshot panel
  html.push('  <section class="panel panel--padded">');
  html.push('    <h3>Build Snapshot</h3>');
  html.push('    <div class="container-actions">');
  html.push(`      <span class="chip ${groupChipClass.other}">Version ${esc(currentVersion)}</span>`);
  html.push(`      <span class="chip color-pair-stone">${forkCommitCount} fork commits</span>`);
  html.push(`      <span class="chip color-pair-stone">${commitCount} total commits</span>`);
  html.push('    </div>');
  html.push('  </section>');

  // Each group
  for (const groupKey of groupOrder) {
    const items = changeGroups[groupKey];
    if (!items || items.length === 0) continue;

    html.push(`  <section class="panel panel--padded" id="${groupKey}-changes">`);
    html.push(`    <h4>${esc(groupLabels[groupKey])}</h4>`);
    html.push('    <ul class="list">');

    // Track which versions have already been anchored so only the first
    // entry for each version gets an id that the sidebar can link to.
    const anchoredVersions = new Set();

    for (const item of [...items].reverse()) {
      const liId = !anchoredVersions.has(item.version) ? ` id="${esc(item.version)}"` : '';
      if (liId) anchoredVersions.add(item.version);
      html.push(`      <li${liId}>`);
      html.push('        <div class="container-content">');
      html.push('          <div class="container-actions">');
      html.push(`          <span class="chip ${groupChipClass[groupKey]}">${esc(groupLabels[groupKey])}</span>`);
      html.push(`            <span class="caption">${esc(item.version)} - ${esc(item.sha)} - ${esc(item.date)}</span>`);
      html.push('          </div>');
      html.push(`          <h5>${esc(item.subject)}</h5>`);
      if (item.description) {
        html.push('          <ul>');
        if (Array.isArray(item.description)) {
          for (const bullet of item.description) {
            html.push(`            <li>${esc(bullet)}</li>`);
          }
        } else {
          html.push(`            <li>${esc(item.description)}</li>`);
        }
        html.push('          </ul>');
      }
      html.push('        </div>');
      html.push('      </li>');
    }

    html.push('    </ul>');
    html.push('  </section>');
  }

  html.push('</div>');
  content = html.join('\n');
} else {
  // --- Markdown format ---
  const lines = [];
  lines.push('# Changelog');
  lines.push('');
  lines.push(`> **${currentVersion}** — ${forkCommitCount} fork commits · ${commitCount} total commits · HEAD ${shortSha}`);
  lines.push('');
  lines.push('> Only commits unique to this fork are listed. Upstream history is excluded.');
  lines.push('> Generated from conventional commits using `git cherry ' + upstreamRef + ' ' + headRef + '`.');
  lines.push('');
  lines.push(`_Last generated: ${new Date().toISOString().slice(0, 10)}_`);
  lines.push('');

  for (const group of groupOrder) {
    const entries = changeGroups[group];
    if (entries.length === 0) continue;

    lines.push('---');
    lines.push('');
    lines.push(`## ${groupLabels[group]}`);
    lines.push('');

    for (const entry of entries) {
      lines.push(`### ${entry.subject}`);
      lines.push('');
      lines.push(`**${entry.version}** · ${entry.sha} · ${entry.date}`);
      lines.push('');
      if (entry.description) {
        if (Array.isArray(entry.description)) {
          for (const bullet of entry.description) {
            lines.push(`- ${bullet}`);
          }
        } else {
          lines.push(entry.description);
        }
        lines.push('');
      }
    }
  }

  lines.push('---');
  lines.push('');
  content = lines.join('\n');
}

function writeBuildInfo() {
  const buildInfoPath = resolve(root, 'web/js/buildInfo.js');
  const buildInfo = `window.BUILD_INFO = {\n` +
    `  version: "${currentVersion}",\n` +
    `  productionVersion: "${currentVersion}",\n` +
    `  commit: "${shortSha}",\n` +
    `  commitCount: "${commitCount}",\n` +
    `  forkCommitCount: "${forkCommitCount}"\n` +
    `};\n`;

  mkdirSync(dirname(buildInfoPath), { recursive: true });
  writeFileSync(buildInfoPath, buildInfo, 'utf8');
  return buildInfoPath;
}

// Write output
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, content, 'utf8');
const buildInfoPath = writeBuildInfo();

console.log(`Generated ${outputPath}`);
console.log(`Generated ${buildInfoPath}`);
console.log(`  Format: ${format}`);
console.log(`  Version: ${currentVersion}`);
console.log(`  ${forkCommitCount} fork-only commits (out of ${commitCount} total)`);
console.log(`  Upstream ref: ${upstreamRef}`);
console.log(`  HEAD: ${shortSha}`);
