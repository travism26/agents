import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

const TEST_JWT_SECRET = 'test-secret-key';

/**
 * Generate a JWT token for testing purposes
 */
export function generateTestToken(userId: Types.ObjectId | string): string {
  return jwt.sign(
    {
      userId: userId.toString(),
      role: 'user',
    },
    TEST_JWT_SECRET,
    {
      expiresIn: '1h',
    }
  );
}

/**
 * Verify a test JWT token
 */
export function verifyTestToken(token: string): {
  userId: string;
  role: string;
} {
  return jwt.verify(token, TEST_JWT_SECRET) as {
    userId: string;
    role: string;
  };
}
