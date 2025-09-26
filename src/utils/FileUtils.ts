import * as fs from "fs";
import * as path from "path";

export class FileUtils {
  /**
   * Ensure directory exists, create if it doesn't
   */
  static ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Check if file exists
   */
  static fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  /**
   * Get file extension
   */
  static getFileExtension(filePath: string): string {
    return path.extname(filePath).toLowerCase();
  }

  /**
   * Validate Excel file extension
   */
  static isValidExcelFile(filePath: string): boolean {
    const validExtensions = [".xlsx", ".xls", ".xlsm"];
    return validExtensions.includes(this.getFileExtension(filePath));
  }

  /**
   * Get file size in bytes
   */
  static getFileSize(filePath: string): number {
    const stats = fs.statSync(filePath);
    return stats.size;
  }

  /**
   * Create backup of file
   */
  static createBackup(filePath: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = `${filePath}.backup.${timestamp}`;
    fs.copyFileSync(filePath, backupPath);
    return backupPath;
  }

  /**
   * Clean up temporary files
   */
  static cleanupTempFiles(tempDir: string): void {
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      files.forEach((file) => {
        const filePath = path.join(tempDir, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        }
      });
    }
  }
}
