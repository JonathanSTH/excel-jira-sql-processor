import {
  ExcelData,
  JiraTicket,
  SqlValidationResult,
  ProcessedData,
} from "../types";
import { ValidationRule } from "./SecureSqlService";

export interface ISecureValidationService {
  validateExcelJiraMapping(
    excelData: ExcelData[],
    jiraTickets: JiraTicket[]
  ): ValidationResult;
  crossValidateData(processedData: ProcessedData): ValidationResult;
  generateValidationReport(validationResults: ValidationResult[]): string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
    warningRecords: number;
  };
}

// Simple validation functions (no external libraries needed)
function isValidJiraTicket(ticket: any): boolean {
  return (
    ticket &&
    typeof ticket.key === "string" &&
    ticket.key.length > 0 &&
    typeof ticket.summary === "string" &&
    typeof ticket.status === "string" &&
    typeof ticket.priority === "string" &&
    typeof ticket.created === "string" &&
    typeof ticket.updated === "string"
  );
}

function isValidExcelData(data: any): boolean {
  return (
    data &&
    typeof data.sheetName === "string" &&
    Array.isArray(data.headers) &&
    Array.isArray(data.rows)
  );
}

export class SecureValidationService implements ISecureValidationService {
  /**
   * Validate mapping between Excel data and JIRA tickets
   */
  validateExcelJiraMapping(
    excelData: ExcelData[],
    jiraTickets: JiraTicket[]
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let totalRecords = 0;
    let validRecords = 0;
    let invalidRecords = 0;
    let warningRecords = 0;

    // Validate JIRA tickets with simple validation
    const validatedJiraTickets = jiraTickets.filter((ticket) => {
      if (!isValidJiraTicket(ticket)) {
        errors.push(
          `Invalid JIRA ticket ${
            ticket.key || "unknown"
          }: missing required fields`
        );
        return false;
      }
      return true;
    });

    // Create a map of JIRA tickets for quick lookup
    const jiraTicketMap = new Map<string, JiraTicket>();
    validatedJiraTickets.forEach((ticket) => {
      jiraTicketMap.set(ticket.key, ticket);
    });

    excelData.forEach((sheet) => {
      // Validate Excel data with simple validation
      if (!isValidExcelData(sheet)) {
        errors.push(
          `Invalid Excel sheet '${
            sheet.sheetName || "unknown"
          }': missing required fields`
        );
        return;
      }

      sheet.rows.forEach((row, index) => {
        totalRecords++;
        const rowErrors: string[] = [];
        const rowWarnings: string[] = [];

        // Check for JIRA ticket key in Excel data
        const ticketKey = this.findTicketKeyInRow(row);
        if (!ticketKey) {
          rowErrors.push(`No JIRA ticket key found in row ${index + 1}`);
          invalidRecords++;
        } else {
          const jiraTicket = jiraTicketMap.get(ticketKey);
          if (!jiraTicket) {
            rowErrors.push(`JIRA ticket ${ticketKey} not found in JIRA data`);
            invalidRecords++;
          } else {
            // Validate data consistency between Excel and JIRA
            const consistencyCheck = this.validateDataConsistency(
              row,
              jiraTicket
            );
            rowErrors.push(...consistencyCheck.errors);
            rowWarnings.push(...consistencyCheck.warnings);

            if (rowErrors.length === 0) {
              validRecords++;
            } else {
              invalidRecords++;
            }

            if (rowWarnings.length > 0) {
              warningRecords++;
            }
          }
        }

        if (rowErrors.length > 0) {
          errors.push(
            `Sheet '${sheet.sheetName}', Row ${index + 1}: ${rowErrors.join(
              ", "
            )}`
          );
        }

        if (rowWarnings.length > 0) {
          warnings.push(
            `Sheet '${sheet.sheetName}', Row ${index + 1}: ${rowWarnings.join(
              ", "
            )}`
          );
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalRecords,
        validRecords,
        invalidRecords,
        warningRecords,
      },
    };
  }

  /**
   * Cross-validate all data sources
   */
  crossValidateData(processedData: ProcessedData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let totalRecords = 0;
    let validRecords = 0;
    let invalidRecords = 0;
    let warningRecords = 0;

    // Validate SQL data
    if (processedData.validationResults.isValid) {
      validRecords += processedData.validationResults.validatedData.length;
    } else {
      invalidRecords += processedData.validationResults.errors.length;
      errors.push(...processedData.validationResults.errors);
    }

    warnings.push(...processedData.validationResults.warnings);
    if (processedData.validationResults.warnings.length > 0) {
      warningRecords += processedData.validationResults.warnings.length;
    }

    // Validate Excel-JIRA mapping
    const mappingValidation = this.validateExcelJiraMapping(
      processedData.excelData,
      processedData.jiraTickets
    );

    totalRecords += mappingValidation.summary.totalRecords;
    validRecords += mappingValidation.summary.validRecords;
    invalidRecords += mappingValidation.summary.invalidRecords;
    warningRecords += mappingValidation.summary.warningRecords;

    errors.push(...mappingValidation.errors);
    warnings.push(...mappingValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalRecords,
        validRecords,
        invalidRecords,
        warningRecords,
      },
    };
  }

  /**
   * Generate a comprehensive validation report
   */
  generateValidationReport(validationResults: ValidationResult[]): string {
    const report: string[] = [];

    report.push("=== DATA VALIDATION REPORT ===\n");

    let totalRecords = 0;
    let totalValidRecords = 0;
    let totalInvalidRecords = 0;
    let totalWarningRecords = 0;

    validationResults.forEach((result, index) => {
      report.push(`--- Validation ${index + 1} ---`);
      report.push(`Status: ${result.isValid ? "PASSED" : "FAILED"}`);
      report.push(`Total Records: ${result.summary.totalRecords}`);
      report.push(`Valid Records: ${result.summary.validRecords}`);
      report.push(`Invalid Records: ${result.summary.invalidRecords}`);
      report.push(`Warning Records: ${result.summary.warningRecords}`);

      totalRecords += result.summary.totalRecords;
      totalValidRecords += result.summary.validRecords;
      totalInvalidRecords += result.summary.invalidRecords;
      totalWarningRecords += result.summary.warningRecords;

      if (result.errors.length > 0) {
        report.push("\nErrors:");
        result.errors.forEach((error) => report.push(`  - ${error}`));
      }

      if (result.warnings.length > 0) {
        report.push("\nWarnings:");
        result.warnings.forEach((warning) => report.push(`  - ${warning}`));
      }

      report.push("\n");
    });

    // Overall summary
    report.push("=== OVERALL SUMMARY ===");
    report.push(`Total Records Processed: ${totalRecords}`);
    report.push(
      `Valid Records: ${totalValidRecords} (${(
        (totalValidRecords / totalRecords) *
        100
      ).toFixed(2)}%)`
    );
    report.push(
      `Invalid Records: ${totalInvalidRecords} (${(
        (totalInvalidRecords / totalRecords) *
        100
      ).toFixed(2)}%)`
    );
    report.push(
      `Warning Records: ${totalWarningRecords} (${(
        (totalWarningRecords / totalRecords) *
        100
      ).toFixed(2)}%)`
    );

    const overallStatus = totalInvalidRecords === 0 ? "PASSED" : "FAILED";
    report.push(`Overall Status: ${overallStatus}`);

    return report.join("\n");
  }

  /**
   * Find JIRA ticket key in Excel row data
   */
  private findTicketKeyInRow(row: Record<string, any>): string | null {
    // Look for common JIRA key patterns
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
        // Check if it matches JIRA key pattern (e.g., PROJ-123)
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
   * Validate data consistency between Excel row and JIRA ticket
   */
  private validateDataConsistency(
    row: Record<string, any>,
    jiraTicket: JiraTicket
  ): {
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check summary consistency
    const excelSummary = row.summary || row.title || row.description;
    if (excelSummary && jiraTicket.summary) {
      if (excelSummary.toLowerCase() !== jiraTicket.summary.toLowerCase()) {
        warnings.push(
          `Summary mismatch: Excel="${excelSummary}" vs JIRA="${jiraTicket.summary}"`
        );
      }
    }

    // Check status consistency
    const excelStatus = row.status || row.state;
    if (excelStatus && jiraTicket.status) {
      if (excelStatus.toLowerCase() !== jiraTicket.status.toLowerCase()) {
        warnings.push(
          `Status mismatch: Excel="${excelStatus}" vs JIRA="${jiraTicket.status}"`
        );
      }
    }

    // Check assignee consistency
    const excelAssignee = row.assignee || row.assigned_to;
    if (excelAssignee && jiraTicket.assignee) {
      if (excelAssignee.toLowerCase() !== jiraTicket.assignee.toLowerCase()) {
        warnings.push(
          `Assignee mismatch: Excel="${excelAssignee}" vs JIRA="${jiraTicket.assignee}"`
        );
      }
    }

    // Check priority consistency
    const excelPriority = row.priority;
    if (excelPriority && jiraTicket.priority) {
      if (excelPriority.toLowerCase() !== jiraTicket.priority.toLowerCase()) {
        warnings.push(
          `Priority mismatch: Excel="${excelPriority}" vs JIRA="${jiraTicket.priority}"`
        );
      }
    }

    return { errors, warnings };
  }

  /**
   * Create validation rules based on data structure (simple JavaScript)
   */
  createValidationRules(sampleData: any[]): ValidationRule[] {
    if (sampleData.length === 0) return [];

    const rules: ValidationRule[] = [];
    const sample = sampleData[0];

    Object.keys(sample).forEach((field) => {
      const value = sample[field];

      if (typeof value === "string") {
        if (field.toLowerCase().includes("email")) {
          rules.push({
            field,
            type: "email",
            required: true,
          });
        } else {
          rules.push({
            field,
            type: "string",
            required: true,
            minLength: 1,
            maxLength: 1000,
          });
        }
      } else if (typeof value === "number") {
        rules.push({
          field,
          type: "number",
          required: true,
        });
      } else if (
        value instanceof Date ||
        (typeof value === "string" && !isNaN(Date.parse(value)))
      ) {
        rules.push({
          field,
          type: "date",
          required: true,
        });
      }
    });

    return rules;
  }

  /**
   * Simple validation function (no external libraries)
   */
  validateData(
    data: any,
    rules: ValidationRule[]
  ): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    rules.forEach((rule) => {
      const value = data[rule.field];

      // Check required field
      if (
        rule.required &&
        (value === null || value === undefined || value === "")
      ) {
        errors.push(`Field '${rule.field}' is required`);
        return;
      }

      // Skip validation if value is empty and not required
      if (
        !rule.required &&
        (value === null || value === undefined || value === "")
      ) {
        return;
      }

      // Type validation
      switch (rule.type) {
        case "string":
          if (typeof value !== "string") {
            errors.push(`Field '${rule.field}' must be a string`);
          } else {
            if (rule.minLength && value.length < rule.minLength) {
              errors.push(
                `Field '${rule.field}' must be at least ${rule.minLength} characters`
              );
            }
            if (rule.maxLength && value.length > rule.maxLength) {
              errors.push(
                `Field '${rule.field}' must be no more than ${rule.maxLength} characters`
              );
            }
          }
          break;

        case "number":
          const numValue = Number(value);
          if (isNaN(numValue)) {
            errors.push(`Field '${rule.field}' must be a number`);
          } else {
            if (rule.min !== undefined && numValue < rule.min) {
              errors.push(`Field '${rule.field}' must be at least ${rule.min}`);
            }
            if (rule.max !== undefined && numValue > rule.max) {
              errors.push(
                `Field '${rule.field}' must be no more than ${rule.max}`
              );
            }
          }
          break;

        case "date":
          const dateValue = new Date(value);
          if (isNaN(dateValue.getTime())) {
            errors.push(`Field '${rule.field}' must be a valid date`);
          }
          break;

        case "email":
          const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailPattern.test(value)) {
            errors.push(`Field '${rule.field}' must be a valid email address`);
          }
          break;

        case "custom":
          if (rule.customValidator && !rule.customValidator(value)) {
            errors.push(`Field '${rule.field}' failed custom validation`);
          }
          break;
      }

      // Pattern validation
      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push(`Field '${rule.field}' does not match required pattern`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
