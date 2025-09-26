const fs = require("fs");
const path = require("path");

console.log("🚀 Setting up Excel-JIRA-SQL Data Processor...\n");

// Create necessary directories
const directories = ["input", "output", "logs", "temp"];

directories.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  } else {
    console.log(`📁 Directory already exists: ${dir}`);
  }
});

// Create .env file if it doesn't exist
if (!fs.existsSync(".env")) {
  if (fs.existsSync("env.example")) {
    fs.copyFileSync("env.example", ".env");
    console.log("✅ Created .env file from template");
    console.log("⚠️  Please update .env with your actual configuration values");
  } else {
    console.log("❌ env.example file not found");
  }
} else {
  console.log("📄 .env file already exists");
}

// Create sample input file
const sampleInputPath = "input/sample-data.xlsx";
if (!fs.existsSync(sampleInputPath)) {
  // Create a simple CSV that can be converted to Excel
  const sampleData = `ticket_key,summary,status,assignee,priority,description
PROJ-001,Sample Task 1,In Progress,John Doe,High,This is a sample task
PROJ-002,Sample Task 2,Done,Jane Smith,Medium,Another sample task
PROJ-003,Sample Task 3,To Do,Mike Johnson,Low,Yet another sample task`;

  fs.writeFileSync("input/sample-data.csv", sampleData);
  console.log("✅ Created sample CSV file (convert to Excel manually)");
  console.log("📝 Sample data includes JIRA ticket keys in PROJ-XXX format");
} else {
  console.log("📄 Sample input file already exists");
}

console.log("\n🎉 Setup completed successfully!");
console.log("\nNext steps:");
console.log("1. Update .env file with your configuration");
console.log("2. Install dependencies: npm install");
console.log("3. Convert sample-data.csv to Excel format");
console.log("4. Run the application: npm run dev");
console.log("\nFor detailed instructions, see README.md");
