import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type Args = {
  mode: "card" | "collapsible-card" | "text";
  file: string;
  chatId?: string;
  userId?: string;
  title: string;
  panelTitle: string;
  expanded: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    mode: "card",
    file: "",
    chatId: process.env.LARK_CHAT_ID,
    userId: process.env.LARK_USER_ID,
    title: "报告",
    panelTitle: "点击查看完整报告",
    expanded: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === "--mode" && value) {
      args.mode = value as Args["mode"];
      i += 1;
    } else if (key === "--file" && value) {
      args.file = value;
      i += 1;
    } else if (key === "--chat-id" && value) {
      args.chatId = value;
      i += 1;
    } else if (key === "--user-id" && value) {
      args.userId = value;
      i += 1;
    } else if (key === "--title" && value) {
      args.title = value;
      i += 1;
    } else if (key === "--panel-title" && value) {
      args.panelTitle = value;
      i += 1;
    } else if (key === "--expanded" && value) {
      args.expanded = value === "true";
      i += 1;
    }
  }

  if (!args.file) {
    throw new Error("--file is required");
  }
  if (!args.chatId && !args.userId) {
    throw new Error("--chat-id or --user-id is required");
  }
  return args;
}

function findLarkCli(): { command: string; args: string[] } {
  const runner = process.env.LARK_CLI_RUNNER;
  if (runner && fs.existsSync(runner)) {
    return { command: process.execPath, args: [runner] };
  }

  const candidates = [
    path.resolve(process.cwd(), "node_modules", ".bin", "lark-cli"),
    "/Users/tuyile/project/tyl_investment/node_modules/.bin/lark-cli",
  ];
  const cli = candidates.find((candidate) => fs.existsSync(candidate));
  if (cli) {
    return { command: cli, args: [] };
  }
  return { command: "lark-cli", args: [] };
}

function runLarkCli(args: string[]): Promise<string> {
  const cli = findLarkCli();
  return new Promise((resolve, reject) => {
    const child = spawn(cli.command, [...cli.args, ...args], {
      env: process.env,
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }
      reject(new Error(`lark-cli exited with code ${code}\nstdout: ${stdout}\nstderr: ${stderr}`));
    });
  });
}

function target(args: Args): { receiveId: string; receiveIdType: "chat_id" | "open_id" } {
  if (args.chatId) {
    return { receiveId: args.chatId, receiveIdType: "chat_id" };
  }
  return { receiveId: args.userId || "", receiveIdType: "open_id" };
}

function buildCard(args: Args, markdown: string) {
  if (args.mode === "collapsible-card") {
    return {
      schema: "2.0",
      config: { wide_screen_mode: true },
      header: {
        title: { tag: "plain_text", content: args.title },
        template: "blue",
      },
      body: {
        elements: [
          {
            tag: "collapsible_panel",
            expanded: args.expanded,
            header: {
              title: { tag: "plain_text", content: args.panelTitle },
            },
            elements: [{ tag: "markdown", content: markdown }],
          },
        ],
      },
    };
  }

  return {
    schema: "2.0",
    config: { wide_screen_mode: true },
    header: {
      title: { tag: "plain_text", content: args.title },
      template: "blue",
    },
    body: {
      elements: [{ tag: "markdown", content: markdown }],
    },
  };
}

async function sendText(args: Args, markdown: string): Promise<void> {
  const cliArgs = ["im", "+messages-send", "--as", "bot", "--markdown", markdown];
  if (args.chatId) {
    cliArgs.push("--chat-id", args.chatId);
  } else if (args.userId) {
    cliArgs.push("--user-id", args.userId);
  }
  await runLarkCli(cliArgs);
}

async function sendCard(args: Args, markdown: string): Promise<void> {
  const card = buildCard(args, markdown);
  const t = target(args);
  const payload = {
    receive_id: t.receiveId,
    msg_type: "interactive",
    content: JSON.stringify(card),
  };
  await runLarkCli([
    "api",
    "POST",
    "/open-apis/im/v1/messages",
    "--as",
    "bot",
    "--params",
    JSON.stringify({ receive_id_type: t.receiveIdType }),
    "--data",
    JSON.stringify(payload),
  ]);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const filePath = path.resolve(args.file);
  const markdown = fs.readFileSync(filePath, "utf8");
  if (args.mode === "text") {
    await sendText(args, markdown);
  } else {
    await sendCard(args, markdown);
  }
  console.log(`Sent ${filePath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
