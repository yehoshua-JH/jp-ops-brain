import type { Express } from "express";

/**
 * OAuth routes — Manus OAuth replaced with password login.
 * Login is handled via the auth.login tRPC mutation.
 */
export function registerOAuthRoutes(_app: Express) {
  // No-op: password-based login is used instead of OAuth.
}
