// Unit test for scripts/check-sql-core.mjs — Sprint v3 Task 32. Hermetic.
import assert from "node:assert/strict";
import { findUnsafeSql } from "../../scripts/check-sql-core.mjs";

const ok = (src) => assert.deepEqual(findUnsafeSql("x.ts", src), [], src);
const bad = (src, reason) => { const f = findUnsafeSql("x.ts", src); assert.ok(f.length >= 1, `expected a finding for: ${src}`); assert.equal(f[0].path, "x.ts"); assert.ok(typeof f[0].line === "number"); if (reason) assert.match(f[0].reason, reason); };

// Parameterised queries are fine, including multi-line template literals WITHOUT interpolation.
ok('await db.query("select * from visitors where id = $1", [id]);');
ok("await db.query(`select id, name\n  from visitors where email = $1`, [email]);");
ok('const UPSERT = `insert into visitors (name) values ($1) returning id`;');
// Interpolation inside SQL text is a finding.
bad("await db.query(`select * from visitors where email = '${email}'`);", /interpolat/i);
bad("const sql = `delete from ${table} where id = $1`;", /interpolat/i);
bad('await db.query("select * from visitors where name = \'" + name + "\'");', /concatenat/i);
bad("client.query('select ' + cols + ' from visitors')", /concatenat/i);
// Non-SQL template literals with interpolation are not findings.
ok("const msg = `hello ${name}`;");
ok("console.log(`csv export ${new Date().toISOString()} rows=${n}`);");
ok("const url = `/api/admin/visitors?page=${page}`;");
// A computed LIMIT/OFFSET placeholder built from a count is allowed only as `$${n}` placeholders (used by admin-queries).
ok("await db.query(`select * from visitors ${where} order by created_at desc limit $${params.length + 1} offset $${params.length + 2}`, [...params, PER_PAGE, offset]); // check-sql: allow where-fragment");
bad("await db.query(`select * from visitors ${where} order by created_at desc limit $${params.length + 1}`, params);", /interpolat/i);
console.log("All check-sql-core unit tests passed.");
