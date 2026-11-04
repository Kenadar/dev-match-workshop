import { describe, expect, it } from 'vitest';
import type { UserDto } from '@devmatch/shared';
import { pathAfterSignIn } from '../queries/auth.js';

const withTelegram: UserDto = { id: 'u1', email: 'a@example.com', displayName: 'A', telegram: '@orest_lead' };

describe('pathAfterSignIn', () => {
  it('US-01 a user without a Telegram contact goes to /onboarding first, whatever next says', () => {
    expect(pathAfterSignIn({ ...withTelegram, telegram: null }, '/my/applications')).toBe('/onboarding');
  });

  it('returns to the page that asked for sign-in', () => {
    expect(pathAfterSignIn(withTelegram, '/my/applications')).toBe('/my/applications');
  });

  it.each(['//evil.example', '/\\evil.example', 'https://evil.example', null])('never leaves the site: next=%j → /my/projects', (next) => {
    expect(pathAfterSignIn(withTelegram, next)).toBe('/my/projects');
  });
});
