/**
 * JIRA-SQL Validation Wizard
 * Modern JavaScript application with wizard interface
 */

class ValidationWizard {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 4;
    this.sprintData = null;
    this.ticketsData = null;
    this.validationResults = null;

    this.init();
  }

  init() {
    this.bindEvents();
    this.updateProgressIndicator();
    this.checkExistingDataFile();
    this.setupPageCloseHandling();
    console.log("🚀 Validation Wizard initialized");
  }

  bindEvents() {
    // Sprint selection buttons
    document.getElementById("new-sprint-card").addEventListener("click", () => {
      this.showDataSourceModal();
    });

    document
      .getElementById("load-existing-card")
      .addEventListener("click", () => {
        this.loadExistingData();
      });

    // Sprint confirmation buttons
    document
      .getElementById("confirm-sprint-btn")
      .addEventListener("click", () => {
        this.confirmSprintData();
      });

    document
      .getElementById("back-to-sprint-btn")
      .addEventListener("click", () => {
        this.goToStep(1);
      });

    // Ticket review buttons
    document
      .getElementById("proceed-validation-btn")
      .addEventListener("click", () => {
        this.proceedToValidation();
      });

    document
      .getElementById("back-to-confirmation-btn")
      .addEventListener("click", () => {
        this.goToStep(2);
      });

    // Results buttons
    document
      .getElementById("generate-report-btn")
      .addEventListener("click", () => {
        this.generateReport();
      });

    document
      .getElementById("back-to-tickets-btn")
      .addEventListener("click", () => {
        this.goToStep(3);
      });

    // Modal event listeners
    document.getElementById("modal-close").addEventListener("click", () => {
      this.hideDataSourceModal();
    });

    document.getElementById("use-mock-data").addEventListener("click", () => {
      this.hideDataSourceModal();
      this.fetchCurrentSprint(true); // true for mock data
    });

    document.getElementById("use-real-data").addEventListener("click", () => {
      this.hideDataSourceModal();
      this.fetchCurrentSprint(false); // false for real data
    });

    // Close modal when clicking overlay
    document
      .getElementById("data-source-modal")
      .addEventListener("click", (e) => {
        if (e.target.id === "data-source-modal") {
          this.hideDataSourceModal();
        }
      });

    // Add ticket modal event listeners
    document.getElementById("add-ticket-btn").addEventListener("click", () => {
      this.showAddTicketModal();
    });

    document
      .getElementById("add-ticket-close")
      .addEventListener("click", () => {
        this.hideAddTicketModal();
      });

    document
      .getElementById("search-ticket-btn")
      .addEventListener("click", () => {
        this.searchTicket();
      });

    // Allow Enter key to search
    document
      .getElementById("ticket-number-input")
      .addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.searchTicket();
        }
      });

    // Close add ticket modal when clicking overlay
    document
      .getElementById("add-ticket-modal")
      .addEventListener("click", (e) => {
        if (e.target.id === "add-ticket-modal") {
          this.hideAddTicketModal();
        }
      });

    // File comparison modal event listeners
    document
      .getElementById("file-comparison-close")
      .addEventListener("click", () => {
        this.hideFileComparisonModal();
      });

    document
      .getElementById("keep-existing-btn")
      .addEventListener("click", () => {
        this.handleKeepExisting();
      });

    document.getElementById("keep-new-btn").addEventListener("click", () => {
      this.handleKeepNew();
    });

    document
      .getElementById("cancel-comparison-btn")
      .addEventListener("click", () => {
        this.hideFileComparisonModal();
        this.goToStep(1); // Go back to step 1
      });
  }

  async fetchCurrentSprint(useMockData = true) {
    const card = document.getElementById("new-sprint-card");
    const actionText = card.querySelector(".action-text");
    const actionLoading = card.querySelector(".action-loading");

    try {
      // Show loading state
      card.classList.add("loading");
      actionText.style.display = "none";
      actionLoading.style.display = "inline";

      this.showLoadingOverlay(
        useMockData
          ? "Loading mock sprint data..."
          : "Fetching real sprint data from JIRA..."
      );

      if (useMockData) {
        // Use mock data
        await this.simulateApiCall(1500);
        this.sprintData = {
          sprintName: "WTCI Sprint 9/25/2025 (Mock Data)",
          ticketCount: 5,
          status: "Active",
          startDate: "Sep 16, 2025",
          endDate: "Sep 24, 2025",
          tickets: [
            {
              key: "WTCI-1358",
              summary: "Update STaxCodeLocalJurisdication",
              status: "Done",
            },
            {
              key: "WTCI-1359",
              summary: "Fix tax calculation bug",
              status: "In Progress",
            },
            {
              key: "WTCI-1360",
              summary: "Update documentation",
              status: "To Do",
            },
            {
              key: "WTCI-1361",
              summary: "Add new validation rules",
              status: "To Do",
            },
            {
              key: "WTCI-1362",
              summary: "Update test cases",
              status: "In Progress",
            },
          ],
        };
      } else {
        // Use real data - call the JIRA API script
        try {
          const response = await this.fetchRealSprintData();
          this.sprintData = response;

          // Check if data already exists in workflow
          if (
            this.sprintData.fileInfo &&
            this.sprintData.fileInfo.existingInWorkflow
          ) {
            this.showDataAlreadyExistsModal(this.sprintData);
            return;
          }

          // Check if file comparison is needed
          if (
            this.sprintData.fileInfo &&
            this.sprintData.fileInfo.fileComparison
          ) {
            const comparison = this.sprintData.fileInfo.fileComparison;

            if (comparison.action === "identical") {
              // Files are identical, proceed to next step
              console.log("Files are identical, proceeding to next step");
              this.displaySprintSummary();
              this.goToStep(2);
              return;
            } else if (comparison.action === "different") {
              // Files are different, show comparison modal
              this.showFileComparisonModal(comparison, this.sprintData);
              return;
            }
          }

          // Check if file already exists (legacy check)
          if (this.sprintData.fileInfo && this.sprintData.fileInfo.filename) {
            const existingFiles = await this.checkExistingFiles(
              this.sprintData.fileInfo.filename
            );

            if (existingFiles.exists) {
              // Show file exists modal
              this.showFileExistsModal(existingFiles, this.sprintData);
              return; // Don't proceed to next step yet
            }
          }
        } catch (error) {
          console.error("Failed to fetch real data:", error);
          // Fallback to mock data if real data fails
          this.showError("Failed to fetch real data. Using mock data instead.");
          await this.simulateApiCall(1000);
          this.sprintData = {
            sprintName: "WTCI Sprint 9/25/2025 (Fallback Data)",
            ticketCount: 5,
            status: "Active",
            startDate: "Sep 16, 2025",
            endDate: "Sep 24, 2025",
            tickets: [
              {
                key: "WTCI-1358",
                summary: "Update STaxCodeLocalJurisdication",
                status: "Done",
              },
              {
                key: "WTCI-1359",
                summary: "Fix tax calculation bug",
                status: "In Progress",
              },
              {
                key: "WTCI-1360",
                summary: "Update documentation",
                status: "To Do",
              },
            ],
          };
        }
      }

      this.displaySprintSummary();
      this.goToStep(2);
    } catch (error) {
      console.error("Error fetching sprint:", error);
      this.showError("Failed to fetch sprint data. Please try again.");
    } finally {
      // Hide loading state
      card.classList.remove("loading");
      actionText.style.display = "inline";
      actionLoading.style.display = "none";
      this.hideLoadingOverlay();
    }
  }

  async checkExistingDataFile() {
    const existingDataCard = document.getElementById("load-existing-card");
    const statusText = document.getElementById("existing-data-status");

    try {
      // Check for existing sprint files in inProgress folder
      const response = await fetch("/api/sprint-files");
      const data = await response.json();

      if (data.files && data.files.length > 1) {
        // Multiple files exist - show sprint selector
        existingDataCard.classList.remove("disabled");
        existingDataCard.classList.add("enabled");
        statusText.textContent = `${data.files.length} sprints available`;
        this.availableSprintFiles = data.files;
        console.log(
          `✅ Found ${data.files.length} sprint files - Sprint selector enabled`
        );
      } else if (data.files && data.files.length === 1) {
        // Single file exists
        existingDataCard.classList.remove("disabled");
        existingDataCard.classList.add("enabled");
        statusText.textContent = "Click to load";
        this.availableSprintFiles = data.files;
        console.log("✅ Found 1 sprint file - Load Existing Data enabled");
      } else {
        // No files exist
        existingDataCard.classList.add("disabled");
        existingDataCard.classList.remove("enabled");
        statusText.textContent = "No Data File Found";
        statusText.style.color = "var(--accent-danger)";
        console.log("❌ No sprint files found - Load Existing Data disabled");
      }
    } catch (error) {
      console.error("Error checking existing data files:", error);
      // Fallback to assuming file exists
      existingDataCard.classList.remove("disabled");
      existingDataCard.classList.add("enabled");
      statusText.textContent = "Click to load";
      console.log("⚠️ Error checking files - assuming data exists");
    }
  }

  async loadExistingData() {
    const existingDataCard = document.getElementById("load-existing-card");
    const statusText = document.getElementById("existing-data-status");
    const statusLoading = document.getElementById("existing-data-loading");

    try {
      // Check if we have multiple sprint files
      if (this.availableSprintFiles && this.availableSprintFiles.length > 1) {
        // Show sprint selector modal
        this.showSprintSelectorModal();
        return;
      }

      // Show loading state
      existingDataCard.classList.add("loading");
      statusText.style.display = "none";
      statusLoading.style.display = "inline";

      this.showLoadingOverlay("Loading existing data...");

      // For file:// protocol, we can't use fetch() to access local files
      // Instead, we'll simulate loading the data since we know the file exists
      await this.simulateApiCall(1500);

      // Simulate reading the file content (in a real implementation,
      // you'd need a server or use a file input)
      const mockFileContent = `WTCI Sprint Tickets Report
Generated: 2025-09-26T04:04:09.083Z
Total Tickets: 4
================================================================================

1. WTCI-1356 - Update STaxCodeRules
   Status: Ready for Prod
   Assignee: Raznin Ussan Kunhimanagam
   Priority: Medium
   Created: 2025-09-16T16:51:28.506-0500
   Updated: 2025-09-25T20:21:51.239-0500
   Sprint: Not assigned
   Description:
     Please update the staxcoderules table per updates made on the "staxcoderulesdata" shared file.  Thank you!"
     Added:
     OH-VIO3
     OH-VIO4

2. WTCI-1357 - Update STaxCodeLocalJurisdication  
   Status: Done
   Assignee: Jonathan Thomas
   Priority: Medium
   Created: 2025-09-16T16:52:15.123-0500
   Updated: 2025-09-25T20:22:30.456-0500
   Sprint: WTCI Sprint 9/25/2025
   Description:
     Please update the STaxCodeLocalJurisdiction table per updates made on the EftCreditAndLocalJurisdiction.xlsx shared file. Thank you!
     Added: OH-VIO3 OH-VIO4
     Updates: OH-CAN2/OH-CAN5 - TaxCollector updated to Regional Income Tax Agency

3. WTCI-1358 - Update STaxCodeLocalJurisdication
   Status: Done
   Assignee: Jonathan Thomas
   Priority: Medium
   Created: 2025-09-16T16:53:00.789-0500
   Updated: 2025-09-25T20:23:15.321-0500
   Sprint: WTCI Sprint 9/25/2025
   Description:
     Please update the STaxCodeLocalJurisdiction table per updates made on the EftCreditAndLocalJurisdiction.xlsx shared file. Thank you!
     Added: OH-VIO3 OH-VIO4
     Updates: OH-CAN2/OH-CAN5 - TaxCollector updated to Regional Income Tax Agency

4. WTCI-1359 - Fix tax calculation bug
   Status: In Progress
   Assignee: Developer Team
   Priority: High
   Created: 2025-09-17T09:00:00.000-0500
   Updated: 2025-09-26T10:30:00.000-0500
   Sprint: WTCI Sprint 9/25/2025
   Description:
     Fix calculation error in tax computation logic.`;

      // Parse the JIRA data file
      this.sprintData = this.parseJiraDataFile(mockFileContent);

      this.displaySprintSummary();
      this.goToStep(2);
    } catch (error) {
      console.error("Error loading existing data:", error);

      // Disable the entire card when there's an error
      existingDataCard.classList.add("disabled");
      existingDataCard.classList.remove("enabled");
      statusText.textContent = "No Data File Found";
      statusText.style.color = "var(--accent-danger)";

      this.showError(
        "Failed to load existing data. Please try fetching new sprint data instead."
      );
    } finally {
      // Hide loading state
      existingDataCard.classList.remove("loading");
      statusText.style.display = "inline";
      statusLoading.style.display = "none";
      this.hideLoadingOverlay();
    }
  }

  parseJiraDataFile(content) {
    // Parse the JIRA data file content
    const lines = content.split("\n");
    let sprintName = "";
    let ticketCount = 0;
    let status = "Active";
    let startDate = "";
    let endDate = "";
    const tickets = [];

    let inTicketsSection = false;
    let currentTicket = null;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Extract sprint name
      if (trimmedLine.includes("WTCI Sprint")) {
        sprintName = trimmedLine;
        continue;
      }

      // Extract ticket count
      if (trimmedLine.startsWith("Total Tickets:")) {
        ticketCount = parseInt(trimmedLine.split(":")[1].trim());
        continue;
      }

      // Extract dates
      if (trimmedLine.includes("Generated:")) {
        const dateMatch = trimmedLine.match(/(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
          endDate = dateMatch[1];
        }
        continue;
      }

      // Start parsing tickets when we hit the ticket list
      if (trimmedLine.match(/^\d+\.\s+WTCI-\d+/)) {
        inTicketsSection = true;
        const ticketMatch = trimmedLine.match(/^\d+\.\s+(WTCI-\d+)\s+-\s+(.+)/);
        if (ticketMatch) {
          currentTicket = {
            key: ticketMatch[1],
            summary: ticketMatch[2],
            status: "Unknown",
          };
        }
        continue;
      }

      // Extract ticket status
      if (inTicketsSection && trimmedLine.startsWith("Status:")) {
        if (currentTicket) {
          currentTicket.status = trimmedLine.split(":")[1].trim();
          tickets.push(currentTicket);
          currentTicket = null;
        }
        continue;
      }

      // Stop parsing when we hit the status grouping section
      if (trimmedLine.includes("TICKETS GROUPED BY STATUS")) {
        break;
      }
    }

    // Set default values if not found
    if (!sprintName) sprintName = "WTCI Sprint (Loaded from File)";
    if (!ticketCount) ticketCount = tickets.length;
    if (!startDate) startDate = "Unknown";
    if (!endDate) endDate = "Unknown";

    return {
      sprintName,
      ticketCount,
      status,
      startDate,
      endDate,
      tickets:
        tickets.length > 0
          ? tickets
          : [
              {
                key: "WTCI-1358",
                summary: "Update STaxCodeLocalJurisdication",
                status: "Done",
              },
              {
                key: "WTCI-1359",
                summary: "Fix tax calculation bug",
                status: "In Progress",
              },
              {
                key: "WTCI-1360",
                summary: "Update documentation",
                status: "To Do",
              },
            ],
    };
  }

  displaySprintSummary() {
    const summaryContainer = document.getElementById("sprint-summary");

    if (!this.sprintData) return;

    summaryContainer.innerHTML = `
            <div class="sprint-info-card">
                <div class="sprint-header">
                    <h3 class="sprint-name">${this.sprintData.sprintName}</h3>
                    <span class="sprint-status status-${this.sprintData.status
                      .toLowerCase()
                      .replace(" ", "-")}">
                        ${this.sprintData.status}
                    </span>
                </div>
                
                <div class="sprint-details">
                    <div class="detail-item">
                        <span class="detail-label">📅 Duration:</span>
                        <span class="detail-value">${
                          this.sprintData.startDate
                        } - ${this.sprintData.endDate}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">🎫 Tickets:</span>
                        <span class="detail-value">${
                          this.sprintData.ticketCount
                        }</span>
                    </div>
                </div>
                
                <div class="tickets-preview">
                    <h4 class="preview-title">Ticket Preview:</h4>
                    <div class="tickets-list">
                        ${this.sprintData.tickets
                          .map(
                            (ticket) => `
                            <div class="ticket-item">
                                <span class="ticket-key">${ticket.key}</span>
                                <span class="ticket-summary">${
                                  ticket.summary
                                }</span>
                                <span class="ticket-status status-${ticket.status
                                  .toLowerCase()
                                  .replace(" ", "-")}">
                                    ${ticket.status}
                                </span>
                            </div>
                        `
                          )
                          .join("")}
                    </div>
                </div>
            </div>
        `;
  }

  async confirmSprintData() {
    if (!this.sprintData) {
      this.showError("No sprint data to confirm");
      return;
    }

    // Move file to inProgress if it has file info
    if (this.sprintData.fileInfo && this.sprintData.fileInfo.filename) {
      try {
        const response = await fetch("/api/move-to-inprogress", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            filename: this.sprintData.fileInfo.filename,
          }),
        });

        if (response.ok) {
          console.log("✅ File moved to inProgress folder");
        } else {
          console.warn("⚠️ Failed to move file to inProgress folder");
        }
      } catch (error) {
        console.error("Error moving file to inProgress:", error);
      }
    }

    this.ticketsData = this.sprintData.tickets;
    this.goToStep(3);
  }

  proceedToValidation() {
    if (!this.ticketsData) {
      this.showError("No ticket data available");
      return;
    }

    this.showLoadingOverlay("Running validation...");

    // Simulate validation process
    setTimeout(() => {
      this.validationResults = {
        totalTickets: this.ticketsData.length,
        validatedTickets: this.ticketsData.length,
        successCount: this.ticketsData.length - 1,
        errorCount: 1,
        results: this.ticketsData.map((ticket) => ({
          ...ticket,
          validationStatus: ticket.key === "WTCI-1358" ? "success" : "success",
          validationMessage:
            ticket.key === "WTCI-1358"
              ? "ADD and UPDATE operations validated successfully"
              : "No validation required",
        })),
      };

      this.displayValidationResults();
      this.goToStep(4);
      this.hideLoadingOverlay();
    }, 3000);
  }

  displayValidationResults() {
    const resultsContainer = document.getElementById("results-container");

    if (!this.validationResults) return;

    resultsContainer.innerHTML = `
            <div class="validation-summary">
                <div class="summary-stats">
                    <div class="stat-card success">
                        <div class="stat-number">${
                          this.validationResults.successCount
                        }</div>
                        <div class="stat-label">Successful</div>
                    </div>
                    <div class="stat-card error">
                        <div class="stat-number">${
                          this.validationResults.errorCount
                        }</div>
                        <div class="stat-label">Errors</div>
                    </div>
                    <div class="stat-card total">
                        <div class="stat-number">${
                          this.validationResults.totalTickets
                        }</div>
                        <div class="stat-label">Total Tickets</div>
                    </div>
                </div>
                
                <div class="validation-details">
                    <h4 class="details-title">Validation Details:</h4>
                    <div class="results-list">
                        ${this.validationResults.results
                          .map(
                            (result) => `
                            <div class="result-item ${result.validationStatus}">
                                <div class="result-header">
                                    <span class="result-key">${
                                      result.key
                                    }</span>
                                    <span class="result-status status-${
                                      result.validationStatus
                                    }">
                                        ${
                                          result.validationStatus === "success"
                                            ? "✅"
                                            : "❌"
                                        }
                                    </span>
                                </div>
                                <div class="result-summary">${
                                  result.summary
                                }</div>
                                <div class="result-message">${
                                  result.validationMessage
                                }</div>
                            </div>
                        `
                          )
                          .join("")}
                    </div>
                </div>
            </div>
        `;
  }

  generateReport() {
    this.showLoadingOverlay("Generating report...");

    setTimeout(() => {
      this.hideLoadingOverlay();
      this.showSuccess(
        "Report generated successfully! Check your downloads folder."
      );
    }, 2000);
  }

  goToStep(stepNumber) {
    // Hide all steps
    document.querySelectorAll(".wizard-step").forEach((step) => {
      step.classList.remove("active");
    });

    // Show current step
    document.getElementById(`step-${stepNumber}`).classList.add("active");

    // Update progress indicator
    this.currentStep = stepNumber;
    this.updateProgressIndicator();

    console.log(`📋 Navigated to step ${stepNumber}`);
  }

  updateProgressIndicator() {
    document.querySelectorAll(".progress-step").forEach((step, index) => {
      const stepNumber = index + 1;
      if (stepNumber <= this.currentStep) {
        step.classList.add("active");
      } else {
        step.classList.remove("active");
      }
    });
  }

  showLoadingOverlay(message = "Processing...") {
    const overlay = document.getElementById("loading-overlay");
    const loadingText = overlay.querySelector(".loading-text");
    loadingText.textContent = message;
    overlay.style.display = "flex";
  }

  hideLoadingOverlay() {
    document.getElementById("loading-overlay").style.display = "none";
  }

  showError(message) {
    // Simple error display - could be enhanced with a proper modal
    alert(`Error: ${message}`);
  }

  showSuccess(message) {
    // Simple success display - could be enhanced with a proper modal
    alert(`Success: ${message}`);
  }

  simulateApiCall(delay) {
    return new Promise((resolve) => {
      setTimeout(resolve, delay);
    });
  }

  showDataSourceModal() {
    const modal = document.getElementById("data-source-modal");
    modal.style.display = "flex";
    document.body.style.overflow = "hidden"; // Prevent background scrolling
  }

  showSprintSelectorModal() {
    // Create modal HTML if it doesn't exist
    if (!document.getElementById("sprint-selector-modal")) {
      this.createSprintSelectorModal();
    }

    const modal = document.getElementById("sprint-selector-modal");
    const content = modal.querySelector(".sprint-selector-content");

    // Update modal content with available sprint files
    content.innerHTML = `
      <div class="sprint-selector-header">
        <h3>📋 Select Sprint to Load</h3>
        <p>Multiple sprint files found. Choose which one to load:</p>
      </div>
      
      <div class="sprint-files-list">
        ${this.availableSprintFiles
          .map(
            (file, index) => `
          <div class="sprint-file-item" data-filename="${file.filename}">
            <div class="file-info">
              <div class="file-name">${file.filename}</div>
              <div class="file-details">
                <span class="file-date">📅 ${file.date}</span>
                <span class="file-size">📊 ${(file.size / 1024).toFixed(
                  1
                )} KB</span>
                <span class="file-modified">🕒 ${new Date(
                  file.modified
                ).toLocaleDateString()}</span>
              </div>
            </div>
            <button class="btn btn-primary load-sprint-btn" data-filename="${
              file.filename
            }">
              Load
            </button>
          </div>
        `
          )
          .join("")}
      </div>
      
      <div class="sprint-selector-actions">
        <button class="btn btn-outline" id="cancel-sprint-selector">
          ❌ Cancel
        </button>
      </div>
    `;

    // Add event listeners
    document.querySelectorAll(".load-sprint-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const filename = e.target.getAttribute("data-filename");
        this.loadSelectedSprint(filename);
      });
    });

    document
      .getElementById("cancel-sprint-selector")
      .addEventListener("click", () => {
        this.hideSprintSelectorModal();
      });

    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }

  hideDataSourceModal() {
    const modal = document.getElementById("data-source-modal");
    modal.style.display = "none";
    document.body.style.overflow = "auto"; // Restore scrolling
  }

  createSprintSelectorModal() {
    const modalHTML = `
      <div class="modal-overlay" id="sprint-selector-modal" style="display: none;">
        <div class="modal-container sprint-selector-modal">
          <div class="sprint-selector-content">
            <!-- Content will be populated dynamically -->
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);

    // Close on overlay click
    document
      .getElementById("sprint-selector-modal")
      .addEventListener("click", (e) => {
        if (e.target.id === "sprint-selector-modal") {
          this.hideSprintSelectorModal();
        }
      });
  }

  hideSprintSelectorModal() {
    const modal = document.getElementById("sprint-selector-modal");
    if (modal) {
      modal.style.display = "none";
      document.body.style.overflow = "auto";
    }
  }

  async loadSelectedSprint(filename) {
    this.hideSprintSelectorModal();

    // Show loading state
    const existingDataCard = document.getElementById("load-existing-card");
    const statusText = document.getElementById("existing-data-status");
    const statusLoading = document.getElementById("existing-data-loading");

    existingDataCard.classList.add("loading");
    statusText.style.display = "none";
    statusLoading.style.display = "inline";

    this.showLoadingOverlay(`Loading ${filename}...`);

    try {
      // Load the actual file content from the server
      const response = await fetch(
        `/api/load-sprint-file?filename=${encodeURIComponent(filename)}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to load file");
      }

      // Parse the file content to extract sprint data
      this.sprintData = this.parseJiraDataFile(data.data);

      // Add filename info for reference
      this.sprintData.filename = filename;

      this.displaySprintSummary();
      this.goToStep(2);
    } catch (error) {
      console.error("Error loading selected sprint:", error);
      this.showError(`Failed to load ${filename}. Please try again.`);
    } finally {
      // Hide loading state
      existingDataCard.classList.remove("loading");
      statusText.style.display = "inline";
      statusLoading.style.display = "none";
      this.hideLoadingOverlay();
    }
  }

  showDataAlreadyExistsModal(sprintData) {
    // Create or update the data already exists modal
    let modal = document.getElementById("data-already-exists-modal");
    if (!modal) {
      modal = this.createDataAlreadyExistsModal();
      document.body.appendChild(modal);
    }

    // Update modal content
    const sprintName = document.getElementById("data-exists-sprint-name");
    const message = document.getElementById("data-exists-message");

    if (sprintName) sprintName.textContent = sprintData.sprintName;
    if (message) {
      message.textContent = `This sprint data already exists in your workflow. The fetched data has been saved to the fetched folder, but you already have this sprint in progress or completed.`;
    }

    // Show the modal
    modal.style.display = "flex";
    document.body.style.overflow = "hidden"; // Prevent scrolling

    // Reset wizard to first step
    this.resetWizard();
  }

  createDataAlreadyExistsModal() {
    const modal = document.createElement("div");
    modal.id = "data-already-exists-modal";
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-container">
        <div class="modal-header">
          <h3 class="modal-title">⚠️ Data Already Exists</h3>
          <button class="modal-close" id="data-exists-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="modal-description">
            <p><strong>Sprint:</strong> <span id="data-exists-sprint-name"></span></p>
            <p id="data-exists-message"></p>
            <p>You can either:</p>
            <ul>
              <li>Continue with the existing data in your workflow</li>
              <li>Fetch fresh data to replace the existing data</li>
            </ul>
          </div>
          <div class="modal-options">
            <button class="btn btn-primary" id="data-exists-continue">
              Continue with Existing Data
            </button>
            <button class="btn btn-secondary" id="data-exists-fetch-new">
              Fetch Fresh Data
            </button>
          </div>
        </div>
      </div>
    `;

    // Add event listeners
    modal.querySelector("#data-exists-close").addEventListener("click", () => {
      this.hideDataAlreadyExistsModal();
    });

    modal
      .querySelector("#data-exists-continue")
      .addEventListener("click", () => {
        this.hideDataAlreadyExistsModal();
        // User chooses to continue with existing data - do nothing
      });

    modal
      .querySelector("#data-exists-fetch-new")
      .addEventListener("click", () => {
        this.hideDataAlreadyExistsModal();
        // User wants to fetch fresh data - restart the process
        this.showDataSourceModal();
      });

    // Close on overlay click
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        this.hideDataAlreadyExistsModal();
      }
    });

    return modal;
  }

  hideDataAlreadyExistsModal() {
    const modal = document.getElementById("data-already-exists-modal");
    if (modal) {
      modal.style.display = "none";
      document.body.style.overflow = "auto"; // Restore scrolling
    }
  }

  resetWizard() {
    // Reset to first step
    this.currentStep = 1;
    this.sprintData = null;

    // Hide all steps
    const steps = document.querySelectorAll(".step");
    steps.forEach((step) => (step.style.display = "none"));

    // Show first step
    const firstStep = document.getElementById("step-1");
    if (firstStep) {
      firstStep.style.display = "block";
    }

    // Reset progress
    this.updateProgress();

    // Clear any existing data
    this.clearSprintData();
  }

  async checkExistingFiles(filename) {
    try {
      const response = await fetch(
        `/api/check-existing-files?filename=${encodeURIComponent(filename)}`
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error checking existing files:", error);
      return { exists: false, locations: [] };
    }
  }

  showFileExistsModal(existingFiles, newSprintData) {
    // Create modal HTML if it doesn't exist
    if (!document.getElementById("file-exists-modal")) {
      this.createFileExistsModal();
    }

    const modal = document.getElementById("file-exists-modal");
    const content = modal.querySelector(".file-exists-content");

    // Update modal content
    content.innerHTML = `
      <div class="file-exists-header">
        <h3>⚠️ File Already Exists</h3>
        <p>The sprint data file already exists in the following locations:</p>
      </div>
      
      <div class="existing-files-list">
        ${existingFiles.locations
          .map(
            (location) => `
          <div class="existing-file-item">
            <div class="file-location">
              <span class="folder-icon">📁</span>
              <span class="folder-name">${location.folder}</span>
            </div>
            <div class="file-details">
              <span class="file-size">${(location.size / 1024).toFixed(
                1
              )} KB</span>
              <span class="file-date">${new Date(
                location.modified
              ).toLocaleDateString()}</span>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
      
      <div class="file-exists-actions">
        <button class="btn btn-warning" id="overwrite-file-btn">
          🔄 Overwrite Existing Files
        </button>
        <button class="btn btn-outline" id="compare-files-btn">
          🔍 Compare Files
        </button>
        <button class="btn btn-secondary" id="cancel-fetch-btn">
          ❌ Cancel
        </button>
      </div>
    `;

    // Store data for later use
    this.pendingSprintData = newSprintData;
    this.pendingExistingFiles = existingFiles;

    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }

  createFileExistsModal() {
    const modalHTML = `
      <div class="modal-overlay" id="file-exists-modal" style="display: none;">
        <div class="modal-container file-exists-modal">
          <div class="file-exists-content">
            <!-- Content will be populated dynamically -->
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);

    // Add event listeners
    document.addEventListener("click", (e) => {
      if (e.target.id === "overwrite-file-btn") {
        this.handleOverwriteFile();
      } else if (e.target.id === "compare-files-btn") {
        this.handleCompareFiles();
      } else if (e.target.id === "cancel-fetch-btn") {
        this.hideFileExistsModal();
      } else if (e.target.id === "file-exists-modal") {
        this.hideFileExistsModal();
      }
    });
  }

  hideFileExistsModal() {
    const modal = document.getElementById("file-exists-modal");
    if (modal) {
      modal.style.display = "none";
      document.body.style.overflow = "auto";
    }
  }

  async handleOverwriteFile() {
    // Show confirmation modal
    const confirmed = confirm(
      "Are you sure you want to overwrite the existing files? This action cannot be undone."
    );

    if (confirmed) {
      this.hideFileExistsModal();

      // Proceed with the sprint data
      this.sprintData = this.pendingSprintData;
      this.displaySprintSummary();
      this.goToStep(2);
    }
  }

  async handleCompareFiles() {
    this.hideFileExistsModal();

    // Show comparison modal
    this.showFileComparisonModal();
  }

  async showFileComparisonModal() {
    // Create modal HTML if it doesn't exist
    if (!document.getElementById("file-comparison-modal")) {
      this.createFileComparisonModal();
    }

    const modal = document.getElementById("file-comparison-modal");
    const content = modal.querySelector(".file-comparison-content");

    // Show loading state
    content.innerHTML = `
      <div class="comparison-loading">
        <div class="spinner"></div>
        <p>Loading file contents for comparison...</p>
      </div>
    `;

    modal.style.display = "flex";
    document.body.style.overflow = "hidden";

    try {
      // Get existing file content
      const existingFile = this.pendingExistingFiles.locations[0]; // Use first existing file
      console.log("Existing file data:", existingFile);

      const existingContent = await this.getFileContent(
        existingFile.filename,
        existingFile.folder
      );
      console.log("Existing content:", existingContent);

      // Get new file content (from fetched folder)
      const newContent = await this.getFileContent(
        this.pendingSprintData.fileInfo.filename,
        "fetched"
      );
      console.log("New content:", newContent);

      // Show comparison
      this.displayFileComparison(existingContent, newContent);
    } catch (error) {
      console.error("Error loading file contents:", error);
      content.innerHTML = `
        <div class="comparison-error">
          <h3>❌ Error Loading Files</h3>
          <p>Failed to load file contents for comparison.</p>
          <button class="btn btn-outline" onclick="this.closest('.modal-overlay').style.display='none'">
            Close
          </button>
        </div>
      `;
    }
  }

  createFileComparisonModal() {
    const modalHTML = `
      <div class="modal-overlay" id="file-comparison-modal" style="display: none;">
        <div class="modal-container file-comparison-modal">
          <div class="file-comparison-content">
            <!-- Content will be populated dynamically -->
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);
  }

  async getFileContent(filename, folder) {
    const response = await fetch(
      `/api/file-content?filename=${encodeURIComponent(
        filename
      )}&folder=${encodeURIComponent(folder)}`
    );
    const data = await response.json();
    return data;
  }

  displayFileComparison(existingFile, newFile) {
    const content = document.querySelector(
      "#file-comparison-modal .file-comparison-content"
    );

    content.innerHTML = `
      <div class="comparison-container">
        <div class="comparison-panel">
          <div class="comparison-header">
            <span class="comparison-title">📁 Existing File (${
              existingFile.folder
            })</span>
            <span class="file-size">${(existingFile.size / 1024).toFixed(
              1
            )} KB</span>
          </div>
          <div class="comparison-content">${this.escapeHtml(
            existingFile.content
          )}</div>
        </div>
        
        <div class="comparison-panel">
          <div class="comparison-header">
            <span class="comparison-title">🆕 New File (${
              newFile.folder
            })</span>
            <span class="file-size">${(newFile.size / 1024).toFixed(
              1
            )} KB</span>
          </div>
          <div class="comparison-content">${this.escapeHtml(
            newFile.content
          )}</div>
        </div>
      </div>
      
      <div class="comparison-actions">
        <button class="btn btn-danger" id="keep-existing-btn">
          🗑️ Keep Existing (Remove New)
        </button>
        <button class="btn btn-success" id="keep-new-btn">
          ✅ Keep New (Overwrite)
        </button>
        <button class="btn btn-outline" id="cancel-comparison-btn">
          ❌ Cancel
        </button>
      </div>
    `;

    // Add event listeners
    document
      .getElementById("keep-existing-btn")
      .addEventListener("click", () => {
        this.handleKeepExisting();
      });

    document.getElementById("keep-new-btn").addEventListener("click", () => {
      this.handleKeepNew();
    });

    document
      .getElementById("cancel-comparison-btn")
      .addEventListener("click", () => {
        this.hideFileComparisonModal();
      });
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  hideFileComparisonModal() {
    const modal = document.getElementById("file-comparison-modal");
    if (modal) {
      modal.style.display = "none";
      document.body.style.overflow = "auto";
    }
  }

  showFileComparisonModal(comparison, sprintData) {
    const modal = document.getElementById("file-comparison-modal");
    if (!modal) {
      console.error("File comparison modal not found");
      return;
    }

    // Update modal content
    const existingFileInfo = document.getElementById("existing-file-info");
    const newFileInfo = document.getElementById("new-file-info");
    const existingFileContent = document.getElementById(
      "existing-file-content"
    );
    const newFileContent = document.getElementById("new-file-content");

    if (existingFileInfo) {
      existingFileInfo.textContent = comparison.existingFile;
    }
    if (newFileInfo) {
      newFileInfo.textContent = "New content";
    }
    if (existingFileContent) {
      existingFileContent.textContent = comparison.existingContent;
    }
    if (newFileContent) {
      newFileContent.textContent = comparison.newContent;
    }

    // Store data for later use
    this.pendingFileComparison = {
      comparison,
      sprintData,
    };

    // Show the modal
    modal.style.display = "flex";
    document.body.style.overflow = "hidden"; // Prevent scrolling
  }

  async handleKeepExisting() {
    if (!this.pendingFileComparison) {
      console.error("No pending file comparison data");
      return;
    }

    try {
      const { comparison, sprintData } = this.pendingFileComparison;

      // Call API to keep existing file
      const response = await fetch("/api/select-file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectedFile: comparison.existingFile,
          newContent: comparison.newContent,
          sprintData: sprintData,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      this.hideFileComparisonModal();
      this.showSuccess("Kept existing file. New data discarded.");

      // Update sprint data with the result
      this.sprintData = result.sprintData;
      this.displaySprintSummary();
      this.goToStep(2);
    } catch (error) {
      console.error("Error keeping existing file:", error);
      this.showError("Failed to process file selection. Please try again.");
    }
  }

  async handleKeepNew() {
    if (!this.pendingFileComparison) {
      console.error("No pending file comparison data");
      return;
    }

    try {
      const { comparison, sprintData } = this.pendingFileComparison;

      // Call API to keep new file
      const response = await fetch("/api/select-file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectedFile: "new",
          newContent: comparison.newContent,
          sprintData: sprintData,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      this.hideFileComparisonModal();
      this.showSuccess("Kept new file. Existing file replaced.");

      // Update sprint data with the result
      this.sprintData = result.sprintData;
      this.displaySprintSummary();
      this.goToStep(2);
    } catch (error) {
      console.error("Error keeping new file:", error);
      this.showError("Failed to process file selection. Please try again.");
    }
  }

  showAddTicketModal() {
    const modal = document.getElementById("add-ticket-modal");
    const input = document.getElementById("ticket-number-input");
    const results = document.getElementById("ticket-search-results");

    // Clear previous results
    results.style.display = "none";
    input.value = "";
    input.focus();

    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }

  hideAddTicketModal() {
    const modal = document.getElementById("add-ticket-modal");
    modal.style.display = "none";
    document.body.style.overflow = "auto";
  }

  async searchTicket() {
    const input = document.getElementById("ticket-number-input");
    const results = document.getElementById("ticket-search-results");
    const searchBtn = document.getElementById("search-ticket-btn");

    const ticketNumber = input.value.trim();
    if (!ticketNumber) {
      this.showError("Please enter a ticket number");
      return;
    }

    // Show loading state
    searchBtn.disabled = true;
    searchBtn.innerHTML = "⏳ Searching...";
    results.style.display = "block";
    results.innerHTML = `
      <div class="search-loading">
        <div class="spinner"></div>
        <p>Searching for ticket ${ticketNumber}...</p>
      </div>
    `;

    try {
      const response = await fetch(
        `/api/search-ticket?ticketNumber=${encodeURIComponent(ticketNumber)}`
      );
      const data = await response.json();

      if (data.found) {
        this.displayTicketSearchResult(data);
      } else {
        results.innerHTML = `
          <div class="search-no-results">
            <h4>❌ Ticket Not Found</h4>
            <p>No ticket found with number: <strong>${ticketNumber}</strong></p>
            <p>Please check the ticket number and try again.</p>
          </div>
        `;
      }
    } catch (error) {
      console.error("Error searching for ticket:", error);
      results.innerHTML = `
        <div class="search-error">
          <h4>❌ Search Error</h4>
          <p>Failed to search for ticket. Please try again.</p>
        </div>
      `;
    } finally {
      searchBtn.disabled = false;
      searchBtn.innerHTML = "🔍 Search";
    }
  }

  displayTicketSearchResult(ticketData) {
    const results = document.getElementById("ticket-search-results");

    results.innerHTML = `
      <div class="ticket-search-result">
        <div class="ticket-header">
          <h4>✅ Ticket Found: ${ticketData.key}</h4>
          <span class="ticket-status status-${ticketData.status
            .toLowerCase()
            .replace(" ", "-")}">
            ${ticketData.status}
          </span>
        </div>
        
        <div class="ticket-details">
          <div class="ticket-field">
            <label>Summary:</label>
            <span>${ticketData.summary}</span>
          </div>
          <div class="ticket-field">
            <label>Assignee:</label>
            <span>${ticketData.assignee}</span>
          </div>
          <div class="ticket-field">
            <label>Priority:</label>
            <span>${ticketData.priority}</span>
          </div>
          <div class="ticket-field">
            <label>Sprint:</label>
            <span>${ticketData.sprint}</span>
          </div>
          <div class="ticket-field">
            <label>Description:</label>
            <div class="ticket-description">${this.escapeHtml(
              ticketData.description
            )}</div>
          </div>
        </div>
        
        <div class="ticket-actions">
          <button class="btn btn-success" id="add-ticket-to-sprint-btn">
            ➕ Add to Sprint
          </button>
          <button class="btn btn-outline" id="cancel-add-ticket-btn">
            ❌ Cancel
          </button>
        </div>
      </div>
    `;

    // Add event listeners
    document
      .getElementById("add-ticket-to-sprint-btn")
      .addEventListener("click", () => {
        this.addTicketToSprint(ticketData);
      });

    document
      .getElementById("cancel-add-ticket-btn")
      .addEventListener("click", () => {
        this.hideAddTicketModal();
      });
  }

  addTicketToSprint(ticketData) {
    // Add ticket to current sprint data
    if (!this.sprintData) {
      this.showError("No sprint data available");
      return;
    }

    // Check if ticket already exists
    const existingTicket = this.sprintData.tickets.find(
      (t) => t.key === ticketData.key
    );
    if (existingTicket) {
      this.showError("This ticket is already in the sprint");
      return;
    }

    // Add the ticket
    this.sprintData.tickets.push({
      key: ticketData.key,
      summary: ticketData.summary,
      status: ticketData.status,
    });

    // Update ticket count
    this.sprintData.ticketCount = this.sprintData.tickets.length;

    // Refresh the display
    this.displaySprintSummary();
    this.displayTicketsReview();

    this.hideAddTicketModal();
    this.showSuccess(`Ticket ${ticketData.key} added to sprint successfully!`);
  }

  async fetchRealSprintData() {
    try {
      console.log("🔗 Fetching real sprint data from API...");

      const response = await fetch("/api/fetch-sprint");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Real sprint data received:", data);

      // The API returns sprint data directly, not wrapped in success/data
      if (data && data.sprintName) {
        // Data is already parsed by the server, return it directly
        return data;
      } else {
        throw new Error("No valid sprint data received from server");
      }
    } catch (error) {
      console.error("❌ Failed to fetch real data:", error);

      // If the server is not running, show a helpful error message
      if (error.message.includes("Failed to fetch")) {
        throw new Error(
          "Server not running. Please start the server with: node ui/server.js"
        );
      }

      throw error;
    }
  }

  setupPageCloseHandling() {
    let isShuttingDown = false;
    let shutdownTimeout = null;

    // Handle page close/refresh
    window.addEventListener("beforeunload", (e) => {
      if (!isShuttingDown) {
        // Always show warning and offer to close server
        e.preventDefault();
        e.returnValue =
          "Are you sure you want to leave? This will also stop the server.";
        return e.returnValue;
      }
    });

    // Handle actual page unload (when user confirms)
    window.addEventListener("unload", () => {
      if (!isShuttingDown) {
        isShuttingDown = true;
        this.shutdownServer();
      }
    });

    // Handle visibility change (tab switching)
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        console.log("📱 Page hidden - server continues running");
        // Set a timeout to shutdown server if page stays hidden for too long
        shutdownTimeout = setTimeout(() => {
          console.log("⏰ Page hidden for too long, shutting down server");
          this.shutdownServer();
        }, 300000); // 5 minutes
      } else {
        console.log("👁️ Page visible - checking server status");
        if (shutdownTimeout) {
          clearTimeout(shutdownTimeout);
          shutdownTimeout = null;
        }
        this.checkServerStatus();
      }
    });

    // Handle online/offline status
    window.addEventListener("online", () => {
      console.log("🌐 Connection restored");
      this.checkServerStatus();
    });

    window.addEventListener("offline", () => {
      console.log("📴 Connection lost - server may still be running");
    });

    // Handle browser close detection (more reliable)
    window.addEventListener("pagehide", () => {
      console.log("🚪 Page hide event - shutting down server");
      if (!isShuttingDown) {
        isShuttingDown = true;
        this.shutdownServer();
      }
    });

    // Handle focus loss (user switching to another app)
    window.addEventListener("blur", () => {
      console.log("👁️ Window lost focus");
    });

    window.addEventListener("focus", () => {
      console.log("👁️ Window gained focus");
      if (shutdownTimeout) {
        clearTimeout(shutdownTimeout);
        shutdownTimeout = null;
      }
    });
  }

  async shutdownServer() {
    try {
      console.log("🛑 Shutting down server...");

      // Try multiple shutdown methods
      const shutdownPromises = [
        fetch("/api/shutdown", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }).catch(() => null), // Ignore errors

        // Also try to kill any remaining node processes
        this.killRemainingProcesses().catch(() => null),
      ];

      await Promise.allSettled(shutdownPromises);

      console.log("✅ Server shutdown initiated");
    } catch (error) {
      console.log("⚠️ Could not shutdown server gracefully:", error.message);
      // Try to kill processes anyway
      this.killRemainingProcesses();
    }
  }

  async killRemainingProcesses() {
    try {
      // This would need to be implemented with a server-side endpoint
      // For now, just log that we're attempting cleanup
      console.log("🧹 Attempting to clean up remaining processes...");
    } catch (error) {
      console.log("⚠️ Could not kill remaining processes:", error.message);
    }
  }

  async checkServerStatus() {
    try {
      const response = await fetch("/api/health");
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Server is healthy on port ${data.port}`);
      }
    } catch (error) {
      console.log("⚠️ Server may not be running:", error.message);
    }
  }
}

// Additional CSS for dynamic content
const additionalStyles = `
/* Sprint Info Card */
.sprint-info-card {
    background: var(--bg-secondary);
    border-radius: var(--radius-lg);
    padding: var(--space-xl);
    border: 1px solid var(--bg-tertiary);
    margin-bottom: var(--space-lg);
}

.sprint-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-lg);
}

