import ora from "ora";
import * as inquirerPrompts from "@inquirer/prompts";
import fs from "fs/promises";
import { runCompile } from "./compile-task.js";

const spinner = ora();

export async function startClient() {
  spinner.start("Connecting to MCP server");
  while (true) {
    try {
      await fetch("http://localhost:4001/health");
      break;
    } catch {
      // If the server is not yet running, wait a bit and try again
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  spinner.succeed("MCP server connected");

  await fs.mkdir(`./.conductor/tasks`, { recursive: true });
  await fs.mkdir(`./.conductor/compiled`, { recursive: true });

  const context = {
    requestUserInput: async (prompt: string): Promise<string> => {
      const response = await inquirerPrompts.input({ message: prompt });
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
      spinner.start(`Copilot: ${reason ?? "requesting action"}`);
      const rsp = await fetch("http://localhost:4001/copilot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });
      spinner.succeed();
      return (await rsp.json()).output as string;
    },
    inquirerPrompts,
  };

  while (true) {
    const modules: Record<string, (ctx: typeof context) => Promise<void>> = {};

    const root = process.cwd();
    const promptFiles = await fs.readdir(`${root}/.conductor/compiled`);
    for (const filename of promptFiles) {
      if (filename.endsWith(".js") || filename.endsWith(".ts")) {
        const moduleName = filename.slice(0, -3);
        const module = await import(
          `${root}/.conductor/compiled/${moduleName}.js`
        );
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
      { name: "Compile", value: "__compile__" },
      { name: "Exit", value: "__exit__" },
    ];

    const selectedTask = await inquirerPrompts.select({
      message: "Select a task to run:",
      choices,
    });
    if (selectedTask === "__exit__") {
      spinner.start("Ending session");
      await fetch("http://localhost:4001/exit", {
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({}),
      });

      spinner.succeed("Session ended -- goodbye!");

      process.exit(0);
    }

    const task =
      selectedTask === "__compile__" ? runCompile : modules[selectedTask];
    await task(context);
    spinner.succeed(`Task ${selectedTask} completed.`);
  }
}
