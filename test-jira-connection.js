const axios = require("axios");
require("dotenv").config({ path: "./env.tin" });

// Get values from .env file
const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
const JIRA_USERNAME = process.env.JIRA_USERNAME;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

async function testJiraConnection() {
  try {
    console.log("🔍 Testing JIRA connection...");
    // Add this to your test file to debug
    console.log("Testing with:");
    console.log("URL:", JIRA_BASE_URL);
    console.log("Username:", JIRA_USERNAME);
    console.log("Token length:", JIRA_API_TOKEN.length);
    console.log("Token starts with:", JIRA_API_TOKEN.substring(0, 10));

    const response = await axios.get(`${JIRA_BASE_URL}/rest/api/3/myself`, {
      auth: {
        username: JIRA_USERNAME,
        password: JIRA_API_TOKEN,
      },
      headers: {
        Accept: "application/json",
      },
    });

    console.log("✅ Connection successful!");
    console.log("User:", response.data.displayName);
    console.log("Email:", response.data.emailAddress);
    console.log("Account ID:", response.data.accountId);
  } catch (error) {
    console.error("❌ Connection failed:");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Error:", error.response.data);
    } else {
      console.error("Error:", error.message);
    }
  }
}

testJiraConnection();