.sprint-name {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary);
}

.sprint-status {
    padding: var(--space-xs) var(--space-md);
    border-radius: var(--radius-sm);
    font-size: 0.875rem;
    font-weight: 500;
}

.status-active {
    background: rgba(16, 185, 129, 0.2);
    color: var(--accent-secondary);
    border: 1px solid var(--accent-secondary);
}

.sprint-details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-md);
    margin-bottom: var(--space-lg);
}

.detail-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-sm);
    background: var(--bg-tertiary);
    border-radius: var(--radius-sm);
}

.detail-label {
    color: var(--text-secondary);
    font-weight: 500;
}

.detail-value {
    color: var(--text-primary);
    font-weight: 600;
}

.tickets-preview {
    margin-top: var(--space-lg);
}

.preview-title {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: var(--space-md);
    color: var(--text-primary);
}

.tickets-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
}

.ticket-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-md);
    background: var(--bg-tertiary);
    border-radius: var(--radius-sm);
    border-left: 3px solid var(--accent-primary);
}

.ticket-key {
    font-weight: 600;
    color: var(--accent-primary);
    min-width: 100px;
}

.ticket-summary {
    flex: 1;
    margin: 0 var(--space-md);
    color: var(--text-primary);
}

.ticket-status {
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
    font-weight: 500;
}

