import { ConfigLoader } from "./config/ConfigLoader";
import { ExcelService } from "./services/ExcelService";
import { SqlService } from "./services/SqlService";
import { JiraService } from "./services/JiraService";
import { DataValidationService } from "./services/DataValidationService";
import { DataProcessorService } from "./services/DataProcessorService";
import * as fs from "fs";
import * as path from "path";

class Application {
  private configLoader: ConfigLoader;
  private excelService: ExcelService;
  private sqlService: SqlService;
  private jiraService: JiraService;
  private validationService: DataValidationService;
  private dataProcessor: DataProcessorService;

  constructor() {
    this.configLoader = ConfigLoader.getInstance();
    this.initializeServices();
  }

  private initializeServices(): void {
    const config = this.configLoader.loadConfig();

    this.excelService = new ExcelService();
    this.sqlService = new SqlService(config.sql);
    this.jiraService = new JiraService(config.jira);
    this.validationService = new DataValidationService();

    this.dataProcessor = new DataProcessorService(
      this.excelService,
      this.sqlService,
      this.jiraService,
      this.validationService,
      {
        inputExcelPath: config.files.inputPath,
        outputExcelPath: config.files.outputPath,
      }
    );
  }

  async run(): Promise<void> {
    try {
      console.log("🚀 Starting Excel-JIRA-SQL Data Processor...\n");

      // Test connections
      await this.testConnections();

      // Process data
      console.log("📊 Processing data...");
      const processedData = await this.dataProcessor.processData();

      // Generate output data
      console.log("📝 Generating output data...");
      const outputData = this.dataProcessor.generateOutputData(processedData);

      // Write validated Excel file
      console.log("💾 Writing validated Excel file...");
      this.writeOutputFile(outputData);

      // Generate validation report
      console.log("📋 Generating validation report...");
      const validationReport =
        await this.dataProcessor.generateValidationReport(processedData);
      this.writeValidationReport(validationReport);

      // Display summary
      this.displaySummary(processedData, outputData);

      console.log("\n✅ Data processing completed successfully!");
    } catch (error) {
      console.error(
        "\n❌ Data processing failed:",
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

  private writeOutputFile(outputData: Record<string, any>[]): void {
    const config = this.configLoader.getConfig();

    // Ensure output directory exists
    const outputDir = path.dirname(config.files.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    this.excelService.writeExcel(
      outputData,
      config.files.outputPath,
      "ValidatedData"
    );
    console.log(`  📄 Output file written to: ${config.files.outputPath}`);
  }

  private writeValidationReport(report: string): void {
    const config = this.configLoader.getConfig();
    const reportPath = path.join(
      path.dirname(config.files.outputPath),
      "validation-report.txt"
    );

    fs.writeFileSync(reportPath, report);
    console.log(`  📋 Validation report written to: ${reportPath}`);
  }

  private displaySummary(
    processedData: any,
    outputData: Record<string, any>[]
  ): void {
    console.log("\n📊 PROCESSING SUMMARY");
    console.log("====================");
    console.log(`Excel Sheets Processed: ${processedData.excelData.length}`);
    console.log(
      `Total Excel Rows: ${processedData.excelData.reduce(
        (sum, sheet) => sum + sheet.rows.length,
        0
      )}`
    );
    console.log(`JIRA Tickets Fetched: ${processedData.jiraTickets.length}`);
    console.log(
      `SQL Validation Status: ${
        processedData.validationResults.isValid ? "PASSED" : "FAILED"
      }`
    );
    console.log(`Output Records Generated: ${outputData.length}`);

    if (processedData.validationResults.errors.length > 0) {
      console.log(
        `\n⚠️  Validation Errors: ${processedData.validationResults.errors.length}`
      );
      processedData.validationResults.errors
        .slice(0, 5)
        .forEach((error: string, index: number) => {
          console.log(`  ${index + 1}. ${error}`);
        });
      if (processedData.validationResults.errors.length > 5) {
        console.log(
          `  ... and ${
            processedData.validationResults.errors.length - 5
          } more errors`
        );
      }
    }

    if (processedData.validationResults.warnings.length > 0) {
      console.log(
        `\n⚠️  Validation Warnings: ${processedData.validationResults.warnings.length}`
      );
      processedData.validationResults.warnings
        .slice(0, 3)
        .forEach((warning: string, index: number) => {
          console.log(`  ${index + 1}. ${warning}`);
        });
      if (processedData.validationResults.warnings.length > 3) {
        console.log(
          `  ... and ${
            processedData.validationResults.warnings.length - 3
          } more warnings`
        );
      }
    }
  }
}

// Main execution
async function main(): Promise<void> {
  const app = new Application();
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
    console.error("Application failed:", error);
    process.exit(1);
  });
}

export { Application };
