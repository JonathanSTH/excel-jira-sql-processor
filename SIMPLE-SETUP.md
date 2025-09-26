# Simple Setup Guide

This guide is designed for people familiar with basic HTML, CSS, and JavaScript.

## 🎯 **What This Does**

This program reads JIRA tickets, finds Excel files, checks data in SQL Server, and creates reports. It's like having a helper that:

1. **Reads JIRA tickets** (like reading emails)
2. **Finds Excel files** (like searching your computer)
3. **Checks SQL database** (like looking up information)
4. **Creates reports** (like writing a summary)

## 📦 **Installation (Step by Step)**

### **Step 1: Install Node.js**
1. Go to https://nodejs.org
2. Download the "LTS" version (recommended)
3. Install it (just click through the installer)
4. Open Command Prompt or PowerShell
5. Type: `node --version` (should show a version number)

### **Step 2: Install Packages**
1. Open Command Prompt in your project folder
2. Type: `npm install`
3. Wait for it to finish (might take a few minutes)

### **Step 3: Configure Settings**
1. Copy `env.example` to `.env`
2. Edit `.env` with your information:

```env
# Your SQL Server (like your database address)
SQL_SERVER=your-server.database.windows.net
SQL_DATABASE=your-database-name
SQL_USER=your-username
SQL_PASSWORD=your-password
SQL_ENCRYPT=true

# Your JIRA (like your email settings)
JIRA_BASE_URL=https://yourcompany.atlassian.net
JIRA_USERNAME=your-email@company.com
JIRA_API_TOKEN=your-api-token-here

# File locations
EXCEL_SEARCH_DIRECTORY=./excel-files
```

## 🔧 **How to Get JIRA API Token**

1. **Go to**: https://id.atlassian.com/manage-profile/security/api-tokens
2. **Login** with your Atlassian account
3. **Click**: "Create API token"
4. **Name it**: "Excel Processor" (or anything you want)
5. **Copy the token** (long string starting with ATATT...)
6. **Put it in your .env file**

## 🚀 **Running the Program**

### **Test Connection First**
```bash
node test-jira-connection.js
```

### **Run the Main Program**
```bash
npm run enhanced
```

## 📁 **File Structure (Simple Explanation)**

```
your-project/
├── src/                          # Your code files
│   ├── services/                 # Different tools
│   │   ├── SecureExcelService.ts # Reads/writes Excel files
│   │   ├── SecureSqlService.ts   # Talks to SQL database
│   │   ├── SecureJiraService.ts  # Talks to JIRA
│   │   └── SecureValidationService.ts # Checks if data is correct
│   └── enhanced-index.ts         # Main program
├── excel-files/                  # Put your Excel files here
├── output/                       # Reports will be created here
├── package.json                  # List of tools needed
└── .env                          # Your settings (create this)
```

## 🎯 **What Each Service Does**

### **SecureExcelService**
- **Like**: Reading and writing Excel files
- **Does**: Opens Excel files, reads data, creates new Excel files
- **Uses**: ExcelJS (a safe Excel library)

### **SecureSqlService**
- **Like**: Talking to a database
- **Does**: Connects to SQL Server, runs queries, gets data
- **Uses**: Tedious (a safe SQL library)

### **SecureJiraService**
- **Like**: Reading emails from JIRA
- **Does**: Gets tickets, searches for information
- **Uses**: axios (a familiar HTTP library you already know)

### **SecureValidationService**
- **Like**: Checking if answers are correct
- **Does**: Compares data, finds problems, creates reports
- **Uses**: Just plain JavaScript (no extra libraries)

## 🔍 **Understanding the Code**

### **Basic Structure**
```javascript
// This is like a recipe
class MyService {
  constructor(config) {
    this.config = config; // Store settings
  }
  
  async doSomething() {
    // Do the work here
    return result;
  }
}
```

### **Async/Await**
```javascript
// This means "wait for this to finish"
async function getData() {
  const result = await someSlowOperation();
  return result;
}
```

### **Error Handling**
```javascript
try {
  // Try to do something
  const result = await riskyOperation();
} catch (error) {
  // If it fails, handle the error
  console.error("Something went wrong:", error.message);
}
```

## 🛠 **Common Issues**

### **"Cannot find module"**
- Run: `npm install`
- Make sure you're in the right folder

### **"Connection failed"**
- Check your `.env` file
- Make sure your JIRA token is correct
- Test with: `node test-jira-connection.js`

### **"No Excel files found"**
- Put Excel files in the `excel-files` folder
- Check the file names match what's in JIRA tickets

## 📊 **What You Get**

After running, you'll have:

1. **`ticket-validation-results.xlsx`** - Main report
2. **`parse-summary.txt`** - What was found in tickets
3. **`validation-report.txt`** - Overall results
4. **`excel-search-report.txt`** - What Excel files were found
5. **`ticket-{KEY}-report.txt`** - Individual ticket reports

## 🎉 **You're Done!**

This setup uses only safe, well-maintained packages and simple JavaScript. No complex libraries like Zod - just the basics you already know!

The program will:
- ✅ Read your JIRA tickets
- ✅ Find Excel files
- ✅ Check SQL database
- ✅ Create validation reports
- ✅ Show you what's working and what needs fixing
