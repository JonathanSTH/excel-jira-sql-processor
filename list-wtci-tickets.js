const axios = require("axios");
require("dotenv").config({ path: "./env.tin" });

async function listWTCITickets() {
  try {
    console.log("🔍 Getting all WTCI tickets...");

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

    // Use JQL to find tickets in WTCI project (same as board filter)
    const jql = "project = WTCI ORDER BY Rank ASC";
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
      ],
      maxResults: 50, // Get more tickets
    });

    const tickets = searchResponse.data.issues;
    console.log(`Found ${tickets.length} tickets in WTCI project`);

    console.log("\n📋 All WTCI Tickets:");
    console.log("=".repeat(80));

    tickets.forEach((ticket, index) => {
      console.log(`${index + 1}. ${ticket.key} - ${ticket.fields.summary}`);
      console.log(`   Status: ${ticket.fields.status.name}`);
      console.log(
        `   Assignee: ${ticket.fields.assignee?.displayName || "Unassigned"}`
      );
      console.log(`   Priority: ${ticket.fields.priority?.name || "None"}`);
      console.log(`   Created: ${ticket.fields.created}`);
      console.log(`   Updated: ${ticket.fields.updated}`);

      // Show sprint info if available
      if (ticket.fields.sprint && ticket.fields.sprint.length > 0) {
        console.log(
          `   Sprint: ${ticket.fields.sprint.map((s) => s.name).join(", ")}`
        );
      } else {
        console.log(`   Sprint: Not assigned`);
      }

      console.log("");
    });

    // Group tickets by sprint
    console.log("\n🏃 Tickets grouped by Sprint:");
    console.log("=".repeat(80));

    const sprintGroups = {};
    tickets.forEach((ticket) => {
      if (ticket.fields.sprint && ticket.fields.sprint.length > 0) {
        ticket.fields.sprint.forEach((sprint) => {
          if (!sprintGroups[sprint.name]) {
            sprintGroups[sprint.name] = [];
          }
          sprintGroups[sprint.name].push(ticket);
        });
      } else {
        if (!sprintGroups["No Sprint"]) {
          sprintGroups["No Sprint"] = [];
        }
        sprintGroups["No Sprint"].push(ticket);
      }
    });

    Object.keys(sprintGroups).forEach((sprintName) => {
      console.log(
        `\n📋 ${sprintName} (${sprintGroups[sprintName].length} tickets):`
      );
      sprintGroups[sprintName].forEach((ticket) => {
        console.log(`  - ${ticket.key}: ${ticket.fields.summary}`);
      });
    });
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
  }
}

listWTCITickets();
