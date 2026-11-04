import type { User } from '@prisma/client';
import type { UserDto } from '@devmatch/shared';

/** The only shape a user leaves the server in. passwordHash never does (ADR-0006, risks.md T8). */
export function toUserDto(user: User): UserDto {
  return { id: user.id, email: user.email, displayName: user.displayName, telegram: user.telegram };
}