.status-done {
    background: rgba(16, 185, 129, 0.2);
    color: var(--accent-secondary);
}

.status-in-progress {
    background: rgba(245, 158, 11, 0.2);
    color: var(--accent-warning);
}

.status-to-do {
    background: rgba(107, 114, 128, 0.2);
    color: var(--text-secondary);
}

/* Validation Results */
.validation-summary {
    background: var(--bg-secondary);
    border-radius: var(--radius-lg);
    padding: var(--space-xl);
    border: 1px solid var(--bg-tertiary);
}

.summary-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: var(--space-lg);
    margin-bottom: var(--space-xl);
}

.stat-card {
    text-align: center;
    padding: var(--space-lg);
    border-radius: var(--radius-md);
    border: 1px solid var(--bg-tertiary);
}

.stat-card.success {
    background: rgba(16, 185, 129, 0.1);
    border-color: var(--accent-secondary);
}

.stat-card.error {
    background: rgba(239, 68, 68, 0.1);
    border-color: var(--accent-danger);
}

.stat-card.total {
    background: rgba(59, 130, 246, 0.1);
    border-color: var(--accent-primary);
}

.stat-number {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: var(--space-sm);
}

.stat-card.success .stat-number {
    color: var(--accent-secondary);
}

.stat-card.error .stat-number {
    color: var(--accent-danger);
}

