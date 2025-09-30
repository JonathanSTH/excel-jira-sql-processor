// Dice Layout JavaScript
class ValidationWizard {
  constructor() {
    this.currentFace = "front";
    this.sprintData = null;
    this.ticketsData = null;
    this.validationResults = null;
    this.isLoading = false;

    this.init();
  }

  init() {
    this.bindEvents();
    this.checkExistingDataFile();
    console.log("🎲 Validation Wizard initialized");
  }

  bindEvents() {
    // Option clicks
    document
      .getElementById("fetch-sprint-option")
      .addEventListener("click", () => {
        this.fetchCurrentSprint();
      });

    document
      .getElementById("load-existing-option")
      .addEventListener("click", () => {
        this.loadExistingData();
      });

    // Control buttons
    document
      .getElementById("run-validation-btn")
      .addEventListener("click", () => {
        this.runValidation();
      });

    // Keyboard navigation
    document.addEventListener("keydown", (event) => {
      switch (event.key) {
        case "ArrowRight":
          if (this.currentFace === "front") this.rotateCube("right");
          break;
        case "ArrowLeft":
          if (this.currentFace === "right") this.rotateCube("front");
          else if (this.currentFace === "back") this.rotateCube("left");
          break;
        case "ArrowUp":
          if (this.currentFace === "front") this.rotateCube("top");
          break;
        case "ArrowDown":
          if (this.currentFace === "front") this.rotateCube("bottom");
          break;
        case "Home":
          this.rotateCube("front");
          break;
      }
    });
  }

  checkExistingDataFile() {
    const existingDataOption = document.getElementById("load-existing-option");
    const statusText = document.getElementById("existing-data-status");

    // Enable by default
    existingDataOption.classList.remove("disabled");
    statusText.textContent = "Load";

    console.log("✅ Load Existing Data enabled");
  }

  rotateCube(targetFace) {
    const cube = document.getElementById("cube");

    // Remove current class
    cube.classList.remove(`show-${this.currentFace}`);

    // Add new class
    cube.classList.add(`show-${targetFace}`);

    // Update current face
    this.currentFace = targetFace;

    console.log(`🎲 Rotated to face: ${targetFace}`);
  }

  async fetchCurrentSprint() {
    const option = document.getElementById("fetch-sprint-option");
    const actionText = option.querySelector(".action-text");

    try {
      option.classList.add("loading");
      actionText.textContent = "Connecting...";

      // Immediately rotate to the top face
      this.rotateCube("top");

      // Start simple loading indicator
      this.startSimpleLoading();

      // Simulate API call with delay
      await this.simulateApiCall(4000);

      this.sprintData = {
        sprintName: "WTCI Sprint 9/25/2025",
        ticketCount: 4,
        status: "Active",
        startDate: "Sep 16, 2025",
        endDate: "Sep 24, 2025",
        tickets: [
          {
            key: "WTCI-1356",
            summary: "Update STaxCodeRules",
            status: "Ready for Prod",
          },
          {
            key: "WTCI-1357",
            summary: "Update STaxCodeLocalJurisdication",
            status: "Done",
          },
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
        ],
      };

      // Log the raw sprint data to console
      console.log("📊 Raw Sprint Data Fetched:");
      console.log("Sprint Name:", this.sprintData.sprintName);
      console.log("Ticket Count:", this.sprintData.ticketCount);
      console.log("Status:", this.sprintData.status);
      console.log(
        "Date Range:",
        this.sprintData.startDate,
        "to",
        this.sprintData.endDate
      );
      console.log("Tickets:", this.sprintData.tickets);
      console.log("Full Sprint Data Object:", this.sprintData);

      // Complete the loading
      this.completeSimpleLoading();

      this.displayTicketReview();
    } catch (error) {
      console.error("Error fetching sprint:", error);
    } finally {
      option.classList.remove("loading");
      actionText.textContent = "Start Fetching";
    }
  }

