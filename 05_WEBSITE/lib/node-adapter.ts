// Node http ⇄ Web Request/Response adapter (Sprint v3 Task 27). Lets the same handlers in
// api/ run under scripts/dev-app.mjs locally and on Vercel's Node runtime unchanged.
import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";

export function toWebRequest(req: IncomingMessage, baseUrl: string): Request {
  const url = new URL(req.url ?? "/", baseUrl);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }
  const method = (req.method ?? "GET").toUpperCase();
  const hasBody = !["GET", "HEAD"].includes(method);
  return new Request(url, {
    method,
    headers,
    body: hasBody ? (Readable.toWeb(req) as unknown as ReadableStream) : undefined,
    // @ts-expect-error — required by undici for streaming request bodies
    duplex: hasBody ? "half" : undefined,
  });
}

export async function sendWebResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    // Multiple Set-Cookie headers must be sent separately, not comma-joined.
    if (key.toLowerCase() === "set-cookie") res.appendHeader("set-cookie", value);
    else res.setHeader(key, value);
  });
  const cookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  if (cookies.length) res.setHeader("set-cookie", cookies);
  if (!response.body) { res.end(); return; }
  const buffer = Buffer.from(await response.arrayBuffer());
  res.end(buffer);
}
