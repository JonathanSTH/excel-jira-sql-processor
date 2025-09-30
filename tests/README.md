# Test Suite

This directory contains all test files for the Sprint Management System.

## Directory Structure

```
tests/
├── README.md                    # This file
└── playwright/                  # Playwright end-to-end tests
    ├── README.md               # Playwright-specific documentation
    └── sprint-fetch.spec.js    # Sprint fetch behavior tests
```

## Test Types

### Playwright E2E Tests
Located in `tests/playwright/` - End-to-end tests using Playwright for browser automation and API testing.

## Running Tests

### Playwright Tests
```bash
npm run test:e2e
```

### All Tests
```bash
npm run test:e2e
```

## Adding New Test Types

When adding new test frameworks or types, create a new subdirectory:
- `tests/jest/` - for unit tests
- `tests/cypress/` - for alternative E2E tests
- `tests/integration/` - for integration tests