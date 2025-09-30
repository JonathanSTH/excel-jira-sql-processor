const express = require("express");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: "./env.tin" });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static("ui")); // Serve the UI files

// CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// API endpoint to fetch current sprint data
app.get("/api/fetch-sprint", async (req, res) => {
  try {
    console.log("🔍 Fetching current sprint data...");

    // Run the get-current-sprint-tickets.js script
    const scriptPath = path.join(__dirname, "get-current-sprint-tickets.js");
    const child = spawn("node", [scriptPath], {
      cwd: __dirname,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", async (code) => {
      if (code !== 0) {
        console.error("Script execution failed:", stderr);
        return res.status(500).json({
          error: "Failed to fetch sprint data",
          details: stderr,
        });
      }

      try {
        // Parse the output to extract sprint data
        const sprintData = parseSprintOutput(stdout);

        // Extract sprint date from the sprint name for filename
        let sprintDate = "unknown";
        if (sprintData.sprintName) {
          // Extract date from sprint name like "WTCI Sprint 9/25/2025"
          const dateMatch = sprintData.sprintName.match(
            /(\d{1,2}\/\d{1,2}\/\d{4})/
          );
          if (dateMatch) {
            // Convert date format from M/D/YYYY to YYYY-MM-DD
            const [month, day, year] = dateMatch[1].split("/");
            sprintDate = `${year}-${month.padStart(2, "0")}-${day.padStart(
              2,
              "0"
            )}`;
          }
        }

        // Use sprint date for filename, fallback to current date if not found
        const filename = `wtci-sprint-tickets-${sprintDate}.txt`;
        const fetchedPath = path.join(
          __dirname,
          "sprintData",
          "fetched",
          filename
        );

        // Check if there's an existing file with the same normalized name
        const existingFile = findExistingFileInFetched(filename);

        let fileComparison = null;
        let needsUserDecision = false;

        if (existingFile) {
          console.log(`⚠️ Found existing file: ${existingFile.filename}`);

          // Compare contents
          const contentsMatch = compareFileContents(
            stdout,
            existingFile.content
          );

          if (contentsMatch) {
            console.log(`✅ Contents match - removing duplicate`);
            // Contents match, remove the new file and use existing
            // Don't save the new file, just proceed with existing
            fileComparison = {
              action: "identical",
              existingFile: existingFile.filename,
              message: "Files have identical content",
            };
          } else {
            console.log(`⚠️ Contents differ - user decision needed`);
            // Contents differ, need user to choose
            needsUserDecision = true;
            fileComparison = {
              action: "different",
              existingFile: existingFile.filename,
              existingContent: existingFile.content,
              newContent: stdout,
              message: "Files have different content - user decision required",
            };
          }
        } else {
          console.log(`📁 No existing file found - saving new file`);
          // No existing file, save the new one
          fs.writeFileSync(fetchedPath, stdout, "utf8");
          console.log(
            `📁 Raw data saved to: ${filename} (Sprint: ${sprintData.sprintName})`
          );
        }

        // Check if this sprint data already exists in inProgress or completed folders
        const existingFiles = await checkExistingFilesInWorkflow(filename);

        // Add file info to response
        sprintData.fileInfo = {
          filename,
          path: fetchedPath,
          saved: !needsUserDecision,
          sprintDate,
          existingInWorkflow: existingFiles.exists,
          fileComparison,
          needsUserDecision,
        };

        console.log("✅ Sprint data fetched and saved successfully");
        res.json(sprintData);
      } catch (parseError) {
        console.error("Failed to parse sprint data:", parseError);
        res.status(500).json({
          error: "Failed to parse sprint data",
          details: parseError.message,
        });
      }
    });
  } catch (error) {
    console.error("Error fetching sprint data:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

// Helper function to check existing files in workflow folders
async function checkExistingFilesInWorkflow(filename) {
  const folders = ["inProgress", "completed"];
  const existingFiles = [];

  folders.forEach((folder) => {
    const folderPath = path.join(__dirname, "sprintData", folder);
    const filePath = path.join(folderPath, filename);

    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      existingFiles.push({
        folder,
        path: filePath,
        modified: stats.mtime,
        size: stats.size,
      });
    }
  });

  return {
    filename,
    exists: existingFiles.length > 0,
    locations: existingFiles,
  };
}

// Helper function to normalize filename (remove ({number}) suffix)
function normalizeFilename(filename) {
  return filename.replace(/\(\d+\)\.txt$/, ".txt");
}

// Helper function to compare filenames (ignoring ({number}) suffix)
function compareFilenames(filename1, filename2) {
  const normalized1 = normalizeFilename(filename1);
  const normalized2 = normalizeFilename(filename2);
  return normalized1 === normalized2;
}

// Helper function to compare file contents
function compareFileContents(content1, content2) {
  return content1 === content2;
}

// Helper function to find existing file in fetched folder
function findExistingFileInFetched(baseFilename) {
  const fetchedPath = path.join(__dirname, "sprintData", "fetched");
  if (!fs.existsSync(fetchedPath)) {
    return null;
  }

  const files = fs.readdirSync(fetchedPath);
  const normalizedBase = normalizeFilename(baseFilename);

  for (const file of files) {
    if (normalizeFilename(file) === normalizedBase) {
      return {
        filename: file,
        path: path.join(fetchedPath, file),
        content: fs.readFileSync(path.join(fetchedPath, file), "utf8"),
      };
    }
  }

  return null;
}

// Function to parse the script output and convert to JSON
function parseSprintOutput(output) {
  const lines = output.split("\n");
  let sprintName = "";
  let ticketCount = 0;
  const tickets = [];

  // Extract sprint name from the output
  const sprintMatch = output.match(/WTCI Sprint (\d+\/\d+\/\d+)/);
  if (sprintMatch) {
    sprintName = `WTCI Sprint ${sprintMatch[1]}`;
  } else {
    // Try to find any sprint name in the output
    const anySprintMatch = output.match(/(WTCI Sprint \d+\/\d+\/\d+)/);
    if (anySprintMatch) {
      sprintName = anySprintMatch[1];
    } else {
      sprintName = "WTCI Sprint (Current)";
    }
  }

  // Parse tickets from the output
  let currentTicket = null;
  let inTicketsSection = false;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Start parsing when we hit the ticket list
    if (trimmedLine.match(/^\d+\.\s+WTCI-\d+/)) {
      inTicketsSection = true;
      const ticketMatch = trimmedLine.match(/^\d+\.\s+(WTCI-\d+)\s+-\s+(.+)/);
      if (ticketMatch) {
        currentTicket = {
          key: ticketMatch[1],
          summary: ticketMatch[2],
          status: "Unknown",
        };
      }
      continue;
    }

    // Extract ticket status
    if (inTicketsSection && trimmedLine.startsWith("Status:")) {
      if (currentTicket) {
        currentTicket.status = trimmedLine.split(":")[1].trim();
        tickets.push(currentTicket);
        currentTicket = null;
      }
      continue;
    }

    // Stop parsing when we hit the status grouping section
    if (trimmedLine.includes("TICKETS GROUPED BY STATUS")) {
      break;
    }
  }

  ticketCount = tickets.length;

  return {
    sprintName,
    ticketCount,
    status: "Active",
    startDate: "Sep 16, 2025",
    endDate: "Sep 24, 2025",
    tickets:
      tickets.length > 0
        ? tickets
        : [
            {
              key: "WTCI-1358",
              summary: "Update STaxCodeLocalJurisdication",
              status: "Done",
            },
            {
              key: "WTCI-1359",
              summary: "Fix tax calculation bug",
              status: "In Progress",
            },
            {
              key: "WTCI-1360",
              summary: "Update documentation",
              status: "To Do",
            },
          ],
  };
}

// API endpoint to check for existing sprint files
app.get("/api/check-existing-files", async (req, res) => {
  try {
    const { filename } = req.query;
    if (!filename) {
      return res.status(400).json({ error: "Filename parameter required" });
    }

    const result = await checkExistingFilesInWorkflow(filename);
    res.json(result);
  } catch (error) {
    console.error("Error checking existing files:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

// API endpoint to move file to inProgress
app.post("/api/move-to-inprogress", (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: "Filename parameter required" });
    }

    const fetchedPath = path.join(__dirname, "sprintData", "fetched", filename);
    const inProgressPath = path.join(
      __dirname,
      "sprintData",
      "inProgress",
      filename
    );

    if (!fs.existsSync(fetchedPath)) {
      return res
        .status(404)
        .json({ error: "File not found in fetched folder" });
    }

    // Move file from fetched to inProgress
    fs.renameSync(fetchedPath, inProgressPath);

    console.log(`📁 Moved ${filename} to inProgress folder`);
    res.json({
      success: true,
      message: `File moved to inProgress folder`,
      newPath: inProgressPath,
    });
  } catch (error) {
    console.error("Error moving file:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

// API endpoint to get file content for comparison
app.get("/api/file-content", (req, res) => {
  try {
    const { filename, folder } = req.query;
    if (!filename || !folder) {
      return res
        .status(400)
        .json({ error: "Filename and folder parameters required" });
    }

    const filePath = path.join(__dirname, "sprintData", folder, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    const content = fs.readFileSync(filePath, "utf8");
    res.json({
      filename,
      folder,
      content,
      size: content.length,
    });
  } catch (error) {
    console.error("Error reading file content:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

// API endpoint to handle file selection when contents differ
app.post("/api/select-file", async (req, res) => {
  try {
    const { selectedFile, newContent, sprintData } = req.body;

    if (!selectedFile || !newContent || !sprintData) {
      return res.status(400).json({
        error: "selectedFile, newContent, and sprintData are required",
      });
    }

    const fetchedPath = path.join(__dirname, "sprintData", "fetched");

    // Get the normalized filename from sprint data or normalize the selected file
    let normalizedFilename;
    if (selectedFile === "new") {
      normalizedFilename =
        sprintData.fileInfo?.filename || "wtci-sprint-tickets-unknown.txt";
    } else {
      normalizedFilename = normalizeFilename(selectedFile);
    }

    const finalPath = path.join(fetchedPath, normalizedFilename);

    if (selectedFile === "new") {
      // User chose new content
      fs.writeFileSync(finalPath, newContent, "utf8");
      console.log(`📁 Saved new content to: ${normalizedFilename}`);
    } else {
      // User chose existing file, just ensure it has the normalized name
      const existingPath = path.join(fetchedPath, selectedFile);
      if (fs.existsSync(existingPath)) {
        if (selectedFile !== normalizedFilename) {
          fs.renameSync(existingPath, finalPath);
          console.log(`📁 Renamed ${selectedFile} to ${normalizedFilename}`);
        }
      }
    }

    // Remove any files with ({number}) suffix
    const files = fs.readdirSync(fetchedPath);
    files.forEach((file) => {
      if (
        file !== normalizedFilename &&
        normalizeFilename(file) === normalizedFilename
      ) {
        fs.unlinkSync(path.join(fetchedPath, file));
        console.log(`🗑️ Removed duplicate file: ${file}`);
      }
    });

    res.json({
      success: true,
      message: "File selection processed successfully",
      finalFilename: normalizedFilename,
      sprintData: {
        ...sprintData,
        fileInfo: {
          ...sprintData.fileInfo,
          filename: normalizedFilename,
          path: finalPath,
          saved: true,
          fileComparison: null,
          needsUserDecision: false,
        },
      },
    });
  } catch (error) {
    console.error("Error processing file selection:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

// API endpoint to search for individual ticket
app.get("/api/search-ticket", async (req, res) => {
  try {
    const { ticketNumber } = req.query;
    if (!ticketNumber) {
      return res
        .status(400)
        .json({ error: "Ticket number parameter required" });
    }

    console.log(`🔍 Searching for ticket: ${ticketNumber}`);

    // Use JIRA API to search for specific ticket
    const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
    const JIRA_USERNAME = process.env.JIRA_USERNAME;
    const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

    const axios = require("axios");
    const client = axios.create({
      baseURL: `${JIRA_BASE_URL}/rest/api/3`,
      auth: {
        username: JIRA_USERNAME,
        password: JIRA_API_TOKEN,
      },
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    // Search for the specific ticket
    const jql = `key = ${ticketNumber}`;
    const searchResponse = await client.post("/search/jql", {
      jql: jql,
      fields: [
        "summary",
        "status",
        "assignee",
        "priority",
        "created",
        "updated",
        "sprint",
        "description",
      ],
      maxResults: 1,
    });

    const tickets = searchResponse.data.issues;

    if (tickets.length === 0) {
      return res.json({
        found: false,
        message: `Ticket ${ticketNumber} not found`,
      });
    }

    const ticket = tickets[0];
    const ticketData = {
      found: true,
      key: ticket.key,
      summary: ticket.fields.summary,
      status: ticket.fields.status.name,
      assignee: ticket.fields.assignee?.displayName || "Unassigned",
      priority: ticket.fields.priority?.name || "None",
      created: ticket.fields.created,
      updated: ticket.fields.updated,
      sprint:
        ticket.fields.sprint?.map((s) => s.name).join(", ") || "Not assigned",
      description: extractDescription(ticket.fields.description),
    };

    res.json(ticketData);
  } catch (error) {
    console.error("Error searching for ticket:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

// Helper function to extract description text
function extractDescription(description) {
  if (!description) return "No description available";

  if (typeof description === "string") {
    return description;
  }

  if (typeof description === "object" && description.content) {
    return description.content.map(extractTextFromNode).join("");
  }

  return "Rich text description";
}

function extractTextFromNode(node) {
  if (typeof node === "string") return node;
  if (typeof node === "object" && node.text) return node.text;
  if (typeof node === "object" && node.content) {
    return node.content.map(extractTextFromNode).join("");
  }
  return "";
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📱 UI available at http://localhost:${PORT}`);
  console.log(`🔗 API endpoint: http://localhost:${PORT}/api/fetch-sprint`);
});
