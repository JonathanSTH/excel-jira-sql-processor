import * as XLSX from "xlsx";
import { FileUtils } from "../utils/FileUtils";

export interface ExcelDataMatch {
  tCode: string;
  row: number;
  column: string;
  value: any;
  sheetName: string;
  filePath: string;
}

export interface ExcelSearchResult {
  filePath: string;
  matches: ExcelDataMatch[];
  totalRows: number;
  sheetsProcessed: number;
}

export class ExcelDataExtractor {
  /**
   * Search for T-Codes in Excel files
   */
  async searchTCodesInExcel(
    filePath: string,
    tCodes: string[]
  ): Promise<ExcelSearchResult> {
    try {
      if (!FileUtils.fileExists(filePath)) {
        throw new Error(`Excel file not found: ${filePath}`);
      }

      if (!FileUtils.isValidExcelFile(filePath)) {
        throw new Error(`Invalid Excel file format: ${filePath}`);
      }

      const workbook = XLSX.readFile(filePath);
      const matches: ExcelDataMatch[] = [];
      let totalRows = 0;
      let sheetsProcessed = 0;

      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length === 0) return;

        sheetsProcessed++;
        totalRows += jsonData.length;

        // Search for T-Codes in each cell
        jsonData.forEach((row: any[], rowIndex) => {
          row.forEach((cellValue, colIndex) => {
            if (cellValue && typeof cellValue === "string") {
              tCodes.forEach((tCode) => {
                if (cellValue.includes(tCode)) {
                  const columnName = this.getColumnName(colIndex);
                  matches.push({
                    tCode,
                    row: rowIndex + 1,
                    column: columnName,
                    value: cellValue,
                    sheetName,
                    filePath,
                  });
                }
              });
            }
          });
        });
      });

      return {
        filePath,
        matches,
        totalRows,
        sheetsProcessed,
      };
    } catch (error) {
      throw new Error(
        `Failed to search Excel file ${filePath}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Search for values in Excel files
   */
  async searchValuesInExcel(
    filePath: string,
    values: string[]
  ): Promise<ExcelSearchResult> {
    try {
      if (!FileUtils.fileExists(filePath)) {
        throw new Error(`Excel file not found: ${filePath}`);
      }

      const workbook = XLSX.readFile(filePath);
      const matches: ExcelDataMatch[] = [];
      let totalRows = 0;
      let sheetsProcessed = 0;

      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length === 0) return;

        sheetsProcessed++;
        totalRows += jsonData.length;

        // Search for values in each cell
        jsonData.forEach((row: any[], rowIndex) => {
          row.forEach((cellValue, colIndex) => {
            if (cellValue && typeof cellValue === "string") {
              values.forEach((value) => {
                if (cellValue.includes(value)) {
                  const columnName = this.getColumnName(colIndex);
                  matches.push({
                    tCode: "", // Not a T-Code search
                    row: rowIndex + 1,
                    column: columnName,
                    value: cellValue,
                    sheetName,
                    filePath,
                  });
                }
              });
            }
          });
        });
      });

      return {
        filePath,
        matches,
        totalRows,
        sheetsProcessed,
      };
    } catch (error) {
      throw new Error(
        `Failed to search Excel file ${filePath}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Extract data for specific T-Codes from Excel
   */
  async extractDataForTCodes(
    filePath: string,
    tCodes: string[]
  ): Promise<Record<string, any[]>> {
    try {
      const workbook = XLSX.readFile(filePath);
      const extractedData: Record<string, any[]> = {};

      // Initialize data structure for each T-Code
      tCodes.forEach((tCode) => {
        extractedData[tCode] = [];
      });

      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length === 0) return;

        const headers = jsonData[0] as string[];

        // Process each row
        jsonData.slice(1).forEach((row: any[], rowIndex) => {
          const rowData: Record<string, any> = {};
          headers.forEach((header, colIndex) => {
            rowData[header] = row[colIndex] || "";
          });

          // Check if this row contains any of our T-Codes
          tCodes.forEach((tCode) => {
            const hasTCode = Object.values(rowData).some(
              (value) =>
                value && typeof value === "string" && value.includes(tCode)
            );

            if (hasTCode) {
              extractedData[tCode].push({
                ...rowData,
                _sheetName: sheetName,
                _rowNumber: rowIndex + 2, // +2 because we skipped header and 0-indexed
              });
            }
          });
        });
      });

      return extractedData;
    } catch (error) {
      throw new Error(
        `Failed to extract data from Excel file ${filePath}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Find Excel files in a directory
   */
  async findExcelFiles(directory: string): Promise<string[]> {
    try {
      const fs = require("fs");
      const path = require("path");

      if (!fs.existsSync(directory)) {
        return [];
      }

      const files = fs.readdirSync(directory);
      const excelFiles: string[] = [];

      files.forEach((file: string) => {
        const filePath = path.join(directory, file);
        const stat = fs.statSync(filePath);

        if (stat.isFile() && FileUtils.isValidExcelFile(filePath)) {
          excelFiles.push(filePath);
        }
      });

      return excelFiles;
    } catch (error) {
      throw new Error(
        `Failed to find Excel files in directory ${directory}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Search for Excel files by name pattern
   */
  async findExcelFilesByName(
    searchDirectory: string,
    fileNamePattern: string
  ): Promise<string[]> {
    try {
      const fs = require("fs");
      const path = require("path");

      if (!fs.existsSync(searchDirectory)) {
        return [];
      }

      const files = fs.readdirSync(searchDirectory);
      const excelFiles: string[] = [];

      files.forEach((file: string) => {
        const filePath = path.join(searchDirectory, file);
        const stat = fs.statSync(filePath);

        if (
          stat.isFile() &&
          FileUtils.isValidExcelFile(filePath) &&
          file.toLowerCase().includes(fileNamePattern.toLowerCase())
        ) {
          excelFiles.push(filePath);
        }
      });

      return excelFiles;
    } catch (error) {
      throw new Error(
        `Failed to find Excel files by name pattern ${fileNamePattern}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Get column name from index (A, B, C, etc.)
   */
  private getColumnName(index: number): string {
    let result = "";
    while (index >= 0) {
      result = String.fromCharCode(65 + (index % 26)) + result;
      index = Math.floor(index / 26) - 1;
    }
    return result;
  }

  /**
   * Generate Excel search report
   */
  generateSearchReport(results: ExcelSearchResult[]): string {
    const report: string[] = [];

    report.push("=== EXCEL SEARCH REPORT ===\n");

    let totalFiles = 0;
    let totalMatches = 0;
    let totalRows = 0;
    let totalSheets = 0;

    results.forEach((result, index) => {
      report.push(`--- File ${index + 1}: ${result.filePath} ---`);
      report.push(`Sheets Processed: ${result.sheetsProcessed}`);
      report.push(`Total Rows: ${result.totalRows}`);
      report.push(`Matches Found: ${result.matches.length}`);

      totalFiles++;
      totalMatches += result.matches.length;
      totalRows += result.totalRows;
      totalSheets += result.sheetsProcessed;

      if (result.matches.length > 0) {
        report.push("Matches:");
        result.matches.forEach((match, matchIndex) => {
          report.push(
            `  ${matchIndex + 1}. T-Code: ${match.tCode}, Sheet: ${
              match.sheetName
            }, Row: ${match.row}, Column: ${match.column}`
          );
          report.push(`     Value: ${match.value}`);
        });
      }

      report.push("");
    });

    report.push("=== OVERALL SUMMARY ===");
    report.push(`Total Files Searched: ${totalFiles}`);
    report.push(`Total Sheets Processed: ${totalSheets}`);
    report.push(`Total Rows Processed: ${totalRows}`);
    report.push(`Total Matches Found: ${totalMatches}`);

    return report.join("\n");
  }
}
