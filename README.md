# 🐑 copilot-conductor

copilot-conductor is a command-line utility to help build and manage in-repository automation workflows that engage an AI agent like GitHub Copilot in Visual Studio Code.

## Concepts

### Inversion of control

Conductor scripts, through the CLI harness, are able to interface with Copilot or any other MCP-equipped tool, to perform specific subtasks as needed. This approach _inverts control_: a compiled, deterministic script instructs the agent what to do specifically, instead of giving Copilot the entire workflow and having it run amok and just _hoping_ it calls the right tools at the right time. This inverted approach mitigates a number of limitations that coding agents have:
- Agents are unreliable at following a series of steps. By inverting the control, the conductor program only invokes Copilot when necessary, and only feeds Copilot one step at a time. This means that it is no longer Copilot's responsibility to follow the steps, increasing reliability massively.
- Agents have a limited context window. Providing a long set of instructions to the agent can be problematic, leading to the agent forgetting earlier instructions and going in circles or on tangents. Since the conductor program takes care of orchestrating the steps, the instructions provided to Copilot for each specific subtask can be richer and more detailed, improving the quality of the output.

### Conductor scripts

Each workflow is implemented as a "conductor script", which are generally "compiled" from a Markdown file describing the workflow. Conductor scripts are able to request Copilot perform tasks (e.g. update a file or run a terminal command), so they still have access to the full power of the LLM when useful. They are also able to ask the user for input.

### Prompt compilation

The conductor program lets you define tasks in natural language Markdown form, which is then compiled (using Copilot) into a TypeScript conductor script. After compilation, scripts can be edited manually to improve them. Generally, Copilot does a great job at this conversion, and once compiled the script can be run again and again deterministically. Compilation is actually implemented as a conductor script itself, which guides Copilot through the compilation process and makes sure the compiled output is written to the right place.

## Project structure

### `tasks/`

This folder contains Markdown descriptions of workflows to be automated with the help of Copilot. Workflows can be compiled into TypeScript using the `compile-task` option when running the CLI. Once compiled,


### `src/tasks`

This folder contains the compiled tasks once they're compiled using the tool.

## Getting started

Install all dependencies:

```bash
npm i
```
Then, start the CLI with

```bash
npm run start
```

The conductor program will listen on TCP port 4001 for a connection (I couldn't be bothered trying to get HTTP transport to work but this is a TODO); add the server to your project's `mcp.json`:

```jsonc
{
  "servers": {
    "shepherd": {
      "type": "stdio",
      "command": "curl", // or netcat/nc if this doesn't work
      "args": ["telnet://localhost:4001"] // (if using netcat/nc, `["localhost", "4001"]`)
    }
  }
}
```

Then, tell Copilot (in the chat window) to call the `copilot_conductor` tool and you should be ready to go. Interact with the CLI to get things moving, and hit Continue when asked in the chat window.