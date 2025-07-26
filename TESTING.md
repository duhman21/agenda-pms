# Testing Guide

## Overview

This document provides comprehensive information about the testing suite implemented for the Property Management System (PMS). The testing strategy covers unit tests, component tests, integration tests, and end-to-end tests to ensure code quality, accessibility compliance, and proper functionality.

## Testing Stack

### Unit & Component Testing
- **Jest**: JavaScript testing framework
- **React Testing Library**: Component testing utilities
- **@testing-library/user-event**: User interaction simulation
- **@testing-library/jest-dom**: Custom Jest matchers for DOM testing

### End-to-End Testing
- **Playwright**: Cross-browser end-to-end testing
- **Multiple browsers**: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari

### Test Environment
- **jsdom**: DOM simulation for unit tests
- **Next.js Jest configuration**: Optimized for Next.js applications
- **TypeScript support**: Full TypeScript testing support

## Test Structure

```
Agenda-PMS/
├── src/
│   ├── components/
│   │   └── **/__tests__/           # Component tests
│   ├── lib/
│   │   └── __tests__/              # Utility function tests
│   ├── types/
│   │   └── __tests__/              # Type definition tests
│   └── __tests__/                  # General test utilities
├── tests/
│   └── e2e/                        # End-to-end tests
├── jest.config.js                  # Jest configuration
├── jest.setup.js                   # Test setup and mocks
└── playwright.config.ts            # Playwright configuration
```

## Running Tests

### Unit and Component Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- accessibility.test.tsx

# Run tests matching pattern
npm test -- --testPathPatterns="components"
```

### End-to-End Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in headed mode (visible browser)
npm run test:e2e:headed

# Run E2E tests in debug mode
npm run test:e2e:debug

# Run specific E2E test file
npx playwright test auth.spec.ts

# Run tests on specific browser
npx playwright test --project=chromium
```

## Test Categories

### 1. Unit Tests

#### Utility Functions (`src/lib/__tests__/utils.test.ts`)
- **Coverage**: 9 tests
- **Focus**: Class name merging, conditional logic, edge cases
- **Key Features**:
  - Tailwind CSS class merging
  - Conditional class handling
  - Null/undefined value handling
  - Complex class combinations

#### Type Definitions (`src/types/__tests__/types.test.ts`)
- **Coverage**: 21 tests
- **Focus**: TypeScript type safety and structure validation
- **Key Features**:
  - All data model types (User, Property, Booking, Task, Expense)
  - Enum validation (UserRole, TaskStatus, ReportType)
  - Complex type relationships
  - Optional field handling

#### iCal Utilities (`src/lib/__tests__/ical-*.test.ts`)
- **Coverage**: 22 tests
- **Focus**: Calendar functionality and data processing
- **Key Features**:
  - iCal content generation and parsing
  - Booking overlap detection
  - Date range filtering
  - Content validation and escaping

### 2. Component Tests

#### Accessibility Components (`src/components/accessibility/__tests__/accessibility.test.tsx`)
- **Coverage**: 20 tests
- **Focus**: WCAG AA compliance and accessibility features
- **Key Features**:
  - Screen reader support
  - Keyboard navigation
  - High contrast mode
  - Font size adjustments
  - ARIA attributes
  - Form accessibility

### 3. Integration Tests (Prepared)

#### Authentication Components
- **Coverage**: 25+ tests prepared
- **Focus**: Login, signup, role management, tenant isolation
- **Components**: LoginForm, TenantSignupForm, RoleGuard, UserManagement

#### Property Management Components
- **Coverage**: 20+ tests prepared
- **Focus**: CRUD operations, search, pagination, owner relationships
- **Components**: PropertyList, PropertyForm, PropertyCard, PropertySearch

#### Task Management Components
- **Coverage**: 20+ tests prepared
- **Focus**: Task assignment, calendar view, overdue notifications
- **Components**: TaskList, TaskForm, TaskCalendar, OverdueTaskNotifications

#### Revenue Management Components
- **Coverage**: 25+ tests prepared
- **Focus**: Financial reporting, analytics, audit trails
- **Components**: RevenueDashboard, RevenueForm, RevenueAnalytics, RevenueAuditTrail

### 4. End-to-End Tests

#### Authentication Flow (`tests/e2e/auth.spec.ts`)
- **Coverage**: 8 comprehensive tests
- **Scenarios**:
  - Tenant signup and login
  - Form validation
  - Session management
  - Access control
  - Logout functionality

#### Property Management (`tests/e2e/properties.spec.ts`)
- **Coverage**: 10 comprehensive tests
- **Scenarios**:
  - Property CRUD operations
  - Owner management
  - iCal sync status
  - Search and pagination
  - Mobile responsiveness

#### Multi-Tenant Isolation (`tests/e2e/multi-tenant-isolation.spec.ts`)
- **Coverage**: 7 comprehensive tests
- **Scenarios**:
  - Data isolation between tenants
  - Revenue data separation
  - Task assignment isolation
  - API access control
  - User management isolation

#### Role-Based Access Control (`tests/e2e/role-based-access.spec.ts`)
- **Coverage**: 15 comprehensive tests
- **Scenarios**:
  - Admin role permissions
  - Staff role limitations
  - Property owner restrictions
  - Role transitions
  - API access enforcement

