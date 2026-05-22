import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright";

const args = parseArgs(process.argv.slice(2));
const outputPath = resolve(args.output || "data/rankings.json");
const previousData = await readExistingData(outputPath);
const previousItems = indexPreviousItems(previousData);

const sources = {
  global: {
    label: "全球榜",
    place: "Global",
    source: "https://www.netflix.com/tudum/top10/tv",
    overviewPattern: /Top 10 Shows overview/i,
    primaryLabel: "总观看量",
    secondaryLabel: "总观看时长",
    metricOneLabel: "观看量",
    metricTwoLabel: "观看时长"
  },
  us: {
    label: "美国榜",
    place: "United States",
    source: "https://www.netflix.com/tudum/top10/united-states/tv",
    overviewPattern: /Top 10 Shows in United States overview/i,
    primaryLabel: "榜单数量",
    secondaryLabel: "合计上榜",
    metricOneLabel: "上榜",
    metricTwoLabel: "类型"
  }
};

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    locale: "en-US",
    viewport: { width: 1440, height: 1600 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
  });
  const charts = {};

  for (const [key, source] of Object.entries(sources)) {
    const page = await context.newPage();
    charts[key] = await scrapeChart(page, key, source);
    await page.close();
  }

  const nextData = {
    updatedAt: new Date().toISOString(),
    charts
  };

  if (hasSamePublishedCharts(previousData, nextData)) {
    console.log(`Netflix rankings are already current for ${charts.global.week}.`);
    process.exitCode = 0;
  } else {
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(nextData, null, 2)}\n`, "utf8");
    console.log(`Updated ${outputPath} with ${charts.global.week} rankings.`);
  }
} finally {
  await browser.close();
}

async function scrapeChart(page, key, source) {
  await page.goto(source.source, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForLoadState("networkidle", { timeout: 45_000 }).catch(() => {});
  await page.waitForFunction(
    ({ place }) => {
      const text = document.body?.innerText || "";
      return text.includes(`${place} |`) && /Top 10 Shows.*overview/i.test(text);
    },
    { place: source.place },
    { timeout: 20_000 }
  ).catch(() => {
    console.warn(`Chart overview was slow to appear for ${source.label}; parsing the current page snapshot.`);
  });
  await warmLazyImages(page);

  const snapshot = await page.evaluate(() => ({
    text: document.body.innerText,
    images: [...document.images].map((img) => ({
      alt: img.alt || "",
      src: img.currentSrc || img.src || "",
      srcset: img.getAttribute("srcset") || ""
    }))
  }));

  const lines = normalizeVisibleLines(snapshot.text);
  const week = normalizeWeek(extractWeek(lines, source.place));
  const rows = parseRows(extractOverviewSegment(lines, source), key);
  const logoMap = buildLogoMap(snapshot.images);
  const items = rows.map((row) => transformRow(row, key, logoMap));

  if (items.length !== 10) {
    throw new Error(`Expected 10 ${key} rows, found ${items.length}.`);
  }

  if (key === "global") {
    const totalViews = rows.reduce((sum, row) => sum + row.views, 0);
    const totalHours = rows.reduce((sum, row) => sum + row.hours, 0);

    return {
      label: source.label,
      lede: `Netflix 全球剧集周榜 · ${week}`,
      week,
      source: source.source,
      primaryLabel: source.primaryLabel,
      primary: formatCount(totalViews),
      secondaryLabel: source.secondaryLabel,
      secondary: `${formatCount(totalHours)}小时`,
      metricOneLabel: source.metricOneLabel,
      metricTwoLabel: source.metricTwoLabel,
      items
    };
  }

  const totalWeeks = rows.reduce((sum, row) => sum + row.weeks, 0);
  return {
    label: source.label,
    lede: `Netflix 美国剧集周榜 · ${week}`,
    week,
    source: source.source,
    primaryLabel: source.primaryLabel,
    primary: `${items.length} 部`,
    secondaryLabel: source.secondaryLabel,
    secondary: `${totalWeeks} 周`,
    metricOneLabel: source.metricOneLabel,
    metricTwoLabel: source.metricTwoLabel,
    items
  };
}

async function warmLazyImages(page) {
  for (const y of [0, 500, 1000, 1500, 2200, 3000]) {
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
    await page.waitForTimeout(250);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);
}

function extractWeek(lines, place) {
  const pattern = new RegExp(`^${escapeRegExp(place)}\\s*\\|\\s*\\d{1,2}\\/\\d{1,2}\\/\\d{2}\\s*-\\s*\\d{1,2}\\/\\d{1,2}\\/\\d{2}$`);
  const line = lines.find((entry) => pattern.test(entry));
  if (!line) {
    throw new Error(`Unable to find ${place} week range.`);
  }

  return line.split("|")[1].trim();
}

function extractOverviewSegment(lines, source) {
  const start = lines.findIndex((line) => source.overviewPattern.test(line));
  if (start === -1) {
    throw new Error(`Unable to find overview table for ${source.label}.`);
  }

  const end = lines.findIndex(
    (line, index) => index > start && /^(Catch the Latest|Must-Watch Videos|Explore The Most Watched)/i.test(line)
  );
  return lines.slice(start + 1, end === -1 ? undefined : end);
}

function parseRows(segment, key) {
  const rows = parseCompactRows(segment, key);
  if (rows.length === 10) return rows;

  const cellRows = parseCellRows(segment, key);
  if (cellRows.length === 10) return cellRows;

  throw new Error(`Unable to parse ${key} rows. Preview: ${segment.slice(0, 20).join(" | ")}`);
}

function parseCompactRows(segment, key) {
  const rows = [];

  for (const rawLine of segment) {
    const line = cleanRowText(rawLine);
    if (!line || isHeaderCell(line)) continue;

    const globalMatch = line.match(/^0?([1-9]|10)\s+(.+?)\s+(\d+)\s+([\d,]+)\s+(\d+:\d{2})\s+([\d,]+)$/);
    if (key === "global" && globalMatch) {
      rows.push({
        rank: Number(globalMatch[1]),
        title: globalMatch[2].trim(),
        weeks: Number(globalMatch[3]),
        views: toNumber(globalMatch[4]),
        runtime: globalMatch[5],
        hours: toNumber(globalMatch[6])
      });
      continue;
    }

    const countryMatch = line.match(/^0?([1-9]|10)\s+(.+?)\s+(\d+)$/);
    if (key !== "global" && countryMatch) {
      rows.push({
        rank: Number(countryMatch[1]),
        title: countryMatch[2].trim(),
        weeks: Number(countryMatch[3])
      });
    }
  }

  return normalizeRows(rows);
}

function parseCellRows(segment, key) {
  const cells = segment.map(cleanRowText).filter((cell) => cell && !isHeaderCell(cell) && cell !== "Image");
  const rows = [];

  for (let index = 0; index < cells.length && rows.length < 10; index += 1) {
    const rank = parseRank(cells[index]);
    if (!rank) continue;

    let cursor = index + 1;
    while (cells[cursor] === "Image") cursor += 1;
    const title = cells[cursor];
    const weeks = Number(cells[cursor + 1]);

    if (!title || !Number.isFinite(weeks)) continue;

    if (key === "global") {
      const views = toNumber(cells[cursor + 2]);
      const runtime = cells[cursor + 3];
      const hours = toNumber(cells[cursor + 4]);
      if (!Number.isFinite(views) || !/^\d+:\d{2}$/.test(runtime) || !Number.isFinite(hours)) continue;
      rows.push({ rank, title, weeks, views, runtime, hours });
      index = cursor + 4;
    } else {
      rows.push({ rank, title, weeks });
      index = cursor + 1;
    }
  }

  return normalizeRows(rows);
}

function normalizeRows(rows) {
  return rows
    .filter((row) => row.rank >= 1 && row.rank <= 10)
    .sort((left, right) => left.rank - right.rank)
    .slice(0, 10);
}

function transformRow(row, key, logoMap) {
  const titleInfo = localizeTitle(row.title);
  const previous = previousItems.get(normalizeTitle(row.title));
  const logo = pickLogo(row.title, logoMap) || previous?.logo || "";
  const accent = previous?.accent || accentForTitle(row.title);

  return {
    rank: row.rank,
    title: titleInfo.title,
    originalTitle: row.title,
    type: titleInfo.type,
    weeks: `上榜 ${row.weeks} 周`,
    metricOne: key === "global" ? formatCount(row.views) : `${row.weeks} 周`,
    metricTwo: key === "global" ? `${formatCount(row.hours)}小时` : titleInfo.type,
    logo,
    accent
  };
}

function buildLogoMap(images) {
  const result = new Map();

  for (const image of images) {
    const title = cleanImageTitle(image.alt);
    const src = image.src || firstSrcsetUrl(image.srcset);
    if (!title || !src || title === "Image") continue;

    for (const key of titleKeys(title)) {
      const current = result.get(key);
      if (!current || logoScore(src) > logoScore(current)) {
        result.set(key, src);
      }
    }
  }

  return result;
}

function pickLogo(title, logoMap) {
  for (const key of titleKeys(title)) {
    const logo = logoMap.get(key);
    if (logo) return logo;
  }

  return "";
}

function titleKeys(title) {
  const base = stripSeriesSuffix(title);
  return [...new Set([normalizeTitle(title), normalizeTitle(base)])].filter(Boolean);
}

function cleanImageTitle(value) {
  return cleanRowText(value).replace(/^Image:\s*/i, "").trim();
}

function firstSrcsetUrl(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim().split(/\s+/)[0])
    .find(Boolean) || "";
}

function logoScore(src) {
  if (/\/n6T0vlTccejvjnTlICHzHgzbFd0\//.test(src)) return 4;
  if (/\.png(?:\?|$)/i.test(src)) return 3;
  if (/\.webp(?:\?|$)/i.test(src)) return 2;
  if (/\.jpe?g(?:\?|$)/i.test(src)) return 1;
  return 0;
}

function localizeTitle(originalTitle) {
  const rawMatch = originalTitle.match(/^Raw:\s*(\d{4})\s*-\s*([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
  if (rawMatch) {
    return {
      title: `WWE 周播节目：${rawMatch[1]} 年 ${monthNumber(rawMatch[2])} 月 ${Number(rawMatch[3])} 日`,
      type: "周播特别节目"
    };
  }

  const seasonMatch = originalTitle.match(/^(.*?): Season (\d+)(?: - (.+))?$/);
  if (seasonMatch) {
    const base = translateBaseTitle(seasonMatch[1]);
    const subtitle = seasonMatch[3] ? ` - ${translateSubtitle(seasonMatch[3])}` : "";
    return {
      title: `${base}：第 ${Number(seasonMatch[2])} 季${subtitle}`,
      type: `第 ${Number(seasonMatch[2])} 季`
    };
  }

  const limitedMatch = originalTitle.match(/^(.*?): Limited Series$/);
  if (limitedMatch) {
    return {
      title: `${translateBaseTitle(limitedMatch[1])}：限定剧`,
      type: "限定剧"
    };
  }

  return {
    title: translateBaseTitle(originalTitle),
    type: "剧集"
  };
}

function translateBaseTitle(title) {
  return (
    {
      "Man on Fire": "怒火边界",
      "Should I Marry A Murderer?": "我该嫁给杀人犯吗？",
      Unchosen: "落选者",
      "Running Point": "运营核心",
      "Hulk Hogan: Real American": "胡克·霍根：真美国人",
      "Danny Go!": "丹尼出发！",
      "Devil May Cry": "鬼泣",
      Nemesis: "宿敌",
      "Perfect Match": "完美匹配",
      "Salish & Jordan Matter": "萨利什与乔丹·马特",
      "Stranger Things: Tales From '85": "怪奇物语：85 年传说",
      "La Brea": "拉布雷亚",
      "Homicide Squad: New Orleans": "凶案小组：新奥尔良",
      "Worst Ex Ever": "最糟前任",
      Legends: "传奇卧底",
      "Lord of the Flies": "蝇王",
      "Funny AF with Kevin Hart": "凯文·哈特爆笑现场",
      "The Roast of Kevin Hart": "凯文·哈特吐槽大会"
    }[title] || title
  );
}

function translateSubtitle(subtitle) {
  return (
    {
      "The Live Semifinals": "直播半决赛",
      "Homecoming: The Live Finale": "返场：直播决赛"
    }[subtitle] || subtitle
  );
}

function monthNumber(monthName) {
  return (
    {
      January: 1,
      February: 2,
      March: 3,
      April: 4,
      May: 5,
      June: 6,
      July: 7,
      August: 8,
      September: 9,
      October: 10,
      November: 11,
      December: 12
    }[monthName] || monthName
  );
}

function normalizeWeek(value) {
  return value
    .split(/\s*-\s*/)
    .map((part) => {
      const match = part.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
      if (!match) return part;
      return `20${match[3]}/${Number(match[1])}/${Number(match[2])}`;
    })
    .join(" - ");
}

function formatCount(value) {
  if (value >= 100_000_000) return `${trimNumber(value / 100_000_000, 3)} 亿`;
  if (value >= 10_000) return `${trimNumber(value / 10_000, 1)} 万`;
  return new Intl.NumberFormat("zh-CN").format(value);
}

function trimNumber(value, digits) {
  return Number(value.toFixed(digits)).toString();
}

function toNumber(value) {
  return Number(String(value).replace(/,/g, ""));
}

function parseRank(value) {
  const match = String(value).match(/^0?([1-9]|10)$/);
  return match ? Number(match[1]) : null;
}

function cleanRowText(value) {
  return String(value || "")
    .replace(/Image/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isHeaderCell(value) {
  return /^(Ranking|Views|Runtime|Hours Viewed)$/i.test(value);
}

function normalizeVisibleLines(text) {
  return text
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function stripSeriesSuffix(title) {
  return title.replace(/:\s*(Season \d+|Limited Series)$/i, "").trim();
}

function normalizeTitle(title) {
  return stripSeriesSuffix(title).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function accentForTitle(title) {
  const palette = ["#e50914", "#f5c451", "#46d77a", "#68a7ff", "#ff7a59", "#dfff27", "#ff3aa9", "#c8c8c8"];
  let hash = 0;
  for (const char of title) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return palette[hash % palette.length];
}

function indexPreviousItems(data) {
  const result = new Map();
  for (const chart of Object.values(data?.charts || {})) {
    for (const item of chart.items || []) {
      if (item.originalTitle) result.set(normalizeTitle(item.originalTitle), item);
    }
  }
  return result;
}

function hasSamePublishedCharts(previous, next) {
  if (!previous?.charts || !next?.charts) return false;

  return ["global", "us"].every((key) => {
    const previousChart = previous.charts[key];
    const nextChart = next.charts[key];
    if (!previousChart || !nextChart || previousChart.week !== nextChart.week) return false;
    return chartSignature(previousChart) === chartSignature(nextChart);
  });
}

function chartSignature(chart) {
  return (chart.items || [])
    .map((item) => [
      item.rank,
      normalizeTitle(item.originalTitle || item.title || ""),
      item.weeks,
      item.metricOne,
      item.metricTwo
    ].join(":"))
    .join("|");
}

async function readExistingData(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
