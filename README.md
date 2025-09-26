# Excel-JIRA-SQL Data Processor

A comprehensive TypeScript application that processes Excel files, validates data against SQL Server, integrates with JIRA tickets, and generates validated output files.

## Features

- 📊 **Excel Processing**: Read and write Excel files with multiple sheets
- 🗄️ **SQL Server Integration**: Connect to SQL Server for data validation
- 🎫 **JIRA API Integration**: Fetch and validate JIRA ticket data
- ✅ **Data Validation**: Cross-validate data between Excel, SQL, and JIRA
- 📋 **Comprehensive Reporting**: Generate detailed validation reports
- 🔧 **SOLID Principles**: Clean, maintainable, and extensible architecture

## Prerequisites

- Node.js (v16 or higher)
- TypeScript
- SQL Server access
- JIRA instance with API access
- Excel files to process

## Installation

1. Clone or download the project
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment template:
   ```bash
   cp env.example .env
   ```

4. Configure your environment variables in `.env`

## Configuration

### Environment Variables

Create a `.env` file with the following variables:

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
INPUT_EXCEL_PATH=./input/data.xlsx
OUTPUT_EXCEL_PATH=./output/validated-data.xlsx
```

### JIRA API Setup

To use JIRA APIs, you need:

1. **API Token**: Generate an API token from your Atlassian account
2. **Permissions**: Ensure your account has read access to projects/issues
3. **Rate Limits**: Be aware of JIRA's API rate limits (typically 100 requests/minute)

#### Getting JIRA API Token:

1. Go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click "Create API token"
3. Give it a label (e.g., "Excel Processor")
4. Copy the generated token

## Usage

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

## Project Structure

```
src/
├── config/
│   └── ConfigLoader.ts          # Environment configuration
├── services/
│   ├── ExcelService.ts          # Excel file operations
│   ├── SqlService.ts            # SQL Server operations
│   ├── JiraService.ts           # JIRA API operations
│   ├── DataValidationService.ts # Data validation logic
│   └── DataProcessorService.ts  # Main processing orchestration
├── types/
│   └── index.ts                 # TypeScript interfaces
└── index.ts                     # Application entry point
```

## Data Flow

1. **Read Excel Files**: Extract data from input Excel files
2. **Connect to SQL Server**: Establish database connection
3. **Validate Data**: Check data against SQL Server rules
4. **Fetch JIRA Tickets**: Retrieve relevant ticket information
5. **Cross-Validate**: Ensure consistency between all data sources
6. **Generate Output**: Create validated Excel file with comprehensive data
7. **Generate Report**: Create detailed validation report

## Excel File Format

Your input Excel file should contain columns that can be mapped to JIRA tickets. The system automatically detects JIRA ticket keys using patterns like:

- `PROJ-123` format
- Columns named: `ticket`, `ticket_key`, `jira_key`, `issue_key`, `key`, etc.

## Validation Rules

The system performs multiple types of validation:

- **Structure Validation**: Excel file format and required columns
- **Data Type Validation**: String, number, date, email formats
- **SQL Validation**: Database constraints and business rules
- **JIRA Consistency**: Cross-reference Excel data with JIRA tickets
- **Custom Rules**: Configurable validation patterns

## Output Files

The application generates:

1. **Validated Excel File**: Contains original data plus validation results and JIRA information
2. **Validation Report**: Detailed text report with errors, warnings, and statistics

## Error Handling

The application includes comprehensive error handling:

- Connection failures (SQL Server, JIRA)
- File I/O errors
- Data validation failures
- API rate limiting
- Network timeouts

## Customization

### Adding Custom Validation Rules

```typescript
const customRules: ValidationRule[] = [
  {
    field: 'email',
    type: 'email',
    required: true
  },
  {
    field: 'priority',
    type: 'string',
    required: true,
    pattern: /^(High|Medium|Low)$/
  }
];
```

### Custom JIRA Queries

```typescript
// Search for specific tickets
const tickets = await jiraService.searchTickets('project = "PROJ" AND status = "Done"');

// Get tickets updated recently
const recentTickets = await jiraService.getTicketsUpdatedSince('2024-01-01');
```

## Troubleshooting

### Common Issues

1. **JIRA Connection Failed**
   - Verify API token is correct
   - Check JIRA base URL format
   - Ensure account has necessary permissions

2. **SQL Server Connection Failed**
   - Verify server name and credentials
   - Check firewall settings
   - Ensure database exists

3. **Excel File Not Found**
   - Verify file path in configuration
   - Check file permissions
   - Ensure file is not open in Excel

### Debug Mode

Set environment variable for detailed logging:
```bash
DEBUG=true npm run dev
```

## Contributing

This project follows SOLID principles and clean architecture patterns. When adding features:

1. Follow the existing service pattern
2. Add proper TypeScript interfaces
3. Include comprehensive error handling
4. Add validation for all inputs
5. Write clear documentation

## License

MIT License - feel free to use and modify as needed.