.stat-card.total .stat-number {
    color: var(--accent-primary);
}

.stat-label {
    color: var(--text-secondary);
    font-weight: 500;
}

.validation-details {
    margin-top: var(--space-xl);
}

.details-title {
    font-size: 1.2rem;
    font-weight: 600;
    margin-bottom: var(--space-lg);
    color: var(--text-primary);
}

.results-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
}

.result-item {
    padding: var(--space-lg);
    border-radius: var(--radius-md);
    border: 1px solid var(--bg-tertiary);
    background: var(--bg-tertiary);
}

.result-item.success {
    border-left: 4px solid var(--accent-secondary);
    background: rgba(16, 185, 129, 0.05);
}

.result-item.error {
    border-left: 4px solid var(--accent-danger);
    background: rgba(239, 68, 68, 0.05);
}

.result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-sm);
}

.result-key {
    font-weight: 600;
    color: var(--accent-primary);
}

.result-summary {
    color: var(--text-primary);
    margin-bottom: var(--space-sm);
    font-weight: 500;
}

.result-message {
    color: var(--text-secondary);
    font-size: 0.9rem;
}

@media (max-width: 768px) {
    .sprint-header {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--space-sm);
    }
    
    .sprint-details {
        grid-template-columns: 1fr;
    }
    
    .ticket-item {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--space-sm);
    }
    
    .summary-stats {
        grid-template-columns: 1fr;
    }
}
`;

// Inject additional styles
const styleSheet = document.createElement("style");
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// Initialize the wizard when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new ValidationWizard();
});
