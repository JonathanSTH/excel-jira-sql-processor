const fs = require("fs");
const { exec } = require("child_process");
const { promisify } = require("util");

const execAsync = promisify(exec);

async function validateTicketAdds() {
  try {
    console.log("🔍 Ticket Validation Tool - ADD Operations");
    console.log("=".repeat(60));

    // Read the ticket file
    const ticketFile = "wtci-sprint-tickets-2025-09-26.txt";
    const fileContent = fs.readFileSync(ticketFile, "utf8");

    // Parse tickets
    const tickets = parseTickets(fileContent);

    console.log(`Found ${tickets.length} tickets to validate`);
    console.log("");

    // Validate each ticket's ADD operations
    for (const ticket of tickets) {
      if (ticket.addedTcodes && ticket.addedTcodes.length > 0) {
        await validateAddOperation(ticket);
      }
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

function parseTickets(content) {
  const tickets = [];
  const ticketSections = content.split(
    "============================================================"
  );

  for (const section of ticketSections) {
    if (section.trim().length === 0) continue;

    const lines = section
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) continue;

    // Extract ticket info
    const ticketInfo = {
      number: "",
      title: "",
      table: "",
      addedTcodes: [],
      updatedTcodes: [],
      description: "",
    };

    // Parse ticket number and title
    const firstLine = lines[0];
    if (firstLine.includes(" - ")) {
      const parts = firstLine.split(" - ");
      ticketInfo.number = parts[0];
      ticketInfo.title = parts[1];
    }

    // Find table name in description
    const descriptionLines = lines.filter(
      (line) =>
        line.includes("Description:") ||
        line.includes("table") ||
        line.includes("Table")
    );

    for (const line of descriptionLines) {
      if (line.includes("table")) {
        // Look for patterns like "the tablename table" or "update tablename table"
        const tableMatch = line.match(/(?:the|update)\s+(\w+)\s+table/i);
        if (tableMatch) {
          ticketInfo.table = tableMatch[1];
        }
      }
    }

    // Parse ADD section
    let inAddedSection = false;
    let inUpdatedSection = false;

    for (const line of lines) {
      if (line.toLowerCase().includes("added:")) {
        inAddedSection = true;
        inUpdatedSection = false;
        continue;
      }

      if (line.toLowerCase().includes("updates:")) {
        inAddedSection = false;
        inUpdatedSection = true;
        continue;
      }

      if (inAddedSection && line.length > 0 && !line.includes("Description:")) {
        // Extract T-Codes from the line
        const tcodes = line
          .split(/\s+/)
          .filter((part) => part.match(/^[A-Z]{2}-[A-Z0-9]+$/));
        ticketInfo.addedTcodes.push(...tcodes);
      }

      if (
        inUpdatedSection &&
        line.length > 0 &&
        !line.includes("Description:")
      ) {
        // Extract T-Codes from update lines
        const tcodes = line
          .split(/\s+/)
          .filter((part) => part.match(/^[A-Z]{2}-[A-Z0-9]+$/));
        ticketInfo.updatedTcodes.push(...tcodes);
      }
    }

    if (ticketInfo.number) {
      tickets.push(ticketInfo);
    }
  }

  return tickets;
}

async function validateAddOperation(ticket) {
  console.log(`📋 Validating ADD for ${ticket.number}: ${ticket.title}`);
  console.log(`   Table: ${ticket.table}`);
  console.log(`   Added T-Codes: ${ticket.addedTcodes.join(", ")}`);
  console.log("");

  if (!ticket.table || ticket.addedTcodes.length === 0) {
    console.log("   ⚠️  Skipping - No table or T-Codes found");
    console.log("");
    return;
  }

  try {
    // Run the query
    const tcodeList = ticket.addedTcodes.join(",");
    const command = `node run-tax-query.js new ${ticket.table} ${tcodeList}`;

    console.log(`   🔍 Running: ${command}`);

    const { stdout, stderr } = await execAsync(command);

    if (stderr) {
      console.log(`   ❌ Query Error: ${stderr}`);
      return;
    }

    // Parse results
    const results = parseQueryResults(stdout);

    // Validate results
    console.log(`   📊 Validation Results:`);

    let allFound = true;
    for (const tcode of ticket.addedTcodes) {
      const found = results.some(
        (row) =>
          row.tCode === tcode || row.taxCode === tcode || row.tcode === tcode
      );

      if (found) {
        console.log(`   ✅ ${tcode}: Found in database`);
      } else {
        console.log(`   ❌ ${tcode}: NOT found in database`);
        allFound = false;
      }
    }

    console.log("");
    if (allFound) {
      console.log(`   🎉 ${ticket.number} ADD VALIDATION: ✅ SUCCESS`);
    } else {
      console.log(`   ⚠️  ${ticket.number} ADD VALIDATION: ❌ FAILED`);
    }
    console.log("");
  } catch (error) {
    console.log(`   ❌ Validation Error: ${error.message}`);
    console.log("");
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
validateTicketAdds();
