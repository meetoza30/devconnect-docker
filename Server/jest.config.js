export default {
  // Use the experimental ESM support since your project uses ES modules
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  // Give each test file a longer timeout for DB spin-up
  testTimeout: 30000,
  // Run test files serially to avoid port/DB conflicts
  maxWorkers: 1,
  forceExit: true,
};