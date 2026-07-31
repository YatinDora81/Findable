import { createHash, randomBytes, randomInt } from "node:crypto";
import { db } from "@repo/db";

const SESSION_TTL_DAYS = 30;
const PASSWORD_ALPHABET =
  "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PASSWORD_LENGTH = 20;

export type GuestCredentials = {
  userId: string;
  email: string;
  name: string;
  password: string;
  token: string;
  expiresAt: Date;
};

export const hashToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function generatePassword(): string {
  let out = "";
  for (let i = 0; i < PASSWORD_LENGTH; i++) {
    out += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
  }
  return out;
}

function expiry(): Date {
  return new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export async function createGuestUser(): Promise<GuestCredentials> {
  const handle = randomBytes(6).toString("hex");
  const email = `guest-${handle}@findable.local`;
  const name = `Guest ${handle.slice(0, 4).toUpperCase()}`;
  const password = generatePassword();

  const user = await db.user.create({
    data: {
      email,
      name,
      isGuest: true,
      passwordHash: await Bun.password.hash(password),
    },
  });

  const { token, expiresAt } = await createSession(user.id);

  return { userId: user.id, email, name, password, token, expiresAt };
}

export async function createSession(
  userId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();
  const expiresAt = expiry();

  await db.session.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  });

  return { token, expiresAt };
}

export async function resolveSession(token: string) {
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() <= Date.now()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return session;
}

export async function verifyPassword(
  email: string,
  password: string,
): Promise<string | null> {
  const user = await db.user.findUnique({ where: { email } });

  if (!user?.passwordHash) return null;

  const matches = await Bun.password.verify(password, user.passwordHash);

  return matches ? user.id : null;
}

export function readBearerToken(header: string | undefined): string | null {
  if (!header) return null;

  const [scheme, value] = header.split(" ");

  if (!scheme || scheme.toLowerCase() !== "bearer" || !value) return null;

  return value.trim() || null;
}
