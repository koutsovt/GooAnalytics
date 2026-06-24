import crypto from "crypto";
import { eq } from "drizzle-orm";
import { google } from "googleapis";
import { db } from "@/lib/db";
import { googleTokens } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const ALGORITHM = "aes-256-gcm";
const KEY = Buffer.from(env.TOKEN_ENCRYPTION_KEY, "hex");

if (KEY.length !== 32) {
  logger.warn(
    "TOKEN_ENCRYPTION_KEY must be 64 hex characters (32 bytes). Generating new key for development only.",
  );
}

export interface GoogleTokens {
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
}

export function encrypt(plaintext: string): { iv: string; authTag: string; ciphertext: string } {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    ciphertext: encrypted.toString("hex"),
  };
}

export function decrypt(iv: string, authTag: string, ciphertext: string): string {
  const ivBuf = Buffer.from(iv, "hex");
  const authTagBuf = Buffer.from(authTag, "hex");
  const encryptedBuf = Buffer.from(ciphertext, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, ivBuf);
  decipher.setAuthTag(authTagBuf);

  return decipher.update(encryptedBuf) + decipher.final("utf8");
}

export function createOAuth2Client() {
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    `${env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`,
  );
}

export const OAUTH_STATE_COOKIE = "oauth_state";

export const GOOGLE_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/business.manage",
];

export function getAuthUrl(state: string): string {
  const oauth2Client = createOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
    state,
  });
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("OAuth exchange did not return required tokens");
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiryDate: tokens.expiry_date ?? Date.now() + 3600 * 1000,
  };
}

async function refreshTokensInternal(userId: string, tokens: GoogleTokens): Promise<GoogleTokens> {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: tokens.refreshToken,
  });

  const { credentials } = await oauth2Client.refreshAccessToken();

  if (!credentials.access_token) {
    throw new Error(`Token refresh failed for user ${userId}`);
  }

  const refreshed: GoogleTokens = {
    accessToken: credentials.access_token,
    refreshToken: credentials.refresh_token ?? tokens.refreshToken,
    expiryDate: credentials.expiry_date ?? Date.now() + 3600 * 1000,
  };

  await upsertTokenRow(userId, refreshed);

  return refreshed;
}

export async function getValidTokens(userId: string): Promise<GoogleTokens> {
  const row = await db.query.googleTokens.findFirst({
    where: eq(googleTokens.userId, userId),
  });

  if (!row) throw new Error(`No Google tokens found for user ${userId}`);

  const decryptBlobToken = (blob: string): string => {
    const [iv, authTag, ciphertext] = blob.split(":");
    return decrypt(iv, authTag, ciphertext);
  };

  const tokens: GoogleTokens = {
    accessToken: decryptBlobToken(row.encryptedAccessToken),
    refreshToken: decryptBlobToken(row.encryptedRefreshToken),
    expiryDate: row.expiresAt.getTime(),
  };

  const fiveMinutes = 5 * 60 * 1000;
  if (Date.now() >= tokens.expiryDate - fiveMinutes) {
    return refreshTokensInternal(userId, tokens);
  }

  return tokens;
}

export function buildAuthClient(tokens: GoogleTokens) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expiry_date: tokens.expiryDate,
  });
  return oauth2Client;
}

export async function upsertTokenRow(userId: string, tokens: GoogleTokens) {
  const accessTokenEncrypted = encrypt(tokens.accessToken);
  const refreshTokenEncrypted = encrypt(tokens.refreshToken);

  const now = new Date();
  const expiresAt = new Date(tokens.expiryDate);

  const existing = await db.query.googleTokens.findFirst({
    where: eq(googleTokens.userId, userId),
  });

  const encryptedAccessTokenBlob = `${accessTokenEncrypted.iv}:${accessTokenEncrypted.authTag}:${accessTokenEncrypted.ciphertext}`;
  const encryptedRefreshTokenBlob = `${refreshTokenEncrypted.iv}:${refreshTokenEncrypted.authTag}:${refreshTokenEncrypted.ciphertext}`;

  if (existing) {
    await db
      .update(googleTokens)
      .set({
        encryptedAccessToken: encryptedAccessTokenBlob,
        iv: accessTokenEncrypted.iv,
        authTag: accessTokenEncrypted.authTag,
        encryptedRefreshToken: encryptedRefreshTokenBlob,
        expiresAt: expiresAt,
        updatedAt: now,
      })
      .where(eq(googleTokens.userId, userId));
  } else {
    await db.insert(googleTokens).values({
      id: `tok_${userId}_${Date.now()}`,
      userId,
      encryptedAccessToken: encryptedAccessTokenBlob,
      iv: accessTokenEncrypted.iv,
      authTag: accessTokenEncrypted.authTag,
      encryptedRefreshToken: encryptedRefreshTokenBlob,
      expiresAt: expiresAt,
      createdAt: now,
      updatedAt: now,
    });
  }
}
