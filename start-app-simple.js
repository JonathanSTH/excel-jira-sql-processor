#!/usr/bin/env node

/**
 * Simple App Starter - Reliable startup without Windows command issues
 */

const { spawn } = require("child_process");
const net = require("net");
const path = require("path");

class SimpleAppStarter {
  constructor() {
    this.serverProcess = null;
    this.port = 3000;
  }

  async isPortInUse(port) {
    return new Promise((resolve) => {
      const server = net.createServer();

      server.listen(port, () => {
        server.once("close", () => {
          resolve(false); // Port is available
        });
        server.close();
      });

      server.on("error", () => {
        resolve(true); // Port is in use
      });
    });
  }

  async findAvailablePort() {
    let port = this.port;

    while (await this.isPortInUse(port)) {
      port++;
      if (port > 3010) {
        throw new Error("No available ports found (3000-3010)");
      }
    }

    return port;
  }

  async openBrowser(port) {
    const url = `http://localhost:${port}`;
    console.log(`🌐 Opening browser to: ${url}`);

    try {
      // Try to open browser (Windows)
      const { spawn } = require("child_process");
      spawn("cmd", ["/c", "start", url], { detached: true, stdio: "ignore" });
      console.log("✅ Browser opened successfully");
    } catch (error) {
      console.log("⚠️ Could not automatically open browser");
      console.log(`🔗 Please manually open: ${url}`);
    }
  }

  async startServer() {
    try {
      console.log("🚀 Starting JIRA-SQL Validation App...");

      // Find available port
      this.port = await this.findAvailablePort();
      console.log(`📡 Using port: ${this.port}`);

      // Start the ROOT server.js (not ui/server.js)
      this.serverProcess = spawn("node", ["server.js"], {
        cwd: __dirname,
        env: { ...process.env, PORT: this.port },
        stdio: "inherit",
      });

      // Handle process events
      this.serverProcess.on("error", (error) => {
        console.error("❌ Server process error:", error);
        process.exit(1);
      });

      this.serverProcess.on("exit", (code) => {
        console.log(`🛑 Server process exited with code ${code}`);
        process.exit(code);
      });

      // Wait for server to start
      console.log("⏳ Waiting for server to start...");
      await new Promise((resolve) => setTimeout(resolve, 3000));

      console.log(`✅ Server started successfully!`);
      console.log(`🌐 Server running at http://localhost:${this.port}`);
      console.log(
        `🔗 UI available at http://localhost:${this.port}/ui/index.html`
      );
      console.log(`💚 Health check: http://localhost:${this.port}/api/health`);
      console.log(`\n💡 Press Ctrl+C to stop the server`);

      // Open browser unless disabled for automated tests
      if (process.env.NO_OPEN !== "1") {
        await this.openBrowser(this.port);
      } else {
        console.log(
          "🕵️ Running in NO_OPEN mode - not opening a browser window"
        );
      }

      // Keep the process alive
      return new Promise(() => {}); // Never resolves, keeps process running
    } catch (error) {
      console.error("❌ Failed to start server:", error.message);
      process.exit(1);
    }
  }

  setupGracefulShutdown() {
    // Handle Ctrl+C
    process.on("SIGINT", () => {
      console.log("\n🛑 Received SIGINT, shutting down gracefully...");
      if (this.serverProcess && !this.serverProcess.killed) {
        this.serverProcess.kill("SIGTERM");
      }
      process.exit(0);
    });

    // Handle termination
    process.on("SIGTERM", () => {
      console.log("\n🛑 Received SIGTERM, shutting down gracefully...");
      if (this.serverProcess && !this.serverProcess.killed) {
        this.serverProcess.kill("SIGTERM");
      }
      process.exit(0);
    });
  }
}

// Main execution
async function main() {
  const starter = new SimpleAppStarter();

  // Setup graceful shutdown handlers
  starter.setupGracefulShutdown();

  try {
    await starter.startServer();
  } catch (error) {
    console.error("❌ Failed to start application:", error.message);
    process.exit(1);
  }
}

// Run the application
if (require.main === module) {
  main();
}

module.exports = SimpleAppStarter;
