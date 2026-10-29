import { describe, expect, it } from 'vitest';
import { formatMemberDisplayName } from './teamService';

describe('formatMemberDisplayName', () => {
  it('should return just the username when realName is undefined', () => {
    expect(formatMemberDisplayName('johndoe')).toBe('johndoe');
    expect(formatMemberDisplayName('johndoe', undefined)).toBe('johndoe');
  });

  it('should return just the username when realName is null', () => {
    expect(formatMemberDisplayName('johndoe', null)).toBe('johndoe');
  });

  it('should return just the username when realName is an empty string', () => {
    expect(formatMemberDisplayName('johndoe', '')).toBe('johndoe');
  });

  it('should return just the username when realName contains only whitespace', () => {
    expect(formatMemberDisplayName('johndoe', '   ')).toBe('johndoe');
    expect(formatMemberDisplayName('johndoe', '\t\n')).toBe('johndoe');
  });

  it('should return formatted display name when realName is provided', () => {
    expect(formatMemberDisplayName('johndoe', 'John Doe')).toBe('John Doe (johndoe)');
  });

  it('should trim leading and trailing whitespace from realName', () => {
    expect(formatMemberDisplayName('johndoe', '  John Doe  ')).toBe('John Doe (johndoe)');
  });
});
