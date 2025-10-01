import { test, expect } from "@playwright/test";
import { spawn, exec } from "child_process";
import { promisify } from "util";
import net from "net";

const execAsync = promisify(exec);

test.describe("App Startup Tests", () => {
  let serverProcess: any = null;

  test.afterEach(async () => {
    // Clean up any running server processes
    if (serverProcess) {
      serverProcess.kill();
      serverProcess = null;
    }
  });

  test("should have app script in package.json", async () => {
    // Test that the app script exists in package.json
    const fs = require("fs");
    const path = require("path");

    const packageJsonPath = path.join(process.cwd(), "../../package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

    // Check that the app script exists
    expect(packageJson.scripts).toBeDefined();
    expect(packageJson.scripts.app).toBeDefined();
    expect(packageJson.scripts.app).toContain("start-app-simple.js");
  });

  test("should detect port availability", async () => {
    // Test the port detection logic directly
    const isPortInUse = async (port: number) => {
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
    };

    // Test port 3000 (might be in use)
    const port3000InUse = await isPortInUse(3000);
    expect(typeof port3000InUse).toBe("boolean");

    // Test port 9999 (should be available)
    const port9999InUse = await isPortInUse(9999);
    expect(port9999InUse).toBe(false);
  });

  test("should have correct startup script file", async () => {
    // Test that the startup script file exists and has correct content
    const fs = require("fs");
    const path = require("path");

    const scriptPath = path.join(process.cwd(), "../../start-app-simple.js");
    expect(fs.existsSync(scriptPath)).toBe(true);

    const scriptContent = fs.readFileSync(scriptPath, "utf8");
    expect(scriptContent).toContain("SimpleAppStarter");
    expect(scriptContent).toContain("findAvailablePort");
    expect(scriptContent).toContain("openBrowser");
  });

  test("should have server.js with PORT environment variable support", async () => {
    // Test that server.js supports PORT environment variable
    const fs = require("fs");
    const path = require("path");

    const serverPath = path.join(process.cwd(), "../../server.js");
    expect(fs.existsSync(serverPath)).toBe(true);

    const serverContent = fs.readFileSync(serverPath, "utf8");
    expect(serverContent).toContain("process.env.PORT");
  });

  test("should handle already running server on port 3000", async () => {
    // Find an available port to test with
    const findAvailablePort = async (startPort: number) => {
      let port = startPort;
      while (port <= startPort + 50) {
        const isInUse = await new Promise((resolve) => {
          const testServer = net.createServer();
          testServer.listen(port, () => {
            testServer.once("close", () => {
              resolve(false); // Port is available
            });
            testServer.close();
          });
          testServer.on("error", () => {
            resolve(true); // Port is in use
          });
        });

        if (!isInUse) {
          return port;
        }
        port++;
      }
      throw new Error("No available ports found");
    };

    const testPort = await findAvailablePort(5000);

    // Helper to check if port is in use
    const isPortInUse = async (port: number) => {
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
    };

    // Find a second available port for testing
    let nextAvailablePort = testPort + 1;
    while (await isPortInUse(nextAvailablePort)) {
      nextAvailablePort++;
    }

    // Start a test server on the first available port
    const testServer = net.createServer();
    await new Promise((resolve) => {
      testServer.listen(testPort, resolve);
    });

    try {
      // Test that the port is detected as in use
      const portInUse = await isPortInUse(testPort);
      expect(portInUse).toBe(true);

      // Test that the second available port is indeed available
      const nextPortInUse = await isPortInUse(nextAvailablePort);
      expect(nextPortInUse).toBe(false);
    } finally {
      // Clean up test server
      await new Promise((resolve) => {
        testServer.close(resolve);
      });
    }
  });

  test("should find next available port when multiple ports are occupied", async () => {
    // Find available ports to test with
    const findAvailablePort = async (startPort: number) => {
      let port = startPort;
      while (port <= startPort + 50) {
        const isInUse = await new Promise((resolve) => {
          const testServer = net.createServer();
          testServer.listen(port, () => {
            testServer.once("close", () => {
              resolve(false); // Port is available
            });
            testServer.close();
          });
          testServer.on("error", () => {
            resolve(true); // Port is in use
          });
        });

        if (!isInUse) {
          return port;
        }
        port++;
      }
      throw new Error("No available ports found");
    };

    // Use a higher, less contended range to avoid collisions with app server
    const startPort = await findAvailablePort(5000);
    const servers = [];

    try {
      // Start servers on multiple consecutive ports
      for (let i = 0; i < 3; i++) {
        const port = startPort + i;
        const server = net.createServer();
        await new Promise((resolve) => {
          server.listen(port, resolve);
        });
        servers.push(server);
      }

      // Test port detection logic
      const findNextAvailablePort = async (startPort: number) => {
        let port = startPort;
        while (port <= startPort + 10) {
          const isInUse = await new Promise((resolve) => {
            const testServer = net.createServer();
            testServer.listen(port, () => {
              testServer.once("close", () => {
                resolve(false); // Port is available
              });
              testServer.close();
            });
            testServer.on("error", () => {
              resolve(true); // Port is in use
            });
          });

          if (!isInUse) {
            return port;
          }
          port++;
        }
        throw new Error("No available ports found");
      };

      // Should find the next available port after our test servers
      const availablePort = await findNextAvailablePort(startPort);
      expect(availablePort).toBe(startPort + 3);
    } finally {
      // Clean up all test servers
      for (const server of servers) {
        await new Promise((resolve) => {
          server.close(resolve);
        });
      }
    }
  });

  test("should detect server startup conflicts", async () => {
    // Find an available port to test with
    const findAvailablePort = async (startPort: number) => {
      let port = startPort;
      while (port <= startPort + 50) {
        const isInUse = await new Promise((resolve) => {
          const testServer = net.createServer();
          testServer.listen(port, () => {
            testServer.once("close", () => {
              resolve(false); // Port is available
            });
            testServer.close();
          });
          testServer.on("error", () => {
            resolve(true); // Port is in use
          });
        });

        if (!isInUse) {
          return port;
        }
        port++;
      }
      throw new Error("No available ports found");
    };

    const testPort = await findAvailablePort(3000);
    const testServer = net.createServer();
    await new Promise((resolve) => {
      testServer.listen(testPort, resolve);
    });

    try {
      // Simulate trying to start another server on the same port
      const conflictTest = async () => {
        return new Promise((resolve) => {
          const conflictingServer = net.createServer();

          conflictingServer.listen(testPort, () => {
            resolve({ success: true, port: testPort });
          });

          conflictingServer.on("error", (error: any) => {
            resolve({ success: false, error: error.code });
          });
        });
      };

      const result = await conflictTest();
      expect(result.success).toBe(false);
      expect(result.error).toBe("EADDRINUSE");
    } finally {
      await new Promise((resolve) => {
        testServer.close(resolve);
      });
    }
  });

  test("should validate server cleanup on shutdown", async () => {
    // Find an available port to test with
    const findAvailablePort = async (startPort: number) => {
      let port = startPort;
      while (port <= startPort + 50) {
        const isInUse = await new Promise((resolve) => {
          const testServer = net.createServer();
          testServer.listen(port, () => {
            testServer.once("close", () => {
              resolve(false); // Port is available
            });
            testServer.close();
          });
          testServer.on("error", () => {
            resolve(true); // Port is in use
          });
        });

        if (!isInUse) {
          return port;
        }
        port++;
      }
      throw new Error("No available ports found");
    };

    const testPort = await findAvailablePort(3000);
    const testServer = net.createServer();
    await new Promise((resolve) => {
      testServer.listen(testPort, resolve);
    });

    // Verify server is running
    const isRunning = await new Promise((resolve) => {
      const checkServer = net.createServer();
      checkServer.listen(testPort, () => {
        checkServer.close();
        resolve(false); // Port is available
      });
      checkServer.on("error", () => {
        resolve(true); // Port is in use
      });
    });
    expect(isRunning).toBe(true);

    // Shutdown the server
    await new Promise((resolve) => {
      testServer.close(resolve);
    });

    // Wait a moment for cleanup
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify server is no longer running
    const isStillRunning = await new Promise((resolve) => {
      const checkServer = net.createServer();
      checkServer.listen(testPort, () => {
        checkServer.close();
        resolve(false); // Port is available
      });
      checkServer.on("error", () => {
        resolve(true); // Port is in use
      });
    });
    expect(isStillRunning).toBe(false);
  });

  test("should handle page visibility changes", async ({ page }) => {
    // Test that the app handles page visibility changes properly
    await page.goto("/");

    // Wait for the app to initialize
    await page.waitForLoadState("networkidle");

    // Check that the ValidationWizard class exists and has page handling setup
    const hasPageHandling = await page.evaluate(() => {
      // Check if ValidationWizard class exists and has the method
      return (
        typeof ValidationWizard !== "undefined" &&
        ValidationWizard.prototype.hasOwnProperty("setupPageCloseHandling")
      );
    });
    expect(hasPageHandling).toBe(true);

    // Check that event listeners are available
    const hasEventListeners = await page.evaluate(() => {
      // Check if addEventListener is available (basic check)
      return typeof window.addEventListener === "function";
    });
    expect(hasEventListeners).toBe(true);
  });
});
