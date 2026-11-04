import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MESSAGES, type UserDto } from '@devmatch/shared';
import { OnboardingPage } from '../pages/OnboardingPage.js';

// US-01 on the page: the form blocks invalid input with the shared schema (sc.2, sc.3) and redirects after saving (sc.1).
// The API's own checks are proven in apps/api/tests/me.test.ts; here the network is a stub.

const user: UserDto = { id: 'u1', email: 'orest@example.com', displayName: 'Orest', telegram: null };
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === 'PATCH') {
      const body = JSON.parse(String(init.body)) as { telegram: string };
      return Response.json({ user: { ...user, telegram: body.telegram } });
    }
    if (url.endsWith('/me')) return Response.json({ user });
    return Response.json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } }, { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup(); // vitest globals are off in apps/web, so Testing Library does not unmount by itself
  vi.unstubAllGlobals();
});

function renderOnboarding() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/onboarding']}>
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/my/projects" element={<h1>My projects</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function submit(value: string) {
  fireEvent.change(screen.getByRole('textbox', { name: 'Telegram username' }), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
}

const patchCalls = () => fetchMock.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'PATCH');

describe('US-01 OnboardingPage', () => {
  it('US-01 sc.1 saves "@orest_lead" and redirects to the project management panel', async () => {
    renderOnboarding();
    submit('@orest_lead');

    expect(await screen.findByRole('heading', { name: 'My projects' })).toBeTruthy();
    expect(patchCalls()).toHaveLength(1);
    expect(JSON.parse(String((patchCalls()[0]![1] as RequestInit).body))).toEqual({ telegram: '@orest_lead' });
  });

  it('US-01 sc.2 empty contact: the form is blocked and shows the AC message', () => {
    renderOnboarding();
    submit('');

    expect(screen.getByText(MESSAGES.telegramRequired)).toBeTruthy();
    expect(patchCalls()).toHaveLength(0);
  });

  it('US-01 sc.3 "orest lead!": the format message is shown and nothing is sent', () => {
    renderOnboarding();
    submit('orest lead!');

    expect(screen.getByText(MESSAGES.telegramFormat)).toBeTruthy();
    expect(patchCalls()).toHaveLength(0);
  });
});
