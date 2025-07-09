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

let waitForClientCallback: (action: CopilotAction) => void | undefined =
  undefined;
async function waitForClient(): Promise<CopilotAction> {
  if (waitForClientCallback) {
    throw new Error("Already waiting for client");
  }
  return new Promise<CopilotAction>((resolve) => {
    waitForClientCallback = (action) => {
      resolve(action);
      waitForClientCallback = undefined;
    };
  });
}

type CopilotAction =
  | {
      action: "exit";
    }
  | {
      action: "prompt";
      prompt: string;
    };

async function requestCopilotAction(action: CopilotAction): Promise<string> {
  waitForClientCallback?.(action);
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
      "The requested output, if any. For the first invocation, do not fill in this field.",
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
    const action = await waitForClient();

    if (action.action === "prompt") {
      return {
        content: [
          {
            type: "text",
            text: `Follow these instructions exactly: <instructions>\n\n${action.prompt}\n\n</instructions> and then call the copilot_conductor tool with the result.
        Do not output the result directly, but instead return it as the 'output' field in the next invocation of this tool.
        output "fail" and a short explanation of what went wrong. Do not attempt to fix the problem yourself unless the instructions explicitly say to do so.`,
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: "text",
            text: "Conductor mode completed successfully. You can now exit.",
          },
        ],
      };
    }
  },
);

const app = express();
app.use(express.json());

app.get("/health", (_, res) => res.status(204).send());

app.post("/copilot", async (req, res) => {
  const result = await requestCopilotAction({ action: "prompt", prompt: req.body.prompt });
  res.json({ output: result, success: true }).send();
});

app.post("/exit", async (_, res) => {
  requestCopilotAction({ action: "exit"});
  res.json({ success: true }).send();
});

export async function startServer(): Promise<void> {
  const transport = new StdioServerTransport();
  mcpServer.connect(transport);

  app.listen(4001, async () => {
    console.error("Web server started successfully on port 4001");
  });
}
