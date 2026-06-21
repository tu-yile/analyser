#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { LarkClient } from "../src/lark/index.js";
import { Logger } from "../src/core/logging/logger.js";

interface CliArgs {
  file?: string;
  chatId?: string;
  userId?: string;
  title?: string;
  mode: "text" | "card";
  maxLength: number;
}

function usage(): string {
  return [
    "Usage:",
    "  npm run send:lark -- --file reports/2026-06-18-a-share-overnight-brief.md --chat-id <chat_id>",
    "",
    "Options:",
    "  --file <path>       Markdown report file to send.",
    "  --chat-id <id>      Feishu chat_id. Defaults to LARK_CHAT_ID.",
    "  --user-id <id>      Feishu open_id. Defaults to LARK_USER_ID.",
    "  --title <text>      Optional heading prepended to the message.",
    "  --mode <text|card>  Send plain markdown text or an interactive card. Defaults to text.",
    "  --max-length <n>    Text chunk size for text mode. Defaults to 1400.",
  ].join("\n");
}

function readArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    chatId: process.env.LARK_CHAT_ID,
    userId: process.env.LARK_USER_ID,
    mode: "text",
    maxLength: Number(process.env.LARK_MAX_REPLY_CHUNK_LENGTH || 1400),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (key === "--help" || key === "-h") {
      console.log(usage());
      process.exit(0);
    }
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${key}`);
    }
    if (key === "--file") {
      args.file = value;
      index += 1;
    } else if (key === "--chat-id") {
      args.chatId = value;
      index += 1;
    } else if (key === "--user-id") {
      args.userId = value;
      index += 1;
    } else if (key === "--title") {
      args.title = value;
      index += 1;
    } else if (key === "--mode") {
      if (value !== "text" && value !== "card") {
        throw new Error("--mode must be text or card");
      }
      args.mode = value;
      index += 1;
    } else if (key === "--max-length") {
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error("--max-length must be a positive number");
      }
      args.maxLength = parsed;
      index += 1;
    } else {
      throw new Error(`Unknown option: ${key}`);
    }
  }

  if (!args.file) {
    throw new Error("--file is required");
  }
  if (!args.chatId && !args.userId) {
    throw new Error("--chat-id/--user-id or LARK_CHAT_ID/LARK_USER_ID is required");
  }
  return args;
}

function readReport(file: string, title?: string): string {
  const reportPath = path.resolve(file);
  const body = fs.readFileSync(reportPath, "utf-8").trim();
  if (!title) {
    return body;
  }
  return `# ${title}\n\n${body}`;
}

async function main(): Promise<void> {
  const args = readArgs(process.argv.slice(2));
  const text = readReport(args.file!, args.title);
  const logger = new Logger(".runtime/lark-gateway.log");
  const client = new LarkClient({ logger, maxReplyChunkLength: args.maxLength });

  if (args.mode === "card") {
    const result = await client.sendInteractiveCardMessage({
      chatId: args.chatId,
      userId: args.userId,
      card: client.buildCardKitCompletedCard(text),
    });
    console.log(`sent_message_id=${result.messageId || ""}`);
    return;
  }

  await client.sendText({
    chatId: args.chatId,
    userId: args.userId,
    text,
  });
  console.log("sent=true");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
