import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";

const args = parseArgs(process.argv.slice(2));
const globalImagePath = args.global || "outputs/netflix-top10-global.png";
const usImagePath = args.us || "outputs/netflix-top10-us.png";
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHANNEL;

if (!botToken || !chatId) {
  throw new Error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID/TELEGRAM_CHANNEL.");
}

const images = [];
if (existsSync(globalImagePath)) images.push({ key: "global", name: "netflix-top10-global.png", path: globalImagePath });
if (existsSync(usImagePath)) images.push({ key: "us", name: "netflix-top10-us.png", path: usImagePath });

if (images.length === 0) {
  throw new Error("No screenshot image was found to publish.");
}

const charts = loadCharts();
assertFreshCharts(charts);
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
  const data = JSON.parse(readFileSync("data/rankings.json", "utf8"));
  if (!data.charts?.global || !data.charts?.us) {
    throw new Error("Unable to read chart data from data/rankings.json.");
  }
  return data.charts;
}

function assertFreshCharts(charts) {
  if (process.env.ALLOW_STALE_NETFLIX_PUBLISH === "true") return;

  const endDate = parseWeekEnd(charts.global.week);
  const ageDays = Math.floor((Date.now() - endDate.getTime()) / 86_400_000);
  if (ageDays > 21) {
    throw new Error(`Refusing to publish stale Netflix data (${charts.global.week}). Run update:data first.`);
  }
}

function buildCaption(charts) {
  const pageUrl = process.env.PUBLIC_PAGE_URL || "https://zzcsama.github.io/netflix-weekly-top10/";
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

function parseWeekEnd(week) {
  const match = String(week || "").match(/-\s*(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!match) throw new Error(`Invalid Netflix week range: ${week}`);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 23, 59, 59));
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
