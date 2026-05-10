import { createReadStream, existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { chromium } from "playwright";

const args = parseArgs(process.argv.slice(2));
const root = resolve(args.root || ".");
const outputPath = resolve(args.output || "outputs/netflix-top10.png");
const chart = args.chart || "global";
const host = args.host || "127.0.0.1";
const port = Number(args.port || 0);
const width = Number(args.width || 1080);
const maxHeight = Number(args.maxHeight || 1800);
const server = createStaticServer(root);

await listen(server, port, host);
const address = server.address();
const activePort = typeof address === "object" && address ? address.port : port;
await mkdir(dirname(outputPath), { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width, height: maxHeight },
    deviceScaleFactor: 1
  });

  await page.goto(`http://${host}:${activePort}/?chart=${encodeURIComponent(chart)}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelectorAll(".row-card").length >= 10);
  await page.evaluate(async () => {
    await Promise.all([...document.images].map((img) => (img.complete ? true : new Promise((resolve) => {
      img.addEventListener("load", resolve, { once: true });
      img.addEventListener("error", resolve, { once: true });
    }))));
    document.body.classList.add("capture");
  });

  const bodyHeight = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight));
  const height = Math.min(Math.max(bodyHeight, 1200), maxHeight);
  await page.setViewportSize({ width, height });
  await page.screenshot({
    path: outputPath,
    fullPage: false,
    clip: { x: 0, y: 0, width, height }
  });
  console.log(`Captured ${outputPath}`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

function createStaticServer(rootDir) {
  return createServer((request, response) => {
    try {
      const url = new URL(request.url || "/", `http://${request.headers.host}`);
      const pathname = decodeURIComponent(url.pathname);
      const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
      let filePath = resolve(join(rootDir, safePath));

      if (!filePath.startsWith(rootDir)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }

      if (!existsSync(filePath) || extname(filePath) === "") {
        filePath = join(filePath, "index.html");
      }

      if (!existsSync(filePath)) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }

      response.writeHead(200, {
        "Content-Type": contentType(filePath),
        "Cache-Control": "no-store"
      });
      createReadStream(filePath).pipe(response);
    } catch (error) {
      response.writeHead(500);
      response.end(String(error));
    }
  });
}

function listen(serverInstance, listenPort, listenHost) {
  return new Promise((resolve, reject) => {
    serverInstance.once("error", reject);
    serverInstance.listen(listenPort, listenHost, resolve);
  });
}

function contentType(filePath) {
  const ext = extname(filePath);
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml"
  }[ext] || "application/octet-stream";
}

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      result[arg.slice(2)] = argv[i + 1];
      i += 1;
    }
  }
  return result;
}
