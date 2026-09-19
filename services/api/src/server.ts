import { createServer } from "node:http";
import { createApiHandler } from "./app";

const port = Number(process.env.PORT ?? 8787);
const handler = createApiHandler(process.env);

export const server = createServer(async (incoming, outgoing) => {
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of incoming) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const request = new Request(`http://${incoming.headers.host ?? `127.0.0.1:${port}`}${incoming.url ?? "/"}`, {
      method: incoming.method,
      headers: incoming.headers as HeadersInit,
      body
    });
    const response = await handler(request);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    if (!response.body) return outgoing.end();
    const reader = response.body.getReader();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      outgoing.write(Buffer.from(value));
    }
    outgoing.end();
  } catch (error) {
    console.error("[verbia-api] local server adapter failed:", error);
    outgoing.writeHead(500, { "content-type": "application/json; charset=utf-8" });
    outgoing.end(JSON.stringify({ error: "Internal server error" }));
  }
});

if (process.env.NODE_ENV !== "test") server.listen(port, "127.0.0.1", () => console.log(`Verbia API listening on http://127.0.0.1:${port}`));
