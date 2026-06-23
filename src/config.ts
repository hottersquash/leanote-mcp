import type { LeanoteConfig } from "./leanote-client.js";

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "");
}

export interface LoadLeanoteConfigOptions {
  /** HTTP 服务器配置仅需 baseUrl；用户凭据由请求头传入 */
  requireCredentials?: boolean;
}

export function loadLeanoteConfig(
  options: LoadLeanoteConfigOptions = {},
): LeanoteConfig {
  const requireCredentials = options.requireCredentials ?? true;
  const baseUrl = process.env.LEANOTE_BASE_URL?.trim();
  const email = process.env.LEANOTE_EMAIL?.trim() ?? "";
  const password = process.env.LEANOTE_PASSWORD ?? "";
  const token = process.env.LEANOTE_TOKEN?.trim();

  if (!baseUrl) {
    throw new Error("LEANOTE_BASE_URL is required");
  }

  if (requireCredentials && !token && (!email || !password)) {
    throw new Error(
      "Set LEANOTE_TOKEN or both LEANOTE_EMAIL and LEANOTE_PASSWORD",
    );
  }

  return {
    baseUrl: normalizeBaseUrl(baseUrl),
    email,
    password,
    token,
  };
}
