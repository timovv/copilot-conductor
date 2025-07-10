# 🐑 copilot-conductor

copilot-conductor is a command-line utility to help build and manage in-repository automation workflows that engage an AI agent like GitHub Copilot in Visual Studio Code.

## Concepts

### Inversion of control

Conductor scripts, through the CLI harness, are able to interface with Copilot or any other MCP-equipped tool, to perform specific subtasks as needed. This approach _inverts control_: a compiled, deterministic script instructs the agent what to do specifically, instead of giving Copilot the entire workflow and having it run amok and just _hoping_ it calls the right tools at the right time. This inverted approach mitigates a number of limitations that coding agents have:
- Agents are unreliable at following a series of steps. By inverting the control, the conductor program only invokes Copilot when necessary, and only feeds Copilot one step at a time. This means that it is no longer Copilot's responsibility to follow the steps, increasing reliability massively.
- Agents have a limited context window. Providing a long set of instructions to the agent can be problematic, leading to the agent forgetting earlier instructions and going in circles or on tangents. Since the conductor program takes care of orchestrating the steps, the instructions provided to Copilot for each specific subtask can be richer and more detailed, improving the quality of the output.

### Conductor tasks

Each workflow is implemented as a "conductor task", which are generally "compiled" from a Markdown file describing the workflow. Conductor tasks are able to request Copilot perform subtasks (e.g. update a file or run a terminal command), so they still have access to the full power of the LLM when useful. They are also able to ask the user for input.

Uncompiled Markdown scripts are located in `.conductor/tasks`, while their compiled equivalents are in `.conductor/scripts`, relative to the project root.

### Prompt compilation

The conductor program lets you define tasks in natural language Markdown form, which is then compiled (using Copilot) into a TypeScript conductor script. After compilation, scripts can be edited manually to improve them. Generally, Copilot does a great job at this conversion, and once compiled the script can be run again and again deterministically. Compilation is actually implemented as a conductor script itself, which guides Copilot through the compilation process and makes sure the compiled output is written to the right place.

## Project structure

### `tasks/`

This folder contains some example tasks.

### `src/`

Contains the source code for the client, server and the compile task tool.

## Getting started

Install all dependencies, build, and link to your environment:

```bash
npm install
npm run build
npm link
```

Add the server to your project's `mcp.json`:

```jsonc
{
  "servers": {
    "conductor": {
      "type": "stdio",
      "command": "copilot-conductor",
      "cwd": "${workspaceFolder}" // (or wherever the .conductor folder with your scripts lies)
    }
  }
}
```

Then, tell Copilot (in the chat window) to "enter conductor mode" and it will kick off the client in the background for you. You can interact with the UI to start and compile tasks.