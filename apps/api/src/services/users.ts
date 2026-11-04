import type { User } from '@prisma/client';
import type { UpdateProfileInput } from '@devmatch/shared';
import { prisma } from '../lib/prisma.js';

/** US-01: the Telegram contact arrives already validated and normalized to "@name" by updateProfileSchema. */
export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<User> {
  return prisma.user.update({ where: { id: userId }, data: { telegram: input.telegram } });
}
