// Sprint v5 Task 22 (PRD §11, Decision Q): keep the site's own class and id names clear of the
// generic cosmetic rules of common ad-blocking filter lists. On 2026-09-26 every web image was
// hidden for visitors using an ad blocker because it sat in `.ad-frame` / `.ad-link`, which
// EasyList hides on every site (`##.ad-frame`, `##.ad-link`). Pure: no I/O.

// A generic rule applies to every site: it starts with `##` (no domain before it) and, for the
// part this guard checks, names exactly one class (`##.name`) or one id (`###name`). Domain
// rules, exceptions (`#@#`), element-qualified, compound and attribute selectors are ignored.
const GENERIC_CLASS = /^##\.(-?[_a-zA-Z][\w-]*)$/;
const GENERIC_ID = /^###(-?[_a-zA-Z][\w-]*)$/;

export function extractGenericHideSelectors(filterText) {
  const classes = new Set();
  const ids = new Set();
  for (const raw of String(filterText).split(/\r?\n/)) {
    const line = raw.trim();
    const id = GENERIC_ID.exec(line);
    if (id) { ids.add(id[1]); continue; }
    const cls = GENERIC_CLASS.exec(line);
    if (cls) classes.add(cls[1]);
  }
  return { classes, ids };
}

// Every class token and id in the HTML (double- or single-quoted attributes).
export function pageTokens(html) {
  const classes = new Set();
  const ids = new Set();
  for (const m of String(html).matchAll(/\sclass\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    for (const token of (m[1] ?? m[2]).split(/\s+/)) if (token) classes.add(token);
  }
  for (const m of String(html).matchAll(/\sid\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    const value = (m[1] ?? m[2]).trim();
    if (value) ids.add(value);
  }
  return { classes, ids };
}

// The page's classes and ids that a generic rule would hide, sorted (classes first).
export function findBlockedTokens(html, selectors) {
  const { classes, ids } = pageTokens(html);
  const blocked = [];
  for (const name of [...classes].sort()) if (selectors.classes.has(name)) blocked.push({ kind: "class", name });
  for (const name of [...ids].sort()) if (selectors.ids.has(name)) blocked.push({ kind: "id", name });
  return blocked;
}
