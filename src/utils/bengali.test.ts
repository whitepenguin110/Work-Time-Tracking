import { describe, test, expect } from 'bun:test';
import { toBengaliNumber } from './bengali';

describe('toBengaliNumber', () => {
  test('returns 0 for null', () => {
    expect(toBengaliNumber(null)).toBe('০');
  });

  test('returns 0 for undefined', () => {
    expect(toBengaliNumber(undefined)).toBe('০');
  });

  test('returns 0 for empty string', () => {
    expect(toBengaliNumber('')).toBe('০');
  });

  test('converts simple integers', () => {
    expect(toBengaliNumber(12345)).toBe('১২৩৪৫');
    expect(toBengaliNumber(67890)).toBe('৬৭৮৯০');
  });

  test('converts zero', () => {
    expect(toBengaliNumber(0)).toBe('০');
  });

  test('converts strings containing numbers', () => {
    expect(toBengaliNumber('123')).toBe('১২৩');
    expect(toBengaliNumber('hello 456 world')).toBe('hello ৪৫৬ world');
  });

  test('handles decimal numbers', () => {
    expect(toBengaliNumber(12.34)).toBe('১২.৩৪');
    expect(toBengaliNumber('12.34')).toBe('১২.৩৪');
  });

  test('handles negative numbers', () => {
    expect(toBengaliNumber(-123)).toBe('-১২৩');
  });
});
