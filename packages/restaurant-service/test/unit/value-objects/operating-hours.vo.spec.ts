import { describe, it, expect } from 'bun:test';
import { OperatingHours } from '@domain/value-objects/operating-hours.vo';

describe('OperatingHours', () => {
  describe('create', () => {
    it('should create valid operating hours', () => {
      const hours = OperatingHours.create({
        dayOfWeek: 1, // Monday
        openTime: '11:00',
        closeTime: '23:00',
      });

      expect(hours.dayOfWeek).toBe(1);
      expect(hours.openTime).toBe('11:00');
      expect(hours.closeTime).toBe('23:00');
    });

    it('should throw error when day of week is less than 0', () => {
      expect(() =>
        OperatingHours.create({
          dayOfWeek: -1,
          openTime: '11:00',
          closeTime: '23:00',
        }),
      ).toThrow('Day of week must be between 0 (Sunday) and 6 (Saturday)');
    });

    it('should throw error when day of week is greater than 6', () => {
      expect(() =>
        OperatingHours.create({
          dayOfWeek: 7,
          openTime: '11:00',
          closeTime: '23:00',
        }),
      ).toThrow('Day of week must be between 0 (Sunday) and 6 (Saturday)');
    });

    it('should throw error when open time format is invalid', () => {
      expect(() =>
        OperatingHours.create({
          dayOfWeek: 1,
          openTime: '11:00:00',
          closeTime: '23:00',
        }),
      ).toThrow('Open time must be in HH:MM format');
    });

    it('should throw error when close time format is invalid', () => {
      expect(() =>
        OperatingHours.create({
          dayOfWeek: 1,
          openTime: '11:00',
          closeTime: '23',
        }),
      ).toThrow('Close time must be in HH:MM format');
    });

    it('should throw error when open time is after close time', () => {
      expect(() =>
        OperatingHours.create({
          dayOfWeek: 1,
          openTime: '23:00',
          closeTime: '11:00',
        }),
      ).toThrow('Close time must be after open time');
    });

    it('should throw error when open time equals close time', () => {
      expect(() =>
        OperatingHours.create({
          dayOfWeek: 1,
          openTime: '12:00',
          closeTime: '12:00',
        }),
      ).toThrow('Close time must be after open time');
    });
  });

  describe('isOpenAt', () => {
    it('should return true when current time is within operating hours', () => {
      const hours = OperatingHours.create({
        dayOfWeek: 1, // Monday
        openTime: '11:00',
        closeTime: '23:00',
      });

      // Monday 14:00
      const date = new Date('2026-05-04T14:00:00');

      expect(hours.isOpenAt(date)).toBe(true);
    });

    it('should return false when current time is before opening', () => {
      const hours = OperatingHours.create({
        dayOfWeek: 1, // Monday
        openTime: '11:00',
        closeTime: '23:00',
      });

      // Monday 10:00
      const date = new Date('2026-05-04T10:00:00');

      expect(hours.isOpenAt(date)).toBe(false);
    });

    it('should return false when current time is after closing', () => {
      const hours = OperatingHours.create({
        dayOfWeek: 1, // Monday
        openTime: '11:00',
        closeTime: '23:00',
      });

      // Monday 23:30
      const date = new Date('2026-05-04T23:30:00');

      expect(hours.isOpenAt(date)).toBe(false);
    });

    it('should return false when day of week does not match', () => {
      const hours = OperatingHours.create({
        dayOfWeek: 1, // Monday
        openTime: '11:00',
        closeTime: '23:00',
      });

      // Tuesday 14:00 (dayOfWeek = 2)
      const date = new Date('2026-05-05T14:00:00');

      expect(hours.isOpenAt(date)).toBe(false);
    });

    it('should return true at opening time', () => {
      const hours = OperatingHours.create({
        dayOfWeek: 1, // Monday
        openTime: '11:00',
        closeTime: '23:00',
      });

      // Monday 11:00 exactly
      const date = new Date('2026-05-04T11:00:00');

      expect(hours.isOpenAt(date)).toBe(true);
    });

    it('should return false at closing time', () => {
      const hours = OperatingHours.create({
        dayOfWeek: 1, // Monday
        openTime: '11:00',
        closeTime: '23:00',
      });

      // Monday 23:00 exactly
      const date = new Date('2026-05-04T23:00:00');

      expect(hours.isOpenAt(date)).toBe(false);
    });
  });

  describe('getDayName', () => {
    it('should return correct day name for Sunday', () => {
      const hours = OperatingHours.create({
        dayOfWeek: 0,
        openTime: '11:00',
        closeTime: '23:00',
      });

      expect(hours.getDayName()).toBe('Sunday');
    });

    it('should return correct day name for Monday', () => {
      const hours = OperatingHours.create({
        dayOfWeek: 1,
        openTime: '11:00',
        closeTime: '23:00',
      });

      expect(hours.getDayName()).toBe('Monday');
    });

    it('should return correct day name for Saturday', () => {
      const hours = OperatingHours.create({
        dayOfWeek: 6,
        openTime: '11:00',
        closeTime: '23:00',
      });

      expect(hours.getDayName()).toBe('Saturday');
    });
  });

  describe('equals', () => {
    it('should return true for hours with same values', () => {
      const hours1 = OperatingHours.create({
        dayOfWeek: 1,
        openTime: '11:00',
        closeTime: '23:00',
      });

      const hours2 = OperatingHours.create({
        dayOfWeek: 1,
        openTime: '11:00',
        closeTime: '23:00',
      });

      expect(hours1.equals(hours2)).toBe(true);
    });

    it('should return false for hours with different values', () => {
      const hours1 = OperatingHours.create({
        dayOfWeek: 1,
        openTime: '11:00',
        closeTime: '23:00',
      });

      const hours2 = OperatingHours.create({
        dayOfWeek: 2,
        openTime: '11:00',
        closeTime: '23:00',
      });

      expect(hours1.equals(hours2)).toBe(false);
    });
  });
});
