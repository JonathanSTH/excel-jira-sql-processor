#!/usr/bin/env node

const { spawn } = require("child_process");
const net = require("net");

class SmartServerStarter {
  constructor() {
    this.startPort = 3000;
    this.maxPorts = 20;
  }

  async findAvailablePort(startPort = this.startPort) {
    for (let port = startPort; port < startPort + this.maxPorts; port++) {
      if (await this.isPortAvailable(port)) {
        return port;
      }
    }
    throw new Error(
      `No available ports found in range ${startPort}-${
        startPort + this.maxPorts - 1
      }`
    );
  }

  async isPortAvailable(port) {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.listen(port, () => {
        server.close();
        resolve(true);
      });
      server.on("error", () => {
        resolve(false);
      });
    });
  }

  async isServerRunning(port) {
    try {
      const response = await fetch(`http://localhost:${port}/api/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  openBrowser(port) {
    // Skip auto-opening if disabled via environment variable
    if (
      process.env.NO_BROWSER === "true" ||
      process.env.CI ||
      process.env.GITHUB_ACTIONS
    ) {
      console.log(
        `🔗 Browser auto-opening disabled. Open manually: http://localhost:${port}/index.html`
      );
      return;
    }

    const url = `http://localhost:${port}/index.html`;
    const { exec } = require("child_process");

    console.log(`🌐 Opening browser to ${url}...`);

    // Try different commands based on the platform
    const commands = {
      win32: `start ${url}`,
      darwin: `open ${url}`,
      linux: `xdg-open ${url}`,
    };

    const command = commands[process.platform] || `open ${url}`;

    exec(command, (error) => {
      if (error) {
        console.log(
          `⚠️ Could not open browser automatically: ${error.message}`
        );
        console.log(`🔗 Please manually open: ${url}`);
      } else {
        console.log(`✅ Browser opened successfully!`);
      }
    });
  }

  async startServer() {
    try {
      // Check if server is already running on default port
      if (await this.isServerRunning(this.startPort)) {
        console.log(`✅ Server is already running on port ${this.startPort}`);
        console.log(`🔗 Open: http://localhost:${this.startPort}/index.html`);
        return this.startPort;
      }

      // Find available port
      const port = await this.findAvailablePort();

      console.log(`🚀 Starting server on port ${port}...`);

      // Start the server with the found port
      const serverProcess = spawn("node", ["server.js"], {
        cwd: __dirname,
        env: { ...process.env, PORT: port },
        stdio: "inherit",
      });

      // Handle process events
      serverProcess.on("error", (error) => {
        console.error("❌ Failed to start server:", error.message);
        process.exit(1);
      });

      serverProcess.on("exit", (code) => {
        if (code !== 0) {
          console.log(`🛑 Server exited with code ${code}`);
        }
      });

      // Wait for server to start
      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log(`✅ Server started successfully!`);
      console.log(`🌐 Server running at http://localhost:${port}`);
      console.log(`🔗 Open: http://localhost:${port}/index.html`);
      console.log(`💚 Health check: http://localhost:${port}/api/health`);
      console.log(`\n💡 Press Ctrl+C to stop the server`);

      // Automatically open the browser
      this.openBrowser(port);

      // Handle graceful shutdown
      process.on("SIGINT", () => {
        console.log("\n🛑 Shutting down server...");
        serverProcess.kill("SIGTERM");
        process.exit(0);
      });

      return port;
    } catch (error) {
      console.error("❌ Failed to start server:", error.message);
      process.exit(1);
    }
  }
}

// Start the server
const starter = new SmartServerStarter();
starter.startServer().catch(console.error);
