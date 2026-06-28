import {
  genRecentDaysMemory,
  getPreviousDayMemory,
  getRecentDayReportBriefs,
  type GetRecentDayReportBriefsOptions,
} from "../src/recentReport.js";

interface CliOptions extends GetRecentDayReportBriefsOptions {
  json?: boolean;
}

function printUsage(): void {
  console.log(`Usage: npm run day-report:briefs -- [options]

Options:
  --days <number>   最近多少个自然日，默认 14
  --today <date>    用于计算最近区间的结束日期，例如 2026-06-27
  --dir <path>      day-report 目录，默认 data/day-report
  --json            输出结构化 JSON
  -h, --help        显示帮助`);
}

function readValue(args: string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} 缺少参数`);
  }
  return value;
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "-h" || arg === "--help") {
      printUsage();
      process.exit(0);
    }

    if (arg === "--json") {
      options.json = true;
      continue;
    }

    if (arg === "--days") {
      const value = Number(readValue(args, index, arg));
      if (!Number.isInteger(value) || value <= 0) {
        throw new Error("--days 必须是正整数");
      }
      options.days = value;
      index += 1;
      continue;
    }

    if (arg === "--today") {
      options.today = readValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--dir") {
      options.reportDir = readValue(args, index, arg);
      index += 1;
      continue;
    }

    throw new Error(`未知参数: ${arg}`);
  }

  return options;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const briefs = await genRecentDaysMemory(options);
  const prevDayOutput = await getPreviousDayMemory(options);
  const output = [briefs, prevDayOutput].join("\n\n");
  console.log(output || "最近区间内没有可用的 day-report 简述。");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`day-report:briefs failed: ${message}`);
  process.exitCode = 1;
});
