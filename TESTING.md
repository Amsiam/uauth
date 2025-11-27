# Testing Guide

Comprehensive testing guide for Universal Auth SDK.

## Running All Tests

### Quick Start

```bash
# Install all dependencies
npm install

# Run all tests
npm test
```

## Package-Specific Tests

### Core SDK Tests

```bash
cd packages/core

# Run tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm test -- --coverage
```

**Test Coverage:**
- ✅ Storage adapters (localStorage, sessionStorage, memory)
- ✅ API client (requests, token management)
- ✅ Automatic token refresh
- ✅ Authentication methods (signIn, signUp, signOut)
- ✅ Session management
- ✅ Plugin system
- ✅ Error handling

### React Package Tests

```bash
cd packages/react

# Run tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm test -- --coverage
```

**Test Coverage:**
- ✅ AuthProvider component
- ✅ useAuth hook
- ✅ RequireAuth component
- ✅ GuestOnly component
- ✅ AuthGuard component
- ✅ Loading states
- ✅ Error handling

### Server Package Tests

```bash
cd packages/server

# Run tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm test -- --coverage
```

**Test Coverage:**
- ✅ Cookie utilities (serialize, parse, delete)
- ✅ ServerAuth class
- ✅ Session retrieval from cookies
- ✅ Session from Request objects
- ✅ Token verification
- ✅ Configuration options

### FastAPI Backend Tests

```bash
cd backends/fastapi

# Install dependencies
pip install -r requirements.txt

# Run tests
pytest

# With coverage
pytest --cov=. --cov-report=html

# Verbose output
pytest -v

# Run specific test file
pytest test_main.py

# Run specific test class
pytest test_main.py::TestSignIn

# Run specific test
pytest test_main.py::TestSignIn::test_sign_in_success
```

**Test Coverage:**
- ✅ Sign up endpoint
- ✅ Sign in endpoint
- ✅ Session endpoint
- ✅ Token refresh endpoint
- ✅ Sign out endpoint
- ✅ Plugin manifest endpoint
- ✅ Password hashing
- ✅ Token generation
- ✅ CORS headers
- ✅ Response format validation
- ✅ Error handling

## Test Structure

### TypeScript Tests (Vitest)

```
packages/
├── core/
│   └── src/
│       ├── storage.test.ts
│       ├── client.test.ts
│       └── auth.test.ts
├── react/
│   └── src/
│       ├── context.test.tsx
│       └── components.test.tsx
└── server/
    └── src/
        ├── cookies.test.ts
        └── server-auth.test.ts
```

### Python Tests (Pytest)

```
backends/
└── fastapi/
    ├── test_main.py
    └── pytest.ini
```

## Writing Tests

### Core SDK Example

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { UniversalAuthSDK } from './auth'

describe('UniversalAuthSDK', () => {
  let auth: UniversalAuthSDK
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    auth = new UniversalAuthSDK({
      baseURL: 'https://api.example.com/auth',
      fetch: mockFetch as any,
    })
  })

  it('should sign in successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        ok: true,
        data: {
          user: { id: '123', email: 'test@example.com' },
          tokens: { access_token: 'token', refresh_token: 'refresh', expires_in: 3600 }
        }
      })
    })

    const result = await auth.signIn('password', {
      email: 'test@example.com',
      password: 'password123'
    })

    expect(result.ok).toBe(true)
  })
})
```

### React Component Example

```typescript
import { render, screen } from '@testing-library/react'
import { AuthProvider, RequireAuth } from '@uauth/react'

it('should render protected content when authenticated', () => {
  const mockAuth = createMockAuth()

  render(
    <AuthProvider auth={mockAuth}>
      <RequireAuth>
        <div>Protected</div>
      </RequireAuth>
    </AuthProvider>
  )

  expect(screen.getByText('Protected')).toBeInTheDocument()
})
```

### FastAPI Endpoint Example

```python
def test_sign_up_success():
    """Test successful user registration"""
    response = client.post(
        "/auth/sign-up",
        json={
            "email": "newuser@example.com",
            "password": "securepass123",
            "name": "New User",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is True
    assert data["data"]["user"]["email"] == "newuser@example.com"
    assert "access_token" in data["data"]["tokens"]
```

## Coverage Reports

### JavaScript/TypeScript

Coverage reports are generated in `coverage/` directory:

```bash
# View HTML report
open packages/core/coverage/index.html
```

### Python

Coverage reports are generated in `htmlcov/` directory:

```bash
# Generate and view HTML report
pytest --cov=. --cov-report=html
open htmlcov/index.html
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test-js:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test

  test-python:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      - run: pip install -r backends/fastapi/requirements.txt
      - run: pytest backends/fastapi
```

## Test Best Practices

### 1. Test Naming

- Use descriptive names: `test_sign_in_with_invalid_credentials`
- Follow pattern: `test_<what>_<condition>_<expected>`

### 2. Test Structure

```typescript
// Arrange
const mockData = { ... }

// Act
const result = await auth.signIn(...)

// Assert
expect(result.ok).toBe(true)
```

### 3. Mocking

- Mock external dependencies (fetch, storage)
- Use consistent mock data
- Clear mocks between tests

### 4. Assertions

- Test one thing per test
- Use specific assertions
- Test both success and failure cases

### 5. Coverage Goals

- **Core SDK:** > 80% coverage
- **React:** > 75% coverage
- **Server:** > 80% coverage
- **Backend:** > 85% coverage

## Troubleshooting

### Tests Failing

```bash
# Clear caches
rm -rf node_modules/.cache
rm -rf packages/*/node_modules

# Reinstall
npm install

# Run tests in isolation
npm test -- --no-cache
```

### Import Errors

```bash
# Build packages first
npm run build

# Check TypeScript compilation
npm run build -- --dry-run
```

### Mock Not Working

```typescript
// Ensure vi.fn() is called before each test
beforeEach(() => {
  mockFetch = vi.fn()
  mockFetch.mockClear()
})
```

## Pre-commit Hooks

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash

# Run tests before commit
npm test

if [ $? -ne 0 ]; then
  echo "Tests failed. Commit aborted."
  exit 1
fi
```

## Test Data

Test fixtures are located in:
- `packages/*/src/__fixtures__/`
- `backends/fastapi/tests/fixtures.py`

## Debugging Tests

### Vitest

```bash
# Debug specific test
npm test -- --reporter=verbose storage.test.ts

# Open UI
npm test -- --ui
```

### Pytest

```bash
# Verbose output
pytest -vv

# Show print statements
pytest -s

# Debug with pdb
pytest --pdb
```

## Next Steps

- Add integration tests for full auth flows
- Add performance tests
- Add security tests (OWASP top 10)
- Add load tests for backend

---

**All tests passing = Ready to ship!** ✅
