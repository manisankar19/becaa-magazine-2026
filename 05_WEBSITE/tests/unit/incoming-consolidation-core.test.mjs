// Unit test for scripts/incoming-consolidation-core.mjs — Sprint v4 Task 2. Hermetic.
import assert from "node:assert/strict";
import { planConsolidation, nameSimilarity } from "../../scripts/incoming-consolidation-core.mjs";

// --- Fixture helpers -------------------------------------------------------
const file = (name, bytes, sha256) => ({ name, bytes, sha256 });

// --- Scenario 1: no collision ----------------------------------------------
{
  const parentFiles = [file("Excursion.docx", 14125, "06b99a4661fe6952af5881c327d0e6d9ec8a9b9576c56ce45b2f624ee9085f01"), file("Meri Kiran.docx", 18640, "94c22d8ffceef1d01ac690ee26315594a94d44c2d931aa40146fd535600b99b2")];
  const subFiles = [file("Shubhra Basu.md", 1533, "0d068f30b846c0b7eba29f0c16847c4ba3dc90a81733ba8ed23a98c14f328da2"), file("Siddhartha Mukhopadhyay story.docx", 11870, "9bbe16d10ca51c310a61ca0936ee886b761eb45710a8c46d655473afebdb1c65")];
  const result = planConsolidation({ parentFiles, subFiles });

  assert.equal(result.ok, true, "no name collisions between parent and sub folders means ok: true");
  assert.deepEqual(result.collisions, [], "no collisions detected");
  assert.deepEqual(
    result.moves,
    [
      { from: "v2-incoming/Shubhra Basu.md", to: "Shubhra Basu.md" },
      { from: "v2-incoming/Siddhartha Mukhopadhyay story.docx", to: "Siddhartha Mukhopadhyay story.docx" },
    ],
    "every subFiles entry gets a planned move to the parent folder",
  );
  assert.equal(result.inventoryAfter.length, parentFiles.length + subFiles.length, "inventoryAfter includes every parent file plus every moved sub file");
}

