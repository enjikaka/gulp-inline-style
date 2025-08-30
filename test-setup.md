# Test Setup Guide

## Running Tests

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run tests once:**
   ```bash
   npm test
   ```

3. **Run tests in watch mode:**
   ```bash
   npm run test:watch
   ```

4. **Run tests with coverage:**
   ```bash
   npm run test:coverage
   ```

## Test Coverage

The test suite covers:
- ✅ Plugin creation and validation
- ✅ Null file handling
- ✅ Stream file error handling
- ✅ CSS inlining for matching IDs
- ✅ Media attribute preservation
- ✅ Multiple CSS file handling
- ✅ Non-matching ID handling
- ✅ Missing CSS file handling
- ✅ File read error handling
- ✅ Complex regex patterns
- ✅ Edge cases (no links, empty CSS)

## Test Structure

- `__tests__/index.test.ts` - Main test file
- `vitest.config.ts` - Vitest configuration
- Tests use mocking for file system operations
- Async stream testing with callbacks
- Comprehensive error case coverage
