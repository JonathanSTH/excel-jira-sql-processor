import axios, { AxiosInstance } from "axios";
import { JiraTicket } from "../types";

export interface IJiraService {
  getTicket(ticketKey: string): Promise<JiraTicket>;
  searchTickets(jql: string, fields?: string[]): Promise<JiraTicket[]>;
  getProjectTickets(projectKey: string): Promise<JiraTicket[]>;
  testConnection(): Promise<boolean>;
}

export interface JiraConfig {
  baseUrl: string;
  username: string;
  apiToken: string;
}

export class JiraService implements IJiraService {
  private client: AxiosInstance;
  private config: JiraConfig;

  constructor(config: JiraConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: `${config.baseUrl}/rest/api/3`,
      auth: {
        username: config.username,
        password: config.apiToken,
      },
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Test connection to JIRA API
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get("/myself");
      return response.status === 200;
    } catch (error) {
      console.error("JIRA connection test failed:", error);
      return false;
    }
  }

  /**
   * Get a single ticket by key
   */
  async getTicket(ticketKey: string): Promise<JiraTicket> {
    try {
      const response = await this.client.get(`/issue/${ticketKey}`);
      return this.mapJiraIssueToTicket(response.data);
    } catch (error) {
      throw new Error(
        `Failed to get JIRA ticket ${ticketKey}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Search tickets using JQL (JIRA Query Language)
   */
  async searchTickets(
    jql: string,
    fields: string[] = [
      "summary",
      "status",
      "assignee",
      "priority",
      "created",
      "updated",
    ]
  ): Promise<JiraTicket[]> {
    try {
      const response = await this.client.post("/search", {
        jql,
        fields,
        maxResults: 1000,
      });

      return response.data.issues.map((issue: any) =>
        this.mapJiraIssueToTicket(issue)
      );
    } catch (error) {
      throw new Error(
        `Failed to search JIRA tickets: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Get all tickets for a specific project
   */
  async getProjectTickets(projectKey: string): Promise<JiraTicket[]> {
    const jql = `project = "${projectKey}" ORDER BY created DESC`;
    return this.searchTickets(jql);
  }

  /**
   * Get tickets updated since a specific date
   */
  async getTicketsUpdatedSince(date: string): Promise<JiraTicket[]> {
    const jql = `updated >= "${date}" ORDER BY updated DESC`;
    return this.searchTickets(jql);
  }

  /**
   * Get tickets by status
   */
  async getTicketsByStatus(status: string): Promise<JiraTicket[]> {
    const jql = `status = "${status}" ORDER BY created DESC`;
    return this.searchTickets(jql);
  }

  /**
   * Get tickets assigned to a specific user
   */
  async getTicketsByAssignee(assignee: string): Promise<JiraTicket[]> {
    const jql = `assignee = "${assignee}" ORDER BY created DESC`;
    return this.searchTickets(jql);
  }

  /**
   * Map JIRA API response to our ticket interface
   */
  private mapJiraIssueToTicket(issue: any): JiraTicket {
    return {
      key: issue.key,
      summary: issue.fields.summary || "",
      status: issue.fields.status?.name || "",
      assignee:
        issue.fields.assignee?.displayName ||
        issue.fields.assignee?.emailAddress ||
        "",
      priority: issue.fields.priority?.name || "",
      created: issue.fields.created || "",
      updated: issue.fields.updated || "",
      customFields: this.extractCustomFields(issue.fields),
    };
  }

  /**
   * Extract custom fields from JIRA issue
   */
  private extractCustomFields(fields: any): Record<string, any> {
    const customFields: Record<string, any> = {};

    Object.keys(fields).forEach((key) => {
      if (key.startsWith("customfield_")) {
        customFields[key] = fields[key];
      }
    });

    return customFields;
  }

  /**
   * Validate JIRA configuration
   */
  static validateConfig(config: JiraConfig): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config.baseUrl) {
      errors.push("JIRA base URL is required");
    } else if (!config.baseUrl.startsWith("http")) {
      errors.push("JIRA base URL must start with http:// or https://");
    }

    if (!config.username) {
      errors.push("JIRA username is required");
    }

    if (!config.apiToken) {
      errors.push("JIRA API token is required");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get available projects
   */
  async getProjects(): Promise<any[]> {
    try {
      const response = await this.client.get("/project");
      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to get JIRA projects: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Get issue types for a project
   */
  async getIssueTypes(projectKey: string): Promise<any[]> {
    try {
      const response = await this.client.get(`/project/${projectKey}`);
      return response.data.issueTypes;
    } catch (error) {
      throw new Error(
        `Failed to get issue types for project ${projectKey}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
