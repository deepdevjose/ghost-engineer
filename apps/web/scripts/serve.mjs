import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const appRoot = join(currentDirectory, "..");
const requestedRoot = process.argv[2] ?? "src";
const rootDirectory = resolve(appRoot, requestedRoot);
const publicDirectory = join(appRoot, "public");
const requestedPort = Number.parseInt(process.env.PORT ?? "4173", 10);
const maxPortAttempts = Number.parseInt(process.env.PORT_ATTEMPTS ?? "20", 10);
let currentPort = requestedPort;

if (!Number.isInteger(requestedPort) || requestedPort < 1 || requestedPort > 65535) {
  throw new Error(`Invalid PORT: ${process.env.PORT}`);
}

if (
  !Number.isInteger(maxPortAttempts) ||
  maxPortAttempts < 1 ||
  requestedPort + maxPortAttempts - 1 > 65535
) {
  throw new Error(`Invalid PORT_ATTEMPTS: ${process.env.PORT_ATTEMPTS}`);
}

const server = createServer((request, response) => {
  const requestUrl = new URL(request.url ?? "/", `http://localhost:${currentPort}`);
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

server.on("error", (error) => {
  if (error.code !== "EADDRINUSE") {
    throw error;
  }

  const nextPort = currentPort + 1;
  const finalPort = requestedPort + maxPortAttempts - 1;
  if (nextPort > finalPort) {
    console.error(
      `Port ${requestedPort} is busy and no free port was found through ${finalPort}.`,
    );
    process.exitCode = 1;
    return;
  }

  console.warn(`Port ${currentPort} is busy; trying ${nextPort}.`);
  currentPort = nextPort;
  server.listen(currentPort);
});

server.listen(currentPort, () => {
  console.log(`Ghost Engineer web installer running at http://localhost:${currentPort}`);
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
