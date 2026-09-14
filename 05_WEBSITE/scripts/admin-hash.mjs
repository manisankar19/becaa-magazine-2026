// `npm run admin:hash` — generate the ADMIN_PASSWORD_HASH value (Sprint v3 Task 28, Decision N).
// Interactive: prompts with masked input (nothing echoed). Non-interactive: reads one line
// from stdin (for tests/automation). Prints ONLY the argon2id hash to stdout; the plaintext
// is never written anywhere. Paste the hash into the Vercel environment variable — never
// into a file in this repository.
import argon2 from "argon2";
import readline from "node:readline";

async function readPassword() {
  if (!process.stdin.isTTY) {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    return Buffer.concat(chunks).toString("utf8").split(/\r?\n/)[0] ?? "";
  }
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const original = rl._writeToOutput;
    process.stdout.write("Administrator password (input hidden): ");
    rl._writeToOutput = () => {}; // mask every keystroke
    rl.question("", (answer) => {
      rl._writeToOutput = original;
      process.stdout.write("\n");
      rl.close();
      resolve(answer);
    });
  });
}

const password = await readPassword();
if (password.length < 12) {
  console.error("Password must be at least 12 characters.");
  process.exit(2);
}
const hash = await argon2.hash(password, { type: argon2.argon2id });
if (process.stdin.isTTY) console.error("ADMIN_PASSWORD_HASH (set this in Vercel → Environment Variables; do not commit it):");
console.log(hash);