// --- Scenario 2: exact-case collision ---------------------------------------
{
  const parentFiles = [file("Cover page.jpg", 346886, "d8dfb14bf8aeb93bedd74fabdd884ab51e1a433cda37c2210125a0b5f315d8e7")];
  const subFiles = [
    file("Cover page.jpg", 900000, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"), // same name, same case, different content
    file("Unrelated Notes.md", 200, "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"),
  ];
  const result = planConsolidation({ parentFiles, subFiles });

  assert.equal(result.ok, false, "an exact-case name collision blocks the whole consolidation");
  assert.equal(result.collisions.length, 1, "exactly one colliding name group");
  const collidingNames = result.collisions[0].entries.map((e) => e.name).sort();
  assert.deepEqual(collidingNames, ["Cover page.jpg", "Cover page.jpg"], "collision entries record both the parent and sub copies");
  assert.ok(
    !result.moves.some((m) => m.to === "Cover page.jpg"),
    "the colliding file's move is excluded from the move plan",
  );
  assert.ok(
    result.moves.some((m) => m.to === "Unrelated Notes.md"),
    "a non-colliding sub file is still planned to move even though another file collided",
  );
}

// --- Scenario 3: case-only collision -----------------------------------------
{
  const parentFiles = [file("gymanasium hall.jpeg", 266037, "f1ec429aa3325a87d48dc656c037bedfb592f7f6c14ac6546e670f0343abc8aa")];
  const subFiles = [file("Gymanasium Hall.JPEG", 300000, "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc")];
  const result = planConsolidation({ parentFiles, subFiles });

  assert.equal(result.ok, false, "a case-only name collision blocks the whole consolidation");
  assert.equal(result.collisions.length, 1, "differently-cased names that are equal case-insensitively still collide");
  assert.deepEqual(result.moves, [], "the only sub file present collided, so nothing is planned to move");
}

// --- Scenario 4: near-name pair (different files, similar names) ------------
{
  // Real fixture from 02_INCOMING_CONTENT: these are DIFFERENT files (different hashes),
  // not a collision — just names similar enough to warrant a human's attention.
  const parentFiles = [file("Cover page.jpg", 346886, "d8dfb14bf8aeb93bedd74fabdd884ab51e1a433cda37c2210125a0b5f315d8e7")];
  const subFiles = [file("cover page new.png", 1836117, "29a12bcbb8baca83a76e6bd6eee546471d7ece7f5d04a37468e4e5234f53d327")];
  const result = planConsolidation({ parentFiles, subFiles });

  assert.equal(nameSimilarity("cover page new.png", "Cover page.jpg") >= 0.6, true, "the known near-name pair scores at least 0.6");
  assert.deepEqual(result.collisions, [], "similar-but-different names are not a collision");
  assert.equal(result.nearNames.length, 1, "exactly one near-name pair is reported");
  const [near] = result.nearNames;
  assert.equal(near.sub.name, "cover page new.png");
  assert.equal(near.parent.name, "Cover page.jpg");
  assert.equal(near.sub.sha256, "29a12bcbb8baca83a76e6bd6eee546471d7ece7f5d04a37468e4e5234f53d327", "near-name entry carries the sub file's hash");
  assert.equal(near.parent.sha256, "d8dfb14bf8aeb93bedd74fabdd884ab51e1a433cda37c2210125a0b5f315d8e7", "near-name entry carries the parent file's hash");
  assert.ok(near.similarity >= 0.6, "reported similarity clears the 0.6 threshold");
  assert.equal(result.ok, true, "a near-name pair alone (no collision) does not block consolidation");
  assert.deepEqual(result.moves, [{ from: "v2-incoming/cover page new.png", to: "cover page new.png" }], "the near-name sub file still moves since it is not a collision");
}

// --- Scenario 5: identical-hash duplicate (same content, unrelated names) ---
{
  // Same bytes/hash under two dissimilar names is not a name collision and is not
  // caught by nearNames either — collisions and nearNames are both name-based, not
  // hash-based. planConsolidation still plans the move; a human/report layer built on
  // top of this data can separately flag identical sha256 values across the resulting
  // inventoryAfter if they want to catch true content duplicates.
  const sharedHash = "1".repeat(64);
  const parentFiles = [file("Old Photo.jpg", 100000, sharedHash)];
  const subFiles = [file("Completely Unrelated Name.jpg", 100000, sharedHash)];
  const result = planConsolidation({ parentFiles, subFiles });

  assert.equal(nameSimilarity("Old Photo.jpg", "Completely Unrelated Name.jpg") < 0.6, true, "the chosen names are not near-name matches, isolating the hash-only scenario");
  assert.deepEqual(result.collisions, [], "identical content under different names is not a name collision");
  assert.deepEqual(result.nearNames, [], "identical content under dissimilar names is not a near-name pair either");
  assert.equal(result.ok, true, "a hash-only duplicate does not block consolidation");
  assert.deepEqual(result.moves, [{ from: "v2-incoming/Completely Unrelated Name.jpg", to: "Completely Unrelated Name.jpg" }], "the duplicate-content sub file is still planned to move");
  const hashesInInventory = result.inventoryAfter.filter((f) => f.sha256 === subFiles[0].sha256);
  assert.equal(hashesInInventory.length, 2, "both copies of the duplicated content are present in the projected inventory");
}

// --- Extra: collision within subFiles itself (not one of the five named
// scenarios above, but required by the acceptance criteria: "any collision ...
// within subFiles itself" also blocks the whole consolidation) -----------------
{
  const parentFiles = [];
  const subFiles = [
    file("Notes.docx", 1000, "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"),
    file("notes.docx", 1200, "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"),
  ];
  const result = planConsolidation({ parentFiles, subFiles });

  assert.equal(result.ok, false, "a case-insensitive collision within subFiles itself also blocks consolidation");
  assert.equal(result.collisions.length, 1, "one collision group for the two sub files sharing a case-insensitive name");
  assert.deepEqual(result.moves, [], "neither of the two colliding sub files is planned to move");
}

console.log("All incoming-consolidation-core unit tests passed.");
