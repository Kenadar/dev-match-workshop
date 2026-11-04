import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LoginInput, RegisterInput, UpdateProfileInput, UserDto } from '@devmatch/shared';
import { ApiError, api } from '../api/client.js';

// Current user and auth mutations (ADR-0006, US-01). Pages use these hooks, never fetch.

export const meKey = ['me'] as const;

type UserResponse = { user: UserDto };

/** The signed-in user, or null when there is no session. */
export function useMe() {
  return useQuery({
    queryKey: meKey,
    queryFn: async () => {
      try {
        return (await api.get<UserResponse>('/me')).user;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    retry: false,
  });
}

function useSetMe() {
  const queryClient = useQueryClient();
  return (user: UserDto | null) => queryClient.setQueryData(meKey, user);
}

export function useLogin() {
  const setMe = useSetMe();
  return useMutation({
    mutationFn: async (input: LoginInput) => (await api.post<UserResponse>('/auth/login', input)).user,
    onSuccess: setMe,
  });
}

export function useRegister() {
  const setMe = useSetMe();
  return useMutation({
    mutationFn: async (input: RegisterInput) => (await api.post<UserResponse>('/auth/register', input)).user,
    onSuccess: setMe,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<void>('/auth/logout'),
    onSuccess: () => {
      queryClient.clear(); // nothing cached for the previous user survives
      queryClient.setQueryData(meKey, null);
    },
  });
}

/** US-01: PATCH /me with the Telegram contact. */
export function useUpdateProfile() {
  const setMe = useSetMe();
  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => (await api.patch<UserResponse>('/me', input)).user,
    onSuccess: setMe,
  });
}

/**
 * Where to go after signing in: US-01 sends a user without a Telegram contact to onboarding first.
 * `next` comes from the URL, so only same-origin paths are accepted ("//evil.example" is another origin).
 */
export function pathAfterSignIn(user: UserDto, next: string | null): string {
  if (!user.telegram) return '/onboarding';
  const sameOrigin = next?.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\');
  return sameOrigin ? next! : '/my/projects';
}
