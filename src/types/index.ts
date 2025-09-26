export interface ExcelData {
  sheetName: string;
  headers: string[];
  rows: Record<string, any>[];
}

export interface JiraTicket {
  key: string;
  summary: string;
  status: string;
  assignee?: string;
  priority: string;
  created: string;
  updated: string;
  customFields?: Record<string, any>;
}

export interface SqlValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validatedData: any[];
}

export interface ProcessedData {
  excelData: ExcelData[];
  jiraTickets: JiraTicket[];
  validationResults: SqlValidationResult;
  outputData: Record<string, any>[];
}

export interface Config {
  sql: {
    server: string;
    database: string;
    user: string;
    password: string;
    encrypt: boolean;
  };
  jira: {
    baseUrl: string;
    username: string;
    apiToken: string;
  };
  files: {
    inputPath: string;
    outputPath: string;
  };
}
