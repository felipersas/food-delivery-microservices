import { describe, test, expect } from 'bun:test';
import { RefreshToken } from '../../src/domain/value-objects/refresh-token.vo';
import { InvalidStateException } from '@app/shared';

describe('RefreshToken Value Object', () => {
  test('should create refresh token', () => {
    const token = RefreshToken.create('device-123', 7);

    expect(token.token).toBeDefined();
    expect(token.deviceId).toBe('device-123');
    expect(token.expiresAt).toBeInstanceOf(Date);
    expect(token.createdAt).toBeInstanceOf(Date);
  });

  test('should trim device ID', () => {
    const token = RefreshToken.create('  device-123  ', 7);
    expect(token.deviceId).toBe('device-123');
  });

  test('should throw on empty device ID', () => {
    expect(() => RefreshToken.create('', 7)).toThrow(InvalidStateException);
  });

  test('should check if token is valid', () => {
    const token = RefreshToken.create('device-123', 7);
    expect(token.isValid()).toBe(true);
    expect(token.isExpired()).toBe(false);
  });

  test('should match device ID', () => {
    const token = RefreshToken.create('device-123', 7);
    expect(token.matchesDeviceId('device-123')).toBe(true);
    expect(token.matchesDeviceId('device-456')).toBe(false);
  });
});