  async loadExistingData() {
    const option = document.getElementById("load-existing-option");
    const actionText = option.querySelector(".action-text");

    try {
      option.classList.add("loading");
      actionText.textContent = "Loading...";

      // Immediately rotate to the back face
      this.rotateCube("back");

      // Start loading animation
      this.startDataLoading();

      // Simulate API call with delay
      await this.simulateApiCall(3000);

      this.sprintData = {
        sprintName: "WTCI Sprint 9/25/2025",
        ticketCount: 4,
        status: "Active",
        startDate: "Sep 16, 2025",
        endDate: "Sep 24, 2025",
        tickets: [
          {
            key: "WTCI-1356",
            summary: "Update STaxCodeRules",
            status: "Ready for Prod",
          },
          {
            key: "WTCI-1357",
            summary: "Update STaxCodeLocalJurisdication",
            status: "Done",
          },
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
        ],
      };

      // Complete the loading
      this.completeDataLoading();

      this.displayTicketReview();
    } catch (error) {
      console.error("Error loading existing data:", error);
      option.classList.add("disabled");
      actionText.textContent = "No Data";
    } finally {
      option.classList.remove("loading");
      if (!option.classList.contains("disabled")) {
        actionText.textContent = "Load Data";
      }
    }
  }

  displayTicketReview() {
    const contentContainer = document.getElementById("ticket-review-content");

    if (!this.sprintData) return;

    contentContainer.innerHTML = `
            <div class="ticket-review-content">
                <div class="sprint-summary">
                    <h3>${this.sprintData.sprintName}</h3>
                    <p>${this.sprintData.ticketCount} tickets • ${
      this.sprintData.status
    }</p>
                    <p>${this.sprintData.startDate} - ${
      this.sprintData.endDate
    }</p>
                </div>
                
                <div class="tickets-grid">
                    ${this.sprintData.tickets
                      .map(
                        (ticket) => `
                        <div class="ticket-card">
                            <div class="ticket-key">${ticket.key}</div>
                            <div class="ticket-summary">${ticket.summary}</div>
                            <div class="ticket-status">${ticket.status}</div>
                        </div>
                    `
                      )
                      .join("")}
                </div>
            </div>
        `;
  }

  async runValidation() {
    const button = document.getElementById("run-validation-btn");

    try {
      button.classList.add("loading");
      button.textContent = "Running...";

      await this.simulateApiCall(3000);

      this.validationResults = {
        totalTickets: 4,
        passedValidations: 2,
        successRate: 100,
        results: [
          { ticket: "WTCI-1358", type: "ADD", status: "SUCCESS" },
          { ticket: "WTCI-1358", type: "UPDATE", status: "SUCCESS" },
          { ticket: "WTCI-1356", type: "PENDING", status: "PENDING" },
          { ticket: "WTCI-1357", type: "PENDING", status: "PENDING" },
        ],
      };

      this.displayValidationResults();
      this.rotateCube("left");
    } catch (error) {
      console.error("Error running validation:", error);
    } finally {
      button.classList.remove("loading");
      button.textContent = "Run Validation ↑";
    }
  }

  displayValidationResults() {
    const contentContainer = document.getElementById(
      "validation-results-content"
    );

    if (!this.validationResults) return;

    contentContainer.innerHTML = `
            <div class="results-summary">
                ${this.validationResults.results
                  .map(
                    (result) => `
                    <div class="result-item ${result.status.toLowerCase()}">
                        <span class="result-icon">${this.getResultIcon(
                          result.status
                        )}</span>
                        <span class="result-text">${result.ticket} ${
                      result.type
                    }: ${result.status}</span>
                    </div>
                `
                  )
                  .join("")}
            </div>
        `;
  }

  getResultIcon(status) {
    switch (status) {
      case "SUCCESS":
        return "✅";
      case "PENDING":
        return "⏳";
      case "ERROR":
        return "❌";
      default:
        return "📋";
    }
  }

  exportResults() {
    console.log("📊 Exporting validation results...");
    // Simulate export process
    alert("Validation results exported successfully!");
  }

  startSimpleLoading() {
    // Update the top face content to show animated stat tiles
    const contentContainer = document.getElementById("sprint-fetch-content");

    contentContainer.innerHTML = `
      <div class="sprint-fetch-content">
        <div class="fetch-summary">
          <h4>Fetching Sprint Data...</h4>
          <p>Connecting to JIRA and retrieving latest tickets</p>
        </div>
        <div class="completion-stats">
          <div class="stat-item loading">
            <span class="stat-number loading-number" id="tickets-count">--</span>
            <span class="stat-label">Tickets Found</span>
            <div class="loading-bar"></div>
          </div>
          <div class="stat-item loading">
            <span class="stat-number loading-text" id="sprint-status">Connecting...</span>
            <span class="stat-label">Sprint Status</span>
            <div class="loading-bar"></div>
          </div>
          <div class="stat-item loading">
            <span class="stat-number loading-percentage" id="data-complete">0%</span>
            <span class="stat-label">Data Complete</span>
            <div class="loading-bar"></div>
          </div>
        </div>
      </div>
    `;

    // Start individual loading animations
    this.animateStatLoading();
  }

