import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { LeanoteConfig } from "./leanote-client.js";

export interface LeanoteConfigFile {
  baseUrl?: string;
  email?: string;
  password?: string;
  token?: string;
}

const DEFAULT_CONFIG_PATH = resolve(
  process.env.LEANOTE_CONFIG_PATH ?? "config/leanote.json",
);

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "");
}

function baseUrlFromEnv(): string | undefined {
  const baseUrl = process.env.LEANOTE_BASE_URL?.trim();
  return baseUrl ? normalizeBaseUrl(baseUrl) : undefined;
}

function parseConfigFile(raw: string, configPath: string): LeanoteConfigFile {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON in Leanote config file: ${configPath}`);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error(`Leanote config file must be a JSON object: ${configPath}`);
  }

  return parsed as LeanoteConfigFile;
}

function configFromFile(
  configPath: string,
  requireCredentials: boolean,
): LeanoteConfig {
  const file = parseConfigFile(readFileSync(configPath, "utf8"), configPath);
  const baseUrl = baseUrlFromEnv() ?? file.baseUrl?.trim();
  const token = file.token?.trim();
  const email = file.email?.trim() ?? "";
  const password = file.password ?? "";

  if (!baseUrl) {
    throw new Error(
      `Leanote baseUrl required: set LEANOTE_BASE_URL or baseUrl in ${configPath}`,
    );
  }

  if (requireCredentials && !token && (!email || !password)) {
    throw new Error(
      `Leanote config requires token or both email and password: ${configPath}`,
    );
  }

  return {
    baseUrl: normalizeBaseUrl(baseUrl),
    email,
    password,
    token,
  };
}

function configFromEnv(requireCredentials: boolean): LeanoteConfig | null {
  const baseUrl = baseUrlFromEnv();
  const email = process.env.LEANOTE_EMAIL;
  const password = process.env.LEANOTE_PASSWORD;
  const token = process.env.LEANOTE_TOKEN;

  if (!baseUrl) {
    return null;
  }

  if (requireCredentials && !token && (!email || !password)) {
    throw new Error(
      "Set LEANOTE_TOKEN or both LEANOTE_EMAIL and LEANOTE_PASSWORD",
    );
  }

  return {
    baseUrl,
    email: email ?? "",
    password: password ?? "",
    token,
  };
}

function tryConfigFromFile(
  requireCredentials: boolean,
): LeanoteConfig | null {
  try {
    return configFromFile(DEFAULT_CONFIG_PATH, requireCredentials);
  } catch {
    return null;
  }
}

export interface LoadLeanoteConfigOptions {
  /** HTTP 服务器配置仅需 baseUrl；用户凭据由请求头传入 */
  requireCredentials?: boolean;
}

export function loadLeanoteConfig(
  options: LoadLeanoteConfigOptions = {},
): LeanoteConfig {
  const requireCredentials = options.requireCredentials ?? true;
  const configPath = DEFAULT_CONFIG_PATH;

  const fileConfig = tryConfigFromFile(requireCredentials);
  if (fileConfig) {
    return fileConfig;
  }

  const envConfig = configFromEnv(requireCredentials);
  if (envConfig) {
    return envConfig;
  }

  throw new Error(
    `Leanote baseUrl required: set LEANOTE_BASE_URL or provide baseUrl in ${configPath}`,
  );
}

export function getConfigPath(): string {
  return DEFAULT_CONFIG_PATH;
}
