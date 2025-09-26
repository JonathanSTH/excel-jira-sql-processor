const axios = require("axios");
require("dotenv").config({ path: "./env.tin" });

async function findCurrentSprintTickets() {
  try {
    console.log("🔍 Finding current sprint tickets...");

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

    // Looking for non-completed sprints
    console.log("🔍 Looking for non-completed sprints...");

    // Search for tickets in WTCI project directly
    console.log("📋 Searching for tickets in WTCI project...");

    // Use JQL to find tickets in WTCI project
    const jql = "project = WTCI ORDER BY created DESC";
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
      maxResults: 100,
    });

    const tickets = searchResponse.data.issues;
    console.log(`Found ${tickets.length} tickets in WTCI project`);

    // Extract unique sprints from tickets
    const sprints = [];
    const sprintMap = new Map();

    tickets.forEach((ticket) => {
      if (ticket.fields.sprint && ticket.fields.sprint.length > 0) {
        ticket.fields.sprint.forEach((sprint) => {
          if (!sprintMap.has(sprint.id)) {
            sprintMap.set(sprint.id, sprint);
            sprints.push(sprint);
          }
        });
      }
    });

    console.log(`Found ${sprints.length} unique sprints from tickets`);

    // Find sprints that are not completed (active or future)
    const nonCompletedSprints = sprints.filter((sprint) => {
      if (!sprint.startDate || !sprint.endDate) return false;

      const startDate = new Date(sprint.startDate);
      const endDate = new Date(sprint.endDate);

      console.log(`  Sprint: ${sprint.name}`);
      console.log(`    Start: ${startDate.toISOString()}`);
      console.log(`    End: ${endDate.toISOString()}`);
      console.log(`    State: ${sprint.state || "Unknown"}`);
      console.log(
        `    Complete Date: ${sprint.completeDate || "Not completed"}`
      );

      // Check if sprint is not completed
      const isNotCompleted = !sprint.completeDate && sprint.state !== "closed";
      console.log(`    Is not completed: ${isNotCompleted}`);
      console.log("");

      return isNotCompleted;
    });

    console.log(`Found ${nonCompletedSprints.length} non-completed sprints`);

    // If we have non-completed sprints, use the most recent one
    const currentSprint =
      nonCompletedSprints.length > 0
        ? nonCompletedSprints.sort(
            (a, b) => new Date(b.startDate) - new Date(a.startDate)
          )[0]
        : null;

    if (!currentSprint) {
      console.log("❌ No current sprint found");
      console.log("Available sprints:");
      sprints.forEach((sprint) => {
        console.log(
          `  - ${sprint.name}: ${sprint.startDate} to ${sprint.endDate}`
        );
      });
      return;
    }

    console.log(`✅ Found current sprint: ${currentSprint.name}`);
    console.log(`   Start: ${currentSprint.startDate}`);
    console.log(`   End: ${currentSprint.endDate}`);

    // Filter tickets for the current sprint
    console.log("🎫 Getting tickets for current sprint...");
    const issues = tickets.filter((ticket) => {
      return (
        ticket.fields.sprint &&
        ticket.fields.sprint.some((sprint) => sprint.id === currentSprint.id)
      );
    });

    console.log(`\n📋 Found ${issues.length} tickets in current sprint:`);
    console.log("=".repeat(60));

    issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.key} - ${issue.fields.summary}`);
      console.log(`   Status: ${issue.fields.status.name}`);
      console.log(
        `   Assignee: ${issue.fields.assignee?.displayName || "Unassigned"}`
      );
      console.log(`   Priority: ${issue.fields.priority?.name || "None"}`);
      console.log("");
    });
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
  }
}

findCurrentSprintTickets();
