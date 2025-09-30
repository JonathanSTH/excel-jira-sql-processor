const express = require("express");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the ui directory
app.use(express.static(path.join(__dirname)));

// API endpoint to fetch sprint tickets
app.get("/api/fetch-sprint", (req, res) => {
  console.log("🚀 Fetching sprint tickets...");

  // Run the get-current-sprint-tickets.js script
  exec(
    "node ../get-current-sprint-tickets.js",
    { cwd: __dirname },
    (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Error:", error);
        return res.status(500).json({
          success: false,
          error: error.message,
        });
      }

      if (stderr) {
        console.error("⚠️ Stderr:", stderr);
      }

      console.log("✅ Script output:", stdout);

      // Try to read the generated file
      const today = new Date().toISOString().split("T")[0];
      const filename = `../sprintData/fetched/wtci-sprint-tickets-${today}.txt`;

      try {
        if (fs.existsSync(filename)) {
          const fileContent = fs.readFileSync(filename, "utf8");
          res.json({
            success: true,
            data: fileContent,
            output: stdout,
          });
        } else {
          res.json({
            success: true,
            data: "No file generated",
            output: stdout,
          });
        }
      } catch (fileError) {
        console.error("❌ File read error:", fileError);
        res.status(500).json({
          success: false,
          error: "Could not read generated file",
        });
      }
    }
  );
});

// API endpoint to check if sprint data exists
app.get("/api/check-data", (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const filename = `../sprintData/fetched/wtci-sprint-tickets-${today}.txt`;

  const exists = fs.existsSync(filename);
  res.json({
    exists,
    filename: exists ? filename : null,
  });
});

// API endpoint to get all sprint files in inProgress folder
app.get("/api/sprint-files", (req, res) => {
  const inProgressDir = "../sprintData/inProgress";

  try {
    if (!fs.existsSync(inProgressDir)) {
      return res.json({ files: [] });
    }

    const files = fs
      .readdirSync(inProgressDir)
      .filter(
        (file) => file.endsWith(".txt") && file.includes("wtci-sprint-tickets")
      )
      .map((file) => {
        const filePath = path.join(inProgressDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          path: filePath,
          size: stats.size,
          modified: stats.mtime,
          date:
            file.match(/wtci-sprint-tickets-(\d{4}-\d{2}-\d{2})/)?.[1] ||
            "Unknown",
        };
      })
      .sort((a, b) => new Date(b.modified) - new Date(a.modified)); // Sort by most recent first

    res.json({ files });
  } catch (error) {
    console.error("❌ Error reading sprint files:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// API endpoint to load a specific sprint file
app.get("/api/load-sprint-file", (req, res) => {
  const { filename } = req.query;

  if (!filename) {
    return res.status(400).json({
      success: false,
      error: "Filename parameter is required",
    });
  }

  const filePath = path.join("../sprintData/inProgress", filename);

  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: "File not found",
      });
    }

    const fileContent = fs.readFileSync(filePath, "utf8");
    res.json({
      success: true,
      data: fileContent,
      filename: filename,
    });
  } catch (error) {
    console.error("❌ Error reading sprint file:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

// Shutdown endpoint
app.post("/api/shutdown", (req, res) => {
  console.log("🛑 Shutdown requested from client");
  res.json({
    status: "shutdown_initiated",
    message: "Server will shutdown in 2 seconds",
  });

  // Give client time to receive response, then shutdown
  setTimeout(() => {
    console.log("🛑 Graceful shutdown initiated by client");
    gracefulShutdown("client_request");
  }, 2000);
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
  server.close(() => {
    console.log("✅ Server closed successfully");
    process.exit(0);
  });

  // Force close after 5 seconds
  setTimeout(() => {
    console.log("⚠️ Forcing server shutdown");
    process.exit(1);
  }, 5000);
};

// Start the server with port conflict handling
const server = app
  .listen(PORT, () => {
    console.log(`🌐 Server running at http://localhost:${PORT}`);
    console.log(`📁 Serving files from: ${__dirname}`);
    console.log(`🔗 Open: http://localhost:${PORT}/index.html`);
    console.log(`💚 Health check: http://localhost:${PORT}/api/health`);
  })
  .on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`❌ Port ${PORT} is already in use`);
      console.log(`💡 Try one of these solutions:`);
      console.log(
        `   1. Kill the process using port ${PORT}: netstat -ano | findstr :${PORT}`
      );
      console.log(`   2. Use a different port: PORT=3001 node server.js`);
      console.log(`   3. Use the server manager: node server-manager.js`);
    } else {
      console.error("❌ Server error:", error);
    }
    process.exit(1);
  });

// Handle graceful shutdown
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  gracefulShutdown("uncaughtException");
});
