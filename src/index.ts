#!/usr/bin/env node
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import net from "net";
import ora from "ora";
import { z } from "zod";
import { input, select } from "@inquirer/prompts";
import { readdir } from "fs/promises";

const mcpServer = new McpServer({
  name: "Agent Companion CLI",
  version: "1.0.0-beta.1",
});

const spinner = ora();

let copilotCallback: ((prompt: string) => void) | undefined = undefined;
let outputCallback: ((output: string) => void) | undefined = undefined;
let waitForCopilotCallback: (() => void) | undefined = undefined;

let askReason: string | undefined = undefined;
async function askCopilot(prompt: string, reason?: string): Promise<string> {
  askReason = reason;
  copilotCallback!(prompt);
  copilotCallback = undefined;
  return new Promise<string>((resolve) => {
    outputCallback = resolve;
  });
}

mcpServer.tool(
  "copilot_conductor",
  "Copilot connection. Follow all instructions returned by this tool.",
  z.object({
    output: z
      .string()
      .optional()
      .describe(
        "Output requested by the previous invocation of this tool. If the first invocation, leave this empty.",
      ),
    success: z
      .boolean()
      .describe(
        "Indicates whether the task requested was performed successfully. If false, the output should contain a short explanation of what went wrong. If the first invocation, just provide true.",
      ),
  }).shape,
  async (args) => {
    if (waitForCopilotCallback) {
      spinner.succeed("Copilot has connected");
      waitForCopilotCallback();
      waitForCopilotCallback = undefined;
    }

    if (outputCallback) {
      spinner.succeed(askReason ?? "Copilot has finished working");
      askReason = undefined;
      outputCallback(args.output ?? "no output");
      outputCallback = undefined;
    }

    const prompt = await new Promise<string>((resolve) => {
      copilotCallback = resolve;
    });

    spinner.start("Copilot" + ((askReason && `: ${askReason}`) || ""));
    return {
      content: [
        {
          type: "text",
          text: `Follow these instructions exactly: <instructions>\n\n${prompt}\n\n</instructions> and then call the copilot_cli tool with the result.
        Do not output the result directly, but instead return it as the 'output' field in the next invocation of this tool.
        output "fail" and a short explanation of what went wrong. Do not attempt to fix the problem yourself unless the instructions explicitly say to do so.`,
        },
      ],
    };
  },
);

async function main() {
  spinner.start(
    "Waiting for MCP server connection. Start the MCP server using curl, ncat or a similar tool, redirecting stdio traffic to TCP port 4001.",
  );
  await new Promise<void>((resolve) => {
    const server = net.createServer(async (socket) => {
      const transport = new StdioServerTransport(socket, socket);
      await mcpServer.connect(transport);
      socket.on("close", () => process.exit(0));
      resolve();
    });
    server.listen(4001);
  });
  spinner.succeed("MCP server connected");
  spinner.start(
    "Waiting for Copilot. Instruct Copilot to call the copilot_cli tool to continue.",
  );
  await new Promise<void>((resolve) => {
    waitForCopilotCallback = resolve;
  });

  const context = {
    requestUserInput: async (prompt: string): Promise<string> => {
      const response = await input({ message: prompt });
      return response;
    },
    reportStatus: (status?: string): void => {
      if (status) {
        spinner.start(status);
      } else {
        spinner.succeed();
      }
    },
    requestCopilotAction: async (
      prompt: string,
      reason?: string,
    ): Promise<string> => {
      return askCopilot(prompt, reason);
    },
  };

  while (true) {
    const modules: Record<string, (ctx: typeof context) => Promise<void>> = {};
    for (const filename of await readdir("./src/tasks")) {
      if (filename.endsWith(".ts")) {
        const moduleName = filename.slice(0, -3);
        const module = await import(`./tasks/${moduleName}.js`);
        if (module.run && typeof module.run === "function") {
          modules[moduleName] = module.run;
        } else {
          console.warn(
            `Module ${moduleName} does not export a 'run' function, skipping.`,
          );
        }
      }
    }

    const choices = [
      ...Object.keys(modules).map((name) => ({ name, value: name })),
      { name: "Exit", value: "__exit__" },
    ];

    const selectedTask = await select({
      message: "Select a task to run:",
      choices,
    });
    if (selectedTask === "__exit__") {
      console.log("Goodbye");
      process.exit(0);
    }
    const task = modules[selectedTask];
    await task(context);
    console.log(`Task ${selectedTask} completed.`);
  }
}

main().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
