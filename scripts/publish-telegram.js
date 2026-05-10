import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const args = parseArgs(process.argv.slice(2));
const globalImagePath = args.global || "outputs/netflix-top10-global.png";
const usImagePath = args.us || "outputs/netflix-top10-us.png";
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHANNEL;

if (!botToken || !chatId) {
  console.log("Skipped Telegram publish: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set.");
  process.exit(0);
}

const images = [];
if (existsSync(globalImagePath)) images.push({ key: "global", name: "netflix-top10-global.png", path: globalImagePath });
if (existsSync(usImagePath)) images.push({ key: "us", name: "netflix-top10-us.png", path: usImagePath });

if (images.length === 0) {
  throw new Error("No screenshot image was found to publish.");
}

const charts = loadCharts();
const caption = buildCaption(charts);
const form = new FormData();

form.append("chat_id", chatId);

if (images.length === 1) {
  const image = await readFile(images[0].path);
  form.append("photo", new Blob([image], { type: "image/png" }), images[0].name);
  form.append("caption", caption);
  await postTelegram("sendPhoto", form);
} else {
  const media = images.map((image, index) => ({
    type: "photo",
    media: `attach://${image.key}`,
    ...(index === 0 ? { caption } : {})
  }));
  form.append("media", JSON.stringify(media));
  for (const image of images) {
    const bytes = await readFile(image.path);
    form.append(image.key, new Blob([bytes], { type: "image/png" }), image.name);
  }
  await postTelegram("sendMediaGroup", form);
}

console.log("Published Netflix weekly ranking to Telegram.");

async function postTelegram(method, formData) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram publish failed (${response.status}): ${body}`);
  }
}

function loadCharts() {
  const source = readFileSync("app.js", "utf8");
  const start = source.indexOf("const logos =");
  const end = source.indexOf("const tabs =");
  if (start === -1 || end === -1) {
    throw new Error("Unable to read chart data from app.js.");
  }

  const context = {
    item: (rank, title, type, weeks, metricOne, metricTwo, logo, accent) => ({
      rank,
      title,
      type,
      weeks,
      metricOne,
      metricTwo,
      logo,
      accent
    })
  };
  vm.runInNewContext(`${source.slice(start, end)}\nglobalThis.__charts = charts;`, context);
  return context.__charts;
}

function buildCaption(charts) {
  const pageUrl = process.env.PUBLIC_PAGE_URL || "";
  const lines = [
    `Netflix 剧集周榜前十 · ${charts.global.week}`,
    "全球榜与美国榜双图推送",
    "",
    "全球榜前三：",
    ...charts.global.items.slice(0, 3).map(formatItem),
    "",
    "美国榜前三：",
    ...charts.us.items.slice(0, 3).map(formatItem),
    "",
    pageUrl
  ];

  const caption = lines.filter(Boolean).join("\n");
  return caption.length > 1000 ? `${caption.slice(0, 997)}...` : caption;
}

function formatItem(item) {
  return `${item.rank}. ${item.title} · ${item.metricOne}`;
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
