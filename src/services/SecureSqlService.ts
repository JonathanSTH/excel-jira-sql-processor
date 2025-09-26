import { Connection, Request, ConnectionConfiguration } from "tedious";
import { SqlValidationResult } from "../types";

export interface ISecureSqlService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  executeQuery(query: string, params?: Record<string, any>): Promise<any[]>;
  validateData(
    data: any[],
    validationRules: ValidationRule[]
  ): Promise<SqlValidationResult>;
}

export interface ValidationRule {
  field: string;
  type: "string" | "number" | "date" | "email" | "custom";
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  customValidator?: (value: any) => boolean;
}

export class SecureSqlService implements ISecureSqlService {
  private connection: Connection | null = null;
  private config: ConnectionConfiguration;

  constructor(config: {
    server: string;
    database: string;
    user: string;
    password: string;
    encrypt: boolean;
  }) {
    this.config = {
      server: config.server,
      database: config.database,
      authentication: {
        type: "default",
        options: {
          userName: config.user,
          password: config.password,
        },
      },
      options: {
        encrypt: config.encrypt,
        trustServerCertificate: true,
        enableArithAbort: true,
        connectTimeout: 30000,
        requestTimeout: 30000,
      },
    };
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.connection = new Connection(this.config);

      this.connection.on("connect", (err) => {
        if (err) {
          reject(new Error(`Failed to connect to SQL Server: ${err.message}`));
        } else {
          resolve();
        }
      });

      this.connection.on("error", (err) => {
        reject(new Error(`SQL Server connection error: ${err.message}`));
      });

      this.connection.connect();
    });
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      return new Promise((resolve) => {
        this.connection!.close();
        this.connection = null;
        resolve();
      });
    }
  }

  async executeQuery(
    query: string,
    params: Record<string, any> = {}
  ): Promise<any[]> {
    if (!this.connection) {
      throw new Error("Not connected to database");
    }

    return new Promise((resolve, reject) => {
      const request = new Request(query, (err, rowCount) => {
        if (err) {
          reject(new Error(`Query execution failed: ${err.message}`));
        }
      });

      const results: any[] = [];

      request.on("row", (columns) => {
        const row: any = {};
        columns.forEach((column) => {
          row[column.metadata.colName] = column.value;
        });
        results.push(row);
      });

      request.on("requestCompleted", () => {
        resolve(results);
      });

      request.on("error", (err) => {
        reject(new Error(`Request error: ${err.message}`));
      });

      // Add parameters
      Object.entries(params).forEach(([key, value]) => {
        request.addParameter(key, this.getTediousType(value), value);
      });

      this.connection!.execSql(request);
    });
  }

  private getTediousType(value: any): any {
    if (typeof value === "string") {
      return "VarChar";
    } else if (typeof value === "number") {
      return "Int";
    } else if (value instanceof Date) {
      return "DateTime";
    } else if (typeof value === "boolean") {
      return "Bit";
    }
    return "VarChar";
  }

  async validateData(
    data: any[],
    validationRules: ValidationRule[]
  ): Promise<SqlValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const validatedData: any[] = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowErrors: string[] = [];
      const rowWarnings: string[] = [];
      let isValidRow = true;

      for (const rule of validationRules) {
        const value = row[rule.field];
        const validationResult = this.validateField(value, rule, i + 1);

        if (!validationResult.isValid) {
          rowErrors.push(...validationResult.errors);
          isValidRow = false;
        }

        if (validationResult.warnings.length > 0) {
          rowWarnings.push(...validationResult.warnings);
        }
      }

      if (isValidRow) {
        validatedData.push(row);
      } else {
        errors.push(`Row ${i + 1}: ${rowErrors.join(", ")}`);
      }

      if (rowWarnings.length > 0) {
        warnings.push(`Row ${i + 1}: ${rowWarnings.join(", ")}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      validatedData,
    };
  }

  private validateField(
    value: any,
    rule: ValidationRule,
    rowNumber: number
  ): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required field
    if (
      rule.required &&
      (value === null || value === undefined || value === "")
    ) {
      errors.push(`Field '${rule.field}' is required`);
      return { isValid: false, errors, warnings };
    }

    // Skip validation if value is empty and not required
    if (
      !rule.required &&
      (value === null || value === undefined || value === "")
    ) {
      return { isValid: true, errors, warnings };
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

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check if a table exists in the database
   */
  async tableExists(tableName: string): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = @tableName
    `;

    const result = await this.executeQuery(query, { tableName });
    return result[0].count > 0;
  }

  /**
   * Get table schema information
   */
  async getTableSchema(tableName: string): Promise<any[]> {
    const query = `
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        CHARACTER_MAXIMUM_LENGTH,
        NUMERIC_PRECISION,
        NUMERIC_SCALE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = @tableName
      ORDER BY ORDINAL_POSITION
    `;

    return await this.executeQuery(query, { tableName });
  }
}
