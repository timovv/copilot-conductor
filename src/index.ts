#!/usr/bin/env -S npx tsx

import { startClient } from "./client.js";
import { startServer } from "./server.js";

async function main() {
  if (process.argv[process.argv.length - 1] === "--client") {
    await startClient();
  } else {
    await startServer();
  }
}

main().catch((error) => {
  console.error("Fatal error running application:", error);
  process.exit(1);
});
