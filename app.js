const logos = {
  manOnFire:
    "https://dnm.nflximg.net/api/v6/n6T0vlTccejvjnTlICHzHgzbFd0/AAAABWyBOVqZJ_58wrB4jVxwGIdlL9juifhCH9iD2wuBQoKY0_gucUlOt18ljO-w-5hs5620wipqM1auHfwdl6PYbk2CW3w34YnaQ88C-V7ZT3o.png?r=b90",
  murderer:
    "https://dnm.nflximg.net/api/v6/n6T0vlTccejvjnTlICHzHgzbFd0/AAAABVoWxnjyDrEoBXFDG4xB-Mv7RnUuHN6CqotHiWl47C3RH16M8gBIE4xPs2exIDig6E8_pJ-mLqg7wblYO1VPoYAEPnsQLnnCKNdFiUAYszE.png?r=62d",
  unchosen:
    "https://dnm.nflximg.net/api/v6/n6T0vlTccejvjnTlICHzHgzbFd0/AAAABemEyJ2asFNr6jFvh8hDXzhAprsVyxKieBrXbX7twGECmXhbLhkYEVMavkDhri8bSRb-KWZC-GitnVQxpjDSicmskOtNQlpcXxrYlLVnRPI.png?r=944",
  runningPoint:
    "https://dnm.nflximg.net/api/v6/n6T0vlTccejvjnTlICHzHgzbFd0/AAAABT_vX-pN7hxW27uDlQ32sxO3exN7le3UeF6xlyU0jOU9_0Wcy0r169ti_47PctQV8cCErggjAwKgifI4SVbjHbz_9AWDxoBdDmwsJSIfV1c.png?r=16c",
  hulkHogan:
    "https://dnm.nflximg.net/api/v6/n6T0vlTccejvjnTlICHzHgzbFd0/AAAABfyCSyt2UoYCo9nG4JunYTlGq-ISo1IEAYJWptuLyqy_l7PpmOFWLDNIMlbbvBRVN8qohsC-yoA1cetR_y1uwZd8NMkCGlY2LZBYW36M7dU.png?r=1c6",
  raw:
    "https://dnm.nflximg.net/api/v6/n6T0vlTccejvjnTlICHzHgzbFd0/AAAABXd7OotHU-fS2mAlwHEP--igeezw9Qbb63R2K5YQTMdVCY94ZYT_4XtoCO1nm2hOntIF6nR_7aBsvv4Ul6zQ-ajD4a3OpKEipewJa4aMCsY.png?r=45f",
  dannyGo:
    "https://dnm.nflximg.net/api/v6/n6T0vlTccejvjnTlICHzHgzbFd0/AAAABfx88Z9DW7mDmkwCjX8qASKSO2v7aRuLHSzR6jm31tu6_zsRPnyu2YZ5ZxZv64Jm_QeccGLOs_ayJTWB3tFHqPo-Re5OhS2gDm9aFFP_jQM.png?r=bb7",
  salish:
    "https://dnm.nflximg.net/api/v6/n6T0vlTccejvjnTlICHzHgzbFd0/AAAABVA76S70geGMlS1ukzdW0FrjS11xDs-6Hoz9aOQoxBkCKIoez1IXSJL1zwX3tW_IaaBFo4B64F-RLo3gS9hIj8K51beyr56FqpEzrg-tOgI.png?r=202",
  stranger85:
    "https://dnm.nflximg.net/api/v6/n6T0vlTccejvjnTlICHzHgzbFd0/AAAABU7c7-coHNc9vKCNCgrWswZuOF7SUAv8ET7TXnl5-RrwIelJx7BJNIF6vmDTZNnXNjzUEuGQ0ljGwMVEM8OuYj93wl86Qj6pqR1qOnBOIIg.png?r=7a7",
  laBrea:
    "https://dnm.nflximg.net/api/v6/n6T0vlTccejvjnTlICHzHgzbFd0/AAAABR6AXG_VCL7Ct1DSWUmYUXVPuSVlwmHSM2lveQd7m93VXu6-d3YAHGVZ5qbtMg90BjjJxjUeTiuPF-lBadt_wlcj1v63EGx4YbAUJd5pZR0.png?r=87b",
  homicide:
    "https://dnm.nflximg.net/api/v6/n6T0vlTccejvjnTlICHzHgzbFd0/AAAABZwlm4VZT5grCPB_lK8ZL2neUT9XYYtX6YjHZ9kxFkpmWr31HAU3UBj-2R0EBIsWtt98nKE9lSWBB9hguxwdNoFGV9dAoT7YTIN-IFLQas0.png?r=c68"
};

