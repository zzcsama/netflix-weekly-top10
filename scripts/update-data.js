import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const args = parseArgs(process.argv.slice(2));
const outputPath = resolve(args.output || "data/rankings.json");
const previousData = await readExistingData(outputPath);
const previousItems = indexPreviousItems(previousData);
const userAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

const sources = {
  global: {
    label: "全球榜",
    source: "https://www.netflix.com/tudum/top10/tv",
    dataUrls: [
      "https://www.netflix.com/tudum/top10/data/all-weeks-global.tsv",
      "https://top10.netflix.com/data/all-weeks-global.tsv"
    ],
    category: "TV (English)",
    primaryLabel: "总观看量",
    secondaryLabel: "总观看时长",
    metricOneLabel: "观看量",
    metricTwoLabel: "观看时长"
  },
  us: {
    label: "美国榜",
    source: "https://www.netflix.com/tudum/top10/united-states/tv",
    dataUrls: [
      "https://www.netflix.com/tudum/top10/data/all-weeks-countries.tsv",
      "https://top10.netflix.com/data/all-weeks-countries.tsv"
    ],
    country: "United States",
    category: "TV",
    primaryLabel: "榜单数量",
    secondaryLabel: "合计上榜",
    metricOneLabel: "上榜",
    metricTwoLabel: "类型"
  }
};

const charts = {};
for (const [key, source] of Object.entries(sources)) {
  charts[key] = await loadChart(key, source);
}

const nextData = {
  updatedAt: new Date().toISOString(),
  charts
};

if (hasSamePublishedCharts(previousData, nextData)) {
  console.log(`Netflix rankings are already current for ${charts.global.week}.`);
} else {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(nextData, null, 2)}\n`, "utf8");
  console.log(`Updated ${outputPath} with ${charts.global.week} rankings.`);
}

async function loadChart(key, source) {
  try {
    const chart = await fetchChart(key, source);
    console.log(`Loaded ${source.label} from official Netflix TSV for ${chart.week}.`);
    return chart;
  } catch (error) {
    const previousChart = previousData?.charts?.[key];
    if (previousChart?.items?.length === 10) {
      console.warn(`Using previous ${source.label} data because official Netflix TSV failed: ${error.message}`);
      return previousChart;
    }
    throw error;
  }
}

async function fetchChart(key, source) {
  const rows = await fetchTsvRows(source.dataUrls);
  const filtered = filterRows(rows, source);
  const latestWeek = latestWeekValue(filtered);
  const latestRows = filtered
    .filter((row) => row.week === latestWeek)
    .sort((left, right) => metricNumber(left.weekly_rank) - metricNumber(right.weekly_rank))
    .slice(0, 10);

  if (latestRows.length !== 10) {
    throw new Error(`Expected 10 ${source.label} TSV rows, found ${latestRows.length}.`);
  }

  const week = weekRangeFromEndDate(latestWeek);
  const logoMap = await fetchLogoMap(source.source).catch((error) => {
    console.warn(`Unable to fetch Netflix title images for ${source.label}: ${error.message}`);
    return new Map();
  });
  const items = latestRows.map((row) => transformRow(row, key, logoMap));

  if (key === "global") {
    const totalViews = latestRows.reduce((sum, row) => sum + metricNumber(row.weekly_views), 0);
    const totalHours = latestRows.reduce((sum, row) => sum + metricNumber(row.weekly_hours_viewed), 0);

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

  const totalWeeks = latestRows.reduce((sum, row) => sum + metricNumber(row.cumulative_weeks_in_top_10), 0);
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

async function fetchTsvRows(urls) {
  const errors = [];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          "user-agent": userAgent,
          "accept-language": "en-US,en;q=0.9",
          accept: "text/tab-separated-values,text/plain,*/*;q=0.8"
        }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const rows = parseTsv(await response.text());
      if (rows.length) return rows;
      throw new Error("empty TSV");
    } catch (error) {
      errors.push(`${url}: ${error.message}`);
    }
  }

  throw new Error(errors.join(" | "));
}

async function fetchLogoMap(sourceUrl) {
  const response = await fetch(sourceUrl, {
    headers: {
      "user-agent": userAgent,
      "accept-language": "en-US,en;q=0.9",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return buildLogoMap(extractHtmlImages(await response.text()));
}

function extractHtmlImages(html) {
  const images = [];
  const source = String(html || "");
  const imageTags = source.matchAll(/<img\b[^>]*>/gi);

  for (const [tag] of imageTags) {
    images.push({
      alt: decodeHtmlEntities(readHtmlAttr(tag, "alt")),
      src: decodeHtmlEntities(readHtmlAttr(tag, "src")),
      srcset: decodeHtmlEntities(readHtmlAttr(tag, "srcset"))
    });
  }

  const imageLinks = source.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi);
  for (const [, attrs, content] of imageLinks) {
    const href = decodeHtmlEntities(readHtmlAttr(attrs, "href"));
    if (!isNetflixImageUrl(href)) continue;

    images.push({
      alt: decodeHtmlEntities(
        readHtmlAttr(attrs, "aria-label") ||
          readHtmlAttr(attrs, "title") ||
          readHtmlAttr(attrs, "alt") ||
          stripTags(content)
      ),
      src: href,
      srcset: ""
    });
  }

  return images;
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

function filterRows(rows, source) {
  const countryRows = source.country ? rows.filter((row) => row.country_name === source.country) : rows;
  const exactRows = countryRows.filter((row) => row.category === source.category);
  if (exactRows.length) return exactRows;

  if (source.category === "TV") {
    return countryRows.filter((row) => /^TV\b/i.test(row.category || ""));
  }

  return exactRows;
}

function parseTsv(text) {
  const lines = String(text || "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());
  const headers = lines.shift()?.split("\t").map(normalizeTsvHeader) || [];

  return lines.map((line) => {
    const values = line.split("\t");
    return Object.fromEntries(headers.map((header, index) => [header, (values[index] || "").trim()]));
  });
}

function normalizeTsvHeader(header) {
  return String(header || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function latestWeekValue(rows) {
  const weeks = [...new Set(rows.map((row) => row.week).filter(Boolean))].sort(compareWeekValues);
  if (!weeks.length) throw new Error("No matching rows in Netflix TSV data.");
  return weeks.at(-1);
}

function compareWeekValues(left, right) {
  return parseWeekDate(left).getTime() - parseWeekDate(right).getTime();
}

function weekRangeFromEndDate(value) {
  const end = parseWeekDate(value);
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - 6);
  return `${formatDatePart(start)} - ${formatDatePart(end)}`;
}

function formatDatePart(date) {
  return `${date.getUTCFullYear()}/${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
}

