import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const port = Number(process.env.PORT ?? 5173);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".wav": "audio/wav",
  ".svg": "image/svg+xml",
};

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  let path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  if (path.endsWith("/")) path += "index.html";
  const file = join(root, path);
  if (!file.startsWith(root)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error("not a file");
    // The ETag lets revalidation return 304 instead of re-sending the 9 MB compiler.
    const etag = `"${info.size}-${info.mtimeMs}"`;
    const headers = {
      "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
      "Cache-Control": "no-cache",
      ETag: etag,
      "Accept-Ranges": "bytes",
    };
    if (req.headers["if-none-match"] === etag) {
      res.writeHead(304, headers).end();
      return;
    }
    const body = await readFile(file);
    // Safari asks for audio in byte ranges.
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? "");
    if (range && (range[1] || range[2])) {
      const start = range[1] ? Number(range[1]) : Math.max(0, body.length - Number(range[2]));
      const end = range[1] && range[2] ? Math.min(Number(range[2]), body.length - 1) : body.length - 1;
      if (start > end || start >= body.length) {
        res.writeHead(416, { "Content-Range": `bytes */${body.length}` }).end();
        return;
      }
      res.writeHead(206, { ...headers, "Content-Range": `bytes ${start}-${end}/${body.length}` });
      res.end(body.subarray(start, end + 1));
      return;
    }
    res.writeHead(200, headers);
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
  }
}).listen(port, () => {
  console.log(`Dungeon tutorial running at http://localhost:${port}`);
});