const charts = {
  global: {
    label: "全球榜",
    lede: "Netflix 全球剧集周榜 · 2026/4/27 - 2026/5/3",
    week: "2026/4/27 - 2026/5/3",
    source: "https://www.netflix.com/tudum/top10/tv",
    primaryLabel: "总观看量",
    primary: "5210 万",
    secondaryLabel: "总观看时长",
    secondary: "2.125 亿小时",
    metricOneLabel: "观看量",
    metricTwoLabel: "观看时长",
    items: [
      item(1, "怒火边界：第 1 季", "第 1 季", "上榜 1 周", "1100 万", "6100 万小时", logos.manOnFire, "#e78b4d"),
      item(
        2,
        "我该嫁给杀人犯吗？：限定剧",
        "限定剧",
        "上榜 1 周",
        "1060 万",
        "2680 万小时",
        logos.murderer,
        "#c8c8c8"
      ),
      item(3, "落选者：第 1 季", "第 1 季", "上榜 2 周", "880 万", "3970 万小时", logos.unchosen, "#ffffff"),
      item(4, "运营核心：第 2 季", "第 2 季", "上榜 2 周", "670 万", "3200 万小时", logos.runningPoint, "#dfff27"),
      item(
        5,
        "胡克·霍根：真美国人：限定剧",
        "限定剧",
        "上榜 2 周",
        "310 万",
        "1290 万小时",
        logos.hulkHogan,
        "#f2e339"
      ),
      item(6, "WWE 周播节目：2026 年 4 月 27 日", "周播特别节目", "上榜 1 周", "280 万", "520 万小时", logos.raw, "#e50914"),
      item(7, "运营核心：第 1 季", "第 1 季", "上榜 6 周", "250 万", "1250 万小时", logos.runningPoint, "#dfff27"),
      item(8, "丹尼出发！：第 1 季", "第 1 季", "上榜 3 周", "230 万", "460 万小时", logos.dannyGo, "#ffffff"),
      item(9, "萨利什与乔丹·马特：第 1 季", "第 1 季", "上榜 4 周", "220 万", "770 万小时", logos.salish, "#ffffff"),
      item(
        10,
        "怪奇物语：85 年传说：第 1 季",
        "第 1 季",
        "上榜 2 周",
        "210 万",
        "1010 万小时",
        logos.stranger85,
        "#ff3aa9"
      )
    ]
  },
  us: {
    label: "美国榜",
    lede: "Netflix 美国剧集周榜 · 2026/4/27 - 2026/5/3",
    week: "2026/4/27 - 2026/5/3",
    source: "https://www.netflix.com/tudum/top10/united-states/tv",
    primaryLabel: "榜单数量",
    primary: "10 部",
    secondaryLabel: "合计上榜",
    secondary: "21 周",
    metricOneLabel: "上榜",
    metricTwoLabel: "类型",
    items: [
      item(
        1,
        "我该嫁给杀人犯吗？：限定剧",
        "限定剧",
        "上榜 1 周",
        "1 周",
        "限定剧",
        logos.murderer,
        "#c8c8c8"
      ),
      item(2, "怒火边界：第 1 季", "第 1 季", "上榜 1 周", "1 周", "第 1 季", logos.manOnFire, "#e78b4d"),
      item(3, "运营核心：第 2 季", "第 2 季", "上榜 2 周", "2 周", "第 2 季", logos.runningPoint, "#dfff27"),
      item(4, "落选者：第 1 季", "第 1 季", "上榜 2 周", "2 周", "第 1 季", logos.unchosen, "#ffffff"),
      item(
        5,
        "胡克·霍根：真美国人：限定剧",
        "限定剧",
        "上榜 2 周",
        "2 周",
        "限定剧",
        logos.hulkHogan,
        "#f2e339"
      ),
      item(6, "WWE 周播节目：2026 年 4 月 27 日", "周播特别节目", "上榜 1 周", "1 周", "周播特别节目", logos.raw, "#e50914"),
      item(7, "拉布雷亚：第 1 季", "第 1 季", "上榜 1 周", "1 周", "第 1 季", logos.laBrea, "#ffffff"),
      item(8, "丹尼出发！：第 1 季", "第 1 季", "上榜 4 周", "4 周", "第 1 季", logos.dannyGo, "#ffffff"),
      item(
        9,
        "凶案小组：新奥尔良：第 1 季",
        "第 1 季",
        "上榜 1 周",
        "1 周",
        "第 1 季",
        logos.homicide,
        "#ffffff"
      ),
      item(10, "运营核心：第 1 季", "第 1 季", "上榜 6 周", "6 周", "第 1 季", logos.runningPoint, "#dfff27")
    ]
  }
};

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

function item(rank, title, type, weeks, metricOne, metricTwo, logo, accent) {
  return { rank, title, type, weeks, metricOne, metricTwo, logo, accent };
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
  card.style.setProperty("--accent", entry.accent);
  card.innerHTML = `
    <div class="top-card-inner">
      <span class="top-rank">${entry.rank}</span>
      <div class="logo-wrap">
        <img src="${entry.logo}" alt="${escapeHtml(entry.title)}标题图" loading="lazy" />
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
      <img src="${entry.logo}" alt="${escapeHtml(entry.title)}标题图" loading="lazy" />
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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