function parseWeekDate(value) {
  const text = String(value || "").trim();
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return new Date(Date.UTC(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3])));
  }

  const usMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (usMatch) {
    const year = usMatch[3].length === 2 ? Number(`20${usMatch[3]}`) : Number(usMatch[3]);
    return new Date(Date.UTC(year, Number(usMatch[1]) - 1, Number(usMatch[2])));
  }

  throw new Error(`Invalid TSV week value: ${value}`);
}

function transformRow(row, key, logoMap) {
  const originalTitle = tsvTitle(row);
  const titleInfo = localizeTitle(originalTitle);
  const previous = previousItems.get(normalizeTitle(originalTitle));
  const weeks = metricNumber(row.cumulative_weeks_in_top_10 || row.weeks_in_top_10);
  const views = metricNumber(row.weekly_views);
  const hours = metricNumber(row.weekly_hours_viewed);

  return {
    rank: metricNumber(row.weekly_rank),
    title: titleInfo.title,
    originalTitle,
    type: titleInfo.type,
    weeks: `上榜 ${weeks} 周`,
    metricOne: key === "global" ? formatCount(views) : `${weeks} 周`,
    metricTwo: key === "global" ? `${formatCount(hours)}小时` : titleInfo.type,
    logo: pickLogo(originalTitle, logoMap) || previous?.logo || "",
    accent: previous?.accent || accentForTitle(originalTitle)
  };
}

function tsvTitle(row) {
  return row.season_title && row.season_title !== "N/A" ? row.season_title : row.show_title || row.title || "";
}

function metricNumber(value) {
  const number = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(number) ? number : 0;
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
  return String(value || "")
    .replace(/^Image:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function firstSrcsetUrl(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim().split(/\s+/)[0])
    .find(Boolean) || "";
}

function isNetflixImageUrl(value) {
  return /^https:\/\/dnm\.nflximg\.net\/.+\.(?:png|webp|jpe?g)(?:\?|$)/i.test(String(value || ""));
}

function stripTags(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function logoScore(src) {
  if (/\.png(?:\?|$)/i.test(src)) return 4;
  if (/\.webp(?:\?|$)/i.test(src)) return 3;
  if (/\.jpe?g(?:\?|$)/i.test(src)) return 2;
  return 1;
}

function readHtmlAttr(tag, name) {
  const pattern = new RegExp(`${name}\\s*=\\s*(["'])(.*?)\\1`, "i");
  return tag.match(pattern)?.[2] || "";
}

function decodeHtmlEntities(value) {
  return String(value || "").replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, body) => {
    if (body[0] === "#") {
      const codePoint = body[1]?.toLowerCase() === "x" ? Number.parseInt(body.slice(2), 16) : Number.parseInt(body.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }

    return {
      amp: "&",
      apos: "'",
      gt: ">",
      lt: "<",
      nbsp: " ",
      quot: "\""
    }[body.toLowerCase()] || entity;
  });
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

function formatCount(value) {
  if (value >= 100_000_000) return `${trimNumber(value / 100_000_000, 3)} 亿`;
  if (value >= 10_000) return `${trimNumber(value / 10_000, 1)} 万`;
  return new Intl.NumberFormat("zh-CN").format(value);
}

function trimNumber(value, digits) {
  return Number(value.toFixed(digits)).toString();
}

function stripSeriesSuffix(title) {
  return String(title || "").replace(/:\s*(Season \d+|Limited Series)$/i, "").trim();
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
      item.logo || "",
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
