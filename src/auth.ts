import type { IncomingHttpHeaders } from "node:http";
import { LeanoteClient, type LeanoteConfig } from "./leanote-client.js";

export interface UserCredentials {
  email?: string;
  password?: string;
  token?: string;
}

function headerValue(
  headers: IncomingHttpHeaders,
  name: string,
): string | undefined {
  const value = headers[name];
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (Array.isArray(value) && value[0]?.trim()) {
    return value[0].trim();
  }
  return undefined;
}

export function extractCredentialsFromHeaders(
  headers: IncomingHttpHeaders,
): UserCredentials | null {
  const authorization = headerValue(headers, "authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    const token = authorization.slice(7).trim();
    if (token) {
      return { token };
    }
  }

  const token = headerValue(headers, "x-leanote-token");
  if (token) {
    return { token };
  }

  const email = headerValue(headers, "x-leanote-email");
  const password = headerValue(headers, "x-leanote-password");
  if (email && password) {
    return { email, password };
  }

  return null;
}

export function hasCredentials(config: LeanoteConfig): boolean {
  return Boolean(
    config.token?.trim() ||
      (config.email?.trim() && config.password !== undefined),
  );
}

export function mergeCredentials(
  serverConfig: LeanoteConfig,
  userCredentials: UserCredentials | null,
): LeanoteConfig | null {
  if (!userCredentials) {
    return null;
  }

  const token = userCredentials.token?.trim();
  const email = userCredentials.email?.trim() ?? "";
  const password = userCredentials.password ?? "";

  if (token) {
    return {
      baseUrl: serverConfig.baseUrl,
      email: "",
      password: "",
      token,
    };
  }

  if (email && password) {
    return {
      baseUrl: serverConfig.baseUrl,
      email,
      password,
    };
  }

  return null;
}

function clientCacheKey(config: LeanoteConfig): string {
  if (config.token) {
    return `token:${config.baseUrl}:${config.token}`;
  }
  return `login:${config.baseUrl}:${config.email}:${config.password}`;
}

const clientCache = new Map<string, LeanoteClient>();

export function getLeanoteClient(config: LeanoteConfig): LeanoteClient {
  const key = clientCacheKey(config);
  const cached = clientCache.get(key);
  if (cached) {
    return cached;
  }

  const client = new LeanoteClient(config);
  clientCache.set(key, client);
  return client;
}
