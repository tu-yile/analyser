import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export interface DayReportBrief {
  date: string;
  filePath: string;
  brief: string;
}

export interface GetRecentDayReportBriefsOptions {
  reportDir?: string;
  days?: number;
  today?: Date | string;
}

export interface GetPreviousDayReportDetailOptions {
  reportDir?: string;
  today?: Date | string;
}

const DAY_REPORT_DIR = path.resolve(process.cwd(), "data/record/day-report");
const DAY_REPORT_FILE_RE = /^(\d{4}-\d{2}-\d{2})\.md$/;

// 统一使用本地日期键，避免 toISOString() 在时区转换后跨天。
function toDateKey(date: Date | string): string {
  if (typeof date === "string") {
    return date.slice(0, 10);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function extractDayReportBrief(content: string): string {
  // day-report 约定以一级标题分隔「简述」和「详情」。
  const briefMatch = content.match(/^#\s*简述\s*$/m);
  if (!briefMatch || briefMatch.index === undefined) {
    return "";
  }

  const start = briefMatch.index + briefMatch[0].length;
  const rest = content.slice(start);
  const detailMatch = rest.match(/^#\s*详情\s*$/m);
  const brief = detailMatch && detailMatch.index !== undefined
    ? rest.slice(0, detailMatch.index)
    : rest;

  return brief.trim();
}

export function extractDayReportDetail(content: string): string {
  // 「详情」之后默认都是完整复盘正文。
  const detailMatch = content.match(/^#\s*详情\s*$/m);
  if (!detailMatch || detailMatch.index === undefined) {
    return "";
  }

  const start = detailMatch.index + detailMatch[0].length;
  return content.slice(start).trim();
}

export async function getRecentDayReportBriefs(
  options: GetRecentDayReportBriefsOptions = {},
): Promise<DayReportBrief[]> {
  const reportDir = options.reportDir ?? DAY_REPORT_DIR;
  const days = options.days ?? 5;
  const todayKey = toDateKey(options.today ?? new Date());
  const startKey = addDays(todayKey, -(days - 1));

  const entries = await readdir(reportDir, { withFileTypes: true });
  const reportFiles = entries
    .filter((entry) => entry.isFile())
    .map((entry) => {
      // 文件名按 YYYY-MM-DD.md 命名，日期字符串可直接用于同格式区间比较。
      const match = entry.name.match(DAY_REPORT_FILE_RE);
      return match ? { date: match[1], name: entry.name } : null;
    })
    .filter((entry): entry is { date: string; name: string } => {
      return entry !== null && entry.date >= startKey && entry.date <= todayKey;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const briefs = await Promise.all(
    reportFiles.map(async (file) => {
      const filePath = path.join(reportDir, file.name);
      const content = await readFile(filePath, "utf8");
      return {
        date: file.date,
        filePath,
        brief: extractDayReportBrief(content),
      };
    }),
  );

  // 没有简述区段或简述为空的文件不进入上下文，避免污染后续任务输入。
  return briefs.filter((report) => report.brief.length > 0);
}

export async function genRecentDaysMemory(options: GetRecentDayReportBriefsOptions = {}): Promise<string> {
  const briefs = await getRecentDayReportBriefs(options)

  const briefsContent=  briefs
    .map((report) => `## ${report.date}\n\n${report.brief}`)
    .join("\n\n");

  const memory = `
最近两周的交易日整体情况如下：

${briefsContent}

要查看某一天的具体行情可以读取./data/day-report/{YYYY-MM-DD}.md
  `

  return memory;
}

export async function getPreviousDayMemory(
  options: GetPreviousDayReportDetailOptions = {},
): Promise<string> {
  const reportDir = options.reportDir ?? DAY_REPORT_DIR;
  const todayKey = toDateKey(options.today ?? new Date());

  const entries = await readdir(reportDir, { withFileTypes: true });
  const previousReport = entries
    .filter((entry) => entry.isFile())
    .map((entry) => {
      // 取 today 之前最近的一篇报告，而不是机械读取自然日昨天。
      const match = entry.name.match(DAY_REPORT_FILE_RE);
      return match ? { date: match[1], name: entry.name } : null;
    })
    .filter((entry): entry is { date: string; name: string } => {
      return entry !== null && entry.date < todayKey;
    })
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  if (!previousReport) {
    return null;
  }

  const filePath = path.join(reportDir, previousReport.name);
  const content = await readFile(filePath, "utf8");
  const detail = extractDayReportDetail(content);

  if (!detail) {
    return '';
  }

  return `
上一交易日的市场详情如下：

${detail};
  `
}
