import { JiraTicket } from "../types";

export interface TicketRequirement {
  type: "ADD" | "UPDATE" | "DELETE";
  tableName: string;
  schemaName: string;
  tCodes: string[];
  values: string[];
  description: string;
  excelFile?: string;
}

export interface ParsedTicket {
  ticket: JiraTicket;
  requirements: TicketRequirement[];
  excelFiles: string[];
  validationQueries: string[];
}

export class TicketParserService {
  /**
   * Parse JIRA ticket to extract data requirements
   */
  parseTicket(ticket: JiraTicket): ParsedTicket {
    const description =
      ticket.summary + " " + (ticket.customFields?.description || "");
    const requirements: TicketRequirement[] = [];
    const excelFiles: string[] = [];
    const validationQueries: string[] = [];

    // Extract Excel file references
    const excelMatches = description.match(/([A-Za-z0-9_-]+\.xlsx)/gi);
    if (excelMatches) {
      excelFiles.push(...excelMatches);
    }

    // Parse "Added:" sections
    const addedMatches = description.match(/Added:\s*([^:]+?)(?=\n|$)/gi);
    if (addedMatches) {
      addedMatches.forEach((match) => {
        const tCodes = this.extractTCodes(match);
        if (tCodes.length > 0) {
          requirements.push({
            type: "ADD",
            tableName: this.extractTableName(description),
            schemaName: this.extractSchemaName(description),
            tCodes,
            values: [],
            description: match.trim(),
            excelFile: excelFiles[0],
          });
        }
      });
    }

    // Parse "Updates:" sections
    const updateMatches = description.match(/Updates:\s*([^:]+?)(?=\n|$)/gi);
    if (updateMatches) {
      updateMatches.forEach((match) => {
        const tCodes = this.extractTCodes(match);
        const values = this.extractValues(match);
        if (tCodes.length > 0) {
          requirements.push({
            type: "UPDATE",
            tableName: this.extractTableName(description),
            schemaName: this.extractSchemaName(description),
            tCodes,
            values,
            description: match.trim(),
            excelFile: excelFiles[0],
          });
        }
      });
    }

    // Generate validation queries for each requirement
    requirements.forEach((req) => {
      const query = this.generateValidationQuery(req);
      validationQueries.push(query);
    });

    return {
      ticket,
      requirements,
      excelFiles,
      validationQueries,
    };
  }

  /**
   * Extract T-Codes from text (e.g., OH-VIO3, OH-VIO4)
   */
  private extractTCodes(text: string): string[] {
    const tCodePattern = /([A-Z]{2}-[A-Z0-9]+)/g;
    const matches = text.match(tCodePattern);
    return matches ? matches : [];
  }

  /**
   * Extract values from text (e.g., 0.023, Regional Income Tax Agency)
   */
  private extractValues(text: string): string[] {
    const values: string[] = [];

    // Extract numeric values
    const numericMatches = text.match(/\d+\.?\d*/g);
    if (numericMatches) {
      values.push(...numericMatches);
    }

    // Extract quoted strings
    const quotedMatches = text.match(/"([^"]+)"/g);
    if (quotedMatches) {
      values.push(...quotedMatches.map((q) => q.replace(/"/g, "")));
    }

    // Extract text after "updated to" or "changed to"
    const updateMatches = text.match(/(?:updated to|changed to)\s+([^,\n]+)/gi);
    if (updateMatches) {
      values.push(
        ...updateMatches.map((m) =>
          m.replace(/(?:updated to|changed to)\s+/gi, "").trim()
        )
      );
    }

    return values;
  }

  /**
   * Extract table name from description
   */
  private extractTableName(description: string): string {
    // Look for table references
    const tableMatches = description.match(
      /([A-Za-z]+Table|[A-Za-z]+_table)/gi
    );
    if (tableMatches) {
      return tableMatches[0].toLowerCase();
    }

    // Default table name
    return "sTaxTable";
  }

  /**
   * Extract schema name from description
   */
  private extractSchemaName(description: string): string {
    // Look for schema references
    const schemaMatches = description.match(
      /([A-Za-z]+Schema|[A-Za-z]+_schema)/gi
    );
    if (schemaMatches) {
      return schemaMatches[0].toLowerCase();
    }

    // Default schema name
    return "escher";
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
   * Parse multiple tickets
   */
  parseTickets(tickets: JiraTicket[]): ParsedTicket[] {
    return tickets.map((ticket) => this.parseTicket(ticket));
  }

  /**
   * Extract all unique table names from parsed tickets
   */
  extractTableNames(parsedTickets: ParsedTicket[]): string[] {
    const tableNames = new Set<string>();
    parsedTickets.forEach((parsed) => {
      parsed.requirements.forEach((req) => {
        tableNames.add(`${req.schemaName}.${req.tableName}`);
      });
    });
    return Array.from(tableNames);
  }

  /**
   * Extract all unique T-Codes from parsed tickets
   */
  extractAllTCodes(parsedTickets: ParsedTicket[]): string[] {
    const tCodes = new Set<string>();
    parsedTickets.forEach((parsed) => {
      parsed.requirements.forEach((req) => {
        req.tCodes.forEach((tCode) => tCodes.add(tCode));
      });
    });
    return Array.from(tCodes);
  }

  /**
   * Generate summary report of parsed tickets
   */
  generateParseSummary(parsedTickets: ParsedTicket[]): string {
    const summary: string[] = [];

    summary.push("=== TICKET PARSING SUMMARY ===\n");
    summary.push(`Total Tickets Parsed: ${parsedTickets.length}`);

    let totalRequirements = 0;
    let totalTCodes = 0;
    let totalExcelFiles = 0;

    parsedTickets.forEach((parsed, index) => {
      summary.push(`\n--- Ticket ${index + 1}: ${parsed.ticket.key} ---`);
      summary.push(`Summary: ${parsed.ticket.summary}`);
      summary.push(`Requirements: ${parsed.requirements.length}`);
      summary.push(
        `T-Codes: ${parsed.requirements.reduce(
          (sum, req) => sum + req.tCodes.length,
          0
        )}`
      );
      summary.push(`Excel Files: ${parsed.excelFiles.length}`);

      totalRequirements += parsed.requirements.length;
      totalTCodes += parsed.requirements.reduce(
        (sum, req) => sum + req.tCodes.length,
        0
      );
      totalExcelFiles += parsed.excelFiles.length;

      if (parsed.requirements.length > 0) {
        summary.push("Requirements:");
        parsed.requirements.forEach((req, reqIndex) => {
          summary.push(
            `  ${reqIndex + 1}. ${req.type}: ${req.tCodes.join(", ")}`
          );
          if (req.values.length > 0) {
            summary.push(`     Values: ${req.values.join(", ")}`);
          }
        });
      }
    });

    summary.push("\n=== OVERALL SUMMARY ===");
    summary.push(`Total Requirements: ${totalRequirements}`);
    summary.push(`Total T-Codes: ${totalTCodes}`);
    summary.push(`Total Excel Files: ${totalExcelFiles}`);

    return summary.join("\n");
  }
}
