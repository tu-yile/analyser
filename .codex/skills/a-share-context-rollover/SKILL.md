---
name: a-share-context-rollover
description: 执行A股报告数据系统的上下文归档、日终rollover、周终rollover和recent清理。用于用户要求“执行日终归档”“把today合并到week”“执行周终归档”“把week合并到recent”“清理recent”“rollover A股上下文”时；读取data/context中的today、today_state、week、week_state、recent和recent_index，提炼摘要后调用scripts/market_memory.py的原子文件操作完成归档、合并和清空。
---

# A股上下文 Rollover

## 目标

维护 A 股连续报告系统的上下文生命周期。这个 skill 负责判断并执行日终、周终和 recent 清理；`scripts/market_memory.py` 只做文件操作，不判断是否应该 rollover。

不要求幂等。用户重复触发时，按当前文件状态再次执行。

## 数据文件

运行前读取：

- `data/context/today.md`
- `data/context/today_state.md`
- `data/context/week.md`
- `data/context/week_state.md`
- `data/context/recent.md`
- `data/context/recent_index.json`

输出中间摘要文件时，保存为 Markdown 或 JSON 文件后再调用脚本。不要把摘要只留在对话里。

## 日终 Rollover

用于收盘报告完成后，或用户要求“执行日终归档”“把 today 合并到 week”时。

步骤：

1. 读取 `today.md`、`today_state.md`、`week.md`、`week_state.md`、`recent.md`。
2. 从 `today.md` 的完整报告和 `today_state.md` 的当前状态中提炼日总结。日总结应包含：
   - 当日主导变量
   - 指数、量能、市场广度和情绪结构
   - 主线、分歧和失效线索
   - 对本周仍有延续价值的内容
   - 次日需要验证的条件
3. 将日总结保存为文件，例如 `data/history/today/<YYYY-MM-DD>-summary.md`。
4. 运行：

```bash
python3 scripts/market_memory.py archive-today --date <YYYY-MM-DD>
python3 scripts/market_memory.py append-week --file <daily-summary-file> --label "<YYYY-MM-DD> daily summary"
```

5. 基于更新后的 `week.md`、旧 `week_state.md` 和日总结，生成新的 `week_state.md` 内容并保存为临时文件。
6. 运行：

```bash
python3 scripts/market_memory.py update-week-state --file <new-week-state-file>
python3 scripts/market_memory.py clear-today
```

执行后确认 `today.md` 和 `today_state.md` 已清空为标题模板。

## 周终 Rollover

用于每周最后一个 A 股交易日收盘后，或用户要求“执行周终归档”“把 week 合并到 recent”时。

步骤：

1. 读取 `week.md`、`week_state.md`、`recent.md`、`recent_index.json`。
2. 从 `week.md` 和 `week_state.md` 提炼周总结。周总结应包含：
   - 本周持续主线
   - 反复出现的风险和失效判断
   - 重要政策、宏观、产业或公司线索
   - 情绪周期、量能变化和风格迁移
   - 下周仍需保留的观察条件
3. 将周总结保存为文件，例如 `data/history/week/<YYYY-Www>-summary.md`。
4. 在合入前归档 `week.md` 和 `recent.md`：

```bash
python3 scripts/market_memory.py archive-week --week <YYYY-Www>
python3 scripts/market_memory.py archive-recent --label <YYYY-Www-before-merge>
```

5. 将周总结追加到 `recent.md`：

```bash
python3 scripts/market_memory.py append-recent --file <weekly-summary-file> --label "<YYYY-Www> weekly summary"
```

6. 基于合入后的 `recent.md` 生成新的 `recent_index.json`。索引使用数组，每项至少包含：

```json
{
  "id": "stable-readable-id",
  "title": "简短标题",
  "status": "active",
  "importance": 3,
  "last_seen": "YYYY-MM-DD",
  "reason": "保留或降权原因"
}
```

`status` 使用 `active`、`stale` 或 `archived`。`importance` 使用 1 到 5。

7. 运行：

```bash
python3 scripts/market_memory.py replace-recent-index --file <new-recent-index-file>
python3 scripts/market_memory.py clear-week
```

执行后确认 `week.md` 和 `week_state.md` 已清空为标题模板。

## Recent 清理

用于用户要求“清理 recent”或 recent 上下文过长、过时时。

步骤：

1. 读取 `recent.md` 和 `recent_index.json`。
2. 判断每条 recent 内容的参考价值。保留对当前市场仍有解释力、仍会影响后续报告判断的内容。
3. 从新的 `recent.md` 中删除低价值内容；不要删除 `history/` 中的任何归档文件。
4. 更新 `recent_index.json`，将低价值内容标记为 `stale` 或 `archived`，保留原因。
5. 保存两个新文件后运行：

```bash
python3 scripts/market_memory.py replace-recent --file <new-recent-file>
python3 scripts/market_memory.py replace-recent-index --file <new-recent-index-file>
```

## 输出要求

完成后报告：

- 执行的是日终、周终还是 recent 清理
- 读取了哪些 context 文件
- 生成了哪些摘要或索引文件
- 调用了哪些 `market_memory.py` 命令
- 哪些 context 被清空或替换
- 哪些 history 快照已产生

如果文件为空或数据不足，仍按当前状态执行，但必须在输出中说明依据不足。
