const { Connection } = require("tedious");
require("dotenv").config({ path: "./env.tin" });

async function testTaxTables() {
  try {
    console.log("🔍 Testing tax table queries...");

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

      // Test queries for the tax tables mentioned in JIRA tickets
      const queries = [
        {
          name: "STaxCodeRules",
          query: "SELECT TOP 5 * FROM Escher.STaxCodeRules",
        },
        {
          name: "STaxCodeLocalJurisdication",
          query: "SELECT TOP 5 * FROM Escher.sTaxCodeLocalJurisdiction",
        },
        {
          name: "STaxCodesLegacyMap",
          query: "SELECT TOP 5 * FROM Escher.STaxCodesLegacyMap",
        },
      ];

      let currentQueryIndex = 0;
      let successfulQueries = 0;
      let failedQueries = 0;

      function runNextQuery() {
        if (currentQueryIndex >= queries.length) {
          // Summary of results
          console.log("\n📊 Query Summary:");
          console.log("=".repeat(40));
          console.log(`✅ Successful queries: ${successfulQueries}`);
          console.log(`❌ Failed queries: ${failedQueries}`);
          console.log(`📋 Total queries: ${queries.length}`);

          if (failedQueries > 0) {
            console.log(
              "\n⚠️  Some queries failed - check table names and permissions"
            );

            // Offer to discover available tables
            console.log("\n🔍 Would you like to discover available tables?");
            console.log("   Run this query to find tables:");
            console.log(
              "   SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'Escher' ORDER BY TABLE_NAME"
            );
          } else {
            console.log("\n🎉 All queries completed successfully!");
          }

          connection.close();
          return;
        }

        const queryInfo = queries[currentQueryIndex];
        console.log(`📊 Testing ${queryInfo.name} table...`);

        const request = new (require("tedious").Request)(
          queryInfo.query,
          (err, rowCount, rows) => {
            if (err) {
              console.error(`❌ Query failed for ${queryInfo.name}:`);
              console.error(`   Error: ${err.message}`);
              console.error(`   Query: ${queryInfo.query}`);

              // Provide specific guidance based on error type
              if (err.message.includes("Invalid object name")) {
                console.error(
                  `   💡 Suggestion: Check if table name "${queryInfo.name}" is correct`
                );
                console.error(
                  `   💡 Try: SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%${queryInfo.name}%'`
                );
              } else if (err.message.includes("permission")) {
                console.error(
                  `   💡 Suggestion: Check database permissions for user`
                );
              } else if (err.message.includes("Login failed")) {
                console.error(
                  `   💡 Suggestion: Check username and password in env.tin`
                );
              } else if (err.message.includes("Cannot open database")) {
                console.error(
                  `   💡 Suggestion: Check database name "${process.env.SQL_DATABASE}"`
                );
              }

              console.error("");
              failedQueries++;
            } else {
              console.log(`✅ ${queryInfo.name} - Found ${rowCount} rows`);

              if (rows.length > 0) {
                console.log("   Sample data:");
                const firstRow = rows[0];
                firstRow.forEach((column) => {
                  console.log(
                    `     ${column.metadata.colName}: ${column.value}`
                  );
                });
              }
              console.log("");
              successfulQueries++;
            }

            currentQueryIndex++;
            runNextQuery(); // Run the next query
          }
        );

        connection.execSql(request);
      }

      // Start running queries sequentially
      runNextQuery();
    });

    connection.on("error", (err) => {
      console.error("❌ Connection error:", err.message);
    });

    connection.connect();
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testTaxTables();
