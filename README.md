# Netflix 剧集周榜前十

静态页面支持全球榜和美国榜切换。项目会每周自动抓取 Netflix Tudum 官方最新周榜、提交数据更新，并在每周五北京时间 19:00 自动截图推送到 Telegram。

## 本地预览

页面数据从 `data/rankings.json` 读取，本地预览建议启动一个静态服务：

```bash
npx http-server . -p 4173
```

然后打开 `http://127.0.0.1:4173`。

## 自动更新数据

工作流在 `.github/workflows/update-data.yml`，触发时间是每周三北京时间 08:00。它会抓取：

```text
https://www.netflix.com/tudum/top10/tv
https://www.netflix.com/tudum/top10/united-states/tv
```

如果榜单有变化，工作流会自动提交更新 `data/rankings.json`，随后 GitHub Pages 会重新发布页面。

## Telegram 自动推送

在仓库的 Actions secrets 中配置和“开源黑科技榜单”相同的频道信息：

```text
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
```

如果你原来用的是 `TELEGRAM_CHANNEL`，脚本也会自动兼容。工作流在 `.github/workflows/weekly-telegram.yml`，触发时间是每周五北京时间 19:00。
