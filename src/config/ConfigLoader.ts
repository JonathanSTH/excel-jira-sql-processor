import * as dotenv from "dotenv";
import { Config } from "../types";

export class ConfigLoader {
  private static instance: ConfigLoader;
  private config: Config | null = null;

  private constructor() {
    dotenv.config({ path: "./env.tin" });
  }

  static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  loadConfig(): Config {
    if (this.config) {
      return this.config;
    }

    this.validateEnvironmentVariables();

    this.config = {
      sql: {
        server: process.env.SQL_SERVER!,
        database: process.env.SQL_DATABASE!,
        user: process.env.SQL_USER!,
        password: process.env.SQL_PASSWORD!,
        encrypt: process.env.SQL_ENCRYPT === "true",
      },
      jira: {
        baseUrl: process.env.JIRA_BASE_URL!,
        username: process.env.JIRA_USERNAME!,
        apiToken: process.env.JIRA_API_TOKEN!,
      },
      files: {
        inputPath: process.env.INPUT_EXCEL_PATH || "./input/data.xlsx",
        outputPath:
          process.env.OUTPUT_EXCEL_PATH || "./output/validated-data.xlsx",
      },
    };

    return this.config;
  }

  private validateEnvironmentVariables(): void {
    const requiredVars = [
      "SQL_SERVER",
      "SQL_DATABASE",
      "SQL_USER",
      "SQL_PASSWORD",
      "JIRA_BASE_URL",
      "JIRA_USERNAME",
      "JIRA_API_TOKEN",
    ];

    const missingVars = requiredVars.filter((varName) => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missingVars.join(", ")}`
      );
    }
  }

  getConfig(): Config {
    if (!this.config) {
      return this.loadConfig();
    }
    return this.config;
  }
}
