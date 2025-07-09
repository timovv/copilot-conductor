import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import express from "express";
import z from "zod";
import fs from "fs/promises";

let waitForCopilotCallback: ((output?: string) => void) | undefined = undefined;
async function waitForCopilot(): Promise<string | undefined> {
  if (waitForCopilotCallback) {
    throw new Error("Already waiting for Copilot");
  }
  return new Promise<string | undefined>((resolve) => {
    waitForCopilotCallback = (out) => {
      resolve(out);
      waitForCopilotCallback = undefined;
    };
  });
}

let waitForClientCallback: (prompt: string) => void | undefined = undefined;
async function waitForClient(): Promise<string> {
  if (waitForClientCallback) {
    throw new Error("Already waiting for client");
  }
  return new Promise<string>((resolve) => {
    waitForClientCallback = (prompt) => {
      resolve(prompt);
      waitForClientCallback = undefined;
    };
  });
}

async function requestCopilotAction(prompt: string): Promise<string> {
  waitForClientCallback?.(prompt);
  return await waitForCopilot();
}

const mcpServer = new McpServer({
  name: "Agent Companion CLI",
  version: "1.0.0-beta.1",
});

const CopilotConductorSchema = z.object({
  output: z
    .string()
    .optional()
    .describe(
      "The requested output, if any. For the first invocation, leave this empty.",
    ),
});

mcpServer.tool(
  "copilot_conductor",
  "Copilot conductor connection. Follow all steps by this tool. Call this tool with no arguments if the user asks to enter 'conductor mode'.",
  CopilotConductorSchema.shape,
  async (args) => {
    if (args.output === undefined) {
      return {
        content: [
          {
            type: "text",
            text: "Run `copilot-conductor --client` in a background terminal and then call the copilot_conductor tool indicating a successful result.",
          },
        ],
      };
    }

    waitForCopilotCallback?.(args.output);
    const prompt = await waitForClient();
    return {
      content: [
        {
          type: "text",
          text: `Follow these instructions exactly: <instructions>\n\n${prompt}\n\n</instructions> and then call the copilot_conductor tool with the result.
        Do not output the result directly, but instead return it as the 'output' field in the next invocation of this tool.
        output "fail" and a short explanation of what went wrong. Do not attempt to fix the problem yourself unless the instructions explicitly say to do so.`,
        },
      ],
    };
  },
);

const app = express();
app.use(express.json());

app.get("/health", (_, res) => res.status(204).send());

app.post("/copilot", async (req, res) => {
  const { prompt } = req.body;
  console.error(
    `Received request to run Copilot with prompt: ${prompt.substring(100)}...`,
  );
  const result = await requestCopilotAction(prompt);
  console.error(
    `Filled request to run Copilot with prompt: ${prompt.substring(100)}...`,
  );
  res.json({ output: result, success: true }).send();
});

export async function startServer(): Promise<void> {
  const transport = new StdioServerTransport();
  mcpServer.connect(transport);

  app.listen(4001, async () => {
    console.error("Web server started successfully on port 4001");
  });
}
