# Analyser

本项目保存 A 股复盘报告、上下文状态和归档脚本。

## 飞书网关

`src/lark/` 已接入来自 `/Users/tuyile/project/tyl_investment/src/lark` 的飞书访问封装，基于本机 `lark-cli` 发送文本、交互卡片和监听事件。

启动常驻网关：

```bash
npm run gateway:start
```

使用 `npm run gateway:status` 查看状态，使用 `npm run gateway:stop` 停止。前台调试可运行 `npm run gateway`。

运行数据默认写入 `.gateway/`。可通过 `ALLOWED_OPEN_IDS` 限制允许访问网关的飞书用户，通过 `WORKSPACE_ROOTS` 限制可绑定的工作目录；两个变量均使用逗号分隔。

网关默认使用 Markdown 消息发送进度和结果。需要恢复交互卡片时，可在启动前设置 `STREAMING_MODE=cardkit`。

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

发送给单个用户时使用 `--user-id <open_id>` 或 `LARK_USER_ID`。报告默认以飞书交互卡片发送；如需普通 Markdown 消息，追加 `--mode text`。
