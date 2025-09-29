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

    // Prepare content for text file
    let fileContent = `WTCI Sprint Tickets Report\n`;
    fileContent += `Generated: ${new Date().toISOString()}\n`;
    fileContent += `Total Tickets: ${tickets.length}\n`;
    fileContent += "=".repeat(80) + "\n\n";

    console.log(`\n📋 Tickets in Open Sprints:`);
    console.log("=".repeat(80));

    tickets.forEach((ticket, index) => {
      const ticketInfo = `${index + 1}. ${ticket.key} - ${
        ticket.fields.summary
      }`;
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

      // Console output (truncated)
      console.log(ticketInfo);
      console.log(status);
      console.log(assignee);
      console.log(priority);
      console.log(created);
      console.log(updated);
      console.log(sprint);
      console.log(`   Description: ${descriptionText.substring(0, 100)}...`);
      console.log("");

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

    // Add status grouping to file content
    fileContent += "\nTICKETS GROUPED BY STATUS\n";
    fileContent += "=".repeat(80) + "\n\n";

    const statusGroups = {};
    tickets.forEach((ticket) => {
      const status = ticket.fields.status.name;
      if (!statusGroups[status]) {
        statusGroups[status] = [];
      }
      statusGroups[status].push(ticket);
    });

    Object.keys(statusGroups).forEach((status) => {
      fileContent += `${status} (${statusGroups[status].length} tickets):\n`;
      statusGroups[status].forEach((ticket) => {
        fileContent += `  - ${ticket.key}: ${ticket.fields.summary}\n`;
      });
      fileContent += "\n";
    });

    // Write to file in the sprintData/fetched directory
    const filename = `wtci-sprint-tickets-${
      new Date().toISOString().split("T")[0]
    }.txt`;

    // Ensure the directory exists
    const dir = "./sprintData/fetched";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filepath = `${dir}/${filename}`;
    fs.writeFileSync(filepath, fileContent, "utf8");

    console.log(`\n📊 Tickets grouped by Status:`);
    console.log("=".repeat(80));

    Object.keys(statusGroups).forEach((status) => {
      console.log(`\n📋 ${status} (${statusGroups[status].length} tickets):`);
      statusGroups[status].forEach((ticket) => {
        console.log(`  - ${ticket.key}: ${ticket.fields.summary}`);
      });
    });

    console.log(`\n✅ Report saved to: ${filepath}`);
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
  }
}

// Get sprint date from command line argument or use default
const sprintDate = process.argv[2] || "9/25/2025";
getCurrentSprintTickets(sprintDate);
