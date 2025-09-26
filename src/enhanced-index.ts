import { ConfigLoader } from "./config/ConfigLoader";
import { SqlService } from "./services/SqlService";
import { JiraService } from "./services/JiraService";
import { ExcelService } from "./services/ExcelService";
import { TicketParserService } from "./services/TicketParserService";
import { ExcelDataExtractor } from "./services/ExcelDataExtractor";
import { TicketValidationService } from "./services/TicketValidationService";
import { EnhancedDataProcessor } from "./services/EnhancedDataProcessor";
import * as fs from "fs";
import * as path from "path";

class EnhancedApplication {
  private configLoader: ConfigLoader;
  private sqlService: SqlService;
  private jiraService: JiraService;
  private excelService: ExcelService;
  private ticketParser: TicketParserService;
  private excelExtractor: ExcelDataExtractor;
  private validationService: TicketValidationService;
  private dataProcessor: EnhancedDataProcessor;

  constructor() {
    this.configLoader = ConfigLoader.getInstance();
    this.initializeServices();
  }

  private initializeServices(): void {
    const config = this.configLoader.loadConfig();

    this.sqlService = new SqlService(config.sql);
    this.jiraService = new JiraService(config.jira);
    this.excelService = new ExcelService();
    this.ticketParser = new TicketParserService();
    this.excelExtractor = new ExcelDataExtractor();
    this.validationService = new TicketValidationService(this.sqlService);

    this.dataProcessor = new EnhancedDataProcessor(
      this.sqlService,
      this.excelService,
      this.ticketParser,
      this.excelExtractor,
      this.validationService,
      {
        inputDirectory: "./input",
        outputPath: "./output",
        excelSearchDirectory: "./excel-files", // Directory to search for Excel files
      }
    );
  }

  async run(): Promise<void> {
    try {
      console.log("🚀 Starting Enhanced Excel-JIRA-SQL Data Processor...\n");

      // Test connections
      await this.testConnections();

      // Fetch JIRA tickets
      console.log("🎫 Fetching JIRA tickets...");
      const tickets = await this.fetchJiraTickets();

      if (tickets.length === 0) {
        console.log(
          "⚠️  No JIRA tickets found. Please check your JIRA configuration."
        );
        return;
      }

      console.log(`📊 Found ${tickets.length} JIRA tickets`);

      // Process tickets
      console.log("🔄 Processing tickets...");
      const result = await this.dataProcessor.processTickets(tickets);

      // Write output files
      console.log("💾 Writing output files...");
      await this.dataProcessor.writeOutputFiles(result);

      // Display summary
      this.displaySummary(result);

      console.log("\n✅ Enhanced data processing completed successfully!");
    } catch (error) {
      console.error(
        "\n❌ Enhanced data processing failed:",
        error instanceof Error ? error.message : "Unknown error"
      );
      process.exit(1);
    }
  }

  private async testConnections(): Promise<void> {
    console.log("🔍 Testing connections...");

    // Test JIRA connection
    console.log("  Testing JIRA connection...");
    const jiraConnected = await this.jiraService.testConnection();
    if (!jiraConnected) {
      throw new Error(
        "Failed to connect to JIRA. Please check your credentials and network connection."
      );
    }
    console.log("  ✅ JIRA connection successful");

    // Test SQL connection
    console.log("  Testing SQL Server connection...");
    try {
      await this.sqlService.connect();
      await this.sqlService.disconnect();
      console.log("  ✅ SQL Server connection successful");
    } catch (error) {
      throw new Error(
        `Failed to connect to SQL Server: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private async fetchJiraTickets(): Promise<any[]> {
    try {
      // Try to get tickets from a specific project first
      const projects = await this.jiraService.getProjects();
      console.log(`📋 Found ${projects.length} JIRA projects`);

      if (projects.length === 0) {
        console.log("⚠️  No projects found in JIRA");
        return [];
      }

      // Get tickets from the first project (you can modify this logic)
      const projectKey = projects[0].key;
      console.log(`🎫 Fetching tickets from project: ${projectKey}`);

      const tickets = await this.jiraService.getProjectTickets(projectKey);

      // Filter tickets that might contain data update requests
      const relevantTickets = tickets.filter(
        (ticket) =>
          ticket.summary.toLowerCase().includes("update") ||
          ticket.summary.toLowerCase().includes("table") ||
          ticket.summary.toLowerCase().includes("tax") ||
          ticket.summary.toLowerCase().includes("excel")
      );

      console.log(
        `📊 Found ${relevantTickets.length} relevant tickets out of ${tickets.length} total tickets`
      );

      return relevantTickets;
    } catch (error) {
      console.warn("Failed to fetch JIRA tickets:", error);
      return [];
    }
  }

  private displaySummary(result: any): void {
    console.log("\n📊 PROCESSING SUMMARY");
    console.log("====================");
    console.log(`Tickets Processed: ${result.ticketReports.length}`);
    console.log(`Excel Files Searched: ${result.excelSearchResults.length}`);

    let totalRequirements = 0;
    let passedRequirements = 0;
    let failedRequirements = 0;
    let totalTCodes = 0;
    let validatedTCodes = 0;

    result.ticketReports.forEach((report: any) => {
      totalRequirements += report.summary.totalRequirements;
      passedRequirements += report.summary.passedRequirements;
      failedRequirements += report.summary.failedRequirements;
      totalTCodes += report.summary.totalTCodes;
      validatedTCodes += report.summary.validatedTCodes;
    });

    console.log(`Total Requirements: ${totalRequirements}`);
    console.log(
      `Passed Requirements: ${passedRequirements} (${(
        (passedRequirements / totalRequirements) *
        100
      ).toFixed(1)}%)`
    );
    console.log(
      `Failed Requirements: ${failedRequirements} (${(
        (failedRequirements / totalRequirements) *
        100
      ).toFixed(1)}%)`
    );
    console.log(
      `T-Codes Validated: ${validatedTCodes}/${totalTCodes} (${(
        (validatedTCodes / totalTCodes) *
        100
      ).toFixed(1)}%)`
    );

    // Show ticket status summary
    const statusCounts = result.ticketReports.reduce(
      (acc: any, report: any) => {
        acc[report.overallStatus] = (acc[report.overallStatus] || 0) + 1;
        return acc;
      },
      {}
    );

    console.log("\nTicket Status Summary:");
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    // Show Excel search summary
    const totalExcelMatches = result.excelSearchResults.reduce(
      (sum: number, result: any) => sum + result.matches.length,
      0
    );
    console.log(`\nExcel Search Results:`);
    console.log(`  Files Searched: ${result.excelSearchResults.length}`);
    console.log(`  Total Matches: ${totalExcelMatches}`);
  }
}

// Main execution
async function main(): Promise<void> {
  const app = new EnhancedApplication();
  await app.run();
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// Run the application
if (require.main === module) {
  main().catch((error) => {
    console.error("Enhanced application failed:", error);
    process.exit(1);
  });
}

export { EnhancedApplication };
