// Pure logic for applying approved per-row field updates and remarks notes to
// tracker rows by Item ID (Sprint v3 Task 8). No file I/O, no xlsx.
//   decisions = { [itemId]: { fields?: { [column]: value }, remarksNote?: string } }
// Guards: every targeted Item ID must exist; fields may only name columns that
// already exist in the sheet; a remarks note is appended once (idempotent).
export function applyTrackerFieldUpdates(rows, decisions) {
  const idOf = (row) => String(row["Item ID"] ?? "").trim();
  const knownColumns = new Set(rows.flatMap((row) => Object.keys(row)));
  const presentIds = new Set(rows.map(idOf));

  for (const [id, decision] of Object.entries(decisions)) {
    if (!presentIds.has(String(id))) throw new Error(`Item ID ${id} not found in the tracker`);
    for (const column of Object.keys(decision.fields ?? {})) {
      if (!knownColumns.has(column)) throw new Error(`unknown column "${column}" for Item ID ${id}`);
    }
  }

  return rows.map((row) => {
    const decision = decisions[idOf(row)];
    if (!decision) return row;
    const updated = { ...row, ...(decision.fields ?? {}) };
    if (decision.remarksNote && !String(updated.Remarks ?? "").includes(decision.remarksNote)) {
      updated.Remarks = [updated.Remarks, decision.remarksNote].filter(Boolean).join(" ").trim();
    }
    return updated;
  });
}
