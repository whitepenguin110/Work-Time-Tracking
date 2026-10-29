import { describe, it, expect } from 'vitest';
import { formatBengaliCurrency } from './bengali';

describe('formatBengaliCurrency', () => {
  it('formats positive integers correctly', () => {
    expect(formatBengaliCurrency(1500)).toBe('৳ ১,৫০০');
    expect(formatBengaliCurrency(100000)).toBe('৳ ১,০০,০০০');
    expect(formatBengaliCurrency(50)).toBe('৳ ৫০');
    expect(formatBengaliCurrency(123456789)).toBe('৳ ১২,৩৪,৫৬,৭৮৯');
  });

  it('formats zero correctly', () => {
    expect(formatBengaliCurrency(0)).toBe('৳ ০');
  });

  it('handles null and undefined', () => {
    expect(formatBengaliCurrency(null)).toBe('৳ ০');
    expect(formatBengaliCurrency(undefined)).toBe('৳ ০');
  });

  it('formats decimals correctly', () => {
    expect(formatBengaliCurrency(1500.5)).toBe('৳ ১,৫০০.৫');
    expect(formatBengaliCurrency(1500.55)).toBe('৳ ১,৫০০.৫৫');
  });

  it('handles NaN correctly', () => {
    expect(formatBengaliCurrency(NaN)).toBe('৳ ০');
  });

  it('handles negative numbers correctly', () => {
    expect(formatBengaliCurrency(-1500)).toBe('৳ -১,৫০০');
  });
});
