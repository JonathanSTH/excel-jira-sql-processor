const { Connection } = require("tedious");
require("dotenv").config({ path: "./env.tin" });

async function testSqlConnection() {
  try {
    console.log("🔍 Testing SQL Server connection...");

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
        trustServerCertificate: true, // For development
        rowCollectionOnRequestCompletion: true,
        connectTimeout: 30000,
        requestTimeout: 30000,
        validateBulkLoadParameters: false,
      },
    };

    console.log("Connection details:");
    console.log(`  Server: ${config.server}`);
    console.log(`  Database: ${config.options.database}`);
    console.log(`  User: ${config.authentication.options.userName}`);
    console.log(`  Encrypt: ${config.options.encrypt}`);
    console.log("");

    const connection = new Connection(config);

    connection.on("connect", (err) => {
      if (err) {
        console.error("❌ Connection failed:", err.message);
        return;
      }

      console.log("✅ Connected to SQL Server successfully!");

      // Test a simple query
      const request = new (require("tedious").Request)(
        "SELECT @@VERSION as version, DB_NAME() as database_name, USER_NAME() as user_name",
        (err, rowCount, rows) => {
          if (err) {
            console.error("❌ Query failed:", err.message);
          } else {
            console.log("\n📊 Connection Test Results:");
            console.log("=".repeat(50));

            rows.forEach((row) => {
              row.forEach((column) => {
                console.log(`${column.metadata.colName}: ${column.value}`);
              });
            });

            console.log(`\n✅ Query executed successfully! (${rowCount} rows)`);
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

testSqlConnection();
