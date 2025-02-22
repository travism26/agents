import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Increase timeout for all tests
jest.setTimeout(30000);

let mongoServer: MongoMemoryServer;

// Global test setup
beforeAll(async () => {
  // Set test-specific environment variables
  process.env.NODE_ENV = 'test';
  process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
  process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';

  try {
    // Create MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Connect to MongoDB Memory Server
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB Memory Server for testing');
  } catch (error) {
    console.error('MongoDB Memory Server connection error:', error);
    throw error;
  }
});

// Global test teardown
afterAll(async () => {
  try {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('Closed MongoDB connection');

    // Stop MongoDB Memory Server
    await mongoServer.stop();
    console.log('Stopped MongoDB Memory Server');
  } catch (error) {
    console.error('Error during test cleanup:', error);
    throw error;
  }
});

// Configure mongoose for testing
mongoose.set('strictQuery', true);

// Silence mongoose deprecation warnings
mongoose.set('strictPopulate', false);

// Configure console during tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Silence console.error and console.warn during tests
  console.error = (...args: any[]) => {
    if (
      args[0]?.includes?.('ExperimentalWarning') ||
      args[0]?.includes?.('Warning: Accessing non-existent property')
    ) {
      return;
    }
    originalConsoleError.apply(console, args);
  };

  console.warn = (...args: any[]) => {
    if (args[0]?.includes?.('deprecated')) {
      return;
    }
    originalConsoleWarn.apply(console, args);
  };
});

afterAll(() => {
  // Restore console.error and console.warn
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});
