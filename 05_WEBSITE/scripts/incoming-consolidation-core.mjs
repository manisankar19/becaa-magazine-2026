// Pure planning logic for merging 02_INCOMING_CONTENT/v2-incoming/ into
// 02_INCOMING_CONTENT/ (Sprint v4 Task 2, sprints/v4/TASKS.md). No fs/path I/O:
// callers read real files and pass in { name, bytes, sha256 } arrays.

const NEAR_NAME_THRESHOLD = 0.6;
const SUB_FOLDER = "v2-incoming";

const lower = (name) => String(name).toLowerCase();

// Character bigrams of a string, e.g. "abc" -> ["ab", "bc"].
function bigrams(str) {
  const grams = [];
  for (let i = 0; i < str.length - 1; i++) grams.push(str.slice(i, i + 2));
  return grams;
}

// Sorensen-Dice coefficient over bigram multisets: 2*|A∩B| / (|A|+|B|), in [0,1].
function diceCoefficient(a, b) {
  if (a === b) return 1;
  const bigramsA = bigrams(a);
  const bigramsB = bigrams(b);
  if (bigramsA.length === 0 || bigramsB.length === 0) return 0;
  const counts = new Map();
  for (const gram of bigramsA) counts.set(gram, (counts.get(gram) ?? 0) + 1);
  let matches = 0;
  for (const gram of bigramsB) {
    const remaining = counts.get(gram) ?? 0;
    if (remaining > 0) {
      matches++;
      counts.set(gram, remaining - 1);
    }
  }
  return (2 * matches) / (bigramsA.length + bigramsB.length);
}

// Drop a trailing ".ext" (if any) so a rename across formats — e.g. .png vs .jpg —
// doesn't depress the score, then lowercase and collapse whitespace.
function normalizeForSimilarity(name) {
  const str = String(name);
  const dot = str.lastIndexOf(".");
  const base = dot > 0 ? str.slice(0, dot) : str;
  return base.toLowerCase().trim().replace(/\s+/g, " ");
}

// Dependency-free filename similarity in [0,1]: bigram Dice coefficient on the
// lowercased, extension-stripped basename. Used only to surface "near" names for a
// human to review — it never decides collisions (those are exact, case-insensitive).
export function nameSimilarity(nameA, nameB) {
  return diceCoefficient(normalizeForSimilarity(nameA), normalizeForSimilarity(nameB));
}

// planConsolidation({ parentFiles, subFiles }) -> { ok, collisions, nearNames, moves, inventoryAfter }
//
// parentFiles: files already in 02_INCOMING_CONTENT/, each { name, bytes, sha256 }.
// subFiles: files in 02_INCOMING_CONTENT/v2-incoming/, each { name, bytes, sha256 }.
//
// - collisions: case-insensitive name clashes, either between a subFiles entry and a
//   parentFiles entry, or between two subFiles entries. Any collision sets ok: false.
// - nearNames: subFiles/parentFiles pairs (excluding exact case-insensitive matches,
//   which are already collisions) whose nameSimilarity is >= 0.6, with both hashes.
// - moves: the planned git-mv-equivalent for every subFiles entry that is not part of
//   a collision, i.e. safe to merge into the parent folder.
// - inventoryAfter: parentFiles unchanged, plus every subFiles entry that is in moves,
//   as they would land at their destination name.
export function planConsolidation({ parentFiles = [], subFiles = [] } = {}) {
  const asEntry = (source, f) => ({ source, name: f.name, bytes: f.bytes, sha256: f.sha256 });

  const parentByKey = new Map();
  for (const pf of parentFiles) {
    const key = lower(pf.name);
    if (!parentByKey.has(key)) parentByKey.set(key, []);
    parentByKey.get(key).push(pf);
  }

  const subByKey = new Map();
  for (const sf of subFiles) {
    const key = lower(sf.name);
    if (!subByKey.has(key)) subByKey.set(key, []);
    subByKey.get(key).push(sf);
  }

  const collisions = [];
  const blockedKeys = new Set();

  // Collisions within subFiles itself: two or more sub files sharing a
  // case-insensitive name (e.g. two independently-uploaded "Notes.docx").
  for (const [key, entries] of subByKey) {
    if (entries.length > 1) {
      collisions.push({ name: key, entries: entries.map((f) => asEntry("sub", f)) });
      blockedKeys.add(key);
    }
  }

  // Collisions between subFiles and parentFiles: merging would overwrite or
  // conflict with a file already present in the destination folder.
  for (const [key, subEntries] of subByKey) {
    const parentEntries = parentByKey.get(key);
    if (!parentEntries) continue;
    collisions.push({
      name: key,
      entries: [...parentEntries.map((f) => asEntry("parent", f)), ...subEntries.map((f) => asEntry("sub", f))],
    });
    blockedKeys.add(key);
  }

  // Near names: a subFiles entry and a parentFiles entry whose names are similar but
  // not case-insensitively identical (identical names are already a collision above).
  const nearNames = [];
  for (const sf of subFiles) {
    const subKey = lower(sf.name);
    for (const pf of parentFiles) {
      if (lower(pf.name) === subKey) continue;
      const similarity = nameSimilarity(sf.name, pf.name);
      if (similarity >= NEAR_NAME_THRESHOLD) {
        nearNames.push({
          sub: { name: sf.name, sha256: sf.sha256 },
          parent: { name: pf.name, sha256: pf.sha256 },
          similarity,
        });
      }
    }
  }

  // Moves: every subFiles entry not caught up in a collision.
  const moves = subFiles.filter((sf) => !blockedKeys.has(lower(sf.name))).map((sf) => ({ from: `${SUB_FOLDER}/${sf.name}`, to: sf.name }));

  const movedKeys = new Set(moves.map((m) => lower(m.to)));
  const inventoryAfter = [
    ...parentFiles.map((pf) => ({ name: pf.name, bytes: pf.bytes, sha256: pf.sha256 })),
    ...subFiles.filter((sf) => movedKeys.has(lower(sf.name))).map((sf) => ({ name: sf.name, bytes: sf.bytes, sha256: sf.sha256 })),
  ];

  return { ok: collisions.length === 0, collisions, nearNames, moves, inventoryAfter };
}
