import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const appRoot = join(currentDirectory, "..");
const requestedRoot = process.argv[2] ?? "src";
const rootDirectory = resolve(appRoot, requestedRoot);
const publicDirectory = join(appRoot, "public");
const port = Number.parseInt(process.env.PORT ?? "4173", 10);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid PORT: ${process.env.PORT}`);
}

const server = createServer((request, response) => {
  const requestUrl = new URL(request.url ?? "/", `http://localhost:${port}`);
  const requestedPath =
    requestUrl.pathname === "/"
      ? "index.html"
      : decodeURIComponent(requestUrl.pathname).replace(/^\/+/, "");
  const filePath = resolveFile(requestedPath);

  if (!filePath) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": contentTypeFor(filePath),
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, () => {
  console.log(`Ghost Engineer web installer running at http://localhost:${port}`);
});

function resolveFile(requestedPath) {
  for (const baseDirectory of [rootDirectory, publicDirectory]) {
    const filePath = resolve(baseDirectory, requestedPath);
    if (isInside(filePath, baseDirectory) && existsSync(filePath) && statSync(filePath).isFile()) {
      return filePath;
    }
  }

  return undefined;
}

function isInside(path, root) {
  const normalizedRoot = root.endsWith(sep) ? root : `${root}${sep}`;
  return path === root || path.startsWith(normalizedRoot);
}

function contentTypeFor(path) {
  switch (extname(path)) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".sh":
      return "text/x-shellscript; charset=utf-8";
    case ".svg":
      return "image/svg+xml; charset=utf-8";
    default:
      return "text/plain; charset=utf-8";
  }
}
