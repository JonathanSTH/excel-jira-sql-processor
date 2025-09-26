const fs = require("fs");
const { exec } = require("child_process");
const { promisify } = require("util");

const execAsync = promisify(exec);

async function validateTicket3() {
  try {
    console.log("🔍 Validating Ticket 3 - ADD and UPDATE Operations");
    console.log("=".repeat(50));

    // Hard-coded values for ticket 3
    const ticket3 = {
      number: "WTCI-1358",
      title: "Update STaxCodeLocalJurisdication",
      table: "STaxCodeLocalJurisdiction",
      addedTcodes: ["OH-VIO3", "OH-VIO4"],
      updatedTcodes: ["OH-CAN2", "OH-CAN5"],
      updatedValue: "Regional Income Tax Agency",
    };

    console.log(`📋 Validating ${ticket3.number}: ${ticket3.title}`);
    console.log(`   Table: ${ticket3.table}`);
    console.log(`   Added T-Codes: ${ticket3.addedTcodes.join(", ")}`);
    console.log(`   Updated T-Codes: ${ticket3.updatedTcodes.join(", ")}`);
    console.log(`   Updated Value: ${ticket3.updatedValue}`);
    console.log("");

    // Run the query
    const tcodeList = ticket3.addedTcodes.join(",");
    const command = `node run-tax-query-schema.js new ${ticket3.table} ${tcodeList}`;

    console.log(`🔍 Running: ${command}`);
    console.log("");

    const { stdout, stderr } = await execAsync(command);

    if (stderr) {
      console.log(`❌ Query Error: ${stderr}`);
      return;
    }

    // Parse results
    const results = parseQueryResults(stdout);

    // Validate results
    console.log(`📊 Validation Results:`);

    let allFound = true;
    for (const tcode of ticket3.addedTcodes) {
      const found = results.some(
        (row) =>
          row.tCode === tcode || row.taxCode === tcode || row.tcode === tcode
      );

      if (found) {
        console.log(`✅ ${tcode}: Found in database`);
      } else {
        console.log(`❌ ${tcode}: NOT found in database`);
        allFound = false;
      }
    }

    console.log("");
    if (allFound) {
      console.log(`🎉 ${ticket3.number} ADD VALIDATION: ✅ SUCCESS`);
    } else {
      console.log(`⚠️  ${ticket3.number} ADD VALIDATION: ❌ FAILED`);
    }

    // Now validate UPDATE operations
    console.log("\n" + "=".repeat(50));
    console.log("🔍 Validating UPDATE Operations");
    console.log("=".repeat(50));

    if (ticket3.updatedTcodes.length > 0) {
      try {
        // Run the UPDATE query using the dynamic query
        const updatedTcodeList = ticket3.updatedTcodes.join("/");
        const updateCommand = `node run-tax-query.js update ${ticket3.table} ${updatedTcodeList} "${ticket3.updatedValue}" Escher`;

        console.log(`🔍 Running UPDATE validation: ${updateCommand}`);
        console.log("");

        const { stdout: updateStdout, stderr: updateStderr } = await execAsync(
          updateCommand
        );

        if (updateStderr) {
          console.log(`❌ UPDATE Query Error: ${updateStderr}`);
          return;
        }

        // Parse UPDATE results
        const updateResults = parseQueryResults(updateStdout);

        // Validate UPDATE results
        console.log(`📊 UPDATE Validation Results:`);

        let updateFound = false;
        if (updateResults.length > 0) {
          updateResults.forEach((row, index) => {
            console.log(`\nRow ${index + 1}:`);
            console.log(`  T-Code: ${row.tCode || row.tcode || row.taxCode}`);
            console.log(`  Table: ${row.table_name}`);
            console.log(`  Column: ${row.column_name}`);
            console.log(`  Found Value: ${row.found_value}`);

            if (
              row.found_value &&
              row.found_value.includes(ticket3.updatedValue)
            ) {
              updateFound = true;
              console.log(
                `  ✅ UPDATE CONFIRMED: Found "${ticket3.updatedValue}" in ${row.column_name}`
              );
            }
          });
        } else {
          console.log("❌ No UPDATE results found");
        }

        console.log("");
        if (updateFound) {
          console.log(`🎉 ${ticket3.number} UPDATE VALIDATION: ✅ SUCCESS`);
        } else {
          console.log(`⚠️  ${ticket3.number} UPDATE VALIDATION: ❌ FAILED`);
          console.log(`   Expected to find: "${ticket3.updatedValue}"`);
        }
      } catch (error) {
        console.log(`❌ UPDATE Validation Error: ${error.message}`);
      }
    } else {
      console.log("⚠️  No UPDATE operations to validate");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

function parseQueryResults(stdout) {
  const results = [];
  const lines = stdout.split("\n");

  let inResults = false;
  let currentRow = {};

  for (const line of lines) {
    if (line.includes("📋 Results:")) {
      inResults = true;
      continue;
    }

    if (inResults && line.includes("Row")) {
      if (Object.keys(currentRow).length > 0) {
        results.push(currentRow);
      }
      currentRow = {};
      continue;
    }

    if (inResults && line.includes(":")) {
      const parts = line.split(":");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join(":").trim();
        currentRow[key] = value;
      }
    }
  }

  // Add the last row
  if (Object.keys(currentRow).length > 0) {
    results.push(currentRow);
  }

  return results;
}

// Run the validation
validateTicket3();
