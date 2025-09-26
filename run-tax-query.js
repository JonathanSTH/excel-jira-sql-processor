const { Connection } = require("tedious");
require("dotenv").config({ path: "./env.tin" });

async function runTaxQuery() {
  try {
    console.log("🔍 Tax Data Query Tool");
    console.log("=".repeat(50));

    // Get parameters from command line arguments
    const args = process.argv.slice(2);

    if (args.length < 2) {
      console.log("Usage:");
      console.log(
        "  For NEW data: node run-tax-query.js new <table_name> <tcode1,tcode2,tcode3>"
      );
      console.log(
        "  For UPDATED data: node run-tax-query.js update <table_name> <tcodes> <values> <schema>"
      );
      console.log("");
      console.log("Examples:");
      console.log("  node run-tax-query.js new STaxCodeRules OH-VIO3,OH-VIO4");
      console.log(
        "  node run-tax-query.js update sTaxTable OH-VIO3/OH-VIO4 0.023 escher"
      );
      return;
    }

    const queryType = args[0].toLowerCase();
    const tableName = args[1];

    let query = "";

    if (queryType === "new") {
      // Simple query for new data
      const tcodes = args[2];
      const tcodeList = tcodes
        .split(",")
        .map((code) => `'${code.trim()}'`)
        .join(",");

      // Determine the correct column name based on table
      let columnName = "tCode"; // default
      if (tableName.toLowerCase().includes("staxcoderules")) {
        columnName = "taxCode";
      } else if (
        tableName.toLowerCase().includes("staxcodelocaljurisdiction")
      ) {
        columnName = "tCode";
      } else if (tableName.toLowerCase().includes("staxcodeslegacymap")) {
        columnName = "tCode";
      }

      query = `SELECT * FROM Escher.${tableName} WHERE ${columnName} IN (${tcodeList})`;

      console.log(`📊 Running NEW data query for ${tableName}`);
      console.log(`   T-Codes: ${tcodes}`);
      console.log(`   Column: ${columnName}`);
      console.log(`   Query: ${query}`);
    } else if (queryType === "update") {
      // Complex dynamic query for updated data
      if (args.length < 5) {
        console.log(
          "❌ Update query requires: table_name, tcodes, values, schema"
        );
        console.log(
          "Example: node run-tax-query.js update sTaxTable OH-VIO3/OH-VIO4 0.023 escher"
        );
        return;
      }

      const tcodes = args[2];
      const values = args[3];
      const schema = args[4];

      query = `
DECLARE @SearchTcodes VARCHAR(500) = '${tcodes}';
DECLARE @SearchValues VARCHAR(1000) = '${values}';
DECLARE @SearchTable VARCHAR(100) = '${tableName}';
DECLARE @SearchSchema VARCHAR(50) = '${schema}';
DECLARE @Delimiter VARCHAR(10) = '/';
DECLARE @JoinColumn VARCHAR(50) = 'tCode';

DECLARE @SQL NVARCHAR(MAX) = '';

-- Build dynamic SQL to search all columns across multiple tcodes and multiple values
SELECT @SQL = @SQL + 
    'UNION ALL SELECT ' + @JoinColumn + ', ''' + @SearchTable + ''' as table_name, ''' + COLUMN_NAME + ''' as column_name, CAST(' + COLUMN_NAME + ' AS VARCHAR(50)) as found_value, * FROM ' + @SearchSchema + '.' + @SearchSchema + '.' + @SearchTable + ' WHERE ' + @JoinColumn + ' IN (''' + REPLACE(@SearchTcodes, @Delimiter, ''',''') + ''') AND (' + 
    STUFF((
        SELECT ' OR CAST(' + COLUMN_NAME + ' AS VARCHAR(50)) LIKE ''%' + value + '%'''
        FROM STRING_SPLIT(@SearchValues, @Delimiter)
        FOR XML PATH('')
    ), 1, 4, '') + ') '
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @SearchSchema
    AND TABLE_NAME = @SearchTable
    AND DATA_TYPE NOT IN ('text', 'ntext', 'image');

SET @SQL = STUFF(@SQL, 1, 10, '');
EXEC sp_executesql @SQL;`;

      console.log(`📊 Running UPDATED data query for ${tableName}`);
      console.log(`   T-Codes: ${tcodes}`);
      console.log(`   Values: ${values}`);
      console.log(`   Schema: ${schema}`);
      console.log(`   Query: ${query.substring(0, 200)}...`);
    } else {
      console.log("❌ Invalid query type. Use 'new' or 'update'");
      return;
    }

    console.log("");

    // Execute the query
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

      const request = new (require("tedious").Request)(
        query,
        (err, rowCount, rows) => {
          if (err) {
            console.error("❌ Query failed:");
            console.error(`   Error Object:`, err);
            console.error(`   Error Message: ${err.message || "No message"}`);
            console.error(`   Error Code: ${err.code || "N/A"}`);
            console.error(`   Error Number: ${err.number || "N/A"}`);
            console.error(`   Error State: ${err.state || "N/A"}`);
            console.error(`   Error Severity: ${err.severity || "N/A"}`);
            console.error(`   Error Line: ${err.lineNumber || "N/A"}`);
            console.error(`   Error Procedure: ${err.procName || "N/A"}`);
            console.error(`   Error Info: ${err.info || "N/A"}`);
            console.error(`   Query: ${query.substring(0, 200)}...`);

            // Provide specific guidance based on error type
            const errorMsg = err.message || err.info || "";
            if (errorMsg.includes("Invalid object name")) {
              console.error(
                `   💡 Suggestion: Check if table name "${tableName}" exists`
              );
              console.error(
                `   💡 Try: SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%${tableName}%'`
              );
            } else if (errorMsg.includes("permission")) {
              console.error(
                `   💡 Suggestion: Check database permissions for user`
              );
            } else if (errorMsg.includes("Login failed")) {
              console.error(
                `   💡 Suggestion: Check username and password in env.tin`
              );
            } else if (errorMsg.includes("Cannot open database")) {
              console.error(
                `   💡 Suggestion: Check database name "${process.env.SQL_DATABASE}"`
              );
            } else if (errorMsg.includes("syntax")) {
              console.error(`   💡 Suggestion: Check SQL syntax in the query`);
            } else {
              console.error(
                `   💡 Suggestion: Check the error details above for more information`
              );
            }
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
                  console.log(`  ${column.metadata.colName}: ${column.value}`);
                });
              });
            } else {
              console.log("📋 No results found");
            }
          }

          connection.close();
        }
      );

      connection.execSql(request);
    });

    connection.on("error", (err) => {
      console.error("❌ Connection error:", err.message);
    });

    connection.connect();
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

runTaxQuery();
