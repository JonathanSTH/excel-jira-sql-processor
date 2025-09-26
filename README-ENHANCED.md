# Enhanced Excel-JIRA-SQL Data Processor

An advanced TypeScript application that parses JIRA tickets, extracts data requirements, searches Excel files, validates against SQL Server, and generates comprehensive validation reports.

## 🎯 **Perfect for Your Use Case**

This enhanced version specifically handles:
- **JIRA Ticket Parsing**: Extracts T-Codes, values, and requirements from ticket descriptions
- **Excel File Discovery**: Automatically finds and searches Excel files mentioned in tickets
- **Dynamic SQL Validation**: Generates and executes SQL queries based on ticket content
- **Comprehensive Reporting**: Creates detailed validation reports and Excel outputs

## 🚀 **Key Features**

### **1. Intelligent Ticket Parsing**
- Parses "Added:", "Updates:", and "Deleted:" sections
- Extracts T-Codes (e.g., OH-VIO3, OH-VIO4)
- Identifies values to validate (e.g., 0.023, Regional Income Tax Agency)
- Finds Excel file references
- Generates dynamic SQL queries

### **2. Excel File Processing**
- Automatically searches for Excel files mentioned in tickets
- Searches entire directories for relevant files
- Extracts data for specific T-Codes
- Validates data consistency

### **3. SQL Server Integration**
- Dynamic query generation based on ticket requirements
- Validates T-Codes exist in database
- Checks values match expected data
- Comprehensive error reporting

### **4. Advanced Validation**
- Cross-validates Excel data with SQL Server
- Tracks validation status per requirement
- Generates detailed error and warning reports
- Creates validation summaries

## 📋 **Sample Ticket Processing**

For a ticket like:
```
Update STaxCodeLocalJurisdication

Added:
OH-VIO3
OH-VIO4

Updates:
OH-CAN2/OH-CAN5 - TaxColector updated to Regional Income Tax Agency
```

The system will:
1. **Parse** the ticket to extract T-Codes and values
2. **Search** for `EftCreditAndLocalJurisdiction.xlsx` file
3. **Generate** SQL query to validate T-Codes in `escher.sTaxTable`
4. **Validate** that OH-VIO3, OH-VIO4 exist and OH-CAN2/OH-CAN5 have correct values
5. **Generate** comprehensive validation report

## 🛠 **Setup Instructions**

### **1. Install Dependencies**
```bash
npm install
```

### **2. Configure Environment**
```bash
cp env.example .env
```

Update `.env` with your configuration:
```env
# SQL Server Configuration
SQL_SERVER=your-server.database.windows.net
SQL_DATABASE=your-database
SQL_USER=your-username
SQL_PASSWORD=your-password
SQL_ENCRYPT=true

# JIRA Configuration
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_USERNAME=your-email@domain.com
JIRA_API_TOKEN=your-api-token

# File Paths
EXCEL_SEARCH_DIRECTORY=./excel-files
JIRA_PROJECT_KEY=PROJ
```

### **3. Create Directory Structure**
```bash
mkdir -p excel-files
mkdir -p output
```

### **4. Run Enhanced Version**
```bash
npm run enhanced
```

## 📊 **Output Files**

The enhanced version generates:

1. **`ticket-validation-results.xlsx`** - Main validation results
2. **`parse-summary.txt`** - Ticket parsing summary
3. **`validation-report.txt`** - Overall validation report
4. **`excel-search-report.txt`** - Excel file search results
5. **`ticket-{KEY}-report.txt`** - Individual ticket reports

## 🔧 **Configuration Options**

### **Excel Search Directory**
Set `EXCEL_SEARCH_DIRECTORY` to specify where to search for Excel files:
```env
EXCEL_SEARCH_DIRECTORY=./excel-files
```

### **JIRA Project Filter**
Set `JIRA_PROJECT_KEY` to filter tickets from specific projects:
```env
JIRA_PROJECT_KEY=PROJ
```

### **SQL Query Customization**
The system automatically generates SQL queries based on ticket content. You can customize the query generation in `TicketParserService.ts`.

## 📈 **Validation Logic**

### **T-Code Validation**
- Checks if T-Codes exist in specified table
- Validates T-Code format (e.g., OH-VIO3)
- Reports missing T-Codes

### **Value Validation**
- Searches for expected values in all table columns
- Validates data type consistency
- Reports value mismatches

### **Excel Data Validation**
- Cross-references Excel data with SQL results
- Validates data consistency
- Reports discrepancies

## 🎯 **Use Cases**

### **1. Tax Table Updates**
- Parse tickets requesting tax table updates
- Validate T-Codes and tax rates
- Ensure data consistency

### **2. Jurisdiction Changes**
- Process jurisdiction update requests
- Validate tax collector name changes
- Cross-check with Excel reference files

### **3. Data Migration Validation**
- Validate data migration requests
- Ensure all required data is present
- Generate validation reports

## 🔍 **Troubleshooting**

### **Common Issues**

1. **No Excel Files Found**
   - Check `EXCEL_SEARCH_DIRECTORY` path
   - Ensure Excel files are in the correct format
   - Verify file permissions

2. **SQL Validation Failures**
   - Check SQL Server connection
   - Verify table and schema names
   - Ensure T-Codes exist in database

3. **JIRA Connection Issues**
   - Verify API token is correct
   - Check JIRA base URL format
   - Ensure account has necessary permissions

### **Debug Mode**
Set environment variable for detailed logging:
```bash
DEBUG=true npm run enhanced
```

## 📚 **API Reference**

### **TicketParserService**
- `parseTicket(ticket)` - Parse single ticket
- `parseTickets(tickets)` - Parse multiple tickets
- `extractAllTCodes(parsedTickets)` - Extract all T-Codes

### **ExcelDataExtractor**
- `searchTCodesInExcel(filePath, tCodes)` - Search for T-Codes
- `findExcelFiles(directory)` - Find Excel files
- `extractDataForTCodes(filePath, tCodes)` - Extract data

### **TicketValidationService**
- `validateTicket(parsedTicket, excelResults)` - Validate ticket
- `generateValidationReport(ticketReports)` - Generate report

## 🚀 **Advanced Usage**

### **Custom Validation Rules**
You can extend the validation logic by modifying `TicketValidationService.ts`:

```typescript
// Add custom validation logic
private validateCustomFields(requirement: TicketRequirement, sqlResults: any[]): boolean {
  // Your custom validation logic here
  return true;
}
```

### **Custom SQL Query Generation**
Modify `TicketParserService.ts` to customize SQL query generation:

```typescript
private generateValidationQuery(requirement: TicketRequirement): string {
  // Your custom SQL query generation logic
  return customQuery;
}
```

## 📊 **Sample Output**

### **Validation Report Example**
```
=== TICKET VALIDATION REPORT ===

--- Ticket 1: PROJ-123 ---
Summary: Update STaxCodeLocalJurisdication
Overall Status: PASSED
Requirements: 2
Passed: 2
Failed: 0
T-Codes: 4/4

Requirement 1: ADD
  T-Codes Found: 2/2
  Values Found: 0/0
  SQL Rows: 2
  Status: PASSED

Requirement 2: UPDATE
  T-Codes Found: 2/2
  Values Found: 1/1
  SQL Rows: 2
  Status: PASSED
```

This enhanced version provides exactly what you need for processing JIRA tickets with Excel and SQL validation!
