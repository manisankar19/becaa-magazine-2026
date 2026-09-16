// Unit test for scripts/text-correction-core.mjs — Sprint v4 Task 22 (PRD §4.7). Hermetic.
import assert from "node:assert/strict";
import { applyCorrection, countOccurrences, correctionState } from "../../scripts/text-correction-core.mjs";

// --- Scenario 1: single occurrence replaced ---------------------------------
{
  const text = "লেডিস হোস্টেল পারিমা টার্গেট করলাম।";
  assert.equal(applyCorrection(text, { find: "পারিমা", replace: "পরিমা", expectedCount: 1 }), "লেডিস হোস্টেল পরিমা টার্গেট করলাম।");
  assert.equal(applyCorrection("Vice Preseident Desk", { find: "Vice Preseident Desk", replace: "Vice President Desk", expectedCount: 1 }), "Vice President Desk");
}

// --- Scenario 2: zero occurrences throws (never a silent no-op) --------------
{
  assert.throws(() => applyCorrection("nothing to see", { find: "ভাইবই", replace: "ভাবায়", expectedCount: 1 }), /expected 1 occurrence\(s\) of "ভাইবই", found 0/);
}

// --- Scenario 3: more (or fewer) than expected throws -----------------------
{
  const twice = "ভাইবই এবং আবার ভাইবই";
  assert.throws(() => applyCorrection(twice, { find: "ভাইবই", replace: "ভাবায়", expectedCount: 1 }), /found 2/);
  assert.equal(applyCorrection(twice, { find: "ভাইবই", replace: "ভাবায়", expectedCount: 2 }), "ভাবায় এবং আবার ভাবায়");
  assert.throws(() => applyCorrection(twice, { find: "ভাইবই", replace: "ভাবায়", expectedCount: 3 }), /found 2/);
}

// --- Scenario 4: the real বেকান vs বেকানী word-boundary distinction ---------
// Fixture reproduces the verified counts in MSG-001 (PRD §1.2): the substring
// "বেকান" occurs 3 times, but only 2 are the standalone word; the third is the
// start of "বেকানী" (বেকান + the vowel sign ী), a different word.
{
  const msg001 = [
    "প্রিয় বেকান ও বেকানী বন্ধুরা,",
    "",
    "কর্মজীবনে আমরা যে যেখানেই পৌঁছে থাকি না কেন, বেকান পরিচয় আমাদের সবাইকে একই বন্ধনে বেঁধে রাখে।",
  ].join("\n");
  assert.equal(countOccurrences(msg001, "বেকান", { wholeWord: false }), 3, "substring count is 3");
  assert.equal(countOccurrences(msg001, "বেকান"), 2, "whole-word count is 2 (বেকানী excluded)");
  assert.equal(countOccurrences(msg001, "বেকানী"), 1);

  // Substring matching is rejected by default: 'বেকান' → 2 whole words, not 3.
  assert.throws(() => applyCorrection(msg001, { find: "বেকান", replace: "BECAA-র", expectedCount: 3 }), /found 2/, "বেকানী is never counted as বেকান");

  // The approved correction targets the one possessive occurrence only.
  const corrected = applyCorrection(msg001, { find: "বেকান পরিচয়", replace: "BECAA-র পরিচয়", expectedCount: 1 });
  assert.ok(corrected.includes("BECAA-র পরিচয় আমাদের সবাইকে"), "possessive occurrence corrected");
  assert.ok(corrected.includes("প্রিয় বেকান ও বেকানী বন্ধুরা,"), "salutation byte-identical");
  assert.equal(corrected.split("\n")[0], msg001.split("\n")[0]);
  assert.equal(countOccurrences(corrected, "বেকানী"), 1, "বেকানী untouched");

  // A find string that ends inside a longer word is not a whole-word match.
  assert.equal(countOccurrences("বেকানী বন্ধুরা", "বেকান"), 0);
  // Opt-in substring mode exists but is explicit.
  assert.equal(applyCorrection("abcabc", { find: "bc", replace: "X", expectedCount: 2, wholeWord: false }), "aXaX");
}

// --- Scenario 5: whole-word rules for Latin text and punctuation ------------
{
  assert.equal(countOccurrences("Desk, Desks and (Desk).", "Desk"), 2, "Desks is not a whole-word match; punctuation is a boundary");
  assert.equal(countOccurrences("x.y", ".", { wholeWord: false }), 1, "regex metacharacters in find are literal");
  assert.equal(countOccurrences("x.y", "."), 0, "a find string between two letters is not a whole word");
  assert.equal(countOccurrences("(a) . (b)", "."), 1);
}

// --- Scenario 6: argument validation ---------------------------------------
{
  assert.throws(() => applyCorrection("a", { find: "", replace: "b", expectedCount: 1 }), /non-empty/);
  assert.throws(() => applyCorrection("a", { find: "a", replace: "b" }), /expectedCount/);
  assert.throws(() => applyCorrection("a", { find: "a", replace: "b", expectedCount: 0 }), /expectedCount/);
  assert.throws(() => applyCorrection("a", { find: "a", replace: "a", expectedCount: 1 }), /differ/);
}

// --- Scenario 7: correctionState lets a script be re-run safely -------------
{
  const c = { find: "পারিমা", replace: "পরিমা", expectedCount: 1 };
  assert.equal(correctionState("… পারিমা …", c), "pending");
  assert.equal(correctionState("… পরিমা …", c), "applied");
  assert.throws(() => correctionState("… পারিমা … পরিমা …", c), /ambiguous/, "both forms present → refuse");
  assert.throws(() => correctionState("… neither …", c), /neither/, "neither form present → refuse");
  // Replacement containing the find string (Biswajit Sengupta → Late Biswajit Sengupta).
  const late = { find: "Biswajit Sengupta", replace: "Late Biswajit Sengupta", expectedCount: 1 };
  assert.equal(correctionState("by Biswajit Sengupta", late), "pending");
  assert.equal(correctionState("by Late Biswajit Sengupta", late), "applied");
  assert.equal(applyCorrection("by Biswajit Sengupta", late), "by Late Biswajit Sengupta");
  assert.throws(() => applyCorrection("by Late Biswajit Sengupta", late), /found 0/, "already-applied text is not corrected twice");
}

// --- Scenario 8: matching is code-point exact; a normalisation mismatch is explained --
{
  const precomposed = "বেকান পরিচ\u09DF আমাদের"; // য় as U+09DF (as in MSG-001)
  const decomposed = "বেকান পরিচ\u09AF\u09BC"; // য় as U+09AF U+09BC
  assert.throws(() => applyCorrection(precomposed, { find: decomposed, replace: "BECAA-র পরিচ\u09AF\u09BC", expectedCount: 1 }), /found 0 \(1 after Unicode NFC normalisation/);
  const fixed = applyCorrection(precomposed, { find: "বেকান পরিচ\u09DF", replace: "BECAA-র পরিচ\u09DF", expectedCount: 1 });
  assert.equal(fixed, "BECAA-র পরিচ\u09DF আমাদের", "the file's own code points are preserved");
}

console.log("text-correction-core: all assertions passed");
