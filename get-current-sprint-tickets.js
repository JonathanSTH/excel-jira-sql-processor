const axios = require("axios");
const fs = require("fs");
require("dotenv").config({ path: "./env.tin" });

// Helper function to wrap text at specified width
function wrapText(text, width = 80) {
  if (!text || text.length <= width) return text;

  const words = text.split(" ");
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + word).length <= width) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines.join("\n");
}

async function getCurrentSprintTickets(sprintDate = "9/25/2025") {
  try {
    // Normalize the date format (remove leading zeros)
    const normalizedDate = sprintDate
      .replace(/\b0+/g, "")
      .replace(/\/0+/g, "/");
    console.log(`🔍 Getting tickets from WTCI Sprint ${normalizedDate}...`);

    const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
    const JIRA_USERNAME = process.env.JIRA_USERNAME;
    const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

    // Create axios client for JIRA API
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

    // Use JQL to find tickets in open sprints (this works reliably)
    const jql = "project = WTCI AND sprint in openSprints() ORDER BY Rank ASC";
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
      maxResults: 100,
    });

    const tickets = searchResponse.data.issues;
    console.log(`Found ${tickets.length} tickets in open sprints`);

    // Derive sprint name and end date from ticket sprints (best-effort)
    const sprintNameCounts = new Map();
    const sprintEndDates = [];
    tickets.forEach((ticket) => {
      if (ticket.fields.sprint && Array.isArray(ticket.fields.sprint)) {
        ticket.fields.sprint.forEach((s) => {
          if (s && s.name) {
            sprintNameCounts.set(
              s.name,
              (sprintNameCounts.get(s.name) || 0) + 1
            );
          }
          if (s && (s.endDate || s.endDateTime)) {
            // JIRA may use endDate or endDateTime
            const raw = s.endDate || s.endDateTime;
            const dateIso = new Date(raw).toISOString().split("T")[0];
            if (!Number.isNaN(new Date(raw).getTime())) {
              sprintEndDates.push(dateIso);
            }
          }
        });
      }
    });

    // Pick the most common sprint name or fallback
    let derivedSprintName = null;
    if (sprintNameCounts.size > 0) {
      derivedSprintName = Array.from(sprintNameCounts.entries()).sort(
        (a, b) => b[1] - a[1]
      )[0][0];
    }

    // Choose the latest end date seen, else today
    let derivedEndDate = null;
    if (sprintEndDates.length > 0) {
      derivedEndDate = sprintEndDates.sort().pop();
    } else {
      derivedEndDate = new Date().toISOString().split("T")[0];
    }

    // Prepare content for text file
    let fileContent = `WTCI Sprint Tickets Report\n`;
    fileContent += `Generated: ${new Date().toISOString()}\n`;
    fileContent += `Total Tickets: ${tickets.length}\n`;
    fileContent += "=".repeat(80) + "\n\n";

    console.log(`\n📋 Tickets in Open Sprints:`);
    console.log("=".repeat(80));

    const seenKeys = new Set();
    let ticketIndex = 0;
    tickets.forEach((ticket) => {
      if (seenKeys.has(ticket.key)) {
        return; // skip duplicates
      }
      seenKeys.add(ticket.key);
      ticketIndex += 1;
      const ticketInfo = `${ticketIndex}. ${ticket.key} - ${ticket.fields.summary}`;
      const status = `   Status: ${ticket.fields.status.name}`;
      const assignee = `   Assignee: ${
        ticket.fields.assignee?.displayName || "Unassigned"
      }`;
      const priority = `   Priority: ${ticket.fields.priority?.name || "None"}`;
      const created = `   Created: ${ticket.fields.created}`;
      const updated = `   Updated: ${ticket.fields.updated}`;

      // Extract description text preserving original format
      let descriptionText = "";
      if (
        ticket.fields.description &&
        typeof ticket.fields.description === "string"
      ) {
        descriptionText = ticket.fields.description;
      } else if (
        ticket.fields.description &&
        typeof ticket.fields.description === "object"
      ) {
        // Handle JIRA's rich text format - recursive extraction
        function extractTextFromNode(node) {
          if (typeof node === "string") {
            return node;
          }

          if (node && typeof node === "object") {
            let text = "";

            // Handle different node types
            if (node.type === "paragraph") {
              if (node.content) {
                text = node.content.map(extractTextFromNode).join("");
              }
              text += "\n";
            } else if (node.type === "hardBreak") {
              text = "\n";
            } else if (node.type === "text") {
              text = node.text || "";
            } else if (node.content) {
              // Recursively extract from content
              text = node.content.map(extractTextFromNode).join("");
            } else if (node.text) {
              text = node.text;
            }

            return text;
          }

          return "";
        }

        if (ticket.fields.description.content) {
          descriptionText = ticket.fields.description.content
            .map(extractTextFromNode)
            .join("");
        } else {
          descriptionText = "Rich text description (no content)";
        }
      } else {
        descriptionText = "No description available";
      }

      const sprint = `   Sprint: ${
        ticket.fields.sprint?.map((s) => s.name).join(", ") || "Not assigned"
      }`;

      // Do not print per-ticket lines to console to avoid duplicating parse content

      // File content (preserving original JIRA formatting)
      fileContent += ticketInfo + "\n";
      fileContent += status + "\n";
      fileContent += assignee + "\n";
      fileContent += priority + "\n";
      fileContent += created + "\n";
      fileContent += updated + "\n";
      fileContent += sprint + "\n";
      fileContent += "   Description:\n";

      // Preserve original formatting from JIRA
      const descriptionLines = descriptionText.split("\n");
      descriptionLines.forEach((line) => {
        if (line.trim() === "") {
          fileContent += "\n"; // Preserve empty lines
        } else {
          fileContent += "     " + line + "\n"; // Indent non-empty lines
        }
      });

      fileContent += "\n" + "=".repeat(60) + "\n\n";
    });

    // Optionally compute status groups for console diagnostics only (not added to file)
    const statusGroups = {};
    tickets.forEach((ticket) => {
      const s = ticket.fields.status.name;
      statusGroups[s] = (statusGroups[s] || 0) + 1;
    });

    console.log(`\n📊 Tickets grouped by Status (summary):`);
    console.log("=".repeat(80));
    Object.keys(statusGroups).forEach((status) => {
      console.log(`  ${status}: ${statusGroups[status]} tickets`);
    });

    // Emit structured markers for the server to parse and save a single file
    const sprintNameFromArg = `WTCI Sprint ${normalizedDate}`;
    const finalSprintName = derivedSprintName || sprintNameFromArg;
    console.log(`SPRINT_NAME: ${finalSprintName}`);
    console.log(`SPRINT_END_DATE: ${derivedEndDate}`);
    console.log("===BEGIN_REPORT===");
    console.log(fileContent);
    console.log("===END_REPORT===");
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
  }
}

// Get sprint date from command line argument or use default
const sprintDate = process.argv[2] || "9/25/2025";
getCurrentSprintTickets(sprintDate);
