import * as ExcelJS from "exceljs";
import { ExcelData } from "../types";

export interface ISecureExcelService {
  readExcel(filePath: string): Promise<ExcelData[]>;
  writeExcel(
    data: Record<string, any>[],
    filePath: string,
    sheetName?: string
  ): Promise<void>;
}

export class SecureExcelService implements ISecureExcelService {
  /**
   * Reads an Excel file and returns structured data for each sheet
   */
  async readExcel(filePath: string): Promise<ExcelData[]> {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      const result: ExcelData[] = [];

      workbook.worksheets.forEach((worksheet) => {
        if (worksheet.rowCount === 0) return;

        const headers: string[] = [];
        const rows: Record<string, any>[] = [];

        // Get headers from first row
        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell, colNumber) => {
          headers[colNumber - 1] = cell.text || `Column${colNumber}`;
        });

        // Get data rows
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // Skip header row

          const rowData: Record<string, any> = {};
          row.eachCell((cell, colNumber) => {
            const header = headers[colNumber - 1];
            if (header) {
              rowData[header] = cell.value || "";
            }
          });
          rows.push(rowData);
        });

        result.push({
          sheetName: worksheet.name,
          headers,
          rows,
        });
      });

      return result;
    } catch (error) {
      throw new Error(
        `Failed to read Excel file: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Writes data to an Excel file
   */
  async writeExcel(
    data: Record<string, any>[],
    filePath: string,
    sheetName: string = "Sheet1"
  ): Promise<void> {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(sheetName);

      if (data.length === 0) {
        await workbook.xlsx.writeFile(filePath);
        return;
      }

      // Add headers
      const headers = Object.keys(data[0]);
      worksheet.addRow(headers);

      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      // Add data rows
      data.forEach((row) => {
        const values = headers.map((header) => row[header] || "");
        worksheet.addRow(values);
      });

      // Auto-fit columns
      worksheet.columns.forEach((column) => {
        column.width = Math.max(column.width || 10, 15);
      });

      await workbook.xlsx.writeFile(filePath);
    } catch (error) {
      throw new Error(
        `Failed to write Excel file: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Validates Excel file structure
   */
  validateExcelStructure(data: ExcelData[]): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (data.length === 0) {
      errors.push("No sheets found in Excel file");
    }

    data.forEach((sheet) => {
      if (!sheet.headers || sheet.headers.length === 0) {
        errors.push(`Sheet '${sheet.sheetName}' has no headers`);
      }

      if (!sheet.rows || sheet.rows.length === 0) {
        errors.push(`Sheet '${sheet.sheetName}' has no data rows`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