  animateStatLoading() {
    const ticketsElement = document.getElementById("tickets-count");
    const statusElement = document.getElementById("sprint-status");
    const percentageElement = document.getElementById("data-complete");

    let ticketsCount = 0;
    let percentage = 0;
    const statuses = [
      "Connecting...",
      "Authenticating...",
      "Fetching...",
      "Processing...",
      "Active",
    ];
    let statusIndex = 0;

    // Animate tickets count with random numbers
    const ticketsInterval = setInterval(() => {
      if (ticketsCount < 4) {
        ticketsCount = Math.floor(Math.random() * 8) + 1;
        ticketsElement.textContent = ticketsCount;
      }
    }, 200);

    // Animate percentage gradually
    const percentageInterval = setInterval(() => {
      if (percentage < 100) {
        percentage = Math.min(percentage + Math.random() * 8, 100);
        percentageElement.textContent = Math.floor(percentage) + "%";
      }
    }, 300);

    // Animate status text
    const statusInterval = setInterval(() => {
      if (statusIndex < statuses.length - 1) {
        statusIndex++;
        statusElement.textContent = statuses[statusIndex];
      }
    }, 800);

    // Store intervals for cleanup
    this.loadingIntervals = [
      ticketsInterval,
      percentageInterval,
      statusInterval,
    ];
  }

  completeSimpleLoading() {
    // Clear all intervals
    if (this.loadingIntervals) {
      this.loadingIntervals.forEach((interval) => clearInterval(interval));
    }

    // Set final values and add completion effects
    const ticketsElement = document.getElementById("tickets-count");
    const statusElement = document.getElementById("sprint-status");
    const percentageElement = document.getElementById("data-complete");

    if (ticketsElement) {
      ticketsElement.textContent = "4";
      ticketsElement.classList.add("completed");
    }
    if (statusElement) {
      statusElement.textContent = "Active";
      statusElement.classList.add("completed");
    }
    if (percentageElement) {
      percentageElement.textContent = "100%";
      percentageElement.classList.add("completed");
    }

    // Add completion animation to stat items
    const statItems = document.querySelectorAll(".stat-item");
    statItems.forEach((item, index) => {
      setTimeout(() => {
        item.classList.remove("loading");
        item.classList.add("completed");
      }, index * 200);
    });

    // Update the summary text
    const summaryElement = document.querySelector(".fetch-summary h4");
    if (summaryElement) {
      summaryElement.textContent = "Successfully fetched sprint data!";
    }
    const descriptionElement = document.querySelector(".fetch-summary p");
    if (descriptionElement) {
      descriptionElement.textContent =
        "Ready to proceed with validation process.";
    }
  }

  startDataLoading() {
    const statusElement = document.getElementById("load-status");
    const statuses = [
      "Reading local files...",
      "Parsing ticket data...",
      "Validating file format...",
      "Loading sprint information...",
      "Processing ticket details...",
      "Data loaded successfully!",
    ];

    let statusIndex = 0;

    // Update status text every 500ms
    this.statusInterval = setInterval(() => {
      if (statusElement && statusIndex < statuses.length) {
        statusElement.textContent = statuses[statusIndex];
        statusIndex++;
      }
    }, 500);
  }

  completeDataLoading() {
    // Clear status interval
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
    }

    // Set final status
    const statusElement = document.getElementById("load-status");
    if (statusElement) {
      statusElement.textContent = "Data loaded successfully!";
      statusElement.style.color = "#00ff88";
      statusElement.style.background = "rgba(0, 255, 136, 0.1)";
      statusElement.style.borderColor = "rgba(0, 255, 136, 0.3)";
    }
  }

  simulateApiCall(delay) {
    return new Promise((resolve) => {
      setTimeout(resolve, delay);
    });
  }
}

// Global function for cube rotation (used by HTML onclick)
function rotateCube(targetFace) {
  if (window.validationWizard) {
    window.validationWizard.rotateCube(targetFace);
  }
}

// Global function for export (used by HTML onclick)
function exportResults() {
  if (window.validationWizard) {
    window.validationWizard.exportResults();
  }
}

// Initialize the wizard when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.validationWizard = new ValidationWizard();
});
