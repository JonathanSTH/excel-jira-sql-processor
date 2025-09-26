import * as XLSX from "xlsx";
import { ExcelData } from "../types";

export interface IExcelService {
  readExcel(filePath: string): ExcelData[];
  writeExcel(
    data: Record<string, any>[],
    filePath: string,
    sheetName?: string
  ): void;
}

export class ExcelService implements IExcelService {
  /**
   * Reads an Excel file and returns structured data for each sheet
   */
  readExcel(filePath: string): ExcelData[] {
    try {
      const workbook = XLSX.readFile(filePath);
      const result: ExcelData[] = [];

      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length === 0) return;

        const headers = jsonData[0] as string[];
        const rows = jsonData.slice(1).map((row: any[]) => {
          const rowData: Record<string, any> = {};
          headers.forEach((header, index) => {
            rowData[header] = row[index] || "";
          });
          return rowData;
        });

        result.push({
          sheetName,
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
  writeExcel(
    data: Record<string, any>[],
    filePath: string,
    sheetName: string = "Sheet1"
  ): void {
    try {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      XLSX.writeFile(workbook, filePath);
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
