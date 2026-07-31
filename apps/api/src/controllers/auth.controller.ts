import type { Request, Response } from "express";
import { AppError, loginSchema } from "@repo/contracts";
import { db } from "@repo/db";
import { createGuestUser, createSession, verifyPassword } from "../lib/auth.ts";

export async function createGuest(req: Request, res: Response): Promise<void> {
  const guest = await createGuestUser();

  req.log.info({ userId: guest.userId }, "auth.guest.created");

  res.status(201).json({
    data: {
      token: guest.token,
      expiresAt: guest.expiresAt,
      credentials: { email: guest.email, password: guest.password },
      user: {
        id: guest.userId,
        email: guest.email,
        name: guest.name,
        isGuest: true,
      },
    },
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = loginSchema.parse(req.body);

  const userId = await verifyPassword(email, password);

  if (!userId) throw new AppError("FORBIDDEN", "Invalid email or password");

  const session = await createSession(userId);

  req.log.info({ userId }, "auth.login");

  res.json({ data: { token: session.token, expiresAt: session.expiresAt } });
}

export async function me(req: Request, res: Response): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: req.userId },
    select: { id: true, email: true, name: true, isGuest: true, createdAt: true },
  });

  if (!user) throw new AppError("NOT_FOUND", "User not found");

  res.json({ data: user });
}

export async function logout(req: Request, res: Response): Promise<void> {
  if (req.sessionId) {
    await db.session.deleteMany({ where: { id: req.sessionId } });
    req.log.info({ userId: req.userId }, "auth.logout");
  }

  res.status(204).end();
}
