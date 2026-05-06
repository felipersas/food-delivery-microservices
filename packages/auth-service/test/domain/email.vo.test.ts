import { describe, test, expect } from 'bun:test';
import { Email } from '../../src/domain/value-objects/email.vo';
import { InvalidStateException } from '@app/shared';

describe('Email Value Object', () => {
  test('should create valid email', () => {
    const email = Email.create('user@example.com');
    expect(email.getEmail()).toBe('user@example.com');
  });

  test('should lowercase email', () => {
    const email = Email.create('User@Example.COM');
    expect(email.getEmail()).toBe('user@example.com');
  });

  test('should trim email', () => {
    const email = Email.create('  user@example.com  ');
    expect(email.getEmail()).toBe('user@example.com');
  });

  test('should throw on invalid format', () => {
    expect(() => Email.create('invalid')).toThrow(InvalidStateException);
    expect(() => Email.create('')).toThrow(InvalidStateException);
    expect(() => Email.create('@example.com')).toThrow(InvalidStateException);
  });
});
