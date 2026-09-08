// Pure logic for applying editorial exclusion decisions to tracker rows by
// Item ID. Kept dependency-free (no file I/O, no xlsx) so it can be unit
// tested in isolation. Mirrors the inline decision-map pattern already used
// in update-tracker-review-03.mjs, factored out so it can be tested.

export function applyExclusionDecisions(rows, decisions) {
  const idOf = (row) => String(row["Item ID"] ?? "").trim();

  return rows.map((row) => {
    const decision = decisions[idOf(row)];
    if (!decision) return row;

    const updated = { ...row };
    if (decision.webInclude !== undefined) updated["Web Include"] = decision.webInclude;
    if (decision.printInclude !== undefined) updated["Print Include"] = decision.printInclude;
    if (decision.status !== undefined) updated.Status = decision.status;
    if (decision.remarksNote) {
      updated.Remarks = [updated.Remarks, decision.remarksNote].filter(Boolean).join(" ").trim();
    }
    return updated;
  });
}
