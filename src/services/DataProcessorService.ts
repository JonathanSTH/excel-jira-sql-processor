import {
  ExcelData,
  JiraTicket,
  ProcessedData,
  SqlValidationResult,
} from "../types";
import { ExcelService } from "./ExcelService";
import { SqlService, ValidationRule } from "./SqlService";
import { JiraService } from "./JiraService";
import {
  DataValidationService,
  ValidationResult,
} from "./DataValidationService";

export interface IDataProcessorService {
  processData(): Promise<ProcessedData>;
  generateOutputData(processedData: ProcessedData): Record<string, any>[];
}

export class DataProcessorService implements IDataProcessorService {
  constructor(
    private excelService: ExcelService,
    private sqlService: SqlService,
    private jiraService: JiraService,
    private validationService: DataValidationService,
    private config: {
      inputExcelPath: string;
      outputExcelPath: string;
      jiraProjectKey?: string;
      sqlValidationRules?: ValidationRule[];
    }
  ) {}

  /**
   * Main data processing orchestration
   */
  async processData(): Promise<ProcessedData> {
    try {
      // Step 1: Read Excel data
      console.log("Reading Excel data...");
      const excelData = this.excelService.readExcel(this.config.inputExcelPath);

      // Validate Excel structure
      const excelValidation =
        this.excelService.validateExcelStructure(excelData);
      if (!excelValidation.isValid) {
        throw new Error(
          `Excel validation failed: ${excelValidation.errors.join(", ")}`
        );
      }

      // Step 2: Connect to SQL Server
      console.log("Connecting to SQL Server...");
      await this.sqlService.connect();

      // Step 3: Validate data against SQL Server
      console.log("Validating data against SQL Server...");
      const sqlValidationResults = await this.validateDataInSql(excelData);

      // Step 4: Fetch JIRA tickets
      console.log("Fetching JIRA tickets...");
      const jiraTickets = await this.fetchJiraTickets(excelData);

      // Step 5: Cross-validate all data
      console.log("Cross-validating data...");
      const processedData: ProcessedData = {
        excelData,
        jiraTickets,
        validationResults: sqlValidationResults,
        outputData: [],
      };

      return processedData;
    } catch (error) {
      throw new Error(
        `Data processing failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      await this.sqlService.disconnect();
    }
  }

  /**
   * Generate output data for Excel export
   */
  generateOutputData(processedData: ProcessedData): Record<string, any>[] {
    const outputData: Record<string, any>[] = [];

    // Combine Excel data with JIRA and SQL validation results
    processedData.excelData.forEach((sheet) => {
      sheet.rows.forEach((row, index) => {
        const outputRow: Record<string, any> = { ...row };

        // Add JIRA ticket information
        const ticketKey = this.findTicketKeyInRow(row);
        if (ticketKey) {
          const jiraTicket = processedData.jiraTickets.find(
            (t) => t.key === ticketKey
          );
          if (jiraTicket) {
            outputRow.jira_summary = jiraTicket.summary;
            outputRow.jira_status = jiraTicket.status;
            outputRow.jira_assignee = jiraTicket.assignee;
            outputRow.jira_priority = jiraTicket.priority;
            outputRow.jira_created = jiraTicket.created;
            outputRow.jira_updated = jiraTicket.updated;
          }
        }

        // Add validation status
        outputRow.validation_status = processedData.validationResults.isValid
          ? "VALID"
          : "INVALID";
        outputRow.validation_errors = processedData.validationResults.errors
          .filter((error) => error.includes(`Row ${index + 1}`))
          .join("; ");

        // Add data source indicators
        outputRow.data_source = "EXCEL";
        outputRow.processed_timestamp = new Date().toISOString();

        outputData.push(outputRow);
      });
    });

    return outputData;
  }

  /**
   * Validate Excel data against SQL Server
   */
  private async validateDataInSql(
    excelData: ExcelData[]
  ): Promise<SqlValidationResult> {
    const allRows: any[] = [];

    // Flatten all Excel data
    excelData.forEach((sheet) => {
      allRows.push(...sheet.rows);
    });

    if (allRows.length === 0) {
      return {
        isValid: true,
        errors: [],
        warnings: ["No data to validate"],
        validatedData: [],
      };
    }

    // Create validation rules if not provided
    const validationRules =
      this.config.sqlValidationRules ||
      this.createDefaultValidationRules(allRows[0]);

    // Perform validation
    return await this.sqlService.validateData(allRows, validationRules);
  }

  /**
   * Fetch relevant JIRA tickets
   */
  private async fetchJiraTickets(
    excelData: ExcelData[]
  ): Promise<JiraTicket[]> {
    const ticketKeys = new Set<string>();

    // Extract ticket keys from Excel data
    excelData.forEach((sheet) => {
      sheet.rows.forEach((row) => {
        const ticketKey = this.findTicketKeyInRow(row);
        if (ticketKey) {
          ticketKeys.add(ticketKey);
        }
      });
    });

    const jiraTickets: JiraTicket[] = [];

    // Fetch each ticket individually (better error handling)
    for (const ticketKey of ticketKeys) {
      try {
        const ticket = await this.jiraService.getTicket(ticketKey);
        jiraTickets.push(ticket);
      } catch (error) {
        console.warn(`Failed to fetch JIRA ticket ${ticketKey}:`, error);
      }
    }

    // If no specific tickets found, fetch project tickets
    if (ticketKeys.size === 0 && this.config.jiraProjectKey) {
      try {
        const projectTickets = await this.jiraService.getProjectTickets(
          this.config.jiraProjectKey
        );
        jiraTickets.push(...projectTickets);
      } catch (error) {
        console.warn(`Failed to fetch JIRA project tickets:`, error);
      }
    }

    return jiraTickets;
  }

  /**
   * Find JIRA ticket key in Excel row
   */
  private findTicketKeyInRow(row: Record<string, any>): string | null {
    const possibleKeys = [
      "ticket",
      "ticket_key",
      "jira_key",
      "issue_key",
      "key",
      "ticket_id",
      "jira_id",
      "issue_id",
      "id",
    ];

    for (const key of possibleKeys) {
      const value = row[key];
      if (value && typeof value === "string") {
        if (/^[A-Z]+-\d+$/.test(value.trim())) {
          return value.trim();
        }
      }
    }

    // Search in all values for JIRA key pattern
    for (const [key, value] of Object.entries(row)) {
      if (value && typeof value === "string") {
        const match = value.match(/([A-Z]+-\d+)/);
        if (match) {
          return match[1];
        }
      }
    }

    return null;
  }

  /**
   * Create default validation rules based on data structure
   */
  private createDefaultValidationRules(sampleRow: any): ValidationRule[] {
    const rules: ValidationRule[] = [];

    Object.keys(sampleRow).forEach((field) => {
      const value = sampleRow[field];

      if (typeof value === "string") {
        if (field.toLowerCase().includes("email")) {
          rules.push({
            field,
            type: "email",
            required: false,
          });
        } else {
          rules.push({
            field,
            type: "string",
            required: false,
            minLength: 0,
            maxLength: 1000,
          });
        }
      } else if (typeof value === "number") {
        rules.push({
          field,
          type: "number",
          required: false,
        });
      } else if (
        value instanceof Date ||
        (typeof value === "string" && !isNaN(Date.parse(value)))
      ) {
        rules.push({
          field,
          type: "date",
          required: false,
        });
      }
    });

    return rules;
  }

  /**
   * Generate comprehensive validation report
   */
  async generateValidationReport(
    processedData: ProcessedData
  ): Promise<string> {
    const validationResults: ValidationResult[] = [];

    // SQL validation result
    const sqlValidation: ValidationResult = {
      isValid: processedData.validationResults.isValid,
      errors: processedData.validationResults.errors,
      warnings: processedData.validationResults.warnings,
      summary: {
        totalRecords: processedData.validationResults.validatedData.length,
        validRecords: processedData.validationResults.isValid
          ? processedData.validationResults.validatedData.length
          : 0,
        invalidRecords: processedData.validationResults.errors.length,
        warningRecords: processedData.validationResults.warnings.length,
      },
    };
    validationResults.push(sqlValidation);

    // Excel-JIRA mapping validation
    const mappingValidation = this.validationService.validateExcelJiraMapping(
      processedData.excelData,
      processedData.jiraTickets
    );
    validationResults.push(mappingValidation);

    return this.validationService.generateValidationReport(validationResults);
  }
}
