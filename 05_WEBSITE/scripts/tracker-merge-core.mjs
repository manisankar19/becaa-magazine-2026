// Pure merge logic for appending an addendum tracker's rows onto the main
// content tracker without disturbing any existing row. Kept dependency-free
// (no file I/O, no xlsx) so it can be unit tested in isolation.

export function mergeAddendumRows({ headers, mainRows, addendumRows, coverUpdate }) {
  const idOf = (row) => String(row["Item ID"] ?? "").trim();

  const existingIds = new Set(mainRows.map(idOf));
  const collidingWithMain = addendumRows.filter((row) => existingIds.has(idOf(row)));
  if (collidingWithMain.length) {
    throw new Error(`Duplicate Item ID(s) already present in the main tracker: ${collidingWithMain.map(idOf).join(", ")}`);
  }

  const seenInAddendum = new Set();
  for (const row of addendumRows) {
    const id = idOf(row);
    if (seenInAddendum.has(id)) {
      throw new Error(`Duplicate Item ID(s) within the addendum itself: ${id}`);
    }
    seenInAddendum.add(id);
  }

  const mergedExisting = mainRows.map((row) => {
    if (!coverUpdate || idOf(row) !== coverUpdate.itemId) return row;
    const previousSourceFileName = row["Source File Name"];
    const note = coverUpdate.remarksNote(previousSourceFileName);
    return {
      ...row,
      "Source File Name": coverUpdate.newSourceFileName,
      Remarks: [row.Remarks, note].filter(Boolean).join(" ").trim(),
    };
  });

  const normalizedAddendum = addendumRows.map((row) => Object.fromEntries(headers.map((header) => [header, row[header] ?? ""])));

  return [...mergedExisting, ...normalizedAddendum];
}
