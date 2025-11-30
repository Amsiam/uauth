import '@testing-library/jest-dom'

// Mock import.meta.env for tests
if (typeof import.meta.env === 'undefined') {
  // @ts-ignore
  import.meta.env = {
    VITE_AUTH_URL: 'http://localhost:8000/auth',
    PROD: false,
  }
}
