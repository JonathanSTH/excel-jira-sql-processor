# Fetch Current Sprint Flow Diagram

This diagram shows the complete flow from when a user clicks the "New Sprint" tile to when they see real data in the sprint confirmation step.

```mermaid
flowchart TD
    A[User Clicks New Sprint Tile] --> B[Show Data Source Modal]
    B --> C{User Selects Data Type}
    
    C -->|Mock Data| D[Show Loading State]
    C -->|Real Data| E[Show Loading State]
    
    D --> F[Simulate API Call 1.5s]
    F --> G[Set Mock Sprint Data]
    G --> H[Display Sprint Summary]
    H --> I[Go to Step 2 - Sprint Confirmation]
    
    E --> J[Call fetchRealSprintData]
    J --> K[HTTP Request to /api/fetch-sprint]
    K --> L[Server Spawns JIRA Script]
    
    L --> M[get-current-sprint-tickets.js]
    M --> N[Connect to JIRA API]
    N --> O[JQL Query: project = WTCI AND sprint in openSprints]
    O --> P[Extract Ticket Data]
    P --> Q[Generate Formatted Text File]
    Q --> R[Save to sprintData/fetched/]
    
    R --> S[Server Parses Output]
    S --> T[parseSprintOutput Function]
    T --> U[Convert to JSON Format]
    U --> V[Check for Existing Files]
    
    V --> W{File Conflicts?}
    W -->|No Conflicts| X[Return Sprint Data JSON]
    W -->|Data Already Exists| Y[Show Data Already Exists Modal]
    W -->|Files Differ| Z[Show File Comparison Modal]
    W -->|Identical Content| AA[Proceed Automatically]
    
    Y --> BB{User Choice}
    BB -->|Continue Existing| CC[Use Existing Data]
    BB -->|Fetch Fresh| DD[Restart Process]
    
    Z --> EE{User Choice}
    EE -->|Keep Existing| FF[Use Existing File]
    EE -->|Keep New| GG[Use New File]
    EE -->|Cancel| HH[Return to Step 1]
    
    AA --> X
    CC --> X
    FF --> X
    GG --> X
    
    X --> II[Frontend Receives JSON]
    II --> JJ[Parse JIRA Data File]
    JJ --> KK[Check File Info]
    KK --> LL[Display Sprint Summary]
    LL --> MM[Go to Step 2 - Sprint Confirmation]
    
    MM --> NN[User Reviews Sprint Data]
    NN --> OO[User Clicks Confirm Button]
    OO --> PP[Move File to inProgress Folder]
    PP --> QQ[Proceed to Step 3 - Ticket Review]
    
    DD --> B
    
    style A fill:#e1f5fe
    style I fill:#c8e6c9
    style MM fill:#c8e6c9
    style QQ fill:#c8e6c9
    style N fill:#fff3e0
    style O fill:#fff3e0
    style P fill:#fff3e0
    style Q fill:#fff3e0
    style R fill:#fff3e0
    style Y fill:#ffebee
    style Z fill:#ffebee
```

## Key Components Breakdown

### Frontend Components
- **UI Layer**: `ui/index.html` - New Sprint tile and modals
- **JavaScript**: `ui/app.js` - Event handlers and data processing
- **Server**: `ui/server.js` - API endpoints for UI server

### Backend Components  
- **Main Server**: `server.js` - Primary API server
- **JIRA Script**: `get-current-sprint-tickets.js` - JIRA data fetching
- **Environment**: `env.tin` - JIRA credentials and configuration

### Data Flow Points
1. **User Interaction**: Click → Modal → Data Type Selection
2. **Mock Path**: Simulated data for testing/development
3. **Real Path**: JIRA API → File Generation → Server Processing
4. **Conflict Resolution**: File comparison and user decision handling
5. **Data Display**: Sprint summary with ticket preview
6. **File Management**: Organized folder structure (fetched/inProgress/completed)

### Error Handling
- **Network Failures**: Fallback to mock data
- **File Conflicts**: User decision modals
- **Data Validation**: Content comparison and duplicate detection
- **Server Issues**: Graceful degradation and error messages
