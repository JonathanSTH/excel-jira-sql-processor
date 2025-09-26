import { SqlService } from "./SqlService";
import { TicketRequirement, ParsedTicket } from "./TicketParserService";
import { ExcelSearchResult } from "./ExcelDataExtractor";

export interface ValidationResult {
  requirement: TicketRequirement;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sqlResults: any[];
  excelResults: ExcelSearchResult[];
  summary: {
    tCodesFound: number;
    tCodesExpected: number;
    valuesFound: number;
    valuesExpected: number;
    sqlRowsReturned: number;
  };
}

export interface TicketValidationReport {
  ticket: ParsedTicket;
  validationResults: ValidationResult[];
  overallStatus: "PASSED" | "FAILED" | "PARTIAL";
  summary: {
    totalRequirements: number;
    passedRequirements: number;
    failedRequirements: number;
    totalTCodes: number;
    validatedTCodes: number;
    totalValues: number;
    validatedValues: number;
  };
}

export class TicketValidationService {
  constructor(private sqlService: SqlService) {}

  /**
   * Validate a parsed ticket against SQL Server and Excel data
   */
  async validateTicket(
    parsedTicket: ParsedTicket,
    excelResults: ExcelSearchResult[]
  ): Promise<TicketValidationReport> {
    const validationResults: ValidationResult[] = [];

    for (const requirement of parsedTicket.requirements) {
      const validationResult = await this.validateRequirement(
        requirement,
        excelResults
      );
      validationResults.push(validationResult);
    }

    return this.generateTicketReport(parsedTicket, validationResults);
  }

