# Analyser

本项目保存 A 股复盘报告、上下文状态和归档脚本。

## 飞书网关

`src/lark/` 已接入来自 `/Users/tuyile/project/tyl_investment/src/lark` 的飞书访问封装，基于本机 `lark-cli` 发送文本、交互卡片和监听事件。

安装依赖：

```bash
npm install
```

构建：

```bash
npm run build
```

发送报告到飞书群：

```bash
npm run send:lark -- --file reports/2026-06-18-a-share-overnight-brief.md --chat-id <chat_id>
```

也可以用环境变量设置默认目标：

```bash
export LARK_CHAT_ID=<chat_id>
npm run send:lark -- --file reports/2026-06-18-a-share-overnight-brief.md
```

发送给单个用户时使用 `--user-id <open_id>` 或 `LARK_USER_ID`。默认以 markdown 文本发送；如需交互卡片，追加 `--mode card`。
