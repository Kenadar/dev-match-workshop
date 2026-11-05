# PUT `/api/me/telegram`: збереження Telegram-контакту (US-01)

Припущення: Express 4/5, Zod 3.23+ (або 4), Prisma, а `requireAuth` вже є у проєкті й кладе `req.user.id`. Тести написані на Vitest + Supertest.

```bash
npm i zod
npm i -D vitest supertest @types/supertest
```

## 1. Prisma-схема

```prisma
model User {
  id              String   @id @default(cuid())
  // ...інші поля
  telegramContact String?  // завжди у форматі "@nickname"
}
```

```bash
npx prisma migrate dev --name add_user_telegram_contact
```

## 2. Валідація: `src/validation/telegram.ts`

```ts
import { z } from "zod";

export const TELEGRAM_REQUIRED_MSG =
  "Вкажіть Telegram-контакт для зв'язку з командою";
export const TELEGRAM_FORMAT_MSG =
  "Нікнейм має містити від 5 до 32 символів (латиниця, цифри, _)";

export const telegramContactSchema = z.object({
  telegram: z
    .string({ message: TELEGRAM_REQUIRED_MSG })
    // нормалізація: прибираємо пробіли по краях та опціональний "@"
    .transform((v) => v.trim().replace(/^@/, ""))
    .pipe(
      z
        .string()
        .min(1, TELEGRAM_REQUIRED_MSG)
        .regex(/^[A-Za-z0-9_]{5,32}$/, TELEGRAM_FORMAT_MSG)
    )
    // зберігаємо завжди з "@"
    .transform((v) => `@${v}`),
});

export type TelegramContactInput = z.infer<typeof telegramContactSchema>;
```

> Довжина 5–32 рахується **без** `@`, як у самому Telegram.

## 3. Роутер: `src/routes/profile.ts`

```ts
import { Router, type RequestHandler } from "express";
import { Prisma, type PrismaClient } from "@prisma/client";
import { telegramContactSchema } from "../validation/telegram";

export function createProfileRouter(
  prisma: PrismaClient,
  requireAuth: RequestHandler
) {
  const router = Router();

  router.put("/me/telegram", requireAuth, async (req, res, next) => {
    const parsed = telegramContactSchema.safeParse(req.body ?? {});

    if (!parsed.success) {
      // дані не зберігаються — до БД ми навіть не доходимо
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: parsed.error.issues[0].message,
        fields: { telegram: parsed.error.issues[0].message },
      });
    }

    try {
      const user = await prisma.user.update({
        where: { id: req.user!.id },
        data: { telegramContact: parsed.data.telegram },
        select: { id: true, telegramContact: true },
      });

      return res.status(200).json({
        ...user,
        redirectTo: "/dashboard", // фронт перенаправляє на панель проєктів
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2025"
      ) {
        return res
          .status(404)
          .json({ error: "USER_NOT_FOUND", message: "Користувача не знайдено" });
      }
      return next(e);
    }
  });

  return router;
}
```

Типізація `req.user` (якщо ще немає), `src/types/express.d.ts`:

```ts
declare global {
  namespace Express {
    interface Request {
      user?: { id: string };
    }
  }
}
export {};
```

Підключення в `app.ts`:

```ts
app.use(express.json());
app.use("/api", createProfileRouter(prisma, requireAuth));
```

## 4. Тест: `src/routes/profile.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import express, { type RequestHandler } from "express";
import request from "supertest";
import type { PrismaClient } from "@prisma/client";
import { createProfileRouter } from "./profile";
import {
  TELEGRAM_REQUIRED_MSG,
  TELEGRAM_FORMAT_MSG,
} from "../validation/telegram";

const update = vi.fn();
const prismaMock = { user: { update } } as unknown as PrismaClient;

const fakeAuth: RequestHandler = (req, _res, next) => {
  req.user = { id: "user-1" };
  next();
};
const denyAuth: RequestHandler = (_req, res) => {
  res.status(401).json({ error: "UNAUTHORIZED" });
};

function buildApp(auth: RequestHandler = fakeAuth) {
  const app = express();
  app.use(express.json());
  app.use("/api", createProfileRouter(prismaMock, auth));
  return app;
}

describe("PUT /api/me/telegram", () => {
  beforeEach(() => {
    update.mockReset();
    update.mockImplementation(async ({ data }) => ({
      id: "user-1",
      telegramContact: data.telegramContact,
    }));
  });

  // Сценарій 1
  it("зберігає коректний нікнейм у форматі @nickname", async () => {
    const res = await request(buildApp())
      .put("/api/me/telegram")
      .send({ telegram: "@orest_lead" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: "user-1",
      telegramContact: "@orest_lead",
      redirectTo: "/dashboard",
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { telegramContact: "@orest_lead" },
      select: { id: true, telegramContact: true },
    });
  });

  it("нормалізує значення без @ та з пробілами", async () => {
    const res = await request(buildApp())
      .put("/api/me/telegram")
      .send({ telegram: "  orest_lead " });

    expect(res.status).toBe(200);
    expect(res.body.telegramContact).toBe("@orest_lead");
  });

  // Сценарій 2
  it.each([
    ["порожній рядок", { telegram: "" }],
    ["лише пробіли", { telegram: "   " }],
    ["лише @", { telegram: "@" }],
    ["поле відсутнє", {}],
    ["не рядок", { telegram: 12345 }],
  ])("відхиляє порожній контакт (%s)", async (_name, body) => {
    const res = await request(buildApp()).put("/api/me/telegram").send(body);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(TELEGRAM_REQUIRED_MSG);
    expect(update).not.toHaveBeenCalled();
  });

  // Сценарій 3
  it.each([
    ["пробіл і спецсимвол", "orest lead!"],
    ["менше 5 символів", "@abcd"],
    ["більше 32 символів", "a".repeat(33)],
    ["кирилиця", "орест_лід"],
    ["подвійний @", "@@orest_lead"],
  ])("відхиляє некоректний формат (%s)", async (_name, telegram) => {
    const res = await request(buildApp())
      .put("/api/me/telegram")
      .send({ telegram });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(TELEGRAM_FORMAT_MSG);
    expect(update).not.toHaveBeenCalled();
  });

  it("приймає граничні довжини 5 і 32", async () => {
    for (const n of [5, 32]) {
      const res = await request(buildApp())
        .put("/api/me/telegram")
        .send({ telegram: "a".repeat(n) });
      expect(res.status).toBe(200);
    }
  });

  it("повертає 401 без авторизації і не чіпає БД", async () => {
    const res = await request(buildApp(denyAuth))
      .put("/api/me/telegram")
      .send({ telegram: "@orest_lead" });

    expect(res.status).toBe(401);
    expect(update).not.toHaveBeenCalled();
  });
});
```

Запуск: `npx vitest run`

## Що ще потрібно для 3-го критерію

Збереження контакту в профілі вже покрито. Показ контакту в картках проєктів для затверджених учасників робиться в ендпоінті проєктів: підтягуйте `owner.telegramContact` лише якщо в користувача є заявка зі статусом `APPROVED`:

```ts
const project = await prisma.project.findUnique({
  where: { id },
  include: { owner: { select: { id: true, name: true, telegramContact: true } } },
});
const isApproved = await prisma.application.findFirst({
  where: { projectId: id, applicantId: req.user!.id, status: "APPROVED" },
  select: { id: true },
});
if (!isApproved && project.owner.id !== req.user!.id) {
  project.owner.telegramContact = null; // приховуємо від інших
}
```

Якщо покажете схему проєктів і заявок, можу написати і цей ендпоінт з тестами.
