const { Connection } = require("tedious");
require("dotenv").config({ path: "./env.tin" });

async function runTaxQueryWithSchemaCheck() {
  try {
    console.log("🔍 Tax Data Query Tool with Schema Check");
    console.log("=".repeat(50));

    // Get parameters from command line arguments
    const args = process.argv.slice(2);

    if (args.length < 3) {
      console.log("Usage:");
      console.log(
        "  For NEW data: node run-tax-query-schema.js new <table_name> <tcode1,tcode2,tcode3>"
      );
      console.log("");
      console.log("Examples:");
      console.log(
        "  node run-tax-query-schema.js new STaxCodeRules OH-VIO3,OH-VIO4"
      );
      console.log(
        "  node run-tax-query-schema.js new STaxCodeLocalJurisdiction OH-VIO3,OH-VIO4"
      );
      return;
    }

    const queryType = args[0].toLowerCase();
    const tableName = args[1];
    const tcodes = args[2];

    if (queryType !== "new") {
      console.log("❌ Only 'new' query type supported in this version");
      return;
    }

    const tcodeList = tcodes
      .split(",")
      .map((code) => `'${code.trim()}'`)
      .join(",");

    console.log(`📊 Running NEW data query for ${tableName}`);
    console.log(`   T-Codes: ${tcodes}`);
    console.log("");

    // Execute the query with schema check
    const config = {
      server: process.env.SQL_SERVER,
      authentication: {
        type: "default",
        options: {
          userName: process.env.SQL_USER,
          password: process.env.SQL_PASSWORD,
        },
      },
      options: {
        database: process.env.SQL_DATABASE,
        encrypt: process.env.SQL_ENCRYPT === "true",
        trustServerCertificate: true,
        rowCollectionOnRequestCompletion: true,
        connectTimeout: 30000,
        requestTimeout: 30000,
        validateBulkLoadParameters: false,
      },
    };

    const connection = new Connection(config);

    connection.on("connect", (err) => {
      if (err) {
        console.error("❌ Connection failed:", err.message);
        return;
      }

      console.log("✅ Connected to SQL Server successfully!");
      console.log("");

      // Step 1: Check schema to find the correct column name
      const schemaQuery = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'Escher' AND TABLE_NAME = '${tableName}' AND COLUMN_NAME IN ('tCode', 'taxCode')`;

      console.log("🔍 Checking schema for column name...");

      const schemaRequest = new (require("tedious").Request)(
        schemaQuery,
        (err, rowCount, rows) => {
          if (err) {
            console.error("❌ Schema check failed:", err.message);
            connection.close();
            return;
          }

          if (rows.length === 0) {
            console.error(
              `❌ No tCode/taxCode column found in table ${tableName}`
            );
            connection.close();
            return;
          }

          const columnName = rows[0][0].value;
          console.log(`✅ Found column: ${columnName}`);
          console.log("");

          // Step 2: Run the main query with the correct column name
          const mainQuery = `SELECT * FROM Escher.${tableName} WHERE ${columnName} IN (${tcodeList})`;

          console.log(`🔍 Running main query:`);
          console.log(`   ${mainQuery}`);
          console.log("");

          const mainRequest = new (require("tedious").Request)(
            mainQuery,
            (err, rowCount, rows) => {
              if (err) {
                console.error("❌ Query failed:");
                console.error(`   Error: ${err.message}`);
                console.error(`   Number: ${err.number || "N/A"}`);
                console.error(`   State: ${err.state || "N/A"}`);
                console.error(`   Severity: ${err.severity || "N/A"}`);
                console.error(`   Line: ${err.lineNumber || "N/A"}`);
                console.error(`   Procedure: ${err.procName || "N/A"}`);
                console.error(`   Query: ${mainQuery.substring(0, 200)}...`);
              } else {
                console.log(`✅ Query executed successfully!`);
                console.log("");

                if (rows.length > 0) {
                  console.log("📋 Results:");
                  console.log("=".repeat(60));
                  console.log(`Found ${rows.length} rows`);

                  rows.forEach((row, index) => {
                    console.log(`\nRow ${index + 1}:`);
                    row.forEach((column) => {
                      console.log(
                        `  ${column.metadata.colName}: ${column.value}`
                      );
                    });
                  });
                } else {
                  console.log("📋 No results found");
                }
              }

              connection.close();
            }
          );

          connection.execSql(mainRequest);
        }
      );

      connection.execSql(schemaRequest);
    });

    connection.on("error", (err) => {
      console.error("❌ Connection error:", err.message);
    });

    connection.connect();
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

runTaxQueryWithSchemaCheck();
