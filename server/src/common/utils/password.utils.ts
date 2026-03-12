import * as crypto from 'crypto';

const DEFAULT_PASSWORDS = {
  STUDENT: 'Student@123',
  TEACHER: 'Teacher@123',
  PARENT: 'Parent@123',
} as const;

export function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(12);
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result + '1!'; // Ensure complexity requirement
}

export function getInitialPassword(
  role: 'STUDENT' | 'TEACHER' | 'PARENT',
  isProduction: boolean,
): { password: string; mustChange: boolean } {
  if (isProduction) {
    return {
      password: generateTemporaryPassword(),
      mustChange: true,
    };
  }
  return {
    password: DEFAULT_PASSWORDS[role],
    mustChange: false,
  };
}
