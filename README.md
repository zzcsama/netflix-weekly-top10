# Netflix 剧集周榜前十

静态页面支持全球榜和美国榜切换，并可在每周五北京时间 19:00 自动截图推送到 Telegram。

## 本地预览

直接打开 `index.html` 即可。

## Telegram 自动推送

把 `netflix-weekly-top10` 目录作为仓库根目录推到 GitHub 后，在仓库的 Actions secrets 中配置和“开源黑科技榜单”相同的频道信息：

```text
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
```

如果你原来用的是 `TELEGRAM_CHANNEL`，脚本也会自动兼容。工作流在 `.github/workflows/weekly-telegram.yml`，触发时间是每周五北京时间 19:00。

可选变量：

```text
PUBLIC_PAGE_URL
```

设置后会出现在 Telegram 推送文案末尾。
