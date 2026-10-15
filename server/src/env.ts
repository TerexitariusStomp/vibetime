export interface Env {
  DB: D1Database;
  GITHUB_CLIENT_ID: string;
  JWT_SECRET: string;
  // Optional: without it no commit key is issued, clients send no commit facts,
  // and submissions are scored on their totals as before.
  COMMIT_KEY_SECRET?: string;
  // Optional: without it the site offers no sign-in and every page renders as
  // it does for a signed-out visitor.
  GITHUB_CLIENT_SECRET?: string;
  // GitHub allows one callback host per OAuth app, so sign-in always runs on
  // this origin even when the page was opened on api.vibetime.club.
  WEB_ORIGIN?: string;
  GITHUB_WEB_BASE?: string;
  GITHUB_API_BASE?: string;
}
