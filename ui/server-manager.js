const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

class ServerManager {
  constructor() {
    this.serverProcess = null;
    this.port = null;
    this.pidFile = path.join(__dirname, ".server.pid");
  }

  async findAvailablePort(startPort = 3000) {
    const net = require("net");

    for (let port = startPort; port < startPort + 20; port++) {
      try {
        await new Promise((resolve, reject) => {
          const server = net.createServer();
          server.listen(port, () => {
            server.close();
            resolve(port);
          });
          server.on("error", reject);
        });
        return port;
      } catch (error) {
        // Port is in use, try next
        continue;
      }
    }
    throw new Error("No available ports found in range");
  }

  async isPortInUse(port) {
    const net = require("net");
    return new Promise((resolve) => {
      const server = net.createServer();
      server.listen(port, () => {
        server.close();
        resolve(false); // Port is available
      });
      server.on("error", () => {
        resolve(true); // Port is in use
      });
    });
  }

  async startServer() {
    try {
      // Check if server is already running
      if (await this.isServerAlreadyRunning()) {
        console.log("🔄 Server is already running, reusing existing instance");
        return this.port;
      }

      // Find available port
      this.port = await this.findAvailablePort();
      console.log(`🚀 Starting server on port ${this.port}`);

      // Start the server process
      this.serverProcess = spawn("node", ["server.js"], {
        cwd: __dirname,
        env: { ...process.env, PORT: this.port },
        stdio: "inherit",
      });

      // Save PID for later reference
      this.savePid();

      // Handle process events
      this.serverProcess.on("error", (error) => {
        console.error("❌ Server process error:", error);
        this.cleanup();
      });

      this.serverProcess.on("exit", (code) => {
        console.log(`🛑 Server process exited with code ${code}`);
        this.cleanup();
      });

      // Wait a moment for server to start
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log(
        `✅ Server started successfully on http://localhost:${this.port}`
      );
      console.log(`🔗 Open: http://localhost:${this.port}/index.html`);

      return this.port;
    } catch (error) {
      console.error("❌ Failed to start server:", error.message);
      throw error;
    }
  }

  async isServerAlreadyRunning() {
    // Check if PID file exists and process is running
    if (fs.existsSync(this.pidFile)) {
      try {
        const pid = parseInt(fs.readFileSync(this.pidFile, "utf8"));

        // Check if process is still running
        try {
          process.kill(pid, 0); // Signal 0 just checks if process exists
          this.port = await this.getPortFromProcess(pid);
          return true;
        } catch (error) {
          // Process doesn't exist, clean up PID file
          this.cleanupPid();
          return false;
        }
      } catch (error) {
        this.cleanupPid();
        return false;
      }
    }
    return false;
  }

  async getPortFromProcess(pid) {
    // Try to detect port from process (simplified approach)
    // In a real implementation, you might read from a config file
    return 3000; // Default fallback
  }

  savePid() {
    if (this.serverProcess && this.serverProcess.pid) {
      fs.writeFileSync(this.pidFile, this.serverProcess.pid.toString());
    }
  }

  cleanupPid() {
    if (fs.existsSync(this.pidFile)) {
      fs.unlinkSync(this.pidFile);
    }
  }

  async stopServer() {
    if (this.serverProcess) {
      console.log("🛑 Stopping server...");
      this.serverProcess.kill("SIGTERM");

      // Wait for graceful shutdown
      await new Promise((resolve) => {
        this.serverProcess.on("exit", resolve);
        setTimeout(resolve, 5000); // Force timeout after 5 seconds
      });

      this.cleanup();
    }
  }

  cleanup() {
    this.cleanupPid();
    this.serverProcess = null;
  }

  // Handle graceful shutdown
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
      await this.stopServer();
      process.exit(0);
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      console.error("❌ Uncaught Exception:", error);
      this.cleanup();
      process.exit(1);
    });
  }
}

module.exports = ServerManager;