#### Calendar Sync and Automation (`tests/e2e/calendar-sync-automation.spec.ts`)
- **Coverage**: 10 comprehensive tests
- **Scenarios**:
  - iCal calendar synchronization
  - Booking overlap detection
  - Automatic task generation
  - Task assignment workflow
  - Calendar export functionality
  - Error handling

## Test Data and Mocking

### Mock Strategies

#### Supabase Database Mocking
```javascript
jest.mock('@/lib/supabase', () => ({
  createClient: () => mockSupabase
}))
```

#### Next.js Router Mocking
```javascript
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() })
}))
```

#### External Service Mocking
```javascript
jest.mock('puppeteer', () => ({
  launch: jest.fn(() => mockBrowser)
}))
```

### Test Data Patterns

#### User Profiles
```javascript
const mockUserProfile = {
  id: 'user-1',
  tenant_id: 'tenant-1',
  role: 'admin',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}
```

#### Properties with Relationships
```javascript
const mockProperty = {
  id: 'prop-1',
  name: 'Sunset Villa',
  property_owners: [{
    ownership_percentage: 100,
    user_profiles: { /* owner details */ }
  }]
}
```

## Testing Best Practices

### 1. Component Testing Patterns

#### Accessibility-First Testing
```javascript
// Test with screen reader labels
expect(screen.getByLabelText(/email/i)).toBeInTheDocument()

// Test ARIA attributes
expect(input).toHaveAttribute('aria-describedby')

// Test keyboard navigation
await user.tab()
expect(element).toHaveFocus()
```

#### User Interaction Testing
```javascript
const user = userEvent.setup()
await user.type(input, 'test@example.com')
await user.click(submitButton)

await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument()
})
```

### 2. End-to-End Testing Patterns

#### Page Object Model
```javascript
// Use data-testid attributes for reliable element selection
await page.click('[data-testid="login-submit"]')
await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
```

#### Multi-Context Testing
```javascript
// Test tenant isolation with separate browser contexts
const tenant1Context = await browser.newContext()
const tenant2Context = await browser.newContext()
```

### 3. Error Handling Testing

#### Form Validation
```javascript
// Test empty form submission
await user.click(submitButton)
expect(screen.getByText(/email is required/i)).toBeInTheDocument()
```

#### API Error Scenarios
```javascript
// Mock API failures
mockSupabase.from().select.mockResolvedValue({
  data: null,
  error: { message: 'Database error' }
})
```

## Continuous Integration

### GitHub Actions (Recommended)

```yaml
name: Tests
on: [push, pull_request]
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test -- --coverage
  
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e
```

## Coverage Goals

### Current Coverage
- **Unit Tests**: 62 passing tests
- **Component Tests**: Comprehensive accessibility coverage
- **Type Tests**: 100% type definition coverage
- **E2E Tests**: 50+ comprehensive scenarios

### Target Coverage
- **Unit Test Coverage**: >90%
- **Component Coverage**: >85%
- **E2E Critical Paths**: 100%
- **Accessibility Compliance**: 100% WCAG AA

## Debugging Tests

### Unit Test Debugging
```bash
# Debug specific test
npm test -- --testNamePattern="should validate email format" --verbose

# Run single test file
npm test -- accessibility.test.tsx --watch
```

### E2E Test Debugging
```bash
# Debug mode with browser DevTools
npm run test:e2e:debug

# Run with visible browser
npm run test:e2e:headed

# Generate trace files
npx playwright test --trace on
```

### Common Issues and Solutions

#### Mock Issues
- Ensure mocks are properly reset between tests
- Use `jest.clearAllMocks()` in `beforeEach`
- Check mock implementation matches actual API

#### Async Testing Issues
- Use `waitFor` for async operations
- Avoid `act` warnings with proper async handling
- Set appropriate timeouts for slow operations

#### E2E Test Flakiness
- Use `data-testid` attributes instead of text selectors
- Wait for elements to be visible before interaction
- Handle loading states properly

## Performance Testing

### Load Testing (Future)
```javascript
// Example load test with multiple users
test('should handle concurrent users', async ({ browser }) => {
  const contexts = await Promise.all(
    Array(10).fill().map(() => browser.newContext())
  )
  // Simulate concurrent user actions
})
```

### Memory Leak Detection
```bash
# Run tests with memory monitoring
npm test -- --detectOpenHandles --forceExit
```

## Security Testing

### Authentication Testing
- Session management validation
- Role-based access control
- Cross-tenant data isolation
- API endpoint protection

### Input Validation Testing
- SQL injection prevention
- XSS protection
- File upload security
- Data sanitization

## Maintenance

### Regular Tasks
1. **Update test data** when schema changes
2. **Review and update mocks** when APIs change
3. **Add tests for new features** following established patterns
4. **Monitor test performance** and optimize slow tests
5. **Update browser versions** for E2E tests

### Test Review Checklist
- [ ] Tests follow naming conventions
- [ ] Proper use of data-testid attributes
- [ ] Accessibility testing included
- [ ] Error scenarios covered
- [ ] Mocks properly implemented
- [ ] Tests are deterministic (not flaky)
- [ ] Performance considerations addressed

## Resources

### Documentation
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

### Tools
- [Jest Extension for VS Code](https://marketplace.visualstudio.com/items?itemName=Orta.vscode-jest)
- [Playwright Extension for VS Code](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright)
- [Testing Library Extension](https://marketplace.visualstudio.com/items?itemName=testing-library.testing-library-vscode)

This comprehensive testing suite ensures the Property Management System meets high standards for functionality, accessibility, security, and user experience across all supported browsers and devices.