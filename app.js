let charts = {};

const tabs = [...document.querySelectorAll(".tab")];
const topStrip = document.querySelector("#topStrip");
const ranking = document.querySelector("#ranking");
const lede = document.querySelector("#lede");
const weekLabel = document.querySelector("#weekLabel");
const primaryStatLabel = document.querySelector("#primaryStatLabel");
const primaryStat = document.querySelector("#primaryStat");
const secondaryStatLabel = document.querySelector("#secondaryStatLabel");
const secondaryStat = document.querySelector("#secondaryStat");
const sourceLabel = document.querySelector("#sourceLabel");
const sourceLink = document.querySelector("#sourceLink");

init();

async function init() {
  try {
    const response = await fetch("data/rankings.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Unable to load ranking data: ${response.status}`);
    }

    const data = await response.json();
    charts = data.charts || {};
    if (!charts.global || !charts.us) {
      throw new Error("Ranking data is missing global or US charts.");
    }
  } catch (error) {
    renderLoadError(error);
    return;
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const chartKey = tab.dataset.chart;
      render(chartKey);
      const url = new URL(window.location.href);
      url.searchParams.set("chart", chartKey);
      window.history.replaceState({}, "", url);
    });
  });

  const initialChart = new URLSearchParams(window.location.search).get("chart");
  render(charts[initialChart] ? initialChart : "global");
}

function render(chartKey) {
  const chart = charts[chartKey];

  tabs.forEach((tab) => {
    const active = tab.dataset.chart === chartKey;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  document.title = `Netflix ${chart.label} 剧集周榜前十`;
  lede.textContent = chart.lede;
  weekLabel.textContent = chart.week;
  primaryStatLabel.textContent = chart.primaryLabel;
  primaryStat.textContent = chart.primary;
  secondaryStatLabel.textContent = chart.secondaryLabel;
  secondaryStat.textContent = chart.secondary;
  sourceLabel.textContent = `数据来源：Netflix Tudum 官方前十榜 · ${chart.label}`;
  sourceLink.href = chart.source;

  topStrip.replaceChildren(...chart.items.slice(0, 3).map((entry) => renderTopCard(entry)));
  ranking.replaceChildren(...chart.items.map((entry) => renderRow(entry, chart)));
}

function renderTopCard(entry) {
  const card = document.createElement("article");
  card.className = "top-card";
  card.style.setProperty("--accent", entry.accent || "#e50914");
  card.innerHTML = `
    <div class="top-card-inner">
      <span class="top-rank">${entry.rank}</span>
      <div class="logo-wrap">
        ${renderLogo(entry)}
      </div>
      <div>
        <h2 class="top-card-title">${escapeHtml(entry.title)}</h2>
        <div class="top-meta">
          <span class="badge">${escapeHtml(entry.type)}</span>
          <span class="badge">${escapeHtml(entry.weeks)}</span>
        </div>
      </div>
    </div>
  `;
  return card;
}

function renderRow(entry, chart) {
  const row = document.createElement("a");
  row.className = "row-card";
  row.href = chart.source;
  row.target = "_blank";
  row.rel = "noreferrer";
  row.innerHTML = `
    <span class="rank-box">${entry.rank}</span>
    <span class="logo-tile">
      ${renderLogo(entry)}
    </span>
    <span class="show-copy">
      <strong class="show-title">${escapeHtml(entry.title)}</strong>
      <span class="show-detail">
        <span class="badge">${escapeHtml(entry.type)}</span>
        <span class="badge">${escapeHtml(entry.weeks)}</span>
      </span>
    </span>
    <span class="metric is-accent">
      <span>${escapeHtml(chart.metricOneLabel)}</span>
      <strong>${escapeHtml(entry.metricOne)}</strong>
    </span>
    <span class="metric">
      <span>${escapeHtml(chart.metricTwoLabel)}</span>
      <strong>${escapeHtml(entry.metricTwo)}</strong>
    </span>
  `;
  return row;
}

function renderLogo(entry) {
  if (entry.logo) {
    return `<img src="${escapeHtml(entry.logo)}" alt="${escapeHtml(entry.title)}标题图" loading="lazy" />`;
  }

  return `<span class="logo-fallback">${escapeHtml(entry.originalTitle || entry.title)}</span>`;
}

function renderLoadError(error) {
  console.error(error);
  tabs.forEach((tab) => {
    tab.disabled = true;
  });
  lede.textContent = "榜单数据加载失败";
  topStrip.replaceChildren();
  ranking.innerHTML = `
    <article class="empty-state">
      <strong>暂时无法读取榜单数据</strong>
      <span>请稍后刷新页面，或检查 data/rankings.json 是否存在。</span>
    </article>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
