/* HTTP de solo lectura, restringido al prototipo y a loopback. */
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { root } = require("./runtime.cjs");
const directory = path.join(root, "design/prototype");
const port = Number(process.env.GASTOS_TEST_PORT || 4173);
function record(message) {
  if (process.env.GASTOS_RUN_DIR)
    fs.appendFileSync(
      path.join(process.env.GASTOS_RUN_DIR, "http-server.log"),
      message + "\n",
    );
  console.log(message);
}
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
};
const server = http.createServer((req, res) => {
  if (!["GET", "HEAD"].includes(req.method)) return res.writeHead(405).end();
  let pathname;
  try {
    pathname = decodeURIComponent(
      new URL(req.url, "http://127.0.0.1").pathname,
    );
  } catch {
    return res.writeHead(400).end();
  }
  const file = path.resolve(
    directory,
    "." + (pathname === "/" ? "/index.html" : pathname),
  );
  if (!file.startsWith(directory + path.sep)) return res.writeHead(403).end();
  fs.readFile(file, (error, data) => {
    if (error) return res.writeHead(404).end();
    res.setHeader(
      "Content-Type",
      types[path.extname(file)] || "application/octet-stream",
    );
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.end(req.method === "HEAD" ? undefined : data);
  });
});
server.on("error", (error) => {
  record(`Servidor HTTP: ${error.code}: ${error.message}`);
  process.exitCode = 1;
});
server.listen(port, "127.0.0.1", () =>
  record(`Prototipo HTTP en http://127.0.0.1:${port}/index.html`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, () => server.close(() => process.exit(0)));
