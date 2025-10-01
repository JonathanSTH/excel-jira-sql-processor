import { exec } from "child_process";
import path from "path";

async function run(cmd: string, cwd: string): Promise<void> {
  return new Promise((resolve) => {
    exec(cmd, { cwd }, () => resolve());
  });
}

export default async function globalTeardown() {
  const projectRoot = path.resolve(__dirname, "..", "..");
  // Ensure all app servers are stopped after the test run
  await run("npm run --silent clear:servers", projectRoot);
}
