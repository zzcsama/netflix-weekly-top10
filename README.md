# Netflix 剧集周榜前十

静态页面支持全球榜和美国榜切换。项目会每周自动抓取 Netflix Tudum 官方最新周榜、提交数据更新、部署页面，并在同一次任务中截图推送到 Telegram。

## 本地预览

页面数据从 `data/rankings.json` 读取，本地预览建议启动一个静态服务：

```bash
npx http-server . -p 4173
```

然后打开 `http://127.0.0.1:4173`。

## 自动更新数据

工作流在 `.github/workflows/update-data.yml`，固定在每周三北京时间 21:17 自动抓取；如果 Netflix 当晚发布延迟，会在周四北京时间 09:17 再补跑一次。它会抓取：

```text
https://www.netflix.com/tudum/top10/tv
https://www.netflix.com/tudum/top10/united-states/tv
```

如果榜单有变化，工作流会自动提交更新 `data/rankings.json`、截图推送 Telegram，并重新发布 GitHub Pages。补跑时如果榜单已经是同一周数据，会自动跳过，避免重复推送。

## Telegram 自动推送

把 `netflix-weekly-top10` 目录作为仓库根目录推到 GitHub 后，在仓库的 Actions secrets 中配置和“开源黑科技榜单”相同的频道信息：

```text
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
```

如果你原来用的是 `TELEGRAM_CHANNEL`，脚本也会自动兼容。`.github/workflows/weekly-telegram.yml` 保留为手动补发入口；需要立即补发时，也可以手动运行 `Update and Publish Netflix Ranking Data`。
