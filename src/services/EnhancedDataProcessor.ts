import { JiraTicket } from "../types";
import { TicketParserService, ParsedTicket } from "./TicketParserService";
import { ExcelDataExtractor, ExcelSearchResult } from "./ExcelDataExtractor";
import {
  TicketValidationService,
  TicketValidationReport,
} from "./TicketValidationService";
import { SqlService } from "./SqlService";
import { ExcelService } from "./ExcelService";
import { FileUtils } from "../utils/FileUtils";

export interface ProcessingResult {
  ticketReports: TicketValidationReport[];
  excelSearchResults: ExcelSearchResult[];
  parseSummary: string;
  validationReport: string;
  outputData: Record<string, any>[];
}

export class EnhancedDataProcessor {
  constructor(
    private sqlService: SqlService,
    private excelService: ExcelService,
    private ticketParser: TicketParserService,
    private excelExtractor: ExcelDataExtractor,
    private validationService: TicketValidationService,
    private config: {
      inputDirectory: string;
      outputPath: string;
      excelSearchDirectory: string;
    }
  ) {}

  /**
   * Main processing method for JIRA tickets
   */
  async processTickets(tickets: JiraTicket[]): Promise<ProcessingResult> {
    try {
      console.log("🔍 Parsing JIRA tickets...");
      const parsedTickets = this.ticketParser.parseTickets(tickets);

      console.log("📊 Generating parse summary...");
      const parseSummary =
        this.ticketParser.generateParseSummary(parsedTickets);

      console.log("🔍 Searching Excel files...");
      const excelSearchResults = await this.searchExcelFiles(parsedTickets);

      console.log("✅ Validating tickets against SQL Server...");
      const ticketReports = await this.validateTickets(
        parsedTickets,
        excelSearchResults
      );

      console.log("📋 Generating validation report...");
      const validationReport =
        this.validationService.generateValidationReport(ticketReports);

      console.log("📝 Generating output data...");
      const outputData = this.generateOutputData(
        ticketReports,
        excelSearchResults
      );

      return {
        ticketReports,
        excelSearchResults,
        parseSummary,
        validationReport,
        outputData,
      };
    } catch (error) {
      throw new Error(
        `Enhanced data processing failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Search Excel files based on parsed tickets
   */
  private async searchExcelFiles(
    parsedTickets: ParsedTicket[]
  ): Promise<ExcelSearchResult[]> {
    const allTCodes = this.ticketParser.extractAllTCodes(parsedTickets);
    const allExcelFiles = new Set<string>();

    // Collect all Excel file references
    parsedTickets.forEach((parsed) => {
      parsed.excelFiles.forEach((file) => allExcelFiles.add(file));
    });

    const searchResults: ExcelSearchResult[] = [];

    // Search in the configured directory
    const directoryFiles = await this.excelExtractor.findExcelFiles(
      this.config.excelSearchDirectory
    );

    // Search for specific files mentioned in tickets
    for (const fileName of allExcelFiles) {
      const foundFiles = await this.excelExtractor.findExcelFilesByName(
        this.config.excelSearchDirectory,
        fileName.replace(".xlsx", "")
      );

      for (const filePath of foundFiles) {
        try {
          const result = await this.excelExtractor.searchTCodesInExcel(
            filePath,
            allTCodes
          );
          searchResults.push(result);
        } catch (error) {
          console.warn(`Failed to search Excel file ${filePath}:`, error);
        }
      }
    }

    // Search all Excel files in directory if no specific files found
    if (searchResults.length === 0) {
      for (const filePath of directoryFiles) {
        try {
          const result = await this.excelExtractor.searchTCodesInExcel(
            filePath,
            allTCodes
          );
          if (result.matches.length > 0) {
            searchResults.push(result);
          }
        } catch (error) {
          console.warn(`Failed to search Excel file ${filePath}:`, error);
        }
      }
    }

    return searchResults;
  }

  /**
   * Validate tickets against SQL Server
   */
  private async validateTickets(
    parsedTickets: ParsedTicket[],
    excelResults: ExcelSearchResult[]
  ): Promise<TicketValidationReport[]> {
    const ticketReports: TicketValidationReport[] = [];

    for (const parsedTicket of parsedTickets) {
      try {
        const report = await this.validationService.validateTicket(
          parsedTicket,
          excelResults
        );
        ticketReports.push(report);
      } catch (error) {
        console.warn(
          `Failed to validate ticket ${parsedTicket.ticket.key}:`,
          error
        );
        // Create a failed report
        ticketReports.push({
          ticket: parsedTicket,
          validationResults: [],
          overallStatus: "FAILED",
          summary: {
            totalRequirements: 0,
            passedRequirements: 0,
            failedRequirements: 0,
            totalTCodes: 0,
            validatedTCodes: 0,
            totalValues: 0,
            validatedValues: 0,
          },
        });
      }
    }

    return ticketReports;
  }

  /**
   * Generate output data for Excel export
   */
  private generateOutputData(
    ticketReports: TicketValidationReport[],
    excelResults: ExcelSearchResult[]
  ): Record<string, any>[] {
    const outputData: Record<string, any>[] = [];

    ticketReports.forEach((report, ticketIndex) => {
      const ticket = report.ticket.ticket;

      report.validationResults.forEach((validation, reqIndex) => {
        const requirement = validation.requirement;

        // Create base record
        const record: Record<string, any> = {
          ticket_key: ticket.key,
          ticket_summary: ticket.summary,
          ticket_status: ticket.status,
          requirement_type: requirement.type,
          requirement_description: requirement.description,
          t_codes: requirement.tCodes.join(", "),
          expected_values: requirement.values.join(", "),
          validation_status: validation.isValid ? "PASSED" : "FAILED",
          sql_rows_returned: validation.summary.sqlRowsReturned,
          t_codes_found: validation.summary.tCodesFound,
          t_codes_expected: validation.summary.tCodesExpected,
          values_found: validation.summary.valuesFound,
          values_expected: validation.summary.valuesExpected,
          excel_file: requirement.excelFile || "",
          errors: validation.errors.join("; "),
          warnings: validation.warnings.join("; "),
          processed_timestamp: new Date().toISOString(),
        };

        // Add SQL results summary
        if (validation.sqlResults.length > 0) {
          const sqlSummary = validation.sqlResults.reduce((acc, row) => {
            acc.tCode = row.tCode || acc.tCode;
            acc.tableName = row.table_name || acc.tableName;
            acc.foundValues = acc.foundValues
              ? `${acc.foundValues}, ${row.found_value}`
              : row.found_value;
            return acc;
          }, {} as any);

          record.sql_tcode = sqlSummary.tCode;
          record.sql_table = sqlSummary.tableName;
          record.sql_found_values = sqlSummary.foundValues;
        }

        // Add Excel results summary
        const excelMatches = validation.excelResults.reduce((acc, result) => {
          return acc + result.matches.length;
        }, 0);

        record.excel_matches_found = excelMatches;

        outputData.push(record);
      });

      // Add overall ticket summary
      const ticketSummary: Record<string, any> = {
        ticket_key: ticket.key,
        ticket_summary: ticket.summary,
        ticket_status: ticket.status,
        requirement_type: "SUMMARY",
        requirement_description: "Overall ticket validation",
        t_codes: "",
        expected_values: "",
        validation_status: report.overallStatus,
        sql_rows_returned: 0,
        t_codes_found: report.summary.validatedTCodes,
        t_codes_expected: report.summary.totalTCodes,
        values_found: report.summary.validatedValues,
        values_expected: report.summary.totalValues,
        excel_file: "",
        errors: "",
        warnings: "",
        processed_timestamp: new Date().toISOString(),
        total_requirements: report.summary.totalRequirements,
        passed_requirements: report.summary.passedRequirements,
        failed_requirements: report.summary.failedRequirements,
      };

      outputData.push(ticketSummary);
    });

    return outputData;
  }

  /**
   * Write all reports and data to files
   */
  async writeOutputFiles(result: ProcessingResult): Promise<void> {
    try {
      // Ensure output directory exists
      FileUtils.ensureDirectoryExists(this.config.outputPath);

      // Write main output Excel file
      const outputExcelPath = `${this.config.outputPath}/ticket-validation-results.xlsx`;
      this.excelService.writeExcel(
        result.outputData,
        outputExcelPath,
        "ValidationResults"
      );
      console.log(`📄 Output Excel file written to: ${outputExcelPath}`);

      // Write parse summary
      const parseSummaryPath = `${this.config.outputPath}/parse-summary.txt`;
      require("fs").writeFileSync(parseSummaryPath, result.parseSummary);
      console.log(`📋 Parse summary written to: ${parseSummaryPath}`);

      // Write validation report
      const validationReportPath = `${this.config.outputPath}/validation-report.txt`;
      require("fs").writeFileSync(
        validationReportPath,
        result.validationReport
      );
      console.log(`📋 Validation report written to: ${validationReportPath}`);

      // Write Excel search report
      const excelSearchReport = this.excelExtractor.generateSearchReport(
        result.excelSearchResults
      );
      const excelSearchReportPath = `${this.config.outputPath}/excel-search-report.txt`;
      require("fs").writeFileSync(excelSearchReportPath, excelSearchReport);
      console.log(
        `📋 Excel search report written to: ${excelSearchReportPath}`
      );

      // Write detailed ticket reports
      result.ticketReports.forEach((report, index) => {
        const ticketReportPath = `${this.config.outputPath}/ticket-${report.ticket.ticket.key}-report.txt`;
        const ticketReportContent = this.generateDetailedTicketReport(report);
        require("fs").writeFileSync(ticketReportPath, ticketReportContent);
        console.log(`📋 Ticket report written to: ${ticketReportPath}`);
      });
    } catch (error) {
      throw new Error(
        `Failed to write output files: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Generate detailed ticket report
   */
  private generateDetailedTicketReport(report: TicketValidationReport): string {
    const content: string[] = [];

    content.push(`=== TICKET DETAILED REPORT ===`);
    content.push(`Ticket: ${report.ticket.ticket.key}`);
    content.push(`Summary: ${report.ticket.ticket.summary}`);
    content.push(`Status: ${report.ticket.ticket.status}`);
    content.push(`Overall Validation: ${report.overallStatus}`);
    content.push(`Requirements: ${report.summary.totalRequirements}`);
    content.push(`Passed: ${report.summary.passedRequirements}`);
    content.push(`Failed: ${report.summary.failedRequirements}`);
    content.push(
      `T-Codes: ${report.summary.validatedTCodes}/${report.summary.totalTCodes}`
    );
    content.push(
      `Values: ${report.summary.validatedValues}/${report.summary.totalValues}`
    );
    content.push("");

    content.push("=== REQUIREMENTS ===");
    report.ticket.requirements.forEach((req, index) => {
      content.push(`${index + 1}. ${req.type}: ${req.tCodes.join(", ")}`);
      content.push(`   Description: ${req.description}`);
      content.push(`   Table: ${req.schemaName}.${req.tableName}`);
      if (req.values.length > 0) {
        content.push(`   Values: ${req.values.join(", ")}`);
      }
      if (req.excelFile) {
        content.push(`   Excel File: ${req.excelFile}`);
      }
      content.push("");
    });

    content.push("=== VALIDATION RESULTS ===");
    report.validationResults.forEach((validation, index) => {
      content.push(
        `${index + 1}. ${validation.requirement.type} - ${
          validation.isValid ? "PASSED" : "FAILED"
        }`
      );
      content.push(
        `   T-Codes Found: ${validation.summary.tCodesFound}/${validation.summary.tCodesExpected}`
      );
      content.push(
        `   Values Found: ${validation.summary.valuesFound}/${validation.summary.valuesExpected}`
      );
      content.push(`   SQL Rows: ${validation.summary.sqlRowsReturned}`);

      if (validation.errors.length > 0) {
        content.push("   Errors:");
        validation.errors.forEach((error) => {
          content.push(`     - ${error}`);
        });
      }

      if (validation.warnings.length > 0) {
        content.push("   Warnings:");
        validation.warnings.forEach((warning) => {
          content.push(`     - ${warning}`);
        });
      }
      content.push("");
    });

    return content.join("\n");
  }
}
