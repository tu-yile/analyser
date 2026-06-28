# A股日度市场分析 - 数据拉取工作流

## 适用场景
用户要求对某个交易日进行复盘分析，需要独立从富途API拉取全新数据（不引用本地缓存报告）。

## 数据拉取流程

### 第一步：六大指数日K线（并行拉取）
```python
from futu import *

quote_ctx = OpenQuoteContext(host='127.0.0.1', port=11111)

indices = {
    '上证综指': 'SH.000001',
    '沪深300': 'SH.000300',
    '科创50': 'SH.000688',
    '深证成指': 'SZ.399001',
    '创业板指': 'SZ.399006',
    '中证1000': 'SH.000852',
}

for name, code in indices.items():
    ret, data, page = quote_ctx.request_history_kline(
        code, start='YYYY-MM-DD', end='YYYY-MM-DD', ktype=KLType.K_DAY
    )
```
取目标日+前后各1-2天做对比。关键字段：`open, close, high, low, volume, turnover`。

### 第二步：当日核心新闻（并行拉取）
使用 `futu-news-search` skill 的 curl API，从 `https://ai-news-search.futunn.com/news_search` 拉取。
- 关键词：`目标日期 + 核心板块名`（如 "美光 存储 半导体"、"A股 收盘"）
- 参数：`size=10, news_type=1, sort_type=2`
- `publish_time` 是 Unix 秒时间戳，需转换为可读时间筛选当日新闻

### 第三步：关键个股日K线（批量拉取）
选择当日主线方向的核心标的（5-15只），用 `request_history_kline` 拉取目标日和前一日数据，计算涨跌幅。

### 第四步：资源/反向板块验证（可选）
拉取与主线对立的方向（如资源股 vs 科技股）来验证资金轮动方向。

## 常见坑

### 1. `get_market_snapshot` 盘后超时
概念板块快照（`SH.BK****`）在收盘后调用极易超时（30s+）。**不要用它拉板块涨跌幅**。替代方案：
- 用 `get_plate_list` → 遍历成分股 → 逐个拉K线估算板块表现
- 或直接用代表性个股代替板块数据

### 2. 部分个股 `request_history_kline` 返回错误
如长电科技（SH.600584）、天齐锂业（SZ.002466）等。可能原因：
- 停牌/退市/代码变更
- 解决：跳过该标的，换同方向替代股

### 3. 新闻搜索关键词选择
- 富途新闻搜索对太宽泛的词（如仅日期）返回大量无关结果
- 建议：**日期 + 具体板块/事件名**组合（如 "美光财报 存储芯片 2026"）
- 新闻类型混用（news_type=1 新闻 + news_type=3 研报）可能提高命中率

### 4. macOS 无 `timeout` 命令
macOS 用 `gtimeout`（需 `brew install coreutils`）或直接设 Python 侧超时。

## 输出结构建议
分析报告建议包含以下模块：
1. **大盘全景**：六大指数表 + 量价对比
2. **核心催化**：当日关键事件
3. **方向拆解**：强势主线 vs 重灾区，附个股涨跌幅
4. **盘面特征**：资金行为解读（放量/缩量、扩散/集中、分化程度）
5. **情景推演**：基准/偏强/偏弱三种情景 + 触发条件
6. **风险预警**：结构化风险等级表
7. **判语**：一句话总结当日市场本质