  /**
   * Validate a single requirement
   */
  private async validateRequirement(
    requirement: TicketRequirement,
    excelResults: ExcelSearchResult[]
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let sqlResults: any[] = [];
    let isValid = true;

    try {
      // Execute SQL validation query
      if (requirement.tCodes.length > 0) {
        const sqlQuery = this.generateValidationQuery(requirement);
        sqlResults = await this.sqlService.executeQuery(sqlQuery);
      }
    } catch (error) {
      errors.push(
        `SQL validation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      isValid = false;
    }

    // Validate T-Codes in SQL results
    const tCodesFound = this.validateTCodesInSQL(
      requirement.tCodes,
      sqlResults,
      errors,
      warnings
    );

    // Validate values in SQL results
    const valuesFound = this.validateValuesInSQL(
      requirement.values,
      sqlResults,
      errors,
      warnings
    );

    // Validate Excel data
    const excelValidation = this.validateExcelData(
      requirement,
      excelResults,
      errors,
      warnings
    );

    // Determine overall validity
    if (errors.length > 0) {
      isValid = false;
    }

    return {
      requirement,
      isValid,
      errors,
      warnings,
      sqlResults,
      excelResults: excelValidation,
      summary: {
        tCodesFound,
        tCodesExpected: requirement.tCodes.length,
        valuesFound,
        valuesExpected: requirement.values.length,
        sqlRowsReturned: sqlResults.length,
      },
    };
  }

  /**
   * Generate validation SQL query for a requirement
   */
  private generateValidationQuery(requirement: TicketRequirement): string {
    const tCodesStr = requirement.tCodes.join("/");
    const valuesStr =
      requirement.values.length > 0 ? requirement.values.join("/") : "";

    return `
DECLARE @SearchTcodes VARCHAR(500) = '${tCodesStr}';
DECLARE @SearchValues VARCHAR(1000) = '${valuesStr}';
DECLARE @SearchTable VARCHAR(100) = '${requirement.tableName}';
DECLARE @SearchSchema VARCHAR(50) = '${requirement.schemaName}';
DECLARE @Delimiter VARCHAR(10) = '/';
DECLARE @JoinColumn VARCHAR(50) = 'tCode';

DECLARE @SQL NVARCHAR(MAX) = '';

-- Build dynamic SQL to search all columns across multiple tcodes and multiple values
SELECT @SQL = @SQL + 
    'UNION ALL SELECT ' + @JoinColumn + ', ''' + @SearchTable + ''' as table_name, ''' + COLUMN_NAME + ''' as column_name, CAST(' + COLUMN_NAME + ' AS VARCHAR(50)) as found_value, * FROM ' + @SearchSchema + '.' + @SearchTable + ' WHERE ' + @JoinColumn + ' IN (''' + REPLACE(@SearchTcodes, @Delimiter, ''',''') + ''')' +
    CASE 
        WHEN @SearchValues != '' THEN ' AND (' + 
            STUFF((
                SELECT ' OR CAST(' + COLUMN_NAME + ' AS VARCHAR(50)) LIKE ''%' + value + '%'''
                FROM STRING_SPLIT(@SearchValues, @Delimiter)
                FOR XML PATH('')
            ), 1, 4, '') + ')'
        ELSE ''
    END + ' '
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @SearchSchema
    AND TABLE_NAME = @SearchTable
    AND DATA_TYPE NOT IN ('text', 'ntext', 'image');

SET @SQL = STUFF(@SQL, 1, 10, '');
EXEC sp_executesql @SQL;
    `.trim();
  }

  /**
   * Validate T-Codes in SQL results
   */
  private validateTCodesInSQL(
    expectedTCodes: string[],
    sqlResults: any[],
    errors: string[],
    warnings: string[]
  ): number {
    const foundTCodes = new Set<string>();

    sqlResults.forEach((row) => {
      if (row.tCode) {
        foundTCodes.add(row.tCode);
      }
    });

    expectedTCodes.forEach((tCode) => {
      if (!foundTCodes.has(tCode)) {
        errors.push(`T-Code ${tCode} not found in SQL results`);
      }
    });

    return foundTCodes.size;
  }

  /**
   * Validate values in SQL results
   */
  private validateValuesInSQL(
    expectedValues: string[],
    sqlResults: any[],
    errors: string[],
    warnings: string[]
  ): number {
    if (expectedValues.length === 0) {
      return 0;
    }

    const foundValues = new Set<string>();

    sqlResults.forEach((row) => {
      Object.values(row).forEach((value) => {
        if (value && typeof value === "string") {
          expectedValues.forEach((expectedValue) => {
            if (value.includes(expectedValue)) {
              foundValues.add(expectedValue);
            }
          });
        }
      });
    });

    expectedValues.forEach((value) => {
      if (!foundValues.has(value)) {
        warnings.push(`Value "${value}" not found in SQL results`);
      }
    });

    return foundValues.size;
  }

  /**
   * Validate Excel data
   */
  private validateExcelData(
    requirement: TicketRequirement,
    excelResults: ExcelSearchResult[],
    errors: string[],
    warnings: string[]
  ): ExcelSearchResult[] {
    const relevantResults: ExcelSearchResult[] = [];

    excelResults.forEach((result) => {
      const relevantMatches = result.matches.filter((match) =>
        requirement.tCodes.some((tCode) => match.tCode === tCode)
      );

      if (relevantMatches.length > 0) {
        relevantResults.push({
          ...result,
          matches: relevantMatches,
        });
      }
    });

    if (requirement.excelFile && relevantResults.length === 0) {
      warnings.push(
        `Excel file ${requirement.excelFile} referenced but no matching data found`
      );
    }

    return relevantResults;
  }

  /**
   * Generate ticket validation report
   */
  private generateTicketReport(
    parsedTicket: ParsedTicket,
    validationResults: ValidationResult[]
  ): TicketValidationReport {
    let totalRequirements = validationResults.length;
    let passedRequirements = 0;
    let failedRequirements = 0;
    let totalTCodes = 0;
    let validatedTCodes = 0;
    let totalValues = 0;
    let validatedValues = 0;

    validationResults.forEach((result) => {
      if (result.isValid) {
        passedRequirements++;
      } else {
        failedRequirements++;
      }

      totalTCodes += result.summary.tCodesExpected;
      validatedTCodes += result.summary.tCodesFound;
      totalValues += result.summary.valuesExpected;
      validatedValues += result.summary.valuesFound;
    });

    let overallStatus: "PASSED" | "FAILED" | "PARTIAL";
    if (failedRequirements === 0) {
      overallStatus = "PASSED";
    } else if (passedRequirements === 0) {
      overallStatus = "FAILED";
    } else {
      overallStatus = "PARTIAL";
    }

    return {
      ticket: parsedTicket,
      validationResults,
      overallStatus,
      summary: {
        totalRequirements,
        passedRequirements,
        failedRequirements,
        totalTCodes,
        validatedTCodes,
        totalValues,
        validatedValues,
      },
    };
  }

  /**
   * Generate comprehensive validation report
   */
  generateValidationReport(ticketReports: TicketValidationReport[]): string {
    const report: string[] = [];

    report.push("=== TICKET VALIDATION REPORT ===\n");

    let totalTickets = ticketReports.length;
    let passedTickets = 0;
    let failedTickets = 0;
    let partialTickets = 0;
    let totalRequirements = 0;
    let passedRequirements = 0;
    let failedRequirements = 0;
    let totalTCodes = 0;
    let validatedTCodes = 0;

    ticketReports.forEach((ticketReport, index) => {
      report.push(
        `--- Ticket ${index + 1}: ${ticketReport.ticket.ticket.key} ---`
      );
      report.push(`Summary: ${ticketReport.ticket.ticket.summary}`);
      report.push(`Overall Status: ${ticketReport.overallStatus}`);
      report.push(`Requirements: ${ticketReport.summary.totalRequirements}`);
      report.push(`Passed: ${ticketReport.summary.passedRequirements}`);
      report.push(`Failed: ${ticketReport.summary.failedRequirements}`);
      report.push(
        `T-Codes: ${ticketReport.summary.validatedTCodes}/${ticketReport.summary.totalTCodes}`
      );

      totalTickets++;
      totalRequirements += ticketReport.summary.totalRequirements;
      passedRequirements += ticketReport.summary.passedRequirements;
      failedRequirements += ticketReport.summary.failedRequirements;
      totalTCodes += ticketReport.summary.totalTCodes;
      validatedTCodes += ticketReport.summary.validatedTCodes;

      if (ticketReport.overallStatus === "PASSED") {
        passedTickets++;
      } else if (ticketReport.overallStatus === "FAILED") {
        failedTickets++;
      } else {
        partialTickets++;
      }

      // Show detailed validation results
      ticketReport.validationResults.forEach((validation, reqIndex) => {
        report.push(
          `\n  Requirement ${reqIndex + 1}: ${validation.requirement.type}`
        );
        report.push(
          `    T-Codes: ${validation.summary.tCodesFound}/${validation.summary.tCodesExpected}`
        );
        report.push(
          `    Values: ${validation.summary.valuesFound}/${validation.summary.valuesExpected}`
        );
        report.push(`    SQL Rows: ${validation.summary.sqlRowsReturned}`);
        report.push(`    Status: ${validation.isValid ? "PASSED" : "FAILED"}`);

        if (validation.errors.length > 0) {
          report.push("    Errors:");
          validation.errors.forEach((error) => {
            report.push(`      - ${error}`);
          });
        }

        if (validation.warnings.length > 0) {
          report.push("    Warnings:");
          validation.warnings.forEach((warning) => {
            report.push(`      - ${warning}`);
          });
        }
      });

      report.push("");
    });

    // Overall summary
    report.push("=== OVERALL SUMMARY ===");
    report.push(`Total Tickets: ${totalTickets}`);
    report.push(
      `Passed: ${passedTickets} (${(
        (passedTickets / totalTickets) *
        100
      ).toFixed(1)}%)`
    );
    report.push(
      `Failed: ${failedTickets} (${(
        (failedTickets / totalTickets) *
        100
      ).toFixed(1)}%)`
    );
    report.push(
      `Partial: ${partialTickets} (${(
        (partialTickets / totalTickets) *
        100
      ).toFixed(1)}%)`
    );
    report.push(`Total Requirements: ${totalRequirements}`);
    report.push(
      `Passed Requirements: ${passedRequirements} (${(
        (passedRequirements / totalRequirements) *
        100
      ).toFixed(1)}%)`
    );
    report.push(
      `Failed Requirements: ${failedRequirements} (${(
        (failedRequirements / totalRequirements) *
        100
      ).toFixed(1)}%)`
    );
    report.push(
      `T-Codes Validated: ${validatedTCodes}/${totalTCodes} (${(
        (validatedTCodes / totalTCodes) *
        100
      ).toFixed(1)}%)`
    );

    return report.join("\n");
  }
}
