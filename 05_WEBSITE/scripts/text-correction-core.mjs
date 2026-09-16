// Sprint v4 §4.7 (Task 22): exact, count-guarded text corrections for the committee
// corrections. Pure — no file access. A correction either replaces exactly the expected
// number of occurrences or throws, so a corrected file can never drift silently on a re-run.

// Letters, combining marks (Bengali vowel signs, virama, nukta…) and digits continue a word:
// "বেকানী" is "বেকান" + the vowel sign "ী", so it is not a whole-word match for "বেকান".
// JavaScript's \b only understands ASCII word characters, hence the explicit check.
const WORD_CHAR = /[\p{L}\p{M}\p{N}_]/u;

function matchIndices(text, find, wholeWord) {
  const indices = [];
  for (let i = text.indexOf(find); i !== -1; i = text.indexOf(find, i + find.length)) {
    if (wholeWord) {
      const before = text.slice(0, i).at(-1) ?? "";
      const after = text[i + find.length] ?? "";
      if (WORD_CHAR.test(before) || WORD_CHAR.test(after)) continue;
    }
    indices.push(i);
  }
  return indices;
}

// Occurrences of `find` that still need correcting. When the replacement itself contains
// the find string ("Biswajit Sengupta" → "Late Biswajit Sengupta"), matches lying inside an
// occurrence of the replacement are already corrected and are not counted.
function pendingIndices(text, find, replace, wholeWord) {
  const found = matchIndices(text, find, wholeWord);
  if (!replace || !replace.includes(find)) return found;
  const covered = matchIndices(text, replace, wholeWord).map((start) => [start, start + replace.length]);
  return found.filter((i) => !covered.some(([start, end]) => i >= start && i + find.length <= end));
}

export function countOccurrences(text, find, { wholeWord = true } = {}) {
  if (typeof find !== "string" || find === "") throw new Error("countOccurrences: find must be a non-empty string");
  return matchIndices(String(text), find, wholeWord).length;
}

function checkArgs({ find, replace, expectedCount }) {
  if (typeof find !== "string" || find === "") throw new Error("applyCorrection: find must be a non-empty string");
  if (typeof replace !== "string") throw new Error("applyCorrection: replace must be a string");
  if (find === replace) throw new Error("applyCorrection: find and replace must differ");
  if (!Number.isInteger(expectedCount) || expectedCount < 1) throw new Error("applyCorrection: expectedCount must be a positive integer");
}

export function applyCorrection(text, { find, replace, expectedCount, wholeWord = true }) {
  checkArgs({ find, replace, expectedCount });
  const source = String(text);
  const indices = pendingIndices(source, find, replace, wholeWord);
  if (indices.length !== expectedCount) {
    // Bengali text can spell the same letter with different code points (য় is U+09DF or
    // U+09AF U+09BC). Matching stays byte-exact so each file keeps its own encoding, but say why.
    const nfc = pendingIndices(source.normalize("NFC"), find.normalize("NFC"), replace.normalize("NFC"), wholeWord).length;
    const hint = nfc !== indices.length ? ` (${nfc} after Unicode NFC normalisation — match the file's code points exactly)` : "";
    throw new Error(`applyCorrection: expected ${expectedCount} occurrence(s) of "${find}", found ${indices.length}${hint}`);
  }
  let result = "";
  let last = 0;
  for (const i of indices) {
    result += source.slice(last, i) + replace;
    last = i + find.length;
  }
  return result + source.slice(last);
}

// "pending" when exactly expectedCount uncorrected occurrences exist and none corrected;
// "applied" when none remain and the replacement is present expectedCount times. Anything
// else is ambiguous and throws, so a partially-edited file is never "fixed" by guessing.
export function correctionState(text, { find, replace, expectedCount, wholeWord = true }) {
  checkArgs({ find, replace, expectedCount });
  const source = String(text);
  const pending = pendingIndices(source, find, replace, wholeWord).length;
  const applied = matchIndices(source, replace, wholeWord).length;
  if (pending === expectedCount && applied === 0) return "pending";
  if (pending === 0 && applied === expectedCount) return "applied";
  if (pending === 0 && applied === 0) throw new Error(`correctionState: neither "${find}" nor "${replace}" found`);
  throw new Error(`correctionState: ambiguous — ${pending} uncorrected "${find}" and ${applied} "${replace}" (expected ${expectedCount})`);
}
