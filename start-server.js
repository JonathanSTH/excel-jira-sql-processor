#!/usr/bin/env node

const { exec } = require("child_process");
const path = require("path");

console.log("🚀 Starting JIRA-SQL Validation Wizard Server...");
console.log("📁 Working directory:", process.cwd());

// Start the Express server
const serverProcess = exec("node ui/server.js", (error, stdout, stderr) => {
  if (error) {
    console.error("❌ Server error:", error);
    return;
  }
  if (stderr) {
    console.error("⚠️ Server stderr:", stderr);
  }
  console.log("📊 Server output:", stdout);
});

serverProcess.stdout.on("data", (data) => {
  console.log(data.toString());
});

serverProcess.stderr.on("data", (data) => {
  console.error(data.toString());
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down server...");
  serverProcess.kill();
  process.exit(0);
});

console.log(
  "✅ Server started! Open http://localhost:3000/index.html in your browser"
);
