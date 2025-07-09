// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { readFile, writeFile, readdir } from "node:fs/promises";
import { select } from "@inquirer/prompts";
import { basename } from "node:path";

export interface TaskContext {
  /**
   * Request VS Code Copilot to perform the specified action in the form of a prompt. You may specify the schema of the output if necessary.
   * Copilot is good at performing tasks like updating files, generating text, or performing other actions that require understanding the context of the codebase.
   * It is also good at summarization.
   *
   * @param prompt - The prompt to send to Copilot.
   * @return - The response from Copilot as a string.
   */
  requestCopilotAction(prompt: string): Promise<string>;
}

export async function run(context: TaskContext): Promise<void> {
  // Read available task files
  const promptFiles = await readdir("tasks");
  const markdownFiles = promptFiles.filter((file) => file.endsWith(".md"));

  if (markdownFiles.length === 0) {
    throw new Error("No Markdown files found in the prompts directory");
  }

  // Let user select which file to compile
  const filename = await select({
    message: "Select a file to compile:",
    choices: markdownFiles.map((file) => ({
      name: file,
      value: file,
      description: `Compile ${file} to TypeScript`,
    })),
  });

  const content = await readFile(`prompts/${filename}`, "utf-8");
  const outputFilename = basename(filename, ".md") + ".ts";

  const typescript = await context.requestCopilotAction(`
Convert the input Markdown steps into an async TypeScript function that performs them.

The function should be named 'run' and return Promise<void>. It takes a single parameter 'context' which has the following properties and is defined above the function definition:

\`\`\`ts
export interface TaskContext {
  /**
   * Update status for the user.
   * Do this regularly.
   * 
   * You MUST ALWAYS clear the status by calling this with no arguments before you request user input.
   */
  reportStatus(status?: string): void;

  /**
   * Request VS Code Copilot to perform the specified action in the form of a prompt. You may specify the schema of the output if necessary. JSON is recommended, which you can then parse.
   * Copilot is good at performing tasks like updating, parsing, and summarizing files, generating text, or performing other actions that require understanding the context of the codebase.
   * It is also good at summarization.
   * 
   * @param prompt - The prompt to send to Copilot.
   * @param reason - A brief description of what is being requested to show to the user
   * @return - The response from Copilot as a string.
   */
  requestCopilotAction(prompt: string, reason?: string): Promise<string>;
}
\`\`\`

Any inputs should be requested from the user instead of being made function parameters using the @inquirer/prompts library. The function should not take any parameters other than 'context'.
NEVER use any other third-party libraries or frameworks. Node builtins are acceptable. Prefer async versions where available.
When running terminal commands, use the 'context.requestCopilotAction' method to run them. Do not use 'child_process' or similar libraries directly. Same with updating files. Be as specific as possible in the prompts to Copilot.
Both the function run and the TaskContext interface should be exported from the module.
Output the TypeScript source code only without Markdown code fences.

The instructions follow:
<instructionContent>
${content.trim()}
</instructionContent>
  `);

  await writeFile(`src/tasks/${outputFilename}`, typescript, "utf-8");
}
